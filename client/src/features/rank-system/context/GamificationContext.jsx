import { createContext, useReducer, useEffect, useCallback } from 'react';
import { gamificationReducer, initialState, ACTIONS } from './GamificationReducer.js';
import { fetchGamificationState, executeSpin } from '../api/gamification.js';

export const GamificationContext = createContext(null);

export function GamificationProvider({ children, token, memberId }) {
  const [state, dispatch] = useReducer(gamificationReducer, initialState);

  const loadState = useCallback(async () => {
    if (!token) return;
    dispatch({ type: ACTIONS.LOAD_START });
    try {
      const data = await fetchGamificationState(token);
      dispatch({ type: ACTIONS.LOAD_SUCCESS, payload: data });
    } catch (err) {
      dispatch({ type: ACTIONS.LOAD_ERROR, payload: err.message });
    }
  }, [token]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleCheckinResult = useCallback((gamiPayload) => {
    if (!gamiPayload) return;

    dispatch({
      type: ACTIONS.LOAD_SUCCESS,
      payload: {
        ...(state.data || {}),
        totalXp:               gamiPayload.newTotalXp,
        rank:                  gamiPayload.newRank,
        nextRank:              gamiPayload.nextRank,
        xpToNextRank:          gamiPayload.xpToNextRank,
        progressPct:           gamiPayload.progressPct,
        totalVisits:           gamiPayload.totalVisits,
        nextMilestone:         gamiPayload.nextMilestone,
        visitsToNextMilestone: gamiPayload.visitsToNextMilestone,
        pendingSpins:          gamiPayload.pendingSpins,
        pendingSpinsList:      gamiPayload.pendingSpinsList ?? (state.data?.pendingSpinsList ?? []),
      },
    });

    dispatch({ type: ACTIONS.SET_XP_TOAST, payload: {
      xpEarned: gamiPayload.xpEarned,
      breakdown: gamiPayload.breakdown,
    }});

    if (gamiPayload.rankedUp) {
      dispatch({ type: ACTIONS.SET_RANK_UP, payload: {
        fromRank: gamiPayload.previousRank,
        toRank:   gamiPayload.newRank,
      }});
    }
  }, [state.data]);

  const openGacha = useCallback((spinId) => {
    dispatch({ type: ACTIONS.OPEN_GACHA, payload: spinId });
  }, []);

  const performSpin = useCallback(async (spinId) => {
    try {
      const result = await executeSpin(token, spinId);
      dispatch({ type: ACTIONS.SET_GACHA_RESULT, payload: result });
      // Reload fresh state after spin so boost shows up
      loadState();
    } catch (err) {
      throw err;
    }
  }, [token, loadState]);

  const closeGacha = useCallback(() => {
    dispatch({ type: ACTIONS.CLOSE_GACHA });
  }, []);

  const dismissXpToast = useCallback(() => {
    dispatch({ type: ACTIONS.DISMISS_XP_TOAST });
  }, []);

  const dismissRankUp = useCallback(() => {
    dispatch({ type: ACTIONS.DISMISS_RANK_UP });
    // After rank-up is dismissed, reload to ensure data is fresh
    loadState();
  }, [loadState]);

  return (
    <GamificationContext.Provider value={{
      state,
      dispatch,
      loadState,
      handleCheckinResult,
      openGacha,
      performSpin,
      closeGacha,
      dismissXpToast,
      dismissRankUp,
    }}>
      {children}
    </GamificationContext.Provider>
  );
}
