const API_BASE = '';

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const login = (username, password) =>
  fetchJSON('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const logout = () =>
  fetchJSON('/admin/logout', { method: 'POST' });

export const me = () =>
  fetchJSON('/admin/me');

export const getHealth = () =>
  fetchJSON('/health');

export const listDevices = () =>
  fetchJSON('/admin/devices');

export const verifyDevice = (sn) =>
  fetchJSON(`/admin/verify/${sn}`, { method: 'POST' });

export const unverifyDevice = (sn) =>
  fetchJSON(`/admin/verify/${sn}`, { method: 'DELETE' });

export const reuploadDevice = (sn) =>
  fetchJSON(`/admin/reupload/${sn}`, { method: 'POST' });

export const rebootDevice = (sn) =>
  fetchJSON(`/admin/reboot/${sn}`, { method: 'POST' });

export const clearLog = (sn) =>
  fetchJSON(`/admin/clearlog/${sn}`, { method: 'POST' });

export const infoDevice = (sn) =>
  fetchJSON(`/admin/info/${sn}`, { method: 'POST' });

export const getDevicePegawai = (sn, { limit, offset, search } = {}) => {
  const p = new URLSearchParams();
  if (limit !== undefined && limit !== null) p.append('limit', limit);
  if (offset !== undefined && offset !== null) p.append('offset', offset);
  if (search) p.append('search', search);
  const qs = p.toString();
  return fetchJSON(`/admin/devices/${sn}/pegawai${qs ? `?${qs}` : ''}`);
};

export const getPegawai = (pin) =>
  fetchJSON(`/admin/pegawai/${pin}`);

export const getAttendanceLogs = ({ limit = 100, offset = 0, sn, pin, year, month, startDate, endDate, search } = {}) => {
  const p = new URLSearchParams();
  if (limit) p.append('limit', limit);
  if (offset !== undefined) p.append('offset', offset);
  if (sn) p.append('sn', sn);
  if (pin) p.append('pin', pin);
  if (year) p.append('year', year);
  if (month) p.append('month', month);
  if (startDate) p.append('startDate', startDate);
  if (endDate) p.append('endDate', endDate);
  if (search) p.append('search', search);
  return fetchJSON(`/admin/attendance?${p.toString()}`);
};

export const searchPegawai = (q, limit = 10) =>
  fetchJSON(`/admin/pegawai/search?q=${encodeURIComponent(q)}&limit=${limit}`);

export const getStats = () =>
  fetchJSON('/admin/stats');

export const getCommandQueue = () =>
  fetchJSON('/admin/commands/queue');

export const getReuploadQueue = () =>
  fetchJSON('/admin/reupload/queue');

export const checkFingerprint = (pin, sn) =>
  fetchJSON(`/admin/fingerprint-check?pin=${encodeURIComponent(pin)}&sn=${encodeURIComponent(sn)}`);

export const transferFingerprint = (sn, { pin, source_sn }) =>
  fetchJSON(`/admin/transferfp/${sn}`, { method: 'POST', body: JSON.stringify({ pin, source_sn }) });

export const enrollFingerprint = (sn, { pin, fid, retry, overwrite }) =>
  fetchJSON(`/admin/enrollfp/${sn}`, { method: 'POST', body: JSON.stringify({ pin, fid, retry, overwrite }) });

export const updateUser = (sn, { pin, privilege, passwd }) =>
  fetchJSON(`/admin/user/${sn}`, { method: 'POST', body: JSON.stringify({ pin, privilege, passwd }) });

export const deleteUser = (sn, pin) =>
  fetchJSON(`/admin/user/${sn}/${pin}`, { method: 'DELETE' });

export const updateDeviceName = (sn, device_name) =>
  fetchJSON(`/admin/devices/${sn}`, { method: 'PATCH', body: JSON.stringify({ device_name }) });

export const getAdminUsers = () =>
  fetchJSON('/admin/users');

export const createAdminUser = (userData) =>
  fetchJSON('/admin/users', { method: 'POST', body: JSON.stringify(userData) });

export const updateAdminUser = (id, userData) =>
  fetchJSON(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });

export const resetAdminUserPassword = (id, newPassword, oldPassword) =>
  fetchJSON(`/admin/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ newPassword, oldPassword }) });

export const deleteAdminUser = (id) =>
  fetchJSON(`/admin/users/${id}`, { method: 'DELETE' });

export const getAdminRoles = () =>
  fetchJSON('/admin/roles');

export const getAdminPermissions = () =>
  fetchJSON('/admin/permissions');

export const createAdminRole = (roleData) =>
  fetchJSON('/admin/roles', { method: 'POST', body: JSON.stringify(roleData) });

export const updateAdminRole = (id, roleData) =>
  fetchJSON(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(roleData) });

export const deleteAdminRole = (id) =>
  fetchJSON(`/admin/roles/${id}`, { method: 'DELETE' });


