import { useGamification } from '../hooks/useGamification.js';

const STYLE_ID = 'shield-display-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes shield-pulse {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(96,165,250,0.6)); }
      50%       { filter: drop-shadow(0 0 12px rgba(96,165,250,1)); }
    }
  `;
  document.head.appendChild(el);
}

export function ShieldDisplay({ t, shieldNotification, onDismissShield }) {
  injectStyles();
  const { state } = useGamification();
  const count = state.data?.shieldCount ?? 0;

  const tStr = (k, fb) => t ? t(k) : fb;

  return (
    <div style={s.wrapper}>
      <div style={s.label}>{tStr('gamification.shields.label', 'Shields')}</div>
      <div style={s.shields}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              fontSize: 22,
              opacity: i < count ? 1 : 0.18,
              filter: i < count ? undefined : 'grayscale(1)',
              animation: i < count && shieldNotification ? 'shield-pulse 0.8s ease-in-out 3' : 'none',
            }}
          >
            🛡️
          </span>
        ))}
        {shieldNotification && (
          <span
            style={s.notification}
            onClick={onDismissShield}
          >
            {tStr('gamification.shields.autoUsed', 'Shield used — streak protected!')}
          </span>
        )}
      </div>
    </div>
  );
}

const s = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 4px',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
    minWidth: 50,
  },
  shields: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  notification: {
    fontSize: 11,
    color: '#60A5FA',
    marginLeft: 8,
    cursor: 'pointer',
    animation: 'shield-pulse 0.8s ease-in-out infinite',
  },
};
