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

export const getMembers = (token, { search } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  return fetch(`${API_BASE}/api/admin/members?${params}`, {
    headers: authHeaders(token),
  }).then(handleResponse);
};

export const addMember = (token, name, expiryDate) =>
  fetch(`${API_BASE}/api/admin/members`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, expiryDate }),
  }).then(handleResponse);

export const updateMember = (token, id, name, expiryDate) =>
  fetch(`${API_BASE}/api/admin/members/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ name, expiryDate }),
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
