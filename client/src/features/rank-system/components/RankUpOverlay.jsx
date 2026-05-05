import { useEffect, useRef } from 'react';
import { RANK_META } from '../constants.js';

const STYLE_ID = 'rankup-overlay-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes rankup-burst {
      0%   { opacity: 0; transform: scale(0.5); }
      50%  { opacity: 1; transform: scale(1.1); }
      70%  { transform: scale(0.97); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes rankup-badge {
      0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
      60%  { transform: scale(1.2) rotate(3deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes rankup-text {
      0%   { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes star-fly {
      0%   { opacity: 1; transform: translate(0,0) scale(1); }
      100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); }
    }
    @keyframes rankup-shimmer {
      0%,100% { opacity: 0.4; }
      50%      { opacity: 1; }
    }
  `;
  document.head.appendChild(el);
}

const STARS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * 2 * Math.PI;
  const dist  = 80 + Math.random() * 80;
  return {
    tx: `${Math.cos(angle) * dist}px`,
    ty: `${Math.sin(angle) * dist}px`,
    delay: Math.random() * 0.4,
    size: 4 + Math.random() * 6,
  };
});

export function RankUpOverlay({ rankUp, onDismiss, t }) {
  injectStyles();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!rankUp) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timerRef.current);
  }, [rankUp, onDismiss]);

  if (!rankUp) return null;

  const meta = RANK_META[rankUp.toRank];
  const rankLabel = t ? t(`gamification.ranks.${rankUp.toRank}`) : meta.label;

  return (
    <div style={{ ...s.overlay, background: `radial-gradient(ellipse at center, ${meta.glow} 0%, rgba(0,0,0,0.96) 70%)` }} onClick={onDismiss}>
      <div style={{ ...s.card, animation: 'rankup-burst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>

        {/* Stars */}
        {STARS.map((star, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: star.size,
              height: star.size,
              borderRadius: '50%',
              background: meta.color,
              top: '50%',
              left: '50%',
              '--tx': star.tx,
              '--ty': star.ty,
              animation: `star-fly 0.8s ${star.delay}s ease-out forwards`,
              boxShadow: `0 0 4px ${meta.color}`,
            }}
          />
        ))}

        {/* Shimmer ring */}
        <div style={{
          position: 'absolute', inset: -24,
          borderRadius: '50%',
          border: `2px solid ${meta.color}`,
          animation: 'rankup-shimmer 1.5s ease-in-out 3',
          opacity: 0,
        }} />

        <div style={{ ...s.rankIcon, animation: 'rankup-badge 0.5s 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
          {meta.icon}
        </div>

        <div style={{ animation: 'rankup-text 0.4s 0.7s ease-out both' }}>
          <div style={s.rankUpLabel}>
            {t ? t('gamification.rankUp') : 'RANK UP!'}
          </div>
          <div style={{ ...s.newRankName, color: meta.color }}>
            {rankLabel}
          </div>
          <div style={s.perkText}>
            {t ? t(`gamification.rankPerks.${rankUp.toRank}`) : `You've reached ${rankLabel}!`}
          </div>
        </div>

        <button style={{ ...s.dismissBtn, borderColor: meta.color, color: meta.color }} onClick={onDismiss}>
          {t ? t('gamification.rankUpDismiss') : 'Awesome!'}
        </button>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  card: {
    position: 'relative',
    background: 'rgba(10,10,15,0.95)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 28,
    padding: '48px 36px 32px',
    textAlign: 'center',
    width: 300,
    overflow: 'visible',
    backdropFilter: 'blur(20px)',
  },
  rankIcon: {
    fontSize: 72,
    lineHeight: 1,
    display: 'block',
    marginBottom: 16,
  },
  rankUpLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    fontWeight: 700,
    marginBottom: 4,
  },
  newRankName: {
    fontSize: 42,
    fontWeight: 800,
    fontFamily: 'Impact, Arial Black, sans-serif',
    letterSpacing: '0.04em',
    lineHeight: 1,
    marginBottom: 12,
  },
  perkText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.5,
    marginBottom: 24,
    maxWidth: 220,
    margin: '0 auto 24px',
  },
  dismissBtn: {
    background: 'transparent',
    border: '2px solid',
    borderRadius: 40,
    padding: '10px 32px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginTop: 8,
  },
};
