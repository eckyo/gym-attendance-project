import { useState } from 'react';
import { useOnboarding } from './OnboardingContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { SETUP_STEPS } from './tourSteps.js';

export default function SetupChecklist() {
  const { t } = useTranslation();
  const {
    role,
    setupType,
    completedSteps,
    checklistDismissed,
    checklistCollapsed,
    completeStep,
    dismissChecklist,
    toggleCollapsed,
    navigateToTab,
  } = useOnboarding();

  const [confirmDismiss, setConfirmDismiss] = useState(false);

  if (role !== 'admin' || !setupType || checklistDismissed) return null;

  const steps = SETUP_STEPS[setupType] || [];
  const doneCount = steps.filter((s) => completedSteps.includes(s.id)).length;
  const allDone = doneCount === steps.length;

  if (allDone && checklistCollapsed) return null;

  return (
    <div style={s.wrapper}>
      {checklistCollapsed ? (
        <button style={s.pill} onClick={toggleCollapsed}>
          <span style={s.pillCheck}>✓</span>
          <span style={s.pillText}>
            {t('onboarding.checklist.progress', { done: doneCount, total: steps.length })}
          </span>
          <span style={s.pillExpand}>▲</span>
        </button>
      ) : (
        <div style={s.card}>
          {/* Header */}
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>{t('onboarding.checklist.title')}</span>
            <div style={s.headerActions}>
              <button style={s.collapseBtn} onClick={toggleCollapsed} title="Collapse">
                ▼
              </button>
              {!confirmDismiss ? (
                <button
                  style={s.dismissBtn}
                  onClick={() => setConfirmDismiss(true)}
                  title={t('onboarding.checklist.dismiss')}
                >
                  ✕
                </button>
              ) : (
                <div style={s.confirmRow}>
                  <span style={s.confirmText}>{t('onboarding.checklist.confirmDismiss')}</span>
                  <button style={s.confirmYes} onClick={dismissChecklist}>
                    {t('onboarding.checklist.yes')}
                  </button>
                  <button style={s.confirmNo} onClick={() => setConfirmDismiss(false)}>
                    {t('onboarding.checklist.no')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div style={s.progressBar}>
            <div
              style={{
                ...s.progressFill,
                width: `${(doneCount / steps.length) * 100}%`,
              }}
            />
          </div>
          <div style={s.progressLabel}>
            {t('onboarding.checklist.progress', { done: doneCount, total: steps.length })}
          </div>

          {/* Steps */}
          <div style={s.stepList}>
            {steps.map((step) => {
              const done = completedSteps.includes(step.id);
              return (
                <div key={step.id} style={{ ...s.stepRow, opacity: done ? 0.6 : 1 }}>
                  <div style={{ ...s.checkbox, ...(done ? s.checkboxDone : {}) }}>
                    {done ? '✓' : ''}
                  </div>
                  <div style={s.stepContent}>
                    <div style={{ ...s.stepLabel, textDecoration: done ? 'line-through' : 'none' }}>
                      {t(step.labelKey)}
                    </div>
                    {!done && (
                      <div style={s.stepDesc}>{t(step.descKey)}</div>
                    )}
                    {!done && (
                      <div style={s.stepActions}>
                        {step.actionTab && (
                          <button
                            style={s.actionLink}
                            onClick={() => navigateToTab(step.actionTab)}
                          >
                            {t('onboarding.checklist.goTo')} →
                          </button>
                        )}
                        {step.isManual && (
                          <button
                            style={s.markDoneBtn}
                            onClick={() => completeStep(step.id)}
                          >
                            {t('onboarding.checklist.markDone')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {allDone && (
            <div style={s.allDoneBanner}>
              🎉 {t('onboarding.checklist.allDone')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  wrapper: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 300,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#BEFE00',
    color: '#0f172a',
    border: 'none',
    borderRadius: 24,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(190,254,0,0.35)',
  },
  pillCheck: {
    fontSize: 16,
    fontWeight: 900,
  },
  pillText: {},
  pillExpand: {
    fontSize: 10,
    opacity: 0.7,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    width: 320,
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 12px',
    borderBottom: '1px solid #f1f5f9',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  collapseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: 12,
    padding: '2px 4px',
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: 14,
    padding: '2px 4px',
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  confirmText: {
    fontSize: 12,
    color: '#64748b',
  },
  confirmYes: {
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmNo: {
    background: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 12,
    cursor: 'pointer',
  },
  progressBar: {
    height: 4,
    background: '#f1f5f9',
    margin: '0 16px',
  },
  progressFill: {
    height: '100%',
    background: '#BEFE00',
    borderRadius: 2,
    transition: 'width 0.4s ease',
  },
  progressLabel: {
    fontSize: 11,
    color: '#94a3b8',
    padding: '4px 16px 8px',
  },
  stepList: {
    padding: '4px 0 8px',
    maxHeight: 360,
    overflowY: 'auto',
  },
  stepRow: {
    display: 'flex',
    gap: 12,
    padding: '8px 16px',
    alignItems: 'flex-start',
    transition: 'opacity 0.2s',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    border: '2px solid #e2e8f0',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 900,
    marginTop: 1,
    color: '#0f172a',
  },
  checkboxDone: {
    background: '#BEFE00',
    border: '2px solid #BEFE00',
  },
  stepContent: {
    flex: 1,
    minWidth: 0,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.4,
    marginTop: 2,
  },
  stepActions: {
    display: 'flex',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  actionLink: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  markDoneBtn: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    color: '#475569',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '3px 8px',
  },
  allDoneBanner: {
    background: '#f0fdf4',
    borderTop: '1px solid #bbf7d0',
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#16a34a',
    textAlign: 'center',
  },
};
