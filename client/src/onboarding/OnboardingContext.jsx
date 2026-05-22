import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getOnboardingState,
  setOnboardingSetupType,
  completeOnboardingStep,
  dismissOnboardingChecklist,
  markOnboardingTourSeen,
  resetOnboardingSetup,
} from '../api/admin.js';
import { SETUP_STEPS, PAGE_TOURS, STAFF_VISIBLE_TOURS } from './tourSteps.js';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ token, role, isDemo = false, children }) {
  const [loading, setLoading] = useState(true);
  const [setupType, setSetupType] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [toursSeen, setToursSeen] = useState({});
  const [activeTour, setActiveTour] = useState(null); // { tourId, stepIndex }
  const [checklistCollapsed, setChecklistCollapsed] = useState(false);
  const [pendingTabNav, setPendingTabNav] = useState(null);

  // Track in-flight completeStep calls to avoid duplicate requests
  const completingSteps = useRef(new Set());

  useEffect(() => {
    if (!token) return;
    getOnboardingState(token)
      .then((data) => {
        setSetupType(data.setupType);
        setCompletedSteps(data.completedSteps || []);
        setChecklistDismissed(data.checklistDismissed || false);
        setToursSeen(data.toursSeen || {});

        // Auto-complete detectable steps from derived counts
        const toComplete = [];
        if (data.memberCount > 0) toComplete.push('add_members');
        if (data.staffCount > 0) toComplete.push('add_staff');
        if (data.gymCode) toComplete.push('set_gym_code');
        if (data.completedSteps?.includes('configure_packages') === false) {
          // packages always exist (1 default created at gym setup)
          toComplete.push('configure_packages');
        }

        toComplete
          .filter((id) => !(data.completedSteps || []).includes(id))
          .forEach((id) => silentCompleteStep(id, data.completedSteps || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const silentCompleteStep = useCallback(
    (stepId, existingSteps) => {
      if (existingSteps.includes(stepId)) return;
      if (completingSteps.current.has(stepId)) return;
      completingSteps.current.add(stepId);
      completeOnboardingStep(token, stepId)
        .then((data) => setCompletedSteps(data.completedSteps))
        .catch(() => {})
        .finally(() => completingSteps.current.delete(stepId));
    },
    [token]
  );

  const selectSetupType = useCallback(
    async (type) => {
      try {
        const data = await setOnboardingSetupType(token, type);
        setSetupType(data.setupType);
        setCompletedSteps(data.completedSteps);
      } catch {}
    },
    [token]
  );

  const completeStep = useCallback(
    (stepId) => {
      if (completedSteps.includes(stepId)) return;
      if (completingSteps.current.has(stepId)) return;
      completingSteps.current.add(stepId);
      completeOnboardingStep(token, stepId)
        .then((data) => setCompletedSteps(data.completedSteps))
        .catch(() => {})
        .finally(() => completingSteps.current.delete(stepId));
    },
    [token, completedSteps]
  );

  const dismissChecklist = useCallback(async () => {
    try {
      await dismissOnboardingChecklist(token);
      setChecklistDismissed(true);
    } catch {}
  }, [token]);

  const startTour = useCallback(
    (tourId) => {
      if (!PAGE_TOURS[tourId]) return;
      if (toursSeen[tourId]) return;
      if (role === 'staff' && !STAFF_VISIBLE_TOURS.has(tourId)) return;
      // Don't start tour while WelcomeModal is open (admin hasn't picked setup type yet)
      if (
        role === 'admin' &&
        setupType === null &&
        !sessionStorage.getItem('onboarding_wizard_skipped')
      )
        return;
      setActiveTour({ tourId, stepIndex: 0 });
    },
    [toursSeen, role, setupType]
  );

  const advanceTour = useCallback(() => {
    setActiveTour((prev) => {
      if (!prev) return null;
      const steps = PAGE_TOURS[prev.tourId];
      if (prev.stepIndex + 1 < steps.length) {
        return { ...prev, stepIndex: prev.stepIndex + 1 };
      }
      // Last step — mark as seen
      markOnboardingTourSeen(token, prev.tourId)
        .then((data) => setToursSeen(data.toursSeen))
        .catch(() => {});
      return null;
    });
  }, [token]);

  const endTour = useCallback(
    (tourId) => {
      setActiveTour(null);
      markOnboardingTourSeen(token, tourId)
        .then((data) => setToursSeen(data.toursSeen))
        .catch(() => {});
    },
    [token]
  );

  const skipTour = endTour;

  const toggleCollapsed = useCallback(() => {
    setChecklistCollapsed((c) => !c);
  }, []);

  const clearPendingTabNav = useCallback(() => {
    setPendingTabNav(null);
  }, []);

  const navigateToTab = useCallback((tab) => {
    setPendingTabNav(tab);
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      await resetOnboardingSetup(token);
      setSetupType(null);
      setCompletedSteps([]);
      setChecklistDismissed(false);
      setActiveTour(null);
    } catch {}
  }, [token]);

  const value = {
    loading,
    setupType,
    completedSteps,
    checklistDismissed,
    toursSeen,
    activeTour,
    checklistCollapsed,
    pendingTabNav,
    role,
    isDemo,
    selectSetupType,
    completeStep,
    dismissChecklist,
    startTour,
    advanceTour,
    endTour,
    skipTour,
    toggleCollapsed,
    clearPendingTabNav,
    navigateToTab,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
