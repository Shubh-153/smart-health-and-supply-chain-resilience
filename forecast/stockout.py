import pandas as pd
import json
import math

def generate_stockouts():
    # Load data
    medicines = pd.read_csv("seed/medicines.csv")
    
    with open("forecast/predictions.json", "r") as f:
        predictions = json.load(f)
        
    phcs = medicines['phc_id'].unique()
    
    all_stockouts = {}
    
    for phc in phcs:
        phc_meds = medicines[medicines['phc_id'] == phc]
        phc_preds = predictions.get(phc, {})
        
        trend_pct = phc_preds.get("trend_pct", 0)
        med_forecasts = phc_preds.get("medicines", {})
        
        stockout_list = []
        
        for _, row in phc_meds.iterrows():
            med_name = row['medicine']
            current_stock = int(row['current_stock'])
            
            # Get predicted daily consumption for tomorrow
            med_f = med_forecasts.get(med_name, {})
            # Fallback in case of missing data: use historical avg * units
            fallback_consumption = int(row['avg_daily_consumption'])
            predicted_daily_consumption = int(med_f.get("predicted_daily_consumption", fallback_consumption))
            
            # FR-4 & 5.1: days_remaining = current_stock / max(predicted_daily_consumption, 1)
            denominator = max(predicted_daily_consumption, 1)
            
            # Integer exactness for Polyglot parity
            # Rounding to match the 'exactly 3 days' constraint from P2
            days_remaining_raw = current_stock / denominator
            days_remaining = round(days_remaining_raw)
            
            # FR-4.3: Severity flag
            severity = "Critical" if days_remaining <= 3 else "Normal"
            
            stockout_list.append({
                "medicine": med_name,
                "days_remaining": days_remaining,
                "current_stock": current_stock,
                "predicted_daily_consumption": predicted_daily_consumption,
                "trend_pct": trend_pct,
                "severity": severity
            })
            
        all_stockouts[phc] = stockout_list
        
    # Print PHC-02 to verify constraints
    print("PHC-02 Stock-out Prediction (Verifying P2 Constraints):")
    phc02_data = all_stockouts.get("PHC-02", [])
    print(json.dumps(phc02_data, indent=2))
    
    # Save output for the API
    with open("forecast/stockouts.json", "w") as f:
        json.dump(all_stockouts, f, indent=2)
        
    print(f"\nSuccessfully generated stock-out predictions for {len(all_stockouts)} PHCs.")

if __name__ == "__main__":
    generate_stockouts()
