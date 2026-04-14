import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Lottie from 'lottie-react';
import successAnimation from '../assets/success.json';
import errorAnimation from '../assets/error.json';
import { postScan, verifyScanPin } from '../api/scan.js';
import { useTranslation, LanguageSwitcher } from '../i18n/LanguageContext.jsx';

const DEBOUNCE_MS = 5000;

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

function ImagePinModal({ token, onVerified, onClose }) {
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
        <div style={st.pinSubtitle}>{t('scan.pinForImage')}</div>
        {error && <div style={st.pinError}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={st.pinLabel}>PIN</label>
          <input
            style={st.pinInput}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••"
            required
            autoFocus
          />
          <button
            style={{ ...st.pinBtn, opacity: loading || pin.length < 4 ? 0.6 : 1 }}
            type="submit"
            disabled={loading || pin.length < 4}
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

// ── Scan Page ──────────────────────────────────────────────────────────────────

export default function ScanPage({ token, role, gymName, onLogout, onAdminAccess }) {
  const [feedback, setFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [showImagePin, setShowImagePin] = useState(false);

  const lastScanRef = useRef(null);
  const isProcessingRef = useRef(false);
  const qrRef = useRef(null);
  const fileInputRef = useRef(null);
  const { lang, t } = useTranslation();

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
      });
      setTimeout(() => setFeedback(null), 5000);
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

  return (
    <div style={st.page}>
      {/* ── Header ── */}
      <div style={st.header}>
        <div style={st.headerLeft}>
          <div style={st.gymName}>{gymName ?? 'Gym'}</div>
          <div style={st.kioskLabel}>{t('scan.title')}</div>
        </div>
        <div style={st.headerRight}>
          <LanguageSwitcher variant="light" />
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

      {/* ── Success overlay ── */}
      {feedback?.type === 'success' && (
        <div style={st.overlay}>
          <div style={st.card}>
            <Lottie
              animationData={successAnimation}
              loop={false}
              style={{ width: 160, height: 160, margin: '0 auto' }}
            />
            <p style={st.cardHeading}>{t('scan.checkinSuccess')}</p>
            <div style={st.cardName}>{feedback.memberName}</div>
            <div style={st.cardGymId}>{t('scan.gymId')}: {feedback.gymId}</div>
            <div style={st.cardTime}>{t('scan.clockedIn', { time: formatTime(feedback.checkedInAt) })}</div>
          </div>
        </div>
      )}
    </div>
  );
}
