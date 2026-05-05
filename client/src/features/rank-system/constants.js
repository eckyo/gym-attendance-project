export const RANKS = ['rookie', 'regular', 'veteran', 'elite', 'legend'];

export const RANK_META = {
  rookie:  { label: 'Rookie',  color: '#6B7280', glow: 'rgba(107,114,128,0.4)',  icon: '🥉' },
  regular: { label: 'Regular', color: '#22C55E', glow: 'rgba(34,197,94,0.4)',    icon: '🥈' },
  veteran: { label: 'Veteran', color: '#3B82F6', glow: 'rgba(59,130,246,0.4)',   icon: '🥇' },
  elite:   { label: 'Elite',   color: '#A855F7', glow: 'rgba(168,85,247,0.4)',   icon: '💎' },
  legend:  { label: 'Legend',  color: '#F59E0B', glow: 'rgba(245,158,11,0.4)',   icon: '👑' },
};

export const RANK_XP_THRESHOLDS = {
  rookie:  0,
  regular: 500,
  veteran: 2000,
  elite:   5000,
  legend:  12000,
};

export const RARITY_META = {
  common: { label: 'Common', color: '#6B7280', glow: 'rgba(107,114,128,0.6)' },
  rare:   { label: 'Rare',   color: '#3B82F6', glow: 'rgba(59,130,246,0.8)'  },
  epic:   { label: 'Epic',   color: '#A855F7', glow: 'rgba(168,85,247,0.9)'  },
};

export const GACHA_CLICK_COUNT = 5;

export const VISIT_MILESTONES = [10, 30, 60, 90, 120, 180, 240, 365];
