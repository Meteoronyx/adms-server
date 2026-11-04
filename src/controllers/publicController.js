"use strict";

const queries = require("../db/queries");
const logger = require("../utils/logger");

// Cache in-memory berdurasi 20 detik untuk menghemat beban query database
let cache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 20 * 1000;

/**
 * Masking serial number mesin absensi demi privasi dan mencegah spoofing iClock.
 * Contoh: "BJF4230001" -> "BJF4****001"
 */
function maskSerialNumber(sn) {
  if (!sn || typeof sn !== "string") return "-";
  const trimmed = sn.trim();
  if (trimmed.length <= 6) {
    return trimmed.slice(0, 2) + "****" + trimmed.slice(-1);
  }
  return trimmed.slice(0, 4) + "****" + trimmed.slice(-3);
}

/**
 * Endpoint publik untuk status perangkat mesin absensi.
 * Menyeleksi data minimalis dan menyamarkan SN.
 */
exports.getPublicDeviceStatus = async (req, res) => {
  const now = Date.now();

  // Kembalikan dari cache jika masih dalam batas TTL
  if (cache.data && now - cache.timestamp < CACHE_TTL_MS) {
    res.set("X-Cache", "HIT");
    res.set("Cache-Control", "public, max-age=20");
    return res.json(cache.data);
  }

  try {
    const rawDevices = await queries.getPublicDevicesStatus();

    let onlineCount = 0;
    let offlineCount = 0;

    const devices = rawDevices.map((d) => {
      const isOnline = d.status === "online";
      if (isOnline) {
        onlineCount++;
      } else {
        offlineCount++;
      }

      return {
        name: d.device_name?.trim() || d.name?.trim() || "Perangkat Absensi",
        masked_sn: maskSerialNumber(d.sn),
        opd: d.nama_opd || d.parent_nama_opd || "Umum",
        parent_opd: d.parent_nama_opd || null,
        status: isOnline ? "online" : "offline",
        last_activity: d.last_activity,
      };
    });

    const responsePayload = {
      success: true,
      updated_at: new Date().toISOString(),
      summary: {
        total: devices.length,
        online: onlineCount,
        offline: offlineCount,
      },
      devices,
    };

    // Simpan ke cache
    cache = {
      data: responsePayload,
      timestamp: now,
    };

    res.set("X-Cache", "MISS");
    res.set("Cache-Control", "public, max-age=20");
    return res.json(responsePayload);
  } catch (err) {
    logger.error("Failed to get public device status", {
      error: err.message,
      stack: err.stack,
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil status perangkat",
    });
  }
};
