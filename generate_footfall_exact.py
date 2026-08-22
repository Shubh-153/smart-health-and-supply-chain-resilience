import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
from scipy.optimize import minimize

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

def evaluate_y(y):
    model = LinearRegression()
    model.fit(X_hist[features], y)
    preds = model.predict(X_fwd[features])
    pred_31 = preds[0]
    actual_last_7 = np.mean(y[-7:])
    forecast_next_7 = np.mean(preds)
    trend_pct = (forecast_next_7 - actual_last_7) / actual_last_7 * 100
    # We want exactly 67.0 and 18.0 (rounded to integer is fine, but let's get it to 18.0)
    # The requirement says "trend percentage as an integer", so it must round to 18.
    # 17.5 to 18.49 is fine. Let's target exactly 18.0 and 67.0.
    err = abs(pred_31 - 67.0) + abs(trend_pct - 18.0)
    return err, pred_31, trend_pct

def generate_exact_phc02():
    season = np.array([-15 if d.weekday() == 6 else 2.5 for d in dates])
    
    def loss(params):
        base, slope, bump = params
        t = np.arange(30)
        y = base + slope * t + season
        y[-7:] += bump
        model = LinearRegression()
        model.fit(X_hist[features], y)
        preds = model.predict(X_fwd[features])
        return (preds[0] - 67.0)**2 + (((np.mean(preds) - np.mean(y[-7:])) / np.mean(y[-7:]) * 100) - 18.0)**2

    res = minimize(loss, [30.0, 1.0, -10.0], method='Nelder-Mead')
    base, slope, bump = res.x
    t = np.arange(30)
    y_float = base + slope * t + season
    y_float[-7:] += bump
    y = np.round(y_float).astype(int)
    
    # Discrete optimization (hill climbing)
    err, _, _ = evaluate_y(y)
    for _ in range(5000):
        idx = np.random.randint(0, 30)
        delta = np.random.choice([-1, 1])
        y_new = y.copy()
        y_new[idx] += delta
        new_err, p, t_pct = evaluate_y(y_new)
        if new_err < err:
            err = new_err
            y = y_new
            if err < 0.05:
                break
    return y

data = []
for phc_id in phc_ids:
    if phc_id == "PHC-02":
        y = generate_exact_phc02()
    else:
        base = np.random.randint(40, 120)
        season = np.array([-0.3 if d.weekday() == 6 else 0.05 for d in dates])
        noise = np.random.normal(0, base * 0.05, 30)
        y_vals = base * (1 + season) + noise
        y = np.maximum(np.round(y_vals), 5).astype(int)
        
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
err, pred, trend = evaluate_y(y_hist)
print(f"PHC-02 Day 31 Forecast: {pred:.2f}")
print(f"PHC-02 Trend %: {trend:.2f}%")

