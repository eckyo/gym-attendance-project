import { useState, useEffect, useRef } from 'react';
import { useTranslation, LanguageSwitcher } from '../i18n/LanguageContext.jsx';

const WA_NUMBER = '6281234567890'; // ← update before launch
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=Halo%2C%20saya%20tertarik%20dengan%20Kios%20Gym`;

// ─── Inject responsive CSS ────────────────────────────────────────────────────
const STYLE_ID = 'landing-responsive';
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    .lp-hero { flex-direction: column-reverse !important; text-align: center; }
    .lp-hero-text { align-items: center !important; }
    .lp-hero-ctas { justify-content: center !important; }
    .lp-features-grid { grid-template-columns: 1fr !important; }
    .lp-slide-inner { flex-direction: column !important; align-items: center !important; }
    .lp-slide-text { text-align: center !important; }
    .lp-slide-tags { justify-content: center !important; }
    .lp-admin-inner { flex-direction: column !important; }
    .lp-member-inner { flex-direction: column !important; align-items: center !important; }
    .lp-member-text { text-align: center !important; }
    .lp-nav-cta { display: none !important; }
    .lp-bottom-bar { display: flex !important; }
    .lp-pain-grid { grid-template-columns: 1fr !important; }
    @media (min-width: 480px) {
      .lp-features-grid { grid-template-columns: 1fr 1fr !important; }
      .lp-pain-grid { grid-template-columns: 1fr 1fr 1fr !important; }
    }
    @media (min-width: 768px) {
      .lp-hero { flex-direction: row !important; text-align: left; }
      .lp-hero-text { align-items: flex-start !important; }
      .lp-hero-ctas { justify-content: flex-start !important; }
      .lp-features-grid { grid-template-columns: 1fr 1fr 1fr !important; }
      .lp-slide-inner { flex-direction: row !important; align-items: center !important; }
      .lp-slide-text { text-align: left !important; }
      .lp-slide-tags { justify-content: flex-start !important; }
      .lp-admin-inner { flex-direction: row !important; }
      .lp-member-inner { flex-direction: row !important; align-items: center !important; }
      .lp-member-text { text-align: left !important; }
      .lp-nav-cta { display: inline-flex !important; }
      .lp-bottom-bar { display: none !important; }
    }
  `;
  document.head.appendChild(s);
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────
function PhoneMockup({ variant = 'member' }) {
  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: '#1a1a1a',
      borderRadius: 40,
      padding: '12px 8px',
      boxShadow: '0 0 0 2px #333, 0 32px 64px rgba(0,0,0,0.6), 0 0 60px rgba(190,254,0,0.12)',
      position: 'relative',
    }}>
      {/* Notch */}
      <div style={{ width: 60, height: 8, background: '#111', borderRadius: 4, margin: '0 auto 10px' }} />
      {/* Screen */}
      <div style={{
        background: 'linear-gradient(160deg, #0d1117 0%, #0f2027 50%, #111827 100%)',
        borderRadius: 28,
        overflow: 'hidden',
        minHeight: 380,
        padding: '14px 12px',
      }}>
        {variant === 'member' ? <MemberScreenContent /> : <ScanScreenContent />}
      </div>
      {/* Home bar */}
      <div style={{ width: 60, height: 4, background: '#333', borderRadius: 2, margin: '10px auto 0' }} />
    </div>
  );
}

function MemberScreenContent() {
  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ color: '#BEFE00', fontSize: 11, fontWeight: 700, fontFamily: 'Impact, sans-serif', letterSpacing: 1 }}>KIOS GYM</span>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(190,254,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👤</div>
      </div>
      {/* Greeting card */}
      <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 10px', marginBottom: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>Selamat datang 👋</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Budi Santoso</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>● AKTIF</span>
          <span style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', fontSize: 9, padding: '2px 7px', borderRadius: 99 }}>Paket 1 Bulan</span>
        </div>
      </div>
      {/* Check-in button */}
      <button style={{ width: '100%', padding: '10px', background: '#BEFE00', color: '#1a1a1a', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 12, cursor: 'default' }}>
        ✓ ABSENSI SEKARANG
      </button>
      {/* History */}
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Riwayat Kehadiran</div>
      {[['Hari ini', '09:01'], ['Kemarin', '08:45'], ['2 hari lalu', '09:22']].map(([day, time]) => (
        <div key={day} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>
          <span>✓ {day}</span><span style={{ color: '#BEFE00' }}>{time}</span>
        </div>
      ))}
    </>
  );
}

function ScanScreenContent() {
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 10, fontFamily: 'Impact, sans-serif', letterSpacing: 0.5 }}>KIOS GYM — Scan</div>
      {/* Camera viewfinder */}
      <div style={{ background: '#000', borderRadius: 10, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(190,254,0,0.08) 0%, transparent 60%)' }} />
        {/* Corner markers */}
        {[['top:8px','left:8px'], ['top:8px','right:8px'], ['bottom:8px','left:8px'], ['bottom:8px','right:8px']].map((pos, i) => {
          const [v, h] = pos;
          const [vDir] = v.split(':');
          const [hDir] = h.split(':');
          return (
            <div key={i} style={{
              position: 'absolute', [vDir]: 8, [hDir]: 8, width: 14, height: 14,
              borderTop: vDir === 'top' ? '2px solid #BEFE00' : 'none',
              borderBottom: vDir === 'bottom' ? '2px solid #BEFE00' : 'none',
              borderLeft: hDir === 'left' ? '2px solid #BEFE00' : 'none',
              borderRight: hDir === 'right' ? '2px solid #BEFE00' : 'none',
            }} />
          );
        })}
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center', zIndex: 1 }}>Arahkan kamera ke QR</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Scan otomatis saat QR terdeteksi</div>
    </>
  );
}

// ─── Tablet Mockup ────────────────────────────────────────────────────────────
function TabletMockup() {
  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: '#1a1a1a',
      borderRadius: 20,
      padding: '10px 8px',
      boxShadow: '0 0 0 2px #333, 0 32px 64px rgba(0,0,0,0.6), 0 0 60px rgba(190,254,0,0.1)',
    }}>
      <div style={{ width: 30, height: 5, background: '#333', borderRadius: 3, margin: '0 auto 8px' }} />
      <div style={{ background: 'linear-gradient(160deg, #0d1117, #111827)', borderRadius: 14, overflow: 'hidden', padding: '12px', minHeight: 200 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8, fontFamily: 'Impact, sans-serif', letterSpacing: 0.5 }}>KIOS GYM — Kiosk</div>
        <div style={{ background: '#000', borderRadius: 8, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(190,254,0,0.06), transparent)' }} />
          {[['top:6px','left:6px'],['top:6px','right:6px'],['bottom:6px','left:6px'],['bottom:6px','right:6px']].map((pos, i) => {
            const [v, h] = pos;
            const [vDir] = v.split(':');
            const [hDir] = h.split(':');
            return <div key={i} style={{ position: 'absolute', [vDir]: 6, [hDir]: 6, width: 10, height: 10, borderTop: vDir === 'top' ? '2px solid #BEFE00' : 'none', borderBottom: vDir === 'bottom' ? '2px solid #BEFE00' : 'none', borderLeft: hDir === 'left' ? '2px solid #BEFE00' : 'none', borderRight: hDir === 'right' ? '2px solid #BEFE00' : 'none' }} />;
          })}
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', zIndex: 1 }}>📷 Kamera aktif</div>
        </div>
        <div style={{ background: 'rgba(190,254,0,0.12)', border: '1px solid rgba(190,254,0,0.3)', borderRadius: 6, padding: '6px 10px', textAlign: 'center', fontSize: 9, color: '#BEFE00', fontWeight: 700 }}>✓ SCAN OTOMATIS</div>
      </div>
    </div>
  );
}

// ─── Browser / Admin Mockup ───────────────────────────────────────────────────
function BrowserMockup({ compact = false }) {
  const rows = [
    { name: 'Budi Santoso', time: '09:01', pkg: 'Paket 1 Bulan' },
    { name: 'Siti Rahayu', time: '09:03', pkg: 'Paket 3 Bulan' },
    { name: 'Agus Kurniawan', time: '09:07', pkg: 'Paket 1 Bulan' },
    { name: 'Dewi Susanti', time: '09:15', pkg: 'Paket 6 Bulan' },
  ];
  return (
    <div style={{ width: '100%', maxWidth: compact ? 320 : 640, borderRadius: 12, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', flexShrink: 0 }}>
      {/* Chrome bar */}
      <div style={{ background: '#f1f5f9', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 6, padding: '3px 10px', fontSize: 10, color: '#64748b', textAlign: 'center' }}>kiosgym.com/admin</div>
      </div>
      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#BEFE00', fontSize: 11, fontWeight: 700, fontFamily: 'Impact, sans-serif' }}>KIOS GYM</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>GYM ADMIN</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 5, padding: '3px 8px', fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>⚙</div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 5, padding: '3px 8px', fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>↩ Kiosk</div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '2px solid #e2e8f0', display: 'flex', padding: '0 16px' }}>
        {['Absensi', 'Member', 'Staff', 'Paket'].map((tab, i) => (
          <div key={tab} style={{ padding: '8px 14px', fontSize: 11, color: i === 0 ? '#1a1a2e' : '#94a3b8', fontWeight: i === 0 ? 700 : 400, borderBottom: i === 0 ? '2px solid #BEFE00' : 'none', marginBottom: -2 }}>{tab}</div>
        ))}
      </div>
      {/* Toolbar */}
      <div style={{ background: '#fff', padding: '8px 16px', display: 'flex', gap: 8 }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 10, color: '#475569' }}>📅 Hari ini</div>
        <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 10, color: '#94a3b8' }}>🔍 Cari member...</div>
      </div>
      {/* Table */}
      <div style={{ background: '#fff' }}>
        {rows.slice(0, compact ? 3 : 4).map((row) => (
          <div key={row.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{row.name}</div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>{row.pkg}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{row.time}</div>
          </div>
        ))}
        <div style={{ padding: '8px 16px', background: '#f8fafc', textAlign: 'center', fontSize: 9, color: '#94a3b8' }}>+ 42 kehadiran lainnya hari ini</div>
      </div>
    </div>
  );
}

// ─── Laptop Mockup ────────────────────────────────────────────────────────────
function LaptopMockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      {/* Screen bezel */}
      <div style={{ background: '#1a1a1a', borderRadius: '12px 12px 0 0', padding: '8px 8px 4px', width: 300, boxShadow: '0 0 0 1px #333' }}>
        <div style={{ borderRadius: 6, overflow: 'hidden' }}>
          <BrowserMockup compact />
        </div>
      </div>
      {/* Keyboard base */}
      <div style={{ width: 320, height: 16, background: 'linear-gradient(180deg, #2a2a2a, #1a1a1a)', borderRadius: '0 0 8px 8px', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
        <div style={{ width: 60, height: 4, background: '#333', borderRadius: 2, margin: '6px auto 0' }} />
      </div>
      <div style={{ width: 340, height: 6, background: '#111', borderRadius: '0 0 6px 6px' }} />
    </div>
  );
}

// ─── QR Print Illustration ────────────────────────────────────────────────────
function QrPrintIllustration() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <PhoneMockup variant="scan" />
      {/* Printed QR sticker */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.4)', textAlign: 'center', width: 90 }}>
        {/* Simple QR-like grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1.5, marginBottom: 6 }}>
          {Array.from({ length: 49 }).map((_, i) => {
            const corners = [0,1,2,7,8,9,14,15,16,32,33,34,39,40,41,46,47,48];
            const fill = corners.includes(i) || (i % 3 === 0 && i > 18 && i < 30) || i === 24;
            return <div key={i} style={{ aspectRatio: '1', background: fill ? '#1a1a1a' : '#fff', borderRadius: 1 }} />;
          })}
        </div>
        <div style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>SCAN UNTUK ABSEN</div>
        <div style={{ fontSize: 7, color: '#94a3b8', marginTop: 2 }}>KIOS GYM</div>
      </div>
    </div>
  );
}

// ─── Carousel ─────────────────────────────────────────────────────────────────
function VariantsCarousel() {
  const [slide, setSlide] = useState(0);
  const timerRef = useRef(null);
  const { t } = useTranslation();

  const slides = [
    {
      device: <QrPrintIllustration />,
      titleKey: 'landing.variants.slides.0.title',
      subKey: 'landing.variants.slides.0.sub',
      descKey: 'landing.variants.slides.0.desc',
      tagsKey: 'landing.variants.slides.0.tags',
    },
    {
      device: <TabletMockup />,
      titleKey: 'landing.variants.slides.1.title',
      subKey: 'landing.variants.slides.1.sub',
      descKey: 'landing.variants.slides.1.desc',
      tagsKey: 'landing.variants.slides.1.tags',
    },
    {
      device: <LaptopMockup />,
      titleKey: 'landing.variants.slides.2.title',
      subKey: 'landing.variants.slides.2.sub',
      descKey: 'landing.variants.slides.2.desc',
      tagsKey: 'landing.variants.slides.2.tags',
    },
  ];

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % 3), 4000);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const goTo = (i) => { setSlide(i); startTimer(); };

  const tags = [
    ['Tanpa Kamera Kiosk', 'Biaya Paling Rendah', 'Setup 5 Menit'],
    ['Auto-Scan Kamera', 'Hands-Free', 'Tampilan Profesional'],
    ['Layar Besar', 'Webcam Biasa', 'Cocok untuk Front Desk'],
  ];

  const titles = [
    [t('landing.variants.slides.0.title'), t('landing.variants.slides.0.sub'), t('landing.variants.slides.0.desc')],
    [t('landing.variants.slides.1.title'), t('landing.variants.slides.1.sub'), t('landing.variants.slides.1.desc')],
    [t('landing.variants.slides.2.title'), t('landing.variants.slides.2.sub'), t('landing.variants.slides.2.desc')],
  ];

  return (
    <div style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)', transform: `translateX(-${slide * 100}%)` }}>
        {slides.map((s, i) => (
          <div key={i} style={{ minWidth: '100%', padding: '0 4px' }}>
            <div className="lp-slide-inner" style={{ display: 'flex', gap: 48, alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
              <div style={{ flexShrink: 0 }}>{s.device}</div>
              <div className="lp-slide-text" style={{ maxWidth: 380 }}>
                <div style={{ display: 'inline-block', background: 'rgba(190,254,0,0.12)', color: '#BEFE00', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, marginBottom: 12, border: '1px solid rgba(190,254,0,0.25)' }}>
                  {titles[i][1]}
                </div>
                <h3 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: '#fff', marginBottom: 12, fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 0.5 }}>
                  {titles[i][0]}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
                  {titles[i][2]}
                </p>
                <div className="lp-slide-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {tags[i].map(tag => (
                    <span key={tag} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontSize: 12, padding: '4px 12px', borderRadius: 99 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
        {[0, 1, 2].map(i => (
          <button key={i} onClick={() => goTo(i)} style={{ width: i === slide ? 24 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: i === slide ? '#BEFE00' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s', padding: 0 }} />
        ))}
      </div>
      {/* Manual prev/next */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
        <button onClick={() => goTo((slide + 2) % 3)} style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13 }}>‹ Prev</button>
        <button onClick={() => goTo((slide + 1) % 3)} style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13 }}>Next ›</button>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const { t, lang, setLang } = useTranslation();

  // Default to Indonesian for landing page visitors
  useEffect(() => {
    if (!localStorage.getItem('lang')) setLang('id');
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('lp-features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const featureIcons = ['📷', '📦', '👥', '📊', '🏢', '🔌'];
  const features = [
    [t('landing.features.items.0.title'), t('landing.features.items.0.desc')],
    [t('landing.features.items.1.title'), t('landing.features.items.1.desc')],
    [t('landing.features.items.2.title'), t('landing.features.items.2.desc')],
    [t('landing.features.items.3.title'), t('landing.features.items.3.desc')],
    [t('landing.features.items.4.title'), t('landing.features.items.4.desc')],
    [t('landing.features.items.5.title'), t('landing.features.items.5.desc')],
  ];

  const painItems = [
    { icon: '📋', title: t('landing.pain.items.0.title'), desc: t('landing.pain.items.0.desc') },
    { icon: '⏰', title: t('landing.pain.items.1.title'), desc: t('landing.pain.items.1.desc') },
    { icon: '🏢', title: t('landing.pain.items.2.title'), desc: t('landing.pain.items.2.desc') },
  ];

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowX: 'hidden' }}>

      {/* ── Sticky Navbar ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/kiosgym-icon.svg" alt="Kios Gym" style={{ height: 28, width: 'auto' }} />
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 0.5 }}>KIOS GYM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageSwitcher variant="light" />
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="lp-nav-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#BEFE00', color: '#1a1a1a', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            {t('landing.nav.cta')} →
          </a>
        </div>
      </nav>

      {/* ── 1. Hero ── */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0d1117 50%, #1a1a2e 100%)', padding: 'clamp(48px,8vw,96px) clamp(16px,5vw,80px)', minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', gap: 48, alignItems: 'center' }} className="lp-hero">
          {/* Text */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }} className="lp-hero-text">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(190,254,0,0.1)', border: '1px solid rgba(190,254,0,0.25)', borderRadius: 99, padding: '5px 14px', fontSize: 12, color: '#BEFE00', fontWeight: 700, marginBottom: 20 }}>
              ✦ Platform Manajemen Gym Digital
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20, fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 0.5 }}>
              Absensi Gym,<br />
              <span style={{ color: '#BEFE00' }}>Kini Lebih Pintar</span><br />
              &amp; Efisien
            </h1>
            <p style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
              {t('landing.hero.sub')}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="lp-hero-ctas">
              <a href={WA_LINK} target="_blank" rel="noreferrer" style={{ padding: '14px 28px', background: '#BEFE00', color: '#1a1a1a', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 32px rgba(190,254,0,0.3)' }}>
                {t('landing.hero.ctaPrimary')} →
              </a>
              <button onClick={scrollToFeatures} style={{ padding: '14px 28px', background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                {t('landing.hero.ctaSecondary')} ↓
              </button>
            </div>
            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 20, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['✓ Multi-tenant', '✓ Real-time', '✓ Tanpa Hardware Khusus'].map(b => (
                <span key={b} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{b}</span>
              ))}
            </div>
          </div>
          {/* Phone mockup */}
          <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <PhoneMockup variant="member" />
          </div>
        </div>
      </section>

      {/* ── 2. Pain Points ── */}
      <section style={{ background: '#f8fafc', padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, color: '#1a1a2e', marginBottom: 10, fontFamily: 'Impact, Arial Black, sans-serif' }}>
              {t('landing.pain.title')}
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', maxWidth: 440, margin: '0 auto' }}>
              Banyak gym masih menghadapi masalah yang sama — dan ada solusinya.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 20 }} className="lp-pain-grid">
            {painItems.map((item) => (
              <div key={item.title} style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Features ── */}
      <section id="lp-features" style={{ background: 'linear-gradient(180deg, #0f172a, #111827)', padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, color: '#fff', marginBottom: 10, fontFamily: 'Impact, Arial Black, sans-serif' }}>
              {t('landing.features.title')}
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 440, margin: '0 auto' }}>
              Satu platform, semua fitur yang dibutuhkan untuk manajemen gym modern.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 16 }} className="lp-features-grid">
            {features.map(([title, desc], i) => (
              <div key={title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '24px 20px', transition: 'border-color 0.2s' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{featureIcons[i]}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Implementation Variants Carousel ── */}
      <section style={{ background: 'linear-gradient(180deg, #111827, #0f172a)', padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, color: '#fff', marginBottom: 10, fontFamily: 'Impact, Arial Black, sans-serif' }}>
              {t('landing.variants.title')}
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 440, margin: '0 auto' }}>
              {t('landing.variants.sub')}
            </p>
          </div>
          <VariantsCarousel />
        </div>
      </section>

      {/* ── 5. Admin Dashboard Preview ── */}
      <section style={{ background: '#f8fafc', padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="lp-admin-inner" style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(15,23,42,0.06)', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 99, padding: '5px 14px', fontSize: 12, color: '#1a1a2e', fontWeight: 700, marginBottom: 16 }}>
                💻 Admin Dashboard
              </div>
              <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, color: '#1a1a2e', marginBottom: 14, fontFamily: 'Impact, Arial Black, sans-serif', lineHeight: 1.2 }}>
                {t('landing.adminPreview.title')}
              </h2>
              <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, marginBottom: 24, maxWidth: 420 }}>
                {t('landing.adminPreview.sub')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Absensi real-time dengan pencarian & filter tanggal', 'Kelola data member, perpanjang paket, & hapus akun', 'Manajemen staff dengan kontrol akses berbasis role', 'Konfigurasi paket harga, kode gym, & biaya daftar'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#475569' }}>
                    <span style={{ color: '#BEFE00', background: 'rgba(15,23,42,0.06)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <BrowserMockup />
          </div>
        </div>
      </section>

      {/* ── 6. Member Experience ── */}
      <section style={{ background: 'linear-gradient(180deg, #0f172a, #1a1a2e)', padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="lp-member-inner" style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
            <PhoneMockup variant="member" />
            <div style={{ flex: 1 }} className="lp-member-text">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(190,254,0,0.1)', border: '1px solid rgba(190,254,0,0.25)', borderRadius: 99, padding: '5px 14px', fontSize: 12, color: '#BEFE00', fontWeight: 700, marginBottom: 16 }}>
                📱 Member App
              </div>
              <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, color: '#fff', marginBottom: 14, fontFamily: 'Impact, Arial Black, sans-serif', lineHeight: 1.2 }}>
                {t('landing.memberPreview.title')}
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 24, maxWidth: 420 }}>
                {t('landing.memberPreview.sub')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Login dengan nomor HP atau kode gym', 'Cek status & tanggal expired membership kapan saja', 'Riwayat kehadiran lengkap dengan timestamp', 'Check-in mandiri tanpa perlu staff'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
                    <span style={{ color: '#BEFE00', background: 'rgba(190,254,0,0.1)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Final CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, #0d1117, #0f172a)', padding: 'clamp(64px,8vw,100px) clamp(16px,5vw,80px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(190,254,0,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4.5vw, 44px)', fontWeight: 900, color: '#fff', marginBottom: 16, fontFamily: 'Impact, Arial Black, sans-serif', lineHeight: 1.15 }}>
            {t('landing.cta.title')}
          </h2>
          <p style={{ fontSize: 'clamp(14px, 2vw, 17px)', color: 'rgba(255,255,255,0.6)', marginBottom: 36, lineHeight: 1.6 }}>
            {t('landing.cta.sub')}
          </p>
          <a href={WA_LINK} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 36px', background: '#BEFE00', color: '#1a1a1a', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 48px rgba(190,254,0,0.35)' }}>
            <span>💬</span> {t('landing.cta.btn')}
          </a>
        </div>
      </section>

      {/* ── 8. Footer ── */}
      <footer style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '28px clamp(16px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/kiosgym-icon.svg" alt="Kios Gym" style={{ height: 22, width: 'auto', opacity: 0.7 }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{t('landing.footer.copy')}</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href={WA_LINK} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>WhatsApp</a>
          </div>
        </div>
      </footer>

      {/* ── Sticky Mobile CTA Bar ── */}
      <div className="lp-bottom-bar" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99, background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', alignItems: 'center', gap: 10 }}>
        <a href={WA_LINK} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', background: '#BEFE00', color: '#1a1a1a', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          💬 {t('landing.nav.cta')}
        </a>
      </div>
      {/* Spacer for bottom bar on mobile */}
      <div className="lp-bottom-bar" style={{ height: 70, display: 'none' }} />

    </div>
  );
}
