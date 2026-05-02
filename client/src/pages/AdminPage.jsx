import { useState, useEffect, useCallback, useRef } from 'react';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}
import QRCode from 'qrcode';
import {
  getAttendance, getMembers, addMember, updateMember,
  deleteMember, changePin, exportMembers, downloadTemplate,
  previewImport, confirmImport, getStaff, addStaff, removeStaff, verifyPin, changeStaffPassword,
  getPackages, createPackage, updatePackage, deletePackage, setDefaultPackage,
  addMemberWithPackage, getSettings, setVisitorPrice, setRegFeeRule, changeAdminPassword, getDashboard,
  getGroups, createGroup, updateGroup, deleteGroup, addGroupMember, removeGroupMember, renewGroup,
  setGymCode,
} from '../api/admin.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  headerTitle: { fontSize: 18, fontWeight: 700, fontFamily: 'Impact, Arial Black, sans-serif' },
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
  iconBtn: {
    width: 34,
    height: 34,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  body: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
  tabs: { display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' },
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
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  tabActive: { color: '#1a1a1a', borderBottomColor: '#BEFE00', fontWeight: 700 },
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
    background: '#BEFE00',
    color: '#1a1a1a',
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
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  tableWrap: { overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: 0 },
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
  badgeNew: { background: '#dbeafe', color: '#1d4ed8', marginLeft: 6 },
  fileInput: {
    display: 'block', width: '100%',
    padding: '10px 14px',
    border: '1.5px dashed #cbd5e1', borderRadius: 8,
    fontSize: 14, cursor: 'pointer', marginBottom: 14,
    boxSizing: 'border-box',
  },
  select: {
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0', borderRadius: 8,
    fontSize: 15, marginBottom: 14, outline: 'none',
    width: '100%', background: '#fff', boxSizing: 'border-box',
  },
  inlineSelect: {
    padding: '6px 10px',
    border: '1.5px solid #93c5fd', borderRadius: 6,
    fontSize: 14, outline: 'none', background: '#fff',
    maxWidth: 200,
  },
  expiryPreview: { fontSize: 12, color: '#64748b', marginTop: -10, marginBottom: 14 },
  defaultBadge: {
    display: 'inline-block', padding: '2px 8px',
    borderRadius: 99, fontSize: 11, fontWeight: 600,
    background: '#fef9c3', color: '#854d0e',
  },
  starBtn: { background: '#fefce8', color: '#ca8a04' },
  filterSelect: {
    padding: '4px 8px', border: '1.5px solid #e2e8f0',
    borderRadius: 6, fontSize: 13, background: '#fff', outline: 'none',
  },
  filterBtn: {
    padding: '6px 10px', fontSize: 13,
    border: '1.5px solid #e2e8f0', borderRadius: 6,
    background: '#fff', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4,
    whiteSpace: 'nowrap',
  },
  settingsMenuRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', padding: '14px 0', background: 'none', border: 'none',
    borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
    fontSize: 15, color: '#1e293b', textAlign: 'left',
  },
  // Business Dashboard
  statCard: {
    background: '#fff', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.07)', flex: 1, minWidth: 180,
  },
  statValue: { fontSize: 28, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.2 },
  statLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
  statSub:   { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 },
  cardRow: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 },
  chartCard: {
    background: '#fff', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: 24,
  },
  periodBtn: {
    padding: '7px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0',
    background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#475569',
  },
  periodBtnActive: { background: '#BEFE00', borderColor: '#BEFE00', color: '#1a1a1a' },
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

function RemoveGroupMemberPinModal({ token, group, member, onRemoved, onClose }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await removeGroupMember(token, group.id, member.id, pin);
      onRemoved(group.id, member.id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.groups.removeMemberTitle')}</div>
        <p style={{ fontSize: 14, color: '#475569', marginBottom: 16, marginTop: -8 }}>
          {t('admin.groups.removeMemberConfirm', { name: member.name })}
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
            {loading ? t('admin.delete.removing') : t('admin.members.remove')}
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
        phoneNumber: r.phoneNumber,
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

            <div style={{ ...s.tableWrap, marginBottom: 20 }}>
              <table style={{ ...s.table, minWidth: 620 }}>
                <thead>
                  <tr>
                    <th style={s.th}>{t('admin.import.colNum')}</th>
                    <th style={s.th}>{t('admin.import.colName')}</th>
                    <th style={s.th}>{t('admin.import.colGymId')}</th>
                    <th style={s.th}>{t('admin.import.colExpiry')}</th>
                    <th style={s.th}>{t('admin.import.colJoined')}</th>
                    <th style={s.th}>{t('admin.members.colPhone')}</th>
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
                      <td style={s.td}>{row.phoneNumber || <span style={{ color: '#94a3b8' }}>—</span>}</td>
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
                style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1, marginBottom: 10 }}
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
          <button style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
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

const calcExpiryFromDuration = (durationDays) => {
  const d = new Date();
  d.setDate(d.getDate() + durationDays);
  return d.toISOString().slice(0, 10);
};

const previewExtendExpiry = (currentExpiry, durationDays) => {
  const base = currentExpiry && new Date(currentExpiry) > new Date()
    ? new Date(currentExpiry)
    : new Date();
  base.setDate(base.getDate() + durationDays);
  return base.toISOString().slice(0, 10);
};

const formatPhoneDigits = (digits) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');

const maskPhone = (phone) => {
  if (!phone) return '—';
  const digits = phone.replace('+62', '');
  const visible = digits.slice(-3);
  return '+62' + '*'.repeat(Math.max(0, digits.length - 3)) + visible;
};

const defaultExpiryDate = () => calcExpiryFromDuration(30);

function AddMemberModal({ token, onAdded, onClose }) {
  const [name, setName] = useState('');
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [customExpiry, setCustomExpiry] = useState(defaultExpiryDate);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
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
  const regFeeTotal = !isCustom && selectedPkg?.has_registration_fee && selectedPkg?.registration_fee > 0
    ? (selectedPkg.price || 0) + selectedPkg.registration_fee
    : null;
  const fmtTotal = regFeeTotal != null ? `Rp ${Number(regFeeTotal).toLocaleString('id-ID')}` : null;

  const PHONE_RE = /^\+62\d{8,13}$/;
  const toDigits   = (full) => full.startsWith('+62') ? full.slice(3) : full;
  const fromDigits = (raw)  => { const d = raw.replace(/\D/g, ''); return d ? '+62' + d : ''; };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPhoneError('');
    if (phone && !PHONE_RE.test(phone)) {
      setPhoneError('Phone must start with +62 followed by 8–13 digits');
      return;
    }
    setLoading(true);
    try {
      const member = isCustom
        ? await addMember(token, name, customExpiry, phone || undefined)
        : await addMemberWithPackage(token, name, null, selectedPackageId, phone || undefined);
      onAdded(member);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const locale = 'en-US';

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
          <label style={s.modalLabel}>{t('admin.packages.packageLabel')}</label>
          <select style={s.select} value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.duration_days}d — Rp {Number(p.price).toLocaleString('id-ID')}
                {p.is_default ? ' ★' : ''}
              </option>
            ))}
            <option value="__custom__">{t('admin.packages.customDate')}</option>
          </select>
          {!isCustom && computedExpiry && (
            <div style={s.expiryPreview}>
              {t('admin.packages.expiresOn', { date: new Date(computedExpiry).toLocaleDateString(locale) })}
            </div>
          )}
          {regFeeTotal != null && (
            <div style={{ margin: '10px 0 4px', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#475569' }}>
                <span>{t('admin.packages.packageLabel')}</span>
                <span>Rp {Number(selectedPkg.price).toLocaleString('id-ID')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#475569' }}>
                <span>{t('admin.packages.registrationFee')}</span>
                <span>+Rp {Number(selectedPkg.registration_fee).toLocaleString('id-ID')}</span>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1e293b' }}>
                <span>{t('admin.packages.totalLabel')}</span>
                <span>{fmtTotal}</span>
              </div>
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, color: '#1e40af', fontSize: 12 }}>
                ℹ️ {t('admin.packages.collectReminder', { amount: fmtTotal })}
              </div>
            </div>
          )}
          {isCustom && (
            <>
              <label style={s.modalLabel}>{t('admin.add.expiryLabel')}</label>
              <input style={s.modalInput} type="date"
                value={customExpiry} onChange={(e) => setCustomExpiry(e.target.value)}
                required />
            </>
          )}
          <label style={s.modalLabel}>
            {t('admin.add.phoneLabel')} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({t('admin.add.phoneOptional')})</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <span style={{ ...s.modalInput, width: 'auto', borderRight: 'none', borderRadius: '4px 0 0 4px',
                           background: '#f1f5f9', color: '#64748b', padding: '0 10px',
                           display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              +62
            </span>
            <input
              style={{ ...s.modalInput, borderRadius: '0 4px 4px 0', flex: 1, borderLeft: 'none' }}
              type="tel"
              value={toDigits(phone)}
              onChange={(e) => setPhone(fromDigits(e.target.value))}
              placeholder="81234567890"
            />
          </div>
          {phoneError && <div style={{ ...s.error, marginBottom: 8 }}>{phoneError}</div>}
          <button style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
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
          <button style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
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
            style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
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

      <div style={{ ...s.tableWrap }}>
      <table style={{ ...s.table, minWidth: 480 }}>
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
      </div>

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
  const [memberCount, setMemberCount] = useState(0);
  const [visitorCount, setVisitorCount] = useState(0);
  const [visitorFilter, setVisitorFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { lang, t } = useTranslation();

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const data = await getAttendance(token, { date, search: search || undefined });
      setRows(data.records);
      setMemberCount(data.memberCount);
      setVisitorCount(data.visitorCount);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, date, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (date !== today) return;
    const id = setInterval(() => load({ silent: true }), 10_000);
    return () => clearInterval(id);
  }, [date, today, load]);

  const filteredRows = rows.filter((row) => {
    if (visitorFilter === 'members') return !row.is_visitor;
    if (visitorFilter === 'visitors') return row.is_visitor;
    return true;
  });

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

      {/* Daily summary counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: t('admin.attendance.memberCount'), value: memberCount, accent: '#BEFE00', bg: '#f7ffe0', iconBg: '#e9ffa0', icon: '👤' },
          { label: t('admin.attendance.visitorCount'), value: visitorCount, accent: '#f59e0b', bg: '#fffbeb', iconBg: '#fde68a', icon: '🚶' },
          { label: t('admin.attendance.totalToday'),  value: memberCount + visitorCount, accent: '#BEFE00', bg: '#f7ffe0', iconBg: '#e9ffa0', icon: '📊' },
        ].map(({ label, value, accent, bg, iconBg, icon }) => (
          <div key={label} style={{
            background: bg,
            border: `1.5px solid ${accent}22`,
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {['all', 'members', 'visitors'].map((f) => (
          <button
            key={f}
            style={{
              ...s.actionBtn,
              padding: '5px 16px',
              background: visitorFilter === f ? '#BEFE00' : '#fff',
              color: visitorFilter === f ? '#1a1a1a' : '#475569',
              border: '1.5px solid',
              borderColor: visitorFilter === f ? '#BEFE00' : '#e2e8f0',
            }}
            onClick={() => setVisitorFilter(f)}
          >
            {t(`admin.attendance.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
          </button>
        ))}
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={{ ...s.tableWrap }}>
      <table style={{ ...s.table, minWidth: 500 }}>
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
          ) : filteredRows.length === 0 ? (
            <tr><td colSpan={3} style={s.empty}>{t('admin.attendance.noRecords')}</td></tr>
          ) : filteredRows.map((row, i) => {
            const isNew = !row.is_visitor && row.member_created_at && (new Date() - new Date(row.member_created_at) < 7 * 24 * 60 * 60 * 1000);
            return (
              <tr key={i}>
                <td style={s.td}>
                  {row.member_name}
                  {isNew && <span style={{ ...s.badge, ...s.badgeNew }}>{t('admin.attendance.badgeNew')}</span>}
                  {row.is_visitor && (
                    <span style={{ ...s.badge, background: '#fef9c3', color: '#854d0e', marginLeft: 6 }}>
                      {t('admin.attendance.badgeWalkIn')}
                    </span>
                  )}
                </td>
                <td style={s.tdMono}>{row.gym_id}</td>
                <td style={s.td}>
                  {new Date(row.checked_in_at).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { hour12: false })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ─── Group Modals ─────────────────────────────────────────────────────────────

function CreateGroupModal({ token, groupPackages, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [packageId, setPackageId] = useState(groupPackages[0]?.id || '');
  const [members, setMembers] = useState([{ name: '', phoneNumber: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const PHONE_RE = /^\+62\d{8,13}$/;
  const toDigits   = (full) => full.startsWith('+62') ? full.slice(3) : full;
  const fromDigits = (raw)  => { const d = raw.replace(/\D/g, ''); return d ? '+62' + d : ''; };

  const updateMember = (i, field, value) => {
    setMembers((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  const addRow = () => setMembers((prev) => [...prev, { name: '', phoneNumber: '' }]);
  const removeRow = (i) => setMembers((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    for (const m of members) {
      if (!m.name.trim()) { setError('Each member must have a name'); return; }
      if (m.phoneNumber && !PHONE_RE.test(m.phoneNumber)) {
        setError(`Invalid phone for ${m.name}. Use +62 format.`);
        return;
      }
    }
    setLoading(true);
    try {
      const group = await createGroup(token, { name, packageId, members });
      onCreated(group);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedPkg = groupPackages.find((p) => p.id === packageId);

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 440 }}>
        <div style={s.modalTitle}>{t('admin.groups.createTitle')}</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.groups.groupNameLabel')}</label>
          <input style={s.modalInput} type="text" value={name}
            onChange={(e) => setName(e.target.value)} placeholder={t('admin.groups.groupNamePlaceholder')} required autoFocus />
          <label style={s.modalLabel}>{t('admin.packages.packageLabel')}</label>
          <select style={s.select} value={packageId} onChange={(e) => setPackageId(e.target.value)} required>
            {groupPackages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.duration_days}d — Rp {Number(p.price).toLocaleString('id-ID')}
              </option>
            ))}
          </select>
          {selectedPkg && (
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              {t('admin.groups.expiresInfo', {
                date: calcExpiryFromDuration(selectedPkg.duration_days),
                amount: Number(selectedPkg.price).toLocaleString('id-ID'),
              })}
            </div>
          )}
          <label style={{ ...s.modalLabel, marginTop: 12 }}>{t('admin.groups.membersLabel')}</label>
          {members.map((m, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{t('admin.groups.memberN', { n: i + 1 })}</span>
                {members.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)}
                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                    {t('admin.members.remove')}
                  </button>
                )}
              </div>
              <input style={{ ...s.modalInput, marginBottom: 6 }} type="text" value={m.name}
                onChange={(e) => updateMember(i, 'name', e.target.value)}
                placeholder={t('admin.add.namePlaceholder')} required />
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <span style={{ ...s.modalInput, width: 'auto', borderRight: 'none', borderRadius: '4px 0 0 4px',
                               background: '#f1f5f9', color: '#64748b', padding: '0 10px',
                               display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', fontSize: 13 }}>
                  +62
                </span>
                <input style={{ ...s.modalInput, borderRadius: '0 4px 4px 0', flex: 1, borderLeft: 'none' }}
                  type="tel" value={toDigits(m.phoneNumber)}
                  onChange={(e) => updateMember(i, 'phoneNumber', fromDigits(e.target.value))}
                  placeholder={t('admin.groups.phonePlaceholder')} />
              </div>
            </div>
          ))}
          <button type="button" onClick={addRow}
            style={{ ...s.outlineBtn, width: '100%', marginBottom: 12, fontSize: 13 }}>
            {t('admin.groups.addAnotherMember')}
          </button>
          <button style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading || !name.trim() || !packageId}>
            {loading ? t('admin.groups.creating') : t('admin.groups.createGroup')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

function EditGroupModal({ token, group, groupPackages, onUpdated, onClose }) {
  const [name, setName] = useState(group.name);
  const [packageId, setPackageId] = useState(group.package_id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const updated = await updateGroup(token, group.id, { name, packageId });
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.groups.editTitle')}</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.groups.groupNameLabel')}</label>
          <input style={s.modalInput} type="text" value={name}
            onChange={(e) => setName(e.target.value)} required autoFocus />
          <label style={s.modalLabel}>{t('admin.packages.packageLabel')}</label>
          <select style={s.select} value={packageId} onChange={(e) => setPackageId(e.target.value)} required>
            {groupPackages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.duration_days}d — Rp {Number(p.price).toLocaleString('id-ID')}
              </option>
            ))}
          </select>
          <button style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading || !name.trim()}>
            {loading ? t('admin.groups.saving') : t('admin.groups.saveChanges')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

function AddGroupMemberModal({ token, group, onAdded, onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const PHONE_RE = /^\+62\d{8,13}$/;
  const toDigits   = (full) => full.startsWith('+62') ? full.slice(3) : full;
  const fromDigits = (raw)  => { const d = raw.replace(/\D/g, ''); return d ? '+62' + d : ''; };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (phone && !PHONE_RE.test(phone)) {
      setError('Phone must start with +62 followed by 8–13 digits');
      return;
    }
    setLoading(true);
    try {
      const member = await addGroupMember(token, group.id, { name, phoneNumber: phone || undefined });
      onAdded(member);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.groups.addMemberTitle', { groupName: group.name })}</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.add.nameLabel')}</label>
          <input style={s.modalInput} type="text" value={name}
            onChange={(e) => setName(e.target.value)} placeholder={t('admin.add.namePlaceholder')} required autoFocus />
          <label style={s.modalLabel}>
            {t('admin.add.phoneLabel')} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({t('admin.add.phoneOptional')})</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <span style={{ ...s.modalInput, width: 'auto', borderRight: 'none', borderRadius: '4px 0 0 4px',
                           background: '#f1f5f9', color: '#64748b', padding: '0 10px',
                           display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              +62
            </span>
            <input style={{ ...s.modalInput, borderRadius: '0 4px 4px 0', flex: 1, borderLeft: 'none' }}
              type="tel" value={toDigits(phone)}
              onChange={(e) => setPhone(fromDigits(e.target.value))}
              placeholder="81234567890" />
          </div>
          <button style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading || !name.trim()}>
            {loading ? t('admin.groups.adding') : t('admin.groups.addMemberSubmit')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

function RenewGroupModal({ token, group, groupPackages, onRenewed, onClose }) {
  const [packageId, setPackageId] = useState(group.package_id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const selectedPkg = groupPackages.find((p) => p.id === packageId);
  const newExpiry = selectedPkg ? previewExtendExpiry(group.expiry_date, selectedPkg.duration_days) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await renewGroup(token, group.id, packageId);
      onRenewed(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.groups.renewTitle', { groupName: group.name })}</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            {t('admin.groups.currentExpiry')} <strong>{group.expiry_date ? new Date(group.expiry_date).toLocaleDateString() : '—'}</strong>
          </div>
          <label style={s.modalLabel}>{t('admin.packages.packageLabel')}</label>
          <select style={s.select} value={packageId} onChange={(e) => setPackageId(e.target.value)} required>
            {groupPackages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.duration_days}d — Rp {Number(p.price).toLocaleString('id-ID')}
              </option>
            ))}
          </select>
          {newExpiry && (
            <div style={s.expiryPreview}>
              {t('admin.groups.newExpiry', { date: new Date(newExpiry).toLocaleDateString() })}
            </div>
          )}
          {selectedPkg && (
            <div style={{ fontSize: 13, color: '#475569', margin: '8px 0 12px',
                          padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {t('admin.groups.renewTotal', {
                amount: Number(selectedPkg.price).toLocaleString('id-ID'),
                count: group.members?.length ?? 0,
              })}
            </div>
          )}
          <button style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading || !packageId}>
            {loading ? t('admin.groups.renewing') : t('admin.groups.renewGroup')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Group Member Warning Modal ────────────────────────────────────────────────

function ConfirmModal({ title, body, confirmLabel, onConfirm, onClose }) {
  const { t } = useTranslation();
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0 16px' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', width: '100%', maxWidth: 420 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{title}</h3>
        <p style={{ margin: '0 0 22px', fontSize: 14, color: '#475569', lineHeight: 1.55 }}>{body}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            {t('admin.cancel')}
          </button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupMemberWarningModal({ member, action, onConfirm, onClose }) {
  const { t } = useTranslation();
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0 16px' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', width: '100%', maxWidth: 420 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
          {t('admin.groups.memberWarningTitle')}
        </h3>
        <p style={{ margin: '0 0 22px', fontSize: 14, color: '#475569', lineHeight: 1.55 }}>
          {t('admin.groups.memberWarningBody', { groupName: member.group_name })}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
          >
            {t('admin.cancel')}
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: action === 'remove' ? '#ef4444' : '#3b82f6', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
          >
            {action === 'remove' ? t('admin.groups.memberWarningRemoveBtn') : t('admin.groups.memberWarningEditBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({ token, gymSettings }) {
  const [members, setMembers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatuses,   setFilterStatuses]   = useState([]);
  const [filterPackageIds, setFilterPackageIds] = useState([]);
  const [filterNewOnly,    setFilterNewOnly]    = useState(false);
  const [showFilters,      setShowFilters]      = useState(false);
  const [openDropdown,     setOpenDropdown]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editPackageId, setEditPackageId] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [revealedPhoneId, setRevealedPhoneId] = useState(null);
  const [pendingRevealId, setPendingRevealId] = useState(null);
  const [sortBy, setSortBy]           = useState('scan_token');
  const [sortOrder, setSortOrder]     = useState('asc');
  const [offset, setOffset]           = useState(0);
  const [hasMore, setHasMore]         = useState(false);
  const [total, setTotal]             = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deletingMember, setDeletingMember] = useState(null);
  const [qrMember, setQrMember] = useState(null);
  const [managingMemberId, setManagingMemberId] = useState(null);
  const [extendingMember, setExtendingMember] = useState(null);
  const [extendPackageId, setExtendPackageId] = useState('');
  const [extendLoading, setExtendLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [addMemberGroup, setAddMemberGroup] = useState(null);
  const [renewingGroup, setRenewingGroup] = useState(null);
  const [groupWarning, setGroupWarning] = useState(null);
  const [editDetachMemberId, setEditDetachMemberId] = useState(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(null);   // group object
  const [confirmRemoveGroupMember, setConfirmRemoveGroupMember] = useState(null); // { group, member }
  const { lang, t } = useTranslation();

  const PAGE_SIZE = 20;

  const filterStatusesKey   = filterStatuses.join(',');
  const filterPackageIdsKey = filterPackageIds.join(',');
  const toggleStatus  = (val) => setFilterStatuses(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  const togglePackage = (val) => setFilterPackageIds(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMembers(token, {
        search: search || undefined,
        limit: PAGE_SIZE, offset: 0,
        sort: sortBy, order: sortOrder,
        statuses:   filterStatuses,
        packageIds: filterPackageIds,
        newOnly:    filterNewOnly ? 'true' : undefined,
      });
      setMembers(data.members);
      setTotal(data.total);
      setOffset(data.members.length);
      setHasMore(data.members.length < data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, search, sortBy, sortOrder, filterStatusesKey, filterPackageIdsKey, filterNewOnly]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getPackages(token).then(setPackages).catch(() => {});
  }, [token]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const data = await getGroups(token);
      setGroups(data);
    } catch (_) {
      // non-fatal
    } finally {
      setGroupsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await getMembers(token, {
        search: search || undefined,
        limit: PAGE_SIZE, offset,
        sort: sortBy, order: sortOrder,
        statuses:   filterStatuses,
        packageIds: filterPackageIds,
        newOnly:    filterNewOnly ? 'true' : undefined,
      });
      setMembers(prev => [...prev, ...data.members]);
      const newOffset = offset + data.members.length;
      setOffset(newOffset);
      setTotal(data.total);
      setHasMore(newOffset < data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSort = (col) => {
    if (col === sortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const startEdit = (member) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditExpiry(member.expiry_date ? member.expiry_date.slice(0, 10) : '');
    setEditPackageId(member.package_id || '__custom__');
    const rawPhone = member.phone_number || '';
    const digits = rawPhone.replace(/\D/g, '');
    const normalizedPhone = digits
      ? (digits.startsWith('62') ? '+62' + digits.slice(2)
        : digits.startsWith('0') ? '+62' + digits.slice(1)
        : '+62' + digits)
      : '';
    setEditPhone(normalizedPhone);
  };

  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditExpiry(''); setEditPackageId(''); setEditPhone(''); };

  const MEMBER_PHONE_RE = /^\+62\d{8,13}$/;
  const toDigits   = (full) => full.startsWith('+62') ? full.slice(3) : full;
  const fromDigits = (raw)  => { const d = raw.replace(/\D/g, ''); return d ? '+62' + d : ''; };

  const saveEdit = async (id) => {
    if (editPhone && !MEMBER_PHONE_RE.test(editPhone)) {
      setError('Phone must start with +62 followed by 8–13 digits');
      return;
    }
    try {
      const isCustom = editPackageId === '__custom__';
      const shouldDetach = editDetachMemberId === id;
      const updated = await updateMember(
        token, id, editName,
        isCustom ? editExpiry : null,
        isCustom ? null : editPackageId,
        editPhone || undefined,
        shouldDetach,
      );
      if (shouldDetach) {
        setEditDetachMemberId(null);
        loadGroups();
      }
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

  const handleAdded = () => { setShowAddModal(false); load(); };

  const handleImported = () => { setShowImportModal(false); load(); };

  const handleExtend = async () => {
    if (!extendPackageId) return setError(t('admin.members.extendSelectPackage'));
    setExtendLoading(true);
    try {
      const updated = await updateMember(token, extendingMember.id, extendingMember.name, null, extendPackageId, undefined);
      setMembers((prev) => prev.map((m) => m.id === extendingMember.id ? updated : m));
      setExtendingMember(null);
      setExtendPackageId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setExtendLoading(false);
    }
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
  const activeFilterCount = (filterStatuses.length > 0 ? 1 : 0) + (filterPackageIds.length > 0 ? 1 : 0) + (filterNewOnly ? 1 : 0);
  const statusLabel = filterStatuses.length === 0
    ? t('admin.members.filterStatusAll')
    : filterStatuses.length === 1
      ? (filterStatuses[0] === 'active' ? t('admin.members.filterStatusActive') : t('admin.members.filterStatusExpired'))
      : t('admin.members.filterCountSelected', { n: 2 });
  const packageLabel = filterPackageIds.length === 0
    ? t('admin.members.filterPackageAll')
    : filterPackageIds.length === 1
      ? (filterPackageIds[0] === 'none' ? t('admin.members.filterPackageNone') : (packages.find((p) => p.id === filterPackageIds[0])?.name ?? '?'))
      : t('admin.members.filterCountSelected', { n: filterPackageIds.length });

  const groupPackages = packages.filter((p) => p.is_group);

  return (
    <div>
      {/* ── Groups section — only shown when group packages exist or groups already exist ── */}
      {(groupPackages.length > 0 || groups.length > 0) && <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            {t('admin.groups.sectionTitle')}
            {groups.length > 0 && (
              <span style={{ ...s.badge, background: '#ede9fe', color: '#6d28d9' }}>{groups.length}</span>
            )}
          </div>
          <button style={s.addBtn} onClick={() => setShowCreateGroup(true)} disabled={groupPackages.length === 0}
            title={groupPackages.length === 0 ? t('admin.groups.newGroupHint') : ''}>
            {t('admin.groups.newGroup')}
          </button>
        </div>
        {groupsLoading ? (
          <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>{t('admin.groups.loading')}</div>
        ) : groups.length === 0 ? (
          <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>
            {t('admin.groups.empty')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groups.map((group) => {
              const isExpanded = expandedGroupId === group.id;
              const isExpired = group.expiry_date && new Date(group.expiry_date) < new Date();
              return (
                <div key={group.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Group header */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer',
                             background: isExpanded ? '#f8fafc' : '#fff', userSelect: 'none' }}
                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                  >
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{isExpanded ? '▼' : '▶'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{group.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {group.package_name} · {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                        {' · '}
                        <span style={{ color: isExpired ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                          {group.expiry_date
                            ? t('admin.groups.expiry', { date: new Date(group.expiry_date).toLocaleDateString() })
                            : t('admin.groups.noExpiry')}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <button style={{ ...s.actionBtn, ...s.editBtn, fontSize: 12 }} onClick={() => setEditingGroup(group)}>{t('admin.members.edit')}</button>
                      <button style={{ ...s.actionBtn, ...s.saveBtn, fontSize: 12 }} onClick={() => setRenewingGroup(group)}>{t('admin.groups.renew')}</button>
                      <button style={{ ...s.actionBtn, ...s.editBtn, fontSize: 12 }} onClick={() => setAddMemberGroup(group)}>{t('admin.groups.addMemberBtn')}</button>
                      <button style={{ ...s.actionBtn, ...s.deleteBtn, fontSize: 12 }} onClick={() => setConfirmDeleteGroup(group)}>{t('admin.groups.delete')}</button>
                    </div>
                  </div>
                  {/* Expanded member list */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '10px 16px', background: '#fafbfc' }}>
                      {group.members.length === 0 ? (
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>{t('admin.groups.noMembers')}</div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th style={{ ...s.th, fontWeight: 600, textAlign: 'left', padding: '4px 8px' }}>{t('admin.members.colName')}</th>
                              <th style={{ ...s.th, fontWeight: 600, textAlign: 'left', padding: '4px 8px' }}>{t('admin.groups.colScanToken')}</th>
                              <th style={{ ...s.th, fontWeight: 600, textAlign: 'left', padding: '4px 8px' }}>{t('admin.members.colPhone')}</th>
                              <th style={{ ...s.th, padding: '4px 8px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.members.map((m) => (
                              <tr key={m.id}>
                                <td style={{ padding: '5px 8px', color: '#1e293b' }}>{m.name}</td>
                                <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#6d28d9' }}>{m.scan_token}</td>
                                <td style={{ padding: '5px 8px', color: '#64748b' }}>{m.phone_number || '—'}</td>
                                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                                  <button style={{ ...s.actionBtn, ...s.deleteBtn, fontSize: 11 }} onClick={() => setConfirmRemoveGroupMember({ group, member: m })}>{t('admin.members.remove')}</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>}

      <div style={s.toolbar}>
        <input
          style={s.searchInput}
          type="text"
          placeholder={t('admin.members.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          style={{ ...s.outlineBtn, ...(showFilters || activeFilterCount > 0 ? { background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' } : {}) }}
          onClick={() => setShowFilters(v => !v)}
        >
          {t('admin.members.filters')}
          {activeFilterCount > 0 && <span style={{ ...s.badge, ...s.badgeNew, marginLeft: 6 }}>{activeFilterCount}</span>}
        </button>
        <button style={s.outlineBtn} onClick={handleTemplate}>{t('admin.members.template')}</button>
        <button style={s.outlineBtn} onClick={handleExport}>{t('admin.members.export')}</button>
        <button style={s.outlineBtn} onClick={() => setShowImportModal(true)}>{t('admin.members.import')}</button>
        <button style={s.addBtn} onClick={() => setShowAddModal(true)}>{t('admin.members.addMember')}</button>
      </div>

      {showFilters && (
        <>
          {openDropdown && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpenDropdown(null)} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 0 14px', borderBottom: '1px solid #f1f5f9' }}>

            {/* Status dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                style={{ ...s.filterBtn, ...(filterStatuses.length > 0 ? { borderColor: '#93c5fd', background: '#eff6ff', color: '#1d4ed8' } : {}) }}
                onClick={() => setOpenDropdown((d) => d === 'status' ? null : 'status')}
              >
                {t('admin.members.filterStatus')}: {statusLabel} ▾
              </button>
              {openDropdown === 'status' && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 0', minWidth: 160 }}>
                  {[
                    { value: 'active',  label: t('admin.members.filterStatusActive') },
                    { value: 'expired', label: t('admin.members.filterStatusExpired') },
                  ].map(({ value, label }) => (
                    <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', userSelect: 'none' }}>
                      <input type="checkbox" checked={filterStatuses.includes(value)} onChange={() => toggleStatus(value)} />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Package dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                style={{ ...s.filterBtn, ...(filterPackageIds.length > 0 ? { borderColor: '#93c5fd', background: '#eff6ff', color: '#1d4ed8' } : {}) }}
                onClick={() => setOpenDropdown((d) => d === 'package' ? null : 'package')}
              >
                {t('admin.members.filterPackage')}: {packageLabel} ▾
              </button>
              {openDropdown === 'package' && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 0', minWidth: 160 }}>
                  {[{ value: 'none', label: t('admin.members.filterPackageNone') }, ...packages.map((p) => ({ value: p.id, label: p.name }))].map(({ value, label }) => (
                    <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', userSelect: 'none' }}>
                      <input type="checkbox" checked={filterPackageIds.includes(value)} onChange={() => togglePackage(value)} />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* New only checkbox */}
            <label style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={filterNewOnly} onChange={(e) => setFilterNewOnly(e.target.checked)} />
              {t('admin.members.filterNewOnly')}
            </label>

            {activeFilterCount > 0 && (
              <button
                style={{ ...s.actionBtn, ...s.cancelBtn }}
                onClick={() => { setFilterStatuses([]); setFilterPackageIds([]); setFilterNewOnly(false); }}
              >
                {t('admin.members.clearFilters')}
              </button>
            )}
          </div>
        </>
      )}

      {error && <div style={s.error}>{error}</div>}

      <div style={{ ...s.tableWrap }}>
      <table style={{ ...s.table, minWidth: 900 }}>
        <thead>
          <tr>
            {[
              { col: 'name',         label: t('admin.members.colName') },
              { col: 'scan_token',   label: t('admin.members.colGymId') },
              { col: 'package_name', label: t('admin.members.colPackage') },
            ].map(({ col, label }) => {
              const active = sortBy === col;
              const arrow = active ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ' ↕';
              return (
                <th key={col} style={{ ...s.th, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(col)}>
                  {label}{arrow}
                </th>
              );
            })}
            <th style={s.th}>{t('admin.members.colPhone')}</th>
            {[
              { col: 'expiry_date', label: t('admin.members.colExpiry') },
              { col: 'created_at',  label: t('admin.members.colJoined') },
            ].map(({ col, label }) => {
              const active = sortBy === col;
              const arrow = active ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ' ↕';
              return (
                <th key={col} style={{ ...s.th, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(col)}>
                  {label}{arrow}
                </th>
              );
            })}
            <th style={s.th}>{t('admin.members.colActions')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} style={s.empty}>{t('common.loading')}</td></tr>
          ) : members.length === 0 ? (
            <tr><td colSpan={7} style={s.empty}>{t('admin.members.noMembers')}</td></tr>
          ) : members.map((member) => {
            const isExpired = member.expiry_date && new Date(member.expiry_date) < new Date();
            const isNew = new Date() - new Date(member.created_at) < 7 * 24 * 60 * 60 * 1000;
            const isEditingThis = editingId === member.id;
            const editPkgIsCustom = editPackageId === '__custom__';
            const editSelectedPkg = packages.find((p) => p.id === editPackageId);
            const editComputedExpiry = editSelectedPkg
              ? calcExpiryFromDuration(editSelectedPkg.duration_days)
              : null;
            return (
              <tr key={member.id}>
                <td style={s.td}>
                  {isEditingThis ? (
                    <input
                      style={s.inlineInput}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(member.id); if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus
                    />
                  ) : (
                    <>
                      {member.name}
                      {isNew && <span style={{ ...s.badge, ...s.badgeNew }}>New</span>}
                    </>
                  )}
                </td>
                <td style={s.tdMono}>{member.scan_token}</td>
                <td style={s.td}>
                  {isEditingThis ? (
                    <select style={s.inlineSelect} value={editPackageId} onChange={(e) => setEditPackageId(e.target.value)}>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                      <option value="__custom__">{t('admin.packages.customDate')}</option>
                    </select>
                  ) : member.package_name || '—'}
                </td>
                <td style={s.td}>
                  {isEditingThis ? (
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <span style={{ ...s.inlineInput, width: 'auto', borderRight: 'none',
                                     borderRadius: '4px 0 0 4px', background: '#f1f5f9',
                                     color: '#64748b', padding: '0 8px', display: 'flex',
                                     alignItems: 'center', whiteSpace: 'nowrap', fontSize: 14,
                                     minHeight: 36 }}>
                        +62
                      </span>
                      <input
                        style={{ ...s.inlineInput, borderRadius: '0 4px 4px 0', maxWidth: 220, minWidth: 100, borderLeft: 'none', minHeight: 36 }}
                        type="tel"
                        value={toDigits(editPhone)}
                        onChange={(e) => setEditPhone(fromDigits(e.target.value))}
                        placeholder="81234567890"
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
                  {isEditingThis ? (
                    editPkgIsCustom ? (
                      <input
                        style={{ ...s.inlineInput, maxWidth: 160 }}
                        type="date"
                        value={editExpiry}
                        onChange={(e) => setEditExpiry(e.target.value)}
                      />
                    ) : (
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {editComputedExpiry ? new Date(editComputedExpiry).toLocaleDateString(locale) : '—'}
                      </span>
                    )
                  ) : member.expiry_date ? (
                    <>
                      {new Date(member.expiry_date).toLocaleDateString(locale)}
                      {isExpired && <span style={{ marginLeft: 6, fontSize: 11 }}>{t('admin.members.expired')}</span>}
                    </>
                  ) : '—'}
                </td>
                <td style={s.td}>{new Date(member.created_at).toLocaleDateString(locale)}</td>
                <td style={s.td}>
                  {isEditingThis ? (
                    <>
                      <button style={{ ...s.actionBtn, ...s.saveBtn }} onClick={() => saveEdit(member.id)}>{t('admin.members.save')}</button>
                      <button style={{ ...s.actionBtn, ...s.cancelBtn }} onClick={cancelEdit}>{t('common.cancel')}</button>
                    </>
                  ) : (
                    <>
                      <button style={{ ...s.actionBtn, ...s.qrBtn }} onClick={() => setQrMember(member)}>{t('admin.members.qrCode')}</button>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          style={{ ...s.actionBtn, ...s.editBtn }}
                          onClick={() => setManagingMemberId((prev) => prev === member.id ? null : member.id)}
                        >
                          {t('admin.members.manage')} ▾
                        </button>
                        {managingMemberId === member.id && (
                          <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setManagingMemberId(null)} />
                            <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 180, overflow: 'hidden' }}>
                              <button
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1e293b' }}
                                onClick={() => {
                                  if (member.group_id) {
                                    setGroupWarning({ member, action: 'edit' });
                                  } else {
                                    startEdit(member);
                                  }
                                  setManagingMemberId(null);
                                }}
                              >
                                {t('admin.members.edit')}
                              </button>
                              <button
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1e293b', borderTop: '1px solid #f1f5f9' }}
                                onClick={() => { setExtendingMember(member); setExtendPackageId(''); setManagingMemberId(null); }}
                              >
                                {t('admin.members.extend')}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <button style={{ ...s.actionBtn, ...s.deleteBtn }} onClick={() => {
                        if (member.group_id) {
                          setGroupWarning({ member, action: 'remove' });
                        } else {
                          setDeletingMember(member);
                        }
                      }}>{t('admin.members.remove')}</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {hasMore && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '10px 0' }}>
                <button
                  style={{ ...s.actionBtn, padding: '6px 20px', background: '#e2e8f0', color: '#475569' }}
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? t('common.loading') : `Load More (${total - offset} remaining)`}
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

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
      {extendingMember && (() => {
        const extPkg = packages.find((p) => p.id === extendPackageId);
        const extNewExpiry = extPkg ? previewExtendExpiry(extendingMember.expiry_date, extPkg.duration_days) : null;
        const expiredMonths = (() => {
          if (!extendingMember.expiry_date) return Infinity;
          const diffMs = Date.now() - new Date(extendingMember.expiry_date).getTime();
          return diffMs / (1000 * 60 * 60 * 24 * 30.44);
        })();
        const shouldChargeRegFee =
          extPkg?.has_registration_fee &&
          extPkg?.registration_fee > 0 &&
          gymSettings?.regFeeRuleEnabled === true &&
          expiredMonths > (gymSettings?.regFeeGraceMonths ?? 0);
        const extTotal = shouldChargeRegFee ? extPkg.price + extPkg.registration_fee : null;
        return (
          <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setExtendingMember(null)}>
            <div style={{ ...s.modal, maxWidth: 400 }}>
              <div style={s.modalTitle}>{t('admin.members.extendTitle')}</div>
              <div style={{ fontSize: 14, color: '#475569', marginBottom: 16, marginTop: -8 }}>{extendingMember.name}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                {t('admin.members.extendCurrentExpiry')}: <strong style={{ color: '#1e293b' }}>
                  {extendingMember.expiry_date ? new Date(extendingMember.expiry_date).toLocaleDateString() : t('admin.members.extendNoExpiry')}
                </strong>
              </div>
              {error && <div style={s.error}>{error}</div>}
              <label style={s.modalLabel}>{t('admin.packages.packageLabel')}</label>
              <select style={s.select} value={extendPackageId} onChange={(e) => { setExtendPackageId(e.target.value); setError(''); }}>
                <option value="">{t('admin.members.extendSelectPackage')}</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.duration_days}d — Rp {Number(p.price).toLocaleString('id-ID')}
                  </option>
                ))}
              </select>
              {extPkg && extNewExpiry && (
                <div style={{ margin: '10px 0 4px', padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#15803d' }}>
                  {t('admin.members.extendNewExpiry')}: <strong>{new Date(extNewExpiry).toLocaleDateString()}</strong>
                  <span style={{ color: '#64748b', marginLeft: 8 }}>({extPkg.duration_days}d)</span>
                </div>
              )}
              {extPkg && extTotal != null && (
                <div style={{ margin: '10px 0 4px', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#475569' }}>
                    <span>{t('admin.packages.packageLabel')}</span>
                    <span>Rp {Number(extPkg.price).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#475569' }}>
                    <span>{t('admin.packages.registrationFee')}</span>
                    <span>+Rp {Number(extPkg.registration_fee).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1e293b' }}>
                    <span>{t('admin.packages.totalLabel')}</span>
                    <span>Rp {Number(extTotal).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, color: '#1e40af', fontSize: 12 }}>
                    {t('admin.packages.collectReminder', { amount: `Rp ${Number(extTotal).toLocaleString('id-ID')}` })}
                  </div>
                </div>
              )}
              {extPkg && extTotal == null && extPkg.price > 0 && (
                <div style={{ margin: '10px 0 4px', padding: '8px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, color: '#1e40af' }}>
                  {t('admin.packages.collectReminder', { amount: `Rp ${Number(extPkg.price).toLocaleString('id-ID')}` })}
                </div>
              )}
              <button
                style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: (!extendPackageId || extendLoading) ? 0.6 : 1, marginTop: 16 }}
                onClick={handleExtend}
                disabled={!extendPackageId || extendLoading}
              >
                {extendLoading ? t('admin.members.extendConfirming') : t('admin.members.extendConfirm')}
              </button>
              <button
                style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
                onClick={() => { setExtendingMember(null); setExtendPackageId(''); setError(''); }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        );
      })()}
      {pendingRevealId && (
        <PhoneRevealModal
          token={token}
          onSuccess={() => { setRevealedPhoneId(pendingRevealId); setPendingRevealId(null); }}
          onClose={() => setPendingRevealId(null)}
        />
      )}

      {showCreateGroup && groupPackages.length > 0 && (
        <CreateGroupModal
          token={token}
          groupPackages={groupPackages}
          onCreated={(group) => { setGroups((prev) => [group, ...prev]); setShowCreateGroup(false); }}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
      {editingGroup && (
        <EditGroupModal
          token={token}
          group={editingGroup}
          groupPackages={groupPackages}
          onUpdated={(updated) => {
            setGroups((prev) => prev.map((g) => g.id === updated.id ? { ...g, ...updated } : g));
            setEditingGroup(null);
          }}
          onClose={() => setEditingGroup(null)}
        />
      )}
      {addMemberGroup && (
        <AddGroupMemberModal
          token={token}
          group={addMemberGroup}
          onAdded={(member) => {
            setGroups((prev) => prev.map((g) =>
              g.id === addMemberGroup.id ? { ...g, members: [...g.members, member] } : g
            ));
            setAddMemberGroup(null);
          }}
          onClose={() => setAddMemberGroup(null)}
        />
      )}
      {renewingGroup && (
        <RenewGroupModal
          token={token}
          group={renewingGroup}
          groupPackages={groupPackages}
          onRenewed={({ newExpiry }) => {
            setGroups((prev) => prev.map((g) =>
              g.id === renewingGroup.id ? { ...g, expiry_date: newExpiry } : g
            ));
            setRenewingGroup(null);
          }}
          onClose={() => setRenewingGroup(null)}
        />
      )}
      {confirmDeleteGroup && (
        <ConfirmModal
          title={t('admin.groups.deleteConfirmTitle')}
          body={t('admin.groups.deleteConfirm', { name: confirmDeleteGroup.name })}
          confirmLabel={t('admin.groups.delete')}
          onConfirm={async () => {
            try {
              await deleteGroup(token, confirmDeleteGroup.id);
              setGroups((prev) => prev.filter((g) => g.id !== confirmDeleteGroup.id));
            } catch (err) {
              setError(err.message);
            } finally {
              setConfirmDeleteGroup(null);
            }
          }}
          onClose={() => setConfirmDeleteGroup(null)}
        />
      )}
      {confirmRemoveGroupMember && (
        <RemoveGroupMemberPinModal
          token={token}
          group={confirmRemoveGroupMember.group}
          member={confirmRemoveGroupMember.member}
          onRemoved={(groupId, memberId) => {
            setGroups((prev) => prev.map((g) =>
              g.id === groupId ? { ...g, members: g.members.filter((mem) => mem.id !== memberId) } : g
            ));
            setConfirmRemoveGroupMember(null);
          }}
          onClose={() => setConfirmRemoveGroupMember(null)}
        />
      )}
      {groupWarning && (
        <GroupMemberWarningModal
          member={groupWarning.member}
          action={groupWarning.action}
          onConfirm={() => {
            const { member, action } = groupWarning;
            setGroupWarning(null);
            if (action === 'edit') {
              setEditDetachMemberId(member.id);
              startEdit(member);
            } else {
              setDeletingMember(member);
            }
          }}
          onClose={() => setGroupWarning(null)}
        />
      )}
    </div>
  );
}

// ─── Packages Tab ─────────────────────────────────────────────────────────────

function PackagesTab({ token }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editHasRegFee, setEditHasRegFee] = useState(false);
  const [editRegFee, setEditRegFee] = useState('');
  const [editIsGroup, setEditIsGroup] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newHasRegFee, setNewHasRegFee] = useState(false);
  const [newRegFee, setNewRegFee] = useState('');
  const [newIsGroup, setNewIsGroup] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [visitorPriceInput, setVisitorPriceInput] = useState('');
  const [visitorPriceLoaded, setVisitorPriceLoaded] = useState(false);
  const [visitorPriceSaving, setVisitorPriceSaving] = useState(false);
  const [visitorPriceSaved, setVisitorPriceSaved] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getPackages(token),
      getSettings(token),
    ])
      .then(([pkgs, settings]) => {
        setPackages(pkgs);
        setVisitorPriceInput(String(settings.visitorPrice));
        setVisitorPriceLoaded(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSaveVisitorPrice = async (e) => {
    e.preventDefault();
    setVisitorPriceSaving(true);
    setVisitorPriceSaved(false);
    try {
      await setVisitorPrice(token, Number(visitorPriceInput));
      setVisitorPriceSaved(true);
      setTimeout(() => setVisitorPriceSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setVisitorPriceSaving(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setAddLoading(true);
    try {
      const pkg = await createPackage(token, {
        name: newName,
        durationDays: Number(newDuration),
        price: Number(newPrice),
        isDefault: packages.length === 0,
        hasRegistrationFee: newHasRegFee,
        registrationFee: newHasRegFee ? Number(newRegFee) : 0,
        isGroup: newIsGroup,
      });
      setPackages((prev) => [...prev, pkg].sort((a, b) => a.price - b.price));
      setNewName(''); setNewDuration(''); setNewPrice(''); setNewHasRegFee(false); setNewRegFee(''); setNewIsGroup(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const startEdit = (pkg) => {
    setEditingId(pkg.id);
    setEditName(pkg.name);
    setEditDuration(String(pkg.duration_days));
    setEditPrice(String(pkg.price));
    setEditHasRegFee(!!pkg.has_registration_fee);
    setEditRegFee(String(pkg.registration_fee ?? 0));
    setEditIsGroup(!!pkg.is_group);
  };

  const cancelEdit = () => {
    setEditingId(null); setEditName(''); setEditDuration(''); setEditPrice('');
    setEditHasRegFee(false); setEditRegFee(''); setEditIsGroup(false);
  };

  const saveEdit = async (id) => {
    setError('');
    try {
      const updated = await updatePackage(token, id, {
        name: editName,
        durationDays: Number(editDuration),
        price: Number(editPrice),
        hasRegistrationFee: editHasRegFee,
        registrationFee: editHasRegFee ? Number(editRegFee) : 0,
        isGroup: editIsGroup,
      });
      setPackages((prev) => prev.map((p) => p.id === id ? updated : p).sort((a, b) => a.price - b.price));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await deletePackage(token, id);
      setPackages((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetDefault = async (id) => {
    setError('');
    try {
      const updated = await setDefaultPackage(token, id);
      setPackages((prev) => prev.map((p) => ({ ...p, is_default: p.id === updated.id })));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <div style={s.error}>{error}</div>}

      {/* Visitor price setting */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '18px 24px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
          {t('admin.packages.visitorPriceTitle')}
        </div>
        <form onSubmit={handleSaveVisitorPrice} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>Rp</span>
          <input
            style={{ ...s.inlineInput, maxWidth: 140 }}
            type="number"
            min={0}
            value={visitorPriceInput}
            onChange={(e) => { setVisitorPriceInput(e.target.value); setVisitorPriceSaved(false); }}
            placeholder="0"
            disabled={!visitorPriceLoaded}
          />
          <button
            style={{ ...s.actionBtn, ...s.saveBtn, opacity: visitorPriceSaving || !visitorPriceLoaded ? 0.6 : 1 }}
            type="submit"
            disabled={visitorPriceSaving || !visitorPriceLoaded}
          >
            {visitorPriceSaving ? t('admin.packages.visitorPriceSaving') : visitorPriceSaved ? '✓ Saved' : t('admin.packages.visitorPriceSave')}
          </button>
        </form>
      </div>

      <div style={{ ...s.tableWrap }}>
      <table style={{ ...s.table, minWidth: 760 }}>
        <thead>
          <tr>
            <th style={s.th}>{t('admin.packages.colName')}</th>
            <th style={s.th}>{t('admin.packages.colDuration')}</th>
            <th style={s.th}>{t('admin.packages.colPrice')}</th>
            <th style={s.th}>{t('admin.packages.colRegFee')}</th>
            <th style={s.th}>{t('admin.packages.colGroup')}</th>
            <th style={s.th}>{t('admin.packages.colDefault')}</th>
            <th style={s.th}>{t('admin.packages.colActions')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} style={s.empty}>{t('common.loading')}</td></tr>
          ) : packages.length === 0 ? (
            <tr><td colSpan={7} style={s.empty}>{t('admin.packages.noPackages')}</td></tr>
          ) : packages.map((pkg) => (
            <tr key={pkg.id}>
              <td style={s.td}>
                {editingId === pkg.id ? (
                  <input style={s.inlineInput} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                ) : pkg.name}
              </td>
              <td style={s.td}>
                {editingId === pkg.id ? (
                  <input style={{ ...s.inlineInput, maxWidth: 80 }} type="number" min={1} value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
                ) : `${pkg.duration_days}d`}
              </td>
              <td style={s.td}>
                {editingId === pkg.id ? (
                  <input style={{ ...s.inlineInput, maxWidth: 120 }} type="number" min={0} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                ) : `Rp ${Number(pkg.price).toLocaleString('id-ID')}`}
              </td>
              <td style={s.td}>
                {editingId === pkg.id ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={editHasRegFee} onChange={(e) => setEditHasRegFee(e.target.checked)} />
                    {editHasRegFee && (
                      <input style={{ ...s.inlineInput, maxWidth: 110 }} type="number" min={0}
                        value={editRegFee} onChange={(e) => setEditRegFee(e.target.value)} placeholder="0" />
                    )}
                  </label>
                ) : pkg.has_registration_fee ? (
                  <span>
                    <span style={{ ...s.badge, background: '#dcfce7', color: '#166534', marginRight: 4 }}>✓</span>
                    {`Rp ${Number(pkg.registration_fee).toLocaleString('id-ID')}`}
                  </span>
                ) : '—'}
              </td>
              <td style={{ ...s.td, textAlign: 'center' }}>
                {editingId === pkg.id ? (
                  <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                    <button type="button"
                      style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: !editIsGroup ? '#1a1a2e' : '#fff', color: !editIsGroup ? '#fff' : '#94a3b8' }}
                      onClick={() => setEditIsGroup(false)}
                    >{t('admin.packages.typeIndividual')}</button>
                    <button type="button"
                      style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', borderLeft: '1px solid #e2e8f0', cursor: 'pointer', background: editIsGroup ? '#6d28d9' : '#fff', color: editIsGroup ? '#fff' : '#94a3b8' }}
                      onClick={() => setEditIsGroup(true)}
                    >{t('admin.packages.typeGroup')}</button>
                  </div>
                ) : pkg.is_group ? (
                  <span style={{ ...s.badge, background: '#ede9fe', color: '#6d28d9' }}>{t('admin.packages.typeGroup')}</span>
                ) : (
                  <span style={{ ...s.badge, background: '#f1f5f9', color: '#64748b' }}>{t('admin.packages.typeIndividual')}</span>
                )}
              </td>
              <td style={s.td}>
                {pkg.is_default
                  ? <span style={s.defaultBadge}>{t('admin.packages.isDefault')}</span>
                  : <button style={{ ...s.actionBtn, ...s.starBtn }} onClick={() => handleSetDefault(pkg.id)}>{t('admin.packages.setDefault')}</button>}
              </td>
              <td style={s.td}>
                {editingId === pkg.id ? (
                  <>
                    <button style={{ ...s.actionBtn, ...s.saveBtn }} onClick={() => saveEdit(pkg.id)}>{t('admin.packages.save')}</button>
                    <button style={{ ...s.actionBtn, ...s.cancelBtn }} onClick={cancelEdit}>{t('admin.packages.cancel')}</button>
                  </>
                ) : (
                  <>
                    <button style={{ ...s.actionBtn, ...s.editBtn }} onClick={() => startEdit(pkg)}>{t('admin.members.edit')}</button>
                    <button style={{ ...s.actionBtn, ...s.deleteBtn }} onClick={() => handleDelete(pkg.id)}>{t('admin.members.remove')}</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          <tr>
            <td style={s.td}>
              <input style={s.inlineInput} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('admin.packages.namePlaceholder')} />
            </td>
            <td style={s.td}>
              <input style={{ ...s.inlineInput, maxWidth: 80 }} type="number" min={1} value={newDuration} onChange={(e) => setNewDuration(e.target.value)} placeholder={t('admin.packages.durationPlaceholder')} />
            </td>
            <td style={s.td}>
              <input style={{ ...s.inlineInput, maxWidth: 120 }} type="number" min={0} value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder={t('admin.packages.pricePlaceholder')} />
            </td>
            <td style={s.td}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={newHasRegFee} onChange={(e) => setNewHasRegFee(e.target.checked)} />
                {newHasRegFee && (
                  <input style={{ ...s.inlineInput, maxWidth: 110 }} type="number" min={0}
                    value={newRegFee} onChange={(e) => setNewRegFee(e.target.value)} placeholder="0" />
                )}
              </label>
            </td>
            <td style={{ ...s.td, textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                <button type="button"
                  style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: !newIsGroup ? '#1a1a2e' : '#fff', color: !newIsGroup ? '#fff' : '#94a3b8' }}
                  onClick={() => setNewIsGroup(false)}
                >{t('admin.packages.typeIndividual')}</button>
                <button type="button"
                  style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', borderLeft: '1px solid #e2e8f0', cursor: 'pointer', background: newIsGroup ? '#6d28d9' : '#fff', color: newIsGroup ? '#fff' : '#94a3b8' }}
                  onClick={() => setNewIsGroup(true)}
                >{t('admin.packages.typeGroup')}</button>
              </div>
            </td>
            <td style={s.td} />
            <td style={s.td}>
              <button
                style={{ ...s.actionBtn, ...s.saveBtn, opacity: addLoading ? 0.6 : 1 }}
                onClick={handleAdd}
                disabled={addLoading || !newName.trim() || !newDuration || !newPrice}
              >
                {t('admin.packages.addPackage')}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ─── Business Dashboard Tab ───────────────────────────────────────────────────

const MONTH_LABELS = { '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec' };

const formatRp = (v) => {
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `Rp ${(v / 1_000).toFixed(0)}K`;
  return `Rp ${v}`;
};

const getMonday = (d) => {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(dt.setDate(diff)).toISOString().slice(0, 10);
};

function StatCard({ label, value, sub }) {
  return (
    <div style={s.statCard}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      {sub && <div style={s.statSub}>{sub}</div>}
    </div>
  );
}

function BusinessTab({ token }) {
  const today = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const getRange = (p) => {
    const now = new Date();
    if (p === 'today') return { start: today, end: today };
    if (p === 'week')  return { start: getMonday(today), end: today };
    if (p === 'month') return { start: `${today.slice(0, 7)}-01`, end: today };
    return { start: customStart, end: customEnd };
  };

  const load = useCallback(async (p = period) => {
    setLoading(true);
    setError('');
    try {
      const range = getRange(p);
      const result = await getDashboard(token, range);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, period, customStart, customEnd]);

  useEffect(() => { load(); }, []);

  const handlePeriod = (p) => { setPeriod(p); load(p); };

  const trend = (data?.trend || []).map((r) => ({
    ...r,
    monthLabel: MONTH_LABELS[r.month?.slice(5, 7)] || r.month,
  }));

  const rp = (v) => `Rp ${Number(v).toLocaleString('id-ID')}`;

  return (
    <div>
      {/* Period picker */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
        {[['today', t('admin.business.periodToday')], ['week', t('admin.business.periodWeek')], ['month', t('admin.business.periodMonth')]].map(([key, label]) => (
          <button key={key} style={{ ...s.periodBtn, ...(period === key ? s.periodBtnActive : {}) }}
            onClick={() => handlePeriod(key)}>{label}</button>
        ))}
        <button style={{ ...s.periodBtn, ...(period === 'custom' ? s.periodBtnActive : {}) }}
          onClick={() => setPeriod('custom')}>{t('admin.business.periodCustom')}</button>
        {period === 'custom' && (
          <>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              style={{ ...s.dateInput, fontSize: 13 }} />
            <span style={{ fontSize: 13, color: '#64748b' }}>–</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              style={{ ...s.dateInput, fontSize: 13 }} />
            <button style={{ ...s.periodBtn, background: '#1a1a2e', color: '#BEFE00', borderColor: '#1a1a2e' }}
              onClick={() => load('custom')}>{t('admin.business.applyRange')}</button>
          </>
        )}
      </div>

      {error && <div style={{ ...s.error, marginBottom: 16 }}>{error}</div>}

      {loading && <div style={s.empty}>{t('admin.business.loading')}</div>}

      {!loading && data && (
        <>
          {/* Revenue Snapshot */}
          <div style={s.sectionTitle}>{t('admin.business.revenueSnapshot')}</div>
          <div style={s.cardRow}>
            <StatCard
              label={t('admin.business.totalRevenue')}
              value={formatRp(data.revenue.total)}
              sub={`${t('admin.business.newMemberships')}: ${formatRp(data.revenue.new_member)} · Renewals: ${formatRp(data.revenue.renewal)} · Walk-ins: ${formatRp(data.revenue.walk_in)}`}
            />
            <StatCard
              label={t('admin.business.newMemberships')}
              value={data.memberships.new_count}
              sub={`${formatRp(data.memberships.new_value)} · ${data.memberships.renewal_count} renewals`}
            />
            <StatCard
              label={t('admin.business.activeMembers')}
              value={data.snapshot.active_members}
            />
          </div>

          {/* Revenue Trend */}
          <div style={s.sectionTitle}>{t('admin.business.trendTitle')}</div>
          <div style={s.chartCard}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v, name) => [rp(v), name]} />
                <Legend />
                <Bar dataKey="new_member" name="New Member" stackId="a" fill="#BEFE00" />
                <Bar dataKey="renewal"    name="Renewal"    stackId="a" fill="#3b82f6" />
                <Bar dataKey="walk_in"    name="Walk-in"    stackId="a" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Retention Health */}
          <div style={s.sectionTitle}>{t('admin.business.retentionTitle')}</div>
          <div style={s.cardRow}>
            <StatCard
              label={t('admin.business.churnRate')}
              value={data.rates.churn_rate != null ? `${data.rates.churn_rate}%` : '—'}
              sub={data.rates.churn_numerator > 0 ? `${data.rates.churn_numerator} ${t('admin.business.of')} ${data.rates.churn_denominator} ${t('admin.business.membersChurned')}` : undefined}
            />
            <StatCard
              label={t('admin.business.renewalRate')}
              value={data.rates.renewal_rate != null ? `${data.rates.renewal_rate}%` : '—'}
              sub={data.rates.renewal_denominator > 0 ? `${data.memberships.renewal_count} ${t('admin.business.of')} ${data.rates.renewal_denominator} ${t('admin.business.members')} renewed` : undefined}
            />
            <StatCard
              label={t('admin.business.expiringSoon')}
              value={data.snapshot.expiring_7_days + data.snapshot.expiring_8_30_days}
              sub={`${data.snapshot.expiring_7_days} ${t('admin.business.expiring7')} · ${data.snapshot.expiring_8_30_days} ${t('admin.business.expiring30')}`}
            />
            <StatCard
              label={t('admin.business.avgTenure')}
              value={data.snapshot.avg_tenure_days != null ? `${data.snapshot.avg_tenure_days}` : '—'}
              sub={data.snapshot.avg_tenure_days != null ? t('admin.business.days') : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Change Admin Password Modal ──────────────────────────────────────────────

function ChangeAdminPasswordModal({ token, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError(t('admin.changePassword.tooShort')); return; }
    if (newPassword !== confirmPassword) { setError(t('admin.changePassword.mismatch')); return; }
    setLoading(true);
    try {
      await changeAdminPassword(token, currentPassword, newPassword);
      setSuccess(t('admin.changePassword.success'));
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{t('admin.changePassword.title')}</div>
        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>{t('admin.changePassword.current')}</label>
          <input style={s.modalInput} type="password" value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)} required autoFocus />
          <label style={s.modalLabel}>{t('admin.changePassword.new')}</label>
          <input style={s.modalInput} type="password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} required />
          <label style={s.modalLabel}>{t('admin.changePassword.confirm')}</label>
          <input style={s.modalInput} type="password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} required />
          <button
            style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading}>
            {loading ? t('admin.changePassword.saving') : t('admin.changePassword.save')}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>{t('common.cancel')}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Reg Fee Modal ────────────────────────────────────────────────────────────

function RegFeeModal({ token, gymSettings, onSaved, onClose }) {
  const [ruleEnabled, setRuleEnabled] = useState(gymSettings?.regFeeRuleEnabled ?? false);
  const [graceMonths, setGraceMonths] = useState(String(gymSettings?.regFeeGraceMonths ?? 3));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleSave = async () => {
    setError('');
    const months = parseInt(graceMonths);
    if (ruleEnabled && (!graceMonths || isNaN(months) || months < 1)) {
      setError('Grace period must be at least 1 month');
      return;
    }
    setLoading(true);
    try {
      const updated = await setRegFeeRule(token, ruleEnabled, months || 3);
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 420 }}>
        <div style={s.modalTitle}>{t('admin.settings.regFeeMenuLabel')}</div>
        {error && <div style={s.error}>{error}</div>}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 6 }}>
            {t('admin.settings.regFeeRule')}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
            {t('admin.settings.regFeeRuleHint')}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={ruleEnabled}
              onChange={(e) => setRuleEnabled(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#BEFE00', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14, color: '#1e293b' }}>
              {ruleEnabled ? t('admin.settings.ruleOn') : t('admin.settings.ruleOff')}
            </span>
          </label>
          {ruleEnabled && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
                {t('admin.settings.graceMonths')}:
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={graceMonths}
                onChange={(e) => setGraceMonths(e.target.value)}
                style={{ ...s.inlineInput, maxWidth: 80 }}
              />
              <span style={{ fontSize: 13, color: '#64748b' }}>{t('admin.settings.months')}</span>
            </div>
          )}
        </div>

        <button
          style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? t('admin.settings.saving') : saved ? t('admin.settings.saved') : t('admin.settings.save')}
        </button>
        <button
          style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
          onClick={onClose}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

// ─── Gym Code Modal ───────────────────────────────────────────────────────────

function GymCodeModal({ token, gymSettings, onSaved, onClose }) {
  const [codeInput, setCodeInput] = useState(gymSettings?.gymCode ?? '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(urlPreview).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isChanging = gymSettings?.gymCode && codeInput !== gymSettings.gymCode && codeInput !== '';
  const urlPreview = codeInput ? `${window.location.origin}/g/${codeInput}` : '';

  const handleSave = async () => {
    setError('');
    const code = codeInput.trim().toLowerCase();
    if (code && !/^[a-z0-9-]{3,20}$/.test(code)) {
      setError(t('admin.settings.gymCodeHint'));
      return;
    }
    setLoading(true);
    try {
      const updated = await setGymCode(token, code || null);
      onSaved({ ...gymSettings, gymCode: updated.gymCode });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 420 }}>
        <div style={s.modalTitle}>{t('admin.settings.gymCodeMenuLabel')}</div>
        {error && <div style={s.error}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            {t('admin.settings.gymCodeLabel')}
          </label>
          <input
            type="text"
            value={codeInput}
            onChange={(e) => { setCodeInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSaved(false); }}
            placeholder="e.g. fitzone"
            style={{ ...s.modalInput, marginBottom: 6 }}
            maxLength={20}
          />
          <div style={{ fontSize: 12, color: '#64748b' }}>{t('admin.settings.gymCodeHint')}</div>
        </div>

        {urlPreview && (
          <div style={{ marginBottom: 16, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{t('admin.settings.gymCodeUrlPreview')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, wordBreak: 'break-all', flex: 1 }}>{urlPreview}</div>
              <button
                type="button"
                onClick={handleCopyUrl}
                title="Copy link"
                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: copied ? '#16a34a' : '#64748b', transition: 'color 0.15s' }}
              >
                {copied
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                }
              </button>
            </div>
            {copied && (
              <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4, fontWeight: 500 }}>Link copied!</div>
            )}
          </div>
        )}

        {isChanging && (
          <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>
            {t('admin.settings.gymCodeChangeWarning')}
          </div>
        )}

        <button
          style={{ ...s.modalBtn, background: '#BEFE00', color: '#1a1a1a', opacity: loading ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? t('admin.settings.gymCodeSaving') : saved ? t('admin.settings.saved') : t('admin.settings.gymCodeSave')}
        </button>
        {gymSettings?.gymCode && (
          <button
            style={{ ...s.modalBtn, background: '#fee2e2', color: '#b91c1c', marginTop: 10, opacity: loading ? 0.6 : 1 }}
            onClick={() => { setCodeInput(''); }}
            disabled={loading}
          >
            {t('admin.settings.gymCodeClear')}
          </button>
        )}
        <button
          style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
          onClick={onClose}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({ token, gymSettings, onSaved, onClose }) {
  const [activeSection, setActiveSection] = useState(null);
  const { t } = useTranslation();

  const menuRow = (label, section) => (
    <button style={s.settingsMenuRow} onClick={() => setActiveSection(section)}>
      <span>{label}</span>
      <span style={{ color: '#94a3b8', fontSize: 18 }}>›</span>
    </button>
  );

  return (
    <>
      <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={{ ...s.modal, maxWidth: 420 }}>
          <div style={s.modalTitle}>{t('admin.settings.title')}</div>
          {menuRow(t('admin.changePassword.menuLabel'), 'password')}
          {menuRow(t('admin.changePin'), 'changepin')}
          {menuRow(t('admin.settings.regFeeMenuLabel'), 'regfee')}
          {menuRow(t('admin.settings.gymCodeMenuLabel'), 'gymcode')}
          <button
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 16 }}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>

      {activeSection === 'password' && (
        <ChangeAdminPasswordModal token={token} onClose={() => setActiveSection(null)} />
      )}
      {activeSection === 'changepin' && (
        <ChangePinModal token={token} onClose={() => setActiveSection(null)} />
      )}
      {activeSection === 'regfee' && (
        <RegFeeModal token={token} gymSettings={gymSettings} onSaved={onSaved}
          onClose={() => setActiveSection(null)} />
      )}
      {activeSection === 'gymcode' && (
        <GymCodeModal token={token} gymSettings={gymSettings} onSaved={onSaved}
          onClose={() => setActiveSection(null)} />
      )}
    </>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

const kebabDropStyle = {
  position: 'absolute', right: 0, top: '100%', zIndex: 200,
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 200, overflow: 'hidden',
};
const kebabItemStyle = { padding: '10px 16px', borderBottom: '1px solid #f1f5f9' };
const kebabBtnStyle = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '10px 16px', background: 'none', border: 'none',
  cursor: 'pointer', fontSize: 13, color: '#1e293b', borderTop: '1px solid #f1f5f9',
};

export default function AdminPage({ token, role, gymName, onBack }) {
  const [tab, setTab] = useState('attendance');
  const [showSettings, setShowSettings] = useState(false);
  const [gymSettings, setGymSettings] = useState(null);
  const [kebabOpen, setKebabOpen] = useState(false);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  useEffect(() => {
    if (role === 'admin') {
      getSettings(token).then(setGymSettings).catch(() => {});
    }
  }, [token, role]);

  return (
    <div style={s.page}>
      {/* ── Sticky zone: header + tabs ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 200 }}>
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/kiosgym-icon.svg" alt="KIOS GYM" style={{ height: 32, width: 'auto', display: 'block' }} />
            <div>
              <div style={s.headerTitle}>{gymName ?? t('admin.title')}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {t('admin.title')}
              </div>
            </div>
          </div>
          <div style={s.headerRight}>
            {isMobile ? (
              <>
                <button style={s.backBtn} onClick={onBack}>{t('admin.backToScanner')}</button>
                <div style={{ position: 'relative' }}>
                  <button style={s.iconBtn} onClick={() => setKebabOpen((p) => !p)}>⋮</button>
                  {kebabOpen && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setKebabOpen(false)} />
                      <div style={kebabDropStyle}>
                        <div style={kebabItemStyle}><LanguageSwitcher variant="dark" /></div>
                        {role === 'admin' && (
                          <button style={kebabBtnStyle} onClick={() => { setShowSettings(true); setKebabOpen(false); }}>
                            ⚙ {t('admin.settings.title')}
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
                  <button style={s.iconBtn} onClick={() => setShowSettings(true)} title={t('admin.settings.title')}>⚙</button>
                )}
                <button style={s.backBtn} onClick={onBack}>{t('admin.backToScanner')}</button>
              </>
            )}
          </div>
        </div>
        <div style={{ background: '#fff' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
            <div style={s.tabs} className="tabs-scroll">
              <button style={{ ...s.tab, ...(tab === 'attendance' ? s.tabActive : {}) }} onClick={() => setTab('attendance')}>
                {t('admin.tabs.attendance')}
              </button>
              <button style={{ ...s.tab, ...(tab === 'members' ? s.tabActive : {}) }} onClick={() => setTab('members')}>
                {t('admin.tabs.members')}
              </button>
              <button style={{ ...s.tab, ...(tab === 'staff' ? s.tabActive : {}) }} onClick={() => setTab('staff')}>
                {t('admin.tabs.staff')}
              </button>
              {role === 'admin' && (
                <button style={{ ...s.tab, ...(tab === 'packages' ? s.tabActive : {}) }} onClick={() => setTab('packages')}>
                  {t('admin.packages.tab')}
                </button>
              )}
              {role === 'admin' && (
                <button
                  disabled
                  style={{
                    ...s.tab,
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {t('admin.tabs.business')}
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    background: '#BEFE00',
                    color: '#000',
                    borderRadius: 4,
                    padding: '1px 5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    lineHeight: 1.4,
                  }}>
                    {t('comingSoon')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 40px' }}>
        {tab === 'attendance' && <AttendanceTab token={token} />}
        {tab === 'members' && <MembersTab token={token} gymSettings={gymSettings} />}
        {tab === 'staff' && <StaffTab token={token} />}
        {tab === 'packages' && role === 'admin' && <PackagesTab token={token} />}
        {tab === 'business' && role === 'admin' && <BusinessTab token={token} />}
      </div>

      {showSettings && (
        <SettingsModal
          token={token}
          gymSettings={gymSettings}
          onSaved={(updated) => setGymSettings((prev) => ({ ...prev, ...updated }))}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
