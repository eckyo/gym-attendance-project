import { useContext } from 'react';
import { GamificationContext } from '../context/GamificationContext.jsx';

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used inside <GamificationProvider>');
  return ctx;
}
