const API_BASE = import.meta.env.VITE_API_URL || '';

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const verifyPin = (token, pin) =>
  fetch(`${API_BASE}/api/admin/verify-pin`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ pin }),
  }).then(handleResponse);

export const getAttendance = (token, { date, search } = {}) => {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (search) params.set('search', search);
  return fetch(`${API_BASE}/api/admin/attendance?${params}`, {
    headers: authHeaders(token),
  }).then(handleResponse);
};

export const getMembers = (token, { search, limit, offset, sort, order, statuses = [], packageIds = [], newOnly } = {}) => {
  const params = new URLSearchParams();
  if (search)         params.set('search', search);
  if (limit  != null) params.set('limit',  limit);
  if (offset != null) params.set('offset', offset);
  if (sort)           params.set('sort',   sort);
  if (order)          params.set('order',  order);
  statuses.forEach((s)   => params.append('status',    s));
  packageIds.forEach((id) => params.append('packageId', id));
  if (newOnly)        params.set('newOnly', newOnly);
  return fetch(`${API_BASE}/api/admin/members?${params}`, {
    headers: authHeaders(token),
  }).then(handleResponse);
};

export const addMember = (token, name, expiryDate, phoneNumber) =>
  fetch(`${API_BASE}/api/admin/members`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, expiryDate, phoneNumber }),
  }).then(handleResponse);

export const updateMember = (token, id, name, expiryDate, packageId, phoneNumber) =>
  fetch(`${API_BASE}/api/admin/members/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ name, expiryDate, packageId, phoneNumber }),
  }).then(handleResponse);

export const deleteMember = (token, id, pin) =>
  fetch(`${API_BASE}/api/admin/members/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
    body: JSON.stringify({ pin }),
  }).then(handleResponse);

export const changePin = (token, currentPin, newPin) =>
  fetch(`${API_BASE}/api/admin/pin`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ currentPin, newPin }),
  }).then(handleResponse);

export const exportMembers = (token) =>
  fetch(`${API_BASE}/api/admin/members/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const downloadTemplate = (token) =>
  fetch(`${API_BASE}/api/admin/members/template`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const previewImport = (token, file) => {
  const form = new FormData();
  form.append('file', file);
  return fetch(`${API_BASE}/api/admin/members/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  }).then(handleResponse);
};

export const confirmImport = (token, rows) =>
  fetch(`${API_BASE}/api/admin/members/import/confirm`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ rows }),
  }).then(handleResponse);

export const getStaff = (token) =>
  fetch(`${API_BASE}/api/admin/staff`, {
    headers: authHeaders(token),
  }).then(handleResponse);

export const addStaff = (token, email, password) =>
  fetch(`${API_BASE}/api/admin/staff`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ email, password }),
  }).then(handleResponse);

export const removeStaff = (token, id, pin) =>
  fetch(`${API_BASE}/api/admin/staff/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
    body: JSON.stringify({ pin }),
  }).then(handleResponse);

export const changeStaffPassword = (token, id, newPassword, pin) =>
  fetch(`${API_BASE}/api/admin/staff/${id}/password`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ newPassword, pin }),
  }).then(handleResponse);

export const getPackages = (token) =>
  fetch(`${API_BASE}/api/packages`, {
    headers: authHeaders(token),
  }).then(handleResponse);

export const createPackage = (token, data) =>
  fetch(`${API_BASE}/api/packages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const updatePackage = (token, id, data) =>
  fetch(`${API_BASE}/api/packages/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const deletePackage = (token, id) =>
  fetch(`${API_BASE}/api/packages/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }).then(handleResponse);

export const setDefaultPackage = (token, id) =>
  fetch(`${API_BASE}/api/packages/${id}/default`, {
    method: 'PATCH',
    headers: authHeaders(token),
  }).then(handleResponse);

export const addMemberWithPackage = (token, name, expiryDate, packageId, phoneNumber) =>
  fetch(`${API_BASE}/api/admin/members`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, expiryDate, packageId, phoneNumber }),
  }).then(handleResponse);

export const getSettings = (token) =>
  fetch(`${API_BASE}/api/admin/settings`, {
    headers: authHeaders(token),
  }).then(handleResponse);

export const setVisitorPrice = (token, price) =>
  fetch(`${API_BASE}/api/admin/settings/visitor-price`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ price }),
  }).then(handleResponse);

export const setRegFeeRule = (token, enabled, graceMonths) =>
  fetch(`${API_BASE}/api/admin/settings/reg-fee-rule`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ enabled, graceMonths }),
  }).then(handleResponse);
