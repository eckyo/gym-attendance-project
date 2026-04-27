import { useEffect, useRef, useState } from 'react';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import Lottie from 'lottie-react';
import successAnimation from '../assets/success.json';
import errorAnimation from '../assets/error.json';
import { postScan, verifyScanPin, registerMember, checkInVisitor, lookupMember, extendMember } from '../api/scan.js';
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

function ImagePinModal({ token, onVerified, onClose, title, subtitle, isPassword }) {
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
        <div style={st.pinTitle}>{title ?? `📂 ${t('scan.scanImage')}`}</div>
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

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY;
}

function downloadStandbyQR(gymName, qrDataUrl) {
  const W = 600;
  const H = 940;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  Promise.all([loadImage(qrDataUrl), loadImage('/kiosgym-icon.svg')]).then(([qrImg, logoImg]) => {
    // ── Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // ── Gym name
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gymName, 300, 52);

    // ── QR code
    ctx.drawImage(qrImg, 125, 76, 350, 350);

    // ── Divider
    const drawDivider = (y) => {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    };
    drawDivider(442);

    // ── Cara Check-in section (light gray bg)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 442, W, 190);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Cara Check-in', 40, 468);

    const checkinSteps = [
      '1. Buka kiosgym.com',
      '2. Login dengan nomor HP & kata sandi',
      "3. Pilih 'Absen Sekarang' lalu arahkan kamera ke QR ini",
      '4. Selesai! Kamu berhasil check-in',
    ];
    ctx.fillStyle = '#374151';
    ctx.font = '13px sans-serif';
    let y = 494;
    for (const step of checkinSteps) {
      y = wrapText(ctx, step, 40, y, 520, 20) + 24;
    }

    drawDivider(632);

    // ── Belum terdaftar? section (white bg)
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Belum terdaftar?', 40, 658);

    const registerSteps = [
      '1. Hubungi staff gym',
      '2. Staff daftarkan nomor HP kamu',
      '3. Kamu akan mendapat kata sandi sementara',
      '4. Login dan ikuti langkah di atas',
    ];
    ctx.fillStyle = '#374151';
    ctx.font = '13px sans-serif';
    y = 682;
    for (const step of registerSteps) {
      y = wrapText(ctx, step, 40, y, 520, 20) + 24;
    }

    drawDivider(800);

    // ── Footer: logo icon + "Powered by" text
    const iconSize = 24;
    const label = 'Powered by';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#94a3b8';
    const labelW = ctx.measureText(label).width;
    const gap = 6;
    const totalW = labelW + gap + iconSize;
    const startX = (W - totalW) / 2;
    ctx.textAlign = 'left';
    ctx.fillText(label, startX, 828);
    ctx.drawImage(logoImg, startX + labelW + gap, 828 - iconSize + 4, iconSize, iconSize);

    // ── Trigger download
    const link = document.createElement('a');
    link.download = `${gymName.replace(/\s+/g, '-')}-checkin-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

// ── Extend Member Modal ────────────────────────────────────────────────────────

function ExtendMemberModal({ token, initialTarget, onSuccess, onClose }) {
  const { t, lang } = useTranslation();

  const [packages, setPackages] = useState([]);
  const [scanTokenInput, setScanTokenInput] = useState(initialTarget?.scanToken || '');
  const [member, setMember] = useState(
    initialTarget?.memberId
      ? { id: initialTarget.memberId, name: initialTarget.memberName, scan_token: initialTarget.scanToken, expiry_date: initialTarget.expiryDate }
      : null
  );
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fromExpiredScan = initialTarget?.fromExpiredScan ?? false;

  // Determine preview expiry
  const calcPreview = (expiryDate, durationDays) => {
    const base = expiryDate && new Date(expiryDate) > new Date() ? new Date(expiryDate) : new Date();
    base.setDate(base.getDate() + durationDays);
    return base.toISOString().slice(0, 10);
  };

  const selectedPkg = packages.find((p) => p.id === selectedPackageId);
  const previewExpiry = member && selectedPkg ? calcPreview(member.expiry_date, selectedPkg.duration_days) : null;

  useEffect(() => {
    getPackages(token).then(setPackages).catch(() => {});
  }, [token]);

  const handleSearch = async () => {
    if (!scanTokenInput.trim()) return;
    setSearching(true);
    setError('');
    setMember(null);
    try {
      const m = await lookupMember(token, scanTokenInput.trim());
      setMember(m);
    } catch (err) {
      setError(err.message || t('scan.extendMemberNotFound'));
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    if (!member || !selectedPackageId || !staffPassword) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await extendMember(token, member.id, selectedPackageId, staffPassword);
      onSuccess({ ...result, memberName: member.name }, fromExpiredScan, member.scan_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle = { background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 360, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const btnPrimary = { width: '100%', padding: '12px', background: '#BEFE00', color: '#1a1a1a', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 14 };
  const btnSecondary = { width: '100%', padding: '11px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 };

  return (
    <div style={st.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={cardStyle}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 18, textAlign: 'center', fontFamily: 'Impact, Arial Black, sans-serif' }}>
          {t('scan.extendTitle')}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Step 1: search by GYM ID (skip if pre-filled from expired scan) */}
        {!fromExpiredScan && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('scan.extendSearchLabel')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={scanTokenInput}
                onChange={(e) => setScanTokenInput(e.target.value.toUpperCase())}
                placeholder={t('scan.extendSearchPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                style={{ padding: '10px 14px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? '…' : t('scan.extendSearch')}
              </button>
            </div>
          </div>
        )}

        {/* Member info */}
        {member && (
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{member.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{member.scan_token}</div>
            <div style={{ fontSize: 12, color: member.expiry_date && new Date(member.expiry_date) < new Date() ? '#dc2626' : '#64748b', marginTop: 2 }}>
              {member.expiry_date
                ? `Expires: ${new Date(member.expiry_date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US')}`
                : 'No expiry set'}
            </div>
          </div>
        )}

        {/* Step 2: package + password (only shown when member is found) */}
        {member && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{t('admin.packages.packageLabel')}</label>
              <select
                style={{ ...inputStyle, background: '#fff' }}
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
              >
                <option value="">{t('scan.extendSelectPackage')}</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Rp {Number(p.price).toLocaleString('id-ID')}
                  </option>
                ))}
              </select>
              {previewExpiry && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 5 }}>
                  {t('admin.packages.expiresOn', { date: new Date(previewExpiry).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US') })}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 4 }}>
              <label style={labelStyle}>{t('scan.extendPassword')}</label>
              <input
                style={inputStyle}
                type="password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {selectedPkg && (
              <div style={{ background: '#fef9c3', border: '1.5px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginTop: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('scan.collectPayment')}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309' }}>
                  Rp {Number(selectedPkg.price).toLocaleString('id-ID')}
                </div>
              </div>
            )}

            <button
              style={{ ...btnPrimary, opacity: (!selectedPackageId || !staffPassword || submitting) ? 0.5 : 1, cursor: (!selectedPackageId || !staffPassword || submitting) ? 'not-allowed' : 'pointer' }}
              onClick={handleConfirm}
              disabled={!selectedPackageId || !staffPassword || submitting}
            >
              {submitting ? t('scan.extendConfirming') : t('scan.extendConfirm')}
            </button>
          </>
        )}

        <button style={btnSecondary} onClick={onClose}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}

// ── Scan Page ──────────────────────────────────────────────────────────────────

export default function ScanPage({ token, role, gymName, onLogout, onAdminAccess }) {
  const isMobile = useIsMobile();
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
  const [kebabOpen, setKebabOpen] = useState(false);
  const [extendTarget, setExtendTarget] = useState(null);
  const [manageMemberOpen, setManageMemberOpen] = useState(false);

  const lastScanRef = useRef(null);
  const isProcessingRef = useRef(false);
  const qrRef = useRef(null);
  const fileInputRef = useRef(null);
  const { lang, t } = useTranslation();

  // Countdown auto-close for success overlay — resets on each new check-in (not for extend-only)
  useEffect(() => {
    if (feedback?.type !== 'success' || feedback?.extendOnly) return;
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
      setFeedback({
        type: isExpired ? 'expired' : 'error',
        message: err.message,
        memberId: err.data?.memberId,
        memberName: err.data?.memberName,
        scanToken: err.data?.scanToken,
        expiryDate: err.data?.expiryDate,
      });
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
          {isMobile ? (
            <>
              <button style={st.logoutBtn} onClick={onLogout}>{t('scan.logout')}</button>
              <div style={{ position: 'relative' }}>
                <button
                  style={{ width: 34, height: 34, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  onClick={() => setKebabOpen((p) => !p)}
                >
                  ⋮
                </button>
                {kebabOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setKebabOpen(false)} />
                    <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 200, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 200, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <LanguageSwitcher variant="dark" />
                      </div>
                      {role === 'admin' && (
                        <button
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', borderTop: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13, color: '#1e293b' }}
                          onClick={() => { onAdminAccess(); setKebabOpen(false); }}
                        >
                          {t('scan.adminDashboard')}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <LanguageSwitcher variant="light" />
              {role === 'admin' && (
                <button style={st.adminBtn} onClick={onAdminAccess}>
                  {t('scan.adminDashboard')}
                </button>
              )}
              <button style={st.logoutBtn} onClick={onLogout}>{t('scan.logout')}</button>
            </>
          )}
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

        {/* Show Attendance QR button — always below camera */}
        <button
          style={{ ...st.imageBtn, ...(standbyQrLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
          onClick={loadStandbyQr}
          disabled={standbyQrLoading}
        >
          🔳 {standbyQrLoading ? t('standbyQr.loading') : t('standbyQr.button')}
        </button>

        {/* Scan image file button */}
        <button style={{ ...st.imageBtn, marginTop: 8 }} onClick={() => setShowImagePin(true)}>
          📂 {t('scan.scanImage')}
        </button>

        {/* Manage Member dropdown — Register + Extend */}
        <div style={{ position: 'relative', marginTop: 8 }}>
          <button
            style={st.imageBtn}
            onClick={() => setManageMemberOpen((p) => !p)}
          >
            👥 {t('scan.manageMember')} <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>{manageMemberOpen ? '▲' : '▼'}</span>
          </button>
          {manageMemberOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setManageMemberOpen(false)} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 50, background: '#fff', border: '1.5px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                <button
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#475569' }}
                  onClick={() => { setManageMemberOpen(false); setShowRegisterPin(true); }}
                >
                  📋 {t('scan.registerMember')}
                </button>
                <button
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#475569' }}
                  onClick={() => { setManageMemberOpen(false); setExtendTarget({}); }}
                >
                  🔄 {t('scan.extendMembership')}
                </button>
              </div>
            </>
          )}
        </div>

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
          title={`📋 ${t('scan.registerTitle')}`}
          subtitle={t('scan.registerPinSubtitle')}
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
          title={`🚶 ${t('scan.walkInTitle')}`}
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

      {/* ── Extend Member modal ── */}
      {extendTarget !== null && (
        <ExtendMemberModal
          token={token}
          initialTarget={extendTarget}
          onSuccess={(result, fromExpiredScan, scanToken) => {
            setExtendTarget(null);
            if (fromExpiredScan && scanToken) {
              postScan(token, scanToken).then((r) => {
                setFeedback({
                  type: 'success',
                  memberName: r.memberName,
                  gymId: r.gymId,
                  checkedInAt: r.checkedInAt,
                  packageName: r.packageName || null,
                  expiryDate: r.expiryDate || null,
                  extendCheckin: true,
                });
              }).catch(() => {
                setFeedback({ type: 'success', extendOnly: true, memberName: result.memberName || '', packageName: result.packageName, totalAmount: result.totalAmount });
              });
            } else {
              setFeedback({ type: 'success', extendOnly: true, memberName: result.memberName || '', packageName: result.packageName, totalAmount: result.totalAmount });
            }
          }}
          onClose={() => setExtendTarget(null)}
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
            {feedback.memberId ? (
              <button
                style={{ ...st.returnBtn, background: '#BEFE00', color: '#1a1a1a', marginBottom: 10 }}
                onClick={() => {
                  setExtendTarget({
                    memberId: feedback.memberId,
                    memberName: feedback.memberName,
                    scanToken: feedback.scanToken,
                    expiryDate: feedback.expiryDate,
                    fromExpiredScan: true,
                  });
                  setFeedback(null);
                }}
              >
                {t('scan.extendMembership')}
              </button>
            ) : (
              <p style={st.errorHint}>{t('scan.expiredHint')}</p>
            )}
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
              {feedback.extendOnly
                ? t('scan.extendSuccess')
                : feedback.extendCheckin
                  ? t('scan.extendCheckinSuccess')
                  : feedback.isNewMember
                    ? t('scan.registerSuccess')
                    : feedback.isVisitor
                      ? t('scan.walkInSuccess')
                      : t('scan.checkinSuccess')}
            </p>
            <div style={st.cardName}>{feedback.memberName}</div>
            {!feedback.isVisitor && !feedback.extendOnly && <div style={st.cardGymId}>{t('scan.gymId')}: {feedback.gymId}</div>}
            {!feedback.extendOnly && <div style={st.cardTime}>{t('scan.clockedIn', { time: formatTime(feedback.checkedInAt) })}</div>}
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

            {/* Extend payment reminder */}
            {(feedback.extendOnly || feedback.extendCheckin) && feedback.totalAmount > 0 && (
              <div style={{
                background: '#fef9c3', border: '1.5px solid #fde68a',
                borderRadius: 10, padding: '10px 16px', marginTop: 14,
              }}>
                <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                  {t('scan.collectPayment')}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309' }}>
                  Rp {Number(feedback.totalAmount).toLocaleString('id-ID')}
                </div>
              </div>
            )}

            {/* Close button — countdown shown only for check-in successes */}
            <button
              onClick={() => setFeedback(null)}
              style={{
                marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, width: '100%', padding: '11px 0',
                background: '#f1f5f9', border: '2px solid #e2e8f0',
                borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#475569',
              }}
            >
              {!feedback.extendOnly && (
                <span style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: '#1a1a2e', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, flexShrink: 0,
                }}>
                  {countdown}
                </span>
              )}
              {t('scan.closeOverlay')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
