import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import Lottie from 'lottie-react';
import successAnimation from '../assets/success.json';
import errorAnimation from '../assets/error.json';
import { postScan, verifyScanPin, registerMember, checkInVisitor } from '../api/scan.js';
import { getPackages } from '../api/admin.js';
import { useTranslation, LanguageSwitcher } from '../i18n/LanguageContext.jsx';

const daysUntilExpiry = (dateStr) => Math.ceil((new Date(dateStr) - new Date()) / 86400000);

const calcExpiryFromDuration = (durationDays) => {
  const d = new Date();
  d.setDate(d.getDate() + durationDays);
  return d.toISOString().slice(0, 10);
};

const DEBOUNCE_MS = 5000;

const formatPhoneDigits = (digits) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');

const st = {
  page: {
    minHeight: '100vh',
    background: '#f0f2f5',
    display: 'flex',
    flexDirection: 'column',
  },
  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    background: '#1a1a2e',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerLeft: {},
  gymName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.2,
    fontFamily: 'Impact, Arial Black, sans-serif',
  },
  kioskLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  headerRight: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  adminBtn: {
    padding: '7px 14px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    color: '#fff',
    fontWeight: 600,
  },
  logoutBtn: {
    padding: '7px 14px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  // ── Body ─────────────────────────────────────────────────────────────────────
  body: {
    maxWidth: 560,
    width: '100%',
    margin: '0 auto',
    padding: '24px 16px',
    flex: 1,
  },
  scannerCard: {
    background: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    marginBottom: 12,
  },
  cameraError: {
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#9a3412',
    borderRadius: 10,
    padding: '14px 16px',
    fontSize: 14,
    textAlign: 'center',
    margin: 12,
  },
  processing: {
    textAlign: 'center',
    color: '#64748b',
    padding: '10px 0',
    fontSize: 14,
  },
  feedbackError: {
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: 10,
    padding: '14px 16px',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  // ── Image scan button (outline, matches AdminPage outlineBtn) ────────────────
  imageBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 16px',
    background: '#fff',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: '#475569',
  },
  // ── Overlays ─────────────────────────────────────────────────────────────────
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '32px 40px',
    textAlign: 'center',
    width: 360,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: 700,
    color: '#166534',
    marginBottom: 16,
    marginTop: 0,
  },
  cardName: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 6,
  },
  cardGymId: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 6,
    letterSpacing: '0.05em',
  },
  cardTime: {
    fontSize: 14,
    color: '#94a3b8',
  },
  cardPackage: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    fontWeight: 600,
  },
  cardExpiry: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  registerSelect: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 14,
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  },
  expiryPreview: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -10,
    marginBottom: 14,
  },
  errorHeading: {
    fontSize: 20,
    fontWeight: 700,
    color: '#991b1b',
    marginBottom: 8,
    marginTop: 0,
  },
  errorMessage: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 6,
    lineHeight: 1.5,
  },
  errorHint: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    lineHeight: 1.5,
  },
  returnBtn: {
    padding: '12px 32px',
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // ── PIN modal ─────────────────────────────────────────────────────────────────
  pinCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '36px 32px',
    width: '100%',
    maxWidth: 340,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 6,
    textAlign: 'center',
  },
  pinSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 22,
  },
  pinError: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
  },
  pinLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  pinInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 22,
    marginBottom: 14,
    outline: 'none',
    letterSpacing: 10,
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  pinBtn: {
    width: '100%',
    padding: '12px',
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  pinCancelBtn: {
    width: '100%',
    padding: '12px',
    background: '#e2e8f0',
    color: '#475569',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 10,
  },
};

// ── Image PIN Modal ────────────────────────────────────────────────────────────

function ImagePinModal({ token, onVerified, onClose, subtitle, isPassword }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyScanPin(token, pin);
      onVerified();
    } catch (err) {
      setError(err.message);
      setPin('');
      setLoading(false);
    }
  };

  return (
    <div style={st.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={st.pinCard}>
        <div style={st.pinTitle}>📂 {t('scan.scanImage')}</div>
        <div style={st.pinSubtitle}>{subtitle ?? t('scan.pinForImage')}</div>
        {error && <div style={st.pinError}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={st.pinLabel}>
            {isPassword ? t('scan.staffPasswordLabel') : 'PIN'}
          </label>
          <input
            style={isPassword
              ? { ...st.pinInput, letterSpacing: 'normal', fontSize: 16 }
              : st.pinInput}
            type="password"
            inputMode={isPassword ? undefined : 'numeric'}
            value={pin}
            onChange={(e) => isPassword
              ? setPin(e.target.value)
              : setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={isPassword ? t('scan.staffPasswordPlaceholder') : '••••'}
            required
            autoFocus
          />
          <button
            style={{ ...st.pinBtn, opacity: loading || pin.length < (isPassword ? 1 : 4) ? 0.6 : 1 }}
            type="submit"
            disabled={loading || pin.length < (isPassword ? 1 : 4)}
          >
            {loading ? '...' : t('pin.unlock')}
          </button>
          <button type="button" style={st.pinCancelBtn} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Register Modal ─────────────────────────────────────────────────────────────

function RegisterModal({ token, onSuccess, onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('__custom__');
  const [customExpiry, setCustomExpiry] = useState(() => calcExpiryFromDuration(30));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    getPackages(token)
      .then((pkgs) => {
        setPackages(pkgs);
        const def = pkgs.find((p) => p.is_default);
        setSelectedPackageId(def ? def.id : (pkgs.length > 0 ? pkgs[0].id : '__custom__'));
      })
      .catch(() => setSelectedPackageId('__custom__'));
  }, [token]);

  const isCustom = selectedPackageId === '__custom__';
  const selectedPkg = packages.find((p) => p.id === selectedPackageId);
  const computedExpiry = selectedPkg ? calcExpiryFromDuration(selectedPkg.duration_days) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await registerMember(
        token, name,
        isCustom ? customExpiry : null,
        phone ? '+62' + phone : '',
        isCustom ? null : selectedPackageId,
      );
      onSuccess(result);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={st.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={st.pinCard}>
        <div style={st.pinTitle}>📋 {t('scan.registerTitle')}</div>
        {error && <div style={st.pinError}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={st.pinLabel}>{t('admin.add.nameLabel')}</label>
          <input
            style={{ ...st.pinInput, letterSpacing: 'normal', textAlign: 'left', fontSize: 15 }}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('admin.add.namePlaceholder')}
            required
            autoFocus
          />
          <label style={st.pinLabel}>{t('admin.add.phoneLabel')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 600, whiteSpace: 'nowrap' }}>+62</span>
            <input
              style={{ ...st.pinInput, marginBottom: 0, flex: 1, letterSpacing: 'normal', textAlign: 'left', fontSize: 15 }}
              type="tel"
              inputMode="numeric"
              value={formatPhoneDigits(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder="8123 4567 890"
            />
          </div>
          <label style={st.pinLabel}>{t('admin.packages.packageLabel')}</label>
          <select
            style={st.registerSelect}
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.target.value)}
          >
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.duration_days}d{p.is_default ? ' ★' : ''}
              </option>
            ))}
            <option value="__custom__">{t('admin.packages.customDate')}</option>
          </select>
          {!isCustom && computedExpiry && (
            <div style={st.expiryPreview}>
              {t('admin.packages.expiresOn', { date: new Date(computedExpiry).toLocaleDateString('en-US') })}
            </div>
          )}
          {isCustom && (
            <>
              <label style={st.pinLabel}>{t('admin.add.expiryLabel')}</label>
              <input
                style={{ ...st.pinInput, letterSpacing: 'normal', textAlign: 'left', fontSize: 15, marginBottom: 14 }}
                type="date"
                value={customExpiry}
                onChange={(e) => setCustomExpiry(e.target.value)}
              />
            </>
          )}
          <button
            style={{ ...st.pinBtn, opacity: loading || !name.trim() ? 0.6 : 1 }}
            type="submit"
            disabled={loading || !name.trim()}
          >
            {loading ? t('scan.registering') : t('scan.registerTitle')}
          </button>
          <button type="button" style={st.pinCancelBtn} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Visitor Check-in Modal ────────────────────────────────────────────────────

function VisitorCheckInModal({ token, onSuccess, onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await checkInVisitor(token, name, phone ? '+62' + phone : null);
      onSuccess(result);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={st.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={st.pinCard}>
        <div style={st.pinTitle}>🚶 {t('scan.walkInTitle')}</div>
        {error && <div style={st.pinError}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={st.pinLabel}>{t('admin.add.nameLabel')}</label>
          <input
            style={{ ...st.pinInput, letterSpacing: 'normal', textAlign: 'left', fontSize: 15 }}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('admin.add.namePlaceholder')}
            required
            autoFocus
          />
          <label style={st.pinLabel}>
            {t('admin.add.phoneLabel')}{' '}
            <span style={{ fontWeight: 400, color: '#94a3b8' }}>({t('admin.add.phoneOptional')})</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 600, whiteSpace: 'nowrap' }}>+62</span>
            <input
              style={{ ...st.pinInput, marginBottom: 0, flex: 1, letterSpacing: 'normal', textAlign: 'left', fontSize: 15 }}
              type="tel"
              inputMode="numeric"
              value={formatPhoneDigits(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder="8123 4567 890"
            />
          </div>
          <button
            style={{ ...st.pinBtn, opacity: loading || !name.trim() ? 0.6 : 1 }}
            type="submit"
            disabled={loading || !name.trim()}
          >
            {loading ? t('common.loading') : t('scan.walkIn')}
          </button>
          <button type="button" style={st.pinCancelBtn} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Standby QR Download ────────────────────────────────────────────────────────

function downloadStandbyQR(gymName, qrDataUrl) {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 780;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 600, 780);

  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(gymName, 300, 58);

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 100, 80, 400, 400);

    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Scan to check in', 300, 530);

    ctx.fillStyle = '#374151';
    ctx.font = '20px sans-serif';
    ctx.fillText('Pindai untuk absen', 300, 566);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('Tunjukkan QR ini kepada anggota  /  Show this QR to members', 300, 620);

    const link = document.createElement('a');
    link.download = `${gymName.replace(/\s+/g, '-')}-checkin-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = qrDataUrl;
}

// ── Scan Page ──────────────────────────────────────────────────────────────────

export default function ScanPage({ token, role, gymName, onLogout, onAdminAccess }) {
  const [feedback, setFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [showImagePin, setShowImagePin] = useState(false);
  const [showRegisterPin, setShowRegisterPin] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showVisitorPin, setShowVisitorPin] = useState(false);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showStandbyQr, setShowStandbyQr] = useState(false);
  const [standbyQrData, setStandbyQrData] = useState(null);
  const [standbyQrLoading, setStandbyQrLoading] = useState(false);

  const lastScanRef = useRef(null);
  const isProcessingRef = useRef(false);
  const qrRef = useRef(null);
  const fileInputRef = useRef(null);
  const { lang, t } = useTranslation();

  // Countdown auto-close for success overlay — resets on each new check-in
  useEffect(() => {
    if (feedback?.type !== 'success') return;
    setCountdown(5);
    const intervalId = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const timeoutId = setTimeout(() => setFeedback(null), 5000);
    return () => { clearInterval(intervalId); clearTimeout(timeoutId); };
  }, [feedback?.checkedInAt]);

  // Keep a stable ref to processQrCode so the camera callback never goes stale
  const processQrCodeRef = useRef(null);
  processQrCodeRef.current = async (decodedText, fromFile = false) => {
    if (isProcessingRef.current) return;
    if (!fromFile) {
      const now = Date.now();
      if (lastScanRef.current && now - lastScanRef.current < DEBOUNCE_MS) return;
      lastScanRef.current = now;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    setFeedback(null);

    try {
      const result = await postScan(token, decodedText);
      setFeedback({
        type: 'success',
        memberName: result.memberName,
        gymId: result.gymId,
        checkedInAt: result.checkedInAt,
        packageName: result.packageName || null,
        expiryDate: result.expiryDate || null,
      });
    } catch (err) {
      const isExpired = err.message?.toLowerCase().includes('expired');
      setFeedback({ type: isExpired ? 'expired' : 'error', message: err.message });
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Auto-start camera on mount
  useEffect(() => {
    const qr = new Html5Qrcode('qr-reader');
    qrRef.current = qr;

    const config = { fps: 10, qrbox: { width: 260, height: 260 } };
    const onSuccess = (text) => processQrCodeRef.current(text);
    const onError = () => {};

    qr.start({ facingMode: 'environment' }, config, onSuccess, onError)
      .catch(() =>
        qr.start({ facingMode: 'user' }, config, onSuccess, onError)
          .catch(() => setCameraError(true))
      );

    return () => { qr.stop().catch(() => {}); };
  }, [token]);

  // After PIN verified, open the file picker
  const handleImagePinVerified = () => {
    setShowImagePin(false);
    fileInputRef.current?.click();
  };

  // Process selected image file
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      // Temporary instance for file decode — uses a hidden div
      const fileQr = new Html5Qrcode('qr-file-hidden');
      const decoded = await fileQr.scanFile(file, false);
      processQrCodeRef.current(decoded, true);
    } catch {
      setFeedback({ type: 'error', message: t('scan.noQrFound') });
    }
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', { hour12: false });

  const loadStandbyQr = async () => {
    setStandbyQrLoading(true);
    try {
      const res = await fetch('/api/scan/standby-qr', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const qrDataUrl = await QRCode.toDataURL(data.checkinCode, { width: 400, margin: 2 });
      setStandbyQrData({ gymName: data.gymName, checkinCode: data.checkinCode, qrDataUrl });
      setShowStandbyQr(true);
    } catch {
      // silently fail — camera still works
    } finally {
      setStandbyQrLoading(false);
    }
  };

  return (
    <div style={st.page}>
      {/* ── Header ── */}
      <div style={st.header}>
        <div style={{ ...st.headerLeft, display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/kiosgym-icon.svg" alt="KIOS GYM" style={{ height: 30, width: 'auto', display: 'block' }} />
          <div>
            <div style={st.gymName}>{gymName ?? 'Gym'}</div>
            <div style={st.kioskLabel}>{t('scan.title')}</div>
          </div>
        </div>
        <div style={st.headerRight}>
          <LanguageSwitcher variant="light" />
          <button
            style={{ ...st.adminBtn, ...(standbyQrLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
            onClick={loadStandbyQr}
            disabled={standbyQrLoading}
          >
            {standbyQrLoading ? t('standbyQr.loading') : t('standbyQr.button')}
          </button>
          {role === 'admin' && (
            <button style={st.adminBtn} onClick={onAdminAccess}>
              {t('scan.adminDashboard')}
            </button>
          )}
          <button style={st.logoutBtn} onClick={onLogout}>{t('scan.logout')}</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={st.body}>
        {/* Camera scanner */}
        <div style={st.scannerCard}>
          {cameraError && (
            <div style={st.cameraError}>{t('scan.cameraError')}</div>
          )}
          <div id="qr-reader" style={{ width: '100%' }} />
        </div>

        {/* Processing */}
        {isProcessing && <p style={st.processing}>{t('scan.processing')}</p>}

        {/* Inline error (e.g. member not found) */}
        {feedback?.type === 'error' && (
          <div style={st.feedbackError}>{feedback.message}</div>
        )}

        {/* Scan image file button */}
        <button style={st.imageBtn} onClick={() => setShowImagePin(true)}>
          📂 {t('scan.scanImage')}
        </button>

        {/* Register new member button */}
        <button style={{ ...st.imageBtn, marginTop: 8 }} onClick={() => setShowRegisterPin(true)}>
          📋 {t('scan.registerMember')}
        </button>

        {/* Walk-in visitor button */}
        <button style={{ ...st.imageBtn, marginTop: 8 }} onClick={() => setShowVisitorPin(true)}>
          🚶 {t('scan.walkIn')}
        </button>

        {/* Hidden elements for file scanning */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div id="qr-file-hidden" style={{ display: 'none' }} />
      </div>

      {/* ── Image PIN modal ── */}
      {showImagePin && (
        <ImagePinModal
          token={token}
          onVerified={handleImagePinVerified}
          onClose={() => setShowImagePin(false)}
          isPassword={role === 'staff'}
        />
      )}

      {/* ── Register PIN modal ── */}
      {showRegisterPin && (
        <ImagePinModal
          token={token}
          subtitle={role === 'staff' ? t('scan.registerPinSubtitle') : t('scan.registerPinSubtitle')}
          onVerified={() => { setShowRegisterPin(false); setShowRegisterForm(true); }}
          onClose={() => setShowRegisterPin(false)}
          isPassword={role === 'staff'}
        />
      )}

      {/* ── Register form modal ── */}
      {showRegisterForm && (
        <RegisterModal
          token={token}
          onSuccess={(result) => {
            setShowRegisterForm(false);
            setFeedback({
              type: 'success',
              memberName: result.memberName,
              gymId: result.gymId,
              checkedInAt: result.checkedInAt,
              packageName: result.packageName || null,
              expiryDate: result.expiryDate || null,
              isNewMember: true,
            });
          }}
          onClose={() => setShowRegisterForm(false)}
        />
      )}

      {/* ── Visitor PIN modal ── */}
      {showVisitorPin && (
        <ImagePinModal
          token={token}
          subtitle={t('scan.walkInPinSubtitle')}
          onVerified={() => { setShowVisitorPin(false); setShowVisitorForm(true); }}
          onClose={() => setShowVisitorPin(false)}
          isPassword={role === 'staff'}
        />
      )}

      {/* ── Visitor form modal ── */}
      {showVisitorForm && (
        <VisitorCheckInModal
          token={token}
          onSuccess={(result) => {
            setShowVisitorForm(false);
            setFeedback({
              type: 'success',
              memberName: result.visitorName,
              gymId: '',
              checkedInAt: result.checkedInAt,
              isVisitor: true,
              visitorPrice: result.visitorPrice,
            });
          }}
          onClose={() => setShowVisitorForm(false)}
        />
      )}

      {/* ── Expired overlay ── */}
      {feedback?.type === 'expired' && (
        <div style={st.overlay}>
          <div style={st.card}>
            <Lottie
              animationData={errorAnimation}
              loop={false}
              style={{ width: 160, height: 160, margin: '0 auto' }}
            />
            <p style={st.errorHeading}>{t('scan.membershipExpired')}</p>
            <p style={st.errorMessage}>{feedback.message}</p>
            <p style={st.errorHint}>{t('scan.expiredHint')}</p>
            <button style={st.returnBtn} onClick={() => setFeedback(null)}>
              {t('scan.returnToScan')}
            </button>
          </div>
        </div>
      )}

      {/* ── Standby QR full-screen overlay ── */}
      {showStandbyQr && standbyQrData && (
        <div style={{
          position: 'fixed', inset: 0, background: '#ffffff',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20,
          padding: 24,
        }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', textAlign: 'center' }}>
            {standbyQrData.gymName}
          </div>
          <img
            src={standbyQrData.qrDataUrl}
            alt="Check-in QR"
            style={{ width: 320, height: 320, display: 'block' }}
          />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a2e' }}>Scan to check in</div>
            <div style={{ fontSize: 18, color: '#374151', marginTop: 4 }}>Pindai untuk absen</div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              onClick={() => downloadStandbyQR(standbyQrData.gymName, standbyQrData.qrDataUrl)}
              style={{
                padding: '12px 24px', background: '#1a1a2e', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t('standbyQr.download')}
            </button>
            <button
              onClick={() => { setShowStandbyQr(false); setStandbyQrData(null); }}
              style={{
                padding: '12px 24px', background: '#f1f5f9', color: '#475569',
                border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t('standbyQr.close')}
            </button>
          </div>
        </div>
      )}

      {/* ── Success overlay ── */}
      {feedback?.type === 'success' && (
        <div style={st.overlay}>
          <div style={st.card}>
            <Lottie
              animationData={successAnimation}
              loop={false}
              style={{ width: 160, height: 160, margin: '0 auto' }}
            />
            <p style={st.cardHeading}>
              {feedback.isNewMember ? t('scan.registerSuccess') : feedback.isVisitor ? t('scan.walkInSuccess') : t('scan.checkinSuccess')}
            </p>
            <div style={st.cardName}>{feedback.memberName}</div>
            {!feedback.isVisitor && <div style={st.cardGymId}>{t('scan.gymId')}: {feedback.gymId}</div>}
            <div style={st.cardTime}>{t('scan.clockedIn', { time: formatTime(feedback.checkedInAt) })}</div>
            {feedback.packageName && (
              <div style={st.cardPackage}>{feedback.packageName}</div>
            )}
            {feedback.expiryDate && (() => {
              const days = daysUntilExpiry(feedback.expiryDate);
              return (
                <div style={{ ...st.cardExpiry, color: days <= 7 ? '#f59e0b' : '#94a3b8' }}>
                  {t('admin.packages.daysRemaining', { n: days })}
                </div>
              );
            })()}

            {/* Visitor payment reminder */}
            {feedback.isVisitor && feedback.visitorPrice > 0 && (
              <div style={{
                background: '#fef9c3', border: '1.5px solid #fde68a',
                borderRadius: 10, padding: '10px 16px', marginTop: 14,
              }}>
                <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                  {t('scan.collectPayment')}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309' }}>
                  Rp {Number(feedback.visitorPrice).toLocaleString('id-ID')}
                </div>
              </div>
            )}

            {/* Countdown close button */}
            <button
              onClick={() => setFeedback(null)}
              style={{
                marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, width: '100%', padding: '11px 0',
                background: '#f1f5f9', border: '2px solid #e2e8f0',
                borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#475569',
              }}
            >
              <span style={{
                width: 30, height: 30, borderRadius: '50%',
                background: '#1a1a2e', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, flexShrink: 0,
              }}>
                {countdown}
              </span>
              {t('scan.closeOverlay')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
