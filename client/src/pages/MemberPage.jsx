import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import { getMemberProfile, getMemberHistory, memberCheckin, changePassword } from '../api/member.js';
import { useTranslation, LanguageSwitcher } from '../i18n/LanguageContext.jsx';

const s = {
  // ── Page shell ──────────────────────────────────────────────────────────────
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0d1117 0%, #0f2027 50%, #111827 100%)',
    display: 'flex',
    flexDirection: 'column',
  },
  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    background: 'rgba(0,0,0,0.25)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 40,
  },
  headerGymName: {
    fontSize: 17,
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1.2,
    fontFamily: 'Impact, Arial Black, sans-serif',
  },
  headerPortalLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginTop: 2,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  gearBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '7px 10px',
    cursor: 'pointer',
    fontSize: 16,
    color: '#fff',
    lineHeight: 1,
  },
  // ── Body ────────────────────────────────────────────────────────────────────
  body: {
    maxWidth: 520,
    width: '100%',
    margin: '0 auto',
    padding: '20px 16px 90px',
    flex: 1,
  },
  // ── Cards (glassmorphism) ───────────────────────────────────────────────────
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(16px)',
    borderRadius: 20,
    padding: '24px 20px',
    marginBottom: 14,
  },
  // ── Greeting ────────────────────────────────────────────────────────────────
  greetingName: {
    fontSize: 26,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    marginBottom: 6,
    fontFamily: 'Impact, Arial Black, sans-serif',
  },
  greetingSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 20,
  },
  // ── Status + gym tag row ────────────────────────────────────────────────────
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  statusBadge: (status) => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    background: status === 'active' ? 'rgba(16,185,129,0.2)' : status === 'expiring_soon' ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)',
    color: status === 'active' ? '#34d399' : status === 'expiring_soon' ? '#fbbf24' : '#f87171',
    border: `1px solid ${status === 'active' ? 'rgba(52,211,153,0.35)' : status === 'expiring_soon' ? 'rgba(251,191,36,0.35)' : 'rgba(248,113,113,0.35)'}`,
  }),
  gymTag: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  // ── Member details ──────────────────────────────────────────────────────────
  memberDetail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  // ── Check-in CTA ────────────────────────────────────────────────────────────
  checkinBtn: {
    width: '100%',
    padding: '16px',
    marginTop: 20,
    background: '#BEFE00',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: 12,
    fontSize: 17,
    fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    boxShadow: '0 4px 24px rgba(190,254,0,0.25)',
  },
  checkinBtnDisabled: {
    background: 'rgba(255,255,255,0.12)',
    boxShadow: 'none',
    cursor: 'not-allowed',
  },
  // ── Bottom sticky nav ───────────────────────────────────────────────────────
  navTabs: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    background: 'rgba(13,17,23,0.96)',
    backdropFilter: 'blur(16px)',
    borderTop: '1px solid rgba(255,255,255,0.10)',
    zIndex: 50,
  },
  tab: (active) => ({
    flex: 1,
    padding: '12px 0 14px',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? '#BEFE00' : 'rgba(255,255,255,0.45)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderTop: active ? '2px solid #BEFE00' : '2px solid transparent',
  }),
  // ── Section title ───────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 14,
    fontFamily: 'Impact, Arial Black, sans-serif',
  },
  // ── History rows ────────────────────────────────────────────────────────────
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    fontSize: 14,
  },
  historyDate: { color: '#fff', fontWeight: 600 },
  historyTime: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  pageNav: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  pageBtn: {
    padding: '7px 16px',
    background: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
  },
  // ── Settings overlay + panel ────────────────────────────────────────────────
  settingsOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 200,
  },
  settingsPanel: {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100%',
    width: 320,
    background: '#111827',
    borderLeft: '1px solid rgba(255,255,255,0.10)',
    padding: '28px 24px',
    overflowY: 'auto',
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column',
  },
  settingsPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  settingsPanelTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: '#fff',
    fontFamily: 'Impact, Arial Black, sans-serif',
  },
  closePanelBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  settingsDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    margin: '20px 0',
  },
  settingsSectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 14,
  },
  // ── Form inputs (dark glass) ────────────────────────────────────────────────
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.07)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 12,
    outline: 'none',
    color: '#fff',
    boxSizing: 'border-box',
  },
  saveBtn: {
    width: '100%',
    padding: '13px',
    background: '#BEFE00',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
    boxShadow: '0 4px 16px rgba(190,254,0,0.20)',
  },
  logoutBtn: {
    width: '100%',
    padding: '13px',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 10,
    color: '#f87171',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // ── Status/feedback messages ────────────────────────────────────────────────
  msgSuccess: {
    background: 'rgba(16,185,129,0.15)',
    border: '1px solid rgba(16,185,129,0.3)',
    color: '#34d399',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
  },
  msgError: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
  },
  // ── Check-in modal ──────────────────────────────────────────────────────────
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflowY: 'auto',
    padding: '20px 16px',
  },
  overlayCard: {
    background: '#1a2332',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    padding: '20px',
    marginTop: 20,
  },
  modeTabs: {
    display: 'flex',
    marginBottom: 18,
    borderRadius: 10,
    overflow: 'hidden',
    border: '1.5px solid rgba(255,255,255,0.12)',
  },
  modeTab: (active) => ({
    flex: 1,
    padding: '10px',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    border: 'none',
    background: active ? '#10b981' : 'rgba(255,255,255,0.05)',
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
  }),
  checkinResultSuccess: {
    background: 'rgba(16,185,129,0.15)',
    border: '1px solid rgba(16,185,129,0.3)',
    color: '#34d399',
    borderRadius: 10,
    padding: '16px',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 14,
  },
  checkinResultError: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
    borderRadius: 10,
    padding: '14px',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 14,
  },
  closeBtn: {
    width: '100%',
    padding: '12px',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  memberQrWrap: { textAlign: 'center', padding: '10px 0 16px' },
  memberQrId: {
    fontSize: 18,
    fontWeight: 800,
    color: '#fff',
    marginTop: 12,
    letterSpacing: '0.1em',
  },
  memberQrHint: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
};

function getGreeting(name, t) {
  const hour = new Date().getHours();
  let key, subKey;
  if (hour >= 5 && hour < 12) { key = 'greetingMorning'; subKey = 'greetingSubMorning'; }
  else if (hour >= 12 && hour < 17) { key = 'greetingAfternoon'; subKey = 'greetingSubAfternoon'; }
  else if (hour >= 17 && hour < 21) { key = 'greetingEvening'; subKey = 'greetingSubEvening'; }
  else { key = 'greetingNight'; subKey = 'greetingSubNight'; }
  const firstName = name.split(' ')[0];
  return {
    heading: t(`member.${key}`, { name: firstName }),
    sub: t(`member.${subKey}`),
  };
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ── Check-in Modal ────────────────────────────────────────────────────────────

function CheckinModal({ token, profile, onClose }) {
  const [mode, setMode] = useState('scan');
  const [scanResult, setScanResult] = useState(null);
  const [myQrUrl, setMyQrUrl] = useState(null);
  const { t } = useTranslation();
  const scannerRef = useRef(null);

  useEffect(() => {
    if (mode !== 'show' || !profile?.scanToken) return;
    QRCode.toDataURL(profile.scanToken, { width: 280, margin: 2 })
      .then(setMyQrUrl)
      .catch(() => {});
  }, [mode, profile?.scanToken]);

  useEffect(() => {
    if (mode !== 'scan' || scanResult) return;
    const scanner = new Html5Qrcode('member-checkin-qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        try { await scanner.stop(); } catch { /* ignore */ }
        scannerRef.current = null;
        const result = await memberCheckin(token, decodedText);
        setScanResult(result.success
          ? { success: true, message: `${t('member.checkinSuccess')} — ${profile?.name ?? ''}` }
          : { success: false, message: result.error || t('member.checkinError') }
        );
      },
      () => {}
    ).catch(() => {
      setScanResult({ success: false, message: t('scan.cameraError') });
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [mode, scanResult]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    onClose(scanResult?.success ?? false);
  };

  const switchMode = (newMode) => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanResult(null);
    setMode(newMode);
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={s.overlayCard}>
        <div style={s.modeTabs}>
          <button style={s.modeTab(mode === 'scan')} onClick={() => switchMode('scan')}>
            📷 {t('member.scanQrTab')}
          </button>
          <button style={s.modeTab(mode === 'show')} onClick={() => switchMode('show')}>
            🪪 {t('member.showQrTab')}
          </button>
        </div>

        {scanResult ? (
          <>
            <div style={scanResult.success ? s.checkinResultSuccess : s.checkinResultError}>
              {scanResult.success ? '✓ ' : '✕ '}{scanResult.message}
            </div>
            <button style={s.closeBtn} onClick={handleClose}>
              {t('standbyQr.close')}
            </button>
          </>
        ) : mode === 'scan' ? (
          <>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 12 }}>
              {t('member.checkinInstruction')}
            </p>
            <div id="member-checkin-qr-reader" style={{ width: '100%', borderRadius: 10, overflow: 'hidden' }} />
            <button style={{ ...s.closeBtn, marginTop: 14 }} onClick={handleClose}>
              {t('common.cancel')}
            </button>
          </>
        ) : (
          <>
            <div style={s.memberQrWrap}>
              {myQrUrl ? (
                <img src={myQrUrl} alt="Member QR" style={{ width: 260, height: 260, display: 'block', margin: '0 auto' }} />
              ) : (
                <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  {t('common.loading')}
                </div>
              )}
              <div style={s.memberQrId}>{profile?.scanToken}</div>
              <div style={s.memberQrHint}>{t('member.showQrInstruction')}</div>
            </div>
            <button style={s.closeBtn} onClick={handleClose}>
              {t('standbyQr.close')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Member Page ───────────────────────────────────────────────────────────────

export default function MemberPage({ token, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeSection, setActiveSection] = useState('home');
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const { t } = useTranslation();

  // Inject placeholder colour for dark inputs
  useEffect(() => {
    const id = 'member-dark-placeholder';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = '.member-dark-input::placeholder { color: rgba(255,255,255,0.30); }';
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    getMemberProfile(token).then(setProfile).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (activeSection !== 'history') return;
    getMemberHistory(token, historyPage).then((data) => {
      setHistory(data.logs || []);
      setTotalPages(data.totalPages || 1);
    }).catch(() => {});
  }, [token, activeSection, historyPage]);

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: t('member.passwordMismatch') });
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ type: 'error', text: t('member.passwordTooShort') });
      return;
    }
    setPwLoading(true);
    try {
      const res = await changePassword(token, pwForm.current, pwForm.next);
      if (res.success) {
        setPwMsg({ type: 'success', text: t('member.passwordSaved') });
        setPwForm({ current: '', next: '', confirm: '' });
      } else {
        setPwMsg({ type: 'error', text: res.error || t('member.wrongPassword') });
      }
    } catch {
      setPwMsg({ type: 'error', text: t('member.wrongPassword') });
    } finally {
      setPwLoading(false);
    }
  };

  const greeting = profile ? getGreeting(profile.name, t) : null;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/kiosgym-icon.svg" alt="KIOS GYM" style={{ height: 32, width: 'auto', display: 'block' }} />
          <div>
            <div style={s.headerGymName}>{profile?.gymName ?? '—'}</div>
            <div style={s.headerPortalLabel}>{t('member.memberPortal')}</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <LanguageSwitcher variant="light" />
          <button style={s.gearBtn} onClick={() => setShowSettings(true)} aria-label={t('member.settings')}>
            ⚙
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={s.body}>
        {/* Home section */}
        {activeSection === 'home' && profile && (
          <div style={s.card}>
            <div style={s.greetingName}>{greeting.heading}</div>
            <div style={s.greetingSub}>{greeting.sub}</div>

            <div style={s.badgeRow}>
              <span style={s.statusBadge(profile.status)}>
                {profile.status === 'active' ? t('member.statusActive')
                  : profile.status === 'expiring_soon' ? t('member.statusExpiringSoon')
                  : t('member.statusExpired')}
              </span>
              <span style={s.gymTag}>{profile.gymName}</span>
            </div>

            <div style={s.memberDetail}>
              📦 {t('member.package')}: {profile.packageName || '—'}
            </div>
            <div style={s.memberDetail}>
              📅 {t('member.expiry')}: {profile.expiryDate ? formatDate(profile.expiryDate) : t('member.noExpiry')}
            </div>

            {checkinMsg && (
              <div style={checkinMsg.success ? s.msgSuccess : s.msgError}>
                {checkinMsg.success ? '✓ ' : '✕ '}{checkinMsg.text}
              </div>
            )}

            <button
              style={{
                ...s.checkinBtn,
                ...(profile.status === 'expired' ? s.checkinBtnDisabled : {}),
              }}
              disabled={profile.status === 'expired'}
              onClick={() => { setCheckinMsg(null); setShowCheckinModal(true); }}
            >
              {t('member.checkInButton')}
            </button>
          </div>
        )}

        {/* History section */}
        {activeSection === 'history' && (
          <div style={s.card}>
            <div style={s.sectionTitle}>{t('member.history')}</div>
            {history.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '20px 0' }}>
                {t('member.noHistory')}
              </div>
            ) : (
              <>
                {history.map((log) => (
                  <div key={log.id} style={s.historyRow}>
                    <div>
                      <div style={s.historyDate}>{formatDate(log.checked_in_at)}</div>
                      <div style={s.historyTime}>
                        {t('member.checkedIn')}: {new Date(log.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                      {log.checked_out_at
                        ? `${t('member.checkedOut')}: ${new Date(log.checked_out_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                        : t('member.notCheckedOut')}
                    </div>
                  </div>
                ))}
                {totalPages > 1 && (
                  <div style={s.pageNav}>
                    <button
                      style={{ ...s.pageBtn, ...(historyPage <= 1 ? { opacity: 0.4, cursor: 'default' } : {}) }}
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => p - 1)}
                    >
                      {t('member.prevPage')}
                    </button>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                      {t('member.pageInfo', { page: historyPage, total: totalPages })}
                    </span>
                    <button
                      style={{ ...s.pageBtn, ...(historyPage >= totalPages ? { opacity: 0.4, cursor: 'default' } : {}) }}
                      disabled={historyPage >= totalPages}
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      {t('member.nextPage')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom nav */}
      <div style={s.navTabs}>
        <button style={s.tab(activeSection === 'home')} onClick={() => setActiveSection('home')}>
          🏠 {t('member.profile')}
        </button>
        <button style={s.tab(activeSection === 'history')} onClick={() => setActiveSection('history')}>
          📋 {t('member.history')}
        </button>
      </div>

      {/* Settings overlay + panel */}
      {showSettings && (
        <>
          <div style={s.settingsOverlay} onClick={() => setShowSettings(false)} />
          <div style={s.settingsPanel}>
            <div style={s.settingsPanelHeader}>
              <div style={s.settingsPanelTitle}>{t('member.settingsTitle')}</div>
              <button style={s.closePanelBtn} onClick={() => setShowSettings(false)}>✕</button>
            </div>

            <div style={s.settingsSectionTitle}>{t('member.changePassword')}</div>
            {pwMsg && (
              <div style={pwMsg.type === 'success' ? s.msgSuccess : s.msgError}>
                {pwMsg.text}
              </div>
            )}
            <form onSubmit={handlePasswordSave}>
              <label style={s.label}>{t('member.currentPassword')}</label>
              <input
                className="member-dark-input"
                style={s.input}
                type="password"
                value={pwForm.current}
                onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <label style={s.label}>{t('member.newPassword')}</label>
              <input
                className="member-dark-input"
                style={s.input}
                type="password"
                value={pwForm.next}
                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
              <label style={s.label}>{t('member.confirmPassword')}</label>
              <input
                className="member-dark-input"
                style={s.input}
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
              <button
                type="submit"
                style={{ ...s.saveBtn, ...(pwLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                disabled={pwLoading}
              >
                {pwLoading ? t('member.savingPassword') : t('member.savePassword')}
              </button>
            </form>

            <div style={s.settingsDivider} />

            <button style={s.logoutBtn} onClick={onLogout}>
              {t('member.logout')}
            </button>
          </div>
        </>
      )}

      {/* Check-in modal */}
      {showCheckinModal && (
        <CheckinModal
          token={token}
          profile={profile}
          onClose={(wasSuccess) => {
            setShowCheckinModal(false);
            if (wasSuccess) {
              setCheckinMsg({ success: true, text: t('member.checkinSuccess') });
            }
          }}
        />
      )}
    </div>
  );
}
