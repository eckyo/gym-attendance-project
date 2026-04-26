const BASE = '/api/member';

const headers = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const memberLogin = async (phoneNumber, password, gymId) => {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, password, gymId }),
  });
  return res.json();
};

export const getMemberProfile = async (token) => {
  const res = await fetch(`${BASE}/profile`, { headers: headers(token) });
  return res.json();
};

export const getMemberHistory = async (token, page = 1, limit = 30) => {
  const res = await fetch(`${BASE}/checkin-history?page=${page}&limit=${limit}`, {
    headers: headers(token),
  });
  return res.json();
};

export const memberCheckin = async (token, checkinCode) => {
  const res = await fetch(`${BASE}/checkin`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ checkinCode }),
  });
  return res.json();
};

export const changePassword = async (token, currentPassword, newPassword) => {
  const res = await fetch(`${BASE}/password`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return res.json();
};
