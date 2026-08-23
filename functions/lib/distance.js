const { getFirestore } = require("firebase-admin/firestore");

/**
 * Retrieves the cached distance and travel time between two PHCs.
 * Strictly reads from Firestore cache (pre-seeded) per FR-6.4.
 * NEVER calls the Google Maps API directly at request time.
 * 
 * @param {string} phcA_id - The source PHC ID
 * @param {string} phcB_id - The destination PHC ID
 * @returns {Promise<{distance_km: number, travel_time_min: number}>}
 */
async function getDistance(phcA_id, phcB_id) {
  if (phcA_id === phcB_id) {
    return { distance_km: 0, travel_time_min: 0 };
  }

  const db = getFirestore();
  const cacheKey = `${phcA_id}_${phcB_id}`;
  
  const docRef = db.collection('distance_cache').doc(cacheKey);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new Error(
      `Missing distance cache for pair ${cacheKey}. ` +
      `Ensure seed/cache-distances.js has been run successfully.`
    );
  }

  return docSnap.data();
}

module.exports = { getDistance };
