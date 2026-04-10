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

export const addMember = (token, name) =>
  fetch(`${API_BASE}/api/admin/members`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  }).then(handleResponse);

export const updateMember = (token, id, name) =>
  fetch(`${API_BASE}/api/admin/members/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  }).then(handleResponse);

export const deleteMember = (token, id) =>
  fetch(`${API_BASE}/api/admin/members/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }).then(handleResponse);

export const changePin = (token, currentPin, newPin) =>
  fetch(`${API_BASE}/api/admin/pin`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ currentPin, newPin }),
  }).then(handleResponse);
