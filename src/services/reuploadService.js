'use strict';

const pendingQueue = new Map();

const addToQueue = (sn) => {
    pendingQueue.set(sn, Date.now());
};

const checkAndRemove = (sn) => {
    if (pendingQueue.has(sn)) {
        pendingQueue.delete(sn);
        return true;
    }
    return false;
};

const getQueueStatus = () => {
    const status = {};
    pendingQueue.forEach((timestamp, sn) => {
        status[sn] = {
            queuedAt: new Date(timestamp).toISOString()
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
    getQueueStatus,
    isInQueue
};
