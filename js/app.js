/* ════════════════════════════════════════════════════════
   app.js — SAATHI UI Controller
   ════════════════════════════════════════════════════════ */
'use strict';

let sessionApiKey   = '';
let sessionFacility = 'OPD Triage Station';
let tokenCounter    = 0;

const PAIN_LABELS = [
  'No Pain','Minimal','Mild','Uncomfortable','Moderate',
  'Distressing','Intense','Severe','Very Severe','Excruciating','Worst Possible',
];

const GCS_EYE_DESC    = { 4:'Spontaneous', 3:'To sound', 2:'To pain', 1:'None' };
const GCS_VERBAL_DESC = { 5:'Oriented', 4:'Confused', 3:'Words only', 2:'Sounds only', 1:'None' };
const GCS_MOTOR_DESC  = { 6:'Obeys commands', 5:'Localizes pain', 4:'Withdrawal', 3:'Abn. flexion', 2:'Extension', 1:'None' };

const $ = id => document.getElementById(id);

const DOM = {
  splash:           $('splash-screen'),
  settingsOverlay:  $('settings-overlay'),
  geminiKey:        $('gemini-key'),
  facilityName:     $('facility-name'),
  toggleKeyBtn:     $('toggle-key-visibility'),
  settingsBtn:      $('settings-btn'),
  settingsCloseBtn: $('settings-close-btn'),
  saveSettingsBtn:  $('save-settings-btn'),
  appShell:         $('app'),
  facilityBadge:    $('facility-badge'),
  liveTime:         $('live-time'),
  liveDate:         $('live-date'),
  tokenDisplay:     $('token-display'),
  patientCount:     $('patient-count'),
  complaint:        $('chief-complaint'),
  spo2:             $('spo2'),
  sbp:              $('systolic-bp'),
  hr:               $('heart-rate'),
  temp:             $('temperature'),
  rr:               $('resp-rate'),
  painSlider:       $('pain-score'),
  painDisplay:      $('pain-display'),
  painDesc:         $('pain-desc'),
  gcsEye:           $('gcs-eye'),
  gcsVerbal:        $('gcs-verbal'),
  gcsMotor:         $('gcs-motor'),
  gcsEyeNum:        $('gcs-eye-num'),
  gcsEyeDesc:       $('gcs-eye-desc'),
  gcsVerbalNum:     $('gcs-verbal-num'),
  gcsVerbalDesc:    $('gcs-verbal-desc'),
  gcsMotorNum:      $('gcs-motor-num'),
  gcsMotorDesc:     $('gcs-motor-desc'),
  gcsTotal:         $('gcs-total'),
  gcsTotalDesc:     $('gcs-total-desc'),
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
  triageBtn:        $('triage-btn'),
  printBtn:         $('print-btn'),
  newPatientBtn:    $('new-patient-btn'),
  loadingOverlay:   $('loading-overlay'),
};

/* ── SPLASH — auto-dismiss after 2.5s ───────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    DOM.splash.classList.add('fade-out');
    DOM.appShell.classList.remove('hidden');
    initSession();
    updateClock();
  }, 2500);
});

/* ── CLOCK ──────────────────────────────────────────────── */
function updateClock() {
  const now = new Date();
  DOM.liveTime.textContent = now.toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit', hour12:true });
  DOM.liveDate.textContent = now.toLocaleDateString('en-PK', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}
setInterval(updateClock, 1000);

/* ── SETTINGS MODAL ─────────────────────────────────────── */
DOM.settingsBtn.addEventListener('click', () => DOM.settingsOverlay.classList.remove('hidden'));
DOM.settingsCloseBtn.addEventListener('click', closeSettings);
DOM.settingsOverlay.addEventListener('click', e => { if (e.target === DOM.settingsOverlay) closeSettings(); });

DOM.saveSettingsBtn.addEventListener('click', () => {
  sessionApiKey   = DOM.geminiKey.value.trim();
  sessionFacility = DOM.facilityName.value.trim() || 'OPD Triage Station';
  DOM.facilityBadge.textContent = sessionFacility;
  sessionStorage.setItem('saathi_api_key',      sessionApiKey);
  sessionStorage.setItem('saathi_facility',     sessionFacility);
  closeSettings();
});

function closeSettings() { DOM.settingsOverlay.classList.add('hidden'); }

DOM.toggleKeyBtn.addEventListener('click', () => {
  const hidden = DOM.geminiKey.type === 'password';
  DOM.geminiKey.type = hidden ? 'text' : 'password';
  DOM.toggleKeyBtn.setAttribute('aria-label', hidden ? 'Hide key' : 'Show key');
});

/* ── SESSION / TOKEN ────────────────────────────────────── */
function initSession() {
  tokenCounter    = parseInt(sessionStorage.getItem('saathi_token') || '0', 10);
  sessionApiKey   = sessionStorage.getItem('saathi_api_key')  || '';
  sessionFacility = sessionStorage.getItem('saathi_facility') || 'OPD Triage Station';

  // Pre-fill the settings modal fields so user can see/edit them
  DOM.geminiKey.value    = sessionApiKey;
  DOM.facilityName.value = sessionFacility;
  DOM.facilityBadge.textContent = sessionFacility;

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

/* ── PAIN SLIDER ────────────────────────────────────────── */
DOM.painSlider.addEventListener('input', syncPainDisplay);

function syncPainDisplay() {
  const val = parseInt(DOM.painSlider.value, 10);
  DOM.painDisplay.textContent = val;
  DOM.painDesc.textContent    = PAIN_LABELS[val] || '';
  DOM.painDesc.style.color    = val >= 8 ? 'var(--red-vivid)' : val >= 4 ? 'var(--amber-vivid)' : 'var(--green-vivid)';
}

/* ── GCS STEPPERS ───────────────────────────────────────── */
const GCS_CONFIG = {
  'gcs-eye':    { descMap: GCS_EYE_DESC,    numEl: DOM.gcsEyeNum,    descEl: DOM.gcsEyeDesc    },
  'gcs-verbal': { descMap: GCS_VERBAL_DESC, numEl: DOM.gcsVerbalNum, descEl: DOM.gcsVerbalDesc },
  'gcs-motor':  { descMap: GCS_MOTOR_DESC,  numEl: DOM.gcsMotorNum,  descEl: DOM.gcsMotorDesc  },
};

document.querySelectorAll('.gcs-dec, .gcs-inc').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input    = $(targetId);
    const min      = parseInt(input.dataset.min, 10);
    const max      = parseInt(input.dataset.max, 10);
    let   val      = parseInt(input.value, 10);

    val = btn.classList.contains('gcs-inc') ? Math.min(val + 1, max) : Math.max(val - 1, min);
    input.value = val;

    const cfg = GCS_CONFIG[targetId];
    cfg.numEl.textContent  = val;
    cfg.descEl.textContent = cfg.descMap[val] || '';
    syncGcsTotal();
  });
});

function syncGcsTotal() {
  const e     = parseInt(DOM.gcsEye.value, 10)    || 4;
  const v     = parseInt(DOM.gcsVerbal.value, 10) || 5;
  const m     = parseInt(DOM.gcsMotor.value, 10)  || 6;
  const total = e + v + m;

  DOM.gcsTotal.textContent = total;
  DOM.gcsTotal.className   = 'gcs-total-value ' + (total <= 8 ? 'gcs-red' : total <= 12 ? 'gcs-yellow' : 'gcs-green');

  let label, cls;
  if      (total <= 8)  { label = 'Severe';   cls = 'gcs-desc-red'; }
  else if (total <= 12) { label = 'Moderate'; cls = 'gcs-desc-yellow'; }
  else                  { label = 'Normal';   cls = ''; }

  DOM.gcsTotalDesc.textContent = label;
  DOM.gcsTotalDesc.className   = `gcs-total-desc ${cls}`;
}

/* ── COLLECT INPUTS ─────────────────────────────────────── */
function collectInputs() {
  const gcsEye    = parseInt(DOM.gcsEye.value, 10)    || 4;
  const gcsVerbal = parseInt(DOM.gcsVerbal.value, 10) || 5;
  const gcsMotor  = parseInt(DOM.gcsMotor.value, 10)  || 6;
  return {
    complaint:  DOM.complaint.value.trim(),
    spo2:       DOM.spo2.value,
    sbp:        DOM.sbp.value,
    hr:         DOM.hr.value,
    temp:       DOM.temp.value,
    rr:         DOM.rr.value,
    gcsEye, gcsVerbal, gcsMotor,
    gcsTotal:   gcsEye + gcsVerbal + gcsMotor,
    mobility:   document.querySelector('input[name="mobility"]:checked')?.value    || 'walking',
    vision:     document.querySelector('input[name="vision"]:checked')?.value      || 'none',
    injurySite: document.querySelector('input[name="injury-site"]:checked')?.value || 'none',
    pain:       DOM.painSlider.value,
  };
}

/* ── TRIAGE FLOW ────────────────────────────────────────── */
DOM.triageBtn.addEventListener('click', async () => {
  const inputs     = collectInputs();
  const hardResult = runHardRules(inputs);

  let finalLevel      = hardResult.level;
  let aiReasoning     = '';
  let overrideApplied = false;

  if (hardResult.level !== 'IMMEDIATE') {
    if (sessionApiKey) {
      DOM.loadingOverlay.classList.remove('hidden');
      try {
        const aiResult = await analyzeComplaint(inputs.complaint, sessionApiKey);
        aiReasoning = aiResult.reasoning;
        if (aiResult.isEmergency) { finalLevel = 'IMMEDIATE'; overrideApplied = true; }
      } catch (err) {
        aiReasoning = 'Unexpected error during AI analysis — hard-rule result applied.';
        console.error('[SAATHI]', err);
      } finally {
        DOM.loadingOverlay.classList.add('hidden');
      }
    } else {
      aiReasoning = 'No Groq API key configured — AI analysis skipped. Open Settings (⚙) to add a key.';
    }
  } else {
    aiReasoning = `AI skipped — critical trigger(s): ${hardResult.flags.map(f => f.label).join('; ')}. Immediate attention required.`;
  }

  renderSlip(inputs, hardResult, finalLevel, aiReasoning, overrideApplied);
  incrementToken();
});

/* ── RENDER SLIP ────────────────────────────────────────── */
function renderSlip(inputs, hardResult, finalLevel, aiReasoning, overrideApplied) {
  const now = new Date();

  DOM.slipPriorityBand.className   = `slip-header-band ${priorityClass(finalLevel)}`;
  DOM.slipPriorityLbl.textContent  = finalLevel;
  DOM.slipPriorityIcon.textContent = finalLevel === 'IMMEDIATE' ? '🔴' : finalLevel === 'URGENT' ? '🟡' : '🟢';

  DOM.slipToken.textContent    = `#${String(tokenCounter + 1).padStart(3, '0')}`;
  DOM.slipDate.textContent     = now.toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'numeric' });
  DOM.slipTime.textContent     = now.toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit', hour12:true });
  DOM.slipFacility.textContent = sessionFacility;

  DOM.vitalsSummary.innerHTML = '';
  ['SpO₂','Systolic BP','Heart Rate','Temperature','Resp. Rate','GCS','Mobility','Vision','Injury'].forEach(key => {
    const entry = hardResult.vitalResults[key];
    if (!entry) return;
    const chip = document.createElement('div');
    chip.className = `vital-summary-chip ${chipClass(entry.level)}`;
    chip.innerHTML = `<span class="vsn">${key}</span><span class="vsv">${entry.value}</span>`;
    DOM.vitalsSummary.appendChild(chip);
  });

  DOM.slipComplaint.textContent = inputs.complaint || '(not recorded)';
  DOM.slipAiText.textContent    = aiReasoning || 'No AI reasoning generated.';
  DOM.slipOverride.textContent  = overrideApplied ? 'YES' : 'NO';
  DOM.slipOverride.className    = `override-val${overrideApplied ? ' yes' : ''}`;

  DOM.slipEmpty.classList.add('hidden');
  DOM.slipCard.classList.remove('hidden');
  DOM.slipCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── NEW PATIENT RESET ──────────────────────────────────── */
DOM.newPatientBtn.addEventListener('click', resetForm);

function resetForm() {
  DOM.complaint.value = '';
  DOM.spo2.value = DOM.sbp.value = DOM.hr.value = DOM.temp.value = DOM.rr.value = '';

  ['mobility','vision','injury-site'].forEach(name => {
    const defaults = { 'mobility':'walking', 'vision':'none', 'injury-site':'none' };
    const el = document.querySelector(`input[name="${name}"][value="${defaults[name]}"]`);
    if (el) el.checked = true;
  });

  DOM.gcsEye.value = 4; DOM.gcsVerbal.value = 5; DOM.gcsMotor.value = 6;
  DOM.gcsEyeNum.textContent    = 4; DOM.gcsEyeDesc.textContent    = GCS_EYE_DESC[4];
  DOM.gcsVerbalNum.textContent = 5; DOM.gcsVerbalDesc.textContent = GCS_VERBAL_DESC[5];
  DOM.gcsMotorNum.textContent  = 6; DOM.gcsMotorDesc.textContent  = GCS_MOTOR_DESC[6];
  syncGcsTotal();

  DOM.painSlider.value = 0;
  syncPainDisplay();

  DOM.slipCard.classList.add('hidden');
  DOM.slipEmpty.classList.remove('hidden');
  updateTokenBar();
  DOM.complaint.focus();
}

/* ── PRINT ──────────────────────────────────────────────── */
DOM.printBtn.addEventListener('click', () => window.print());

/* ── HELPERS ────────────────────────────────────────────── */
function priorityClass(l) { return { IMMEDIATE:'priority-immediate', URGENT:'priority-urgent', ROUTINE:'priority-routine' }[l] || ''; }
function chipClass(l)      { return { IMMEDIATE:'chip-red', URGENT:'chip-yellow', ROUTINE:'chip-green' }[l] || ''; }