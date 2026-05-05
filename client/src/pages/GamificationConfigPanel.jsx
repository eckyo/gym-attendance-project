import { useState, useEffect } from 'react';
import { getGamificationConfig, updateGamificationConfig } from '../api/superadmin.js';

const RANK_ORDER = ['rookie', 'regular', 'veteran', 'elite', 'legend'];
const RARITY_ORDER = ['common', 'rare', 'epic'];

function validateDraft(d) {
  const errors = [];

  const baseXp = Number(d.base_xp);
  if (!Number.isInteger(baseXp) || baseXp < 1 || baseXp > 10000)
    errors.push('Base XP must be an integer between 1 and 10,000');

  const maxMult = parseFloat(d.max_multiplier);
  if (isNaN(maxMult) || maxMult < 1.0 || maxMult > 10.0)
    errors.push('Max multiplier must be a number between 1.0 and 10.0');

  const rx = d.rank_xp_thresholds;
  let prev = 0;
  for (const rank of ['regular', 'veteran', 'elite', 'legend']) {
    const v = Number(rx[rank]);
    if (!Number.isInteger(v) || v <= 0)
      errors.push(`Rank threshold for ${rank} must be a positive integer`);
    else if (v <= prev)
      errors.push(`Rank thresholds must be strictly ascending (${rank} must be > ${prev})`);
    prev = Number.isInteger(v) ? v : prev;
  }

  for (const rank of RANK_ORDER) {
    const v = parseFloat(d.rank_multipliers[rank]);
    if (isNaN(v) || v < 1.0)
      errors.push(`Rank multiplier for ${rank} must be ≥ 1.0`);
  }

  const vm = d.visit_milestones;
  if (!Array.isArray(vm) || vm.length < 1 || vm.length > 20) {
    errors.push('Visit milestones must have between 1 and 20 entries');
  } else {
    let p = 0;
    for (let i = 0; i < vm.length; i++) {
      const v = Number(vm[i]);
      if (!Number.isInteger(v) || v <= 0)
        errors.push(`Visit milestone [${i + 1}] must be a positive integer`);
      else if (v <= p)
        errors.push('Visit milestones must be strictly ascending');
      p = Number.isInteger(v) ? v : p;
    }
  }

  const gt = d.gacha_table;
  if (!Array.isArray(gt) || gt.length !== 3) {
    errors.push('Gacha table must have exactly 3 entries');
  } else {
    const weightSum = gt.reduce((s, e) => s + (Number(e.weight) || 0), 0);
    if (Math.round(weightSum) !== 100)
      errors.push(`Gacha weights must sum to 100 (currently ${weightSum})`);
    for (const entry of gt) {
      if (parseFloat(entry.multiplier) <= 1.0)
        errors.push(`Gacha ${entry.rarity} multiplier must be > 1.0`);
      if (parseInt(entry.durationDays, 10) < 1)
        errors.push(`Gacha ${entry.rarity} duration must be ≥ 1 day`);
    }
  }

  return errors;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default function GamificationConfigPanel({ token }) {
  const [draft, setDraft] = useState(null);
  const [milestoneText, setMilestoneText] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [errors, setErrors] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getGamificationConfig(token)
      .then(row => {
        setDraft(normalizeDraft(row));
        setMilestoneText((row.visit_milestones || []).join(', '));
      })
      .catch(() => {});
  }, [token]);

  function normalizeDraft(row) {
    return {
      base_xp:            row.base_xp,
      max_multiplier:     parseFloat(row.max_multiplier),
      rank_xp_thresholds: { ...row.rank_xp_thresholds },
      rank_multipliers:   { ...row.rank_multipliers },
      visit_milestones:   [...(row.visit_milestones || [])],
      gacha_table:        deepClone(row.gacha_table || []),
    };
  }

  function setScalar(field, value) {
    setDraft(d => ({ ...d, [field]: value }));
  }

  function setRankThreshold(rank, value) {
    setDraft(d => ({ ...d, rank_xp_thresholds: { ...d.rank_xp_thresholds, [rank]: value } }));
  }

  function setRankMultiplier(rank, value) {
    setDraft(d => ({ ...d, rank_multipliers: { ...d.rank_multipliers, [rank]: value } }));
  }

  function setGachaField(rarity, field, value) {
    setDraft(d => ({
      ...d,
      gacha_table: d.gacha_table.map(e =>
        e.rarity === rarity ? { ...e, [field]: value } : e
      ),
    }));
  }

  function handleMilestoneBlur() {
    const parsed = milestoneText
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
    setDraft(d => ({ ...d, visit_milestones: parsed }));
  }

  async function handleSave() {
    const errs = validateDraft(draft);
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setSaving(true);
    try {
      const row = await updateGamificationConfig(token, {
        base_xp:            Number(draft.base_xp),
        max_multiplier:     parseFloat(draft.max_multiplier),
        rank_xp_thresholds: Object.fromEntries(
          Object.entries(draft.rank_xp_thresholds).map(([k, v]) => [k, Number(v)])
        ),
        rank_multipliers: Object.fromEntries(
          Object.entries(draft.rank_multipliers).map(([k, v]) => [k, parseFloat(v)])
        ),
        visit_milestones: draft.visit_milestones.map(Number),
        gacha_table: draft.gacha_table.map(e => ({
          rarity:      e.rarity,
          weight:      Number(e.weight),
          multiplier:  parseFloat(e.multiplier),
          durationDays: parseInt(e.durationDays, 10),
        })),
      });
      setDraft(normalizeDraft(row));
      setMilestoneText((row.visit_milestones || []).join(', '));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      setErrors([err.message || 'Failed to save config']);
    } finally {
      setSaving(false);
    }
  }

  const gachaWeightSum = draft
    ? draft.gacha_table.reduce((s, e) => s + (Number(e.weight) || 0), 0)
    : 0;

  return (
    <div style={p.panel}>
      {/* Header */}
      <div style={p.header} onClick={() => setOpen(o => !o)}>
        <div style={p.headerLeft}>
          <span style={p.headerTitle}>⚙ Gamification Config</span>
          <span style={p.headerSub}>XP rules, rank thresholds, milestones, gacha</span>
        </div>
        <span style={p.chevron}>{open ? '▲' : '▼'}</span>
      </div>

      {open && draft && (
        <div style={p.body}>

          {/* XP Basics */}
          <div style={p.sectionTitle}>XP Basics</div>
          <div style={p.row}>
            <div style={p.field}>
              <label style={p.label}>Base XP per check-in</label>
              <input
                style={p.input}
                type="number" min="1" max="10000"
                value={draft.base_xp}
                onChange={e => setScalar('base_xp', e.target.value)}
              />
            </div>
            <div style={p.field}>
              <label style={p.label}>Max multiplier cap</label>
              <input
                style={p.input}
                type="number" min="1.0" max="10.0" step="0.1"
                value={draft.max_multiplier}
                onChange={e => setScalar('max_multiplier', e.target.value)}
              />
            </div>
          </div>

          {/* Rank XP Thresholds */}
          <div style={p.sectionTitle}>Rank XP Thresholds</div>
          <div style={p.row}>
            <div style={p.field}>
              <label style={p.label}>Rookie (fixed)</label>
              <input style={{ ...p.input, ...p.inputReadonly }} value="0" readOnly />
            </div>
            {['regular', 'veteran', 'elite', 'legend'].map(rank => (
              <div key={rank} style={p.field}>
                <label style={p.label}>{rank.charAt(0).toUpperCase() + rank.slice(1)}</label>
                <input
                  style={p.input}
                  type="number" min="1"
                  value={draft.rank_xp_thresholds[rank] ?? ''}
                  onChange={e => setRankThreshold(rank, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Rank Multipliers */}
          <div style={p.sectionTitle}>Rank Multipliers</div>
          <div style={p.row}>
            {RANK_ORDER.map(rank => (
              <div key={rank} style={p.field}>
                <label style={p.label}>{rank.charAt(0).toUpperCase() + rank.slice(1)}</label>
                <input
                  style={p.input}
                  type="number" min="1.0" step="0.01"
                  value={draft.rank_multipliers[rank] ?? ''}
                  onChange={e => setRankMultiplier(rank, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Visit Milestones */}
          <div style={p.sectionTitle}>Visit Milestones</div>
          <div style={{ marginBottom: 8 }}>
            <label style={p.label}>Comma-separated visit counts</label>
            <input
              style={{ ...p.input, width: '100%', boxSizing: 'border-box', marginTop: 4 }}
              type="text"
              value={milestoneText}
              onChange={e => setMilestoneText(e.target.value)}
              onBlur={handleMilestoneBlur}
              placeholder="e.g. 10, 30, 60, 90, 120, 180, 240, 365"
            />
          </div>
          <div style={p.pills}>
            {draft.visit_milestones.map((m, i) => (
              <span key={i} style={p.pill}>Day {m}</span>
            ))}
          </div>

          {/* Gacha Table */}
          <div style={p.sectionTitle}>
            Gacha Rewards
            <span style={{ ...p.weightBadge, ...(Math.round(gachaWeightSum) === 100 ? p.weightOk : p.weightErr) }}>
              Weights: {gachaWeightSum}%
            </span>
          </div>
          <div style={p.gachaGrid}>
            <div style={p.gachaHead}>Rarity</div>
            <div style={p.gachaHead}>Weight (%)</div>
            <div style={p.gachaHead}>XP Multiplier</div>
            <div style={p.gachaHead}>Duration (days)</div>
            {RARITY_ORDER.map(rarity => {
              const entry = draft.gacha_table.find(e => e.rarity === rarity) || {};
              return (
                <>
                  <div key={rarity + '-label'} style={p.gachaLabel}>
                    <span style={{ ...p.rarityDot, background: RARITY_COLORS[rarity] }} />
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </div>
                  <input
                    key={rarity + '-w'}
                    style={p.gachaInput}
                    type="number" min="0" max="100"
                    value={entry.weight ?? ''}
                    onChange={e => setGachaField(rarity, 'weight', e.target.value)}
                  />
                  <input
                    key={rarity + '-m'}
                    style={p.gachaInput}
                    type="number" min="1.01" step="0.01"
                    value={entry.multiplier ?? ''}
                    onChange={e => setGachaField(rarity, 'multiplier', e.target.value)}
                  />
                  <input
                    key={rarity + '-d'}
                    style={p.gachaInput}
                    type="number" min="1"
                    value={entry.durationDays ?? ''}
                    onChange={e => setGachaField(rarity, 'durationDays', e.target.value)}
                  />
                </>
              );
            })}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div style={p.errorBox}>
              {errors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}

          {/* Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
            <button
              style={{ ...p.saveBtn, opacity: saving ? 0.6 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Config'}
            </button>
            {savedFlash && <span style={p.savedFlash}>✓ Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}

const RARITY_COLORS = { common: '#94a3b8', rare: '#3b82f6', epic: '#a855f7' };

const p = {
  panel: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
    marginTop: 28,
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '1px solid #f1f5f9',
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: 2 },
  headerTitle: { fontSize: 15, fontWeight: 700, color: '#1e293b' },
  headerSub: { fontSize: 12, color: '#94a3b8' },
  chevron: { fontSize: 12, color: '#94a3b8' },
  body: { padding: '20px 24px 28px' },
  sectionTitle: {
    fontSize: 12, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    marginTop: 24, marginBottom: 10,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  row: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 120px' },
  label: { fontSize: 12, color: '#475569', fontWeight: 600 },
  input: {
    padding: '8px 10px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 7,
    fontSize: 14,
    color: '#1e293b',
    outline: 'none',
    background: '#fff',
  },
  inputReadonly: { background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  pill: {
    background: '#f0fdf4', color: '#166534',
    border: '1px solid #bbf7d0',
    borderRadius: 99, padding: '2px 10px',
    fontSize: 12, fontWeight: 600,
  },
  weightBadge: {
    fontSize: 11, fontWeight: 700, borderRadius: 99,
    padding: '2px 8px', letterSpacing: 0,
  },
  weightOk: { background: '#dcfce7', color: '#166534' },
  weightErr: { background: '#fee2e2', color: '#991b1b' },
  gachaGrid: {
    display: 'grid',
    gridTemplateColumns: '120px 100px 130px 130px',
    gap: '6px 10px',
    alignItems: 'center',
    marginBottom: 4,
  },
  gachaHead: {
    fontSize: 11, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    paddingBottom: 4,
  },
  gachaLabel: {
    fontSize: 13, fontWeight: 600, color: '#1e293b',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  rarityDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  gachaInput: {
    padding: '7px 10px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 7,
    fontSize: 14,
    color: '#1e293b',
    outline: 'none',
    background: '#fff',
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 13, color: '#991b1b', marginTop: 16, lineHeight: 1.7,
  },
  saveBtn: {
    padding: '10px 24px',
    background: '#BEFE00',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  savedFlash: { fontSize: 13, color: '#16a34a', fontWeight: 600 },
};
