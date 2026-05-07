import { useState, useEffect, useRef } from 'react';
import { useTranslation, LanguageSwitcher } from '../i18n/LanguageContext.jsx';
import { DemoRolePicker } from '../App.jsx';

const WA_NUMBER = '628131465088';
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=Halo%2C%20saya%20tertarik%20dengan%20Kios%20Gym`;

const IMAGES = {
  hero:               '/landing/hero-app.png',
  adminDashboard:     '/landing/admin-dashboard.png',
  memberFeature:      '/landing/member-feature.png',
  variantMobile:      '/landing/variant-mobile-qr.png',
  variantTablet:      '/landing/variant-tablet.png',
  variantLaptop:      '/landing/variant-laptop.png',
};

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
    .lp-member-inner { align-items: center !important; }
    .lp-nav-cta { display: none !important; }
    .lp-bottom-bar { display: flex !important; }
    .lp-pain-grid { grid-template-columns: 1fr !important; }
    @media (min-width: 480px) {
      .lp-features-grid { grid-template-columns: 1fr 1fr !important; }
    }
    @media (min-width: 768px) {
      .lp-pain-grid { grid-template-columns: 1fr 1fr 1fr !important; }
      .lp-hero { flex-direction: row !important; text-align: left; }
      .lp-hero-text { align-items: flex-start !important; }
      .lp-hero-ctas { justify-content: flex-start !important; }
      .lp-features-grid { grid-template-columns: 1fr 1fr 1fr !important; }
      .lp-slide-inner { flex-direction: row !important; align-items: center !important; }
      .lp-slide-text { text-align: left !important; }
      .lp-slide-tags { justify-content: flex-start !important; }
      .lp-admin-inner { flex-direction: row !important; }
      .lp-nav-cta { display: inline-flex !important; }
      .lp-bottom-bar { display: none !important; }
    }
  `;
  document.head.appendChild(s);
}

// ─── Placeholder Image ────────────────────────────────────────────────────────
function PlaceholderImg({ src, alt = '', style = {} }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{
        background: '#1e293b',
        border: '2px dashed rgba(190,254,0,0.25)',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
        ...style,
      }}>
        <span style={{ color: 'rgba(190,254,0,0.45)', fontSize: 11, padding: 16, textAlign: 'center', lineHeight: 1.6 }}>
          📁 {src}
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', ...style }}
    />
  );
}

// ─── Carousel ─────────────────────────────────────────────────────────────────
function VariantsCarousel() {
  const [slide, setSlide] = useState(0);
  const timerRef = useRef(null);
  const { t } = useTranslation();

  const slides = [
    {
      device: <PlaceholderImg src={IMAGES.variantMobile} alt="Mobile + QR" style={{ maxWidth: 600, width: '100%' }} />,
      titleKey: 'landing.variants.slides.0.title',
      subKey: 'landing.variants.slides.0.sub',
      descKey: 'landing.variants.slides.0.desc',
      tagsKey: 'landing.variants.slides.0.tags',
    },
    {
      device: <PlaceholderImg src={IMAGES.variantTablet} alt="Tablet Kiosk" style={{ maxWidth: 600, width: '100%' }} />,
      titleKey: 'landing.variants.slides.1.title',
      subKey: 'landing.variants.slides.1.sub',
      descKey: 'landing.variants.slides.1.desc',
      tagsKey: 'landing.variants.slides.1.tags',
    },
    {
      device: <PlaceholderImg src={IMAGES.variantLaptop} alt="Laptop + Webcam" style={{ maxWidth: 600, width: '100%' }} />,
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
            <div className="lp-slide-inner" style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>{s.device}</div>
              <div className="lp-slide-text" style={{ maxWidth: 560, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: 'rgba(190,254,0,0.12)', color: '#BEFE00', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, marginBottom: 12, border: '1px solid rgba(190,254,0,0.25)' }}>
                  {titles[i][1]}
                </div>
                <h3 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: '#fff', marginBottom: 12, fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 0.5 }}>
                  {titles[i][0]}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
                  {titles[i][2]}
                </p>
                <div className="lp-slide-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
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
  const [demoOpen, setDemoOpen] = useState(false);

  // Default to Indonesian for landing page visitors
  useEffect(() => {
    if (!localStorage.getItem('lang')) setLang('id');
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('lp-features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDemoStart = (data) => {
    const { token, role, gymName, expiresAt, isDemo } = data;
    if (role === 'admin') {
      localStorage.setItem('staffSession', JSON.stringify({ token, role, gymName, isDemo, expiresAt }));
      localStorage.setItem('adminPinUnlocked', token);
    } else {
      const member = { id: null, name: 'Demo Pengguna', gymId: null };
      localStorage.setItem('memberSession', JSON.stringify({ token, member, isDemo, expiresAt }));
    }
    window.location.href = '/';
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
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0d1117 50%, #1a1a2e 100%)', padding: 'clamp(48px,8vw,96px) clamp(16px,5vw,80px)', paddingTop: 'calc(clamp(48px,8vw,96px) + 56px)', minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', gap: 48, alignItems: 'center' }} className="lp-hero">
          {/* Text */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }} className="lp-hero-text">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(190,254,0,0.1)', border: '1px solid rgba(190,254,0,0.25)', borderRadius: 99, padding: '5px 14px', fontSize: 12, color: '#BEFE00', fontWeight: 700, marginBottom: 20 }}>
              ✦ Platform Manajemen Gym Digital
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 7vw, 96px)', fontWeight: 900, color: '#fff', lineHeight: 1.0, marginBottom: 20, fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 0.5 }}>
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
              <button onClick={() => setDemoOpen(true)} style={{ padding: '14px 28px', background: 'transparent', color: '#BEFE00', border: '1.5px solid rgba(190,254,0,0.4)', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                ⚡ {t('landing.demo.btn')}
              </button>
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
          {/* Hero app screenshot */}
          <div style={{ display: 'flex', justifyContent: 'center', flex: '0 1 auto', minWidth: 0 }}>
            <PlaceholderImg src={IMAGES.hero} alt="Kios Gym App" style={{ width: '100%', maxWidth: 560 }} />
          </div>
        </div>
      </section>

      {/* ── 2. Pain Points ── */}
      <section style={{ background: '#f8fafc', padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 56px)', fontWeight: 800, color: '#1a1a2e', marginBottom: 10, fontFamily: 'Impact, Arial Black, sans-serif' }}>
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
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 56px)', fontWeight: 800, color: '#fff', marginBottom: 10, fontFamily: 'Impact, Arial Black, sans-serif' }}>
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
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 56px)', fontWeight: 800, color: '#fff', marginBottom: 10, fontFamily: 'Impact, Arial Black, sans-serif' }}>
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
              <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 56px)', fontWeight: 800, color: '#1a1a2e', marginBottom: 14, fontFamily: 'Impact, Arial Black, sans-serif', lineHeight: 1.2 }}>
                {t('landing.adminPreview.title')}
              </h2>
              <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, marginBottom: 24, maxWidth: 420 }}>
                {t('landing.adminPreview.sub')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Absensi real-time dengan pencarian & filter tanggal', 'Kelola data member, perpanjang paket, & hapus akun', 'Manajemen staff dengan kontrol akses berbasis role', 'Konfigurasi paket harga, kode gym, & biaya daftar'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#475569' }}>
                    <span style={{ color: '#0f172a', background: '#BEFE00', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <PlaceholderImg src={IMAGES.adminDashboard} alt="Admin Dashboard" style={{ maxWidth: 580, width: '100%', height: 'auto' }} />
          </div>
        </div>
      </section>

      {/* ── 6. Member Experience ── */}
      <section style={{ background: 'linear-gradient(180deg, #0f172a, #1a1a2e)', padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="lp-member-inner" style={{ display: 'flex', flexDirection: 'column', gap: 48, alignItems: 'center' }}>
            {/* Single feature image */}
            <PlaceholderImg src={IMAGES.memberFeature} alt="Member App" style={{ width: '100%', maxWidth: 900 }} />
            <div style={{ width: '100%', maxWidth: 900 }} className="lp-member-text">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(190,254,0,0.1)', border: '1px solid rgba(190,254,0,0.25)', borderRadius: 99, padding: '5px 14px', fontSize: 12, color: '#BEFE00', fontWeight: 700, marginBottom: 16 }}>
                📱 Member App
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 56px)', fontWeight: 800, color: '#fff', marginBottom: 14, fontFamily: 'Impact, Arial Black, sans-serif', lineHeight: 1.2 }}>
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
              {/* Gamification group */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#BEFE00', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 }}>
                Gamification
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['🏆', 'Sistem peringkat: Pemula, Reguler, Veteran, Elite, Legenda'],
                  ['⚡', 'Kumpulkan XP tiap check-in & lihat progres naik level'],
                  ['🎁', 'Capai target kunjungan, buka hadiah & reward eksklusif'],
                  ['🚀', 'XP Boost dari reward — percepat progres anggotamu'],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
                    <span style={{ background: 'rgba(190,254,0,0.1)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12 }}>{icon}</span>
                    {text}
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
          <h2 style={{ fontSize: 'clamp(36px, 6vw, 80px)', fontWeight: 900, color: '#fff', marginBottom: 16, fontFamily: 'Impact, Arial Black, sans-serif', lineHeight: 1.15 }}>
            {t('landing.cta.title')}
          </h2>
          <p style={{ fontSize: 'clamp(14px, 2vw, 17px)', color: 'rgba(255,255,255,0.6)', marginBottom: 36, lineHeight: 1.6 }}>
            {t('landing.cta.sub')}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={WA_LINK} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 36px', background: '#BEFE00', color: '#1a1a1a', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 48px rgba(190,254,0,0.35)' }}>
              <span>💬</span> {t('landing.cta.btn')}
            </a>
            <button onClick={() => setDemoOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 36px', background: 'transparent', color: '#BEFE00', border: '2px solid rgba(190,254,0,0.4)', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              ⚡ {t('landing.demo.btn')}
            </button>
          </div>
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

      <DemoRolePicker
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        onStart={handleDemoStart}
      />
    </div>
  );
}
