/* ════════════════════════════════════════════════════════
   logic.js — SAATHI Deterministic Triage Engine
   All hard rules. No network calls. Pure functions only.
   Priority hierarchy: IMMEDIATE > URGENT > ROUTINE
   ════════════════════════════════════════════════════════ */

const LEVEL_RANK = { IMMEDIATE: 3, URGENT: 2, ROUTINE: 1 };

/**
 * Evaluates a numeric value against an ordered rule list.
 * Returns the first matching rule's level, else ROUTINE.
 */
function scoreNumeric(value, rules) {
  if (value === null || value === undefined || value === '') return 'ROUTINE';
  const v = parseFloat(value);
  for (const rule of rules) {
    if (rule.condition(v)) return rule.level;
  }
  return 'ROUTINE';
}
/**
 * Master triage function.
 * @param {Object} inputs  Collected patient data from collectInputs()
 * @returns {{ level: string, flags: Array, vitalResults: Object }}
 */
function runHardRules(inputs) {
  const flags        = [];  // Triggered rule descriptions (for AI skip message)
  const vitalResults = {};  // Per-vital { level, value } for slip chips
  let   highestLevel = 'ROUTINE';

  /** Register one parameter's result */
  function register(key, displayValue, level, flagLabel) {
    vitalResults[key] = { level, value: displayValue };
    if (level !== 'ROUTINE' && flagLabel) {
      flags.push({ param: key, level, label: flagLabel });
    }
    if (LEVEL_RANK[level] > LEVEL_RANK[highestLevel]) {
      highestLevel = level;
    }
  }

  // ── SpO₂ ────────────────────────────────────────────
  const spo2      = inputs.spo2;
  const spo2Level = scoreNumeric(spo2, [
    { condition: v => v < 90, level: 'IMMEDIATE' },
    { condition: v => v < 95, level: 'URGENT'    },
  ]);
  register(
    'SpO₂',
    spo2 !== '' ? `${spo2}%` : '—',
    spo2Level,
    `SpO₂ ${parseFloat(spo2) < 90 ? 'critically low' : 'low'} (${spo2}%)`
  );

  // ── Systolic BP ──────────────────────────────────────
  const sbp      = inputs.sbp;
  const sbpLevel = scoreNumeric(sbp, [
    { condition: v => v > 180 || v < 90, level: 'IMMEDIATE' },
    { condition: v => v >= 160,          level: 'URGENT'    },
  ]);
  register(
    'Systolic BP',
    sbp !== '' ? `${sbp} mmHg` : '—',
    sbpLevel,
    `Systolic BP ${parseFloat(sbp) > 180 ? 'hypertensive crisis' : 'hypotension'} (${sbp} mmHg)`
  );

  // ── Heart Rate ───────────────────────────────────────
  const hr      = inputs.hr;
  const hrLevel = scoreNumeric(hr, [
    { condition: v => v > 130 || v < 40, level: 'IMMEDIATE' },
    { condition: v => v > 109,           level: 'URGENT'    },
  ]);
  register(
    'Heart Rate',
    hr !== '' ? `${hr} bpm` : '—',
    hrLevel,
    `Heart Rate ${parseFloat(hr) > 130 ? 'tachycardia' : 'bradycardia'} (${hr} bpm)`
  );

  // ── Temperature ──────────────────────────────────────
  const temp      = inputs.temp;
  const tempLevel = scoreNumeric(temp, [
    { condition: v => v > 41 || v < 35, level: 'IMMEDIATE' },
    { condition: v => v >= 38.5,        level: 'URGENT'    },
  ]);
  register(
    'Temperature',
    temp !== '' ? `${temp}°C` : '—',
    tempLevel,
    `Temperature ${parseFloat(temp) > 41 ? 'hyperpyrexia' : 'hypothermia'} (${temp}°C)`
  );

  // ── Respiratory Rate ─────────────────────────────────
  const rr      = inputs.rr;
  const rrLevel = scoreNumeric(rr, [
    { condition: v => v > 30 || v < 9, level: 'IMMEDIATE' },
    { condition: v => v > 20 || v < 12, level: 'URGENT'   },  // added v < 12
  ]);
  register(
    'Resp. Rate',
    rr !== '' ? `${rr}/min` : '—',
    rrLevel,
    `RR ${parseFloat(rr) > 30 ? 'severe tachypnoea' : 'apnoeic range'} (${rr}/min)`
  );

// DELETE the entire AVPU block in runHardRules() and REPLACE with:

const gcs      = inputs.gcsTotal;
const gcsLevel = gcs <= 8  ? 'IMMEDIATE'
               : gcs <= 12 ? 'URGENT'
               : 'ROUTINE';
register(
  'GCS',
  `${gcs}/15`,
  gcsLevel,
  gcs <= 8  ? `Severe impaired consciousness — GCS ${gcs}`
  : gcs <= 12 ? `Moderate impaired consciousness — GCS ${gcs}`
  : ''
);

  // ── Mobility ─────────────────────────────────────────
  const mobility      = inputs.mobility || 'walking';
  const mobilityLevel = mobility === 'assisted' ? 'URGENT' : 'ROUTINE';
  register(
    'Mobility',
    mobility === 'assisted' ? 'Stretcher/Assisted' : 'Walking unaided',
    mobilityLevel,
    'Patient unable to walk — arrived by stretcher or with assistance'
  );

  // ── Vision ───────────────────────────────────────────
  const vision    = inputs.vision || 'none';
  const visionMap = {
    none:        { level: 'ROUTINE',   display: 'Normal' },
    blurred:     { level: 'URGENT',    display: 'Blurred/Painful' },
    sudden_loss: { level: 'IMMEDIATE', display: 'Sudden Loss' },
  };
  const vr = visionMap[vision] || visionMap.none;
  register(
    'Vision',
    vr.display,
    vr.level,
    vision === 'sudden_loss'
      ? 'Sudden vision loss — possible stroke / retinal emergency'
      : 'Blurred or painful vision'
  );

  // ── Injury (H / N / C / A only) ─────────────────────
  const CRITICAL_SITES = ['head', 'neck', 'chest', 'abdomen'];
  const site  = inputs.injurySite || 'none';
  const pain  = parseInt(inputs.pain, 10) || 0;
  const siteLabel = site !== 'none'
    ? site.charAt(0).toUpperCase() + site.slice(1)
    : null;

  if (site !== 'none' && CRITICAL_SITES.includes(site)) {
    let injuryLevel, injuryFlag;
    if (pain >= 8) {
      injuryLevel = 'IMMEDIATE';
      injuryFlag  = `High-intensity injury: ${site}, pain ${pain}/10`;
    } else if (pain >= 4) {
      injuryLevel = 'URGENT';
      injuryFlag  = `Moderate injury: ${site}, pain ${pain}/10`;
    } else {
      // Pain 0–3 at a critical site → ROUTINE
      injuryLevel = 'ROUTINE';
      injuryFlag  = '';
    }
    register('Injury', `${siteLabel}: ${pain}/10`, injuryLevel, injuryFlag);
  } else {
    register('Injury', site !== 'none' ? `${siteLabel}: ${pain}/10` : '—', 'ROUTINE', '');
  }

  return { level: highestLevel, flags, vitalResults };
}
