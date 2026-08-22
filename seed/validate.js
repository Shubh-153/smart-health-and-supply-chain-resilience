const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin 
// Assumes GOOGLE_APPLICATION_CREDENTIALS environment variable is set
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const SCHEMAS = {
  phcs: [
    'name', 'district', 'state', 'lat', 'lng',
    'beds.total', 'beds.occupied',
    'staff.doctors_sanctioned', 'staff.doctors_present',
    'staff.nurses_sanctioned', 'staff.nurses_present',
    'emergency',
    'risk.score', 'risk.bucket', 
    'risk.components.medicine', 'risk.components.bed', 
    'risk.components.surge', 'risk.components.staff'
  ],
  medicines: [
    'name', 'current_stock', 'avg_daily_consumption', 'units_per_patient',
    'min_safety_stock', 'expiry_date', 'incoming_qty'
  ],
  footfall: [
    'patients'
  ],
  forecasts: [
    'generated_at', 'footfall_7d', 'demand_7d'
  ],
  recommendations: [
    'source_phc', 'dest_phc', 'medicine', 'qty',
    'distance_km', 'travel_time_min', 'cost', 'projected_risk_after', 'status'
  ],
  alerts_cache: [
    'text', 'generated_at', 'source'
  ],
  distance_cache: [
    'distance_km', 'travel_time_min'
  ],
  network: [
    'emergency_districts', 'last_recompute'
  ]
};

// Helper to safely get nested values (e.g. 'beds.total')
function getNestedProp(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

async function validate() {
  const missing = [];

  console.log("Starting DB validation against Aarogya Grid Schema...\n");

  // 1. PHCs
  const phcsSnap = await db.collection('phcs').get();
  console.log(`Checking ${phcsSnap.size} PHC documents...`);
  
  for (const doc of phcsSnap.docs) {
    const data = doc.data();
    SCHEMAS.phcs.forEach(field => {
      if (getNestedProp(data, field) === undefined) {
        missing.push({ collection: 'phcs', docId: doc.id, missingField: field });
      }
    });

    // 1a. Medicines
    const medsSnap = await db.collection(`phcs/${doc.id}/medicines`).get();
    medsSnap.forEach(medDoc => {
      const medData = medDoc.data();
      SCHEMAS.medicines.forEach(field => {
        if (medData[field] === undefined) {
          missing.push({ collection: `phcs/${doc.id}/medicines`, docId: medDoc.id, missingField: field });
        }
      });
    });

    // 1b. Footfall
    const footfallSnap = await db.collection(`phcs/${doc.id}/footfall`).get();
    footfallSnap.forEach(ffDoc => {
      const ffData = ffDoc.data();
      SCHEMAS.footfall.forEach(field => {
        if (ffData[field] === undefined) {
          missing.push({ collection: `phcs/${doc.id}/footfall`, docId: ffDoc.id, missingField: field });
        }
      });
    });
  }

  // Generic Root Collections
  const checkRootCollection = async (colName, schemaFields) => {
    const snap = await db.collection(colName).get();
    console.log(`Checking ${snap.size} documents in ${colName}...`);
    snap.forEach(doc => {
      const data = doc.data();
      schemaFields.forEach(field => {
        if (data[field] === undefined) {
          missing.push({ collection: colName, docId: doc.id, missingField: field });
        }
      });
    });
  };

  await checkRootCollection('forecasts', SCHEMAS.forecasts);
  await checkRootCollection('recommendations', SCHEMAS.recommendations);
  await checkRootCollection('alerts_cache', SCHEMAS.alerts_cache);
  await checkRootCollection('distance_cache', SCHEMAS.distance_cache);
  await checkRootCollection('network', SCHEMAS.network);

  // Output formatting
  if (missing.length === 0) {
    console.log("\n✅ Success! All documents contain all required schema fields.");
  } else {
    console.log(`\n❌ Found ${missing.length} missing fields!`);
    console.table(missing);
    process.exit(1);
  }
}

validate().catch(err => {
  console.error("Validation failed with error:", err);
  process.exit(1);
});
