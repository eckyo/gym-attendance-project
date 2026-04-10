import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { postScan } from '../api/scan.js';

const DEBOUNCE_MS = 5000;

const styles = {
  page: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '24px 16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  headerRight: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  adminBtn: {
    padding: '8px 16px',
    background: '#1a1a2e',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    color: '#fff',
    fontWeight: 600,
  },
  logoutBtn: {
    padding: '8px 16px',
    background: '#e2e8f0',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    color: '#475569',
  },
  scannerWrap: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: 20,
  },
  processing: {
    textAlign: 'center',
    color: '#64748b',
    padding: 12,
    fontSize: 15,
  },
  feedbackSuccess: {
    background: '#dcfce7',
    border: '1px solid #86efac',
    color: '#166534',
    borderRadius: 10,
    padding: '16px 20px',
    fontSize: 16,
    fontWeight: 600,
    textAlign: 'center',
  },
  feedbackError: {
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: 10,
    padding: '16px 20px',
    fontSize: 15,
    textAlign: 'center',
  },
};

export default function ScanPage({ token, role, onLogout, onAdminAccess }) {
  const [feedback, setFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScanRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    // Clear any leftover DOM from a previous scanner instance (StrictMode / remount)
    const readerEl = document.getElementById('qr-reader');
    if (readerEl) readerEl.innerHTML = '';

    let active = true;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 300, height: 300 }, rememberLastUsedCamera: true },
      false
    );

    const onScanSuccess = async (decodedText) => {
      if (!active) return;
      const now = Date.now();
      if (lastScanRef.current && now - lastScanRef.current < DEBOUNCE_MS) return;
      if (isProcessing) return;

      lastScanRef.current = now;
      setIsProcessing(true);
      setFeedback(null);

      try {
        const result = await postScan(token, decodedText);
        const time = new Date(result.checkedInAt).toLocaleTimeString('en-US', { hour12: false });
        setFeedback({
          type: 'success',
          message: `Welcome, ${result.memberName}! Checked in at ${time}`,
        });
        setTimeout(() => setFeedback(null), 4000);
      } catch (err) {
        setFeedback({ type: 'error', message: err.message });
      } finally {
        setIsProcessing(false);
      }
    };

    scanner.render(onScanSuccess, () => {});
    scannerRef.current = scanner;

    return () => {
      active = false;
      scanner.clear().catch(() => {});
    };
  }, [token]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.title}>Gym Attendance Kiosk</span>
        <div style={styles.headerRight}>
          {role === 'admin' && (
            <button style={styles.adminBtn} onClick={onAdminAccess}>Admin Dashboard</button>
          )}
          <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={styles.scannerWrap}>
        <div id="qr-reader" />
      </div>

      {isProcessing && <p style={styles.processing}>Processing scan...</p>}

      {feedback && (
        <div style={feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}>
          {feedback.message}
        </div>
      )}
    </div>
  );
}
