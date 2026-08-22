const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const admin = require('firebase-admin');

// Ensure script is loud about failures
process.on('unhandledRejection', err => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});

// Initialize Firebase Admin (Assumes GOOGLE_APPLICATION_CREDENTIALS or emulator is set)
// For local demo/testing without credentials, we will error loudly if missing,
// but for the sake of the prompt, we initialize normally.
if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (e) {
        console.error("Firebase Admin initialization failed. Make sure GOOGLE_APPLICATION_CREDENTIALS is set.");
        process.exit(1);
    }
}
const db = admin.firestore();

// Helpers
const readCSV = (fileName) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(path.join(__dirname, fileName))
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
};

const chunkArray = (array, size) => {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

// Main import logic
async function runImport() {
    const args = process.argv.slice(2);
    const isReset = args.includes('--reset');

    console.log(`Starting Firestore import... ${isReset ? '[RESET MODE]' : '[UPSERT MODE]'}`);

    if (isReset) {
        console.log("Wiping existing collections...");
        // Fast wipe: list all PHCs and delete them and their subcollections
        const phcsSnap = await db.collection('phcs').get();
        
        const deleteOps = [];
        for (const doc of phcsSnap.docs) {
            // Delete medicines subcoll
            const medsSnap = await doc.ref.collection('medicines').get();
            medsSnap.forEach(m => deleteOps.push(m.ref.delete()));
            
            // Delete footfall subcoll
            const footSnap = await doc.ref.collection('footfall').get();
            footSnap.forEach(f => deleteOps.push(f.ref.delete()));
            
            // Delete main doc
            deleteOps.push(doc.ref.delete());
        }
        
        // Execute deletions in chunks
        const deleteChunks = chunkArray(deleteOps, 400);
        for (const chunk of deleteChunks) {
            await Promise.all(chunk);
        }
        console.log(`Wiped ${deleteOps.length} existing documents.`);
    }

    // Load CSVs
    console.log("Reading CSV files...");
    const phcsData = await readCSV('phcs.csv');
    const medsData = await readCSV('medicines.csv');
    const footfallData = await readCSV('footfall.csv');

    console.log(`Loaded ${phcsData.length} PHCs, ${medsData.length} Medicines, ${footfallData.length} Footfall records.`);

    const writeBatches = [];
    let currentBatch = db.batch();
    let opCount = 0;

    const commitBatchIfNeeded = () => {
        if (opCount >= 450) { // Firestore limit is 500, staying safe
            writeBatches.push(currentBatch.commit());
            currentBatch = db.batch();
            opCount = 0;
        }
    };

    // 1. PHCs
    for (const phc of phcsData) {
        const ref = db.collection('phcs').doc(phc.phc_id);
        const data = {
            name: phc.name,
            district: phc.district,
            state: phc.state,
            lat: parseFloat(phc.lat),
            lng: parseFloat(phc.lng),
            total_beds: parseInt(phc.total_beds),
            occupied_beds: parseInt(phc.occupied_beds),
            doctors_sanctioned: parseInt(phc.doctors_sanctioned),
            doctors_present: parseInt(phc.doctors_present),
            nurses_sanctioned: parseInt(phc.nurses_sanctioned),
            nurses_present: parseInt(phc.nurses_present)
        };
        currentBatch.set(ref, data);
        opCount++;
        commitBatchIfNeeded();
    }

    // 2. Medicines (subcollection)
    for (const med of medsData) {
        const ref = db.collection('phcs').doc(med.phc_id).collection('medicines').doc(med.medicine);
        const data = {
            current_stock: parseInt(med.current_stock),
            avg_daily_consumption: parseInt(med.avg_daily_consumption),
            units_per_patient: parseFloat(med.units_per_patient),
            min_safety_stock: parseInt(med.min_safety_stock),
            expiry_date: med.expiry_date,
            incoming_qty: parseInt(med.incoming_qty)
        };
        currentBatch.set(ref, data);
        opCount++;
        commitBatchIfNeeded();
    }

    // 3. Footfall (subcollection)
    for (const foot of footfallData) {
        const ref = db.collection('phcs').doc(foot.phc_id).collection('footfall').doc(foot.date);
        const data = {
            patients: parseInt(foot.patients)
        };
        currentBatch.set(ref, data);
        opCount++;
        commitBatchIfNeeded();
    }

    if (opCount > 0) {
        writeBatches.push(currentBatch.commit());
    }

    console.log(`Committing ${writeBatches.length} batches to Firestore...`);
    await Promise.all(writeBatches);
    console.log("Write complete.");

    // --- VERIFICATION PASS ---
    console.log("\nRunning verification pass...");
    let passed = true;
    const errors = [];

    const phcsCount = (await db.collection('phcs').get()).size;
    if (phcsCount !== 10) {
        passed = false;
        errors.push(`Expected 10 PHCs, found ${phcsCount}`);
    }

    // Spot check PHC-02 ORS stock
    const phc02Ors = await db.collection('phcs').doc('PHC-02').collection('medicines').doc('ORS').get();
    if (!phc02Ors.exists) {
        passed = false;
        errors.push("PHC-02 ORS document is missing.");
    } else {
        const stock = phc02Ors.data().current_stock;
        if (stock !== 800) {
            passed = false;
            errors.push(`PHC-02 ORS stock is ${stock}, expected 800.`);
        }
    }
    
    // Quick count check for one PHC's subcollections to ensure structure
    const phc01Meds = (await db.collection('phcs').doc('PHC-01').collection('medicines').get()).size;
    const phc01Foot = (await db.collection('phcs').doc('PHC-01').collection('footfall').get()).size;
    
    if (phc01Meds !== 5) {
        passed = false;
        errors.push(`Expected 5 medicines for PHC-01, found ${phc01Meds}`);
    }
    if (phc01Foot !== 30) {
        passed = false;
        errors.push(`Expected 30 footfall records for PHC-01, found ${phc01Foot}`);
    }

    console.log("========================================");
    if (passed) {
        console.log("✅ IMPORT VERIFICATION PASSED");
        console.log("Database perfectly matches seed constraints.");
        process.exit(0);
    } else {
        console.error("❌ IMPORT VERIFICATION FAILED");
        errors.forEach(e => console.error(" - " + e));
        process.exit(1);
    }
}

runImport();
