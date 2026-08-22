import fs from 'fs';

const liveBase = 'http://127.0.0.1:5001/supply-43d81/us-central1/api';
const mockData = JSON.parse(fs.readFileSync('./mock/api.json', 'utf8'));

async function diff() {
  console.log('Comparing live API responses against frozen mock contract...\n');
  try {
    const summaryLive = await fetch(`${liveBase}/summary?scope=district&id=Ludhiana`).then(r => r.json());
    console.log('[GET /summary] Live response fetched. Match:', Object.keys(summaryLive).join(',') === Object.keys(mockData.summary.district.ludhiana).join(','));
  } catch (err) {
    console.log('[!] Backend unreachable at', liveBase);
    console.log('Please ensure your Firebase emulators or local backend is running on port 5001.');
  }
}
diff();
