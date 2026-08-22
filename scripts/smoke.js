const parseArgs = () => {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf('--url');
  if (urlIdx !== -1 && args[urlIdx + 1]) {
    return args[urlIdx + 1].replace(/\/$/, '');
  }
  return 'http://127.0.0.1:5001/supply-43d81/us-central1/api';
};

const BASE_URL = parseArgs();
const results = [];

async function runTest(name, fn) {
  try {
    await fn();
    results.push({ Test: name, Status: '✅ PASS', Error: '-' });
  } catch (err) {
    results.push({ Test: name, Status: '❌ FAIL', Error: err.message });
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error(`API Error: ${data.message}`);
  }
  return data.data;
}

async function smokeTest() {
  console.log(`Starting Smoke Test against: ${BASE_URL}\n`);

  // 1. Reset Database
  await runTest('POST /reset (Baseline)', async () => {
    await request('/reset', { method: 'POST' });
  });

  // 2. GET /summary
  await runTest('GET /summary (Shape)', async () => {
    const data = await request('/summary');
    if (typeof data.critical !== 'number' || typeof data.bed_occupancy_pct !== 'number') {
      throw new Error("Missing numeric fields in summary");
    }
  });

  // 3. GET /phcs
  let samplePhcId = null;
  await runTest('GET /phcs (Shape)', async () => {
    const data = await request('/phcs');
    if (!Array.isArray(data) || data.length === 0) throw new Error("No PHCs returned");
    if (!data[0].id || !data[0].location || !data[0].risk) throw new Error("Missing PHC fields");
    samplePhcId = data[0].id; // Usually PHC-01
  });

  // 4. GET /phcs/:id
  let initialRiskScore = null;
  await runTest('GET /phcs/:id (Shape)', async () => {
    if (!samplePhcId) throw new Error("No sample PHC ID available");
    const data = await request(`/phcs/${samplePhcId}`);
    if (!data.risk || typeof data.risk.score !== 'number') throw new Error("Missing risk object");
    if (!Array.isArray(data.medicines)) throw new Error("Missing medicines array");
    if (!Array.isArray(data.footfall_history)) throw new Error("Missing footfall_history array");
    initialRiskScore = data.risk.score;
  });

  // 5. GET /phcs/:id/stockout
  await runTest('GET /phcs/:id/stockout (Shape)', async () => {
    const data = await request(`/phcs/${samplePhcId}/stockout`);
    if (!Array.isArray(data)) throw new Error("Stockout should be an array");
  });

  // 6. GET /alerts
  await runTest('GET /alerts (Shape)', async () => {
    const data = await request('/alerts');
    if (!Array.isArray(data)) throw new Error("Alerts should be an array");
  });

  // 7. GET /federated/status
  await runTest('GET /federated/status (Shape)', async () => {
    const data = await request('/federated/status');
    if (!data.global_model || !data.regions) throw new Error("Missing federated structure");
    if (!data.regions['Punjab'] || typeof data.regions['Punjab'].sample_count !== 'number') {
      throw new Error("Missing Punjab region data");
    }
  });

  // 8. POST /emergency (Assert Risk Change)
  await runTest('POST /emergency (Risk Change)', async () => {
    const initialData = await request(`/phcs/${samplePhcId}`);
    const beforeRisk = initialData.risk.score;

    // Trigger emergency for Ludhiana (assuming PHC-01 is Ludhiana)
    await request('/emergency', {
      method: 'POST',
      body: JSON.stringify({ district_id: 'Ludhiana', active: true })
    });

    const afterData = await request(`/phcs/${samplePhcId}`);
    const afterRisk = afterData.risk.score;

    if (afterRisk === beforeRisk) {
      throw new Error(`Risk score did not change. Before: ${beforeRisk}, After: ${afterRisk}`);
    }
  });

  // 9. POST /recommendations/:id/confirm (Assert Risk Drop)
  await runTest('POST /recommendations/:id/confirm (Risk Drop)', async () => {
    const recs = await request('/recommendations');
    const pendingRecs = recs.filter(r => r.status === 'pending');
    
    if (pendingRecs.length === 0) {
      throw new Error("No pending recommendations found to confirm");
    }

    // Pick the destination PHC of the first recommendation
    const destPhcId = pendingRecs[0].dest_phc;
    const recsForDest = pendingRecs.filter(r => r.dest_phc === destPhcId);

    let currentRisk = null;
    let finalRisk = null;

    // Confirm all recommendations for this PHC to guarantee risk drops
    for (const rec of recsForDest) {
      const confirmRes = await request(`/recommendations/${rec.id}/confirm`, { method: 'POST' });
      if (!currentRisk) currentRisk = confirmRes.risk_before.score;
      finalRisk = confirmRes.risk_after.score;
    }

    if (finalRisk >= currentRisk) {
      throw new Error(`Risk did not drop! Before: ${currentRisk}, After: ${finalRisk}`);
    }
  });

  // 10. Clean up Reset
  await runTest('POST /reset (Cleanup)', async () => {
    await request('/reset', { method: 'POST' });
  });

  console.log("\n=== SMOKE TEST RESULTS ===");
  console.table(results);

  const failures = results.filter(r => r.Status === '❌ FAIL');
  if (failures.length > 0) {
    console.error(`\n❌ Smoke tests failed (${failures.length} errors).`);
    process.exit(1);
  } else {
    console.log(`\n✅ All smoke tests passed successfully!`);
    process.exit(0);
  }
}

smokeTest();
