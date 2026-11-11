const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const publicPages = ["index.html", "menu.html", "about.html", "gallery.html", "visit.html", "contact.html"];

test("all public pages exist and the retired feedback page is gone", () => {
  for (const page of publicPages) assert.ok(fs.existsSync(path.join(root, page)), page);
  assert.equal(fs.existsSync(path.join(root, "feedback.html")), false);
  assert.match(read("_redirects"), /^\/feedback\.html\s+\/contact\.html\s+301$/m);
});

test("no feedback form, Supabase feedback endpoint or review-gating code remains", () => {
  const sources = [...publicPages, "menu.js", "script.js", "style.css", "menu.css"]
    .map(read).join("\n");
  for (const forbidden of ["tcc_feedback", "SUPABASE_URL", "REVIEW_URL", "feedbackForm"]) {
    assert.equal(sources.includes(forbidden), false, forbidden);
  }
  assert.equal(sources.includes("feedback.html"), false);
});

test("menu presentation and interaction code are external assets", () => {
  const html = read("menu.html");
  assert.match(html, /href="menu\.css"/);
  assert.match(html, /src="menu\.js"/);
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /<script>\s*[\s\S]*?<\/script>/i);
  assert.equal((html.match(/src="menu\.js"/g) || []).length, 1);
});

test("all seven pizza items reflect the latest in-stock menu state", () => {
  const html = read("menu.html");
  const names = ["Italian Margherita", "The Farmer", "Pizza Verde", "Pesto Pizza", "BBQ Chicken Pizza", "Pesto Chicken Pizza", "Chicken Pizzaiola"];
  const cards = [...html.matchAll(/<article class="m-item">[\\s\\S]*?<\\/article>/g)].map((match) => match[0]);
  for (const name of names) {
    const card = cards.find((item) => item.includes(name));
    assert.ok(card, name);
    assert.doesNotMatch(card, /availability-status|Temporarily Sold Out/i, name);
  }
});

test("menu category order preserves Pizza, Burgers, Sandwiches", () => {
  const js = read("menu.js");
  const pizza = js.indexOf('["Pizzas","Pizza"]');
  const burgers = js.indexOf('["Burgers","Burgers"]');
  const sandwiches = js.indexOf('["Sandwiches","Sandwiches"]');
  assert.ok(pizza >= 0 && burgers > pizza && sandwiches > burgers);
  assert.match(read("menu.html"), /id="food"/);
});

test("search and product photos have accessible names and keyboard support", () => {
  const html = read("menu.html");
  const js = read("menu.js");
  assert.match(html, /aria-label="Search menu"/);
  assert.match(html, /aria-controls="menuContent"/);
  assert.match(html, /id="menuContent"/);
  assert.match(js, /img\.tabIndex=0/);
  assert.match(js, /aria-haspopup","dialog"/);
  assert.match(js, /event\.key==="Enter"\|\|event\.key===" "/);
  assert.match(js, /event\.key==="Escape"/);
});

test("unused menu helpers and dead filter stubs are removed", () => {
  const js = read("menu.js");
  for (const name of ["tccPexelsUrl", "showTccPhotoPlaceholder", "applyFilters", "getOffset"]) {
    assert.equal(js.includes(name), false, name);
  }
});

test("global stylesheet has no late @import and includes visible focus states", () => {
  const css = read("style.css");
  assert.doesNotMatch(css, /@import\s/i);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("site navigation exposes state and drawer controls", () => {
  for (const page of publicPages) {
    const html = read(page);
    assert.match(html, /aria-expanded="false"/, page);
    assert.match(html, /id="site-navigation"/, page);
  }
  assert.match(read("script.js"), /focusableInDrawer/);
  assert.match(read("script.js"), /event\.key === "Escape"/);
});

test("all public page images have alt text", () => {
  for (const page of publicPages) {
    const html = read(page);
    const images = [...html.matchAll(/<img\\b([^>]*)>/gi)].map((match) => match[1]);
    for (const attributes of images) assert.match(attributes, /\\balt\\s*=/, page);
  }
});

test("lean build excludes retired and source-only assets", () => {
  const dist = path.join(root, "dist");
  assert.ok(fs.existsSync(dist), "run npm run build before static tests");
  assert.equal(fs.existsSync(path.join(dist, "feedback.html")), false);
  assert.equal(fs.existsSync(path.join(dist, "images", "menu", "maska-bun.png")), false);
  assert.ok(
    fs.existsSync(path.join(dist, "images", "logo.webp")) ||
    fs.existsSync(path.join(dist, "images", "logo.png"))
  );
  assert.ok(fs.existsSync(path.join(dist, "images", "menu", "optimized")));
});

test("menu HTML contains no duplicate IDs", () => {
  for (const page of publicPages) {
    const html = read(page);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(ids.length, new Set(ids).size, page);
  }
});

test("logo and menu image optimization pipeline is configured", () => {
  const optimizer = read("tools/optimize_menu_images.py");
  const workflow = read(".github/workflows/optimize-menu-images.yml");
  const builder = read("tools/build_site.py");
  assert.match(optimizer, /save_responsive_logo/);
  assert.match(optimizer, /save_interior_photos/);
  assert.match(optimizer, /logo-2x\.webp/);
  assert.match(workflow, /qa-fixes/);
  assert.match(builder, /images\/menu\/optimized/);
  assert.match(builder, /logo\.webp/);
  assert.match(builder, /Source-only originals/);
  assert.match(builder, /legacy_source/);
  assert.doesNotMatch(read("menu.js"), /optimized\/%20iced-mocha/);
});

test("Cloudflare Pages points to the lean build output", () => {
  assert.match(read("wrangler.toml"), /pages_build_output_dir\s*=\s*["']\.\/dist["']/);
  assert.match(read("package.json"), /"build": "python3 tools\/build_site\.py"/);
});
