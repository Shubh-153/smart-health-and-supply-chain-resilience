/**
 * @file client.js
 * @description API data layer for Aarogya Grid, supporting both mock and live environments.
 */

import apiData from '../../mock/api.json';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || true;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Simulates network delay for mock responses to test loading states.
 * @template T
 * @param {T} data - The data to return
 * @param {number} [ms=400] - Delay in milliseconds
 * @returns {Promise<T>}
 */
const delay = (data, ms = 400) => new Promise(resolve => setTimeout(() => resolve(data), ms));

/**
 * Fetches the mock JSON file.
 * @returns {Promise<Object>}
 */
const getMockData = async () => {
  return apiData;
};

/**
 * @typedef {Object} SummaryData
 * @property {number} critical
 * @property {number} high
 * @property {number} stockouts
 * @property {number} bed_availability_pct
 * @property {number} staff_availability_pct
 */

/**
 * Get aggregate counts for the specified scope.
 * @param {('india'|'state'|'district')} scope - The scope level
 * @param {string} [id] - The id for state or district (e.g. 'Punjab', 'Ludhiana')
 * @returns {Promise<SummaryData>}
 */
export async function getSummary(scope, id = '') {
  if (USE_MOCK) {
    const data = await getMockData();
    let key = scope;
    if (scope !== 'india' && id) key = `${scope}_${id}`;
    return delay(data.summary[key] || data.summary.india);
  }
  
  const url = new URL(`${BASE_URL}/summary`, window.location.origin);
  url.searchParams.set('scope', scope);
  if (id) url.searchParams.set('id', id);
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

/**
 * @typedef {Object} PHC
 * @property {string} id
 * @property {string} name
 * @property {string} district
 * @property {string} state
 * @property {number} lat
 * @property {number} lng
 * @property {number} total_beds
 * @property {number} occupied_beds
 * @property {number} doctors_sanctioned
 * @property {number} doctors_present
 * @property {number} nurses_sanctioned
 * @property {number} nurses_present
 * @property {string} risk_bucket - e.g., 'Low', 'Medium', 'High', 'Critical'
 * @property {number} risk_score
 */

/**
 * Get array of PHC objects with risk score and bucket.
 * @param {string} [district] - Optional district filter
 * @returns {Promise<PHC[]>}
 */
export async function getPhcs(district = '') {
  if (USE_MOCK) {
    const data = await getMockData();
    const phcs = district ? data.phcs.filter(p => p.district === district) : data.phcs;
    return delay(phcs);
  }
  
  const url = new URL(`${BASE_URL}/phcs`, window.location.origin);
  if (district) url.searchParams.set('district', district);
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch PHCs');
  return res.json();
}

/**
 * @typedef {Object} Medicine
 * @property {string} name
 * @property {number} current_stock
 * @property {number} avg_daily_consumption
 * @property {number} min_safety_stock
 * @property {string} expiry_date
 * @property {number} incoming_qty
 */

/**
 * @typedef {Object} PHCDetail
 * @property {string} id
 * @property {string} name
 * @property {string} district
 * @property {string} state
 * @property {number} lat
 * @property {number} lng
 * @property {number} total_beds
 * @property {number} occupied_beds
 * @property {number} doctors_sanctioned
 * @property {number} doctors_present
 * @property {number} nurses_sanctioned
 * @property {number} nurses_present
 * @property {string} risk_bucket
 * @property {number} risk_score
 * @property {Medicine[]} medicines
 * @property {number[]} footfall_history_30d
 */

/**
 * Get full details for a specific PHC including medicines and history.
 * @param {string} id - The PHC ID
 * @returns {Promise<PHCDetail>}
 */
export async function getPhcDetail(id) {
  if (USE_MOCK) {
    const data = await getMockData();
    const detail = data.phc_details[id];
    if (!detail) throw new Error(`PHC ${id} not found in mock data`);
    return delay(detail);
  }
  
  const res = await fetch(`${BASE_URL}/phcs/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch PHC details for ${id}`);
  return res.json();
}

/**
 * @typedef {Object} MedicineDemand
 * @property {string} medicine
 * @property {number[]} daily_demand
 */

/**
 * @typedef {Object} Forecast
 * @property {number[]} footfall_forecast_7d
 * @property {MedicineDemand[]} medicine_demand_forecast
 */

/**
 * Get 7-day footfall and per-medicine demand forecast.
 * @param {string} id - The PHC ID
 * @returns {Promise<Forecast>}
 */
export async function getPhcForecast(id) {
  if (USE_MOCK) {
    const data = await getMockData();
    return delay(data.forecasts[id]);
  }
  
  const res = await fetch(`${BASE_URL}/phcs/${id}/forecast`);
  if (!res.ok) throw new Error(`Failed to fetch forecast for ${id}`);
  return res.json();
}

/**
 * @typedef {Object} StockoutDetail
 * @property {string} medicine
 * @property {number} days_remaining
 * @property {number} trend_pct
 * @property {string} severity
 * @property {number} current_stock
 * @property {number} daily_consumption
 */

/**
 * Get predicted stockout severity and trend for medicines at a PHC.
 * @param {string} id - The PHC ID
 * @returns {Promise<StockoutDetail[]>}
 */
export async function getPhcStockout(id) {
  if (USE_MOCK) {
    const data = await getMockData();
    return delay(data.stockouts[id]);
  }
  
  const res = await fetch(`${BASE_URL}/phcs/${id}/stockout`);
  if (!res.ok) throw new Error(`Failed to fetch stockouts for ${id}`);
  return res.json();
}

/**
 * @typedef {Object} Recommendation
 * @property {string} source_phc_id
 * @property {string} destination_phc_id
 * @property {string} medicine
 * @property {number} quantity
 * @property {number} distance_km
 * @property {number} travel_time_min
 * @property {number} post_transfer_risk_score
 */

/**
 * Get ranked transfer recommendations for a district.
 * @param {string} district - The district ID or name
 * @returns {Promise<Recommendation[]>}
 */
export async function getRecommendations(district) {
  if (USE_MOCK) {
    const data = await getMockData();
    return delay(data.recommendations[district] || []);
  }
  
  const url = new URL(`${BASE_URL}/recommendations`, window.location.origin);
  if (district) url.searchParams.set('district', district);
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
}

/**
 * @typedef {Object} ConfirmTransferResponse
 * @property {number} before_risk_score
 * @property {number} after_risk_score
 */

/**
 * @typedef {Object} TransferPayload
 * @property {string} source_phc_id
 * @property {string} medicine
 * @property {number} quantity
 */

/**
 * Confirm a transfer recommendation, mutating stock and returning risk scores.
 * @param {string} destinationId - The destination PHC ID
 * @param {TransferPayload} payload - The transfer details
 * @returns {Promise<ConfirmTransferResponse>}
 */
export async function confirmRecommendation(destinationId, payload) {
  if (USE_MOCK) {
    // Return a simulated mock response for successful confirmation
    return delay({
      before_risk_score: 85,
      after_risk_score: 65
    });
  }
  
  const res = await fetch(`${BASE_URL}/recommendations/${destinationId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to confirm recommendation');
  return res.json();
}

/**
 * @typedef {Object} EmergencyStateResponse
 * @property {string} district_id
 * @property {boolean} active
 */

/**
 * Toggle emergency mode for a given district.
 * @param {string} districtId - The district ID or name
 * @param {boolean} active - Set to true to enable emergency simulation
 * @returns {Promise<EmergencyStateResponse>}
 */
export async function setEmergency(districtId, active) {
  if (USE_MOCK) {
    return delay({ district_id: districtId, active });
  }
  
  const res = await fetch(`${BASE_URL}/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ district_id: districtId, active })
  });
  if (!res.ok) throw new Error('Failed to update emergency status');
  return res.json();
}

/**
 * @typedef {Object} Alert
 * @property {string} phc_id
 * @property {string} medicine
 * @property {string} alert_text
 */

/**
 * Get Gemini narrative alerts for the scope.
 * @param {string} [district] - Optional district name
 * @returns {Promise<Alert[]>}
 */
export async function getAlerts(district = '') {
  if (USE_MOCK) {
    const data = await getMockData();
    if (district) {
      return delay(data.alerts[district] || []);
    } else {
      // If no district specified, flatten and return all alerts
      const allAlerts = Object.values(data.alerts).flat();
      return delay(allAlerts);
    }
  }
  
  const url = new URL(`${BASE_URL}/alerts`, window.location.origin);
  if (district) url.searchParams.set('district', district);
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

/**
 * @typedef {Object} LocalModel
 * @property {string} region
 * @property {number} accuracy_pct
 */

/**
 * @typedef {Object} GlobalModel
 * @property {number} aggregated_accuracy_pct
 * @property {string} last_sync
 * @property {string} message
 */

/**
 * @typedef {Object} FederatedStatus
 * @property {LocalModel[]} local_models
 * @property {GlobalModel} global_model
 */

/**
 * Get local and global federated model status and accuracies.
 * @returns {Promise<FederatedStatus>}
 */
export async function getFederatedStatus() {
  if (USE_MOCK) {
    const data = await getMockData();
    return delay(data.federated_status);
  }
  
  const res = await fetch(`${BASE_URL}/federated/status`);
  if (!res.ok) throw new Error('Failed to fetch federated status');
  return res.json();
}
