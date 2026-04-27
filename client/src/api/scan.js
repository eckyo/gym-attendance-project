const API_BASE = import.meta.env.VITE_API_URL || '';

export const login = async (email, password) => {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
};

export const verifyScanPin = async (token, pin) => {
  const res = await fetch(`${API_BASE}/api/scan/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid PIN');
  return data;
};

export const registerMember = async (token, name, expiryDate, phoneNumber, packageId) => {
  const res = await fetch(`${API_BASE}/api/scan/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, expiryDate, phoneNumber, packageId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data;
};

export const checkInVisitor = async (token, name, phoneNumber) => {
  const res = await fetch(`${API_BASE}/api/scan/visitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, phoneNumber }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Walk-in check-in failed');
  return data;
};

export const postScan = async (token, scanToken) => {
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ scanToken }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Scan failed');
    err.data = data;
    throw err;
  }
  return data;
};

export const lookupMember = async (token, scanToken) => {
  const res = await fetch(`${API_BASE}/api/scan/member-lookup?scanToken=${encodeURIComponent(scanToken)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Member not found');
  return data;
};

export const extendMember = async (token, memberId, packageId, staffPassword) => {
  const res = await fetch(`${API_BASE}/api/scan/extend-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ memberId, packageId, staffPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Extension failed');
  return data;
};
