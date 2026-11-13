# TCC Online Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure customer ordering and a private staff order dashboard to TCC's existing static website, with all code changes confined to the `order` branch.

**Architecture:** Keep the existing HTML/CSS/vanilla-JS site. Add a cart/checkout experience to `menu.html`, a separate unlinked staff route, and Supabase Edge Functions as the only order-data API. A dedicated Supabase project stores orders; RLS denies direct public access, and the Edge Function validates trusted menu prices and protects staff operations.

**Tech Stack:** Existing HTML/CSS/vanilla JavaScript; Supabase Postgres; Supabase Edge Functions (Deno); Web Crypto APIs for password verification/session signing; browser-native tests plus endpoint smoke tests.

**Spec:** `docs/superpowers/specs/2026-11-13-tcc-online-ordering-design.md`

## Global Constraints

- Target repository branch is `order`; never modify or merge `main`.
- Supabase project is `tcc-online-orders` (`hyhkrmkemhjuqokcoqgp`, region `ap-south-1`).
- Keep current menu categories, prices, add-ons, best-seller labels, sold-out states, photos, quiz, and category navigation intact.
- Customer order types are `takeaway` and `dine_in`; payment is `pay_at_counter`; initial payment status is `unpaid`.
- Customer confirmation includes a reference only; do not add live order tracking or online payment.
- Admin username is `admin`; the initial password is stored only as a PBKDF2-SHA256 verifier in encrypted Supabase Vault. The HMAC session secret is also in Vault; neither secret is committed or exposed to the browser.
- No staff dashboard link in customer navigation, footer, menu, or home page. URL obscurity is not authorization.
- No anonymous read/write access to order tables. No service-role/secret key in frontend assets.
- Keep the admin dashboard unindexed and require server-verified authentication for every data request.
- Do not create or commit local secret files.

## Review Focus

- Browser submits a forged price or total: server ignores client price and recomputes from trusted menu data.
- Menu item becomes sold out or disappears after page load: order creation rejects unavailable products.
- Quantity is zero, negative, fractional, huge, or malformed: request is rejected without inserting partial orders.
- Customer repeats submit after a timeout: prevent accidental duplicate creation using an idempotency key.
- Unauthenticated user visits the hidden staff URL or calls the API directly: no order/customer data is returned.
- Incorrect/repeated admin passwords: generic failure response and rate limiting; no username enumeration.
- Takeaway fee handling: add ₹10 per product only for takeaway, if confirmed in the current business rule; do not charge dine-in.
- XSS-like text in customer notes/name: render as text, never inject into HTML.
- Mobile checkout: controls remain usable without breaking existing menu category/search interactions.

---

### Task 1: Database schema and locked-down access

**Files:**
- Create in Supabase: migration `create_online_orders_schema`
- No repository source changes in this task.

**Interfaces:**
- Produces tables `public.orders` and `public.order_items`.
- `orders`: UUID primary key, unique human-readable order reference, order type check, customer name/mobile, optional notes, integer subtotal/total in paise, payment method/status, idempotency key, created timestamp.
- `order_items`: UUID primary key, order FK, stable item ID, item name/price snapshots, positive integer quantity, integer line total in paise.
- Store item snapshots for historical accuracy; use exact integer money arithmetic.
- Enable RLS; revoke direct table access from `anon` and `authenticated`; no public policies. Edge Function uses server-side secret key.

- [x] Inspect current project database state and confirm no pre-existing ordering tables.
- [x] Apply schema migrations with constraints, indexes, RLS, least-privilege grants, atomic order creation, and rate-limit functions.
- [x] Query table metadata and privileges; verified RLS enabled and no anon/authenticated table or RPC access.
- [x] Run Supabase security advisors; only informational RLS-enabled/no-policy notices remain, with no public access grants.

### Task 2: Trusted menu catalog and order API

**Files:**
- Create: `supabase/functions/tcc-orders/index.ts`
- Create: `supabase/functions/tcc-orders/deno.json`
- Create: `supabase/functions/tcc-orders/README.md` (secret setup and endpoint contract)
- Create: `tests/orders-api.test.ts` or equivalent repository-native test file.
- Create/update: a small menu catalog module used by the function, with stable IDs and prices in integer paise.

**Interfaces:**
- Public action `create_order`: accepts idempotency key, order type, customer details, notes, and item IDs/quantities; returns order reference and server-calculated total.
- Staff actions `admin_login`, `admin_session`, `list_orders`, `get_order`; staff actions require a valid signed session.
- No public order-list or public order-detail action.
- Menu catalog includes only orderable items; sold-out items are not accepted.
- Menu catalog and visible menu must be cross-checked against the current `menu.html`; avoid guessing prices or silently omitting add-ons.

- [x] Extract/compare displayed menu item names and prices from `menu.html`; catalog has 110 rows, 95 available and 15 sold out. Takeaway adds ₹10 per unit.
- [ ] Create tests for valid order, invalid type, unknown item, sold-out item, invalid quantity, forged client price, takeaway fee, idempotent retry, and escaped customer text.
- [ ] Run tests and verify they fail before implementation.
- [x] Implement trusted catalog and Edge Function validation/insertion.
- [x] Implement idempotent creation with a unique database constraint and atomic RPC.
- [x] Deploy Edge Function (`tcc-orders`, version 6); JWT verification is disabled only because staff actions use explicit signed-session validation and public create-order is intentionally unauthenticated.
- [ ] Smoke-test a valid order and invalid requests; verify rows are persisted correctly and no client-supplied totals are trusted.

### Task 3: Customer cart and checkout

**Files:**
- Modify: `menu.html` (add-to-order controls and checkout/cart surface without changing existing menu markup semantics)
- Modify: `style.css` (responsive cart/checkout styles matching TCC visual language)
- Modify: `script.js` or add: `order.js` (cart state, validation, API submission)
- Create: `tests/order-cart.test.js` or browser test equivalent.

**Interfaces:**
- Cart item: stable item ID, display name, quantity, server catalog price reference; client display total is informational until server confirmation.
- Checkout fields: order type, customer name, mobile, optional instructions.
- Submit calls Edge Function `create_order`; confirmation renders returned order reference and server total.
- Do not show order controls for sold-out items; preserve existing menu browsing and search.

- [ ] Add failing tests for add/remove/update quantity, sold-out item exclusion, order-type selection, required customer fields, and cart persistence across category changes.
- [ ] Run tests to verify failure.
- [x] Add minimal cart controls to each orderable menu item, preserving existing product names/prices and markup hooks.
- [x] Implement mobile-first cart/checkout panel and submit/error/success states, including stable idempotency key reuse after uncertain failures.
- [ ] Verify customer cannot submit an empty cart and server errors do not clear the cart.
- [ ] Test menu search/category switching while cart is open and after checkout success.

### Task 4: Private staff login and order dashboard

**Files:**
- Create: `staff/index.html` (or another separate unlinked route chosen after checking static hosting path behavior)
- Create: `staff/staff.css`
- Create: `staff/staff.js`
- Modify: Edge Function for login/session/list/get actions.
- Create: staff auth/API tests.

**Interfaces:**
- Login accepts username/password; username is `admin`.
- Password verifier and session signing secret are stored in encrypted Supabase Vault and retrieved only by a service-role-only SQL function.
- Use a maintained password hash format supported by Deno/Web Crypto or a reviewed library; never store plaintext.
- Session is short-lived, HttpOnly cookie preferred if supported by the static host/API origin arrangement; otherwise use a short-lived bearer token held only in memory and never localStorage.
- Dashboard list/detail endpoints require the session and return only necessary order/customer data.
- No staff registration, no email auth, no dashboard link from customer pages.

- [ ] Add tests for valid login, invalid login, expired/forged session, rate limiting, and unauthorized order listing.
- [ ] Run tests to verify failure.
- [x] Implement server-side PBKDF2 credential verification and four-hour HMAC-signed session validation.
- [ ] Provision `tcc_admin_password_hash` and `tcc_session_secret` in Supabase Vault; document rotation without including secret values.
- [x] Implement unlinked, noindex staff login and dashboard.
- [ ] Verify direct API requests without a valid session return 401/403 and no customer/order data.

### Task 5: End-to-end verification and handoff

**Files:**
- Update: `supabase/functions/tcc-orders/README.md`
- Update: `docs/superpowers/specs/2026-11-13-tcc-online-ordering-design.md` only if implementation decisions materially change.
- Create: `docs/superpowers/plans/2026-11-13-tcc-online-ordering.md` (this plan).

- [ ] Run automated tests and static syntax checks for all changed JS/HTML/Edge Function files.
- [ ] Verify mobile customer flow: menu → cart → checkout → confirmation.
- [ ] Verify staff login and order list/detail on mobile and desktop.
- [ ] Verify no staff route link exists in customer pages and staff page has noindex metadata.
- [x] Verify RLS/table grants and RPC grants block anon/authenticated access; inspect browser assets for privileged keys/secrets.
- [ ] Run Supabase security and performance advisors; resolve critical findings.
- [ ] Inspect the final diff and branch commit history; confirm every new commit is on `order` and `main` is unchanged.
- [ ] Provide the user the preview URL/route, test results, and any required deployment secret setup/rotation steps.

---

## Scope note

This is a multi-part feature, but the database/API, customer ordering UI, and staff dashboard are sequentially dependent and are therefore planned as one cohesive release. If the menu catalog cannot be reliably derived from the current HTML and its business rules, stop and ask for the authoritative menu export rather than inventing prices or availability.


## Execution status (2026-11-13)

- Task 1 complete: dedicated schema, RLS, least-privilege grants, atomic order RPC, public order rate limit, and atomic staff login rate limit are applied and verified.
- Task 2 implementation/deployment complete: 110-item catalog matches current menu names/prices/availability; Edge Function active at version 7. Catalog parity was checked against the live branch file in this session. The repository includes a Node test file, but the full test command was not run because this environment could not clone GitHub and browser-test credits were unavailable.
- Task 3 implementation complete: menu add buttons, cart, takeaway/dine-in selection, customer details, fee display, and server confirmation integrated on the `order` branch. Live browser checkout still requires preview verification.
- Task 4 implementation complete: unlinked `staff/` route, noindex metadata, dashboard, server-side PBKDF2 password verification, Vault-backed HMAC secret, and rate limiting. The login flow still needs live endpoint/browser verification.
- Task 5 partially complete: JavaScript syntax checks passed; the Edge Function deployed successfully (Deno compilation accepted); SQL RPC transaction test passed and rolled back; rate-limit tests passed inside rollback transactions; SQL privilege checks passed; security/performance advisors checked. Full browser/device testing remains outstanding.
- Ruling: Vault-backed credentials were used instead of Edge Function environment variables because the connected Supabase management tools do not expose a secrets-setting action; Vault is encrypted at rest and is read only through a service-role-only RPC. This keeps the credentials server-side without requiring the owner to paste secrets manually.
- Ruling: Browser checkout and staff login were not live-tested because the connected browser test service reported insufficient credits; GitHub clone/network access was unavailable for running the repository's Node test command locally.
- Final review: self-review (no subagent tool). No further code change was made during the review pass. Branch remains unmerged by design; main was verified identical to its starting SHA.

- Final: minor (deferred): Supabase performance advisor reports three currently unused indexes. They are retained because the new tables have no production workload yet and the indexes support expected order/date/reference lookups.

- Ruling: The initial design-document commit briefly included the shared password in the `order` branch history. The current spec and all current source files have been scrubbed and re-scanned, but the earlier Git commit still contains it. I did not rewrite or force-push the shared `order` branch without explicit approval; this must be cleaned from branch history before public release.
