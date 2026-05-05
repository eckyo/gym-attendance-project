import { useState, useEffect } from 'react';
import { useGamification } from '../hooks/useGamification.js';
import { RARITY_META } from '../constants.js';

export function ActiveBoostBanner({ t }) {
  const { state } = useGamification();
  const boost = state.data?.activeBoost ?? null;
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!boost) return;
    const update = () => {
      const ms = new Date(boost.expiresAt) - Date.now();
      if (ms <= 0) { setRemaining(''); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setRemaining(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [boost]);

  if (!boost || !remaining) return null;

  const rarityColor = RARITY_META[boost.rarity]?.color ?? '#A855F7';
  const pct = Math.round((boost.multiplier - 1) * 100);
  const tStr = (k, fb) => t ? t(k) : fb;

  return (
    <div style={{
      ...s.banner,
      background: `rgba(${hexToRgb(rarityColor)}, 0.1)`,
      border: `1px solid rgba(${hexToRgb(rarityColor)}, 0.3)`,
    }}>
      <span style={{ color: rarityColor, fontWeight: 700, fontSize: 13 }}>
        ⚡ {tStr('gamification.boosts.active', `+${pct}% XP active`).replace('{pct}', pct)}
      </span>
      <span style={s.expiry}>
        {tStr('gamification.boosts.expiresIn', `Expires in ${remaining}`).replace('{time}', remaining)}
      </span>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const s = {
  banner: {
    borderRadius: 12,
    padding: '9px 14px',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  expiry: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
};
