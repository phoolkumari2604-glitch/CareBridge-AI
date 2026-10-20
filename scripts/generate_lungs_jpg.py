import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_FILE = os.path.join("frontend", "public", "assets", "organs", "lungs.jpg")
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

WIDTH, HEIGHT = 720, 540

# Create soft light-blue gradient background (#eaf2fa to #cfe0f1)
# #eaf2fa -> (234, 242, 250), #cfe0f1 -> (207, 224, 241)
bg_arr = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
for y in range(HEIGHT):
    t = y / (HEIGHT - 1)
    r = int(234 * (1 - t) + 207 * t)
    g = int(242 * (1 - t) + 224 * t)
    b = int(250 * (1 - t) + 241 * t)
    bg_arr[y, :, :] = [r, g, b]

img = Image.fromarray(bg_arr, mode="RGB").convert("RGBA")
draw = ImageDraw.Draw(img)

cx, cy = WIDTH / 2, HEIGHT / 2 + 10

# -------------------------------------------------------------
# 1. TRACHEA (Windpipe with Cartilage Rings)
# -------------------------------------------------------------
trachea_w = 34
trachea_top = cy - 200
trachea_bottom = cy - 65

# Trachea background tube
draw.rectangle(
    [cx - trachea_w // 2, trachea_top, cx + trachea_w // 2, trachea_bottom],
    fill=(210, 195, 205, 255),
)

# Cartilaginous horizontal C-rings
for y_ring in range(int(trachea_top), int(trachea_bottom), 12):
    draw.line(
        [(cx - trachea_w // 2 + 3, y_ring), (cx + trachea_w // 2 - 3, y_ring)],
        fill=(245, 238, 242, 255),
        width=5,
    )
    draw.line(
        [(cx - trachea_w // 2 + 3, y_ring + 4), (cx + trachea_w // 2 - 3, y_ring + 4)],
        fill=(175, 155, 170, 220),
        width=2,
    )

# -------------------------------------------------------------
# 2. MAIN BRONCHI (Carina bifurcation into left and right)
# -------------------------------------------------------------
# Right main bronchus (shorter, wider, more vertical)
draw.line([(cx, trachea_bottom), (cx - 45, cy - 20)], fill=(210, 185, 195), width=18)
# Left main bronchus (longer, more horizontal due to heart)
draw.line([(cx, trachea_bottom), (cx + 55, cy - 15)], fill=(210, 185, 195), width=16)

# -------------------------------------------------------------
# 3. LUNG LOBES SILHOUETTES
# Anatomical: Right lung has 3 lobes (Superior, Middle, Inferior)
# Left lung has 2 lobes (Superior, Inferior) + Cardiac Notch
# -------------------------------------------------------------
lung_base_color = (235, 130, 145, 255)      # Healthy organic pink-coral
lung_deep_color = (195, 80, 100, 255)       # Deeper shade for depth
lung_hilum_color = (160, 60, 85, 255)       # Hilum vascular junction

# RIGHT LUNG (Patient's right = viewer's left)
# Apex (cy - 170), Lateral border curving down, Base at diaphragm (cy + 145), Medial border
right_lung_poly = [
    (cx - 35, cy - 60),    # Hilum upper
    (cx - 30, cy - 130),   # Medial upper
    (cx - 50, cy - 175),   # Apex peak
    (cx - 95, cy - 170),   # Apex lateral
    (cx - 150, cy - 120),  # Upper lobe lateral curve
    (cx - 185, cy - 50),   # Middle lateral bulge
    (cx - 195, cy + 30),   # Lower lateral widest point
    (cx - 180, cy + 105),  # Lower lateral inferior
    (cx - 140, cy + 150),  # Costodiaphragmatic recess (sharp deep angle)
    (cx - 90, cy + 142),   # Diaphragmatic base (concave dome upward)
    (cx - 45, cy + 125),   # Cardiophrenic angle
    (cx - 40, cy + 50),    # Medial lower
    (cx - 35, cy - 10),    # Hilum lower
]

# LEFT LUNG (Patient's left = viewer's right)
# Apex (cy - 165), Lateral border, Cardiac Notch indentation (cx+35 to cx+90, cy+10 to cy+80), Base
left_lung_poly = [
    (cx + 35, cy - 55),    # Hilum upper
    (cx + 32, cy - 125),   # Medial upper
    (cx + 50, cy - 170),   # Apex peak
    (cx + 90, cy - 165),   # Apex lateral
    (cx + 145, cy - 115),  # Upper lobe lateral
    (cx + 175, cy - 45),   # Lateral curve
    (cx + 185, cy + 35),   # Lower lateral
    (cx + 170, cy + 110),  # Lower lateral inferior
    (cx + 130, cy + 152),  # Costodiaphragmatic recess
    (cx + 80, cy + 140),   # Base dome
    (cx + 42, cy + 120),   # Base medial
    (cx + 70, cy + 70),    # Lingula / Cardiac notch deep indent
    (cx + 65, cy + 15),    # Cardiac notch upper
    (cx + 38, cy - 10),    # Hilum lower
]

# Draw base lung bodies
draw.polygon(right_lung_poly, fill=lung_base_color)
draw.polygon(left_lung_poly, fill=lung_base_color)

# Smooth base for organic depth
img = img.filter(ImageFilter.GaussianBlur(radius=5))
draw = ImageDraw.Draw(img)

# Re-draw slightly sharper core
draw.polygon(right_lung_poly, fill=(240, 140, 155, 230))
draw.polygon(left_lung_poly, fill=(240, 140, 155, 230))

# -------------------------------------------------------------
# 4. ANATOMICAL FISSURES (Separating lobes)
# -------------------------------------------------------------
# Right Oblique Fissure (divides inferior from superior/middle)
draw.line([(cx - 175, cy + 50), (cx - 110, cy + 40), (cx - 45, cy + 90)], fill=lung_deep_color, width=4)
# Right Horizontal Fissure (divides superior from middle lobe)
draw.line([(cx - 180, cy - 40), (cx - 120, cy - 25), (cx - 45, cy - 20)], fill=lung_deep_color, width=3)
# Left Oblique Fissure (divides superior and inferior lobe)
draw.line([(cx + 175, cy + 40), (cx + 110, cy + 30), (cx + 45, cy + 85)], fill=lung_deep_color, width=4)

# -------------------------------------------------------------
# 5. BRONCHIAL TREE & PULMONARY VESSELS (Arborization)
# -------------------------------------------------------------
# Pulmonary arteries (Deep clinical cyan/blue)
artery_color = (60, 140, 210, 230)
# Pulmonary veins & arterioles (Luminous oxygenated red/crimson)
vein_color = (220, 50, 75, 220)
# Bronchial airways (Soft cartilage white/cream)
bronch_color = (255, 240, 245, 210)

def draw_vessel_tree(start_x, start_y, angle, length, depth, color, width):
    if depth <= 0 or length < 5:
        return
    end_x = start_x + math.cos(angle) * length
    end_y = start_y + math.sin(angle) * length
    draw.line([(start_x, start_y), (end_x, end_y)], fill=color, width=max(1, int(width)))
    
    # Sub-branches
    draw_vessel_tree(end_x, end_y, angle - 0.38, length * 0.72, depth - 1, color, width * 0.7)
    draw_vessel_tree(end_x, end_y, angle + 0.35, length * 0.68, depth - 1, color, width * 0.7)

# Right Lung Bronchial & Vascular Trees
# Superior lobe
draw_vessel_tree(cx - 35, cy - 50, math.radians(220), 45, 4, bronch_color, 4)
draw_vessel_tree(cx - 38, cy - 45, math.radians(210), 42, 3, artery_color, 3)
draw_vessel_tree(cx - 32, cy - 40, math.radians(230), 40, 3, vein_color, 3)

# Middle lobe
draw_vessel_tree(cx - 35, cy - 10, math.radians(185), 55, 4, bronch_color, 4)
draw_vessel_tree(cx - 40, cy - 5, math.radians(195), 50, 3, artery_color, 3)

# Inferior lobe (branching downward into base)
draw_vessel_tree(cx - 35, cy + 20, math.radians(145), 65, 4, bronch_color, 4)
draw_vessel_tree(cx - 38, cy + 15, math.radians(135), 60, 3, vein_color, 3)
draw_vessel_tree(cx - 42, cy + 25, math.radians(155), 58, 3, artery_color, 3)

# Left Lung Bronchial & Vascular Trees
# Superior lobe
draw_vessel_tree(cx + 35, cy - 45, math.radians(-40), 45, 4, bronch_color, 4)
draw_vessel_tree(cx + 38, cy - 40, math.radians(-30), 42, 3, artery_color, 3)
draw_vessel_tree(cx + 32, cy - 35, math.radians(-50), 40, 3, vein_color, 3)

# Inferior lobe (branching laterally & downward around cardiac notch)
draw_vessel_tree(cx + 35, cy + 15, math.radians(35), 62, 4, bronch_color, 4)
draw_vessel_tree(cx + 38, cy + 20, math.radians(45), 58, 3, vein_color, 3)
draw_vessel_tree(cx + 42, cy + 10, math.radians(25), 55, 3, artery_color, 3)

# -------------------------------------------------------------
# 6. ALVEOLAR MICRO-PARENCHYMA (Soft capillary glow clusters)
# -------------------------------------------------------------
np.random.seed(42)
for _ in range(140):
    # Cluster within right lung
    rx = cx - np.random.uniform(50, 160)
    ry = cy + np.random.uniform(-130, 120)
    rad = np.random.uniform(3, 8)
    alpha = int(np.random.uniform(40, 110))
    draw.ellipse([rx - rad, ry - rad, rx + rad, ry + rad], fill=(255, 190, 205, alpha))

for _ in range(120):
    # Cluster within left lung
    lx = cx + np.random.uniform(50, 150)
    ly = cy + np.random.uniform(-120, 120)
    rad = np.random.uniform(3, 8)
    alpha = int(np.random.uniform(40, 110))
    draw.ellipse([lx - rad, ly - rad, lx + rad, ly + rad], fill=(255, 190, 205, alpha))

# -------------------------------------------------------------
# 7. SURFACE SPECULAR HIGHLIGHTS & PLEURAL LUSTER
# -------------------------------------------------------------
# Smooth organic highlights on anterior convex curves
draw.arc([cx - 160, cy - 110, cx - 70, cy + 40], start=160, end=270, fill=(255, 230, 238, 160), width=8)
draw.arc([cx + 70, cy - 105, cx + 160, cy + 45], start=270, end=380, fill=(255, 230, 238, 160), width=8)

# Subtle bloom glow filter
bloom = img.filter(ImageFilter.GaussianBlur(radius=3))
final_img = Image.blend(img, bloom, alpha=0.3)

# Save as RGB JPEG
final_img.convert("RGB").save(OUTPUT_FILE, "JPEG", quality=95)
print(f"Generated lungs.jpg at {OUTPUT_FILE} ({os.path.getsize(OUTPUT_FILE)/1024:.1f} KB)")
