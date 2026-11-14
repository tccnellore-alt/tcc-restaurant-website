# TCC Website & Online Ordering — Engineering Handoff

> Purpose: This document is the working handoff for another engineer/agent to continue the TCC website ordering, Order Desk and kitchen workflow without needing the original chat history. Read this file first, inspect the current `whatsappv3` branch, then verify the live code and backend before making changes.
>
> Last handoff update: 15 November 2026 (project conversation date). This document records implementation state, intended behaviour, architecture, known limitations and next steps. It is not a claim that every feature has passed end-to-end testing.

---

## 1. Project identity and source of truth

- Business: **TCC – The Coffee Club**, Nellore, India.
- Tagline: **Good Food, Brighter Days.**
- Visual direction: forest green, sage green, cream and warm neutrals.
- GitHub repository: https://github.com/tccnellore-alt/tcc-restaurant-website
- Active development branch: **`whatsappv3`**
- Production branch: **`main`**
- Production website: https://tcc-restaurant-website.pages.dev/
- Hosting: Cloudflare Pages.
- Website preview branch deployment: expected Cloudflare Pages branch URL convention is `https://whatsappv3.tcc-restaurant-website.pages.dev/`; **this URL has not been independently verified**. Check Cloudflare Pages deployment list before sharing it as live.
- Supabase project name: `tcc-app-order`
- Supabase project ID: `pcxsdypqlavtulidpydn`
- Supabase region: Mumbai, India (`ap-south-1`)
- Supabase URL: https://pcxsdypqlavtulidpydn.supabase.co
- Edge Function: `tcc-orders`
- Function endpoint: https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders
- Latest function version observed while writing this handoff: **13**, ACTIVE, `verify_jwt=true`.

**Branching rule:** all ongoing work for this scope goes to `whatsappv3`. Do not merge, deploy to, or modify `main` unless the owner explicitly approves. Before editing, fetch the latest file and use its current blob SHA. Do not overwrite newer work with stale copies.

---

## 2. Business and product decisions already made

### Customer ordering
- Customers order directly on the TCC website.
- **WhatsApp is no longer part of the order submission flow.** Do not reintroduce `wa.me`, WhatsApp redirects or WhatsApp resend buttons unless the owner explicitly changes this decision.
- The cart action is **Place Order**.
- The order must be saved in Supabase before the customer sees a successful confirmation.
- Customer mobile number is mandatory and must be a valid 10-digit Indian mobile number. Customer name is optional; blank name is stored as `Guest`.
- No customer account, OTP or registration is wanted for order lookup at this stage.
- Customers can find orders using either an order reference or the mobile number used to place the order.
- Order lookup deliberately returns limited order information. Phone-only lookup without OTP is a usability/security trade-off explicitly chosen by the owner; do not silently add OTP, but do add rate limiting and privacy safeguards.

### Order status model
The desired simplified customer-facing stages are:
1. **Order Placed**
2. **Accepted & Preparing**
3. **Ready & Completed**

Current backend enum-like values in use:
- `new` — newly placed / Order Placed
- `preparing` — accepted and being prepared
- `completed` — ready/completed terminal stage
- `cancelled` — cancelled/rejected order

Earlier UI/backend code also used `accepted`, `ready`, `rejected`; newer status update endpoint was simplified to `new`, `preparing`, `completed`, `cancelled`. Audit/legacy rows may still contain older values. Always inspect current records and UI before any migration.

### Partial acceptance / product-level decisions
- Staff must be able to accept some products and cancel/reject others in the same order.
- The customer must see which individual products are being prepared, cancelled/rejected or completed.
- Item-level statuses currently supported in edit endpoint:
  - `preparing`
  - `cancelled`
  - `completed`
- Cancelled items are excluded from the recalculated subtotal and takeaway fee.
- Do not cancel the whole order when only one product is unavailable.
- If every item is cancelled, decide whether to automatically set the whole order to `cancelled`; this is a remaining business-rule decision and should be implemented consistently after confirmation.

### Admin authority
The owner wants broad operational control in the Order Desk:
- view/search/filter orders
- accept/prepare, complete, cancel/reject
- edit product names, quantities and prices
- add, remove and replace products
- edit add-ons and notes
- cancel/reject individual products
- update totals
- archive orders
- review reports and export data

Deletion should be **soft archive**, not permanent erasure, to preserve financial history and auditability.

---

## 3. Repository files and responsibilities

| File | Responsibility |
|---|---|
| `menu.html` | Customer-facing menu, category navigation, product cards, cart/history UI markup and product catalogue data. Large file; inspect before modifying. |
| `script.js` | Customer menu/cart interactions, checkout, order creation, local order history, cross-device Find Orders, customer order tracking/status refresh. |
| `index.html` | Website landing/home structure. |
| `orders.html` | Admin Order Desk login/dashboard structure, filters, analytics containers and dashboard script/style references. |
| `orders-dashboard.js` | Admin login/session, fetching orders, dashboard rendering, filters, status changes, new-order alerts, analytics, CSV export, product edit/archive actions. |
| `orders-dashboard.css` | Admin dashboard layout, responsive styling, cards, filters, alerts and analytics styling. |
| Supabase Edge Function `tcc-orders` | Server-side login, order creation, order lookup, order status, admin order listing, status updates, editing and archive. |

Always inspect HTML script/style references and cache-busting query versions if assets appear stale after Cloudflare deployment.

---

## 4. Current customer ordering flow

1. Customer browses menu and adds products/add-ons to cart.
2. Customer chooses dine-in or takeaway.
3. Dine-in requires a table number.
4. Customer supplies a valid mobile number; name is optional.
5. Customer taps **Place Order**.
6. Frontend generates/reuses a UUID idempotency key for the exact cart signature and posts to the Supabase Edge Function.
7. Backend validates mobile number, order type and non-empty items; generates an order number and saves the order.
8. On successful save, frontend clears the cart, stores order history locally and displays an order confirmation with reference.
9. Customer can use Order History / Find Orders on this or another device with order reference or mobile number.
10. Customer order history refreshes matching saved orders periodically while the history panel is open (10-second polling for local history entries that have both order reference and mobile number).

Order reference format: `TCC-YYYYMMDD-XXXXXX` (date plus six uppercase UUID characters).

Takeaway fee currently calculated as **₹10 per active product quantity** (not per order). This rule exists in backend order creation and edit recalculation. Confirm before changing.

---

## 5. Current Supabase architecture

### Project
- Project ID: `pcxsdypqlavtulidpydn`
- URL: https://pcxsdypqlavtulidpydn.supabase.co
- Region: `ap-south-1` (Mumbai)
- Edge Function `tcc-orders`, latest known deployed version 13, active, JWT verification enabled.
- Function URL: https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders

### Tables known to exist
1. `public.tcc_orders`
2. `public.tcc_admin_credentials`
3. `public.tcc_admin_sessions`
4. `public.tcc_order_audit_log)

Additional columns added:
- `tcc_orders.idempotency_key` with a unique partial index where non-null.
- `tcc_orders.archived_at` nullable timestamp with index.

### Audit log
`tcc_order_audit_log` fields:
- `id` UUID primary key
- `order_id` UUID FK to `tcc_orders(id)`, cascade on delete
- `order_number`
- `action`
- `details` JSONB
- `actor` default `tccadmin`
- `created_at`

RLS is enabled on audit table. The Edge Function accesses it with the server-side service role.

Known logged actions:
- `status_changed`
- `items_edited`
- `archived`

**Audit gap:** actor currently defaults to `tccadmin`; the code does not yet record a richer authenticated staff identity. Add actor/session identity if multiple named staff accounts are introduced.

### Admin authentication
- Admin username used: `tccadmin`.
- Password is stored as a PBKDF2 salted hash (310,000 SHA-256 iterations), not plaintext.
- Login creates random session token; only token hash is stored in `tcc_admin_sessions`.
- Session lifetime: 12 hours.
- Admin session sent in header `x-tcc-admin-session`.
- Do not put service role key, admin password or other secrets in source code, documentation, commits or frontend.
- Never copy or disclose credentials from chat history. If access is needed, use the authorized Supabase account and rotate credentials when appropriate.

### RLS and API model
- RLS enabled on order-related tables; no public table policies are intended.
- Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` from server-side environment.
- Browser uses public anon key for function invocation. Public anon key is not a secret; service role key is.
- Function CORS currently allows `*`; review and restrict to approved TCC website origins when practical.

---

## 6. Edge Function API contract (latest known v13)

Base:
`https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders`

All requests should include the public Supabase `apikey` header and appropriate authorization as currently used in frontend. Admin-only actions additionally require `x-tcc-admin-session`. `verify_jwt=true` is enabled at deployment.

### Public actions

#### Login
- `POST ?action=login`
- JSON: `{ "username": "...", "password": "..." }`
- Returns token, username and expiry on success.

#### Create order
- `POST ?action=create-order`
- Important fields:
  - `idempotency_key` UUID
  - `customer_name` optional
  - `customer_phone` required
  - `order_type`: `dine-in` or `takeaway`
  - `table_number` for dine-in
  - `items[]`: name, quantity, unit_price, category, section, addons[], note
  - `customer_note` optional
- Backend currently accepts client-provided prices. **This is a known high-priority security/business risk**: validate product and add-on prices against a server-controlled menu catalogue before production-scale online ordering.
- Idempotency lookup returns existing order if same key is submitted again; unique index prevents duplicate keys.

#### Customer order lookup
- `GET ?action=order-lookup&lookup=<order-reference-or-mobile>`
- Order reference returns one order.
- 10-digit mobile returns up to 20 recent orders.
- Fields include order reference, status, created date, type/table, total, customer name, items and customer note.
- Archived orders are excluded from Find Orders.

#### Customer order status
- `GET ?action=order-status&order_number=<ref>&phone=<mobile>`
- Requires both order reference and phone to match.
- Returns order status, updated timestamp, items, total and customer note.
- Customer frontend uses this to refresh local history.
- Consider adding archived filter and rate limiting consistently.

### Admin-only actions (require active session)

#### List orders
- `GET ?action=orders`
- Optional `status` query.
- Returns up to 1,000 non-archived orders, newest first.
- Date/hour/type/search filters are currently mainly frontend filters applied to this fetched set; this means very large histories can exceed the 1,000 row cap. Add server-side pagination/date filtering.

#### Update whole-order status
- `PATCH ?action=update-status`
- JSON: `{ "id": "<uuid>", "status": "new|preparing|completed|cancelled" }`
- Writes status and `updated_at`; creates audit log row.
- Dashboard action labels map to the simplified workflow.

#### Edit order
- `PATCH ?action=edit-order`
- JSON: `{ "id": "<uuid>", "items": [...], "customer_note": "..." }`
- Item fields include name, quantity, unit_price, category, section, addons, note, item_status.
- Allowed item statuses: `preparing`, `cancelled`, `completed`.
- Add-ons are arrays of `{name, price}`.
- Backend sanitizes strings/numbers and limits item/add-on counts.
- Recalculates subtotal and takeaway fee; cancelled items are excluded.
- Creates `items_edited` audit log with before/after data and old/new totals.
- The dashboard's Edit products action now opens a simple visual editor (not a JSON prompt). Staff can change product name, quantity, unit price and item status; remove products; add a product by entering name, quantity and price; add a customer note; preview the recalculated total; and save. Existing add-ons are preserved and displayed as read-only text. Editing individual add-ons and choosing replacements from a menu-backed product picker remain future improvements.

#### Archive order
- `PATCH ?action=archive-order`
- JSON: `{ "id": "<uuid>" }`
- Sets `archived_at`, updates timestamp, logs `archived`.
- Archived orders are excluded from main order list and customer lookup.
- This is soft archive, not permanent delete.

---

## 7. Order Desk features already implemented

- Admin username/password login with 12-hour session.
- Dashboard order list, cards and auto-refresh (currently every 8 seconds).
- Date period filters: Today, Yesterday, Last 7 days, Last 30 days, All time, Custom range.
- Hour filter (00:00–23:00).
- Order type filter: dine-in/takeaway.
- Search by order ID, customer name or mobile number.
- Status filters are being simplified to new / preparing / completed / cancelled. Verify the current exact HTML filter labels and status counts before further changes.
- Summary of filtered result count.
- New-order visual alert.
- Optional loud buzzer alert; staff must click **Enable sound alerts** once because browsers require user interaction to enable audio. Device media volume/browser settings affect loudness.
- Simplified dashboard actions: Accept & Prepare, Reject Order, Ready & Complete, Cancel Order.
- Edit products action (currently JSON prompt).
- Archive order action with confirmation.
- Analytics section:
  - filtered-period sales
  - Today sales
  - This week sales
  - This month sales
  - average order value
  - cancelled/rejected order count
  - dine-in vs takeaway order counts
  - hourly order volume chart
  - peak hour
  - most ordered products
- Export filtered order list to CSV, which opens in Excel. This is **CSV export**, not native XLSX.
- Responsive styling exists; test on the actual staff device sizes.

**Analytics caveats to fix/verify:**
- Today/week/month KPI calculations currently use the loaded `allOrders` collection, not necessarily the entire historical database if there are more than 1,000 orders.
- The hourly chart uses browser local time; confirm this matches Nellore local business time and data timestamps.
- Confirm whether cancelled orders should be excluded from gross sales, net sales and average order value; current sales calculation excludes whole-order `cancelled` and `rejected` statuses.
- Product ranking ignores item rows marked `cancelled`, but check how legacy items without item_status are counted.
- Daily/weekly/monthly sales totals currently use all loaded orders, while some other metrics may use active filters; make the metric scope explicit in UI.

---

## 8. Customer order history / tracking

- History panel includes Find Orders on this or another device.
- Search accepts either order reference or mobile number, no OTP.
- Each lookup result has View Order / Hide Order.
- Results show reference, status, date/time, order type/table, total and item details.
- Item details now show product-level status labels (Preparing, Cancelled, Completed).
- Local history refreshes from the order-status endpoint while history panel is open.
- Customer history refresh compares and updates stored items and total after backend changes.
- Ensure item-level status and revised order totals refresh for cross-device Find Orders too; the Find Orders endpoint returns items and total.
- Consider displaying a clear cancellation note and revised amount when one item is rejected.
- Consider customer-facing status timeline with timestamps and a clear partial-order explanation.

---

## 9. Recent implementation commit references

These are known commits from the work session; use GitHub history/current branch for exact full chronology.

### Order filters and history
- `orders.html` filters: `caada584cc87280f4721dfc1b2d3ec340fae5c64`
- `orders-dashboard.js` filters: `8a879ac5fa06bad58cd6ed913648c6bdfe478fc9`
- `orders-dashboard.css` filters: `a19550c73cab67b7451da460bc62d0dc53743576`
- Cross-device order lookup frontend: `53632018834c944a7be71abc452610438434f5ff`
- Customer order status polling: `0f7434b47c17b55a1def4904f1c37a5229a1deff`

### Direct order submission and duplicate protection
- Customer direct order submission changes: `9507acf47c003fbe755597f11fee4db60ce482f3`
- Backend database idempotency key migration added unique partial index (migration name `add_order_idempotency_key`).
- Backend version history: v6 order list cap increased to 1,000; subsequent versions added edit/status/archive features. Latest known version is v13.

### Dashboard alerts, analytics and order editor/editing
- Loud buzzer update commit: `f0c4514`
- Analytics HTML: `a3032a0add4fb19d41a23189185e1cbac7f843f6`
- Analytics/dashboard JS: `91ab17bd2787a41a5e93a0138b162840feb3d059`, followed by `a07c2a4a03284ef7d0924aeffdef274ef2ec1725` and `a4b9e2dc8430bf29a7dcc0a7e932df17db5e05d7`
- Analytics CSS: `4cc28eb6851794d2f0be47f42d0c18fff51d65d2`
- Simplified dashboard status filters: `c158c3cd6f402ce6ce58168f16fef5b03387535e`
- Daily/weekly/monthly sales KPIs: `f5f20fdff5991dd2b93b47ebf8cd159736d5b83d`, `76c5816d13f3b91c090721b6d30b65858c0f9606`
- Customer item-status display: `8187f8fc4d32f695eaa2196289a48fa4396c9167`
- Customer history refresh after edits: `13bb325f777c406c4561fe73dcbb6b146f77f6d4`
- Archive control: `ce09d8dcbc71a73634aaed2cb981dacae7852497`\n- Simplified visual order editor JS: `2efeb252e2cc3c8aff93704e6489bbb63c20c1a0`\n- Simplified visual order editor CSS: `42b8d15717cdb3f2911d169164cd294635983a25`

**Important:** Some commits were sequentially amended/extended after these hashes. The branch head is the source of truth; do not assume a commit listed above is still the branch head.

---

## 10. Known gaps, risks and unfinished work

Prioritize these before describing the system as production-ready.

### P0 — Correctness and security
1. **Server-side price validation:** order creation and order editing currently accept client-submitted prices. Build a server-owned product/price catalogue or signed price snapshot; validate product IDs and add-ons on the server. Never trust browser prices for final billing.
2. **Order edit UX:** replace JSON prompt with proper visual editor. Include per-item controls, add-ons, quantity, price, note, cancellation reason, product replacement and total preview.
3. **Partial cancellation maths:** verify refunds/adjusted totals, takeaway charge treatment, tax/discount treatment and customer messaging. Current takeaway fee is ₹10 per active quantity.
4. **Order status mapping:** ensure UI, backend and customer tracking all use exactly the simplified states. Handle old records with `accepted`/`ready`/`rejected` gracefully.
5. **Audit completeness:** log every edit/status/archive with before/after values, reason and actor. Ensure audit failure handling doesn't silently leave changes unlogged.
6. **Rate limiting:** admin login, customer lookup and create-order endpoints currently need abuse controls.
7. **Admin login lockout / session security:** add throttling and session revocation strategy.
8. **CORS:** replace wildcard origin with allowed production and preview origins when appropriate.
9. **Phone lookup privacy:** without OTP, rate-limit and minimize returned data. Do not reveal sensitive customer information.
10. **Archive semantics:** ensure archived orders cannot be changed through customer status endpoint or reappear in local history unexpectedly.

### P1 — Operational usability
1. Extend the new visual order editor with menu-backed product selection/replacement and editable add-ons (the basic visual editor is now implemented).
2. Product replacement should use actual TCC menu catalogue (product ID/name/price/add-ons), not free-text only.
3. Allow rejecting selected items and accepting remaining items in a single confirmation action.
4. Add cancellation/rejection reason and show it to customer.
5. Make the customer see the final confirmed product list and revised total after partial rejection.
6. Add item-level timestamps and order status timeline.
7. Buzzer should repeat until staff acknowledges new order; distinguish new order from customer cancellation/status updates. Browser background/sleep limitations need a more reliable push/notification strategy.
8. Add offline/connection status and reconnect handling for dashboard.
9. Add proper pagination/server-side date filtering for order history beyond 1,000 orders.
10. Add server-side CSV export or chunked export for large datasets.

### P2 — Analytics and reports
1. Make daily, weekly and monthly sales scopes explicit and independent of active list filters.
2. Define gross sales vs net sales, cancellations, refunds, tax, discounts and takeaway fee.
3. Add product sales by quantity and revenue.
4. Add dine-in/takeaway revenue comparison, not just order counts.
5. Add peak hour based on both order count and sales.
6. Add preparation time metrics using status timestamps (not currently reliably available).
7. Add date range and hourly charts with timezone explicit (Asia/Kolkata).
8. Provide true XLSX export only if specifically needed; current export is CSV Excel-compatible.

### P3 — Integrations / future
- Connect to existing TCC Inventory Management app after the order workflow is stable.
- Ingredient/recipe based stock deduction should occur at the correct lifecycle stage and support cancellations.
- Connect TCC Recipe Management for product standards and costing.
- Consider payment gateway only after order correctness, tax and refund rules are finalized.

---

## 11. Suggested next development sequence

1. **Inspect current branch head and test existing UI/API** before coding.
2. Build the visual order editor (no JSON prompt):
   - list each order item
   - select product from menu
   - quantity controls
   - add-on controls
   - per-item status (Preparing / Cancelled / Completed)
   - cancellation reason
   - add/remove/replace product
   - clear total calculation and preview
   - save confirmation
3. Add partial confirmation workflow:
   - staff reviews order
   - accepts available products
   - rejects unavailable products
   - confirms accepted subset
   - customer sees exact final breakdown and revised total
4. Add order status timeline and timestamps.
5. Validate server-side prices from authoritative menu catalogue.
6. Add tests for duplicate submission, partial cancellation, price edits, add-ons, takeaway fee, archive, and customer lookup.
7. Improve analytics scopes, sales definitions and pagination.
8. Test mobile/tablet dashboard, Cloudflare preview and a controlled end-to-end order.
9. Only after explicit owner approval, prepare a PR/merge to `main`.

---

## 12. End-to-end acceptance test checklist

Use a controlled test order, not a real customer order, unless the owner approves.

- [ ] Dine-in order requires table number.
- [ ] Takeaway order has ₹10 per active quantity packing fee (verify this is still intended).
- [ ] Valid phone required; name optional.
- [ ] Duplicate request with same idempotency key creates only one order.
- [ ] Customer receives confirmation only after successful DB save.
- [ ] Dashboard receives order and buzzer works after enabling audio.
- [ ] Staff can accept/prepare the order.
- [ ] Staff can cancel one product and prepare another.
- [ ] Cancelled product is excluded from total.
- [ ] Takeaway fee recalculates correctly after product cancellation.
- [ ] Customer Find Orders shows revised items, statuses and total.
- [ ] Customer order history on originating device refreshes correctly.
- [ ] Staff can add, remove and replace products.
- [ ] Add-ons and notes survive edit/save/reload.
- [ ] Full order cancellation works and is visible to customer.
- [ ] Archive hides order from active dashboard and lookup but preserves audit.
- [ ] Date/hour/type/status/search filters combine correctly.
- [ ] Daily/weekly/monthly sales calculations match independently queried test data.
- [ ] CSV export opens correctly in Excel and matches filters.
- [ ] Mobile/tablet layout works.
- [ ] Admin session expires and logout works.
- [ ] RLS and unauthenticated access checks pass.
- [ ] Production `main` is unchanged unless approved.

---

## 13. How the next agent should continue

1. Read this file fully.
2. Confirm repository `tccnellore-alt/tcc-restaurant-website`, branch `whatsappv3`.
3. Fetch latest `orders.html`, `orders-dashboard.js`, `orders-dashboard.css`, `script.js` and inspect current branch HEAD.
4. Fetch current Supabase Edge Function `tcc-orders` and confirm version; do not rely solely on the version recorded here.
5. Review current Supabase schema/migrations before changing fields.
6. Identify which P0/P1 item the owner wants next. The recommended next task is the visual product editor and partial accept/reject confirmation workflow.
7. Keep changes scoped and commit them to `whatsappv3`.
8. Do not expose credentials, service role keys, admin passwords, or customer personal data in this file, commits or reports.
9. Test what can be tested and clearly separate implemented, deployed, preview-verified and production-verified states.
10. Do not merge to `main` without explicit approval.

### Useful direct links
- Repository: https://github.com/tccnellore-alt/tcc-restaurant-website
- Active branch: https://github.com/tccnellore-alt/tcc-restaurant-website/tree/whatsappv3
- Customer menu file: https://github.com/tccnellore-alt/tcc-restaurant-website/blob/whatsappv3/menu.html
- Customer logic: https://github.com/tccnellore-alt/tcc-restaurant-website/blob/whatsappv3/script.js
- Order Desk HTML: https://github.com/tccnellore-alt/tcc-restaurant-website/blob/whatsappv3/orders.html
- Order Desk JS: https://github.com/tccnellore-alt/tcc-restaurant-website/blob/whatsappv3/orders-dashboard.js
- Order Desk CSS: https://github.com/tccnellore-alt/tcc-restaurant-website/blob/whatsappv3/orders-dashboard.css
- Production website: https://tcc-restaurant-website.pages.dev/
- Supabase project: https://supabase.com/dashboard/project/pcxsdypqlavtulidpydn
- Supabase Edge Functions: https://supabase.com/dashboard/project/pcxsdypqlavtulidpydn/functions

---

## 14. Important accuracy note

This handoff is based on the implementation and tool state inspected during the 15 November 2026 work session. It intentionally records known unfinished work and security risks. It does **not** claim:
- that Cloudflare preview deployment has been independently verified;
- that a full browser-based end-to-end customer order has been completed;
- that every analytics calculation has been reconciled against production data;
- that current price validation is secure;
- that the JSON prompt editor is a finished staff-friendly UI;
- that a native XLSX export exists.

The next agent must verify current branch and deployed backend state before making changes.
