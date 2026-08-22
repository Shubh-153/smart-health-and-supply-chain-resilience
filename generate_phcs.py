import pandas as pd
import numpy as np

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

phcs = [
    {
        "phc_id": "PHC-01",
        "name": "Ludhiana Central PHC",
        "district": "Ludhiana",
        "state": "Punjab",
        "lat": 30.9010,
        "lng": 75.8573,
        "total_beds": 50,
        "occupied_beds": 20,
        "doctors_sanctioned": 10,
        "doctors_present": 10,
        "nurses_sanctioned": 20,
        "nurses_present": 20,
    },
    {
        "phc_id": "PHC-02",
        "name": "Sahnewal Rural PHC",
        "district": "Ludhiana",
        "state": "Punjab",
        "lat": 30.8248,
        "lng": 75.9754,
        "total_beds": 30,
        "occupied_beds": 30,
        "doctors_sanctioned": 5,
        "doctors_present": 1,
        "nurses_sanctioned": 10,
        "nurses_present": 2,
    },
    {
        "phc_id": "PHC-03",
        "name": "Jagraon PHC",
        "district": "Ludhiana",
        "state": "Punjab",
        "lat": 30.7850,
        "lng": 75.4750,
        "total_beds": 40,
        "occupied_beds": 35,
        "doctors_sanctioned": 8,
        "doctors_present": 4,
        "nurses_sanctioned": 15,
        "nurses_present": 8,
    },
    {
        "phc_id": "PHC-04",
        "name": "Jalandhar Cantonment PHC",
        "district": "Jalandhar",
        "state": "Punjab",
        "lat": 31.3000,
        "lng": 75.6000,
        "total_beds": 25,
        "occupied_beds": 22,
        "doctors_sanctioned": 4,
        "doctors_present": 2,
        "nurses_sanctioned": 8,
        "nurses_present": 4,
    },
    {
        "phc_id": "PHC-05",
        "name": "Phillaur PHC",
        "district": "Jalandhar",
        "state": "Punjab",
        "lat": 31.0250,
        "lng": 75.7850,
        "total_beds": 35,
        "occupied_beds": 30, # Adjusted to hit Medium
        "doctors_sanctioned": 6,
        "doctors_present": 5,
        "nurses_sanctioned": 12,
        "nurses_present": 11,
    },
    {
        "phc_id": "PHC-06",
        "name": "Khanna PHC",
        "district": "Ludhiana",
        "state": "Punjab",
        "lat": 30.7000,
        "lng": 76.2100,
        "total_beds": 45,
        "occupied_beds": 20,
        "doctors_sanctioned": 8,
        "doctors_present": 8,
        "nurses_sanctioned": 16,
        "nurses_present": 15,
    },
    {
        "phc_id": "PHC-07",
        "name": "Nakodar PHC",
        "district": "Jalandhar",
        "state": "Punjab",
        "lat": 31.1200,
        "lng": 75.4700,
        "total_beds": 30,
        "occupied_beds": 10,
        "doctors_sanctioned": 5,
        "doctors_present": 4,
        "nurses_sanctioned": 10,
        "nurses_present": 9,
    },
    {
        "phc_id": "PHC-08",
        "name": "Raikot PHC",
        "district": "Ludhiana",
        "state": "Punjab",
        "lat": 30.6500,
        "lng": 75.6000,
        "total_beds": 20,
        "occupied_beds": 8,
        "doctors_sanctioned": 4,
        "doctors_present": 4,
        "nurses_sanctioned": 8,
        "nurses_present": 8,
    },
    {
        "phc_id": "PHC-09",
        "name": "Samrala PHC",
        "district": "Ludhiana",
        "state": "Punjab",
        "lat": 30.8300,
        "lng": 76.1800,
        "total_beds": 25,
        "occupied_beds": 12,
        "doctors_sanctioned": 5,
        "doctors_present": 4,
        "nurses_sanctioned": 10,
        "nurses_present": 8,
    },
    {
        "phc_id": "PHC-10",
        "name": "Kartarpur PHC",
        "district": "Jalandhar",
        "state": "Punjab",
        "lat": 31.4300,
        "lng": 75.5000,
        "total_beds": 35,
        "occupied_beds": 30, # Adjusted to hit Medium
        "doctors_sanctioned": 6,
        "doctors_present": 5,
        "nurses_sanctioned": 12,
        "nurses_present": 10,
    }
]

df = pd.DataFrame(phcs)
df.to_csv("seed/phcs.csv", index=False)

def clamp(val, min_val, max_val):
    return max(min_val, min(val, max_val))

def compute_risk(row, med_risk, surge_risk):
    bed_risk = 25 * clamp(row['occupied_beds'] / row['total_beds'], 0, 1)
    staff_sanctioned = row['doctors_sanctioned'] + row['nurses_sanctioned']
    staff_present = row['doctors_present'] + row['nurses_present']
    staff_risk = 15 * clamp(1 - (staff_present / staff_sanctioned), 0, 1)
    
    total = med_risk + bed_risk + surge_risk + staff_risk
    score = round(min(total, 100))
    
    if score <= 30: bucket = "Low"
    elif score <= 60: bucket = "Medium"
    elif score <= 80: bucket = "High"
    else: bucket = "Critical"
    
    return pd.Series({
        'Med Risk': round(med_risk, 1),
        'Surge Risk': round(surge_risk, 1),
        'Bed Risk': round(bed_risk, 1),
        'Staff Risk': round(staff_risk, 1),
        'Total Score': score,
        'Bucket': bucket
    })

mock_med_risks = [10, 40, 25, 25, 10, 10, 10, 10, 10, 10]
mock_surge_risks = [0, 7.2, 10, 10, 5, 0, 5, 0, 5, 5]

risk_df = pd.concat([df[['phc_id', 'name']], df.apply(lambda row: compute_risk(row, mock_med_risks[row.name], mock_surge_risks[row.name]), axis=1)], axis=1)

print("Baseline Risk Score Computation (Assuming mocked medicine/surge risks):")
print(risk_df.to_string(index=False))
