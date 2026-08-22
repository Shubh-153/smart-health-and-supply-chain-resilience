const fs = require('fs');
const { computeRisk } = require('./functions/lib/compute.js');

const inputData = JSON.parse(fs.readFileSync(0, 'utf-8'));
const results = {};

for (const phcId in inputData) {
    const data = inputData[phcId];
    results[phcId] = computeRisk(data.phc, data.worst_days_remaining, data.trend_pct);
}
console.log(JSON.stringify(results));
