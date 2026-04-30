/* ════════════════════════════════════════════════════════
   api.js — SAATHI Groq (Llama 3.3 70B) Wrapper
   Called for ROUTINE and URGENT cases.
   Can upgrade priority to IMMEDIATE. Never downgrades.

   Model: llama-3.3-70b-versatile via Groq
   Free tier: ~14,400 requests/day (far more generous than Gemini)
   Get key: https://console.groq.com/keys
   ════════════════════════════════════════════════════════ */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.3-70b-versatile';

/**
 * System prompt — instructs the model to act as a clinical triage assistant
 * and return structured JSON with emergency flag, reasoning, and diagnoses.
 */
const TRIAGE_SYSTEM_PROMPT = `You are a clinical triage support assistant for a busy public-hospital OPD in Pakistan.
Your job is to analyse the patient's chief complaint and:
1. Decide whether it describes a life-threatening emergency.
2. List the top 3 probable diagnoses based on the complaint.

Life-threatening emergencies include (not exhaustive):
- Crushing / pressure chest pain; jaw or left arm pain
- Severe, sudden-onset headache ("worst of my life")
- Stroke signs: facial drooping, arm weakness, speech difficulty
- Difficulty breathing / choking / unable to speak in full sentences
- Loss of consciousness or near-syncope
- Active seizure
- Suspected poisoning, overdose, or drug ingestion
- Severe burns, major trauma, penetrating injury
- Signs of anaphylaxis (swelling, hives + breathlessness)
- Severe haemorrhage or haematemesis
- Sepsis indicators combined with high fever

The complaint may be written in English, Urdu, or Roman Urdu. Understand all three.

You MUST respond ONLY with a valid JSON object. No markdown fences. No preamble. No explanation outside the JSON.
Format exactly:
{"isEmergency": true, "reasoning": "Your clinical reasoning in 1-2 sentences.", "diagnoses": ["Most likely condition", "Second possibility", "Third possibility"]}

Keep each diagnosis label concise (2-5 words). Base them strictly on the complaint text.`;

/**
 * Calls Groq to analyse a free-text chief complaint.
 * @param {string} complaint  Raw text from the paramedic
 * @param {string} apiKey     User-provided Groq API key
 * @returns {Promise<{ isEmergency: boolean, reasoning: string, diagnoses: string[], available: boolean }>}
 */
async function analyzeComplaint(complaint, apiKey) {

  // Guard: skip if complaint is trivially short
  if (!complaint || complaint.trim().length < 3) {
    return {
      isEmergency: false,
      reasoning:   'Chief complaint too brief for AI analysis — hard-rule result applied.',
      diagnoses:   [],
      available:   true,
    };
  }

  const requestBody = {
    model: GROQ_MODEL,
    messages: [
      {
        role:    'system',
        content: TRIAGE_SYSTEM_PROMPT,
      },
      {
        role:    'user',
        content: `Chief Complaint: "${complaint.trim()}"`,
      },
    ],
    temperature:     0.1,    // Low = deterministic clinical output
    max_tokens:      400,
    top_p:           0.8,
    response_format: { type: 'json_object' },  // Forces JSON output
  };

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    // ── Non-2xx HTTP error ───────────────────────────
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errorDetail = errJson?.error?.message || errorDetail;
      } catch (_) { /* ignore */ }

      console.error('[SAATHI API] Groq error:', errorDetail);

      return {
        isEmergency: false,
        reasoning:   `⚠ AI Error: ${errorDetail}`,
        diagnoses:   [],
        available:   false,
      };
    }

    // ── Parse response ───────────────────────────────
    const data    = await response.json();
    const rawText = data?.choices?.[0]?.message?.content || '';

    // Strip markdown fences if model adds them despite instructions
    const cleanText = rawText.replace(/```(?:json)?|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (parseErr) {
      console.error('[SAATHI API] JSON parse failed. Raw output:', rawText);
      return {
        isEmergency: false,
        reasoning:   'AI response could not be parsed — hard-rule result applied.',
        diagnoses:   [],
        available:   true,
      };
    }

    // Normalise diagnoses — ensure it's always an array of strings
    const rawDiagnoses = parsed.diagnoses;
    const diagnoses =
      Array.isArray(rawDiagnoses)
        ? rawDiagnoses.filter(d => typeof d === 'string').slice(0, 3)
        : [];

    return {
      isEmergency: Boolean(parsed.isEmergency),
      reasoning:   parsed.reasoning || 'No clinical reasoning returned.',
      diagnoses,
      available:   true,
    };

  } catch (networkErr) {
    // Network failure (offline, DNS, CORS, etc.)
    console.error('[SAATHI API] Network error:', networkErr);
    return {
      isEmergency: false,
      reasoning:   'AI analysis unavailable (no network). Hard-rule result applied.',
      diagnoses:   [],
      available:   false,
    };
  }
}
