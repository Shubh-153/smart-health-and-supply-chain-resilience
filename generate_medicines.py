import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Apply strict deterministic seeding
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

phcs = pd.read_csv("seed/phcs.csv")
phc_ids = phcs['phc_id'].tolist()

medicines = ["ORS", "Paracetamol", "Amoxicillin", "IV Fluids", "Iron-Folic Acid"]
units_per_patient = {
    "ORS": 4,
    "Paracetamol": 2,
    "Amoxicillin": 1,
    "IV Fluids": 1,
    "Iron-Folic Acid": 5
}

today = datetime(2026, 8, 22)
far_future = today + timedelta(days=500)
near_expiry = today + timedelta(days=20) # Within 30 days

data = []

for phc_id in phc_ids:
    for med in medicines:
        row = {
            "phc_id": phc_id,
            "medicine": med,
            "units_per_patient": units_per_patient[med],
            "min_safety_stock": 500,
            "expiry_date": far_future.strftime("%Y-%m-%d"),
            "incoming_qty": 0
        }
        
        if phc_id == "PHC-02" and med == "ORS":
            row["current_stock"] = 800
            row["avg_daily_consumption"] = 280
        elif phc_id == "PHC-01" and med == "ORS":
            row["current_stock"] = 8500
            row["avg_daily_consumption"] = 400
        else:
            row["current_stock"] = int(np.random.randint(2000, 5000))
            row["avg_daily_consumption"] = int(np.random.randint(100, 300))
            
        if phc_id == "PHC-03" and med == "Amoxicillin":
            row["expiry_date"] = near_expiry.strftime("%Y-%m-%d")
            
        data.append(row)

df = pd.DataFrame(data)
df.to_csv("seed/medicines.csv", index=False)

# Programmatic verification
print("Verification Results:")
# Constraint 1: PHC-02 ORS
phc2_ors = df[(df['phc_id'] == 'PHC-02') & (df['medicine'] == 'ORS')].iloc[0]
print(f"PHC-02 ORS current_stock == 800: {phc2_ors['current_stock'] == 800}")
print(f"PHC-02 ORS avg_daily_consumption == 280: {phc2_ors['avg_daily_consumption'] == 280}")
# To get exactly 3 days remaining, predicted_daily_consumption must be such that round(800 / predicted) == 3
# E.g., predicted between 800/3.5 (228.5) and 800/2.5 (320).
print(f"PHC-02 ORS requires predicted daily consumption between 229 and 320 to yield 3 days (rounded).")

# Constraint 2: PHC-01 ORS surplus
phc1_ors = df[(df['phc_id'] == 'PHC-01') & (df['medicine'] == 'ORS')].iloc[0]
# We assume a max 7-day demand of say 400 * 7 = 2800.
assumed_7d_demand = phc1_ors['avg_daily_consumption'] * 7
surplus = phc1_ors['current_stock'] - (assumed_7d_demand + phc1_ors['min_safety_stock'])
print(f"PHC-01 ORS assumed surplus >= 4000: {surplus >= 4000} (Surplus = {surplus})")

# Constraint 3: One medicine expiring within 30 days
expiring = df[df['expiry_date'] == near_expiry.strftime("%Y-%m-%d")]
print(f"Number of medicines expiring within 30 days == 1: {len(expiring) == 1}")
print(f"Expiring medicine details:\n{expiring[['phc_id', 'medicine', 'expiry_date']].to_string(index=False)}")

