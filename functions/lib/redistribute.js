const { netPosition, riskScore, predictedDailyConsumption } = require('./compute');

/**
 * Pure function to generate transfer recommendations for the entire network.
 * 
 * @param {Array} networkState - Array of PHC objects, each containing:
 *                               { ..., medicines: [...], forecast: {...} }
 * @param {Object} distanceMatrix - Dictionary of pre-resolved distances:
 *                                  { 'PHC-01_PHC-02': { distance_km, travel_time_min } }
 * @param {number} nowMs - Current time in milliseconds (for pure expiry calculations)
 * @returns {Array} List of recommendation objects (or no-feasible-source flags).
 */
function generateRecommendations(networkState, distanceMatrix, nowMs = Date.now()) {
  const recommendations = [];

  for (const dest of networkState) {
    if (!dest.medicines) continue;

    for (const med of dest.medicines) {
      const net = netPosition(med, dest.forecast);
      
      if (net.shortage > 0) {
        const candidates = [];
        const destPdc = Math.max(predictedDailyConsumption(med, dest.forecast), 1);
        
        for (const source of networkState) {
          if (source.id === dest.id) continue;
          
          const sourceMed = source.medicines?.find(m => m.id === med.id);
          if (!sourceMed) continue;

          const sourceNet = netPosition(sourceMed, source.forecast);
          if (sourceNet.surplus <= 0) continue;

          // We transfer up to the shortage, but capped by what the source can actually spare (its surplus)
          const qty = Math.min(net.shortage, sourceNet.surplus);
          
          // FR-6.3 Hard constraint check: Never dip below safety stock
          // Because we cap qty at surplus, this should technically never happen, 
          // but we evaluate it explicitly to strictly enforce the spec phrasing.
          if ((sourceMed.current_stock - qty) < sourceMed.min_safety_stock) {
            continue; 
          }

          // Fetch Distance
          const distKey = `${source.id}_${dest.id}`;
          const distData = distanceMatrix[distKey];
          // If no distance data, we penalize or skip. Since it's a closed static system, we expect it.
          if (!distData) continue; 

          // Calculate Source Risk Score
          const srcRisk = riskScore(source, source.medicines, source.forecast);
          
          // Expiry Penalty Calculation
          // Time it will take destination to consume the transferred qty:
          const daysToConsume = qty / destPdc;
          const msToConsume = daysToConsume * 24 * 60 * 60 * 1000;
          const destConsumeDate = nowMs + msToConsume;
          
          const expiryMs = sourceMed.expiry_date.toMillis ? sourceMed.expiry_date.toMillis() : new Date(sourceMed.expiry_date).getTime();
          const expiry_penalty = (expiryMs < destConsumeDate) ? 25 : 0;

          // Cost function (FR-5.5)
          const cost = (distData.distance_km * 1.0) 
                     + (srcRisk.score * 0.5) 
                     - (sourceNet.surplus / 100) 
                     + expiry_penalty;

          candidates.push({
            source,
            qty,
            distance_km: distData.distance_km,
            travel_time_min: distData.travel_time_min,
            cost
          });
        }

        if (candidates.length === 0) {
          recommendations.push({
            dest_phc: dest.id,
            medicine: med.id,
            shortage: net.shortage,
            status: "no_feasible_source",
            reason: "No other PHC has sufficient surplus without breaching their own safety threshold."
          });
        } else {
          // Sort by cost (lower is better) and pick the winner
          candidates.sort((a, b) => a.cost - b.cost);
          const best = candidates[0];

          // Compute projected risk after transfer for Destination
          const clonedDestMedicines = dest.medicines.map(m => {
            if (m.id === med.id) {
              return { ...m, current_stock: m.current_stock + best.qty };
            }
            return m;
          });
          const projectedDestRisk = riskScore(dest, clonedDestMedicines, dest.forecast);

          recommendations.push({
            source_phc: best.source.id,
            dest_phc: dest.id,
            medicine: med.id,
            qty: best.qty,
            distance_km: best.distance_km,
            travel_time_min: best.travel_time_min,
            cost: best.cost,
            projected_risk_after: projectedDestRisk.score,
            status: "pending"
          });
        }
      }
    }
  }

  return recommendations;
}

module.exports = { generateRecommendations };
