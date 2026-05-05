const BASE = '/api/member/gamification';

const headers = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export async function fetchGamificationState(token) {
  const res = await fetch(BASE, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to fetch gamification state');
  return res.json();
}

export async function fetchXpLog(token, page = 1, limit = 20) {
  const res = await fetch(`${BASE}/xp-log?page=${page}&limit=${limit}`, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to fetch XP log');
  return res.json();
}

export async function fetchPendingSpins(token) {
  const res = await fetch(`${BASE}/gacha/pending`, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to fetch pending spins');
  return res.json();
}

export async function executeSpin(token, spinId) {
  const res = await fetch(`${BASE}/gacha/spin`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ spinId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error || 'Spin failed'), { statusCode: res.status });
  }
  return res.json();
}

export async function grantShieldAdmin(token, memberId) {
  const res = await fetch(`/api/admin/gamification/${memberId}/shield/grant`, {
    method: 'POST',
    headers: headers(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to grant shield');
  }
  return res.json();
}
