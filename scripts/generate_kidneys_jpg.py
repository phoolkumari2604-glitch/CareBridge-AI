import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_FILE = os.path.join("frontend", "public", "assets", "organs", "kidneys.jpg")
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

WIDTH, HEIGHT = 720, 540
img = Image.new("RGBA", (WIDTH, HEIGHT), (6, 16, 31, 255))
draw = ImageDraw.Draw(img)

cx, cy = WIDTH / 2, HEIGHT / 2

# Colors: rich anatomical kidney bean hues (crimson/red-brown, vascular blue/red, renal cortex)
renal_cortex = (165, 42, 42)      # Deep reddish brown
renal_cortex_light = (195, 65, 65) # Highlight
renal_pyramid = (130, 30, 35)      # Medullary pyramids
artery_red = (225, 45, 55)        # Renal artery
vein_blue = (45, 120, 220)        # Renal vein
ureter_yellow = (210, 180, 80)    # Ureter
calyx_pink = (230, 140, 150)

# 1. AORTA & INFERIOR VENA CAVA (Center trunks)
# Vena Cava (Blue - Right/anatomical left side)
draw.polygon([(cx - 35, cy - 200), (cx - 10, cy - 200), (cx - 10, cy + 200), (cx - 35, cy + 200)], fill=(35, 95, 180))
# Abdominal Aorta (Red - Left/anatomical right side)
draw.polygon([(cx - 5, cy - 200), (cx + 20, cy - 200), (cx + 20, cy + 200), (cx - 5, cy + 200)], fill=(200, 35, 45))

# 2. RENAL ARTERIES & VEINS to Left & Right Kidneys
# Left kidney vessels (Viewer's left: cx - 180)
draw.line([(cx - 20, cy - 10), (cx - 140, cy - 10)], fill=(35, 105, 205), width=14)
draw.line([(cx + 5, cy - 25), (cx - 130, cy - 25)], fill=(225, 45, 55), width=12)

# Right kidney vessels (Viewer's right: cx + 180)
draw.line([(cx - 15, cy - 20), (cx + 140, cy - 20)], fill=(35, 105, 205), width=14)
draw.line([(cx + 10, cy - 35), (cx + 130, cy - 35)], fill=(225, 45, 55), width=12)

# Ureters (Yellow descending ducts)
draw.line([(cx - 130, cy + 30), (cx - 100, cy + 120), (cx - 40, cy + 220)], fill=ureter_yellow, width=8)
draw.line([(cx + 130, cy + 20), (cx + 100, cy + 110), (cx + 40, cy + 220)], fill=ureter_yellow, width=8)

# 3. DRAW KIDNEY BEAN SHAPES
def draw_kidney_bean(center_x, center_y, is_left=True):
    pts = []
    num_pts = 64
    for i in range(num_pts):
        angle = 2 * math.pi * i / num_pts
        # Parametric kidney bean radius
        r_x = 75 * (1.0 + 0.25 * math.cos(angle))
        r_y = 110 * (1.0 + 0.15 * math.sin(angle))
        
        # Indent hilum on inner side
        inner_angle = math.pi if is_left else 0.0
        diff = angle - inner_angle
        # wrap diff
        diff = (diff + math.pi) % (2 * math.pi) - math.pi
        hilum_indent = math.exp(-(diff**2) / 0.5) * 35
        
        if is_left:
            px = center_x + (r_x - hilum_indent) * math.cos(angle)
        else:
            px = center_x + (r_x - hilum_indent) * math.cos(angle)
        py = center_y + r_y * math.sin(angle)
        pts.append((px, py))
    
    draw.polygon(pts, fill=renal_cortex)
    
    # Internal hilum shadow
    inner_sign = 1 if is_left else -1
    draw.ellipse([center_x + (15 * inner_sign) - 25, center_y - 20, center_x + (15 * inner_sign) + 25, center_y + 20], fill=renal_pyramid)
    # Renal capsule highlight arc
    outer_start = 120 if is_left else 300
    outer_end = 240 if is_left else 60
    draw.arc([center_x - 70, center_y - 105, center_x + 70, center_y + 105], start=0, end=360, fill=renal_cortex_light, width=4)

# Draw left and right kidneys (Left kidney is anatomically higher than right kidney by 15px)
draw_kidney_bean(cx - 170, cy - 20, is_left=True)
draw_kidney_bean(cx + 170, cy - 5, is_left=False)

# Adrenal glands on superior poles
draw.polygon([(cx - 195, cy - 130), (cx - 170, cy - 165), (cx - 145, cy - 130)], fill=(220, 175, 75))
draw.polygon([(cx + 145, cy - 115), (cx + 170, cy - 150), (cx + 195, cy - 115)], fill=(220, 175, 75))

# Soft bloom blur filter for clinical realistic rendering
bloom = img.filter(ImageFilter.GaussianBlur(radius=3))
final_img = Image.blend(img, bloom, alpha=0.3)

final_img.convert("RGB").save(OUTPUT_FILE, "JPEG", quality=95)
print(f"Generated kidneys.jpg successfully at {OUTPUT_FILE}")
