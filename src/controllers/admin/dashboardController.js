'use strict';

const queries = require('../../db/queries');
const { resolveScopedOpdIds } = require('../../middleware/apiKeyAuth');

// Dashboard statistics
exports.getDashboardStats = async (req, res) => {
  const opdScope = await resolveScopedOpdIds(req.user, req.query.opd_id);

  if (Array.isArray(opdScope) && opdScope.length === 0) {
    return res.json({
      success: true,
      stats: {
        total_pegawai: 0,
        total_fingerprints: 0,
        total_faces: 0,
        total_admins: 0,
        logs_today: 0,
        logs_weekly: 0,
        logs_monthly: 0
      }
    });
  }

  const stats = await queries.getDashboardStats(opdScope);
  res.json({
    success: true,
    stats
  });
};
