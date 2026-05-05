import { useState, useCallback, useRef } from 'react';
import { useGamification } from '../hooks/useGamification.js';
import { RARITY_META } from '../constants.js';

const STYLE_ID = 'gacha-modal-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes chest-rattle {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-7px) rotate(-2deg); }
      40%      { transform: translateX(7px) rotate(2deg); }
      60%      { transform: translateX(-5px) rotate(-1deg); }
      80%      { transform: translateX(5px) rotate(1deg); }
    }
    @keyframes chest-lid-lift-1 { to { transform: rotateX(20deg); } }
    @keyframes chest-lid-lift-2 { to { transform: rotateX(40deg); } }
    @keyframes chest-lid-open   { to { transform: rotateX(90deg) translateY(-80%); opacity: 0; } }
    @keyframes chest-explode {
      0%   { transform: scale(1); opacity: 1; }
      60%  { transform: scale(3.5); opacity: 0.6; }
      100% { transform: scale(5); opacity: 0; }
    }
    @keyframes ray-burst {
      0%   { opacity: 0.9; transform: scaleY(0) translateY(0); }
      100% { opacity: 0;   transform: scaleY(1) translateY(-100px); }
    }
    @keyframes screen-shake {
      0%,100% { transform: translate(0,0); }
      20%      { transform: translate(-4px,-2px); }
      40%      { transform: translate(4px,2px); }
      60%      { transform: translate(-3px,1px); }
      80%      { transform: translate(3px,-1px); }
    }
    @keyframes reward-rise {
      0%   { opacity: 0; transform: translateY(40px) scale(0.8); }
      60%  { opacity: 1; transform: translateY(-8px) scale(1.04); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes badge-slam {
      0%   { transform: scale(2.5); opacity: 0; }
      60%  { transform: scale(0.9); opacity: 1; }
      80%  { transform: scale(1.05); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes reward-card-in {
      0%   { opacity: 0; transform: translateY(60px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes ambient-pulse {
      0%,100% { opacity: 0.3; transform: scale(1); }
      50%      { opacity: 0.7; transform: scale(1.15); }
    }
    @keyframes particle-fly-1  { to { transform: translate(80px, -120px) rotate(180deg); opacity: 0; } }
    @keyframes particle-fly-2  { to { transform: translate(-90px, -100px) rotate(-120deg); opacity: 0; } }
    @keyframes particle-fly-3  { to { transform: translate(110px, -40px) rotate(90deg); opacity: 0; } }
    @keyframes particle-fly-4  { to { transform: translate(-100px, -50px) rotate(200deg); opacity: 0; } }
    @keyframes particle-fly-5  { to { transform: translate(60px, 100px) rotate(-90deg); opacity: 0; } }
    @keyframes particle-fly-6  { to { transform: translate(-70px, 90px) rotate(150deg); opacity: 0; } }
    @keyframes particle-fly-7  { to { transform: translate(30px, -130px) rotate(-60deg); opacity: 0; } }
    @keyframes particle-fly-8  { to { transform: translate(-40px, -110px) rotate(240deg); opacity: 0; } }
    @keyframes hint-fade { 0%,60%{opacity:0.6} 100%{opacity:0} }
    @keyframes glow-breathe {
      0%,100%{box-shadow:0 0 40px var(--gc,rgba(245,158,11,0.3))}
      50%    {box-shadow:0 0 80px var(--gc,rgba(245,158,11,0.6))}
    }
    @keyframes spinner-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(el);
}

const CHEST_STATES = ['IDLE', 'CLICK_1', 'CLICK_2', 'CLICK_3', 'CLICK_4', 'SPINNING', 'REVEALED'];
const TOTAL_CLICKS = 5;

const PARTICLES = [
  { color: '#F59E0B', n: 1 }, { color: '#EF4444', n: 2 },
  { color: '#3B82F6', n: 3 }, { color: '#A855F7', n: 4 },
  { color: '#22C55E', n: 5 }, { color: '#F97316', n: 6 },
  { color: '#EC4899', n: 7 }, { color: '#F59E0B', n: 8 },
];

function GlowBg({ step, rarityColor }) {
  const baseColor = step >= 5 ? rarityColor : 'rgba(245,158,11,0.3)';
  const size = 200 + step * 60;
  return (
    <div style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: '50%',
      background: baseColor,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      filter: 'blur(60px)',
      animation: 'ambient-pulse 2s ease-in-out infinite',
      opacity: 0.3 + step * 0.08,
      transition: 'width 0.3s, height 0.3s, background 0.5s',
      pointerEvents: 'none',
    }} />
  );
}

function Rays({ show }) {
  if (!show) return null;
  return (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: 3,
          height: 60,
          background: 'linear-gradient(to top, rgba(245,158,11,0.8), transparent)',
          top: '50%',
          left: '50%',
          transformOrigin: 'bottom center',
          transform: `rotate(${deg}deg) translateX(-50%)`,
          animation: `ray-burst 0.6s ${i * 0.05}s ease-out forwards`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}

function ParticlesBurst({ show, color }) {
  if (!show) return null;
  return (
    <>
      {PARTICLES.map(p => (
        <div key={p.n} style={{
          position: 'absolute',
          width: 7,
          height: 7,
          borderRadius: 2,
          background: color ?? p.color,
          top: '50%',
          left: '50%',
          animation: `particle-fly-${p.n} 0.7s ease-out forwards`,
          boxShadow: `0 0 4px ${p.color}`,
        }} />
      ))}
    </>
  );
}

export function GachaModal({ t, spins }) {
  injectStyles();
  const { state, performSpin, closeGacha } = useGamification();
  const { showGachaModal, activeSpinId, gachaResult } = state;

  const [step, setStep] = useState(0);
  const [shaking, setShaking]     = useState(false);
  const [exploding, setExploding] = useState(false);
  const [showRays, setShowRays]   = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [screenShake, setScreenShake]     = useState(false);
  const spinningRef = useRef(false);

  const handleClick = useCallback(async () => {
    if (step >= TOTAL_CLICKS || spinningRef.current) return;

    const next = step + 1;
    setStep(next);

    if (next <= 2) {
      // Rattle
      setShaking(true);
      setTimeout(() => setShaking(false), 450);
    }

    if (next === 3 || next === 4) {
      setShowRays(true);
      setShowParticles(true);
      setTimeout(() => { setShowRays(false); setShowParticles(false); }, 700);
    }

    if (next === 4) {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 400);
    }

    if (next === TOTAL_CLICKS) {
      // Final click — fire spin
      spinningRef.current = true;
      setExploding(true);
      setShowParticles(true);
      setShowRays(true);
      setTimeout(() => {
        setExploding(false);
        setShowRays(false);
      }, 700);
      try {
        await performSpin(activeSpinId);
      } catch (err) {
        console.error('Spin failed:', err);
        setStep(TOTAL_CLICKS - 1);
      } finally {
        spinningRef.current = false;
      }
    }
  }, [step, activeSpinId, performSpin]);

  const handleClose = useCallback(() => {
    setStep(0);
    setShaking(false);
    setExploding(false);
    setShowRays(false);
    setShowParticles(false);
    spinningRef.current = false;
    closeGacha();
  }, [closeGacha]);

  if (!showGachaModal) return null;

  const isRevealed  = step === TOTAL_CLICKS && !!gachaResult;
  const isSpinning  = step === TOTAL_CLICKS && !gachaResult;
  const rarityMeta  = gachaResult ? RARITY_META[gachaResult.rarity] : null;
  const pct         = gachaResult ? Math.round((gachaResult.multiplier - 1) * 100) : 0;

  const glowColor   = rarityMeta ? rarityMeta.glow : 'rgba(245,158,11,0.4)';

  // Lid lift angle by step
  const lidAnim = step === 1 || step === 2 ? 'chest-lid-lift-1 0.3s ease-out forwards'
    : step === 3 || step === 4 ? 'chest-lid-lift-2 0.4s ease-out forwards'
    : step >= TOTAL_CLICKS ? 'chest-lid-open 0.4s ease-out forwards'
    : 'none';

  const tStr = (k, fb) => t ? t(k) : fb;

  return (
    <div style={{
      ...s.overlay,
      animation: screenShake ? 'screen-shake 0.4s ease-out' : 'none',
    }}>
      {/* Background glow */}
      <GlowBg step={step} rarityColor={rarityMeta?.color ?? '#F59E0B'} />

      {/* Rays & particles (positioned relative to chest) */}
      <div style={s.chestsArea}>
        <Rays show={showRays} />
        <ParticlesBurst show={showParticles} color={rarityMeta?.color} />

        {!isRevealed && (
          <>
            {/* Chest assembly */}
            <div
              style={{
                cursor: isSpinning ? 'wait' : 'pointer',
                position: 'relative',
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: shaking ? 'chest-rattle 0.45s ease-in-out' : 'none',
              }}
              onClick={!isSpinning ? handleClick : undefined}
            >
              {/* Lid */}
              <div style={{
                perspective: 400,
                transformStyle: 'preserve-3d',
              }}>
                <div style={{
                  fontSize: 80,
                  lineHeight: 0.8,
                  transformOrigin: 'top center',
                  animation: lidAnim,
                  display: 'block',
                  filter: exploding ? `drop-shadow(0 0 32px ${rarityMeta?.color ?? '#F59E0B'})` : 'none',
                }}>
                  🎁
                </div>
              </div>

              {/* Pips */}
              <div style={s.pips}>
                {Array.from({ length: TOTAL_CLICKS }, (_, i) => (
                  <div key={i} style={{
                    ...s.pip,
                    background: i < step ? '#F59E0B' : 'rgba(255,255,255,0.15)',
                    boxShadow: i < step ? '0 0 6px rgba(245,158,11,0.8)' : 'none',
                  }} />
                ))}
              </div>

              {/* Hint text */}
              {step === 0 && (
                <div style={{ ...s.hintText, animation: 'hint-fade 2s ease-in-out infinite' }}>
                  TAP TO OPEN
                </div>
              )}

              {/* Spinning state */}
              {isSpinning && (
                <div style={s.spinnerWrap}>
                  <div style={s.spinner} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Revealed reward */}
        {isRevealed && (
          <div style={{ ...s.rewardCard, borderColor: rarityMeta.color, boxShadow: `0 0 40px ${rarityMeta.glow}` }}>
            <div style={{ ...s.rarityBadge, color: rarityMeta.color, animation: 'badge-slam 0.5s ease-out both' }}>
              {tStr(`gamification.gacha.result${rarityMeta.label}`, rarityMeta.label.toUpperCase() + '!')}
            </div>
            <div style={{ ...s.rewardIcon, animation: 'reward-rise 0.5s 0.2s ease-out both' }}>
              ⚡
            </div>
            <div style={{ ...s.rewardText, color: rarityMeta.color, animation: 'reward-card-in 0.4s 0.4s ease-out both' }}>
              +{pct}% XP
            </div>
            <div style={{ ...s.rewardDuration, animation: 'reward-card-in 0.4s 0.5s ease-out both' }}>
              {tStr('gamification.gacha.rewardDescription', `+${pct}% XP for ${gachaResult.durationDays} days`)
                .replace('{pct}', pct)
                .replace('{days}', gachaResult.durationDays)}
            </div>
            <button
              style={{ ...s.claimBtn, background: '#BEFE00', animation: 'reward-card-in 0.4s 0.6s ease-out both' }}
              onClick={handleClose}
            >
              {tStr('gamification.gacha.confirmSpin', 'Claim Reward')}
            </button>
          </div>
        )}
      </div>

      {/* Close if not yet opened */}
      {!isRevealed && (
        <button style={s.closeBtn} onClick={handleClose}>✕</button>
      )}
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9500,
    background: 'rgba(0,0,0,0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  },
  chestsArea: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 340,
  },
  pips: {
    display: 'flex',
    gap: 8,
    marginTop: 24,
  },
  pip: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    transition: 'background 0.2s, box-shadow 0.2s',
  },
  hintText: {
    marginTop: 16,
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  spinnerWrap: {
    marginTop: 20,
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid rgba(245,158,11,0.2)',
    borderTop: '3px solid #F59E0B',
    borderRadius: '50%',
    animation: 'spinner-spin 0.8s linear infinite',
  },
  rewardCard: {
    border: '2px solid',
    borderRadius: 24,
    padding: '32px 28px',
    textAlign: 'center',
    background: 'rgba(10,10,15,0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    width: 260,
    backdropFilter: 'blur(16px)',
  },
  rarityBadge: {
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  rewardIcon: {
    fontSize: 52,
    lineHeight: 1,
    marginTop: 4,
  },
  rewardText: {
    fontSize: 36,
    fontWeight: 800,
    fontFamily: 'Impact, Arial Black, sans-serif',
    lineHeight: 1,
  },
  rewardDuration: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 8,
  },
  claimBtn: {
    border: 'none',
    borderRadius: 40,
    padding: '12px 36px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#000',
    marginTop: 4,
    opacity: 0,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '50%',
    width: 36,
    height: 36,
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
