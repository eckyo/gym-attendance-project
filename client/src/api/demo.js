const API = import.meta.env.VITE_API_URL || '';

export async function startDemo(role) {
  const res = await fetch(`${API}/api/demo/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Demo unavailable');
  return data; // { token, role, gymName, expiresAt, isDemo: true }
}
