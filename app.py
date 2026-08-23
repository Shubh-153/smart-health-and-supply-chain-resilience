import os
import json
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from sklearn.linear_model import LinearRegression
from datetime import datetime, timedelta

app = Flask(__name__)

# Warm-start cache
print("Loading datasets into memory...")
footfall_df = pd.read_csv("seed/patient_footfall.csv")
footfall_df['date'] = pd.to_datetime(footfall_df['date'])
medicines_df = pd.read_csv("seed/medicine_inventory.csv")
print("Ready.")

def compute_phc_forecast(phc_id, emergency_multiplier):
    phc_data = footfall_df[footfall_df['phc_id'] == phc_id].copy()
    if phc_data.empty:
        return None
        
    phc_data = phc_data.sort_values('date').reset_index(drop=True)
    
    # Feature engineering
    phc_data['t'] = np.arange(len(phc_data))
    phc_data['dow'] = phc_data['date'].dt.dayofweek
    for d in range(7):
        phc_data[f'dow_{d}'] = (phc_data['dow'] == d).astype(int)
        
    features = ['t'] + [f'dow_{d}' for d in range(7)]
    
    X = phc_data[features]
    y = phc_data['patients_count']
    
    if emergency_multiplier:
        y = y * emergency_multiplier
        
    model = LinearRegression()
    model.fit(X, y)
    
    # Future features
    last_date = phc_data['date'].iloc[-1]
    future_dates = [last_date + timedelta(days=i) for i in range(1, 8)]
    
    future_df = pd.DataFrame({'date': future_dates})
    future_df['t'] = np.arange(len(phc_data), len(phc_data) + 7)
    future_df['dow'] = future_df['date'].dt.dayofweek
    for d in range(7):
        future_df[f'dow_{d}'] = (future_df['dow'] == d).astype(int)
        
    future_preds = model.predict(future_df[features])
    
    actual_last_7 = y.iloc[-7:].mean()
    forecast_next_7 = future_preds.mean()
    
    # Protect against zero division
    if actual_last_7 == 0: actual_last_7 = 1
    trend_pct = round((forecast_next_7 - actual_last_7) / actual_last_7 * 100)
    
    # Medicines
    phc_meds = medicines_df[medicines_df['phc_id'] == phc_id]
    stockouts = []
    
    # Emergency consumption multiplier logic (from P9: consumption x 1.65)
    cons_mult = 1.65 if emergency_multiplier else 1.0
    
    avg_patients = y.mean()
    if avg_patients == 0: avg_patients = 1
    
    for _, row in phc_meds.iterrows():
        med_name = row['medicine_name']
        base_daily_cons = float(row['daily_consumption'])
        
        # Calculate theoretical units_per_patient based on average historical consumption
        u_p_p = (base_daily_cons / avg_patients) * cons_mult
        
        current_stock = int(row['current_stock'])
        
        predicted_daily_consumption = round(future_preds[0] * u_p_p)
        denom = max(predicted_daily_consumption, 1)
        days_remaining = round(current_stock / denom)
        severity = "Critical" if days_remaining <= 3 else "Normal"
        
        stockouts.append({
            "medicine": med_name,
            "days_remaining": days_remaining,
            "current_stock": current_stock,
            "predicted_daily_consumption": predicted_daily_consumption,
            "trend_pct": trend_pct,
            "severity": severity
        })
        
    return {
        "forecast_7d": np.round(future_preds).astype(int).tolist(),
        "trend_pct": trend_pct,
        "stockouts": stockouts
    }

@app.route('/forecast', methods=['POST'])
def forecast():
    req = request.get_json()
    if not req or 'phc_ids' not in req:
        return jsonify({"error": "Missing phc_ids array"}), 400
        
    phc_ids = req['phc_ids']
    emergency_multiplier = req.get('emergency_multiplier')
    
    results = {}
    for phc in phc_ids:
        res = compute_phc_forecast(phc, emergency_multiplier)
        if res:
            results[phc] = res
            
    return jsonify({"data": results})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
