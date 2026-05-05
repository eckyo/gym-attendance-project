import { useGamification } from '../hooks/useGamification.js';

const STYLE_ID = 'streak-panel-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes visit-pop {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.35); }
      100% { transform: scale(1); }
    }
    @keyframes milestone-pulse {
      0%, 100% { box-shadow: 0 0 6px rgba(245,158,11,0.5); }
      50%       { box-shadow: 0 0 16px rgba(245,158,11,0.9); }
    }
  `;
  document.head.appendChild(el);
}

function buildWindow(totalVisits) {
  const windowStart = Math.max(1, totalVisits - 2);
  return Array.from({ length: 7 }, (_, i) => windowStart + i);
}

function SlotNode({ slot, totalVisits, nextMilestone, pendingSpin }) {
  const isUpcomingMilestone = slot === nextMilestone;
  const isDone              = slot <= totalVisits;
  const isClaimable         = !!pendingSpin;

  if (isClaimable) {
    return (
      <div
        role="button"
        style={{
          ...s.slot,
          ...s.slotClaimable,
          animation: 'milestone-pulse 1.5s ease-in-out infinite',
          cursor: 'pointer',
        }}
        onClick={pendingSpin.onOpen}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>🎁</span>
        <span style={{ ...s.slotNum, color: '#F59E0B' }}>{slot}</span>
      </div>
    );
  }

  if (isUpcomingMilestone) {
    return (
      <div style={{
        ...s.slot,
        ...s.slotMilestone,
        animation: 'milestone-pulse 2s ease-in-out infinite',
      }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>🎁</span>
        <span style={s.slotNum}>{slot}</span>
      </div>
    );
  }

  return (
    <div style={{
      ...s.slot,
      ...(isDone ? s.slotDone : s.slotEmpty),
    }}>
      <span style={{ fontSize: 14, lineHeight: 1, color: isDone ? '#BEFE00' : 'rgba(255,255,255,0.2)' }}>
        {isDone ? '✓' : '○'}
      </span>
      <span style={s.slotNum}>{slot}</span>
    </div>
  );
}

export function StreakPanel({ t, pendingSpins = [], onOpen }) {
  injectStyles();
  const { state } = useGamification();
  const { data } = state;

  const totalVisits   = data?.totalVisits           ?? 0;
  const nextMilestone = data?.nextMilestone         ?? null;
  const visitsAway    = data?.visitsToNextMilestone ?? 0;

  // Build a fast lookup: milestone_value → spin id (visits type only)
  const pendingByMilestone = {};
  for (const spin of pendingSpins) {
    if (spin.streak_type === 'visits') {
      pendingByMilestone[spin.milestone_value] = spin.id;
    }
  }

  const windowSlots = buildWindow(totalVisits);
  const milestoneInWindow    = nextMilestone !== null && windowSlots.includes(nextMilestone);
  const milestoneAfterWindow = nextMilestone !== null && !milestoneInWindow;

  const tStr = (k, fb) => t ? t(k) : fb;

  // If there are any claimable spins, show the top-row badge as "Open now" instead of "Next reward"
  const hasPending = pendingSpins.some(s => s.streak_type === 'visits');

  return (
    <div style={s.wrapper}>
      <div style={s.sectionTitle}>{tStr('gamification.streaks.sectionTitle', 'Gym Visits')}</div>

      <div style={s.card}>
        <div style={s.topRow}>
          <div>
            <div style={s.visitCount}>{totalVisits}</div>
            <div style={s.visitLabel}>{tStr('gamification.streaks.visitCount', 'gym visits')}</div>
          </div>
          {hasPending && (
            <div
              style={{ ...s.nextBadge, ...s.nextBadgeClaimable, cursor: 'pointer' }}
              onClick={() => {
                const firstSpin = pendingSpins.find(s => s.streak_type === 'visits');
                if (firstSpin) onOpen?.(firstSpin.id);
              }}
            >
              <span style={s.nextBadgeIcon}>🎁</span>
              <div>
                <div style={{ ...s.nextBadgeLabel, color: '#F59E0B' }}>{tStr('gamification.gacha.rewardReady', 'Reward ready!')}</div>
                <div style={{ ...s.nextBadgeValue, color: '#FFFFFF' }}>{tStr('gamification.gacha.openButton', 'Open')}</div>
              </div>
            </div>
          )}
          {!hasPending && nextMilestone && (
            <div style={s.nextBadge}>
              <span style={s.nextBadgeIcon}>🎁</span>
              <div>
                <div style={s.nextBadgeLabel}>{tStr('gamification.streaks.nextMilestoneLabel', 'Next reward')}</div>
                <div style={s.nextBadgeValue}>Day {nextMilestone}</div>
              </div>
            </div>
          )}
          {!hasPending && !nextMilestone && (
            <div style={s.maxLabel}>🏆 {tStr('gamification.streaks.allMilestonesReached', 'All reached!')}</div>
          )}
        </div>

        <div style={s.stripRow}>
          {windowSlots.map(slot => {
            const spinId = pendingByMilestone[slot];
            return (
              <SlotNode
                key={slot}
                slot={slot}
                totalVisits={totalVisits}
                nextMilestone={milestoneInWindow ? nextMilestone : null}
                pendingSpin={spinId ? { onOpen: () => onOpen?.(spinId) } : null}
              />
            );
          })}
          {milestoneAfterWindow && (
            <div style={s.ellipsisChest}>
              <span style={s.ellipsis}>···</span>
              <div style={{ ...s.slot, ...s.slotMilestone, animation: 'milestone-pulse 2s ease-in-out infinite' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>🎁</span>
                <span style={s.slotNum}>{nextMilestone}</span>
              </div>
            </div>
          )}
        </div>

        {!hasPending && nextMilestone && (
          <div style={s.footer}>
            {tStr('gamification.streaks.visitsAway', `${visitsAway} visits to Day ${nextMilestone} reward`)
              .replace('{count}', visitsAway)
              .replace('{milestone}', nextMilestone)}
          </div>
        )}
        {hasPending && (
          <div style={{ ...s.footer, color: '#F59E0B' }}>
            {tStr('gamification.gacha.tapToOpen', 'Tap the chest to open your reward')}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  wrapper: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '16px 14px 12px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  visitCount: {
    fontSize: 40,
    fontWeight: 800,
    fontFamily: 'Impact, Arial Black, sans-serif',
    color: '#FFFFFF',
    lineHeight: 1,
  },
  visitLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginTop: 2,
  },
  nextBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 10,
    padding: '6px 10px',
  },
  nextBadgeClaimable: {
    background: 'rgba(245,158,11,0.18)',
    border: '1px solid rgba(245,158,11,0.6)',
    boxShadow: '0 0 12px rgba(245,158,11,0.3)',
    animation: 'milestone-pulse 1.5s ease-in-out infinite',
  },
  nextBadgeIcon: {
    fontSize: 20,
  },
  nextBadgeLabel: {
    fontSize: 10,
    color: 'rgba(245,158,11,0.7)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  nextBadgeValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#F59E0B',
  },
  maxLabel: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: 700,
  },
  stripRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    overflowX: 'auto',
  },
  slot: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    width: 36,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    border: '1px solid transparent',
  },
  slotDone: {
    background: 'rgba(190,254,0,0.08)',
    border: '1px solid rgba(190,254,0,0.25)',
  },
  slotEmpty: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  slotMilestone: {
    background: 'rgba(245,158,11,0.12)',
    border: '1px solid rgba(245,158,11,0.4)',
  },
  slotClaimable: {
    background: 'rgba(245,158,11,0.22)',
    border: '1px solid rgba(245,158,11,0.8)',
    boxShadow: '0 0 10px rgba(245,158,11,0.35)',
  },
  slotNum: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 1,
    fontWeight: 600,
  },
  ellipsisChest: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  ellipsis: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: '0.05em',
  },
  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    letterSpacing: '0.02em',
  },
};
