'use strict';

const HANDSHAKE_MODE_TTL_MS = 60 * 1000;

const pendingQueue = new Map();
const pendingHandshakeModes = new Map();

const addToQueue = (sn, mode = 'full') => {
  pendingQueue.set(sn, {
    mode,
    queuedAt: Date.now()
  });
};

const setHandshakeMode = (sn, mode) => {
  pendingHandshakeModes.set(sn, {
    mode,
    expiresAt: Date.now() + HANDSHAKE_MODE_TTL_MS
  });
};

const getHandshakeMode = (sn) => {
  const entry = pendingHandshakeModes.get(sn);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    pendingHandshakeModes.delete(sn);
    return null;
  }
  return entry.mode;
};

const clearHandshakeMode = (sn) => {
  pendingHandshakeModes.delete(sn);
};

const consumeHandshakeMode = (sn) => {
  const entry = pendingHandshakeModes.get(sn);
  if (!entry) {
    return null;
  }
  pendingHandshakeModes.delete(sn);
  if (entry.expiresAt <= Date.now()) {
    return null;
  }
  return entry.mode;
};

const checkAndRemove = (sn) => {
  const entry = pendingQueue.get(sn);
  if (!entry) {
    return null;
  }
  pendingQueue.delete(sn);
  setHandshakeMode(sn, entry.mode);
  return entry;
};

const getQueueStatus = () => {
  const status = {};
  pendingQueue.forEach((entry, sn) => {
    status[sn] = {
      queuedAt: new Date(entry.queuedAt).toISOString(),
      mode: entry.mode
    };
  });
  return status;
};

const isInQueue = (sn) => {
  return pendingQueue.has(sn);
};

module.exports = {
  addToQueue,
  checkAndRemove,
  setHandshakeMode,
  getHandshakeMode,
  clearHandshakeMode,
  consumeHandshakeMode,
  getQueueStatus,
  isInQueue
};
