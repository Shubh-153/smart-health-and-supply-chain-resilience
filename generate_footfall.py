import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

phcs = pd.read_csv("seed/phcs.csv")
phc_ids = phcs['phc_id'].tolist()

end_date = datetime(2026, 8, 22)
dates = [end_date - timedelta(days=29 - i) for i in range(30)]

def build_features(dates_list):
    df = pd.DataFrame({'date': dates_list})
    df['t'] = np.arange(len(dates_list))
    df['dow'] = df['date'].dt.dayofweek
    for d in range(7):
        df[f'dow_{d}'] = (df['dow'] == d).astype(int)
    return df

X_hist = build_features(dates)
dates_fwd = [end_date + timedelta(days=i) for i in range(1, 8)]
X_fwd = build_features(dates_fwd)
X_fwd['t'] += 30

features = ['t'] + [f'dow_{d}' for d in range(7)]

def simulate_phc_linear(phc_id, target_forecast_31=None, target_trend_pct=None, base_level=70):
    best_y = None
    best_err = float('inf')
    
    season = np.array([-0.3 if d.weekday() == 6 else 0.05 for d in dates])
    
    for _ in range(2000):
        # We need a continuous trend to make the linear regression extrapolate higher than the recent actuals
        noise = np.random.normal(0, base_level * 0.05, 30)
        
        if target_trend_pct:
            # y = a + bt
            # We found b ~ 0.08 * a gives 18% trend
            slope = np.random.uniform(0.06, 0.10) * base_level
        else:
            slope = np.random.uniform(0.0, 0.02) * base_level
            
        t_arr = np.arange(30)
        
        # We can add an extra bump in the last 7 days as requested, but the main driver must be the continuous slope
        bump = np.zeros(30)
        if target_trend_pct:
            # We actually want the actual_last_7d_avg to be a bit lower than the regression line so the forecast jumps up!
            # So the "deliberate upward trend in the final 7 days" might just be the visual slope.
            # Let's just use the slope.
            pass
            
        y = base_level + slope * t_arr + base_level * season + noise
        y = np.maximum(y, 5)
        
        model = LinearRegression()
        model.fit(X_hist[features], y)
        preds = model.predict(X_fwd[features])
        
        pred_31 = preds[0]
        actual_last_7d_avg = np.mean(y[-7:])
        forecast_next_7d_avg = np.mean(preds)
        
        trend_pct = (forecast_next_7d_avg - actual_last_7d_avg) / actual_last_7d_avg * 100
        
        if target_forecast_31 and target_trend_pct:
            # We want pred_31 exactly close to 67, and trend_pct close to 18
            err = abs(pred_31 - target_forecast_31) + abs(trend_pct - target_trend_pct)
            if err < best_err:
                best_err = err
                best_y = y
                if err < 0.2: # Very strict
                    break
        else:
            best_y = y
            break
            
    return np.round(best_y).astype(int)

data = []
for phc_id in phc_ids:
    if phc_id == "PHC-02":
        y = simulate_phc_linear(phc_id, target_forecast_31=67, target_trend_pct=18.0, base_level=30)
    elif phc_id == "PHC-01":
        y = simulate_phc_linear(phc_id, base_level=100)
    else:
        base = np.random.randint(40, 120)
        y = simulate_phc_linear(phc_id, base_level=base)
        
    for i, date in enumerate(dates):
        data.append({
            "phc_id": phc_id,
            "date": date.strftime("%Y-%m-%d"),
            "patients": y[i]
        })

df = pd.DataFrame(data)
df.to_csv("seed/footfall.csv", index=False)

phc2_data = df[df['phc_id'] == "PHC-02"]
y_hist = phc2_data['patients'].values
model = LinearRegression()
model.fit(X_hist[features], y_hist)
preds = model.predict(X_fwd[features])
actual_last_7 = np.mean(y_hist[-7:])
forecast_next_7 = np.mean(preds)
trend = (forecast_next_7 - actual_last_7) / actual_last_7 * 100
print(f"PHC-02 Day 31 Forecast (should be 67): {preds[0]:.2f}")
print(f"PHC-02 Trend % (should be 18.0): {trend:.2f}%")

