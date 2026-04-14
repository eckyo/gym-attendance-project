import { useState } from 'react';
import { login } from './api/scan.js';
import { verifyPin } from './api/admin.js';
import ScanPage from './pages/ScanPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import SuperadminPage from './pages/SuperadminPage.jsx';
import { useTranslation, LanguageSwitcher } from './i18n/LanguageContext.jsx';

const s = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
  },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a2e', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 28 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 16,
    outline: 'none',
  },
  btn: {
    width: '100%',
    padding: '12px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  // PIN modal overlay
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
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
  langRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
};

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      onLogin(data.token, data.role, data.gymName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.langRow}>
          <LanguageSwitcher />
        </div>
        <div style={s.title}>{t('login.title')}</div>
        <div style={s.subtitle}>{t('login.subtitle')}</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.label}>{t('login.emailLabel')}</label>
          <input
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
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>
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
        <div style={{ ...s.title, fontSize: 20, marginBottom: 6 }}>{t('pin.title')}</div>
        <div style={{ ...s.subtitle, marginBottom: 24 }}>{t('pin.subtitle')}</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.label}>{t('pin.label')}</label>
          <input
            style={{ ...s.input, letterSpacing: 8, textAlign: 'center', fontSize: 22 }}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••"
            required
            autoFocus
          />
          <button
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
            type="submit"
            disabled={loading || pin.length < 4}
          >
            {loading ? t('pin.verifying') : t('pin.unlock')}
          </button>
          <button
            type="button"
            style={{ ...s.btn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
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
  const [auth, setAuth] = useState(null); // { token, role }
  const [page, setPage] = useState('scan');
  const [showPinModal, setShowPinModal] = useState(false);

  const handleLogin = (token, role, gymName) => setAuth({ token, role, gymName });
  const handleLogout = () => { setAuth(null); setPage('scan'); };

  if (!auth) return <LoginForm onLogin={handleLogin} />;

  if (auth.role === 'superadmin') {
    return <SuperadminPage token={auth.token} onLogout={handleLogout} />;
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
