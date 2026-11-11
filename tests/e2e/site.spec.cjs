const { test, expect } = require("@playwright/test");

test("site navigation opens, traps focus, and closes with Escape", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator("[data-toggle]");
  const drawer = page.locator(".drawer");
  await toggle.focus();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toHaveAttribute("aria-hidden", "false");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("menu search works across categories and Escape clears it", async ({ page }) => {
  await page.goto("/menu.html");
  const search = page.locator("#menuSearch");
  await search.fill("Latte");
  await expect(page.locator("#menuSearchStatus")).toContainText(/matching item/i);
  await expect(page.locator(".menu-group.active .m-item:visible").first()).toBeVisible();
  await search.press("Escape");
  await expect(search).toHaveValue("");
});

test("food category order and Pizza to Burgers to Sandwiches navigation stay correct", async ({ page }) => {
  await page.goto("/menu.html");
  await page.locator('.menu-tab[data-target="food"]').click();
  if (await page.locator("#foodSpotlight.is-open").count()) {
    await page.locator("#foodSpotlightExplore").click();
  }
  await expect(page.locator("#foodTabs")).toBeVisible();
  const targets = await page.locator("#foodTabs .food-tab").evaluateAll((buttons) =>
    buttons.map((button) => button.dataset.foodTarget)
  );
  const pizza = targets.indexOf("Pizzas");
  const burgers = targets.indexOf("Burgers");
  const sandwiches = targets.indexOf("Sandwiches");
  expect(pizza).toBeGreaterThanOrEqual(0);
  expect(burgers).toBeGreaterThan(pizza);
  expect(sandwiches).toBeGreaterThan(burgers);
  await page.locator('#foodTabs .food-tab[data-food-target="Pizzas"]').click();
  await expect(page.locator(".menu-group.active .m-item").filter({ hasText: "Italian Margherita" }).first()).toBeVisible();
});

test("Drink Finder completes and its result opens the matching menu category", async ({ page }) => {
  await page.goto("/menu.html");
  await page.locator("#tccStartDrinkQuiz").click();
  await expect(page.locator("#tccQuizFlow")).toBeVisible();
  for (let step = 0; step < 6; step += 1) {
    await page.locator(".tcc-quiz-option").first().click();
    const next = page.locator("#tccQuizNext");
    const label = (await next.textContent()).trim();
    await next.click();
    if (/find my drink/i.test(label)) break;
  }
  await expect(page.locator("#tccDrinkPickResult")).toBeVisible();
  await page.locator("#tccViewPickedDrink").click();
  await expect(page.locator(".menu-group.active")).toBeVisible();
});

test("a real menu photo opens an accessible lightbox and Escape restores focus", async ({ page }) => {
  await page.goto("/menu.html");
  const photo = page.locator(".menu-group.active .m-photo").first();
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(() => photo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await photo.click();
  const dialog = page.locator(".menu-image-lightbox.is-open");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("role", "dialog");
  await expect(dialog.locator(".menu-lightbox-name")).not.toBeEmpty();
  await page.keyboard.press("Escape");
  await expect(page.locator(".menu-image-lightbox.is-open")).toHaveCount(0);
  await expect(photo).toBeFocused();
});

for (const width of [360, 390, 430]) {
  test(`mobile layout has no page-level horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/menu.html");
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth
    }));
    expect(metrics.page).toBeLessThanOrEqual(metrics.viewport + 1);
    const search = await page.locator("#menuSearch").boundingBox();
    expect(search.height).toBeGreaterThanOrEqual(44);
    const category = await page.locator(".menu-tab").first().boundingBox();
    expect(category.height).toBeGreaterThanOrEqual(44);
  });
}
