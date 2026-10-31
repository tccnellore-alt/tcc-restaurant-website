#!/usr/bin/env python3
"""Generate responsive compressed WebP menu images; originals are preserved."""
from pathlib import Path
from PIL import Image, ImageOps
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "menu"
OUTPUT = SOURCE / "optimized"
SIZES = (400, 800)
SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}

def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    count = 0
    for path in sorted(SOURCE.iterdir()):
        if not path.is_file() or path.suffix.lower() not in SUPPORTED:
            continue
        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
            for width in SIZES:
                scale = min(1, width / image.width)
                height = max(1, round(image.height * scale))
                resized = image.resize((width, height), Image.Resampling.LANCZOS) if scale < 1 else image.copy()
                target = OUTPUT / f"{path.stem}-{width}.webp"
                resized.save(target, "WEBP", quality=78, method=6)
                print(f"{target.relative_to(ROOT)}: {target.stat().st_size:,} bytes")
                count += 1
    print(f"Generated {count} responsive WebP images.")

if __name__ == "__main__":
    main()
