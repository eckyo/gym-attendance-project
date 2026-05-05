export const ACTIONS = {
  LOAD_START:       'LOAD_START',
  LOAD_SUCCESS:     'LOAD_SUCCESS',
  LOAD_ERROR:       'LOAD_ERROR',
  SET_XP_TOAST:     'SET_XP_TOAST',
  DISMISS_XP_TOAST: 'DISMISS_XP_TOAST',
  SET_RANK_UP:      'SET_RANK_UP',
  DISMISS_RANK_UP:  'DISMISS_RANK_UP',
  OPEN_GACHA:       'OPEN_GACHA',
  SET_GACHA_RESULT: 'SET_GACHA_RESULT',
  CLOSE_GACHA:      'CLOSE_GACHA',
  UPDATE_PENDING_SPINS: 'UPDATE_PENDING_SPINS',
};

export const initialState = {
  data: null,
  loading: false,
  error: null,
  xpToast: null,
  rankUp: null,
  showGachaModal: false,
  activeSpinId: null,
  gachaResult: null,
};

export function gamificationReducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD_START:
      return { ...state, loading: true, error: null };

    case ACTIONS.LOAD_SUCCESS:
      return { ...state, loading: false, data: action.payload };

    case ACTIONS.LOAD_ERROR:
      return { ...state, loading: false, error: action.payload };

    case ACTIONS.SET_XP_TOAST:
      return { ...state, xpToast: action.payload };

    case ACTIONS.DISMISS_XP_TOAST:
      return { ...state, xpToast: null };

    case ACTIONS.SET_RANK_UP:
      return { ...state, rankUp: action.payload };

    case ACTIONS.DISMISS_RANK_UP:
      return { ...state, rankUp: null };

    case ACTIONS.OPEN_GACHA:
      return { ...state, showGachaModal: true, activeSpinId: action.payload, gachaResult: null };

    case ACTIONS.SET_GACHA_RESULT:
      return { ...state, gachaResult: action.payload };

    case ACTIONS.CLOSE_GACHA:
      return { ...state, showGachaModal: false, activeSpinId: null, gachaResult: null };

    case ACTIONS.UPDATE_PENDING_SPINS:
      return state.data
        ? { ...state, data: { ...state.data, pendingSpins: action.payload } }
        : state;

    default:
      return state;
  }
}
