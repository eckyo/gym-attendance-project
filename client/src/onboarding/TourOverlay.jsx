import { useEffect, useState, useCallback } from 'react';
import { useOnboarding } from './OnboardingContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { PAGE_TOURS } from './tourSteps.js';

const PADDING = 8; // spotlight padding around the target element

function getTargetRect(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function computeTooltipPosition(rect, placement, vw, vh) {
  const TOOLTIP_W = 280;
  const TOOLTIP_H = 160;
  const GAP = 12;

  let top, left;

  if (placement === 'bottom') {
    top = rect.bottom + PADDING + GAP;
    left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
  } else if (placement === 'top') {
    top = rect.top - PADDING - GAP - TOOLTIP_H;
    left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
  } else if (placement === 'left') {
    top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
    left = rect.left - PADDING - GAP - TOOLTIP_W;
  } else {
    // right
    top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
    left = rect.right + PADDING + GAP;
  }

  // Clamp within viewport
  left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));
  top = Math.max(12, Math.min(top, vh - TOOLTIP_H - 12));

  return { top, left };
}

export default function TourOverlay() {
  const { t } = useTranslation();
  const { activeTour, advanceTour, endTour, skipTour } = useOnboarding();
  const [targetRect, setTargetRect] = useState(null);

  const updateRect = useCallback(() => {
    if (!activeTour) {
      setTargetRect(null);
      return;
    }
    const steps = PAGE_TOURS[activeTour.tourId];
    if (!steps) return;
    const step = steps[activeTour.stepIndex];
    if (!step) return;

    const rect = getTargetRect(step.targetId);
    if (rect) {
      setTargetRect({ rect, step });
      // Scroll into view if needed
      const el = document.getElementById(step.targetId);
      if (el) {
        const r = el.getBoundingClientRect();
        const inView =
          r.top >= 0 &&
          r.bottom <= (window.innerHeight || document.documentElement.clientHeight);
        if (!inView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } else {
      // Target element not mounted yet — retry once
      const timer = setTimeout(() => {
        const r2 = getTargetRect(step.targetId);
        if (r2) setTargetRect({ rect: r2, step });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTour]);

  useEffect(() => {
    updateRect();
  }, [updateRect]);

  // Recompute on resize
  useEffect(() => {
    if (!activeTour) return;
    const observer = new ResizeObserver(updateRect);
    observer.observe(document.body);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [activeTour, updateRect]);

  if (!activeTour || !targetRect) return null;

  const { rect, step } = targetRect;
  const steps = PAGE_TOURS[activeTour.tourId];
  const totalSteps = steps.length;
  const currentIdx = activeTour.stepIndex;
  const isLast = currentIdx === totalSteps - 1;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Spotlight rectangle with padding
  const spot = {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  const tooltipPos = computeTooltipPosition(rect, step.placement, vw, vh);

  return (
    <>
      {/* Four overlay strips creating a "hole" spotlight effect */}
      <div style={{ ...s.strip, top: 0, left: 0, right: 0, height: Math.max(0, spot.top) }} />
      <div
        style={{
          ...s.strip,
          top: spot.top,
          left: 0,
          width: Math.max(0, spot.left),
          height: spot.height,
        }}
      />
      <div
        style={{
          ...s.strip,
          top: spot.top,
          left: spot.left + spot.width,
          right: 0,
          height: spot.height,
        }}
      />
      <div
        style={{
          ...s.strip,
          top: spot.top + spot.height,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Transparent blocker over the spotlight hole — prevents interacting with the target */}
      <div
        style={{
          position: 'fixed',
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          zIndex: 9998,
          pointerEvents: 'auto',
          cursor: 'default',
        }}
      />

      {/* Spotlight border ring */}
      <div
        style={{
          position: 'fixed',
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          border: '2px solid rgba(190,254,0,0.8)',
          borderRadius: 8,
          boxShadow: '0 0 0 4px rgba(190,254,0,0.15)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip bubble */}
      <div
        style={{
          ...s.tooltip,
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
      >
        <div style={s.stepCount}>
          {currentIdx + 1} / {totalSteps}
        </div>
        <div style={s.tooltipTitle}>{t(step.titleKey)}</div>
        <div style={s.tooltipBody}>{t(step.bodyKey)}</div>
        <div style={s.tooltipFooter}>
          <button
            style={s.skipTourBtn}
            onClick={() => skipTour(activeTour.tourId)}
          >
            {t('onboarding.tour.skip')}
          </button>
          <button
            style={s.nextBtn}
            onClick={isLast ? () => endTour(activeTour.tourId) : advanceTour}
          >
            {isLast ? t('onboarding.tour.gotIt') : t('onboarding.tour.next')}
          </button>
        </div>
      </div>
    </>
  );
}

const s = {
  strip: {
    position: 'fixed',
    background: 'rgba(0,0,0,0.55)',
    zIndex: 9998,
    pointerEvents: 'auto',
  },
  tooltip: {
    position: 'fixed',
    width: 280,
    background: '#fff',
    borderRadius: 12,
    padding: '16px 18px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
    zIndex: 9999,
  },
  stepCount: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 600,
    marginBottom: 6,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  tooltipTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 1.3,
  },
  tooltipBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 1.5,
    marginBottom: 14,
  },
  tooltipFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipTourBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
  },
  nextBtn: {
    background: '#BEFE00',
    border: 'none',
    borderRadius: 8,
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    cursor: 'pointer',
  },
};
