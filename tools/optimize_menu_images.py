#!/usr/bin/env python3
"""Generate responsive WebP menu photos and optimized TCC logo assets."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "menu"
OUTPUT = SOURCE / "optimized"
LOGO_SOURCE = ROOT / "images" / "logo.png"
INTERIOR_SOURCE = ROOT / "images"
INTERIOR_OUTPUT = INTERIOR_SOURCE / "optimized"
SIZES = (400, 800)
SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}


def save_responsive_logo():
    if not LOGO_SOURCE.exists():
        raise FileNotFoundError(f"Required source logo not found: {LOGO_SOURCE}")

    with Image.open(LOGO_SOURCE) as original:
        image = ImageOps.exif_transpose(original)
        has_alpha = "A" in image.getbands() or "transparency" in image.info
        image = image.convert("RGBA" if has_alpha else "RGB")

        for width, filename in ((512, "logo.webp"), (1024, "logo-2x.webp")):
            resized = image.copy()
            resized.thumbnail((width, width), Image.Resampling.LANCZOS)
            target = ROOT / "images" / filename
            resized.save(
                target,
                "WEBP",
                quality=88,
                method=6,
                exact=True,
            )
            print(
                f"{target.relative_to(ROOT)}: "
                f"{target.stat().st_size:,} bytes "
                f"({resized.width}x{resized.height})"
            )



def save_interior_photos():
    INTERIOR_OUTPUT.mkdir(parents=True, exist_ok=True)
    count = 0
    for path in sorted(INTERIOR_SOURCE.glob("space-*.jpg")):
        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
            image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            target = INTERIOR_OUTPUT / f"{path.stem}.webp"
            image.save(target, "WEBP", quality=82, method=6)
            print(f"{target.relative_to(ROOT)}: {target.stat().st_size:,} bytes")
            count += 1
    print(f"Generated {count} optimized café interior photos.")

def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    count = 0

    for path in sorted(SOURCE.iterdir()):
        if not path.is_file() or path.suffix.lower() not in SUPPORTED:
            continue

        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
            safe_stem = path.stem.strip()
            for width in SIZES:
                scale = min(1, width / image.width)
                height = max(1, round(image.height * scale))
                resized = (
                    image.resize((width, height), Image.Resampling.LANCZOS)
                    if scale < 1
                    else image.copy()
                )
                target = OUTPUT / f"{safe_stem}-{width}.webp"
                resized.save(target, "WEBP", quality=78, method=6)
                print(f"{target.relative_to(ROOT)}: {target.stat().st_size:,} bytes")
                count += 1

    save_responsive_logo()
    save_interior_photos()
    print(f"Generated {count} responsive menu images, 2 logo variants, and optimized café photos.")


if __name__ == "__main__":
    main()
