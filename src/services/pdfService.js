'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatDateIndo(date) {
  const d = new Date(date);
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Service to compile attendance data and generate an A4 PDF report via Puppeteer
 */
class PdfService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/attendance_rekap.html');
  }

  /**
   * Generates a monthly attendance PDF buffer for a specific employee
   *
   * @param {Object} params
   * @param {Object} params.pegawai - Pegawai info (name, pin, nama_opd, etc.)
   * @param {Array} params.logs - Raw attendance logs for the month
   * @param {number} params.year - Year (e.g. 2026)
   * @param {number} params.month - Month (1 - 12)
   * @param {Object} [params.signatory] - Atasan details (name, nip, title)
   * @param {string} [params.location] - City / print location
   * @returns {Promise<Buffer>}
   */
  async generateAttendancePdf({ pegawai, logs = [], year, month, signatory = {}, location = '' }) {
    const y = parseInt(year);
    const m = parseInt(month);
    const daysInMonth = new Date(y, m, 0).getDate();

    // Group logs by day (1..daysInMonth)
    const logsByDay = {};
    for (let d = 1; d <= daysInMonth; d++) {
      logsByDay[d] = [];
    }

    logs.forEach(log => {
      const d = new Date(log.check_time);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        if (logsByDay[day]) {
          logsByDay[day].push(log);
        }
      }
    });

    let daysPresent = 0;
    let daysAbsent = 0;
    let totalLogsCount = 0;
    let totalDurationMinutes = 0;
    const tableRows = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(y, m - 1, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayName = DAY_NAMES[dayOfWeek];
      const dateStr = `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      const dayLogs = logsByDay[day] || [];

      // Sort chronological
      dayLogs.sort((a, b) => new Date(a.check_time) - new Date(b.check_time));

      let scanFirst = '-';
      let scanLast = '-';
      let durationStr = '-';
      let devicesStr = '-';
      let statusHtml = '';

      if (dayLogs.length > 0) {
        daysPresent++;
        totalLogsCount += dayLogs.length;

        const firstLog = dayLogs[0];
        const lastLog = dayLogs[dayLogs.length - 1];

        scanFirst = formatTime(firstLog.check_time);

        if (dayLogs.length > 1) {
          scanLast = formatTime(lastLog.check_time);
          const firstMs = new Date(firstLog.check_time).getTime();
          const lastMs = new Date(lastLog.check_time).getTime();
          const diffMins = Math.max(0, Math.round((lastMs - firstMs) / (1000 * 60)));
          totalDurationMinutes += diffMins;

          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          durationStr = hours > 0 ? `${hours} jam ${mins} mnt` : `${mins} mnt`;
        } else {
          scanLast = '-';
          durationStr = '-';
        }

        // Unique devices
        const deviceNames = [...new Set(dayLogs.map(l => l.device_name || l.device_sn).filter(Boolean))];
        devicesStr = deviceNames.join(', ') || '-';

        if (isWeekend) {
          statusHtml = `<span class="badge badge-hadir">Hadir (Lembur/Pekan)</span>`;
        } else {
          statusHtml = `<span class="badge badge-hadir">Hadir</span>`;
        }
      } else {
        if (isWeekend) {
          statusHtml = `<span class="badge badge-weekend">Akhir Pekan</span>`;
        } else {
          daysAbsent++;
          statusHtml = `<span class="badge badge-tanpa-rekaman">Tidak Ada Log</span>`;
        }
      }

      const rowClass = isWeekend ? ' class="weekend"' : '';
      tableRows.push(`
        <tr${rowClass}>
          <td>${day}</td>
          <td>${dateStr}</td>
          <td>${dayName}</td>
          <td class="font-mono">${scanFirst}</td>
          <td class="font-mono">${scanLast}</td>
          <td>${durationStr}</td>
          <td class="text-left">${escapeHtml(devicesStr)}</td>
          <td>${statusHtml}</td>
        </tr>
      `);
    }

    // Accumulate total duration string
    const totalHours = Math.floor(totalDurationMinutes / 60);
    const remainingMins = totalDurationMinutes % 60;
    const totalDurationStr = totalHours > 0
      ? `${totalHours} jam ${remainingMins} mnt`
      : `${remainingMins} mnt`;

    // Signatory details
    const sigName = signatory.name?.trim() ? escapeHtml(signatory.name) : '_________________________';
    const sigNip = signatory.nip?.trim() ? `NIP. ${escapeHtml(signatory.nip)}` : 'NIP. ........................................';
    const sigTitle = signatory.title?.trim() ? escapeHtml(signatory.title) : 'Kepala / Atasan Langsung';
    const printLocation = location?.trim() ? escapeHtml(location) : (pegawai.nama_opd ? escapeHtml(pegawai.nama_opd) : 'Tempat');

    const now = new Date();
    const currentDateFormatted = formatDateIndo(now);
    const currentDateTimeFormatted = `${currentDateFormatted} ${formatTime(now)} WIB`;

    // Read HTML template
    let template = fs.readFileSync(this.templatePath, 'utf8');

    // Replace placeholders
    const kopInstansi = 'Pemerintah Kabupaten Tangerang';
    const kopOpd = pegawai.nama_opd || 'UNIT KERJA / OPD';
    const periodeBulanTahun = `${MONTH_NAMES[m - 1]} ${y}`;

    const replacements = {
      '{{KOP_INSTANSI}}': escapeHtml(kopInstansi),
      '{{KOP_OPD}}': escapeHtml(kopOpd),
      '{{PERIODE_BULAN_TAHUN}}': escapeHtml(periodeBulanTahun),
      '{{NAMA_PEGAWAI}}': escapeHtml(pegawai.name || `Pegawai ${pegawai.pin}`),
      '{{PIN_PEGAWAI}}': escapeHtml(pegawai.pin),
      '{{NAMA_OPD}}': escapeHtml(pegawai.nama_opd || '-'),
      '{{TANGGAL_CETAK}}': escapeHtml(currentDateFormatted),
      '{{TANGGAL_CETAK_LENGKAP}}': escapeHtml(currentDateTimeFormatted),
      '{{TABLE_ROWS}}': tableRows.join('\n'),
      '{{SUMMARY_TOTAL_DAYS}}': `${daysInMonth} Hari`,
      '{{SUMMARY_DAYS_PRESENT}}': `${daysPresent} Hari`,
      '{{SUMMARY_DAYS_ABSENT}}': `${daysAbsent} Hari`,
      '{{SUMMARY_TOTAL_LOGS}}': `${totalLogsCount} Scan`,
      '{{SUMMARY_TOTAL_DURATION}}': totalDurationStr,
      '{{SIGNATORY_TITLE}}': sigTitle,
      '{{SIGNATORY_NAME}}': sigName,
      '{{SIGNATORY_NIP}}': sigNip,
      '{{PRINT_LOCATION}}': printLocation
    };

    for (const [key, value] of Object.entries(replacements)) {
      template = template.replaceAll(key, value);
    }

    // Launch Puppeteer and render PDF
    let browser;
    try {
      const launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote'
        ]
      };

      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }

      browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();
      await page.setContent(template, { waitUntil: 'networkidle0' });

      const pdfUint8 = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '12mm',
          bottom: '10mm',
          left: '12mm'
        }
      });

      return Buffer.from(pdfUint8);
    } catch (err) {
      logger.error('Error generating attendance PDF with Puppeteer', {
        error: err.message,
        pin: pegawai.pin,
        year,
        month
      });
      throw err;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          logger.warn('Failed to close Puppeteer browser instance', { error: closeErr.message });
        }
      }
    }
  }
}

module.exports = new PdfService();
