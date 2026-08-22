import pandas as pd
import json
import subprocess
import sys

def clamp(val, min_val, max_val):
    return max(min_val, min(val, max_val))

def compute_risk_py(phc, worst_days_remaining, trend_pct):
    medicine_risk = 40.0 * clamp(1.0 - (worst_days_remaining / 14.0), 0.0, 1.0)
    bed_risk = 25.0 * clamp(phc['occupied_beds'] / phc['total_beds'], 0.0, 1.0)
    surge_risk = 20.0 * clamp(trend_pct / 50.0, 0.0, 1.0)
    
    staff_sanctioned = phc['doctors_sanctioned'] + phc['nurses_sanctioned']
    staff_present = phc['doctors_present'] + phc['nurses_present']
    staff_ratio = (staff_present / staff_sanctioned) if staff_sanctioned > 0 else 1.0
    staff_risk = 15.0 * clamp(1.0 - staff_ratio, 0.0, 1.0)
    
    total = medicine_risk + bed_risk + surge_risk + staff_risk
    # Python 3 round() uses bankers rounding (round half to even)
    # JS Math.round() uses round half up.
    # To ensure exact parity, we must implement round half up in python for positive numbers
    score = int(total + 0.5) if total >= 0 else int(total - 0.5)
    score = min(score, 100)
    
    return {
        "medicine_risk": round(medicine_risk, 2),
        "bed_risk": round(bed_risk, 2),
        "surge_risk": round(surge_risk, 2),
        "staff_risk": round(staff_risk, 2),
        "total": score
    }

def run_cross_validation():
    phcs = pd.read_csv("seed/phcs.csv")
    with open("forecast/stockouts.json", "r") as f:
        stockouts = json.load(f)
        
    cross_val_input = {}
    py_results = {}
    
    # Prepare data
    for _, row in phcs.iterrows():
        phc_id = row['phc_id']
        phc_dict = row.to_dict()
        
        # Get worst days remaining
        phc_stockouts = stockouts.get(phc_id, [])
        if not phc_stockouts:
            continue
            
        worst_days = min([m['days_remaining'] for m in phc_stockouts])
        trend_pct = phc_stockouts[0]['trend_pct'] # Same for all meds at a PHC
        
        cross_val_input[phc_id] = {
            "phc": phc_dict,
            "worst_days_remaining": worst_days,
            "trend_pct": trend_pct
        }
        
        py_results[phc_id] = compute_risk_py(phc_dict, worst_days, trend_pct)
        
    # Run Node implementation
    input_json = json.dumps(cross_val_input)
    proc = subprocess.run(['node', 'run_node_compute.js'], input=input_json, text=True, capture_output=True)
    
    if proc.returncode != 0:
        print(f"Node execution failed: {proc.stderr}")
        sys.exit(1)
        
    node_results = json.loads(proc.stdout)
    
    print("="*80)
    print("RISK SCORE CROSS-VALIDATION & COMPONENTS")
    print("="*80)
    print(f"{'PHC':<10} | {'Med':<6} | {'Bed':<5} | {'Surge':<6} | {'Staff':<6} | {'Py Total':<8} | {'Node Total':<10} | {'Match'}")
    print("-" * 80)
    
    all_match = True
    
    for phc_id in sorted(cross_val_input.keys()):
        py = py_results[phc_id]
        node_score = node_results[phc_id]
        
        match = py['total'] == node_score
        if not match:
            all_match = False
            match_str = "❌ FAIL"
        else:
            match_str = "✅ PASS"
            
        print(f"{phc_id:<10} | {py['medicine_risk']:<6.2f} | {py['bed_risk']:<5.2f} | {py['surge_risk']:<6.2f} | {py['staff_risk']:<6.2f} | {py['total']:<8} | {node_score:<10} | {match_str}")
        
    print("="*80)
    if all_match:
        print("SUCCESS: 100% Polyglot Parity between Python and Node.js risk scores.")
    else:
        print("ERROR: Divergence detected between Python and Node.js.")
        sys.exit(1)

if __name__ == "__main__":
    run_cross_validation()
