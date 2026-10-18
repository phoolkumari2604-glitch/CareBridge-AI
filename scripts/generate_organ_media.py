import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import imageio.v3 as iio

OUTPUT_DIR = os.path.join("frontend", "public", "assets", "organs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIDTH, HEIGHT = 640, 480
FPS = 24
NUM_FRAMES = 36  # 1.5 second seamless loop

def create_dark_background(w, h):
    # Radial dark vignette matching #0b1120 -> #162032
    y, x = np.ogrid[:h, :w]
    cx, cy = w / 2, h / 2
    r = np.sqrt((x - cx)**2 + (y - cy)**2)
    max_r = np.sqrt(cx**2 + cy**2)
    norm_r = r / max_r

    # Background color gradient: center (22, 32, 50), edges (11, 17, 32)
    r_chan = (24 * (1 - norm_r*0.6)).astype(np.uint8)
    g_chan = (35 * (1 - norm_r*0.6)).astype(np.uint8)
    b_chan = (56 * (1 - norm_r*0.6)).astype(np.uint8)
    bg = np.stack([r_chan, g_chan, b_chan], axis=-1)
    return bg

# ==========================================
# 1. STOMACH GENERATOR
# ==========================================
def render_stomach_frame(t_phase, is_inner=False):
    # PIL image base
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = WIDTH / 2, HEIGHT / 2 + 10
    # Breathing/peristalsis cycle
    pulse = math.sin(t_phase * 2 * math.pi) * 0.04

    # Outer Stomach J-Shape points
    # Esophagus (top), Fundus (top-left bulge), Greater curve (left-bottom), Pylorus (right-bottom), Duodenum (right)
    scale_x = (1.0 + pulse)
    scale_y = (1.0 + pulse * 0.6)

    # Fundus & Body
    body_color = (195, 65, 82) if not is_inner else (180, 50, 65)
    highlight_color = (245, 130, 145) if not is_inner else (255, 170, 180)

    # Base Organ Silhouette
    coords = [
        (cx - 30, cy - 140), # Esophagus
        (cx - 50, cy - 110),
        (cx - 140 * scale_x, cy - 90 * scale_y), # Fundus peak
        (cx - 170 * scale_x, cy - 10 * scale_y), # Greater curve upper
        (cx - 150 * scale_x, cy + 80 * scale_y),  # Greater curve mid
        (cx - 90 * scale_x, cy + 130 * scale_y),  # Greater curve lower
        (cx + 20 * scale_x, cy + 135 * scale_y),  # Antrum
        (cx + 100 * scale_x, cy + 90 * scale_y),  # Pylorus
        (cx + 140 * scale_x, cy + 40 * scale_y),  # Duodenal bulb
        (cx + 115 * scale_x, cy + 25 * scale_y),  # Duodenum inner
        (cx + 70 * scale_x, cy + 60 * scale_y),   # Pylorus inner
        (cx - 10 * scale_x, cy + 70 * scale_y),   # Angular incisure (lesser curve)
        (cx - 35 * scale_x, cy - 20 * scale_y),   # Lesser curve upper
        (cx - 10, cy - 130), # Esophagus right
    ]

    draw.polygon(coords, fill=body_color)

    # Smooth blur for organic volume
    img = img.filter(ImageFilter.GaussianBlur(radius=3))
    draw = ImageDraw.Draw(img)

    # Specular mucosal reflection along greater curve
    spec_coords = [
        (cx - 130 * scale_x, cy - 60 * scale_y),
        (cx - 150 * scale_x, cy + 10 * scale_y),
        (cx - 130 * scale_x, cy + 70 * scale_y),
        (cx - 80 * scale_x, cy + 110 * scale_y),
    ]
    draw.line(spec_coords, fill=highlight_color, width=12)

    # Inner cutaway details: rugae mucosal folds
    if is_inner:
        rugae_color = (255, 140, 155, 200)
        for offset in range(-60, 60, 18):
            wave = math.sin(t_phase * 2 * math.pi + offset * 0.1) * 8
            pts = [
                (cx - 90 + offset, cy - 40 + wave),
                (cx - 70 + offset, cy + 10 - wave),
                (cx - 40 + offset, cy + 60 + wave),
                (cx + 10 + offset, cy + 90 - wave),
            ]
            draw.line(pts, fill=rugae_color, width=4)

    # Sphincters (Esophageal and Pyloric rings)
    draw.ellipse([cx - 45, cy - 148, cx + 5, cy - 132], fill=(220, 110, 125))
    draw.ellipse([cx + 90 * scale_x, cy + 75 * scale_y, cx + 120 * scale_x, cy + 105 * scale_y], fill=(220, 110, 125))

    # Blend with background
    bg = create_dark_background(WIDTH, HEIGHT)
    img_np = np.array(img)
    alpha = img_np[:, :, 3:] / 255.0
    composed = (img_np[:, :, :3] * alpha + bg * (1 - alpha)).astype(np.uint8)
    return composed

# ==========================================
# 2. PANCREAS GENERATOR
# ==========================================
def render_pancreas_frame(t_phase, is_inner=False):
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = WIDTH / 2, HEIGHT / 2
    pulse = math.sin(t_phase * 2 * math.pi)

    # Duodenum C-loop (wrapping right of head)
    duo_color = (210, 165, 120)
    draw.arc([cx + 20, cy - 90, cx + 170, cy + 100], start=-90, end=140, fill=duo_color, width=28)

    # Bile Duct (greenish entrance)
    draw.line([(cx + 80, cy - 110), (cx + 95, cy - 30)], fill=(120, 190, 50), width=8)

    # Pancreas Gland: bulbous head at right, tapered body & tail at left
    # Tail (-180, -20), Body (-80, 0), Head (+70, +10)
    pan_color = (225, 135, 95) if not is_inner else (210, 115, 80)
    head_r = 52 + pulse * 2
    body_w = 40 + pulse * 1.5
    tail_w = 20

    # Draw lobulated glandular clusters
    lobules = [
        (cx - 180, cy - 30, 22), # Tail tip
        (cx - 140, cy - 20, 28),
        (cx - 100, cy - 10, 34), # Distal body
        (cx - 60, cy, 38),       # Mid body
        (cx - 20, cy + 8, 42),   # Neck
        (cx + 25, cy + 12, 48),  # Head upper
        (cx + 65, cy + 18, head_r), # Head central
        (cx + 55, cy + 55, 36),  # Uncinate process
    ]

    for lx, ly, lr in lobules:
        draw.ellipse([lx - lr, ly - lr*0.8, lx + lr, ly + lr*0.8], fill=pan_color)

    # Smooth lobule transitions
    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    draw = ImageDraw.Draw(img)

    # Main Pancreatic Duct (Wirsung duct - glowing azure line)
    duct_pts = [
        (cx - 170, cy - 28),
        (cx - 120, cy - 16),
        (cx - 60, cy + 2),
        (cx + 20, cy + 10),
        (cx + 75, cy + 16),
    ]
    duct_glow = int(180 + 70 * math.sin(t_phase * 2 * math.pi * 1.5))
    draw.line(duct_pts, fill=(56, 189, 248, duct_glow), width=5)

    # Islets of Langerhans (Pulsing endocrine golden dots along body/tail)
    islet_pulse = 0.5 + 0.5 * math.sin(t_phase * 2 * math.pi * 2.0)
    islet_color = (245, 158, 11, int(200 * islet_pulse + 55))
    islet_coords = [
        (cx - 160, cy - 25),
        (cx - 130, cy - 14),
        (cx - 95, cy - 6),
        (cx - 65, cy + 2),
        (cx - 35, cy + 6),
    ]
    for ix, iy in islet_coords:
        r = 5 + 2 * islet_pulse
        draw.ellipse([ix - r, iy - r, ix + r, iy + r], fill=islet_color)

    # Cutaway mode: cross-section acinar cells
    if is_inner:
        for cx_dot in range(int(cx - 120), int(cx + 40), 16):
            draw.ellipse([cx_dot, cy - 5, cx_dot + 6, cy + 5], fill=(255, 200, 160))

    bg = create_dark_background(WIDTH, HEIGHT)
    img_np = np.array(img)
    alpha = img_np[:, :, 3:] / 255.0
    composed = (img_np[:, :, :3] * alpha + bg * (1 - alpha)).astype(np.uint8)
    return composed

# ==========================================
# 3. THYROID GENERATOR
# ==========================================
def render_thyroid_frame(t_phase, is_inner=False):
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = WIDTH / 2, HEIGHT / 2
    breath = math.sin(t_phase * 2 * math.pi) * 6

    # Trachea cartilage rings in background
    ring_color = (148, 163, 184)
    trachea_y_top = cy - 140 + breath
    trachea_y_bot = cy + 140 + breath
    draw.rectangle([cx - 45, trachea_y_top, cx + 45, trachea_y_bot], fill=(60, 75, 95))

    for y in range(int(trachea_y_top + 15), int(trachea_y_bot - 10), 22):
        draw.rounded_rectangle([cx - 48, y, cx + 48, y + 12], radius=6, fill=ring_color)

    # Thyroid Butterfly Lobes (Right & Left)
    thyroid_color = (165, 35, 45) if not is_inner else (145, 25, 35)

    # Right Lobe (Anatomical Right = Viewer's Left)
    r_lobe = [
        (cx - 20, cy + 25 + breath), # lower medial
        (cx - 65, cy + 75 + breath), # lower lateral pole
        (cx - 95, cy + 10 + breath), # lateral convexity
        (cx - 75, cy - 65 + breath), # superior pole peak
        (cx - 35, cy - 35 + breath), # upper medial
    ]
    draw.polygon(r_lobe, fill=thyroid_color)

    # Left Lobe (Anatomical Left = Viewer's Right)
    l_lobe = [
        (cx + 20, cy + 25 + breath), # lower medial
        (cx + 65, cy + 75 + breath), # lower lateral pole
        (cx + 95, cy + 10 + breath), # lateral convexity
        (cx + 75, cy - 65 + breath), # superior pole peak
        (cx + 35, cy - 35 + breath), # upper medial
    ]
    draw.polygon(l_lobe, fill=thyroid_color)

    # Central Isthmus
    draw.rectangle([cx - 28, cy + 8 + breath, cx + 28, cy + 34 + breath], fill=thyroid_color)

    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    draw = ImageDraw.Draw(img)

    # Glossy vascular highlight
    draw.line([(cx - 70, cy - 30 + breath), (cx - 85, cy + 15 + breath)], fill=(235, 95, 105), width=6)
    draw.line([(cx + 70, cy - 30 + breath), (cx + 85, cy + 15 + breath)], fill=(235, 95, 105), width=6)

    # Parathyroid glands (4 yellow nodules)
    para_color = (245, 175, 30)
    parathyroids = [
        (cx - 78, cy - 40 + breath),
        (cx - 70, cy + 55 + breath),
        (cx + 78, cy - 40 + breath),
        (cx + 70, cy + 55 + breath),
    ]
    for px, py in parathyroids:
        draw.ellipse([px - 5, py - 5, px + 5, py + 5], fill=para_color)

    bg = create_dark_background(WIDTH, HEIGHT)
    img_np = np.array(img)
    alpha = img_np[:, :, 3:] / 255.0
    composed = (img_np[:, :, :3] * alpha + bg * (1 - alpha)).astype(np.uint8)
    return composed

# ==========================================
# 4. INTESTINES GENERATOR
# ==========================================
def render_intestines_frame(t_phase, is_inner=False):
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = WIDTH / 2, HEIGHT / 2
    peristalsis = t_phase * 2 * math.pi

    # Large Intestine (Framing Colon in rose-taupe)
    colon_color = (190, 110, 100) if not is_inner else (170, 95, 85)
    colon_w = 34

    # Colon path: Cecum (bottom-right), Ascending (right), Transverse (top), Descending (left), Sigmoid (bottom-left)
    # Right side: x = cx + 130
    draw.line([(cx + 125, cy + 110), (cx + 125, cy - 70)], fill=colon_color, width=colon_w)
    # Transverse: top
    draw.line([(cx + 125, cy - 70), (cx - 125, cy - 65)], fill=colon_color, width=colon_w)
    # Left side: x = cx - 125
    draw.line([(cx - 125, cy - 65), (cx - 125, cy + 90)], fill=colon_color, width=colon_w)
    # Sigmoid & Rectum loop
    draw.line([(cx - 125, cy + 90), (cx - 40, cy + 130)], fill=colon_color, width=colon_w)
    draw.line([(cx - 40, cy + 130), (cx, cy + 155)], fill=colon_color, width=colon_w)

    # Appendix stub (lower right cecum)
    draw.line([(cx + 125, cy + 120), (cx + 145, cy + 145)], fill=(170, 90, 80), width=10)

    # Haustra pouches rings on colon
    for y in range(int(cy - 60), int(cy + 100), 22):
        draw.line([(cx + 108, y), (cx + 142, y)], fill=(220, 135, 125), width=3)
        draw.line([(cx - 142, y), (cx - 108, y)], fill=(220, 135, 125), width=3)

    # Small Intestine (Central Coils in lighter pink-tan)
    small_color = (225, 155, 145) if not is_inner else (210, 135, 125)
    loops = [
        (cx - 60, cy - 25, cx + 55, cy - 25),
        (cx + 55, cy - 5, cx - 55, cy - 5),
        (cx - 50, cy + 15, cx + 60, cy + 15),
        (cx + 50, cy + 35, cx - 45, cy + 35),
        (cx - 40, cy + 55, cx + 45, cy + 55),
        (cx + 40, cy + 75, cx - 35, cy + 75),
    ]

    for idx, (x1, y1, x2, y2) in enumerate(loops):
        wave = math.sin(peristalsis + idx * 0.9) * 4
        draw.line([(x1, y1 + wave), (x2, y2 + wave)], fill=small_color, width=18)

    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    draw = ImageDraw.Draw(img)

    # Mucosal gleam
    for idx, (x1, y1, x2, y2) in enumerate(loops[::2]):
        wave = math.sin(peristalsis + idx * 0.9) * 4
        draw.line([(x1 + 10, y1 + wave - 3), (x2 - 10, y2 + wave - 3)], fill=(255, 200, 195), width=3)

    bg = create_dark_background(WIDTH, HEIGHT)
    img_np = np.array(img)
    alpha = img_np[:, :, 3:] / 255.0
    composed = (img_np[:, :, :3] * alpha + bg * (1 - alpha)).astype(np.uint8)
    return composed

# ==========================================
# MASTER BATCH RENDERER
# ==========================================
def generate_organ_media(name, render_fn):
    print(f"Generating media for {name}...")
    # Normal video & poster
    frames = []
    for f in range(NUM_FRAMES):
        t = f / NUM_FRAMES
        frames.append(render_fn(t, is_inner=False))

    mp4_path = os.path.join(OUTPUT_DIR, f"{name}.mp4")
    jpg_path = os.path.join(OUTPUT_DIR, f"{name}.jpg")

    # Write MP4
    iio.imwrite(mp4_path, np.array(frames), fps=FPS)
    # Save first frame as poster JPEG
    Image.fromarray(frames[0]).save(jpg_path, quality=92)
    print(f"  Saved {mp4_path} ({os.path.getsize(mp4_path)/1024:.1f} KB) & {jpg_path}")

    # Inner cutaway video & poster
    inner_frames = []
    for f in range(NUM_FRAMES):
        t = f / NUM_FRAMES
        inner_frames.append(render_fn(t, is_inner=True))

    inner_mp4_path = os.path.join(OUTPUT_DIR, f"{name}-inner.mp4")
    inner_jpg_path = os.path.join(OUTPUT_DIR, f"{name}-inner.jpg")

    iio.imwrite(inner_mp4_path, np.array(inner_frames), fps=FPS)
    Image.fromarray(inner_frames[0]).save(inner_jpg_path, quality=92)
    print(f"  Saved {inner_mp4_path} ({os.path.getsize(inner_mp4_path)/1024:.1f} KB) & {inner_jpg_path}")

if __name__ == "__main__":
    generate_organ_media("stomach", render_stomach_frame)
    generate_organ_media("pancreas", render_pancreas_frame)
    generate_organ_media("thyroid", render_thyroid_frame)
    generate_organ_media("intestines", render_intestines_frame)
    print("ALL ORGAN MEDIA GENERATION COMPLETE!")
