import json
import os

with open("src/locales/en/translation.json", "r") as f:
    data = json.load(f)

# Update SummaryBar
data["summaryBar"].update({
    "criticalCount": "Critical count",
    "atRiskCount": "At risk count",
    "medicineStockOuts": "Medicine stock-outs",
    "bedOccupancy": "Bed occupancy %",
    "staffAvailability": "Staff availability %"
})

# Update AggregateView
data["aggregateView"].update({
    "stateOf": "State of {{name}}",
    "indiaNational": "India (National)",
    "noFacilitySelected": "No facility selected",
    "noFacilityDesc": "Please select a facility from the sidebar to view detailed metrics and AI recommendations.",
    "networkSummary": "Aggregated metrics and facility status.",
    "facilities": "Facilities"
})

# Update common
data["common"] = {
    "indiaNational": "India (National)",
    "returnToDistrict": "Return to District",
    "dataLoadFailed": "Data Load Failed",
    "phcNotFound": "The requested Primary Health Centre \"<strong>{{phcId}}</strong>\" could not be retrieved. Showing an empty facility layout.",
    "simulationUnavailable": "Simulation Data Unavailable",
    "datasetBlank": "The dataset is currently blank for this facility. Showing an empty layout."
}

# Update PhcView
data["phcView"].update({
    "patientForecast": "Patient Forecast",
    "inventoryStatus": "Inventory Status",
    "thirtyDayTrend": "30-Day Trend & AI Forecast",
    "forecastUnavailable": "Forecast data unavailable",
    "criticalMedicines": "Critical Medicines",
    "transferConfirmed": "Transfer confirmed",
    "riskScoreTooltip": "This score combines medicine supply risk (40%), bed capacity (25%), demand surge (20%), and staffing levels (15%). Range: 0 (minimal risk) to 100 (critical).",
    "forecastTooltip": "Solid line: recorded daily patient visits over the past 30 days. Dashed line: 7-day AI prediction with ±15% confidence band (shaded area).",
    "medicineTooltip": "Medicine stock levels sorted by urgency. 'Days Rem.' shows how long current stock will last at current consumption rates."
})

# Update RecommendationRail
data["recommendationRail"].update({
    "networkError": "Recommendation Engine Disconnected",
    "emptyTransfers": "No Transfers Needed",
    "emptyDesc": "There are currently no active transfer recommendations for this facility. Stock levels are either within safe operational margins, or no nearby surplus exists to facilitate a transfer.",
    "transferQueued": "Transfer Queued",
    "transferFinalized": "Transfer Finalized",
    "undo": "Undo ({{timeLeft}}s)",
    "notifiedFinalized": "Logistics team has been notified for {{quantity}} units of {{medicine}} from {{source}}.",
    "notifiedQueued": "Logistics team will be notified for {{quantity}} units of {{medicine}} from {{source}}.",
    "destination": "Destination",
    "itemQuantity": "Item & Quantity",
    "logistics": "Logistics",
    "min": "min",
    "transferDisabled": "Transfer Disabled",
    "networkIssue": "Transfer request failed. Network issue encountered."
})

# Update AlertCard
data["alertCard"].update({
    "template": "{{phc_name}} is projected to exhaust {{medicine}} in {{days}} days. Transfer {{quantity}} units from {{source}}."
})

with open("src/locales/en/translation.json", "w") as f:
    json.dump(data, f, indent=2)

print("Updated en/translation.json")
