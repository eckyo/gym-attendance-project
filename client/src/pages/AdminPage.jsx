import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import {
  getAttendance, getMembers, addMember, updateMember,
  deleteMember, changePin,
} from '../api/admin.js';

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
};

// ─── QR Code Modal ───────────────────────────────────────────────────────────

function QrCodeModal({ member, onClose }) {
  const canvasRef = useRef(null);

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
          <div style={s.qrInstructionTitle}>📋 How to share this QR code</div>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            <li>Click <strong>Save QR Code</strong> to download the image.</li>
            <li>Send the image to <strong>{member.name}</strong> via WhatsApp, email, or print it out.</li>
            <li>The member scans this code at the kiosk to check in.</li>
            <li>Keep this code private — it is unique to this member.</li>
          </ol>
        </div>

        <button style={s.saveQrBtn} onClick={handleSave}>
          ↓ Save QR Code
        </button>
        <button
          style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569' }}
          onClick={onClose}
        >
          Close
        </button>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPin !== confirmPin) { setError('New PINs do not match'); return; }
    if (!/^\d{4,6}$/.test(newPin)) { setError('PIN must be 4–6 digits'); return; }
    setLoading(true);
    try {
      await changePin(token, currentPin, newPin);
      setSuccess('PIN changed successfully!');
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
        <div style={s.modalTitle}>Change Admin PIN</div>
        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>Current PIN</label>
          <input style={s.modalInput} type="password" inputMode="numeric"
            value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Current PIN" required autoFocus />
          <label style={s.modalLabel}>New PIN</label>
          <input style={s.modalInput} type="password" inputMode="numeric"
            value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="4–6 digits" required />
          <label style={s.modalLabel}>Confirm New PIN</label>
          <input style={s.modalInput} type="password" inputMode="numeric"
            value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Repeat new PIN" required />
          <button style={{ ...s.modalBtn, background: '#3b82f6', color: '#fff', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save PIN'}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>Cancel</button>
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

function AddMemberModal({ token, onAdded, onClose }) {
  const [name, setName] = useState('');
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const member = await addMember(token, name, expiryDate);
      onAdded(member);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>Add New Member</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.modalLabel}>Name</label>
          <input style={s.modalInput} type="text"
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Full name" required autoFocus />
          <label style={s.modalLabel}>Expiry Date</label>
          <input style={s.modalInput} type="date"
            value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
            required />
          <button style={{ ...s.modalBtn, background: '#3b82f6', color: '#fff', opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Member'}
          </button>
          <button type="button"
            style={{ ...s.modalBtn, background: '#e2e8f0', color: '#475569', marginTop: 10 }}
            onClick={onClose}>Cancel</button>
        </form>
      </div>
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
          placeholder="Search by name or gym ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div style={s.error}>{error}</div>}

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Member Name</th>
            <th style={s.th}>Gym ID</th>
            <th style={s.th}>Clock In</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={3} style={s.empty}>Loading...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={3} style={s.empty}>No attendance records found.</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i}>
              <td style={s.td}>{row.member_name}</td>
              <td style={s.tdMono}>{row.gym_id}</td>
              <td style={s.td}>
                {new Date(row.checked_in_at).toLocaleString('en-US', { hour12: false })}
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [qrMember, setQrMember] = useState(null);

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
  };

  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditExpiry(''); };

  const saveEdit = async (id) => {
    try {
      const updated = await updateMember(token, id, editName, editExpiry);
      setMembers((prev) => prev.map((m) => m.id === id ? updated : m));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}"? This cannot be undone.`)) return;
    try {
      await deleteMember(token, id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdded = (member) => {
    setMembers((prev) => [member, ...prev]);
    setShowAddModal(false);
  };

  return (
    <div>
      <div style={s.toolbar}>
        <input
          style={s.searchInput}
          type="text"
          placeholder="Search by name or scan token..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button style={s.addBtn} onClick={() => setShowAddModal(true)}>+ Add Member</button>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Name</th>
            <th style={s.th}>GYM ID</th>
            <th style={s.th}>Expiry Date</th>
            <th style={s.th}>Joined</th>
            <th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} style={s.empty}>Loading...</td></tr>
          ) : members.length === 0 ? (
            <tr><td colSpan={5} style={s.empty}>No members found.</td></tr>
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
                      {new Date(member.expiry_date).toLocaleDateString('en-US')}
                      {isExpired && <span style={{ marginLeft: 6, fontSize: 11 }}>(Expired)</span>}
                    </>
                  ) : '—'}
                </td>
                <td style={s.td}>{new Date(member.created_at).toLocaleDateString('en-US')}</td>
                <td style={s.td}>
                  {editingId === member.id ? (
                    <>
                      <button style={{ ...s.actionBtn, ...s.saveBtn }} onClick={() => saveEdit(member.id)}>Save</button>
                      <button style={{ ...s.actionBtn, ...s.cancelBtn }} onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button style={{ ...s.actionBtn, ...s.qrBtn }} onClick={() => setQrMember(member)}>QR Code</button>
                      <button style={{ ...s.actionBtn, ...s.editBtn }} onClick={() => startEdit(member)}>Edit</button>
                      <button style={{ ...s.actionBtn, ...s.deleteBtn }} onClick={() => handleDelete(member.id, member.name)}>Remove</button>
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
      {qrMember && (
        <QrCodeModal member={qrMember} onClose={() => setQrMember(null)} />
      )}
    </div>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

export default function AdminPage({ token, onBack }) {
  const [tab, setTab] = useState('attendance');
  const [showChangePin, setShowChangePin] = useState(false);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>Admin Dashboard</div>
        <div style={s.headerRight}>
          <button style={s.changePinBtn} onClick={() => setShowChangePin(true)}>Change PIN</button>
          <button style={s.backBtn} onClick={onBack}>← Back to Scanner</button>
        </div>
      </div>

      <div style={s.body}>
        <div style={s.tabs}>
          <button
            style={{ ...s.tab, ...(tab === 'attendance' ? s.tabActive : {}) }}
            onClick={() => setTab('attendance')}
          >
            Attendance
          </button>
          <button
            style={{ ...s.tab, ...(tab === 'members' ? s.tabActive : {}) }}
            onClick={() => setTab('members')}
          >
            Members
          </button>
        </div>

        {tab === 'attendance' && <AttendanceTab token={token} />}
        {tab === 'members' && <MembersTab token={token} />}
      </div>

      {showChangePin && (
        <ChangePinModal token={token} onClose={() => setShowChangePin(false)} />
      )}
    </div>
  );
}
