#!/usr/bin/env python3
"""Build a lean Cloudflare Pages directory from the static TCC website."""
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
IMAGES = ROOT / "images"
OPTIMIZED = IMAGES / "menu" / "optimized"

PAGES = (
    "index.html",
    "menu.html",
    "about.html",
    "gallery.html",
    "visit.html",
    "contact.html",
)
ASSETS = ("style.css", "menu.css", "script.js", "menu.js")


def copy_file(source: Path, destination: Path) -> None:
    if not source.is_file():
        raise FileNotFoundError(f"Required website asset is missing: {source.relative_to(ROOT)}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    logo_webp = IMAGES / "logo.webp"
    logo_png = IMAGES / "logo.png"
    use_webp_logo = logo_webp.exists()

    source_text = {}
    for name in PAGES + ASSETS:
        path = ROOT / name
        if not path.is_file():
            raise FileNotFoundError(f"Required site file is missing: {name}")
        source_text[name] = path.read_text(encoding="utf-8")

    # Use optimized logo assets when the image workflow has generated them.
    if use_webp_logo:
        source_text = {
            name: text.replace(
                'src="images/logo.png"',
                'src="images/logo.webp" srcset="images/logo.webp 1x, images/logo-2x.webp 2x"',
            )
            for name, text in source_text.items()
        }

    for name, content in source_text.items():
        target = DIST / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    if use_webp_logo:
        copy_file(logo_webp, DIST / "images" / "logo.webp")
        logo_2x = IMAGES / "logo-2x.webp"
        if logo_2x.exists():
            copy_file(logo_2x, DIST / "images" / "logo-2x.webp")
    else:
        copy_file(logo_png, DIST / "images" / "logo.png")

    # Copy only the café-interior photos referenced by the public pages.
    page_bundle = "\n".join(source_text[name] for name in PAGES)
    for relative in sorted(set(re.findall(r'images/(space-[^"\'\s)]+\.(?:jpg|jpeg|webp))', page_bundle))):
        copy_file(IMAGES / Path(relative).name, DIST / relative)

    # Product originals stay in the repository for future edits. Only the
    # optimized WebP variants referenced by the menu are shipped to customers.
    menu_bundle = source_text["menu.html"] + "\n" + source_text["menu.js"] + "\n" + source_text["menu.css"]
    menu_images = sorted(set(re.findall(r'images/menu/optimized/([^"\'\s)]+)', menu_bundle)))
    for filename in menu_images:
        copy_file(OPTIMIZED / filename, DIST / "images" / "menu" / "optimized" / filename)

    for name in ("_headers", "_redirects", "robots.txt", "sitemap.xml"):
        source = ROOT / name
        if source.is_file():
            copy_file(source, DIST / name)

    files = [path for path in DIST.rglob("*") if path.is_file()]
    total_bytes = sum(path.stat().st_size for path in files)
    print(f"Built {len(files)} deployable files ({total_bytes:,} bytes) in {DIST.name}/")
    print(f"Logo format: {'WebP' if use_webp_logo else 'PNG fallback'}")
    print(f"Optimized menu images copied: {len(menu_images)}")
    print("Source-only originals, feedback code, tests and tooling are excluded.")


if __name__ == "__main__":
    main()
