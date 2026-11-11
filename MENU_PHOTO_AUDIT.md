# TCC Menu Photo Audit

Audit date: 11 November 2026  
Audited branch: `main`  
Menu source: `menu.html`  
Asset directory: `images/menu/`

## Executive summary

| Measure | Current result |
|---|---:|
| Menu items in the current menu markup | 107 |
| Current menu items with a photo mapping | 79 |
| Items without a photo mapping | 28 |
| Photo mapping entries in `TCC_VERIFIED_PHOTOS` | 80 |
| Unused mapping entries | 1 |
| Original menu image files | 80 |
| Optimized WebP files | 160 (80 small + 80 large) |
| Total image files in repository | 246 |
| Original menu image footprint | 160.93 MB |
| Optimized WebP footprint | 7.55 MB |

**Coverage:** 79 of 107 menu items have a mapping (73.8%). The remaining 28 items do not have a mapping and should continue to use the menu's “Photo Coming Soon” placeholder rather than a generic substitute.

The 80-entry mapping includes one entry not present in the current menu (`Bun Maska with TCC Chai`). Therefore, it is not counted as current menu coverage.

## Items without photo mappings

The following current menu items do not have a matching key in `TCC_VERIFIED_PHOTOS`:

- Cortado
- Classic Cold Coffee
- Spanish Iced Latte
- Classic Cold Brew
- Coco Brew
- Bird's Eye Pineapple
- Elderflower Fizz / Peach Fizz
- Dry Mango Picante
- Coco Rose Cooler
- Mango Fizzy
- Coconut Matcha Cloud
- Mango Passion Matcha
- French Press
- Honey Rose Merry Latte
- Coconut Cold
- Orange Espresso
- Pineapple Float
- Hearty Minestrone Soup
- Fettuccine Aglio Olio
- Fettuccine Al Pesto
- Pesto Pizza
- BBQ Chicken Pizza
- Pesto Chicken Pizza
- Chicken Pizzaiola
- Mushroom Burger
- Crispy Chicken Burger
- Choco Brownie
- Dry Fruit Dream

## Mapping and asset checks

- All external small and large image paths referenced by the 80 mapping entries resolve to files in the `main` branch when URL-encoded paths are decoded.
- One mapping uses an embedded `data:image/webp` image rather than a repository file.
- The Iced Mocha optimized filenames contain a leading space. The URL-encoded mapping resolves to those existing files. Do not rename these assets without updating the mapping.
- The optimized `blueberry-iced-tea-400.webp` and `blueberry-iced-tea-800.webp` files are not referenced by the current mapping. They are an unused optimized pair.
- The mapping entry `Bun Maska with TCC Chai` is not used by a current menu item.
- The audit is based on menu markup, mapping keys and repository file existence. It does not certify that every photograph depicts TCC's exact recipe, portion, garnish or plating.

## Asset footprint

The 80 original menu images total approximately 160.93 MB. The 160 optimized WebP variants total approximately 7.55 MB. The optimized set is approximately 95.3% smaller than the original set by aggregate file size.

The optimized files are arranged as 400px and 800px variants for each of the 80 source-image stems. Keep the responsive small/large pairing when changing mappings.

## Recommended next actions

1. Add or deliberately leave placeholders for the 28 unmapped items. Prioritize signature drinks and popular food items; use TCC's own product photos where visual accuracy matters.
2. Review the two unused Blueberry Iced Tea WebP files and either map them to the correct item (if the photo is an approved match) or remove them in a separate cleanup.
3. Remove or restore the unused `Bun Maska with TCC Chai` mapping only after confirming whether the item is intended to return to the menu.
4. Keep the Iced Mocha leading-space filename stable until a coordinated asset-and-code rename is made.
5. Re-run the audit after any menu or photo-mapping change.

## Audit limitations

This is a repository-level mapping and file-integrity audit. It does not include a full visual review of all 79 mapped photos, a live browser image-load test, or a mobile layout QA pass. The presence of a mapping confirms that code points to an asset; it is not a guarantee of visual suitability or product authenticity.
