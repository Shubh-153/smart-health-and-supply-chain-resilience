function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function predictedDailyConsumption(medicine, forecast) {
  if (forecast && forecast.footfall_7d && forecast.footfall_7d.length > 0) {
    const forecast_footfall_tomorrow = forecast.footfall_7d[0];
    return forecast_footfall_tomorrow * medicine.units_per_patient;
  }
  // Fallback if no forecast available
  return medicine.avg_daily_consumption || 0;
}

function daysRemaining(medicine, forecast) {
  const pdc = predictedDailyConsumption(medicine, forecast);
  return medicine.current_stock / Math.max(pdc, 1);
}

function netPosition(medicine, forecast) {
  let predicted_demand_7d = 0;
  
  if (forecast && forecast.demand_7d && forecast.demand_7d[medicine.id]) {
    predicted_demand_7d = forecast.demand_7d[medicine.id].reduce((acc, val) => acc + val, 0);
  } else {
    // Fallback if demand_7d not specified, use daily * 7
    const pdc = predictedDailyConsumption(medicine, forecast);
    predicted_demand_7d = pdc * 7;
  }
  
  const net = medicine.current_stock - (predicted_demand_7d + medicine.min_safety_stock);
  
  if (net > 0) {
    return { surplus: net, shortage: 0 };
  } else if (net < 0) {
    return { surplus: 0, shortage: Math.abs(net) };
  }
  return { surplus: 0, shortage: 0 };
}

function riskScore(phc, medicines, forecast) {
  let worstDaysRemaining = Infinity;

  if (medicines && medicines.length > 0) {
    for (const med of medicines) {
      const dr = daysRemaining(med, forecast);
      if (dr < worstDaysRemaining) {
        worstDaysRemaining = dr;
      }
    }
  } else {
    worstDaysRemaining = 14; // Default to safe if no inventory
  }

  const medicine_risk = 40 * clamp(1 - (worstDaysRemaining / 14), 0, 1);
  
  const occupied_beds = phc.occupied_beds || (phc.beds ? phc.beds.occupied : 0);
  const total_beds = phc.total_beds || (phc.beds ? Math.max(phc.beds.total, 1) : 1);
  const bed_risk = 25 * clamp(occupied_beds / Math.max(total_beds, 1), 0, 1);
  
  const trend_pct = phc.trend_pct || 0; 
  const surge_risk = 20 * clamp(trend_pct / 50, 0, 1);
  
  let staff_present = 0;
  let staff_sanctioned = 1;
  if (phc.staff) {
    staff_present = phc.staff.doctors_present + phc.staff.nurses_present;
    staff_sanctioned = Math.max(phc.staff.doctors_sanctioned + phc.staff.nurses_sanctioned, 1);
  } else {
    staff_present = (phc.doctors_present || 0) + (phc.nurses_present || 0);
    staff_sanctioned = Math.max((phc.doctors_sanctioned || 0) + (phc.nurses_sanctioned || 0), 1);
  }
  const staff_risk = 15 * clamp(1 - (staff_present / staff_sanctioned), 0, 1);

  const raw_score = medicine_risk + bed_risk + surge_risk + staff_risk;
  const score = Math.round(Math.min(raw_score, 100));

  let bucket = "Low";
  if (score >= 81) bucket = "Critical";
  else if (score >= 61) bucket = "High";
  else if (score >= 31) bucket = "Medium";

  return {
    score,
    bucket,
    components: {
      medicine: medicine_risk,
      bed: bed_risk,
      surge: surge_risk,
      staff: staff_risk
    }
  };
}

module.exports = {
  predictedDailyConsumption,
  daysRemaining,
  netPosition,
  riskScore,
  clamp
};
