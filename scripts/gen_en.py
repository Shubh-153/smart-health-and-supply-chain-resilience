import json
import os

replacements = {
    "dataGrid": {
        "facility": "Facility",
        "stockStatus": "Stock Status",
        "trend": "Trend (7d)",
        "risk": "Risk",
        "transfer": "Transfer",
        "triage": "Triage",
        "beds": "Beds",
        "staff": "Staff %",
        "district": "District"
    },
    "facilityList": {
        "error": "Facility data connection dropped. Showing an empty facility list instead.",
        "empty": "No facilities at risk in this {{scope}}. Last checked 2 minutes ago.",
        "cards": "Cards",
        "grid": "Grid"
    },
    "recommendationRail": {
        "title": "AI Transfer Recommendations",
        "subtitle": "Review and approve network rebalancing.",
        "empty": "No recommendations.",
        "approve": "Approve",
        "from": "from",
        "to": "to",
        "km": "km",
        "riskReduction": "risk reduction",
        "riskReductionTitle": "Risk reduction",
        "error": "Data stream disconnected."
    },
    "riskBreakdown": {
        "title": "Risk Factors",
        "stock": "Stock",
        "demand": "Demand",
        "beds": "Beds",
        "staff": "Staff"
    },
    "summaryBar": {
        "title": "Network Snapshot",
        "totalFacilities": "Total Facilities",
        "avgRiskScore": "Avg Risk Score",
        "critical": "Critical",
        "activeTransfers": "Active Transfers",
        "error": "Connection lost."
    },
    "triageTag": {
        "risk": "Risk",
        "viewDetails": "View details"
    },
    "aggregateView": {
        "empty": "No facilities found.",
        "networkOverview": "Network Overview",
        "activeAlerts": "Active Alerts",
        "facilitiesAtRisk": "Facilities at Risk",
        "riskDistribution": "Risk Distribution",
        "aiRecommendations": "AI Recommendations"
    },
    "notFound": {
        "title": "404",
        "subtitle": "Page not found",
        "return": "Return to Dashboard"
    },
    "phcView": {
        "stockOutIn": "Stock out in",
        "days": "days",
        "forecast": "7-Day Forecast",
        "inventory": "Medicine Inventory",
        "riskAnalysis": "Risk Analysis",
        "footfall": "Patient Footfall"
    },
    "layout": {
        "breadcrumbs": {
            "india": "India"
        },
        "header": {
            "title": "Aarogya Grid",
            "openNavigation": "Open navigation",
            "searchFacilities": "Search facilities",
            "search": "Search...",
            "simulated": "Simulated",
            "simulatedTooltip": "Data is generated for simulation"
        }
    },
    "sidebar": {
        "expand": "Expand",
        "collapse": "Collapse",
        "ariaNavigation": "Facility navigation",
        "loading": "Navigation unavailable. Use breadcrumbs above.",
        "header": "Navigation",
        "close": "Close navigation"
    },
    "forecastChart": {
        "count": "Count:",
        "range": "Range:",
        "status": "Status:",
        "predicted": "Predicted",
        "recorded": "Recorded",
        "historicalPattern": "Based on 30-day historical pattern",
        "today": "TODAY"
    },
    "medicineTable": {
        "medicine": "Medicine",
        "currentStock": "Current Stock",
        "dailyCons": "Daily Cons.",
        "daysRem": "Days Rem.",
        "status": "Status"
    },
    "triage": {
        "critical": "Critical",
        "high": "High",
        "medium": "Medium",
        "low": "Low"
    },
    "glossary": {
        "ariaLabel": "Glossary",
        "title": "Glossary",
        "close": "Close glossary",
        "searchPlaceholder": "Search terms...",
        "noTermsFound": "No terms found matching \"{{query}}\"",
        "terms": {
            "riskScore": {
                "term": "Risk Score",
                "def": "A composite 0-100 metric calculated daily. It weights current stock levels (40%), forecasted demand (35%), and local infrastructure capacity (25%)."
            },
            "triageBands": {
                "term": "Triage Bands",
                "def": "Facilities are classified into four bands based on risk score: Minimal (0–30), Delayed (31–60), Urgent (61–80), and Immediate (81–100). These map to clinical triage terminology."
            },
            "stockDays": {
                "term": "Stock Days",
                "def": "The number of days a medicine will last at current consumption rates. Calculated as current stock ÷ average daily consumption."
            },
            "demandSurge": {
                "term": "Demand Surge",
                "def": "A predicted increase in patient footfall based on the 7-day AI forecast model. Expressed as a percentage above the 30-day baseline."
            },
            "transferRecommendation": {
                "term": "Transfer Recommendation",
                "def": "An AI-generated suggestion to move medicine stock from a facility with surplus to one facing shortage. Shows source, destination, quantity, distance, and projected risk reduction."
            },
            "bedOccupancy": {
                "term": "Bed Occupancy",
                "def": "The percentage of a facility's total beds currently in use. High occupancy (>80%) signals capacity pressure."
            },
            "staffRatio": {
                "term": "Staff Ratio",
                "def": "The proportion of sanctioned (approved) staff positions currently filled. Low ratios indicate staffing shortages."
            }
        }
    },
    "helpTooltip": {
        "moreInfo": "More information"
    },
    "alertCard": {
        "actionRequired": "Action Required",
        "reviewTransfer": "Review transfer"
    },
    "alertRail": {
        "emergencyText": "CRITICAL: PHC-02 footfall surging abruptly. ORS stockout projected in <24 hours. Immediate transfer required to stabilize reserve.",
        "error": "Alert stream disconnected. Showing zero active alerts.",
        "empty": "No active alerts for this {{scope}}."
    },
    "emergencyControls": {
        "updating": "Updating...",
        "simulate": "Simulate emergency",
        "reset": "Reset network",
        "triggerTitle": "Trigger Emergency?",
        "triggerDesc": "This will inject simulated crises into the network, recalculate all risk scores, and generate new AI transfer recommendations.",
        "cancel": "Cancel",
        "triggerBtn": "Trigger"
    },
    "searchPalette": {
        "placeholder": "Search facilities by name, ID, district...",
        "ariaSearch": "Search facilities",
        "esc": "Esc",
        "recent": "Recent",
        "typeToSearch": "Type to search across all facilities",
        "noResults": "No facilities matching \"{{query}}\"",
        "navigate": "↑↓ Navigate",
        "select": "↵ Select",
        "close": "Esc Close"
    }
}

os.makedirs("src/locales/en", exist_ok=True)
with open("src/locales/en/translation.json", "w") as f:
    json.dump(replacements, f, indent=2)
    
print("Generated en/translation.json")
