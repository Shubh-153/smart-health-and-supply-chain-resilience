import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Set deterministic seed
random.seed(42)
np.random.seed(42)

# --- 1. STATES AND DISTRICTS (150 PHCs total) ---
# Punjab: 20
punjab_districts = ['Ludhiana', 'Jalandhar', 'Amritsar', 'Patiala', 'Mohali']
# Other 12 states: 130
other_states = {
    'Maharashtra': ['Pune', 'Nagpur', 'Nashik', 'Thane'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Trichy'],
    'West Bengal': ['Kolkata', 'Howrah', 'Darjeeling', 'Malda'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri']
}

phc_master = []
staff_data = []
medicine_inventory = []
patient_footfall = []

medicines = ['Paracetamol', 'ORS', 'Amoxicillin', 'Insulin', 'Iron Tablets', 'Cough Syrup', 'IV Fluids', 'Antiseptic Solution']

# Generate 150 PHCs
phc_id_counter = 1

# Base lat/longs for some states to keep them somewhat realistic
base_coords = {
    'Punjab': (30.9, 75.8),
    'Maharashtra': (19.0, 73.0),
    'Uttar Pradesh': (26.8, 80.9),
    'Tamil Nadu': (11.1, 78.6),
    'West Bengal': (22.9, 87.8),
    'Rajasthan': (27.0, 74.2),
    'Karnataka': (15.3, 75.7),
    'Bihar': (25.0, 85.3),
    'Gujarat': (22.2, 71.1),
    'Madhya Pradesh': (22.9, 78.6),
    'Kerala': (10.8, 76.2),
    'Telangana': (18.1, 79.2),
    'Odisha': (20.9, 85.0)
}

# Distribute 150 PHCs
state_distribution = []
for _ in range(20): state_distribution.append(('Punjab', random.choice(punjab_districts)))

other_states_list = list(other_states.keys())
for i in range(130):
    state = other_states_list[i % len(other_states_list)]
    district = random.choice(other_states[state])
    state_distribution.append((state, district))

# Select exactly 15 PHCs for outbreak/critical status
critical_indices = random.sample(range(150), 15)
# Ensure at least 3 are in Punjab
punjab_critical_count = sum(1 for i in critical_indices if state_distribution[i][0] == 'Punjab')
while punjab_critical_count < 3:
    # swap a non-punjab critical with a punjab non-critical
    non_punjab_crit = next(i for i in critical_indices if state_distribution[i][0] != 'Punjab')
    punjab_non_crit = next(i for i in range(150) if state_distribution[i][0] == 'Punjab' and i not in critical_indices)
    critical_indices.remove(non_punjab_crit)
    critical_indices.append(punjab_non_crit)
    punjab_critical_count = sum(1 for i in critical_indices if state_distribution[i][0] == 'Punjab')

# Healthy PHCs
healthy_indices = random.sample([i for i in range(150) if i not in critical_indices], 15)

today = datetime.now()

for idx, (state, district) in enumerate(state_distribution):
    phc_id = f"PHC-{phc_id_counter:03d}"
    
    # 1. PHC MASTER DATA
    is_critical = idx in critical_indices
    is_healthy = idx in healthy_indices
    
    total_beds = random.randint(20, 150)
    
    if is_critical:
        occupied_beds = int(total_beds * random.uniform(0.9, 1.0))
    elif is_healthy:
        occupied_beds = int(total_beds * random.uniform(0.4, 0.6))
    else:
        occupied_beds = int(total_beds * random.uniform(0.6, 0.85))
        
    icu_beds = random.randint(0, 10) if total_beds > 50 else 0
    
    lat = base_coords[state][0] + random.uniform(-1.0, 1.0)
    lng = base_coords[state][1] + random.uniform(-1.0, 1.0)
    
    phc_master.append({
        'phc_id': phc_id,
        'phc_name': f"{district} {'Central' if random.random() > 0.5 else 'Rural'} Health Centre",
        'state': state,
        'district': district,
        'latitude': round(lat, 4),
        'longitude': round(lng, 4),
        'facility_type': random.choice(['Rural', 'Urban', 'District Hospital']),
        'total_beds': total_beds,
        'occupied_beds': occupied_beds,
        'icu_beds': icu_beds
    })
    
    # 2. STAFF DATA
    docs_sanc = random.randint(3, 10)
    nurs_sanc = docs_sanc * random.randint(2, 4)
    pharm_sanc = random.randint(1, 3)
    
    if is_critical:
        docs_pres = int(docs_sanc * random.uniform(0.4, 0.6))
        nurs_pres = int(nurs_sanc * random.uniform(0.5, 0.7))
        pharm_pres = int(pharm_sanc * random.uniform(0.3, 0.8))
    elif is_healthy:
        docs_pres = int(docs_sanc * random.uniform(0.9, 1.0))
        nurs_pres = int(nurs_sanc * random.uniform(0.9, 1.0))
        pharm_pres = pharm_sanc
    else:
        docs_pres = int(docs_sanc * random.uniform(0.7, 0.9))
        nurs_pres = int(nurs_sanc * random.uniform(0.7, 0.9))
        pharm_pres = int(pharm_sanc * random.uniform(0.8, 1.0))
        
    staff_data.append({
        'phc_id': phc_id,
        'doctors_sanctioned': docs_sanc,
        'doctors_present': docs_pres,
        'nurses_sanctioned': nurs_sanc,
        'nurses_present': nurs_pres,
        'pharmacists_sanctioned': pharm_sanc,
        'pharmacists_present': pharm_pres
    })
    
    # 3. PATIENT FOOTFALL (30 days)
    base_footfall = random.randint(100, 300)
    for day in range(30):
        d = today - timedelta(days=29 - day)
        daily_var = random.randint(-20, 20)
        patients = base_footfall + daily_var
        
        # Outbreak spike in last 5 days
        if is_critical and day >= 25:
            patients = int(patients * random.uniform(1.8, 2.5))
            
        patient_footfall.append({
            'phc_id': phc_id,
            'date': d.strftime('%Y-%m-%d'),
            'patients_count': patients
        })
        
    # 4. MEDICINE INVENTORY
    num_meds = random.randint(5, 8)
    selected_meds = random.sample(medicines, num_meds)
    
    # The outbreak typically strains ORS, IV Fluids, or Paracetamol. Make them low if critical
    for med in selected_meds:
        daily_cons = random.randint(50, 200)
        
        if is_critical and med in ['ORS', 'IV Fluids', 'Paracetamol']:
            daily_cons = int(daily_cons * 2.0)
            current_stock = int(daily_cons * random.uniform(1.0, 3.0)) # 1-3 days left
        elif is_healthy:
            current_stock = int(daily_cons * random.uniform(20.0, 40.0)) # 20-40 days left
        else:
            current_stock = int(daily_cons * random.uniform(8.0, 15.0)) # 8-15 days left
            
        min_safety = daily_cons * 7
        
        expiry = today + timedelta(days=random.randint(30, 365))
        inc_qty = 0
        inc_eta = 0
        
        if current_stock < min_safety and random.random() > 0.5:
            inc_qty = daily_cons * random.randint(10, 30)
            inc_eta = random.randint(2, 10)
            
        medicine_inventory.append({
            'phc_id': phc_id,
            'medicine_name': med,
            'current_stock': current_stock,
            'daily_consumption': daily_cons,
            'minimum_safety_stock': min_safety,
            'expiry_date': expiry.strftime('%Y-%m-%d'),
            'incoming_shipment_qty': inc_qty,
            'incoming_shipment_eta_days': inc_eta
        })
        
    phc_id_counter += 1

pd.DataFrame(phc_master).to_csv('seed/phc_master.csv', index=False)
pd.DataFrame(staff_data).to_csv('seed/staff_data.csv', index=False)
pd.DataFrame(patient_footfall).to_csv('seed/patient_footfall.csv', index=False)
pd.DataFrame(medicine_inventory).to_csv('seed/medicine_inventory.csv', index=False)

print("Generated 4 CSV files in seed/ directory.")
