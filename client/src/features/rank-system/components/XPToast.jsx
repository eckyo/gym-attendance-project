import { useEffect, useRef } from 'react';

const STYLE_ID = 'xp-toast-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes xp-toast-in {
      0%   { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.9); }
      15%  { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1.05); }
      25%  { transform: translateX(-50%) translateY(0) scale(1); }
      75%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.95); }
    }
  `;
  document.head.appendChild(el);
}

export function XPToast({ toast, onDismiss, t }) {
  injectStyles();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!toast) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timerRef.current);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const { xpEarned, breakdown } = toast;
  const parts = [];
  if (breakdown?.rankMult)   parts.push(`×${breakdown.rankMult}`);
  if (breakdown?.gachaBoost) parts.push(`+${Math.round(breakdown.gachaBoost * 100)}% boost`);

  return (
    <div style={s.toast} onClick={onDismiss}>
      <div style={s.xpAmount}>+{xpEarned} XP</div>
      {parts.length > 0 && (
        <div style={s.breakdown}>{parts.join(' · ')}</div>
      )}
    </div>
  );
}

const s = {
  toast: {
    position: 'fixed',
    bottom: 100,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 8000,
    background: 'rgba(0,0,0,0.85)',
    border: '1px solid rgba(245,158,11,0.5)',
    borderRadius: 16,
    padding: '12px 24px',
    textAlign: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
    animation: 'xp-toast-in 3s ease-in-out forwards',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 0 24px rgba(245,158,11,0.3)',
    minWidth: 160,
  },
  xpAmount: {
    fontSize: 28,
    fontWeight: 800,
    color: '#F59E0B',
    fontFamily: 'Impact, Arial Black, sans-serif',
    letterSpacing: '0.02em',
    lineHeight: 1,
  },
  breakdown: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
    letterSpacing: '0.02em',
  },
};
