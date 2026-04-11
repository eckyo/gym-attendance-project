import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Lottie from 'lottie-react';
import successAnimation from '../assets/success.json';
import errorAnimation from '../assets/error.json';
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
  feedbackError: {
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: 10,
    padding: '16px 20px',
    fontSize: 15,
    textAlign: 'center',
  },
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
};

export default function ScanPage({ token, role, onLogout, onAdminAccess }) {
  const [feedback, setFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScanRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
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

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('en-US', { hour12: false });

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

      {feedback?.type === 'error' && (
        <div style={styles.feedbackError}>{feedback.message}</div>
      )}

      {feedback?.type === 'expired' && (
        <div style={styles.overlay}>
          <div style={styles.card}>
            <Lottie
              animationData={errorAnimation}
              loop={false}
              style={{ width: 180, height: 180, margin: '0 auto' }}
            />
            <p style={styles.errorHeading}>Membership Expired</p>
            <p style={styles.errorMessage}>{feedback.message}</p>
            <p style={styles.errorHint}>
              Please visit the front desk or contact the gym admin to renew your membership before checking in.
            </p>
            <button style={styles.returnBtn} onClick={() => setFeedback(null)}>
              Return to Scan
            </button>
          </div>
        </div>
      )}

      {feedback?.type === 'success' && (
        <div style={styles.overlay}>
          <div style={styles.card}>
            <Lottie
              animationData={successAnimation}
              loop={false}
              style={{ width: 180, height: 180, margin: '0 auto' }}
            />
            <p style={styles.cardHeading}>Check-in Successful!</p>
            <div style={styles.cardName}>{feedback.memberName}</div>
            <div style={styles.cardGymId}>GYM ID: {feedback.gymId}</div>
            <div style={styles.cardTime}>Clocked in at {formatTime(feedback.checkedInAt)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
