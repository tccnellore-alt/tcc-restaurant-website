# TCC – The Coffee Club website

Static, mobile-first website for TCC – The Coffee Club, Nellore.

## Build

The Cloudflare Pages build creates a lean `dist/` directory containing only public pages, styles, scripts, the optimized logo, optimized café interior photos, and menu WebP images referenced by the menu.

```bash
python3 -m pip install Pillow
python3 tools/optimize_menu_images.py
npm run build
```

Cloudflare Pages settings:
- Build command: `npm run build`
- Build output directory: `dist`

The original menu photographs and source logo remain in the repository for future edits; they are not copied into the public build output.

## Tests

```bash
npm install
npx playwright install chromium
npm test
npm run test:e2e
```

The static suite checks repository structure, retired feedback removal, menu order, accessibility hooks, and asset-build configuration. The Playwright suite checks navigation, search, food subcategories, Drink Finder, photo lightbox, and mobile horizontal overflow at 360px, 390px, and 430px.

## Image workflow

The GitHub Actions image workflow generates responsive WebP menu photos, optimized café-interior photos, and 512px and 1024px TCC logo variants. Source images remain unchanged.
