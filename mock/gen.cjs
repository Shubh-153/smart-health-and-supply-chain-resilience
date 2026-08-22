const fs = require('fs');

const medicines = ['ORS', 'Paracetamol', 'Amoxicillin', 'IV Fluids', 'Iron-Folic Acid'];

const phcs = [
  { id: 'PHC-01', name: 'Ludhiana Rural PHC-01', district: 'Ludhiana', state: 'Punjab', lat: 30.9, lng: 75.8, total_beds: 50, occupied_beds: 20, doctors_sanctioned: 5, doctors_present: 5, nurses_sanctioned: 10, nurses_present: 9, risk_bucket: 'Low', risk_score: 25 },
  { id: 'PHC-02', name: 'Ludhiana Rural PHC-02', district: 'Ludhiana', state: 'Punjab', lat: 30.91, lng: 75.82, total_beds: 50, occupied_beds: 45, doctors_sanctioned: 5, doctors_present: 3, nurses_sanctioned: 10, nurses_present: 8, risk_bucket: 'Critical', risk_score: 85 },
  { id: 'PHC-03', name: 'Ludhiana Urban PHC-03', district: 'Ludhiana', state: 'Punjab', lat: 30.92, lng: 75.85, total_beds: 40, occupied_beds: 30, doctors_sanctioned: 4, doctors_present: 3, nurses_sanctioned: 8, nurses_present: 7, risk_bucket: 'High', risk_score: 65 },
  { id: 'PHC-04', name: 'Ludhiana North PHC-04', district: 'Ludhiana', state: 'Punjab', lat: 30.95, lng: 75.88, total_beds: 30, occupied_beds: 15, doctors_sanctioned: 3, doctors_present: 3, nurses_sanctioned: 6, nurses_present: 6, risk_bucket: 'Medium', risk_score: 45 },
  { id: 'PHC-05', name: 'Ludhiana South PHC-05', district: 'Ludhiana', state: 'Punjab', lat: 30.85, lng: 75.81, total_beds: 60, occupied_beds: 20, doctors_sanctioned: 6, doctors_present: 6, nurses_sanctioned: 12, nurses_present: 11, risk_bucket: 'Low', risk_score: 20 },
  { id: 'PHC-06', name: 'Jalandhar Central PHC-06', district: 'Jalandhar', state: 'Punjab', lat: 31.32, lng: 75.57, total_beds: 50, occupied_beds: 48, doctors_sanctioned: 5, doctors_present: 2, nurses_sanctioned: 10, nurses_present: 6, risk_bucket: 'Critical', risk_score: 90 },
  { id: 'PHC-07', name: 'Jalandhar East PHC-07', district: 'Jalandhar', state: 'Punjab', lat: 31.35, lng: 75.60, total_beds: 40, occupied_beds: 32, doctors_sanctioned: 4, doctors_present: 3, nurses_sanctioned: 8, nurses_present: 6, risk_bucket: 'High', risk_score: 70 },
  { id: 'PHC-08', name: 'Jalandhar West PHC-08', district: 'Jalandhar', state: 'Punjab', lat: 31.30, lng: 75.55, total_beds: 30, occupied_beds: 15, doctors_sanctioned: 3, doctors_present: 3, nurses_sanctioned: 6, nurses_present: 5, risk_bucket: 'Medium', risk_score: 50 },
  { id: 'PHC-09', name: 'Jalandhar North PHC-09', district: 'Jalandhar', state: 'Punjab', lat: 31.38, lng: 75.58, total_beds: 45, occupied_beds: 18, doctors_sanctioned: 4, doctors_present: 4, nurses_sanctioned: 9, nurses_present: 8, risk_bucket: 'Low', risk_score: 28 },
  { id: 'PHC-10', name: 'Jalandhar South PHC-10', district: 'Jalandhar', state: 'Punjab', lat: 31.28, lng: 75.59, total_beds: 55, occupied_beds: 22, doctors_sanctioned: 5, doctors_present: 5, nurses_sanctioned: 11, nurses_present: 10, risk_bucket: 'Low', risk_score: 22 }
];

const generateHistory = (trend, base) => {
  return Array.from({length: 30}, (_, i) => {
    let noise = Math.floor(Math.random() * 10) - 5;
    let seasonal = i === 15 ? 40 : 0; // one seasonal spike
    let val = base + noise + seasonal;
    if (trend === 'up' && i >= 23) val += (i - 23) * 5;
    return val;
  });
};

const stockData = {};
const forecastData = {};
const stockoutData = {};

phcs.forEach(phc => {
  let isPHC2 = phc.id === 'PHC-02';
  let isPHC1 = phc.id === 'PHC-01';
  
  let phcMedicines = medicines.map(med => {
    let isORS = med === 'ORS';
    let current_stock = 500;
    let avg_daily_consumption = 30;
    let min_safety_stock = 100;
    let incoming_qty = 0;
    
    if (isPHC2 && isORS) {
      current_stock = 840; // 3 days remaining => 840 / 280 = 3
      avg_daily_consumption = 280;
    } else if (isPHC1 && isORS) {
      current_stock = 3000;
      avg_daily_consumption = 50;
      min_safety_stock = 200;
    }
    
    return {
      name: med,
      current_stock,
      avg_daily_consumption,
      min_safety_stock,
      expiry_date: '2027-01-01',
      incoming_qty
    };
  });
  
  stockData[phc.id] = phcMedicines;
  
  // Forecasts
  let baseFootfall = 100;
  if (isPHC2) baseFootfall = 250;
  let history = generateHistory(isPHC2 ? 'up' : 'flat', baseFootfall);
  
  forecastData[phc.id] = {
    footfall_forecast_7d: [baseFootfall+10, baseFootfall+12, baseFootfall+15, baseFootfall+18, baseFootfall+20, baseFootfall+22, baseFootfall+25],
    medicine_demand_forecast: medicines.map(med => {
      let isORS = med === 'ORS';
      let ratio = isORS ? (isPHC2 ? 1.1 : 0.5) : 0.3; // units per patient
      return {
        medicine: med,
        daily_demand: Array.from({length: 7}, (_, i) => Math.floor((baseFootfall + 10 + i * 2) * ratio))
      };
    })
  };
  
  // Stockouts
  stockoutData[phc.id] = phcMedicines.map(med => {
    let isORS = med === 'ORS';
    let days = Math.floor(med.current_stock / med.avg_daily_consumption);
    let trend = 5;
    if (isPHC2 && isORS) trend = 18;
    
    return {
      medicine: med.name,
      days_remaining: (isPHC2 && isORS) ? 3 : days,
      trend_pct: trend,
      severity: (isPHC2 && isORS) ? 'Critical' : (days <= 7 ? 'High' : (days <= 14 ? 'Medium' : 'Low')),
      current_stock: med.current_stock,
      daily_consumption: med.avg_daily_consumption
    };
  });
});

const apiData = {
  summary: {
    india: { critical: 2, high: 2, stockouts: 2, bed_availability_pct: 65, staff_availability_pct: 75 },
    state_Punjab: { critical: 2, high: 2, stockouts: 2, bed_availability_pct: 65, staff_availability_pct: 75 },
    district_Ludhiana: { critical: 1, high: 1, stockouts: 1, bed_availability_pct: 70, staff_availability_pct: 80 },
    district_Jalandhar: { critical: 1, high: 1, stockouts: 1, bed_availability_pct: 60, staff_availability_pct: 70 }
  },
  phcs: phcs,
  phc_details: phcs.reduce((acc, phc) => {
    acc[phc.id] = {
      ...phc,
      medicines: stockData[phc.id],
      footfall_history_30d: generateHistory(phc.id === 'PHC-02' ? 'up' : 'flat', phc.id === 'PHC-02' ? 250 : 100)
    };
    return acc;
  }, {}),
  forecasts: forecastData,
  stockouts: stockoutData,
  recommendations: {
    'Ludhiana': [
      {
        source_phc_id: 'PHC-01',
        destination_phc_id: 'PHC-02',
        medicine: 'ORS',
        quantity: 1500,
        distance_km: 18,
        travel_time_min: 35,
        post_transfer_risk_score: 65
      }
    ],
    'Jalandhar': []
  },
  alerts: {
    'Ludhiana': [
      {
        phc_id: 'PHC-02',
        medicine: 'ORS',
        alert_text: 'PHC-02 will run out of ORS in 3 days due to an 18% upward trend in footfall. Transfer 1500 units from PHC-01 (18 km away, 35 min travel time).'
      }
    ]
  },
  federated_status: {
    local_models: [
      { region: 'Punjab', accuracy_pct: 92.4 },
      { region: 'Maharashtra', accuracy_pct: 89.1 }
    ],
    global_model: {
      aggregated_accuracy_pct: 91.5,
      last_sync: '2026-08-22T10:00:00Z',
      message: 'Global prediction is a weighted average of local outputs. Patient data never leaves the region.'
    }
  }
};

fs.writeFileSync('mock/api.json', JSON.stringify(apiData, null, 2));
