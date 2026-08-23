import os
import re

components_dir = "src/components"
pages_dir = "src/pages"

replacements = {
    "src/components/DataGrid.jsx": [
        ("Facility", "{t('dataGrid.facility')}"),
        ("Stock Status", "{t('dataGrid.stockStatus')}"),
        ("Trend (7d)", "{t('dataGrid.trend')}"),
        ("Risk", "{t('dataGrid.risk')}"),
        ("Transfer", "{t('dataGrid.transfer')}"),
    ],
    "src/components/FacilityList.jsx": [
        ("Facility data connection dropped. Showing an empty facility list instead.", "{t('facilityList.error')}"),
        ("No facilities at risk in this {scope}. Last checked 2 minutes ago.", "{t('facilityList.empty', { scope })}"),
        (">Cards<", ">{t('facilityList.cards')}<"),
        (">Grid<", ">{t('facilityList.grid')}<")
    ],
    "src/components/RecommendationRail.jsx": [
        ("AI Transfer Recommendations", "{t('recommendationRail.title')}"),
        ("Review and approve network rebalancing.", "{t('recommendationRail.subtitle')}"),
        ("No recommendations.", "{t('recommendationRail.empty')}"),
        ("Approve", "{t('recommendationRail.approve')}"),
        ("from", "{t('recommendationRail.from')}"),
        ("to", "{t('recommendationRail.to')}"),
        ("km", "{t('recommendationRail.km')}"),
        ("risk reduction", "{t('recommendationRail.riskReduction')}"),
        (">Risk reduction<", ">{t('recommendationRail.riskReductionTitle')}<"),
        ("Data stream disconnected.", "{t('recommendationRail.error')}")
    ],
    "src/components/RiskBreakdown.jsx": [
        ("Risk Factors", "{t('riskBreakdown.title')}"),
        ("Stock", "{t('riskBreakdown.stock')}"),
        ("Demand", "{t('riskBreakdown.demand')}"),
        ("Beds", "{t('riskBreakdown.beds')}"),
        ("Staff", "{t('riskBreakdown.staff')}")
    ],
    "src/components/SummaryBar.jsx": [
        ("Network Snapshot", "{t('summaryBar.title')}"),
        ("Total Facilities", "{t('summaryBar.totalFacilities')}"),
        ("Avg Risk Score", "{t('summaryBar.avgRiskScore')}"),
        ("Critical", "{t('summaryBar.critical')}"),
        ("Active Transfers", "{t('summaryBar.activeTransfers')}"),
        ("Connection lost.", "{t('summaryBar.error')}")
    ],
    "src/components/TriageTag.jsx": [
        (">Risk<", ">{t('triageTag.risk')}<"),
        ("View details", "{t('triageTag.viewDetails')}")
    ],
    "src/pages/AggregateView.jsx": [
        ("No facilities found.", "{t('aggregateView.empty')}"),
        ("Network Overview", "{t('aggregateView.networkOverview')}"),
        ("Active Alerts", "{t('aggregateView.activeAlerts')}"),
        ("Facilities at Risk", "{t('aggregateView.facilitiesAtRisk')}"),
        ("Risk Distribution", "{t('aggregateView.riskDistribution')}"),
        ("AI Recommendations", "{t('aggregateView.aiRecommendations')}")
    ],
    "src/pages/NotFound.jsx": [
        ("404", "{t('notFound.title')}"),
        ("Page not found", "{t('notFound.subtitle')}"),
        ("Return to Dashboard", "{t('notFound.return')}")
    ],
    "src/pages/PhcView.jsx": [
        ("Stock out in", "{t('phcView.stockOutIn')}"),
        ("days", "{t('phcView.days')}"),
        ("7-Day Forecast", "{t('phcView.forecast')}"),
        ("Medicine Inventory", "{t('phcView.inventory')}"),
        ("Risk Analysis", "{t('phcView.riskAnalysis')}"),
        ("Patient Footfall", "{t('phcView.footfall')}")
    ]
}

def process_file(filepath, strings):
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        return
        
    with open(filepath, "r") as f:
        content = f.read()

    original = content
    
    # 1. Add import
    if "useTranslation" not in content:
        # insert after first import
        content = re.sub(r"(import .*?;)", r"\1\nimport { useTranslation } from 'react-i18next';", content, count=1)
        
    # 2. Add hook to component
    # Try to find default export
    func_match = re.search(r"export default function \w+\([^)]*\)\s*{", content)
    if func_match:
        func_def = func_match.group(0)
        if "useTranslation" not in content[func_match.end():func_match.end()+100]:
            content = content.replace(func_def, func_def + "\n  const { t } = useTranslation();")
            
    # 3. Replace strings
    for old, new in strings:
        content = content.replace(old, new)
        
    # Fix specific triage string replacement (like in TriageTag, DataGrid, FacilityList)
    # TriageTag has risk_bucket.toLowerCase()
    content = re.sub(r">\{?(phc\.risk_bucket)\}?<", r">{t(`triage.${phc.risk_bucket.toLowerCase()}`)}<", content)
    
    if content != original:
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Updated {filepath}")

for path, strings in replacements.items():
    process_file(path, strings)
