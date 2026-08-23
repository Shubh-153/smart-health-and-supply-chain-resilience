const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

let genAI = null;
let model = null;

// Template fallback defined in FR-7.3 and §A6
function getTemplateFallback(payload) {
  return `${payload.phc_name} is projected to exhaust ${payload.medicine} in ${payload.days_remaining} days. Transfer ${payload.transfer_qty} units from ${payload.recommended_source} (${payload.distance_km} km, ${payload.travel_time_min} min).`;
}

function validateIntegers(responseStr, payload) {
  // Strip out commas (e.g. 3,000 -> 3000) before extracting numbers
  const cleanStr = responseStr.replace(/,/g, '');
  const matches = cleanStr.match(/\d+/g);
  
  if (!matches) return true; // No integers to validate

  const payloadStr = JSON.stringify(payload);
  const payloadMatches = payloadStr.match(/\d+/g) || [];
  const payloadNumbers = new Set(payloadMatches);

  for (const match of matches) {
    if (!payloadNumbers.has(match)) {
      console.warn(`[Gemini Validation] Rejected! Found hallucinated/rounded integer: ${match}`);
      return false;
    }
  }
  return true;
}

function getHash(payload) {
  return crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');
}

// Timeout helper (4-second timeout per requirements)
const fetchWithTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
};

async function generateAlert(payload) {
  if (!genAI) {
    // Initialize lazily to ensure env vars are populated
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
    model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash',
      systemInstruction: "Write a two-sentence alert for a district health officer. Use only the numbers provided — never estimate, round, or add figures. First sentence states the predicted shortage and its cause. Second sentence states the recommended transfer with source, quantity, and travel time. Plain English, no jargon, no greeting, no markdown."
    });
  }

  const db = getFirestore();
  const state_hash = getHash(payload);
  const cacheKey = `${payload.phc_id}_${payload.medicine}_${state_hash}`;
  const docRef = db.collection('alerts_cache').doc(cacheKey);

  // 3. Cache check
  const cached = await docRef.get();
  if (cached.exists) {
    console.log(`[Gemini] Cache hit for ${cacheKey}`);
    return cached.data();
  }

  let finalOutput = "";
  let source = "gemini";

  try {
    // 4. 4-second timeout
    const prompt = JSON.stringify(payload);
    const result = await fetchWithTimeout(model.generateContent(prompt), 4000);
    const text = result.response.text().trim();

    // 2. Validation
    if (validateIntegers(text, payload)) {
      finalOutput = text;
    } else {
      console.warn(`[Gemini] Validation failed. Falling back to template.`);
      finalOutput = getTemplateFallback(payload);
      source = "template";
    }
  } catch (err) {
    console.warn(`[Gemini] API error or timeout (${err.message}). Falling back to template.`);
    finalOutput = getTemplateFallback(payload);
    source = "template";
  }

  const alertData = {
    text: finalOutput,
    generated_at: Timestamp.now(),
    source
  };

  // Save to cache asynchronously (fire and forget)
  docRef.set(alertData).catch(err => console.error("Cache write error", err));

  return alertData;
}

module.exports = { generateAlert };
