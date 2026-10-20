"""Makes the Android app's home screen icons and start-up picture from the web app's icons (python3 + Pillow).
Writes android/res/mipmap-*/ (launcher icons) and android/res/drawable*/splash.png; android.yml copies android/res/
over the generated project. Run again after changing icon-512.png or icon-maskable-512.png:  python3 tools/android-icons.py
"""
import os
from PIL import Image, ImageDraw

root = os.path.join(os.path.dirname(__file__), '..')
res = os.path.join(root, 'android', 'res')
full = Image.open(os.path.join(root, 'icon-maskable-512.png')).convert('RGBA')   # fills its square: the adaptive icon's picture
rounded = Image.open(os.path.join(root, 'icon-512.png')).convert('RGBA')        # already a rounded square: the older square icon
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
BG = (253, 241, 243)   # the manifest's background_color


def save(img, *parts):
    path = os.path.join(res, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)


def adaptive(px):
    """108 dp layer: the picture covers the middle 78 dp, so the 72 dp a launcher shows keeps all of Fumu;
    the edge past it repeats the picture's border (only seen while the launcher wobbles the icon)."""
    inner = round(px * 78 / 108)
    pic = full.resize((inner, inner), Image.LANCZOS)
    pad = (px - inner) // 2
    out = Image.new('RGBA', (px, px))
    out.paste(pic.resize((px, px), Image.LANCZOS), (0, 0))   # (the border area: the same picture, larger)
    out.paste(pic, (pad, pad))
    return out


def circle(img):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, img.size[0] - 1, img.size[1] - 1), fill=255)
    out = Image.new('RGBA', img.size)
    out.paste(img, (0, 0), mask)
    return out


for name, k in DENSITIES.items():
    save(adaptive(round(108 * k)), 'mipmap-' + name, 'ic_launcher_foreground.png')
    legacy = round(48 * k)
    save(rounded.resize((legacy, legacy), Image.LANCZOS), 'mipmap-' + name, 'ic_launcher.png')
    crop = full.crop((12, 12, 500, 500)).resize((legacy, legacy), Image.LANCZOS)   # a little zoomed in, so Fumu fills the circle
    save(circle(crop), 'mipmap-' + name, 'ic_launcher_round.png')

# the start-up picture (shown until the page loads): Fumu's icon on the app's pink, the sizes Capacitor's template uses
SPLASH = {'drawable': (480, 320), 'drawable-land-mdpi': (480, 320), 'drawable-land-hdpi': (800, 480), 'drawable-land-xhdpi': (1280, 720),
          'drawable-land-xxhdpi': (1600, 960), 'drawable-land-xxxhdpi': (1920, 1280), 'drawable-port-mdpi': (320, 480),
          'drawable-port-hdpi': (480, 800), 'drawable-port-xhdpi': (720, 1280), 'drawable-port-xxhdpi': (960, 1600), 'drawable-port-xxxhdpi': (1280, 1920)}
for folder, (w, h) in SPLASH.items():
    out = Image.new('RGB', (w, h), BG)
    side = round(min(w, h) * 0.32)
    icon = rounded.resize((side, side), Image.LANCZOS)
    out.paste(icon, ((w - side) // 2, (h - side) // 2), icon)
    save(out, folder, 'splash.png')
print('android/res written')
