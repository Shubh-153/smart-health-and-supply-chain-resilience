require('dotenv').config({ path: '../.env' });
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const useMockDistances = !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.includes('your_google_maps_api_key');

if (useMockDistances) {
  console.log("⚠️ No valid Google Maps API Key found. Falling back to simulated Haversine routing math!");
}

// Helper to pause execution
const sleep = ms => new Promise(res => setTimeout(res, ms));

// Simulated Distance Math (used if no API key is provided)
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
  console.log("Fetching PHCs and current distance cache...");
  
  const [phcsSnap, cacheSnap] = await Promise.all([
    db.collection('phcs').get(),
    db.collection('distance_cache').get()
  ]);

  const phcs = phcsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const cachedKeys = new Set();
  cacheSnap.forEach(d => cachedKeys.add(d.id));

  const missingByOrigin = {};
  let totalMissingPairs = 0;

  for (const origin of phcs) {
    for (const dest of phcs) {
      if (origin.id === dest.id) continue;
      
      const key = `${origin.id}_${dest.id}`;
      if (!cachedKeys.has(key)) {
        if (!missingByOrigin[origin.id]) {
          missingByOrigin[origin.id] = { origin, destinations: [] };
        }
        missingByOrigin[origin.id].destinations.push(dest);
        totalMissingPairs++;
      }
    }
  }

  if (totalMissingPairs === 0) {
    console.log("✅ All pairs are already cached. No API calls needed.");
    return;
  }

  console.log(`Found ${totalMissingPairs} missing pairs to cache.`);
  let apiCallsUsed = 0;
  let pairsCached = 0;

  let batch = db.batch();
  let batchCount = 0;
  
  async function commitBatch() {
    if (batchCount > 0) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  for (const originId of Object.keys(missingByOrigin)) {
    const { origin, destinations } = missingByOrigin[originId];
    
    for (let i = 0; i < destinations.length; i += 100) {
      const destChunk = destinations.slice(i, i + 100);
      
      if (useMockDistances) {
        // Fallback: Generate distances locally without API
        for (const destPHC of destChunk) {
          const cacheKey = `${origin.id}_${destPHC.id}`;
          const distData = calcDistanceAndTravelTime(origin.lat, origin.lng, destPHC.lat, destPHC.lng);
          
          const docRef = db.collection('distance_cache').doc(cacheKey);
          batch.set(docRef, distData);
          pairsCached++;
          batchCount++;
          if (batchCount === 400) await commitBatch();
        }
      } else {
        // Original: Call Google Maps API
        const originStr = `${origin.lat},${origin.lng}`;
        const destStr = destChunk.map(d => `${d.lat},${d.lng}`).join('|');
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originStr}&destinations=${destStr}&key=${GOOGLE_MAPS_API_KEY}`;
        
        try {
          const response = await fetch(url);
          const data = await response.json();
          apiCallsUsed++;

          if (data.status !== 'OK') {
            console.error(`Google Maps API error: ${data.status} - ${data.error_message || ''}`);
            continue;
          }

          const elements = data.rows[0].elements;
          for (let j = 0; j < elements.length; j++) {
            const element = elements[j];
            const destPHC = destChunk[j];
            const cacheKey = `${origin.id}_${destPHC.id}`;
            
            if (element.status === 'OK') {
              const distance_km = Math.round((element.distance.value / 1000) * 10) / 10;
              const travel_time_min = Math.round(element.duration.value / 60);

              const docRef = db.collection('distance_cache').doc(cacheKey);
              batch.set(docRef, { distance_km, travel_time_min });
              
              pairsCached++;
              batchCount++;
              if (batchCount === 400) await commitBatch();
            }
          }
        } catch (err) {
          console.error(`Fetch failed for origin ${origin.id}:`, err);
        }
        await sleep(100); // Rate limiting
      }
    }
  }

  await commitBatch();

  console.log(`\n✅ Distance Caching Complete!`);
  console.log(`- Pairs cached this run: ${pairsCached}`);
  if (!useMockDistances) console.log(`- Total Maps API calls used: ${apiCallsUsed}`);
}

run().catch(console.error);
