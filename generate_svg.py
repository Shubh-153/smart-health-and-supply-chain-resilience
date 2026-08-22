import pandas as pd
import math

df = pd.read_csv("seed/footfall.csv")
phc_ids = df['phc_id'].unique()

width = 1200
height = 800
margin = 40
chart_w = (width - 3 * margin) / 2
chart_h = (height - 6 * margin) / 5

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" style="background-color: white; font-family: sans-serif;">']

for i, phc in enumerate(phc_ids):
    row = i % 5
    col = i // 5
    
    x_offset = margin + col * (chart_w + margin)
    y_offset = margin + row * (chart_h + margin)
    
    phc_data = df[df['phc_id'] == phc]['patients'].tolist()
    min_y = min(phc_data) * 0.9
    max_y = max(phc_data) * 1.1
    range_y = max(1, max_y - min_y)
    
    svg.append(f'<text x="{x_offset}" y="{y_offset - 10}" font-size="14" font-weight="bold">{phc}</text>')
    svg.append(f'<rect x="{x_offset}" y="{y_offset}" width="{chart_w}" height="{chart_h}" fill="none" stroke="#ddd" stroke-width="1"/>')
    
    points = []
    for j, val in enumerate(phc_data):
        px = x_offset + j * (chart_w / max(1, len(phc_data) - 1))
        py = y_offset + chart_h - ((val - min_y) / range_y * chart_h)
        points.append(f"{px},{py}")
        svg.append(f'<circle cx="{px}" cy="{py}" r="2" fill="#007bff"/>')
    
    svg.append(f'<polyline points="{" ".join(points)}" fill="none" stroke="#007bff" stroke-width="1.5"/>')

svg.append('</svg>')

with open('seed/plot.svg', 'w') as f:
    f.write('\n'.join(svg))
print("Saved seed/plot.svg")
