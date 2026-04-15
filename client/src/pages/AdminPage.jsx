import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import {
  getAttendance, getMembers, addMember, updateMember,
  deleteMember, changePin, exportMembers, downloadTemplate,
  previewImport, confirmImport, getStaff, addStaff, removeStaff, verifyPin, changeStaffPassword,
} from '../api/admin.js';
import { useTranslation, LanguageSwitcher } from '../i18n/LanguageContext.jsx';

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', padding: '0 0 40px' },
  header: {
    background: '#1a1a2e',
    color: '#fff',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: 700 },
  headerRight: { display: 'flex', gap: 10, alignItems: 'center' },
  backBtn: {
    padding: '7px 16px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
  },
  changePinBtn: {
    padding: '7px 16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
  },
  body: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' },
  tab: {
    padding: '10px 24px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 15,
    color: '#64748b',
    fontWeight: 500,
    borderBottom: '2px solid transparent',
    marginBottom: -2,
  },
  tabActive: { color: '#3b82f6', borderBottomColor: '#3b82f6', fontWeight: 700 },
  toolbar: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  searchInput: {
    padding: '9px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    minWidth: 200,
    flex: 1,
  },
  dateInput: {
    padding: '9px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    background: '#fff',
  },
  addBtn: {
    padding: '9px 18px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  outlineBtn: {
    padding: '9px 18px',
    background: '#fff',
    color: '#475569',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  th: { padding: '12px 16px', background: '#f8fafc', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 16px', fontSize: 14, color: '#1e293b', borderBottom: '1px solid #f1f5f9' },
  tdMono: { padding: '12px 16px', fontSize: 12, color: '#64748b', fontFamily: 'monospace', borderBottom: '1px solid #f1f5f9' },
  actionBtn: {
    padding: '5px 12px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    marginRight: 6,
  },
  editBtn: { background: '#eff6ff', color: '#2563eb' },
  deleteBtn: { background: '#fef2f2', color: '#dc2626' },
  saveBtn: { background: '#f0fdf4', color: '#16a34a' },
  cancelBtn: { background: '#f8fafc', color: '#64748b' },
  qrBtn: { background: '#f5f3ff', color: '#7c3aed' },
  empty: { textAlign: 'center', color: '#94a3b8', padding: '40px 16px', fontSize: 14 },
  inlineInput: {
    padding: '6px 10px',
    border: '1.5px solid #93c5fd',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    width: '100%',
    maxWidth: 240,
  },
  // Modal
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    background: '#fff', borderRadius: 16, padding: '32px 28px',
    width: '100%', maxWidth: 360,
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
  error: {
    background: '#fee2e2', color: '#991b1b',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 13, marginBottom: 14, textAlign: 'center',
  },
  success: {
    background: '#dcfce7', color: '#166534',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 13, marginBottom: 14, textAlign: 'center',
  },
  qrModal: {
    background: '#fff', borderRadius: 16, padding: '32px 28px',
    width: '100%', maxWidth: 420, textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  qrCanvas: { display: 'block', margin: '16px auto', borderRadius: 8 },
  qrMemberName: { fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 },
  qrToken: { fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 16, wordBreak: 'break-all' },
  qrInstruction: {
    background: '#f0f9ff', border: '1px solid #bae6fd',
    borderRadius: 10, padding: '14px 16px',
    fontSize: 13, color: '#0369a1', textAlign: 'left',
    lineHeight: 1.6, marginBottom: 20,
  },
  qrInstructionTitle: { fontWeight: 700, marginBottom: 6, fontSize: 13 },
  saveQrBtn: {
    width: '100%', padding: '11px', borderRadius: 8,
    border: 'none', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', background: '#7c3aed', color: '#fff',
    marginBottom: 10,
  },
  // Import modal
  importModal: {
    background: '#fff', borderRadius: 16, padding: '32px 28px',
    width: '100%', maxWidth: 720,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    maxHeight: '85vh', overflowY: 'auto',
  },
  importSummary: {
    background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
    fontSize: 13, color: '#475569', marginBottom: 16,
  },
  importRowValid: { background: '#fff' },
  importRowError: { background: '#fef2f2' },
  badge: {
    display: 'inline-block', padding: '2px 8px',
    borderRadius: 99, fontSize: 11, fontWeight: 600,
  },
  badgeReady: { background: '#dcfce7', color: '#166534' },
  badgeError: { background: '#fee2e2', color: '#991b1b' },
  fileInput: {
    display: 'block', width: '100%',
    padding: '10px 14px',
    border: '1.5px dashed #cbd5e1', borderRadius: 8,
    fontSize: 14, cursor: 'pointer', marginBottom: 14,
    boxSizing: 'border-box',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const triggerDownload = async (fetchFn, filename) => {
  const res = await fetchFn();
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── QR Code Modal ───────────────────────────────────────────────────────────

function QrCodeModal({ member, onClose }) {
  const canvasRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, member.scan_token, {
        width: 240,
        margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      });
    }
  }, [member.scan_token]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `qr-${member.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.qrModal}>
        <div style={s.qrMemberName}>{member.name}</div>
        <div style={s.qrToken}>{member.scan_token}</div>

        <canvas ref={canvasRef} style={s.qrCanvas} />

        <div style={s.qrInstruction}>
          <div style={s.qrInstructionTitle}>{t('admin.qr.howToShare')}</div>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            <li>{t('admin.qr.step1pre')}<strong>{t('admin.qr.step1bold')}</strong>{t('admin.qr.step1post')}</li>
            <li>{t('admin.qr.step2pre')}<strong>{member.name}</strong>{t('admin.qr.step2post')}</li>
            <li>{t('admin.qr.step3')}</li>
            <li>{t('admin.qr.step4')}</li>
          </ol>
        </div>

        <button style={s.saveQrBtn} onClick={handleSave}>
          {t('admin.qr.saveQrCode')}
        </button>
        <button
          style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569' }}
          onClick={onClose}
        >
          {t('admin.qr.close')}
        </button>
      </div>
    </div>
  );
}

// ─── Delete PIN Modal ─────────────────────────────────────────────────────────

function DeletePinModal({ token, member, onDeleted, onClose }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await deleteMember(token, member.id, pin);
      onDeleted(member.id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.delete.title')}</div>
        <p style={{ fontSize: 14, color: '#475569', marginBottom: 16, marginTop: -8 }}>
          {t('admin.delete.confirmPre')}<strong>{member.name}</strong>{t('admin.delete.confirmPost')}
        </p>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.delete.pinLabel')}</label>
          <input
            style={s.modalInput}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('admin.delete.pinPlaceholder')}
            required
            autoFocus
          />
          <button
            style={{ ...s.modalBtn, background: '#dc2626', color: '#fff', opacity: loading ? 0.6 : 1 }}
            type="submit"
            disabled={loading}
          >
            {loading ? t('admin.delete.removing') : t('admin.delete.remove')}
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

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ token, onImported, onClose }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview'
  const [previewRows, setPreviewRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const { t } = useTranslation();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const result = await previewImport(token, file);
      setPreviewRows(result.rows);
      setStep('preview');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validRows = previewRows.filter((r) => r.errors.length === 0);
  const errorCount = previewRows.length - validRows.length;

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await confirmImport(token, validRows.map((r) => ({
        name: r.name,
        gymId: r.gymId,
        expiryDate: r.expiryDate,
        joinedDate: r.joinedDate,
      })));
      onImported(result.members);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.importModal}>
        <div style={s.modalTitle}>
          {step === 'upload' ? t('admin.import.title') : t('admin.import.previewTitle')}
        </div>

        {error && <div style={s.error}>{error}</div>}

        {step === 'upload' && (
          <>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 16, marginTop: -8 }}>
              {t('admin.import.description')}
            </p>
            <input
              ref={fileRef}
              style={s.fileInput}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={loading}
            />
            {loading && <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14 }}>{t('admin.import.parsing')}</p>}
            <button
              type="button"
              style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 6 }}
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
          </>
        )}

        {step === 'preview' && (
          <>
            <div style={s.importSummary}>
              {t('admin.import.summary', { valid: validRows.length, total: previewRows.length })}
              {errorCount > 0 && t('admin.import.errorRows', { count: errorCount, s: errorCount > 1 ? 's' : '' })}
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ ...s.table, marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th style={s.th}>{t('admin.import.colNum')}</th>
                    <th style={s.th}>{t('admin.import.colName')}</th>
                    <th style={s.th}>{t('admin.import.colGymId')}</th>
                    <th style={s.th}>{t('admin.import.colExpiry')}</th>
                    <th style={s.th}>{t('admin.import.colJoined')}</th>
                    <th style={s.th}>{t('admin.import.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.rowIndex} style={row.errors.length > 0 ? s.importRowError : s.importRowValid}>
                      <td style={s.td}>{row.rowIndex}</td>
                      <td style={s.td}>{row.name || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td style={s.tdMono}>{row.gymId || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td style={s.td}>{row.expiryDate || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td style={s.td}>{row.joinedDate}</td>
                      <td style={s.td}>
                        {row.errors.length === 0 ? (
                          <span style={{ ...s.badge, ...s.badgeReady }}>{t('admin.import.badgeReady')}</span>
                        ) : (
                          <span style={{ ...s.badge, ...s.badgeError }} title={row.errors.join('; ')}>
                            {row.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {validRows.length > 0 && (
              <button
                style={{ ...s.modalBtn, background: '#3b82f6', color: '#fff', opacity: loading ? 0.6 : 1, marginBottom: 10 }}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? t('admin.import.importing') : t('admin.import.importBtn', { count: validRows.length, s: validRows.length > 1 ? 's' : '' })}
              </button>
            )}
            <button
              type="button"
              style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569' }}
              onClick={() => { setStep('upload'); setPreviewRows([]); setError(''); if (fileRef.current) fileRef.current.value = ''; }}
            >
              {t('admin.import.back')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Change PIN Modal ─────────────────────────────────────────────────────────

function ChangePinModal({ token, onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPin !== confirmPin) { setError(t('admin.changepin.mismatch')); return; }
    if (!/^\d{4,6}$/.test(newPin)) { setError(t('admin.changepin.format')); return; }
    setLoading(true);
    try {
      await changePin(token, currentPin, newPin);
      setSuccess(t('admin.changepin.success'));
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.changepin.title')}</div>
        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.changepin.currentPin')}</label>
          <input style={s.modalInput} type="password" inputMode="numeric"
            value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('admin.changepin.currentPin')} required autoFocus />
          <label style={s.modalLabel}>{t('admin.changepin.newPin')}</label>
          <input style={s.modalInput} type="password" inputMode="numeric"
            value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="4–6 digits" required />
          <label style={s.modalLabel}>{t('admin.changepin.confirmPin')}</label>
          <input style={s.modalInput} type="password" inputMode="numeric"
            value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('admin.changepin.confirmPin')} required />
          <button style={{ ...s.modalBtn, background: '#3b82f6', color: '#fff', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading}>
            {loading ? t('admin.changepin.saving') : t('admin.changepin.savePin')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

const defaultExpiryDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

const formatPhoneDigits = (digits) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');

const maskPhone = (phone) => {
  if (!phone) return '—';
  const digits = phone.replace('+62', '');
  const visible = digits.slice(-3);
  return '+62' + '*'.repeat(Math.max(0, digits.length - 3)) + visible;
};

function AddMemberModal({ token, onAdded, onClose }) {
  const [name, setName] = useState('');
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const member = await addMember(token, name, expiryDate, phone ? '+62' + phone : '');
      onAdded(member);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.add.title')}</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.add.nameLabel')}</label>
          <input style={s.modalInput} type="text"
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t('admin.add.namePlaceholder')} required autoFocus />
          <label style={s.modalLabel}>{t('admin.add.expiryLabel')}</label>
          <input style={s.modalInput} type="date"
            value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
            required />
          <label style={s.modalLabel}>{t('admin.add.phoneLabel')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 600, whiteSpace: 'nowrap' }}>+62</span>
            <input
              style={{ ...s.modalInput, marginBottom: 0, flex: 1 }}
              type="tel"
              inputMode="numeric"
              value={formatPhoneDigits(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder="8123 4567 890"
            />
          </div>
          <button style={{ ...s.modalBtn, background: '#3b82f6', color: '#fff', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading}>
            {loading ? t('admin.add.adding') : t('admin.add.addMember')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Phone Reveal Modal ───────────────────────────────────────────────────────

function PhoneRevealModal({ token, onSuccess, onClose }) {
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
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 340 }}>
        <div style={s.modalTitle}>{t('admin.members.revealPhone')}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18, marginTop: -8 }}>
          {t('admin.members.revealPhoneSubtitle')}
        </div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.delete.pinLabel')}</label>
          <input
            style={{ ...s.modalInput, letterSpacing: 8, textAlign: 'center', fontSize: 20 }}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••"
            required
            autoFocus
          />
          <button
            style={{ ...s.modalBtn, background: '#1a1a2e', color: '#fff', opacity: loading || pin.length < 4 ? 0.6 : 1 }}
            type="submit"
            disabled={loading || pin.length < 4}
          >
            {loading ? '...' : t('pin.unlock')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Add Staff Modal ──────────────────────────────────────────────────────────

function AddStaffModal({ token, onAdded, onClose }) {
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
      const staff = await addStaff(token, email, password);
      onAdded(staff);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.staff.addTitle')}</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.staff.emailLabel')}</label>
          <input style={s.modalInput} type="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={t('admin.staff.emailPlaceholder')} required autoFocus />
          <label style={s.modalLabel}>{t('admin.staff.passwordLabel')}</label>
          <input style={s.modalInput} type="password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={t('admin.staff.passwordPlaceholder')} required />
          <button style={{ ...s.modalBtn, background: '#3b82f6', color: '#fff', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading}>
            {loading ? t('admin.staff.adding') : t('admin.staff.addTitle')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Staff Modal ───────────────────────────────────────────────────────

function DeleteStaffModal({ token, staff, onDeleted, onClose }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await removeStaff(token, staff.id, pin);
      onDeleted(staff.id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.staff.deleteTitle')}</div>
        <p style={{ fontSize: 14, color: '#475569', marginBottom: 16, marginTop: -8 }}>
          {t('admin.staff.deleteConfirmPre')}<strong>{staff.email}</strong>{t('admin.staff.deleteConfirmPost')}
        </p>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.staff.pinLabel')}</label>
          <input
            style={s.modalInput}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('admin.staff.pinPlaceholder')}
            required
            autoFocus
          />
          <button
            style={{ ...s.modalBtn, background: '#dc2626', color: '#fff', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading}>
            {loading ? t('admin.staff.removing') : t('admin.members.remove')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Change Staff Password Modal ──────────────────────────────────────────────

function ChangeStaffPasswordModal({ token, staff, onClose }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError(t('admin.staff.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('admin.staff.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await changeStaffPassword(token, staff.id, newPassword, pin);
      setSuccess(t('admin.staff.passwordUpdated'));
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.staff.changePasswordTitle')}</div>
        <p style={{ fontSize: 14, color: '#475569', marginBottom: 16, marginTop: -8 }}>
          <strong>{staff.email}</strong>
        </p>
        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.staff.newPasswordLabel')}</label>
          <input
            style={s.modalInput}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('admin.staff.passwordPlaceholder')}
            required
            autoFocus
          />
          <label style={s.modalLabel}>{t('admin.staff.confirmPasswordLabel')}</label>
          <input
            style={s.modalInput}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('admin.staff.passwordPlaceholder')}
            required
          />
          <label style={s.modalLabel}>{t('admin.staff.pinLabel')}</label>
          <input
            style={s.modalInput}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('admin.staff.pinPlaceholder')}
            required
          />
          <button
            style={{ ...s.modalBtn, background: '#3b82f6', color: '#fff', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading}>
            {loading ? t('admin.changepin.saving') : t('admin.staff.changePassword')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Staff Tab ────────────────────────────────────────────────────────────────

function StaffTab({ token }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [changingPasswordStaff, setChangingPasswordStaff] = useState(null);
  const { lang, t } = useTranslation();

  useEffect(() => {
    setLoading(true);
    getStaff(token)
      .then(setStaff)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAdded = (member) => {
    setStaff((prev) => [...prev, member]);
    setShowAddModal(false);
  };

  const handleDeleted = (id) => {
    setStaff((prev) => prev.filter((m) => m.id !== id));
    setDeletingStaff(null);
  };

  const locale = lang === 'id' ? 'id-ID' : 'en-US';

  return (
    <div>
      <div style={{ ...s.toolbar, justifyContent: 'flex-end' }}>
        <button style={s.addBtn} onClick={() => setShowAddModal(true)}>
          {t('admin.staff.addStaff')}
        </button>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>{t('admin.staff.colEmail')}</th>
            <th style={s.th}>{t('admin.staff.colCreated')}</th>
            <th style={s.th}>{t('admin.staff.colActions')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={3} style={s.empty}>{t('common.loading')}</td></tr>
          ) : staff.length === 0 ? (
            <tr><td colSpan={3} style={s.empty}>{t('admin.staff.noStaff')}</td></tr>
          ) : staff.map((member) => (
            <tr key={member.id}>
              <td style={s.td}>{member.email}</td>
              <td style={s.td}>{new Date(member.created_at).toLocaleDateString(locale)}</td>
              <td style={s.td}>
                <button
                  style={{ ...s.actionBtn, ...s.editBtn }}
                  onClick={() => setChangingPasswordStaff(member)}
                >
                  {t('admin.staff.changePassword')}
                </button>
                <button
                  style={{ ...s.actionBtn, ...s.deleteBtn }}
                  onClick={() => setDeletingStaff(member)}
                >
                  {t('admin.staff.remove')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddModal && (
        <AddStaffModal token={token} onAdded={handleAdded} onClose={() => setShowAddModal(false)} />
      )}
      {deletingStaff && (
        <DeleteStaffModal token={token} staff={deletingStaff} onDeleted={handleDeleted} onClose={() => setDeletingStaff(null)} />
      )}
      {changingPasswordStaff && (
        <ChangeStaffPasswordModal token={token} staff={changingPasswordStaff} onClose={() => setChangingPasswordStaff(null)} />
      )}
    </div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────

function AttendanceTab({ token }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { lang, t } = useTranslation();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAttendance(token, { date, search: search || undefined });
      setRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, date, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={s.toolbar}>
        <input
          style={s.dateInput}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          style={s.searchInput}
          type="text"
          placeholder={t('admin.attendance.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div style={s.error}>{error}</div>}

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>{t('admin.attendance.colMember')}</th>
            <th style={s.th}>{t('admin.attendance.colGymId')}</th>
            <th style={s.th}>{t('admin.attendance.colClockIn')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={3} style={s.empty}>{t('common.loading')}</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={3} style={s.empty}>{t('admin.attendance.noRecords')}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i}>
              <td style={s.td}>{row.member_name}</td>
              <td style={s.tdMono}>{row.gym_id}</td>
              <td style={s.td}>
                {new Date(row.checked_in_at).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { hour12: false })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({ token }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [revealedPhoneId, setRevealedPhoneId] = useState(null);
  const [pendingRevealId, setPendingRevealId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deletingMember, setDeletingMember] = useState(null);
  const [qrMember, setQrMember] = useState(null);
  const { lang, t } = useTranslation();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMembers(token, { search: search || undefined });
      setMembers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (member) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditExpiry(member.expiry_date ? member.expiry_date.slice(0, 10) : '');
    setEditPhone(member.phone_number ? member.phone_number.replace('+62', '') : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditExpiry('');
    setEditPhone('');
  };

  const saveEdit = async (id) => {
    try {
      const updated = await updateMember(token, id, editName, editExpiry, editPhone ? '+62' + editPhone : '');
      setMembers((prev) => prev.map((m) => m.id === id ? updated : m));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleted = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setDeletingMember(null);
  };

  const handleAdded = (member) => {
    setMembers((prev) => [...prev, member].sort((a, b) => a.scan_token.localeCompare(b.scan_token)));
    setShowAddModal(false);
  };

  const handleImported = (newMembers) => {
    setMembers((prev) =>
      [...prev, ...newMembers].sort((a, b) => a.scan_token.localeCompare(b.scan_token))
    );
    setShowImportModal(false);
  };

  const handleExport = async () => {
    try {
      await triggerDownload(() => exportMembers(token), 'members.xlsx');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTemplate = async () => {
    try {
      await triggerDownload(() => downloadTemplate(token), 'members-template.xlsx');
    } catch (err) {
      setError(err.message);
    }
  };

  const locale = lang === 'id' ? 'id-ID' : 'en-US';

  return (
    <div>
      <div style={s.toolbar}>
        <input
          style={s.searchInput}
          type="text"
          placeholder={t('admin.members.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button style={s.outlineBtn} onClick={handleTemplate}>{t('admin.members.template')}</button>
        <button style={s.outlineBtn} onClick={handleExport}>{t('admin.members.export')}</button>
        <button style={s.outlineBtn} onClick={() => setShowImportModal(true)}>{t('admin.members.import')}</button>
        <button style={s.addBtn} onClick={() => setShowAddModal(true)}>{t('admin.members.addMember')}</button>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>{t('admin.members.colName')}</th>
            <th style={s.th}>{t('admin.members.colGymId')}</th>
            <th style={s.th}>{t('admin.members.colPhone')}</th>
            <th style={s.th}>{t('admin.members.colExpiry')}</th>
            <th style={s.th}>{t('admin.members.colJoined')}</th>
            <th style={s.th}>{t('admin.members.colActions')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} style={s.empty}>{t('common.loading')}</td></tr>
          ) : members.length === 0 ? (
            <tr><td colSpan={6} style={s.empty}>{t('admin.members.noMembers')}</td></tr>
          ) : members.map((member) => {
            const isExpired = member.expiry_date && new Date(member.expiry_date) < new Date();
            return (
              <tr key={member.id}>
                <td style={s.td}>
                  {editingId === member.id ? (
                    <input
                      style={s.inlineInput}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(member.id); if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus
                    />
                  ) : member.name}
                </td>
                <td style={s.tdMono}>{member.scan_token}</td>
                <td style={s.td}>
                  {editingId === member.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>+62</span>
                      <input
                        style={{ ...s.inlineInput, maxWidth: 140 }}
                        type="tel"
                        inputMode="numeric"
                        value={formatPhoneDigits(editPhone)}
                        onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                        placeholder="8123 4567 890"
                      />
                    </div>
                  ) : member.phone_number ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {revealedPhoneId === member.id
                          ? '+62 ' + formatPhoneDigits(member.phone_number.replace('+62', ''))
                          : maskPhone(member.phone_number)}
                      </span>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                        onClick={() => revealedPhoneId === member.id
                          ? setRevealedPhoneId(null)
                          : setPendingRevealId(member.id)}
                        title={revealedPhoneId === member.id ? 'Hide' : 'Reveal'}
                      >
                        {revealedPhoneId === member.id ? '🙈' : '👁'}
                      </button>
                    </div>
                  ) : '—'}
                </td>
                <td style={{ ...s.td, color: isExpired ? '#dc2626' : '#1e293b', fontWeight: isExpired ? 600 : 400 }}>
                  {editingId === member.id ? (
                    <input
                      style={{ ...s.inlineInput, maxWidth: 160 }}
                      type="date"
                      value={editExpiry}
                      onChange={(e) => setEditExpiry(e.target.value)}
                    />
                  ) : member.expiry_date ? (
                    <>
                      {new Date(member.expiry_date).toLocaleDateString(locale)}
                      {isExpired && <span style={{ marginLeft: 6, fontSize: 11 }}>{t('admin.members.expired')}</span>}
                    </>
                  ) : '—'}
                </td>
                <td style={s.td}>{new Date(member.created_at).toLocaleDateString(locale)}</td>
                <td style={s.td}>
                  {editingId === member.id ? (
                    <>
                      <button style={{ ...s.actionBtn, ...s.saveBtn }} onClick={() => saveEdit(member.id)}>{t('admin.members.save')}</button>
                      <button style={{ ...s.actionBtn, ...s.cancelBtn }} onClick={cancelEdit}>{t('common.cancel')}</button>
                    </>
                  ) : (
                    <>
                      <button style={{ ...s.actionBtn, ...s.qrBtn }} onClick={() => setQrMember(member)}>{t('admin.members.qrCode')}</button>
                      <button style={{ ...s.actionBtn, ...s.editBtn }} onClick={() => startEdit(member)}>{t('admin.members.edit')}</button>
                      <button style={{ ...s.actionBtn, ...s.deleteBtn }} onClick={() => setDeletingMember(member)}>{t('admin.members.remove')}</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showAddModal && (
        <AddMemberModal token={token} onAdded={handleAdded} onClose={() => setShowAddModal(false)} />
      )}
      {showImportModal && (
        <ImportModal token={token} onImported={handleImported} onClose={() => setShowImportModal(false)} />
      )}
      {deletingMember && (
        <DeletePinModal token={token} member={deletingMember} onDeleted={handleDeleted} onClose={() => setDeletingMember(null)} />
      )}
      {qrMember && (
        <QrCodeModal member={qrMember} onClose={() => setQrMember(null)} />
      )}
      {pendingRevealId && (
        <PhoneRevealModal
          token={token}
          onSuccess={() => { setRevealedPhoneId(pendingRevealId); setPendingRevealId(null); }}
          onClose={() => setPendingRevealId(null)}
        />
      )}
    </div>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

export default function AdminPage({ token, gymName, onBack }) {
  const [tab, setTab] = useState('attendance');
  const [showChangePin, setShowChangePin] = useState(false);
  const { t } = useTranslation();

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.headerTitle}>{gymName ?? t('admin.title')}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {t('admin.title')}
          </div>
        </div>
        <div style={s.headerRight}>
          <LanguageSwitcher variant="light" />
          <button style={s.changePinBtn} onClick={() => setShowChangePin(true)}>{t('admin.changePin')}</button>
          <button style={s.backBtn} onClick={onBack}>{t('admin.backToScanner')}</button>
        </div>
      </div>

      <div style={s.body}>
        <div style={s.tabs}>
          <button
            style={{ ...s.tab, ...(tab === 'attendance' ? s.tabActive : {}) }}
            onClick={() => setTab('attendance')}
          >
            {t('admin.tabs.attendance')}
          </button>
          <button
            style={{ ...s.tab, ...(tab === 'members' ? s.tabActive : {}) }}
            onClick={() => setTab('members')}
          >
            {t('admin.tabs.members')}
          </button>
          <button
            style={{ ...s.tab, ...(tab === 'staff' ? s.tabActive : {}) }}
            onClick={() => setTab('staff')}
          >
            {t('admin.tabs.staff')}
          </button>
        </div>

        {tab === 'attendance' && <AttendanceTab token={token} />}
        {tab === 'members' && <MembersTab token={token} />}
        {tab === 'staff' && <StaffTab token={token} />}
      </div>

      {showChangePin && (
        <ChangePinModal token={token} onClose={() => setShowChangePin(false)} />
      )}
    </div>
  );
}
