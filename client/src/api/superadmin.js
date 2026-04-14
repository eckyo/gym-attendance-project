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

export const getGyms = (token) =>
  fetch(`${API_BASE}/api/superadmin/gyms`, {
    headers: authHeaders(token),
  }).then(handleResponse);

export const createGym = (token, { gymName, adminEmail, adminPassword }) =>
  fetch(`${API_BASE}/api/superadmin/gyms`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ gymName, adminEmail, adminPassword }),
  }).then(handleResponse);

export const toggleGym = (token, gymId) =>
  fetch(`${API_BASE}/api/superadmin/gyms/${gymId}/toggle`, {
    method: 'PATCH',
    headers: authHeaders(token),
  }).then(handleResponse);

export const resetAdminPassword = (token, gymId, newPassword) =>
  fetch(`${API_BASE}/api/superadmin/gyms/${gymId}/reset-password`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ newPassword }),
  }).then(handleResponse);
