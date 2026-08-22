const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { initializeApp, getApps } = require("firebase-admin/app");
const express = require("express");
const cors = require("cors");

const { riskScore, predictedDailyConsumption } = require('./lib/compute');
const { generateRecommendations } = require('./lib/redistribute');
const { generateAlert } = require('./lib/gemini');

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

let summaryCache = { timestamp: null, data: null };
const CACHE_TTL_MS = 30 * 1000;

// GET /summary
app.get("/summary", async (req, res) => {
  try {
    const { scope, id } = req.query;
    const now = Date.now();
    if (summaryCache.timestamp && summaryCache.data && (now - summaryCache.timestamp < CACHE_TTL_MS)) {
      return res.json({ status: "success", data: summaryCache.data, cached: true });
    }

    let phcsQuery = db.collection('phcs');
    if (scope === 'state' && id) phcsQuery = phcsQuery.where('state', '==', id);
    else if (scope === 'district' && id) phcsQuery = phcsQuery.where('district', '==', id);
    
    const snapshot = await phcsQuery.get();
    
    let critical = 0, atRisk = 0, stockOuts = 0, totalBeds = 0, occupiedBeds = 0, totalStaff = 0, presentStaff = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const bucket = data.risk?.bucket || "Low"; 
      if (bucket === "Critical") critical++;
      if (bucket === "High") atRisk++;
      totalBeds += data.beds?.total || 0;
      occupiedBeds += data.beds?.occupied || 0;
      totalStaff += (data.staff?.doctors_sanctioned || 0) + (data.staff?.nurses_sanctioned || 0);
      presentStaff += (data.staff?.doctors_present || 0) + (data.staff?.nurses_present || 0);
    });

    const data = {
      critical, at_risk: atRisk, stock_outs: stockOuts, 
      bed_occupancy_pct: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      staff_availability_pct: totalStaff > 0 ? Math.round((presentStaff / totalStaff) * 100) : 0
    };

    summaryCache = { timestamp: now, data };
    res.json({ status: "success", data });
  } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
});

// GET /phcs
app.get("/phcs", async (req, res) => {
  try {
    const { district } = req.query;
    let query = db.collection('phcs');
    if (district) query = query.where('district', '==', district);
    
    const snapshot = await query.get();
    const phcs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      phcs.push({ id: doc.id, ...data, location: { lat: data.lat, lng: data.lng } });
    });
    res.json({ status: "success", data: phcs });
  } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
});

// GET /phcs/:id
app.get("/phcs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [phcDoc, medsSnap, footfallSnap, forecastDoc] = await Promise.all([
      db.collection('phcs').doc(id).get(),
      db.collection(`phcs/${id}/medicines`).get(),
      db.collection(`phcs/${id}/footfall`).get(),
      db.collection('forecasts').doc(id).get()
    ]);

    if (!phcDoc.exists) return res.status(404).json({ status: "error", message: "PHC not found" });

    const medicines = medsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort chronological in memory to bypass Firestore descending index requirement
    const footfall_history = footfallSnap.docs
      .map(doc => ({ date: doc.id, ...doc.data() }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);
    const forecast = forecastDoc.exists ? forecastDoc.data() : null;

    const phcData = phcDoc.data();
    const risk = riskScore(phcData, medicines, forecast);

    res.json({
      status: "success",
      data: { ...phcData, id, risk, medicines, footfall_history }
    });
  } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
});

// GET /phcs/:id/stockout
app.get("/phcs/:id/stockout", async (req, res) => {
  try {
    const { id } = req.params;
    const [medsSnap, forecastDoc] = await Promise.all([
      db.collection(`phcs/${id}/medicines`).get(),
      db.collection('forecasts').doc(id).get()
    ]);

    if (medsSnap.empty) return res.json({ status: "success", data: [] });

    const forecast = forecastDoc.exists ? forecastDoc.data() : null;
    const stockouts = [];

    medsSnap.forEach(doc => {
      const med = { id: doc.id, ...doc.data() };
      const pdc = predictedDailyConsumption(med, forecast);
      const days_remaining = Math.floor(med.current_stock / Math.max(pdc, 1));
      
      let severity = "Low";
      if (days_remaining <= 3) severity = "Critical";
      else if (days_remaining <= 7) severity = "High";
      else if (days_remaining <= 14) severity = "Medium";

      stockouts.push({
        medicine_id: med.id,
        name: med.name,
        current_stock: med.current_stock,
        daily_consumption: Math.round(pdc),
        days_remaining,
        trend_pct: 0, 
        severity
      });
    });
    res.json({ status: "success", data: stockouts });
  } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
});

// GET /alerts
app.get("/alerts", async (req, res) => {
  try {
    const snapshot = await db.collection('alerts_cache').get();
    const alerts = [];
    snapshot.forEach(doc => alerts.push({ id: doc.id, ...doc.data() }));
    res.json({ status: "success", data: alerts });
  } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
});

// ============================================================================
// FR-8 & FR-9 Endpoints
// ============================================================================

// Helper to load entire network
async function loadFullNetwork() {
  const [phcsSnap, forecastsSnap, distSnap] = await Promise.all([
    db.collection('phcs').get(),
    db.collection('forecasts').get(),
    db.collection('distance_cache').get()
  ]);

  const distances = {};
  distSnap.forEach(d => distances[d.id] = d.data());

  const forecasts = {};
  forecastsSnap.forEach(d => forecasts[d.id] = d.data());

  const phcs = await Promise.all(phcsSnap.docs.map(async doc => {
    const phc = { id: doc.id, ...doc.data() };
    phc.forecast = forecasts[phc.id] || null;
    const medsSnap = await db.collection(`phcs/${phc.id}/medicines`).get();
    phc.medicines = medsSnap.docs.map(m => ({ id: m.id, ...m.data() }));
    return phc;
  }));

  return { phcs, distances };
}

// POST /emergency
app.post("/emergency", async (req, res) => {
  const start = Date.now();
  const timings = {};
  try {
    const { district_id, active } = req.body;
    
    // 1. Fetch district PHCs
    const t0 = Date.now();
    const phcsSnap = await db.collection('phcs').where('district', '==', district_id).get();
    timings.fetch_phcs = Date.now() - t0;

    const t1 = Date.now();
    const batch = db.batch();
    
    // Update network state
    const netRef = db.collection('network').doc('state');
    batch.update(netRef, {
      emergency_districts: active ? [district_id] : []
    });

    const affectedPhcIds = [];
    const multiplierFootfall = active ? 2.5 : 1/2.5;
    const multiplierConsumption = active ? 1.65 : 1/1.65;

    for (const doc of phcsSnap.docs) {
      affectedPhcIds.push(doc.id);
      batch.update(doc.ref, { emergency: active });

      // Multiply medicines
      const medsSnap = await db.collection(`phcs/${doc.id}/medicines`).get();
      medsSnap.forEach(mDoc => {
        const d = mDoc.data();
        batch.update(mDoc.ref, { avg_daily_consumption: Math.round(d.avg_daily_consumption * multiplierConsumption) });
      });

      // Update forecast (mocking forecast service call)
      const forecastRef = db.collection('forecasts').doc(doc.id);
      const forecastDoc = await forecastRef.get();
      if (forecastDoc.exists) {
        const d = forecastDoc.data();
        const newFf = d.footfall_7d.map(x => Math.round(x * multiplierFootfall));
        const newDemand = {};
        if (d.demand_7d) {
          Object.keys(d.demand_7d).forEach(med => {
            newDemand[med] = d.demand_7d[med].map(x => Math.round(x * multiplierConsumption));
          });
        }
        batch.update(forecastRef, { footfall_7d: newFf, demand_7d: newDemand });
      }

      // Invalidate alerts cache
      const alertsSnap = await db.collection('alerts_cache').get();
      alertsSnap.forEach(aDoc => {
        if (aDoc.id.startsWith(doc.id + "_")) batch.delete(aDoc.ref);
      });
    }
    
    await batch.commit();
    timings.db_mutations = Date.now() - t1;

    // 2. Recompute risk and Generate Recommendations
    const t2 = Date.now();
    const { phcs, distances } = await loadFullNetwork();
    
    // Re-save new risk scores
    const riskBatch = db.batch();
    phcs.forEach(p => {
      const risk = riskScore(p, p.medicines, p.forecast);
      p.risk = risk; // For recommendations
      riskBatch.update(db.collection('phcs').doc(p.id), { risk });
    });
    await riskBatch.commit();

    // Gen recommendations
    const recommendations = generateRecommendations(phcs, distances, Date.now());
    
    // Clear old and save new recs
    const recsBatch = db.batch();
    const oldRecs = await db.collection('recommendations').get();
    oldRecs.forEach(r => recsBatch.delete(r.ref));
    
    const validRecs = recommendations.filter(r => r.status === 'pending');
    validRecs.forEach(r => {
      const ref = db.collection('recommendations').doc();
      recsBatch.set(ref, r);
    });
    await recsBatch.commit();
    timings.compute_and_recs = Date.now() - t2;

    // 3. Call Gemini for top 3 critical
    const t3 = Date.now();
    validRecs.sort((a, b) => {
      const phcA = phcs.find(p => p.id === a.dest_phc);
      const phcB = phcs.find(p => p.id === b.dest_phc);
      return (phcB?.risk.score || 0) - (phcA?.risk.score || 0);
    });

    const alertPromises = validRecs.map(async (rec, index) => {
      const destPhc = phcs.find(p => p.id === rec.dest_phc);
      const med = destPhc.medicines.find(m => m.id === rec.medicine);
      const pdc = predictedDailyConsumption(med, destPhc.forecast);
      
      const payload = {
        phc_id: destPhc.id, phc_name: destPhc.name, medicine: med.id,
        current_stock: med.current_stock, daily_consumption: Math.round(pdc),
        days_remaining: Math.floor(med.current_stock / Math.max(pdc, 1)),
        trend_pct: destPhc.trend_pct || 0,
        recommended_source: rec.source_phc, transfer_qty: rec.qty,
        distance_km: rec.distance_km, travel_time_min: rec.travel_time_min
      };

      if (index < 3) {
        // Call Gemini for the top 3
        await generateAlert(payload);
      } else {
        // Render template instantly for the rest
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');
        const text = `${payload.phc_name} is projected to exhaust ${payload.medicine} in ${payload.days_remaining} days. Transfer ${payload.transfer_qty} units from ${payload.recommended_source} (${payload.distance_km} km, ${payload.travel_time_min} min).`;
        
        await db.collection('alerts_cache').doc(`${payload.phc_id}_${payload.medicine}_${hash}`).set({
          text,
          generated_at: Timestamp.now(),
          source: "template"
        });
      }
    });
    
    await Promise.all(alertPromises);
    timings.gemini_alerts = Date.now() - t3;
    timings.total = Date.now() - start;

    res.json({ status: "success", timings, updated_phcs: affectedPhcIds.length });
  } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
});

// GET /recommendations
app.get("/recommendations", async (req, res) => {
  try {
    const snap = await db.collection('recommendations').get();
    const recs = [];
    snap.forEach(d => recs.push({ id: d.id, ...d.data() }));
    res.json({ status: "success", data: recs });
  } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
});

// POST /recommendations/:id/confirm
app.post("/recommendations/:id/confirm", async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('recommendations').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ status: "error", message: "Not found" });
    
    const rec = docSnap.data();
    if (rec.status !== 'pending') return res.status(400).json({ status: "error", message: "Already processed" });

    // Mutate stock in transaction
    const result = await db.runTransaction(async (t) => {
      const srcMedRef = db.collection(`phcs/${rec.source_phc}/medicines`).doc(rec.medicine);
      const dstMedRef = db.collection(`phcs/${rec.dest_phc}/medicines`).doc(rec.medicine);
      const destPhcRef = db.collection('phcs').doc(rec.dest_phc);
      const destForecastRef = db.collection('forecasts').doc(rec.dest_phc);

      const [srcM, dstM, dPhc, dForecast] = await Promise.all([
        t.get(srcMedRef), t.get(dstMedRef), t.get(destPhcRef), t.get(destForecastRef)
      ]);

      if (srcM.data().current_stock < rec.qty) throw new Error("Source stock insufficient");

      t.update(srcMedRef, { current_stock: srcM.data().current_stock - rec.qty });
      t.update(dstMedRef, { current_stock: dstM.data().current_stock + rec.qty });
      t.update(docRef, { status: 'confirmed', confirmed_at: Timestamp.now() });

      // Calculate risk before and after for destination
      const destMedsSnap = await db.collection(`phcs/${rec.dest_phc}/medicines`).get();
      const meds = destMedsSnap.docs.map(m => ({ id: m.id, ...m.data() }));
      const forecastData = dForecast.exists ? dForecast.data() : null;
      
      const risk_before = riskScore(dPhc.data(), meds, forecastData);
      
      const mutatedMeds = meds.map(m => m.id === rec.medicine ? { ...m, current_stock: m.current_stock + rec.qty } : m);
      const risk_after = riskScore(dPhc.data(), mutatedMeds, forecastData);
      
      t.update(destPhcRef, { risk: risk_after });

      return { risk_before, risk_after };
    });

    res.json({ status: "success", data: result });
  } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
});

// POST /reset
app.post("/reset", async (req, res) => {
  try {
    const { exec } = require('child_process');
    const path = require('path');
    const seedDir = path.join(__dirname, '../seed');
    const scriptPath = path.join(seedDir, 'import.js');
    
    await new Promise((resolve, reject) => {
      exec(`node ${scriptPath}`, { cwd: seedDir }, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve();
      });
    });

    res.json({ status: "success", message: "Database reset from seed." });
  } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
});

// GET /federated/status
app.get("/federated/status", async (req, res) => {
  try {
    const { buildRegionalModel, aggregateGlobalModel } = require('./lib/federated');
    
    // 1. Build regional models dynamically for the demo
    await Promise.all([
      buildRegionalModel("Punjab"),
      buildRegionalModel("Maharashtra")
    ]);

    // 2. Aggregate globally reading ONLY the coefficient documents
    const { globalModel, localModels } = await aggregateGlobalModel(["Punjab", "Maharashtra"]);

    // Format output
    const regionsOutput = {};
    for (const [region, data] of Object.entries(localModels)) {
      regionsOutput[region] = {
        sample_count: data.sampleCount,
        accuracy_r2: Math.round(data.r2 * 100) / 100,
        coefficients: { m: Math.round(data.m * 100) / 100, b: Math.round(data.b * 100) / 100 }
      };
    }

    res.json({
      status: "success",
      disclosure: "DISCLAIMER: This is a simulated demonstration of federated averaging (simple linear regression coefficients weighted by sample count), not a production federated learning system. Raw footfall data never leaves the regional collections.",
      data: {
        global_model: {
          equation: `y = ${(Math.round(globalModel.m * 100) / 100)}x + ${(Math.round(globalModel.b * 100) / 100)}`,
          total_samples: globalModel.totalSamples,
          updated_at: globalModel.updated_at
        },
        regions: regionsOutput
      }
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

exports.api = onRequest({ region: "us-central1" }, app);
