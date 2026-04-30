/* ════════════════════════════════════════════════════════
   app.js — SAATHI UI Controller
   Wires all DOM events, manages session state,
   orchestrates logic.js + api.js, renders the slip.
   ════════════════════════════════════════════════════════ */

'use strict';

/* ── SESSION STATE ──────────────────────────────────────── */
let sessionApiKey    = '';
let sessionFacility  = 'OPD Triage Station';
let tokenCounter     = 0;

/* ── PAIN DESCRIPTOR TABLE ──────────────────────────────── */
const PAIN_LABELS = [
  'No Pain', 'Minimal', 'Mild', 'Uncomfortable',
  'Moderate', 'Distressing', 'Intense',
  'Severe', 'Very Severe', 'Excruciating', 'Worst Possible',
];

/* ── DOM REFERENCES ─────────────────────────────────────── */
const $ = id => document.getElementById(id);

const DOM = {
  // Modal
  settingsOverlay:  $('settings-overlay'),
  geminiKey:        $('gemini-key'),
  facilityName:     $('facility-name'),
  toggleKeyBtn:     $('toggle-key-visibility'),
  startBtn:         $('start-btn'),
  settingsBtn:      $('settings-btn'),
  // App shell
  appShell:         $('app'),
  facilityBadge:    $('facility-badge'),
  liveTime:         $('live-time'),
  liveDate:         $('live-date'),
  tokenDisplay:     $('token-display'),
  patientCount:     $('patient-count'),
  // Inputs
  complaint:        $('chief-complaint'),
  spo2:             $('spo2'),
  sbp:              $('systolic-bp'),
  hr:               $('heart-rate'),
  temp:             $('temperature'),
  rr:               $('resp-rate'),
  painSlider:       $('pain-score'),
  painDisplay:      $('pain-display'),
  painDesc:         $('pain-desc'),
  // Slip
  slipEmpty:        $('slip-empty'),
  slipCard:         $('slip-card'),
  slipPriorityBand: $('slip-priority-band'),
  slipPriorityLbl:  $('slip-priority-label'),
  slipPriorityIcon: $('slip-priority-icon'),
  slipToken:        $('slip-token'),
  slipDate:         $('slip-date'),
  slipTime:         $('slip-time'),
  slipFacility:     $('slip-facility'),
  vitalsSummary:    $('vitals-summary'),
  slipComplaint:    $('slip-complaint'),
  slipAiText:       $('slip-ai-text'),
  slipOverride:     $('slip-override'),
  slipDiagnoses:    $('slip-diagnoses'),
  // Buttons
  triageBtn:        $('triage-btn'),
  printBtn:         $('print-btn'),
  newPatientBtn:    $('new-patient-btn'),
  // Loading
  loadingOverlay:   $('loading-overlay'),
};

/* ══════════════════════════════════════════════════════════
   CLOCK
   ══════════════════════════════════════════════════════════ */
function updateClock() {
  const now = new Date();
  DOM.liveTime.textContent = now.toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  DOM.liveDate.textContent = now.toLocaleDateString('en-PK', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
setInterval(updateClock, 1000);
updateClock();

/* ══════════════════════════════════════════════════════════
   SETTINGS MODAL
   ══════════════════════════════════════════════════════════ */
DOM.toggleKeyBtn.addEventListener('click', () => {
  const isHidden = DOM.geminiKey.type === 'password';
  DOM.geminiKey.type = isHidden ? 'text' : 'password';
  DOM.toggleKeyBtn.setAttribute('aria-label', isHidden ? 'Hide key' : 'Show key');
});

DOM.startBtn.addEventListener('click', () => {
  sessionApiKey   = DOM.geminiKey.value.trim();
  sessionFacility = DOM.facilityName.value.trim() || 'OPD Triage Station';
  DOM.facilityBadge.textContent = sessionFacility;
  DOM.slipFacility.textContent  = sessionFacility;
  openApp();
});

DOM.settingsBtn.addEventListener('click', () => {
  DOM.settingsOverlay.classList.add('active');
  DOM.settingsOverlay.classList.remove('hidden');
  DOM.appShell.classList.add('hidden');
});

function openApp() {
  DOM.settingsOverlay.classList.remove('active');
  DOM.settingsOverlay.classList.add('hidden');
  DOM.appShell.classList.remove('hidden');
  initSession();
}

/* ══════════════════════════════════════════════════════════
   SESSION / TOKEN
   ══════════════════════════════════════════════════════════ */
function initSession() {
  const stored = parseInt(sessionStorage.getItem('saathi_token') || '0', 10);
  tokenCounter = stored;
  updateTokenBar();
}

function incrementToken() {
  tokenCounter++;
  sessionStorage.setItem('saathi_token', String(tokenCounter));
  updateTokenBar();
}

function updateTokenBar() {
  DOM.patientCount.textContent = tokenCounter;
  DOM.tokenDisplay.textContent = `#${String(tokenCounter + 1).padStart(3, '0')}`;
}

/* ══════════════════════════════════════════════════════════
   PAIN SLIDER
   ══════════════════════════════════════════════════════════ */
DOM.painSlider.addEventListener('input', syncPainDisplay);

function syncPainDisplay() {
  const val = parseInt(DOM.painSlider.value, 10);
  DOM.painDisplay.textContent = val;
  DOM.painDesc.textContent    = PAIN_LABELS[val] || '';
  DOM.painDesc.style.color    =
    val >= 8 ? 'var(--red-vivid)'   :
    val >= 4 ? 'var(--amber-vivid)' :
               'var(--green-vivid)';
}

/* ══════════════════════════════════════════════════════════
   COLLECT INPUTS
   ══════════════════════════════════════════════════════════ */
function collectInputs() {
  return {
    complaint:   DOM.complaint.value.trim(),
    spo2:        DOM.spo2.value,
    sbp:         DOM.sbp.value,
    hr:          DOM.hr.value,
    temp:        DOM.temp.value,
    rr:          DOM.rr.value,
    avpu:        document.querySelector('input[name="avpu"]:checked')?.value        || 'A',
    mobility:    document.querySelector('input[name="mobility"]:checked')?.value    || 'walking',
    vision:      document.querySelector('input[name="vision"]:checked')?.value      || 'none',
    injurySite:  document.querySelector('input[name="injury-site"]:checked')?.value || 'none',
    pain:        DOM.painSlider.value,
  };
}

/* ══════════════════════════════════════════════════════════
   MAIN TRIAGE FLOW

   Gate logic:
   ┌─────────────────────┬──────────────────────────────────┐
   │ Hard rule result    │ AI behaviour                     │
   ├─────────────────────┼──────────────────────────────────┤
   │ IMMEDIATE           │ Skip — patient needs care NOW    │
   │ URGENT              │ Run AI — can upgrade → IMMEDIATE │
   │ ROUTINE             │ Run AI — can upgrade → IMMEDIATE │
   └─────────────────────┴──────────────────────────────────┘
   AI can only ever UPGRADE priority, never downgrade.
   ══════════════════════════════════════════════════════════ */
DOM.triageBtn.addEventListener('click', async () => {
  const inputs     = collectInputs();
  const hardResult = runHardRules(inputs);

  let finalLevel      = hardResult.level;
  let aiReasoning     = '';
  let aiDiagnoses     = [];
  let overrideApplied = false;

  if (hardResult.level !== 'IMMEDIATE') {
    if (sessionApiKey) {
      DOM.loadingOverlay.classList.remove('hidden');
      try {
        const aiResult = await analyzeComplaint(inputs.complaint, sessionApiKey);
        aiReasoning = aiResult.reasoning;
        aiDiagnoses = aiResult.diagnoses || [];

        if (aiResult.isEmergency) {
          finalLevel      = 'IMMEDIATE';
          overrideApplied = true;
        }
      } catch (err) {
        aiReasoning = 'Unexpected error during AI analysis — hard-rule result applied.';
        console.error('[SAATHI] Unhandled AI error:', err);
      } finally {
        DOM.loadingOverlay.classList.add('hidden');
      }
    } else {
      aiReasoning = 'No Groq API key provided — AI analysis skipped. Hard-rule result applied.';
    }
  } else {
    const flagSummary = hardResult.flags.map(f => f.label).join('; ');
    aiReasoning = `AI analysis skipped — critical hard-rule trigger(s): ${flagSummary}. Immediate clinical attention required.`;
  }

  renderSlip(inputs, hardResult, finalLevel, aiReasoning, aiDiagnoses, overrideApplied);
  incrementToken();
});

/* ══════════════════════════════════════════════════════════
   RENDER TRIAGE SLIP
   ══════════════════════════════════════════════════════════ */
function renderSlip(inputs, hardResult, finalLevel, aiReasoning, aiDiagnoses, overrideApplied) {
  const now = new Date();

  /* Priority band */
  DOM.slipPriorityBand.className   = `slip-header-band ${priorityClass(finalLevel)}`;
  DOM.slipPriorityLbl.textContent  = finalLevel;
  DOM.slipPriorityIcon.textContent =
    finalLevel === 'IMMEDIATE' ? '🔴' :
    finalLevel === 'URGENT'    ? '🟡' : '🟢';

  /* Meta row */
  DOM.slipToken.textContent = `#${String(tokenCounter + 1).padStart(3, '0')}`;
  DOM.slipDate.textContent  = now.toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  DOM.slipTime.textContent  = now.toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  /* Vitals chips */
  DOM.vitalsSummary.innerHTML = '';
  const VITAL_ORDER = [
    'SpO₂', 'Systolic BP', 'Heart Rate',
    'Temperature', 'Resp. Rate', 'AVPU',
    'Mobility', 'Vision', 'Injury',
  ];
  VITAL_ORDER.forEach(key => {
    const entry = hardResult.vitalResults[key];
    if (!entry) return;
    const chip = document.createElement('div');
    chip.className = `vital-summary-chip ${chipClass(entry.level)}`;
    chip.innerHTML =
      `<span class="vsn">${key}</span>` +
      `<span class="vsv">${entry.value}</span>`;
    DOM.vitalsSummary.appendChild(chip);
  });

  /* Chief complaint */
  DOM.slipComplaint.textContent = inputs.complaint || '(not recorded)';

  /* AI reasoning */
  DOM.slipAiText.textContent = aiReasoning || 'No AI reasoning generated.';

  /* Override badge */
  DOM.slipOverride.textContent = overrideApplied ? 'YES' : 'NO';
  DOM.slipOverride.className   = `override-val${overrideApplied ? ' yes' : ''}`;

  /* AI Diagnoses */
  DOM.slipDiagnoses.innerHTML = '';
  if (aiDiagnoses.length > 0) {
    aiDiagnoses.forEach((dx, i) => {
      const chip = document.createElement('div');
      chip.className = 'diagnosis-chip';
      chip.innerHTML =
        `<span class="diagnosis-rank">${i + 1}</span>` +
        `<span class="diagnosis-label">${dx}</span>`;
      DOM.slipDiagnoses.appendChild(chip);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'diagnosis-empty';
    empty.textContent = sessionApiKey
      ? 'No diagnoses generated.'
      : 'Add a Groq API key to enable AI diagnoses.';
    DOM.slipDiagnoses.appendChild(empty);
  }

  /* Show slip */
  DOM.slipEmpty.classList.add('hidden');
  DOM.slipCard.classList.remove('hidden');
  DOM.slipCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════════════════════════
   NEW PATIENT (form reset)
   ══════════════════════════════════════════════════════════ */
DOM.newPatientBtn.addEventListener('click', resetForm);

function resetForm() {
  DOM.complaint.value = '';
  DOM.spo2.value      = '';
  DOM.sbp.value       = '';
  DOM.hr.value        = '';
  DOM.temp.value      = '';
  DOM.rr.value        = '';

  const radioDefaults = {
    'avpu':         'A',
    'mobility':     'walking',
    'vision':       'none',
    'injury-site':  'none',
  };
  Object.entries(radioDefaults).forEach(([name, val]) => {
    const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
    if (el) el.checked = true;
  });

  DOM.painSlider.value = 0;
  syncPainDisplay();

  DOM.slipCard.classList.add('hidden');
  DOM.slipEmpty.classList.remove('hidden');
  updateTokenBar();
  DOM.complaint.focus();
}

/* ══════════════════════════════════════════════════════════
   PRINT
   ══════════════════════════════════════════════════════════ */
DOM.printBtn.addEventListener('click', () => { window.print(); });

/* ══════════════════════════════════════════════════════════
   HELPER MAPS
   ══════════════════════════════════════════════════════════ */
function priorityClass(level) {
  return {
    IMMEDIATE: 'priority-immediate',
    URGENT:    'priority-urgent',
    ROUTINE:   'priority-routine',
  }[level] || '';
}

function chipClass(level) {
  return {
    IMMEDIATE: 'chip-red',
    URGENT:    'chip-yellow',
    ROUTINE:   'chip-green',
  }[level] || '';
}
