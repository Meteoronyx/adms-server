'use strict';

// Compatibility entry point. New routes should import the domain controller directly.
module.exports = {
  ...require('./admin/deviceController'),
  ...require('./admin/commandController'),
  ...require('./admin/biometricController'),
  ...require('./admin/pegawaiController'),
  ...require('./admin/attendanceController'),
  ...require('./admin/broadcastController'),
  ...require('./admin/dashboardController')
};
