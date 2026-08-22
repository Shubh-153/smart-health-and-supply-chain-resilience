# Aarogya Grid Firestore Schema

This document details the exact Firestore data model based on Design Doc §A3. 
**Rule:** Raw values are stored; derived values (like `risk`) are computed by the backend and written back to Firestore to optimize reads.

## `phcs` Collection
Path: `phcs/{phc_id}`
Represents a Primary Health Centre.

| Field | Type | Raw/Derived | Description |
|---|---|---|---|
| `name` | string | Raw | Name of the facility |
| `district` | string | Raw | District the PHC belongs to |
| `state` | string | Raw | State the PHC belongs to |
| `lat` | number | Raw | Latitude |
| `lng` | number | Raw | Longitude |
| `beds.total` | number | Raw | Total beds available |
| `beds.occupied` | number | Raw | Currently occupied beds |
| `staff.doctors_sanctioned` | number | Raw | Number of doctors allocated |
| `staff.doctors_present` | number | Raw | Number of doctors currently present |
| `staff.nurses_sanctioned` | number | Raw | Number of nurses allocated |
| `staff.nurses_present` | number | Raw | Number of nurses currently present |
| `emergency` | boolean | Raw | Indicates if the PHC is under emergency mode |
| `risk.score` | number | Derived | Computed overall risk score (0-100) |
| `risk.bucket` | string | Derived | Severity bucket (e.g., Low, Medium, High, Critical) |
| `risk.components.medicine` | number | Derived | Medicine component of risk |
| `risk.components.bed` | number | Derived | Bed capacity component of risk |
| `risk.components.surge` | number | Derived | Patient footfall surge component of risk |
| `risk.components.staff` | number | Derived | Staffing shortage component of risk |

---

## `phcs/{phc_id}/medicines` Subcollection
Path: `phcs/{phc_id}/medicines/{medicine_id}`
Inventory of specific medicines at a PHC.

| Field | Type | Raw/Derived | Description |
|---|---|---|---|
| `name` | string | Raw | Name of the medicine |
| `current_stock` | number | Raw | Current physical units available |
| `avg_daily_consumption` | number | Raw | Historical daily burn rate |
| `units_per_patient` | number | Raw | Standard units prescribed per patient |
| `min_safety_stock` | number | Raw | Threshold below which shortage alerts fire |
| `expiry_date` | timestamp | Raw | Expiration date of the current batch |
| `incoming_qty` | number | Raw | Units currently in transit / ordered |

---

## `phcs/{phc_id}/footfall` Subcollection
Path: `phcs/{phc_id}/footfall/{date}` (where date is YYYY-MM-DD string)
Historical patient visits.

| Field | Type | Raw/Derived | Description |
|---|---|---|---|
| `patients` | number | Raw | Number of patients who visited on this date |

---

## `forecasts` Collection
Path: `forecasts/{phc_id}`
AI/ML generated projections for the next 7 days.

| Field | Type | Raw/Derived | Description |
|---|---|---|---|
| `generated_at` | timestamp | Derived | When this forecast was run |
| `footfall_7d` | array<number> | Derived | Projected patient counts for the next 7 days |
| `demand_7d` | map<string, array<number>> | Derived | Projected daily demand per medicine_id |

---

## `recommendations` Collection
Path: `recommendations/{rec_id}`
Generated transfer suggestions to resolve shortages.

| Field | Type | Raw/Derived | Description |
|---|---|---|---|
| `source_phc` | string | Derived | ID of the PHC supplying the medicine |
| `dest_phc` | string | Derived | ID of the PHC receiving the medicine |
| `medicine` | string | Derived | The medicine_id being transferred |
| `qty` | number | Derived | Number of units recommended for transfer |
| `distance_km` | number | Derived | Distance between facilities |
| `travel_time_min` | number | Derived | Driving time between facilities |
| `cost` | number | Derived | Algorithmic cost score of this recommendation |
| `projected_risk_after` | number | Derived | Dest PHC's risk score if transfer completes |
| `status` | string | Derived | E.g., 'pending', 'confirmed' |

---

## `alerts_cache` Collection
Path: `alerts_cache/{phc_id}_{medicine}_{state_hash}`
Cached alert narratives to avoid redundant LLM calls.

| Field | Type | Raw/Derived | Description |
|---|---|---|---|
| `text` | string | Derived | The generated narrative or template fallback |
| `generated_at` | timestamp | Derived | When this alert was created |
| `source` | string | Derived | Either "gemini" or "template" |

---

## `distance_cache` Collection
Path: `distance_cache/{phcA}_{phcB}`
Statically pre-computed distance matrix data to avoid API quotas during demo.

| Field | Type | Raw/Derived | Description |
|---|---|---|---|
| `distance_km` | number | Raw/Seed | Road distance in kilometers |
| `travel_time_min` | number | Raw/Seed | Expected travel time in minutes |

---

## `network` Collection
Path: `network/state` (Singleton)
Global network state configuration.

| Field | Type | Raw/Derived | Description |
|---|---|---|---|
| `emergency_districts` | array<string> | Derived | List of districts currently in emergency mode |
| `last_recompute` | timestamp | Derived | Timestamp of the last global recalculation |
