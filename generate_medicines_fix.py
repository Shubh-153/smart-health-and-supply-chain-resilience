import pandas as pd
import numpy as np
from datetime import datetime, timedelta

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

phcs = pd.read_csv("seed/phcs.csv")
footfall = pd.read_csv("seed/footfall.csv")
avg_footfall = footfall.groupby('phc_id')['patients'].mean()

phc_ids = phcs['phc_id'].tolist()
medicines = ["ORS", "Paracetamol", "Amoxicillin", "IV Fluids", "Iron-Folic Acid"]
units_per_patient = {
    "ORS": 4, "Paracetamol": 2, "Amoxicillin": 1, "IV Fluids": 1, "Iron-Folic Acid": 5
}

today = datetime(2026, 8, 22)
far_future = today + timedelta(days=500)
near_expiry = today + timedelta(days=20)

data = []

for phc_id in phc_ids:
    base_f = avg_footfall[phc_id]
    for med in medicines:
        u_p_p = units_per_patient[med]
        # Mathematically coherent average consumption
        expected_cons = int(base_f * u_p_p)
        
        row = {
            "phc_id": phc_id,
            "medicine": med,
            "units_per_patient": u_p_p,
            "min_safety_stock": 500,
            "expiry_date": far_future.strftime("%Y-%m-%d"),
            "incoming_qty": 0
        }
        
        if phc_id == "PHC-02" and med == "ORS":
            row["current_stock"] = 800
            row["avg_daily_consumption"] = 280
        elif phc_id == "PHC-02" and med == "Paracetamol":
            row["current_stock"] = 0 
            row["avg_daily_consumption"] = expected_cons
        elif phc_id == "PHC-03" and med == "Paracetamol":
            row["current_stock"] = 0 
            row["avg_daily_consumption"] = expected_cons
        elif phc_id == "PHC-04" and med == "Paracetamol":
            row["current_stock"] = 0 
            row["avg_daily_consumption"] = expected_cons
        elif phc_id == "PHC-01" and med == "ORS":
            row["current_stock"] = 8500
            row["avg_daily_consumption"] = 400
        else:
            row["current_stock"] = int(np.random.randint(2000, 5000))
            row["avg_daily_consumption"] = expected_cons
            
        if phc_id == "PHC-03" and med == "Amoxicillin":
            row["expiry_date"] = near_expiry.strftime("%Y-%m-%d")
            
        data.append(row)

df = pd.DataFrame(data)
df.to_csv("seed/medicines.csv", index=False)
