import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_FILE = os.path.join("frontend", "public", "assets", "organs", "brain.jpg")
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

WIDTH, HEIGHT = 720, 540

# Create transparent image
img = Image.new("RGBA", (WIDTH, HEIGHT), (6, 16, 31, 255))
draw = ImageDraw.Draw(img)

cx, cy = WIDTH / 2, HEIGHT / 2 - 15

# Color Palette: Deep clinical midnight blue, luminous electric cyan & azure highlights
cortex_base = (24, 75, 135)
cortex_mid = (45, 120, 200)
cortex_light = (56, 168, 255)
highlight_glow = (140, 215, 255)
cerebellum_color = (30, 85, 150)
stem_color = (25, 70, 120)

# 1. BRAIN STEM & MEDULLA
stem_pts = [
    (cx - 25, cy + 90),
    (cx - 30, cy + 180),
    (cx + 20, cy + 180),
    (cx + 15, cy + 90),
]
draw.polygon(stem_pts, fill=stem_color)

# 2. CEREBELLUM (Lower posterior lobe with horizontal laminae)
cereb_x, cereb_y = cx - 95, cy + 95
draw.ellipse([cereb_x - 65, cereb_y - 45, cereb_x + 65, cereb_y + 45], fill=cerebellum_color)
for i in range(-30, 35, 10):
    draw.arc([cereb_x - 60, cereb_y + i - 15, cereb_x + 60, cereb_y + i + 15], start=10, end=170, fill=cortex_light, width=2)

# 3. CEREBRAL CORTEX (Lateral profile hemisphere: Frontal, Parietal, Occipital, Temporal lobes)
cortex_silhouette = [
    (cx + 120, cy + 60),  # Temporal lobe pole
    (cx + 160, cy + 20),
    (cx + 190, cy - 40),  # Prefrontal curve
    (cx + 175, cy - 110), # Frontal superior pole
    (cx + 120, cy - 165), # Superior sagittal crest
    (cx + 40, cy - 185),  # Vertex / Parietal peak
    (cx - 50, cy - 180),
    (cx - 130, cy - 150), # Parieto-occipital boundary
    (cx - 185, cy - 90),  # Occipital superior
    (cx - 200, cy - 30),  # Occipital pole
    (cx - 170, cy + 40),  # Occipital inferior
    (cx - 120, cy + 70),  # Above cerebellum
    (cx - 40, cy + 55),   # Sylvian fissure notch
    (cx + 30, cy + 75),   # Inferior temporal
]

draw.polygon(cortex_silhouette, fill=cortex_base)
img = img.filter(ImageFilter.GaussianBlur(radius=4))
draw = ImageDraw.Draw(img)

# 4. GYRI & SULCI (Anatomical convoluted convolutions with electric cyan lighting)
gyri_curves = [
    # Lateral Sulcus (Sylvian fissure)
    [(cx - 110, cy + 30), (cx - 40, cy + 20), (cx + 30, cy + 35), (cx + 110, cy + 25)],
    # Central Sulcus of Rolando
    [(cx + 35, cy - 180), (cx + 10, cy - 110), (cx - 15, cy - 50), (cx - 30, cy + 15)],
    # Precentral Sulcus
    [(cx + 90, cy - 165), (cx + 65, cy - 100), (cx + 45, cy - 40), (cx + 35, cy + 20)],
    # Postcentral Sulcus
    [(cx - 20, cy - 175), (cx - 45, cy - 110), (cx - 70, cy - 45)],
    # Superior Frontal Gyrus loops
    [(cx + 150, cy - 130), (cx + 120, cy - 90), (cx + 145, cy - 50)],
    [(cx + 170, cy - 70), (cx + 130, cy - 30), (cx + 160, cy + 10)],
    # Superior & Middle Temporal Gyri
    [(cx - 30, cy + 40), (cx + 20, cy + 48), (cx + 80, cy + 45)],
    [(cx - 40, cy + 60), (cx + 10, cy + 68), (cx + 70, cy + 65)],
    # Parietal & Occipital convolutions
    [(cx - 90, cy - 140), (cx - 115, cy - 95), (cx - 145, cy - 60)],
    [(cx - 140, cy - 125), (cx - 165, cy - 80), (cx - 175, cy - 30)],
    [(cx - 110, cy - 60), (cx - 140, cy - 25), (cx - 160, cy + 15)],
    [(cx - 70, cy - 20), (cx - 95, cy + 10), (cx - 120, cy + 35)],
]

for pts in gyri_curves:
    # Outer dark shadow fold
    draw.line(pts, fill=(10, 35, 70), width=9)
    # Luminous cyan neural core
    draw.line(pts, fill=cortex_light, width=4)

# 5. NEURAL SYNAPSE NODES (Small glowing electric nodes at gyri intersections)
nodes = [
    (cx + 85, cy - 135), (cx + 35, cy - 145), (cx - 30, cy - 140),
    (cx + 135, cy - 80), (cx + 70, cy - 75), (cx + 10, cy - 70), (cx - 55, cy - 75),
    (cx + 145, cy - 20), (cx + 85, cy - 15), (cx + 20, cy - 10), (cx - 40, cy - 15), (cx - 110, cy - 20),
    (cx + 75, cy + 35), (cx + 15, cy + 40), (cx - 50, cy + 35), (cx - 110, cy + 30),
    (cx - 150, cy - 65), (cx - 165, cy - 25), (cx - 95, cy + 90),
]

for nx, ny in nodes:
    # Glowing node halos
    draw.ellipse([nx - 6, ny - 6, nx + 6, ny + 6], fill=(56, 168, 255, 180))
    draw.ellipse([nx - 3, ny - 3, nx + 3, ny + 3], fill=(230, 245, 255, 255))

# Subtle overall bloom filter
bloom = img.filter(ImageFilter.GaussianBlur(radius=3))
final_img = Image.blend(img, bloom, alpha=0.35)

# Save as RGB JPEG
final_img.convert("RGB").save(OUTPUT_FILE, "JPEG", quality=95)
print(f"Generated brain.jpg at {OUTPUT_FILE} ({os.path.getsize(OUTPUT_FILE)/1024:.1f} KB)")
