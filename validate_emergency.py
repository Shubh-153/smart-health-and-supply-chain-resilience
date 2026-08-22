import time
import pandas as pd
import numpy as np
from app import compute_phc_forecast

def clamp(val, min_val, max_val):
    return max(min_val, min(val, max_val))

def compute_risk(phc, worst_days_remaining, trend_pct, emergency=False):
    medicine_risk = 40.0 * clamp(1.0 - (worst_days_remaining / 14.0), 0.0, 1.0)
    
    # Recalculate bed occupancy if emergency (e.g. 50% increase)
    occ = phc['occupied_beds'] * 1.5 if emergency else phc['occupied_beds']
    bed_risk = 25.0 * clamp(occ / phc['total_beds'], 0.0, 1.0)
    
    surge_risk = 20.0 * clamp(trend_pct / 50.0, 0.0, 1.0)
    
    staff_sanctioned = phc['doctors_sanctioned'] + phc['nurses_sanctioned']
    staff_present = phc['doctors_present'] + phc['nurses_present']
    staff_ratio = (staff_present / staff_sanctioned) if staff_sanctioned > 0 else 1.0
    staff_risk = 15.0 * clamp(1.0 - staff_ratio, 0.0, 1.0)
    
    total = medicine_risk + bed_risk + surge_risk + staff_risk
    score = int(total + 0.5) if total >= 0 else int(total - 0.5)
    score = min(score, 100)
    
    if score <= 30: bucket = "Low"
    elif score <= 60: bucket = "Medium"
    elif score <= 80: bucket = "High"
    else: bucket = "Critical"
    
    return score, bucket

def run_validation():
    phcs_df = pd.read_csv("seed/phcs.csv")
    phc_list = phcs_df.to_dict('records')
    
    results = []
    
    # Measure total execution time for 10 PHCs
    start_time = time.perf_counter()
    
    for phc in phc_list:
        phc_id = phc['phc_id']
        
        # --- BASELINE ---
        base_res = compute_phc_forecast(phc_id, None)
        base_stockouts = base_res['stockouts']
        base_worst_days = min([m['days_remaining'] for m in base_stockouts])
        base_ors_days = next(m['days_remaining'] for m in base_stockouts if m['medicine'] == 'ORS')
        base_score, base_bucket = compute_risk(phc, base_worst_days, base_res['trend_pct'], False)
        
        # --- EMERGENCY ---
        emg_res = compute_phc_forecast(phc_id, 2.5) # multiplier scales footprint in app.py
        emg_stockouts = emg_res['stockouts']
        emg_worst_days = min([m['days_remaining'] for m in emg_stockouts])
        emg_ors_days = next(m['days_remaining'] for m in emg_stockouts if m['medicine'] == 'ORS')
        emg_score, emg_bucket = compute_risk(phc, emg_worst_days, emg_res['trend_pct'], True)
        
        results.append({
            "phc_id": phc_id,
            "base_ors": base_ors_days,
            "emg_ors": emg_ors_days,
            "base_score": base_score,
            "base_bucket": base_bucket,
            "emg_score": emg_score,
            "emg_bucket": emg_bucket
        })
        
    end_time = time.perf_counter()
    duration_ms = (end_time - start_time) * 1000
    
    # Check NaN / Negatives
    for r in results:
        for k, v in r.items():
            if isinstance(v, (int, float)):
                assert not np.isnan(v), f"NaN found in {k} for {r['phc_id']}"
                assert v >= 0, f"Negative value found in {k} for {r['phc_id']}"
    
    print("="*90)
    print(f"{'PHC':<10} | {'Base ORS':<10} | {'Emg ORS':<10} | {'Base Score':<12} | {'Emg Score':<12} | {'Bucket Shift'}")
    print("-" * 90)
    
    bucket_shifts = 0
    phc02_ors_base = 0
    phc02_ors_emg = 0
    
    bucket_rank = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    
    for r in results:
        shift_str = f"{r['base_bucket']} -> {r['emg_bucket']}"
        if bucket_rank[r['emg_bucket']] > bucket_rank[r['base_bucket']]:
            bucket_shifts += 1
            shift_str += " ⚠️ (UP)"
            
        print(f"{r['phc_id']:<10} | {r['base_ors']:<10} | {r['emg_ors']:<10} | {r['base_score']:<3} ({r['base_bucket']:<7}) | {r['emg_score']:<3} ({r['emg_bucket']:<7}) | {shift_str}")
        
        if r['phc_id'] == "PHC-02":
            phc02_ors_base = r['base_ors']
            phc02_ors_emg = r['emg_ors']
            
    print("="*90)
    print(f"Total time for 10 PHCs: {duration_ms:.2f} ms")
    budget_pct = (duration_ms / 5000.0) * 100
    print(f"Budget Consumed: {budget_pct:.2f}% of 5.0 seconds")
    
    # Assertions
    print("\n--- Assertions ---")
    
    # PHC-02 ORS check
    print(f"1. PHC-02 ORS stockout drops from 3 to ~2?")
    if phc02_ors_base == 3 and phc02_ors_emg <= 2:
        print("   ✅ PASS")
    else:
        print(f"   ❌ FAIL (Base: {phc02_ors_base}, Emg: {phc02_ors_emg})")
        
    print(f"2. At least two PHCs cross into higher severity bucket?")
    if bucket_shifts >= 2:
        print(f"   ✅ PASS ({bucket_shifts} shifts detected)")
    else:
        print(f"   ❌ FAIL (Only {bucket_shifts} shifts)")
        
    print(f"3. No negative or NaN values?")
    print("   ✅ PASS")
    
if __name__ == "__main__":
    run_validation()
