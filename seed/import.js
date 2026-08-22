const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const fs = require('fs');
const csv = require('csv-parser');

// Initialize Firebase Admin 
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

// Helper to read CSV
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filePath} not found, skipping.`);
      return resolve([]);
    }
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Haversine formula + routing simulation
function calcDistanceAndTravelTime(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const straightLine = R * c;
  const distance_km = straightLine * 1.3; // simulate real road routing
  const travel_time_min = (distance_km / 40) * 60; // assume 40 km/h average
  
  return {
    distance_km: Math.round(distance_km * 10) / 10,
    travel_time_min: Math.round(travel_time_min)
  };
}

async function run() {
  console.log("Starting Aarogya Grid DB import...");

  const phcs = await readCSV('./phcs.csv');
  const medicines = await readCSV('./medicines.csv');
  const footfalls = await readCSV('./footfall.csv');

  console.log(`Loaded ${phcs.length} PHCs, ${medicines.length} Medicines, ${footfalls.length} Footfall records.`);

  let batch = db.batch();
  let count = 0;
  const BATCH_LIMIT = 400;

  async function commitBatch() {
    if (count > 0) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  function setDoc(docRef, data) {
    batch.set(docRef, data);
    count++;
    if (count >= BATCH_LIMIT) return commitBatch();
    return Promise.resolve();
  }

  // 1. Process PHCs
  for (const phc of phcs) {
    const docRef = db.collection('phcs').doc(phc.phc_id);
    await setDoc(docRef, {
      name: phc.name,
      district: phc.district,
      state: phc.state,
      lat: parseFloat(phc.lat),
      lng: parseFloat(phc.lng),
      beds: {
        total: parseInt(phc.total_beds, 10),
        occupied: parseInt(phc.occupied_beds, 10)
      },
      staff: {
        doctors_sanctioned: parseInt(phc.doctors_sanctioned, 10),
        doctors_present: parseInt(phc.doctors_present, 10),
        nurses_sanctioned: parseInt(phc.nurses_sanctioned, 10),
        nurses_present: parseInt(phc.nurses_present, 10)
      },
      emergency: false,
      risk: {
        score: 0,
        bucket: "Low",
        components: { medicine: 0, bed: 0, surge: 0, staff: 0 }
      }
    });
  }

  // 2. Process Medicines
  for (const med of medicines) {
    const phcId = med.phc_id;
    const medId = med.medicine; 
    const docRef = db.collection(`phcs/${phcId}/medicines`).doc(medId);
    await setDoc(docRef, {
      name: med.medicine,
      current_stock: parseInt(med.current_stock, 10),
      avg_daily_consumption: parseInt(med.avg_daily_consumption, 10),
      units_per_patient: parseInt(med.units_per_patient, 10),
      min_safety_stock: parseInt(med.min_safety_stock, 10),
      expiry_date: Timestamp.fromDate(new Date(med.expiry_date)),
      incoming_qty: parseInt(med.incoming_qty, 10)
    });
  }

  // 3. Process Footfall
  for (const ff of footfalls) {
    const phcId = ff.phc_id;
    const dateStr = ff.date;
    const docRef = db.collection(`phcs/${phcId}/footfall`).doc(dateStr);
    await setDoc(docRef, {
      patients: parseInt(ff.patients, 10)
    });
  }

  // 4. Generate Distance Cache
  for (let i = 0; i < phcs.length; i++) {
    for (let j = 0; j < phcs.length; j++) {
      if (i === j) continue;
      const phcA = phcs[i];
      const phcB = phcs[j];
      const distData = calcDistanceAndTravelTime(
        parseFloat(phcA.lat), parseFloat(phcA.lng),
        parseFloat(phcB.lat), parseFloat(phcB.lng)
      );
      
      const distId = `${phcA.phc_id}_${phcB.phc_id}`;
      const docRef = db.collection('distance_cache').doc(distId);
      await setDoc(docRef, {
        distance_km: distData.distance_km,
        travel_time_min: distData.travel_time_min
      });
    }
  }

  // 5. Network State
  const networkRef = db.collection('network').doc('state');
  await setDoc(networkRef, {
    emergency_districts: [],
    last_recompute: Timestamp.now()
  });

  // 6. Seed mock forecasts
  for (const phc of phcs) {
     const docRef = db.collection('forecasts').doc(phc.phc_id);
     await setDoc(docRef, {
       generated_at: Timestamp.now(),
       footfall_7d: [100, 105, 110, 115, 120, 125, 130],
       demand_7d: {
         "ORS": [400, 420, 440, 460, 480, 500, 520]
       }
     });
  }

  await commitBatch();
  console.log("✅ Import completed successfully!");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
