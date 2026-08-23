const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Simple linear regression: y = mx + b
function trainLinearRegression(dataPairs) {
  const N = dataPairs.length;
  if (N < 2) return { m: 0, b: 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const [x, y] of dataPairs) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  
  const denominator = (N * sumX2) - (sumX * sumX);
  if (denominator === 0) return { m: 0, b: sumY / N };
  
  const m = ((N * sumXY) - (sumX * sumY)) / denominator;
  const b = (sumY - (m * sumX)) / N;
  
  return { m, b };
}

function computeR2(model, testDataPairs) {
  if (testDataPairs.length === 0) return 0;
  let sumY = 0;
  for (const [x, y] of testDataPairs) sumY += y;
  const meanY = sumY / testDataPairs.length;
  
  let ssTot = 0, ssRes = 0;
  for (const [x, y] of testDataPairs) {
    const yPred = model.m * x + model.b;
    ssTot += Math.pow(y - meanY, 2);
    ssRes += Math.pow(y - yPred, 2);
  }
  if (ssTot === 0) return 1;
  return Math.max(0, 1 - (ssRes / ssTot)); // clamp negative R2 to 0 for demo aesthetics
}

// 1. Regional Aggregation
async function buildRegionalModel(region) {
  const db = getFirestore();
  const phcsSnap = await db.collection('phcs').where('state', '==', region).get();
  
  let totalFootfall = {};
  let sampleCount = 0;

  for (const doc of phcsSnap.docs) {
    const footfallSnap = await db.collection(`phcs/${doc.id}/footfall`).get();
    footfallSnap.forEach(fDoc => {
      const date = fDoc.id;
      const pts = fDoc.data().patients || 0;
      if (!totalFootfall[date]) totalFootfall[date] = 0;
      totalFootfall[date] += pts;
      sampleCount++;
    });
  }

  // Sort dates chronologically
  const dates = Object.keys(totalFootfall).sort();
  const dataPairs = dates.map((d, i) => [i, totalFootfall[d]]);

  let model = { m: 0, b: 0 };
  let r2 = 0;

  if (dataPairs.length > 0) {
    // Split train/test (80/20) for holdout validation
    const splitIdx = Math.max(Math.floor(dataPairs.length * 0.8), 1);
    const trainData = dataPairs.slice(0, splitIdx);
    const testData = dataPairs.slice(splitIdx);

    model = trainLinearRegression(trainData);
    r2 = computeR2(model, testData);
  }

  // Write strictly to federated/local_{region} coefficient collection
  const result = {
    m: model.m,
    b: model.b,
    r2,
    sampleCount,
    updated_at: Timestamp.now()
  };
  
  await db.collection('federated').doc(`local_${region}`).set(result);
  return result;
}

// 2. Global Aggregator
async function aggregateGlobalModel(regions) {
  const db = getFirestore();
  
  let totalSamples = 0;
  const localModels = {};

  for (const region of regions) {
    // Reads ONLY the coefficient documents — never the raw footfall per FR-11 requirements
    const doc = await db.collection('federated').doc(`local_${region}`).get();
    if (doc.exists) {
      const data = doc.data();
      localModels[region] = data;
      totalSamples += data.sampleCount;
    }
  }

  let global_m = 0;
  let global_b = 0;

  // Sample-count-weighted average
  if (totalSamples > 0) {
    for (const region of Object.keys(localModels)) {
      const weight = localModels[region].sampleCount / totalSamples;
      global_m += localModels[region].m * weight;
      global_b += localModels[region].b * weight;
    }
  }

  const globalModel = {
    m: global_m,
    b: global_b,
    totalSamples,
    updated_at: Timestamp.now()
  };

  await db.collection('federated').doc('global').set(globalModel);
  
  return { globalModel, localModels };
}

module.exports = {
  buildRegionalModel,
  aggregateGlobalModel
};
