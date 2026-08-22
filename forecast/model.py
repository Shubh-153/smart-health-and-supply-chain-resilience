import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
import json

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

def build_features(df, start_t=0):
    df['date'] = pd.to_datetime(df['date'])
    # Time index relative to the earliest date in the full dataset
    # We will pass a globally consistent time index or just use the dataframe index
    pass

def run_forecast():
    # Load data
    footfall = pd.read_csv("seed/footfall.csv")
    medicines = pd.read_csv("seed/medicines.csv")
    
    footfall['date'] = pd.to_datetime(footfall['date'])
    
    # Sort just in case
    footfall = footfall.sort_values(by=['phc_id', 'date'])
    
    phcs = footfall['phc_id'].unique()
    
    results = {}
    
    print(f"{'PHC':<10} | {'MAE (5-day)':<15} | {'R² (5-day)':<10}")
    print("-" * 45)
    
    for phc in phcs:
        phc_df = footfall[footfall['phc_id'] == phc].copy()
        phc_df = phc_df.reset_index(drop=True)
        
        # Build features
        phc_df['t'] = np.arange(len(phc_df))
        phc_df['dow'] = phc_df['date'].dt.dayofweek
        
        # One-hot encode day of week
        for d in range(7):
            phc_df[f'dow_{d}'] = (phc_df['dow'] == d).astype(int)
            
        features = ['t'] + [f'dow_{d}' for d in range(7)]
        
        X = phc_df[features]
        y = phc_df['patients']
        
        # --- Validation (Hold out last 5 days) ---
        X_train, y_train = X.iloc[:-5], y.iloc[:-5]
        X_val, y_val = X.iloc[-5:], y.iloc[-5:]
        
        val_model = LinearRegression()
        val_model.fit(X_train, y_train)
        val_preds = val_model.predict(X_val)
        
        mae = mean_absolute_error(y_val, val_preds)
        r2 = r2_score(y_val, val_preds)
        
        print(f"{phc:<10} | {mae:<15.2f} | {r2:<10.2f}")
        
        # --- Final Forecast (Train on all 30 days) ---
        model = LinearRegression()
        model.fit(X, y)
        
        # Next 7 days
        last_date = phc_df['date'].iloc[-1]
        future_dates = [last_date + pd.Timedelta(days=i) for i in range(1, 8)]
        
        future_df = pd.DataFrame({'date': future_dates})
        future_df['t'] = np.arange(len(phc_df), len(phc_df) + 7)
        future_df['dow'] = future_df['date'].dt.dayofweek
        for d in range(7):
            future_df[f'dow_{d}'] = (future_df['dow'] == d).astype(int)
            
        future_preds = model.predict(future_df[features])
        
        # Trend calculation
        actual_last_7_avg = y.iloc[-7:].mean()
        forecast_next_7_avg = future_preds.mean()
        trend_pct = (forecast_next_7_avg - actual_last_7_avg) / actual_last_7_avg * 100
        
        # Medicines demand
        phc_meds = medicines[medicines['phc_id'] == phc]
        med_forecasts = {}
        for _, m_row in phc_meds.iterrows():
            med_name = m_row['medicine']
            u_p_p = m_row['units_per_patient']
            # Deriving 7-day demand from footfall forecast
            predicted_7d_demand = future_preds.sum() * u_p_p
            med_forecasts[med_name] = {
                "units_per_patient": u_p_p,
                "predicted_7d_demand": round(predicted_7d_demand),
                # Storing tomorrow's predicted consumption for stock-out calculation (P6)
                "predicted_daily_consumption": round(future_preds[0] * u_p_p)
            }
            
        results[phc] = {
            "forecast_7d": np.round(future_preds).astype(int).tolist(),
            "trend_pct": round(trend_pct),
            "trend_pct_exact": trend_pct,
            "medicines": med_forecasts
        }
        
    print("\n" + "="*50)
    print("PHC-02 FORECAST CHECK")
    print("="*50)
    phc2_res = results["PHC-02"]
    print(f"7-Day Forecast: {phc2_res['forecast_7d']}")
    print(f"Day 31 Forecast (Raw): {phc2_res['forecast_7d'][0]}")
    print(f"Trend Percentage: {phc2_res['trend_pct_exact']:.4f}% -> rounds to {phc2_res['trend_pct']}%")
    print("="*50)
    
    # Save output for API to use later
    with open('forecast/predictions.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_forecast()

