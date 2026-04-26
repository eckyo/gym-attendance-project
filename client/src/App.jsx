import { useState, useEffect } from 'react';
import { login } from './api/scan.js';
import { memberLogin } from './api/member.js';
import { verifyPin } from './api/admin.js';
import ScanPage from './pages/ScanPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import SuperadminPage from './pages/SuperadminPage.jsx';
import MemberPage from './pages/MemberPage.jsx';
import { useTranslation, LanguageSwitcher } from './i18n/LanguageContext.jsx';

const s = {
  // ── Login page ──────────────────────────────────────────────────────────────
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(160deg, #0d1117 0%, #0f2027 50%, #111827 100%)',
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
  },
  // Decorative accent blob behind the card
  blob: {
    position: 'absolute',
    width: 480,
    height: 480,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(190,254,0,0.12) 0%, transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -60%)',
    pointerEvents: 'none',
  },
  hero: {
    textAlign: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  heroHeading: {
    fontSize: 32,
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    marginBottom: 8,
    fontFamily: 'Impact, Arial Black, sans-serif',
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: 400,
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(16px)',
    borderRadius: 20,
    padding: '32px 28px',
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  title: { fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4, textAlign: 'center', fontFamily: 'Impact, Arial Black, sans-serif' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 24 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.07)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 14,
    outline: 'none',
    color: '#fff',
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: '#BEFE00',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: 6,
    letterSpacing: '0.02em',
    boxShadow: '0 4px 24px rgba(190,254,0,0.30)',
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  btnStaff: {
    width: '100%',
    padding: '13px',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 6,
  },
  error: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.35)',
    color: '#fca5a5',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
  },
  staffLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    textDecoration: 'none',
  },
  langRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.10)',
  },
  dividerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    whiteSpace: 'nowrap',
  },
  // ── PIN modal ───────────────────────────────────────────────────────────────
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '36px 32px',
    width: '100%',
    maxWidth: 340,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  // reused in PinModal with white background overrides
  pinTitle: { fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 6, textAlign: 'center', fontFamily: 'Impact, Arial Black, sans-serif' },
  pinSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  pinLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  pinInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 22,
    marginBottom: 16,
    outline: 'none',
    boxSizing: 'border-box',
  },
  pinBtn: {
    width: '100%',
    padding: '12px',
    background: '#BEFE00',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
  pinError: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
};

function LoginForm({ onLogin, onMemberLogin }) {
  const [mode, setMode] = useState('member'); // member is primary

  // Inject placeholder colour for dark inputs — runs once
  useEffect(() => {
    const id = 'login-dark-placeholder';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = '.login-dark-input::placeholder { color: rgba(255,255,255,0.30); }';
      document.head.appendChild(style);
    }
  }, []);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      onLogin(data.token, data.role, data.gymName, data.gymId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await memberLogin(phone, password);
      if (data.error) throw new Error(data.error);
      onMemberLogin(data.token, data.member);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
  };

  return (
    <div style={s.container}>
      {/* Ambient glow blob */}
      <div style={s.blob} />

      {/* Language switcher — top right */}
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <LanguageSwitcher variant="light" />
      </div>

      {mode === 'member' && (
        <div style={s.hero}>
          <img src="/kiosgym-icon.svg" alt="KIOS GYM" style={{ height: 56, display: 'block', margin: '0 auto' }} />
        </div>
      )}

      <div style={s.card}>
        <div style={s.title}>
          {mode === 'member' ? t('login.heroHeading') : t('login.title')}
        </div>
        <div style={s.subtitle}>
          {mode === 'member' ? t('login.heroSub') : t('login.subtitle')}
        </div>

        {error && <div style={s.error}>{error}</div>}

        {mode === 'member' ? (
          <form onSubmit={handleMemberSubmit}>
            <label style={s.label}>{t('member.phoneLabel')}</label>
            <input
              className="login-dark-input"
              style={s.input}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('member.phonePlaceholder')}
              required
              autoComplete="tel"
            />
            <label style={s.label}>{t('login.passwordLabel')}</label>
            <input
              className="login-dark-input"
              style={s.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <button
              style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
              type="submit"
              disabled={loading}
            >
              {loading ? t('member.loggingIn') : t('member.loginButton')}
            </button>

            <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.dividerText}>or</span>
              <div style={s.dividerLine} />
            </div>

            <button
              type="button"
              style={s.btnStaff}
              onClick={() => switchMode('staff')}
            >
              {t('login.staffAccessLink')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStaffSubmit}>
            <label style={s.label}>{t('login.emailLabel')}</label>
            <input
              className="login-dark-input"
              style={s.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              required
              autoComplete="username"
            />
            <label style={s.label}>{t('login.passwordLabel')}</label>
            <input
              className="login-dark-input"
              style={s.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <button
              style={{ ...s.btnStaff, ...(loading ? s.btnDisabled : {}) }}
              type="submit"
              disabled={loading}
            >
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
            <button
              type="button"
              style={s.staffLink}
              onClick={() => switchMode('member')}
            >
              {t('member.switchToStaff')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PinModal({ token, onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyPin(token, pin);
      onSuccess();
    } catch (err) {
      setError(err.message);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={s.modalCard}>
        <div style={s.pinTitle}>{t('pin.title')}</div>
        <div style={s.pinSubtitle}>{t('pin.subtitle')}</div>
        {error && <div style={s.pinError}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.pinLabel}>{t('pin.label')}</label>
          <input
            style={{ ...s.pinInput, letterSpacing: 8, textAlign: 'center' }}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••"
            required
            autoFocus
          />
          <button
            style={{ ...s.pinBtn, ...(loading ? s.btnDisabled : {}) }}
            type="submit"
            disabled={loading || pin.length < 4}
          >
            {loading ? t('pin.verifying') : t('pin.unlock')}
          </button>
          <button
            type="button"
            style={{ ...s.pinBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onCancel}
          >
            {t('common.cancel')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null); // { token, role, gymName }
  const [page, setPage] = useState('scan');
  const [showPinModal, setShowPinModal] = useState(false);

  const handleLogin = (token, role, gymName, gymId) => {
    if (gymId) localStorage.setItem('gymId', gymId);
    setAuth({ token, role, gymName });
  };

  const handleMemberLogin = (token, member) => {
    setAuth({ token, role: 'member', gymName: '', memberName: member.name });
  };

  const handleLogout = () => { setAuth(null); setPage('scan'); };

  if (!auth) {
    return <LoginForm onLogin={handleLogin} onMemberLogin={handleMemberLogin} />;
  }

  if (auth.role === 'superadmin') {
    return <SuperadminPage token={auth.token} onLogout={handleLogout} />;
  }

  if (auth.role === 'member') {
    return <MemberPage token={auth.token} onLogout={handleLogout} />;
  }

  return (
    <>
      {page === 'scan' && (
        <ScanPage
          token={auth.token}
          role={auth.role}
          gymName={auth.gymName}
          onLogout={handleLogout}
          onAdminAccess={() => setShowPinModal(true)}
        />
      )}
      {page === 'admin' && (
        <AdminPage
          token={auth.token}
          role={auth.role}
          gymName={auth.gymName}
          onBack={() => setPage('scan')}
        />
      )}
      {showPinModal && (
        <PinModal
          token={auth.token}
          onSuccess={() => { setShowPinModal(false); setPage('admin'); }}
          onCancel={() => setShowPinModal(false)}
        />
      )}
    </>
  );
}
