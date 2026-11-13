# TCC Online Ordering — Design

**Date:** 2026-11-13  
**Repository:** `tccnellore-alt/tcc-restaurant-website`  
**Target branch:** `order` only  
**Backend:** Dedicated Supabase project `tcc-online-orders` (`hyhkrmkemhjuqokcoqgp`, `ap-south-1`)

## Intent

Add customer ordering to the existing mobile-first TCC – The Coffee Club website, while giving staff a private way to receive and review submitted orders. The ordering workflow must be isolated from the existing Recipe Book and Inventory databases.

## Goals

- Let customers browse the existing menu, add items and quantities, choose Takeaway or Dine-in, enter contact details and instructions, review, and submit an order.
- Confirm successful submission with a unique order reference.
- Let staff sign in to a separate, unlinked dashboard and view incoming orders and their line items.
- Collect payment at the counter only; do not add online payment.
- Provide confirmation only; do not add live customer-facing order tracking.
- Validate prices and product availability on the server rather than trusting browser-submitted totals.
- Keep all code and documentation changes on the `order` branch. Never modify or merge `main`.

## Non-goals and anti-goals

- No online payment gateway, customer accounts, live order status, or public order lookup.
- No staff registration or multiple staff accounts in this first version.
- No dashboard link in customer navigation, footer, menu, or homepage.
- Do not change unrelated menu content, prices, images, sold-out behavior, or other site pages.
- Do not expose Supabase service-role credentials, admin password, password hash, or signing secrets in browser code or Git.

## Confirmed product decisions

- Order types: `takeaway` and `dine_in`.
- Order intake: customer website and staff dashboard.
- Payment: pay at counter; new orders are unpaid.
- Customer tracking: submission confirmation/reference only.
- Staff account: one shared account, username `admin`, with the initial password supplied by the project owner and stored only as a server-side verifier; no email login and no public registration.
- Staff dashboard: no visible customer-facing link; use a separate unlisted route. Authentication, not URL secrecy, is the security boundary.
- Backend: Supabase Edge Function validates and creates orders.
- Database: new dedicated Supabase project `tcc-online-orders`, separate from Recipe Book and Inventory.

## Security requirements

- Never place the admin password or any privileged Supabase key in frontend files or repository history.
- Store the admin password verifier/hash and session-signing secret in encrypted Supabase Vault entries; the Edge Function reads them only through a service-role-only database function.
- Compare passwords server-side using a modern password-hashing scheme; never store plaintext.
- Use four-hour signed staff sessions and verify them server-side for every dashboard data request. Keep the browser token in memory only.
- Atomically rate-limit staff login attempts and avoid revealing whether the username or password was incorrect.
- Keep order listing and order-detail endpoints unavailable without a valid staff session.
- Validate request shape, quantities, item IDs, item availability, and prices server-side; calculate totals from trusted menu data.
- Apply restrictive database permissions/RLS. Do not expose order tables for anonymous direct reads or writes.
- Use CORS allowlisting for the production customer website and its approved preview/development origin(s), with explicit configuration.
- The requested shared password is weak. It is stored only as a server-side password hash and should be rotated before public launch.

## Architecture and approaches

### Selected: Supabase Edge Function as the API boundary

The existing static website calls a Supabase Edge Function. The function validates customer orders and writes order headers and line items using server-side credentials. The same function (or a separate staff function if separation improves maintainability) handles staff login and authenticated order retrieval. The browser receives only public configuration and a short-lived staff session token; it never receives privileged database credentials.

This is selected because the site is static HTML/CSS/JavaScript and needs a secure server-side validation boundary without introducing a new application framework.

### Alternative considered: direct browser-to-database writes

This would be simpler to wire up but increases exposure to client-side tampering and makes reliable price/availability validation harder. Not selected.

### Alternative considered: separate application server

A dedicated Node/server application could provide the API and dashboard but adds hosting, deployment, and maintenance overhead for the current static site. Not selected.

## User experience

### Customer flow

1. Customer opens the existing menu page.
2. Customer adds available products and quantities to an order cart.
3. Customer chooses Takeaway or Dine-in.
4. Customer enters name, mobile number, and optional instructions.
5. Customer reviews the order and submits.
6. Server validates the items and computes the authoritative total.
7. Customer sees a confirmation and unique order reference. Payment is due at the counter.

Takeaway pricing must preserve the existing TCC rule of an additional ₹10 per product, if that rule is present in the current menu/business logic; do not silently apply it to dine-in.

### Staff flow

1. Staff navigate directly to the separate, unlinked staff route.
2. Login form accepts username and password.
3. Successful login opens the protected order dashboard.
4. Dashboard lists orders and line items with order type, customer contact, notes, total, payment status, and submission time.
5. Unauthenticated requests cannot read order data, even if the route URL is known.

The initial release does not include order status transitions or live customer tracking unless separately approved. Public order submission is rate-limited per source IP.

## Data model

- `orders`: unique reference, order type, customer name, mobile, instructions, subtotal/total, payment method/status, created timestamp.
- `order_items`: order ID, stable product/menu identifier, item name snapshot, quantity, unit price snapshot, line total.
- `login_attempts` (or equivalent rate-limit store): hashed/normalized login source identifier and attempt timestamps, retained only as long as needed for abuse prevention.

Store item name and price snapshots so later menu edits do not rewrite historical orders. Store money in integer paise or another exact integer representation, not floating-point.

## UI and implementation constraints

- Preserve TCC's forest-green, sage/cream, warm-neutral visual language and existing mobile-first layout.
- Integrate ordering into the existing menu page without replacing its existing categories, sold-out labels, best-seller tags, add-ons, or image/text menu behavior.
- Keep staff UI assets and route separate from customer navigation.
- Keep changes scoped to the `order` branch and the new Supabase project only.

## Open implementation details for the builder

- Inspect the full menu data representation and current price/add-on/sold-out markup before deciding how to derive stable menu IDs and trusted server-side prices.
- If menu data is currently embedded only in HTML, create a single maintainable server-trusted menu catalog for order validation and keep it synchronized with the visible menu without duplicating business rules.
- Confirm the production and preview hostnames from repository/deployment configuration before setting CORS.
- Choose and document a secure staff session mechanism supported by Supabase Edge Functions; do not invent a custom cryptographic scheme if a maintained library or platform-supported approach is available.
- Add explicit operational instructions for setting Supabase secrets and rotating the initial password before launch.
