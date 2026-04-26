import { useState, useEffect } from 'react';
import { getGyms, createGym, toggleGym, resetAdminPassword } from '../api/superadmin.js';
import { useTranslation, LanguageSwitcher } from '../i18n/LanguageContext.jsx';

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', paddingBottom: 40 },
  header: {
    background: '#0f172a',
    color: '#fff',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: 700, letterSpacing: 0.3, fontFamily: 'Impact, Arial Black, sans-serif' },
  headerRight: { display: 'flex', gap: 10, alignItems: 'center' },
  logoutBtn: {
    padding: '7px 16px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
  },
  body: { maxWidth: 960, margin: '0 auto', padding: '28px 16px' },
  toolbar: { display: 'flex', justifyContent: 'flex-end', marginBottom: 16 },
  createBtn: {
    padding: '10px 20px',
    background: '#BEFE00',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
    background: '#fff', borderRadius: 12,
    overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
  },
  th: {
    padding: '12px 16px', background: '#f8fafc',
    textAlign: 'left', fontSize: 12, fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase',
    letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0',
  },
  td: { padding: '13px 16px', fontSize: 14, color: '#1e293b', borderBottom: '1px solid #f1f5f9' },
  tdMono: { padding: '13px 16px', fontSize: 13, color: '#475569', fontFamily: 'monospace', borderBottom: '1px solid #f1f5f9' },
  empty: { textAlign: 'center', color: '#94a3b8', padding: '48px 16px', fontSize: 14 },
  badgeActive: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 99,
    fontSize: 12, fontWeight: 600,
    background: '#dcfce7', color: '#166534',
  },
  badgeDisabled: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 99,
    fontSize: 12, fontWeight: 600,
    background: '#fee2e2', color: '#991b1b',
  },
  dot: { width: 6, height: 6, borderRadius: '50%' },
  actionBtn: {
    padding: '5px 12px', border: 'none', borderRadius: 6,
    cursor: 'pointer', fontSize: 13, fontWeight: 500, marginRight: 6,
  },
  disableBtn: { background: '#fef2f2', color: '#dc2626' },
  enableBtn: { background: '#f0fdf4', color: '#16a34a' },
  resetBtn: { background: '#eff6ff', color: '#2563eb' },
  // Modal
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    background: '#fff', borderRadius: 16, padding: '32px 28px',
    width: '100%', maxWidth: 400,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 20 },
  modalLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  modalInput: {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #e2e8f0', borderRadius: 8,
    fontSize: 15, marginBottom: 14, outline: 'none',
    boxSizing: 'border-box',
  },
  modalBtn: {
    width: '100%', padding: '11px', borderRadius: 8,
    border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  hint: {
    background: '#f0f9ff', border: '1px solid #bae6fd',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 13, color: '#0369a1', marginBottom: 18,
    lineHeight: 1.5,
  },
  error: {
    background: '#fee2e2', color: '#991b1b',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 13, marginBottom: 14, textAlign: 'center',
  },
  gymMeta: {
    background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
    fontSize: 13, color: '#475569', marginBottom: 18, lineHeight: 1.8,
  },
};

// ─── Create Kiosk Modal ───────────────────────────────────────────────────────

function CreateKioskModal({ token, onCreated, onClose }) {
  const [gymName, setGymName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const gym = await createGym(token, { gymName, adminEmail, adminPassword });
      onCreated(gym);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('superadmin.create.title')}</div>
        {error && <div style={s.error}>{error}</div>}
        <div style={s.hint}>{t('superadmin.create.hint')}</div>
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('superadmin.create.gymNameLabel')}</label>
          <input
            style={s.modalInput}
            type="text"
            value={gymName}
            onChange={(e) => setGymName(e.target.value)}
            placeholder={t('superadmin.create.gymNamePlaceholder')}
            required
            autoFocus
          />
          <label style={s.modalLabel}>{t('superadmin.create.adminEmailLabel')}</label>
          <input
            style={s.modalInput}
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder={t('superadmin.create.adminEmailPlaceholder')}
            required
          />
          <label style={s.modalLabel}>{t('superadmin.create.passwordLabel')}</label>
          <input
            style={s.modalInput}
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder={t('superadmin.create.passwordPlaceholder')}
            required
          />
          <button
            style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
            type="submit"
            disabled={loading}
          >
            {loading ? t('superadmin.create.creating') : t('superadmin.create.submit')}
          </button>
          <button
            type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

function ResetPasswordModal({ token, gym, onClose }) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetAdminPassword(token, gym.id, newPassword);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('superadmin.reset.title')}</div>
        {error && <div style={s.error}>{error}</div>}
        {success && (
          <div style={{ ...s.error, background: '#dcfce7', color: '#166534' }}>
            Password reset successfully!
          </div>
        )}
        <div style={s.gymMeta}>
          <div><strong>{t('superadmin.reset.forGym')}:</strong> {gym.name}</div>
          <div><strong>{t('superadmin.reset.adminEmail')}:</strong> {gym.admin_email}</div>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('superadmin.reset.newPasswordLabel')}</label>
          <input
            style={s.modalInput}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('superadmin.reset.newPasswordPlaceholder')}
            required
            autoFocus
          />
          <button
            style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading || success ? 0.6 : 1 }}
            type="submit"
            disabled={loading || success}
          >
            {loading ? t('superadmin.reset.saving') : t('superadmin.reset.submit')}
          </button>
          <button
            type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Superadmin Page ──────────────────────────────────────────────────────────

export default function SuperadminPage({ token, onLogout }) {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [resetGym, setResetGym] = useState(null);
  const { lang, t } = useTranslation();

  useEffect(() => {
    getGyms(token)
      .then(setGyms)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCreated = (gym) => {
    setGyms((prev) => [...prev, gym]);
    setShowCreate(false);
  };

  const handleToggle = async (gymId) => {
    try {
      const updated = await toggleGym(token, gymId);
      setGyms((prev) => prev.map((g) => g.id === gymId ? { ...g, is_active: updated.is_active } : g));
    } catch (err) {
      setError(err.message);
    }
  };

  const locale = lang === 'id' ? 'id-ID' : 'en-US';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/kiosgym-icon.svg" alt="KIOS GYM" style={{ height: 32, width: 'auto', display: 'block' }} />
          <div style={s.headerTitle}>{t('superadmin.title')}</div>
        </div>
        <div style={s.headerRight}>
          <LanguageSwitcher variant="light" />
          <button style={s.logoutBtn} onClick={onLogout}>{t('superadmin.logout')}</button>
        </div>
      </div>

      <div style={s.body}>
        {error && <div style={s.error}>{error}</div>}

        <div style={s.toolbar}>
          <button style={s.createBtn} onClick={() => setShowCreate(true)}>
            {t('superadmin.createKiosk')}
          </button>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>{t('superadmin.colGym')}</th>
              <th style={s.th}>{t('superadmin.colAdmin')}</th>
              <th style={s.th}>{t('superadmin.colStatus')}</th>
              <th style={s.th}>{t('superadmin.colCreated')}</th>
              <th style={s.th}>{t('superadmin.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={s.empty}>{t('common.loading')}</td></tr>
            ) : gyms.length === 0 ? (
              <tr><td colSpan={5} style={s.empty}>{t('superadmin.noGyms')}</td></tr>
            ) : gyms.map((gym) => (
              <tr key={gym.id}>
                <td style={{ ...s.td, fontWeight: 600 }}>{gym.name}</td>
                <td style={s.tdMono}>{gym.admin_email || '—'}</td>
                <td style={s.td}>
                  {gym.is_active ? (
                    <span style={s.badgeActive}>
                      <span style={{ ...s.dot, background: '#16a34a' }} />
                      {t('superadmin.statusActive')}
                    </span>
                  ) : (
                    <span style={s.badgeDisabled}>
                      <span style={{ ...s.dot, background: '#dc2626' }} />
                      {t('superadmin.statusDisabled')}
                    </span>
                  )}
                </td>
                <td style={s.td}>
                  {new Date(gym.created_at).toLocaleDateString(locale)}
                </td>
                <td style={s.td}>
                  <button
                    style={{ ...s.actionBtn, ...(gym.is_active ? s.disableBtn : s.enableBtn) }}
                    onClick={() => handleToggle(gym.id)}
                  >
                    {gym.is_active ? t('superadmin.disable') : t('superadmin.enable')}
                  </button>
                  <button
                    style={{ ...s.actionBtn, ...s.resetBtn }}
                    onClick={() => setResetGym(gym)}
                  >
                    {t('superadmin.resetPassword')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateKioskModal token={token} onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      )}
      {resetGym && (
        <ResetPasswordModal token={token} gym={resetGym} onClose={() => setResetGym(null)} />
      )}
    </div>
  );
}
