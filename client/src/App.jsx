import { useState, useEffect } from 'react';
import { login } from './api/scan.js';
import { memberLogin, gymCodeLogin, lookupGym } from './api/member.js';
import { verifyPin } from './api/admin.js';

const gymSlugFromUrl = (() => {
  const m = window.location.pathname.match(/^\/g\/([a-z0-9-]+)$/i);
  return m ? m[1].toLowerCase() : null;
})();
import ScanPage from './pages/ScanPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import SuperadminPage from './pages/SuperadminPage.jsx';
import MemberPage from './pages/MemberPage.jsx';
import { useTranslation, LanguageSwitcher } from './i18n/LanguageContext.jsx';

const SESSION_KEY = 'memberSession';
const STAFF_SESSION_KEY = 'staffSession';
const PIN_UNLOCK_KEY = 'adminPinUnlocked';

function saveSession(token, member) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, member }));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { token, member } = JSON.parse(raw);
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { token, member };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function saveStaffSession(token, role, gymName) {
  localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify({ token, role, gymName }));
}

function loadStaffSession() {
  try {
    const raw = localStorage.getItem(STAFF_SESSION_KEY);
    if (!raw) return null;
    const { token, role, gymName } = JSON.parse(raw);
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(STAFF_SESSION_KEY);
      return null;
    }
    return { token, role, gymName };
  } catch {
    localStorage.removeItem(STAFF_SESSION_KEY);
    return null;
  }
}

function normalizePhone(digits) {
  const d = digits.trim().replace(/\D/g, '');
  if (!d) return '';
  return '+62' + (d.startsWith('0') ? d.slice(1) : d);
}

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
  contactLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textDecoration: 'none',
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
  phonePrefix: {
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.12)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRight: 'none',
    borderRadius: '10px 0 0 10px',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
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

function LoginForm({ onLogin, onMemberLogin, gymSlug }) {
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
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState('credentials'); // 'credentials' | 'select'
  const [accounts, setAccounts] = useState([]);
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' | 'gymCode'
  const [scanToken, setScanToken] = useState('');
  const [gymCodeInput, setGymCodeInput] = useState('');
  const [gymNameFromSlug, setGymNameFromSlug] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!gymSlug) return;
    lookupGym(gymSlug).then((data) => {
      if (data.gymName) setGymNameFromSlug(data.gymName);
      else setError(t('member.gymCodeNotFound'));
    });
  }, [gymSlug]);

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
      const data = await memberLogin(normalizePhone(phone), password, remember);
      if (data.requiresSelection) {
        setAccounts(data.accounts);
        setLoginStep('select');
        return;
      }
      if (data.error) throw new Error(data.error);
      onMemberLogin(data.token, data.member, remember);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = async (memberId) => {
    setError('');
    setLoading(true);
    try {
      const data = await memberLogin(normalizePhone(phone), password, remember, memberId);
      if (data.error) throw new Error(data.error);
      onMemberLogin(data.token, data.member, remember);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGymCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const code = gymSlug || gymCodeInput;
      const data = await gymCodeLogin(code, scanToken, password, remember);
      if (data.error) throw new Error(data.error);
      onMemberLogin(data.token, data.member, remember);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchLoginMethod = (method) => {
    setLoginMethod(method);
    setError('');
    setScanToken('');
    setGymCodeInput('');
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setLoginStep('credentials');
    setAccounts([]);
    setLoginMethod('phone');
    setScanToken('');
    setGymCodeInput('');
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
          {mode === 'member'
            ? (loginStep === 'select'
                ? t('member.selectAccountTitle')
                : gymSlug && gymNameFromSlug
                  ? t('member.gymCodeLoginFor', { gymName: gymNameFromSlug })
                  : t('login.heroHeading'))
            : t('login.title')}
        </div>
        <div style={s.subtitle}>
          {mode === 'member'
            ? (loginStep === 'select' ? t('member.selectAccountSubtitle') : t('login.heroSub'))
            : t('login.subtitle')}
        </div>

        {error && <div style={s.error}>{error}</div>}

        {mode === 'member' && loginStep === 'select' ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {accounts.map((account) => {
                const today = new Date().toISOString().slice(0, 10);
                const isExpired = account.expiryDate && account.expiryDate < today;
                const statusColor = isExpired ? '#f87171' : '#4ade80';
                const statusLabel = isExpired ? t('member.selectStatusExpired') : t('member.selectStatusActive');
                return (
                  <button
                    key={account.gymId}
                    type="button"
                    disabled={loading}
                    onClick={() => handleAccountSelect(account.memberId)}
                    style={{
                      ...s.btnStaff,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '14px 16px',
                      gap: 4,
                      textAlign: 'left',
                      marginTop: 0,
                      ...(loading ? s.btnDisabled : {}),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{account.memberName}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: `${statusColor}22`, borderRadius: 6, padding: '2px 8px' }}>{statusLabel}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', fontWeight: 400 }}>
                      {account.gymName}{account.scanToken ? ` · ${account.scanToken}` : ''}
                    </span>
                    {account.packageName && (
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{account.packageName}</span>
                    )}
                    {account.expiryDate && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                        {t('member.selectExpiry', { date: account.expiryDate })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              style={s.staffLink}
              onClick={() => { setLoginStep('credentials'); setAccounts([]); setError(''); }}
            >
              {t('member.backToLogin')}
            </button>
          </div>
        ) : mode === 'member' ? (
          <form onSubmit={gymSlug || loginMethod === 'gymCode' ? handleGymCodeSubmit : handleMemberSubmit}>
            {/* Login method toggle — only on universal URL */}
            {!gymSlug && (
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.15)', marginBottom: 20 }}>
                <button type="button"
                  style={{ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: loginMethod === 'phone' ? '#fff' : 'transparent', color: loginMethod === 'phone' ? '#1a1a2e' : 'rgba(255,255,255,0.55)', transition: 'all 0.15s' }}
                  onClick={() => switchLoginMethod('phone')}
                >{t('member.loginMethodPhone')}</button>
                <button type="button"
                  style={{ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, border: 'none', borderLeft: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: loginMethod === 'gymCode' ? '#fff' : 'transparent', color: loginMethod === 'gymCode' ? '#1a1a2e' : 'rgba(255,255,255,0.55)', transition: 'all 0.15s' }}
                  onClick={() => switchLoginMethod('gymCode')}
                >{t('member.loginMethodGymCode')}</button>
              </div>
            )}

            {gymSlug || loginMethod === 'gymCode' ? (
              <>
                {!gymSlug && (
                  <>
                    <label style={s.label}>{t('member.gymCodeLabel')}</label>
                    <input
                      className="login-dark-input"
                      style={s.input}
                      type="text"
                      value={gymCodeInput}
                      onChange={(e) => setGymCodeInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder={t('member.gymCodePlaceholder')}
                      required
                      autoComplete="off"
                    />
                  </>
                )}
                <label style={s.label}>{t('member.memberIdLabel')}</label>
                <input
                  className="login-dark-input"
                  style={s.input}
                  type="text"
                  value={scanToken}
                  onChange={(e) => setScanToken(e.target.value.toUpperCase())}
                  placeholder={t('member.memberIdPlaceholder')}
                  required
                  autoComplete="off"
                  autoFocus={!!gymSlug}
                />
              </>
            ) : (
              <>
                <label style={s.label}>{t('member.phoneLabel')}</label>
                <div style={{ display: 'flex', marginBottom: 14 }}>
                  <div style={s.phonePrefix}>+62</div>
                  <input
                    className="login-dark-input"
                    style={{ ...s.input, marginBottom: 0, borderLeft: 'none', borderRadius: '0 10px 10px 0' }}
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="81234567890"
                    required
                    autoComplete="tel"
                  />
                </div>
              </>
            )}

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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ accentColor: '#BEFE00', width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                {t('member.keepSignedIn')}
              </span>
            </label>
            <button
              style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
              type="submit"
              disabled={loading}
            >
              {loading ? t('member.loggingIn') : t('member.loginButton')}
            </button>

            {!gymSlug && (
              <>
                <div style={s.divider}>
                  <div style={s.dividerLine} />
                  <span style={s.dividerText}>or</span>
                  <div style={s.dividerLine} />
                </div>
                <button type="button" style={s.btnStaff} onClick={() => switchMode('staff')}>
                  {t('login.staffAccessLink')}
                </button>
              </>
            )}
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
        <a
          href="https://wa.me/628131465088"
          target="_blank"
          rel="noopener noreferrer"
          style={s.contactLink}
        >
          💬 <strong style={{ color: '#BEFE00', fontWeight: 700 }}>{t('login.contactUsLabel')}</strong> {t('login.contactUsVia')}
        </a>
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
  const [auth, setAuth] = useState(() => {
    const staff = loadStaffSession();
    if (staff) return { token: staff.token, role: staff.role, gymName: staff.gymName };
    const session = loadSession();
    if (!session) return null;
    return { token: session.token, role: 'member', gymName: '', memberName: session.member.name };
  });
  const [page, setPage] = useState('scan');
  const [showPinModal, setShowPinModal] = useState(false);

  const handleLogin = (token, role, gymName, gymId) => {
    if (gymId) localStorage.setItem('gymId', gymId);
    saveStaffSession(token, role, gymName);
    setAuth({ token, role, gymName });
  };

  const handleMemberLogin = (token, member, remember) => {
    if (remember) saveSession(token, member);
    setAuth({ token, role: 'member', gymName: '', memberName: member.name });
  };

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem(STAFF_SESSION_KEY);
    localStorage.removeItem(PIN_UNLOCK_KEY);
    setAuth(null);
    setPage('scan');
  };

  if (!auth) {
    return <LoginForm onLogin={handleLogin} onMemberLogin={handleMemberLogin} gymSlug={gymSlugFromUrl} />;
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
          onAdminAccess={() => {
            if (localStorage.getItem(PIN_UNLOCK_KEY) === auth.token) {
              setPage('admin');
            } else {
              setShowPinModal(true);
            }
          }}
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
          onSuccess={() => {
            localStorage.setItem(PIN_UNLOCK_KEY, auth.token);
            setShowPinModal(false);
            setPage('admin');
          }}
          onCancel={() => setShowPinModal(false)}
        />
      )}
    </>
  );
}
