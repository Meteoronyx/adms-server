'use strict';

const config = require('../config');
const queries = require('../db/queries');
const commandService = require('./commandService');
const logger = require('../utils/logger');

let intervalId = null;
let lastRunDate = null;

/**
 * Extracts YYYY-MM-DD, hour (0-23), and minute (0-59) in the configured timezone.
 */
const getJakartaDateParts = (date = new Date()) => {
  const tz = config.AUTO_CLEAR_LOG?.TIMEZONE || 'Asia/Jakarta';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  const map = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  const rawHour = parseInt(map.hour, 10);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = parseInt(map.minute, 10);

  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    hour,
    minute
  };
};

/**
 * Queues an INFO command with { autoClearCheck: true } for every verified device
 * that does not already have a pending INFO command.
 */
const runAutoClearCheck = async () => {
  const sns = await queries.getVerifiedDeviceSns();
  let queued = 0;
  let skipped = 0;

  for (const sn of sns) {
    const alreadyPending = await queries.hasPendingCommand(sn, config.COMMAND_TYPES.INFO);
    if (alreadyPending) {
      skipped += 1;
      continue;
    }
    await commandService.queueCommand(sn, config.COMMAND_TYPES.INFO, { autoClearCheck: true });
    queued += 1;
  }

  logger.info('Auto-clear attendance log check completed', {
    total: sns.length,
    queued,
    skipped
  });

  return { total: sns.length, queued, skipped };
};

const tick = async (now = new Date()) => {
  const cfg = config.AUTO_CLEAR_LOG;
  if (!cfg || !cfg.ENABLED) {
    return false;
  }

  const { dateStr, hour, minute } = getJakartaDateParts(now);
  if (hour === cfg.SCHEDULE_HOUR && minute === cfg.SCHEDULE_MINUTE && lastRunDate !== dateStr) {
    lastRunDate = dateStr;
    try {
      await runAutoClearCheck();
      return true;
    } catch (err) {
      logger.error('Auto-clear scheduler run failed', {
        message: err.message,
        stack: err.stack
      });
      return false;
    }
  }
  return false;
};

const start = () => {
  const cfg = config.AUTO_CLEAR_LOG;
  if (!cfg || !cfg.ENABLED) {
    logger.info('Auto-clear scheduler is disabled');
    return;
  }
  if (intervalId) {
    return;
  }

  const checkMs = cfg.CHECK_INTERVAL_MS || 60000;
  intervalId = setInterval(() => {
    tick();
  }, checkMs);
  if (typeof intervalId.unref === 'function') {
    intervalId.unref();
  }

  logger.info('Auto-clear scheduler started', {
    schedule: `${String(cfg.SCHEDULE_HOUR).padStart(2, '0')}:${String(cfg.SCHEDULE_MINUTE).padStart(2, '0')}`,
    timezone: cfg.TIMEZONE,
    threshold: cfg.THRESHOLD
  });
};

const stop = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Auto-clear scheduler stopped');
  }
};

module.exports = {
  start,
  stop,
  tick,
  runAutoClearCheck,
  getJakartaDateParts,
  _resetForTest: () => {
    lastRunDate = null;
  }
};
