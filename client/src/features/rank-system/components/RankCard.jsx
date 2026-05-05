import { useEffect, useRef, useState } from 'react';
import { useGamification } from '../hooks/useGamification.js';
import { RANK_META } from '../constants.js';

const STYLE_ID = 'rank-card-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes xp-bar-fill {
      from { width: 0% }
    }
    @keyframes rank-badge-pulse {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.08); }
    }
    @keyframes rank-card-glow-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(el);
}

export function RankCard({ t }) {
  injectStyles();
  const { state } = useGamification();
  const barRef = useRef(null);
  const mountedRef = useRef(false);
  const animReadyRef = useRef(false);
  const latestPctRef = useRef(0);
  const prevXpRef = useRef(0);
  const animFrameRef = useRef(null);
  const [displayXp, setDisplayXp] = useState(0);
  const { data, loading } = state;

  const rank      = data?.rank ?? 'rookie';
  const meta      = RANK_META[rank];
  const nextRank  = data?.nextRank ?? null;
  const totalXp   = data?.totalXp ?? 0;
  const pct       = data?.progressPct ?? 0;
  const xpToNext  = data?.xpToNextRank ?? 0;

  useEffect(() => {
    if (!barRef.current) return;
    latestPctRef.current = pct;
    if (!animReadyRef.current) {
      // First mount, OR barRef was null when the rAF fired (skeleton was showing).
      // Either way, restart the 0% → target animation.
      mountedRef.current = true;
      barRef.current.style.width = '0%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (barRef.current) {
            barRef.current.style.width = `${latestPctRef.current}%`;
            animReadyRef.current = true;
          }
        });
      });
    } else {
      barRef.current.style.width = `${pct}%`;
    }
  }, [pct]);

  useEffect(() => {
    const from = prevXpRef.current;
    const to = totalXp;
    if (from === to) { setDisplayXp(to); return; }
    const duration = 600;
    const start = performance.now();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayXp(Math.round(from + (to - from) * progress));
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        prevXpRef.current = to;
      }
    }
    animFrameRef.current = requestAnimationFrame(step);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [totalXp]);

  if (loading && !data) {
    return (
      <div style={s.skeleton}>
        <div style={s.skeletonBadge} />
        <div style={s.skeletonBar} />
      </div>
    );
  }

  const rankLabel = t ? t(`gamification.ranks.${rank}`) : meta.label;
  const nextLabel = nextRank ? (t ? t(`gamification.ranks.${nextRank}`) : RANK_META[nextRank]?.label) : null;

  return (
    <div style={{ ...s.card, borderColor: `${meta.color}55`, boxShadow: `0 0 32px ${meta.glow}` }}>
      <div style={s.topRow}>
        <div style={s.badgeWrap}>
          <span style={{ ...s.rankIcon, animation: 'rank-badge-pulse 3s ease-in-out infinite' }}>
            {meta.icon}
          </span>
          <div>
            <div style={{ ...s.rankLabel, color: '#FFFFFF' }}>{rankLabel}</div>
            <div style={s.rankSub}>
              {t ? t('gamification.sectionTitle') : 'Rank & Progress'}
            </div>
          </div>
        </div>
        <div style={s.xpTotal}>
          <span style={{ ...s.xpNumber, color: '#FFFFFF' }}>{displayXp.toLocaleString()}</span>
          <span style={s.xpUnit}> XP</span>
        </div>
      </div>

      <div style={s.barTrack}>
        <div
          ref={barRef}
          style={{
            ...s.barFill,
            background: 'linear-gradient(90deg, #BEFE00cc, #BEFE00)',
            boxShadow: '0 0 8px rgba(190,254,0,0.5)',
            transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>

      <div style={s.barMeta}>
        {nextRank ? (
          <>
            <span style={s.barMetaLeft}>
              {t ? t('gamification.xpToNextRank', { xp: xpToNext.toLocaleString(), rank: nextLabel }) : `${xpToNext.toLocaleString()} XP to ${nextLabel}`}
            </span>
            <span style={{ ...s.barMetaRight, color: meta.color }}>{pct}%</span>
          </>
        ) : (
          <span style={{ ...s.barMetaLeft, color: meta.color }}>
            {t ? t('gamification.atMaxRank') : 'Maximum rank achieved'}
          </span>
        )}
      </div>
    </div>
  );
}

const s = {
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid',
    borderRadius: 20,
    padding: '20px 18px',
    marginBottom: 10,
    animation: 'rank-card-glow-in 0.4s ease-out',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badgeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  rankIcon: {
    fontSize: 36,
    lineHeight: 1,
    display: 'inline-block',
  },
  rankLabel: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: '0.01em',
    lineHeight: 1.2,
    fontFamily: 'Impact, Arial Black, sans-serif',
  },
  rankSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginTop: 1,
  },
  xpTotal: {
    textAlign: 'right',
  },
  xpNumber: {
    fontSize: 28,
    fontWeight: 800,
    fontFamily: 'Impact, Arial Black, sans-serif',
  },
  xpUnit: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600,
  },
  barTrack: {
    height: 8,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    width: '0%',
  },
  barMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barMetaLeft: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  barMetaRight: {
    fontSize: 12,
    fontWeight: 700,
  },
  skeleton: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: '20px 18px',
    marginBottom: 10,
  },
  skeletonBadge: {
    width: 120,
    height: 24,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    marginBottom: 16,
  },
  skeletonBar: {
    width: '100%',
    height: 8,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
  },
};
