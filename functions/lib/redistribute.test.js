const { generateRecommendations } = require('./redistribute');

describe('Redistribution Engine (FR-6, §5.5)', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = new Date('2026-08-22T00:00:00Z').getTime();

  // Basic mock structures
  const basePhc = {
    beds: { total: 50, occupied: 10 },
    staff: { doctors_sanctioned: 10, doctors_present: 10, nurses_sanctioned: 20, nurses_present: 20 },
    trend_pct: 0,
    forecast: { footfall_7d: [50], demand_7d: { 'ors': [100, 100, 100, 100, 100, 100, 100] } }
  };

  test('Recommends the lowest cost transfer for a shortage', () => {
    const dest = {
      ...basePhc,
      id: 'PHC-DEST',
      medicines: [{
        id: 'ors',
        current_stock: 500, // Shortage! (demand is 700 + 500 safety = 1200 needed)
        avg_daily_consumption: 100,
        units_per_patient: 2,
        min_safety_stock: 500,
        expiry_date: now + (30 * ONE_DAY_MS)
      }]
    };

    const sourceNearHighRisk = {
      ...basePhc,
      id: 'PHC-NEAR',
      beds: { total: 50, occupied: 50 }, // High risk source
      medicines: [{
        id: 'ors',
        current_stock: 5000, // Huge surplus
        avg_daily_consumption: 100,
        units_per_patient: 2,
        min_safety_stock: 500,
        expiry_date: now + (60 * ONE_DAY_MS)
      }]
    };

    const sourceFarLowRisk = {
      ...basePhc,
      id: 'PHC-FAR',
      medicines: [{
        id: 'ors',
        current_stock: 3000, // Good surplus
        avg_daily_consumption: 100,
        units_per_patient: 2,
        min_safety_stock: 500,
        expiry_date: now + (60 * ONE_DAY_MS)
      }]
    };

    const network = [dest, sourceNearHighRisk, sourceFarLowRisk];
    const distances = {
      'PHC-NEAR_PHC-DEST': { distance_km: 10, travel_time_min: 15 }, // Near
      'PHC-FAR_PHC-DEST': { distance_km: 40, travel_time_min: 60 }   // Far
    };

    const recs = generateRecommendations(network, distances, now);

    expect(recs.length).toBe(1);
    expect(recs[0].dest_phc).toBe('PHC-DEST');
    expect(recs[0].status).toBe('pending');
    
    // The engine should pick the one with lower cost.
    // NEAR: dist(10) + risk(~50 * 0.5 = 25) - surplus(3800/100 = 38) + expiry(0) = 10 + 25 - 38 = -3
    // FAR: dist(40) + risk(~5 * 0.5 = 2.5) - surplus(1800/100 = 18) + expiry(0) = 40 + 2.5 - 18 = 24.5
    // NEAR is chosen because massive surplus and low distance offsets its higher risk.
    expect(recs[0].source_phc).toBe('PHC-NEAR');
    expect(recs[0].qty).toBe(700); // 1200 needed - 500 current = 700 shortage
    expect(recs[0].projected_risk_after).toBeLessThan(100); // Should be computed
  });

  test('Returns no_feasible_source when all surpluses are exhausted or unsafe', () => {
    const dest = {
      ...basePhc,
      id: 'PHC-DEST',
      medicines: [{
        id: 'ors',
        current_stock: 0, 
        avg_daily_consumption: 100,
        units_per_patient: 2,
        min_safety_stock: 500,
        expiry_date: now + (30 * ONE_DAY_MS)
      }]
    };

    const sourceEmpty = {
      ...basePhc,
      id: 'PHC-EMPTY',
      medicines: [{
        id: 'ors',
        current_stock: 1200, // Exactly 0 surplus (Demand 700 + safety 500 = 1200 needed)
        avg_daily_consumption: 100,
        units_per_patient: 2,
        min_safety_stock: 500,
        expiry_date: now + (30 * ONE_DAY_MS)
      }]
    };

    const network = [dest, sourceEmpty];
    const distances = { 'PHC-EMPTY_PHC-DEST': { distance_km: 10, travel_time_min: 15 } };

    const recs = generateRecommendations(network, distances, now);
    
    expect(recs.length).toBe(1);
    expect(recs[0].status).toBe('no_feasible_source');
    expect(recs[0].reason).toMatch(/No other PHC has sufficient surplus/);
    expect(recs[0].source_phc).toBeUndefined(); // Should not recommend a source
  });

  test('Applies expiry penalty if medicine expires before destination can consume it', () => {
    const dest = {
      ...basePhc,
      id: 'PHC-DEST',
      medicines: [{
        id: 'ors',
        current_stock: 0, 
        avg_daily_consumption: 100, // dest PDC = 100. qty = 1200. Will take 12 days to consume.
        units_per_patient: 2,
        min_safety_stock: 500,
        expiry_date: now + (30 * ONE_DAY_MS)
      }]
    };

    const sourceExpiring = {
      ...basePhc,
      id: 'PHC-SOURCE',
      medicines: [{
        id: 'ors',
        current_stock: 5000, 
        avg_daily_consumption: 100,
        units_per_patient: 2,
        min_safety_stock: 500,
        expiry_date: now + (5 * ONE_DAY_MS) // Expires in 5 days! (Penalty should apply since dest needs 12 days to consume)
      }]
    };

    const network = [dest, sourceExpiring];
    const distances = { 'PHC-SOURCE_PHC-DEST': { distance_km: 10, travel_time_min: 15 } };

    const recs = generateRecommendations(network, distances, now);
    
    expect(recs.length).toBe(1);
    expect(recs[0].status).toBe('pending');
    
    // Check that penalty was applied in cost calculation
    // cost = 10(dist) + srcRisk(low) - surplus(38) + 25(penalty) = ~0 (instead of -25)
    expect(recs[0].cost).toBeGreaterThan(-10); // Specifically, higher than it would be without the +25 penalty
  });
});
