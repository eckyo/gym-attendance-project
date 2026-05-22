import { useState } from 'react';
import { useOnboarding } from './OnboardingContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';

const SETUP_OPTIONS = [
  {
    id: 'qr_phone',
    icon: '📱',
    labelKey: 'onboarding.welcome.qr_phone.label',
    descKey: 'onboarding.welcome.qr_phone.desc',
  },
  {
    id: 'tablet_kiosk',
    icon: '🖥️',
    labelKey: 'onboarding.welcome.tablet_kiosk.label',
    descKey: 'onboarding.welcome.tablet_kiosk.desc',
  },
  {
    id: 'pc_webcam',
    icon: '📷',
    labelKey: 'onboarding.welcome.pc_webcam.label',
    descKey: 'onboarding.welcome.pc_webcam.desc',
  },
];

export default function WelcomeModal() {
  const { t } = useTranslation();
  const { role, setupType, selectSetupType, loading, isDemo } = useOnboarding();
  const [skipped, setSkipped] = useState(
    () => !isDemo && !!sessionStorage.getItem('onboarding_wizard_skipped')
  );

  if (loading || role !== 'admin' || setupType !== null || skipped) return null;

  const handleSelect = (type) => {
    selectSetupType(type);
  };

  const handleSkip = () => {
    sessionStorage.setItem('onboarding_wizard_skipped', '1');
    setSkipped(true);
  };

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.title}>{t('onboarding.welcome.title')}</div>
          <div style={s.subtitle}>{t('onboarding.welcome.subtitle')}</div>
        </div>

        <div style={s.options}>
          {SETUP_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              style={s.optionBtn}
              onClick={() => handleSelect(opt.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(190,254,0,0.7)';
                e.currentTarget.style.background = 'rgba(190,254,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(190,254,0,0.25)';
                e.currentTarget.style.background = 'rgba(190,254,0,0.05)';
              }}
            >
              <span style={s.optionIcon}>{opt.icon}</span>
              <div style={s.optionText}>
                <div style={s.optionLabel}>{t(opt.labelKey)}</div>
                <div style={s.optionDesc}>{t(opt.descKey)}</div>
              </div>
              <span style={s.optionArrow}>→</span>
            </button>
          ))}
        </div>

        <button style={s.skipBtn} onClick={handleSkip}>
          {t('onboarding.welcome.skip')}
        </button>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '24px 16px',
  },
  card: {
    background: '#0f172a',
    border: '1.5px solid rgba(190,254,0,0.25)',
    borderRadius: 20,
    padding: '36px 32px 28px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 0 60px rgba(190,254,0,0.08), 0 24px 64px rgba(0,0,0,0.6)',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 8,
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.5,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: 'rgba(190,254,0,0.05)',
    border: '1.5px solid rgba(190,254,0,0.25)',
    borderRadius: 12,
    padding: '14px 16px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s, background 0.15s',
    width: '100%',
  },
  optionIcon: {
    fontSize: 26,
    flexShrink: 0,
    width: 36,
    textAlign: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.4,
  },
  optionArrow: {
    color: 'rgba(190,254,0,0.6)',
    fontSize: 18,
    flexShrink: 0,
  },
  skipBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.28)',
    fontSize: 13,
    cursor: 'pointer',
    padding: '6px 0',
  },
};
