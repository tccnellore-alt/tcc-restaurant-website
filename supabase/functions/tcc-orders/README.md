# TCC Orders Edge Function

Function name: `tcc-orders`  
Project: `hyhkrmkemhjuqokcoqgp`

## Staff authentication secrets

The initial staff password is stored only as a PBKDF2-SHA256 verifier (210,000 iterations, 256-bit output) in Supabase Vault under `tcc_admin_password_hash`. The HMAC signing secret is stored encrypted in Vault under `tcc_session_secret`. The Edge Function reads these only through the `get_tcc_staff_secret` database function using its server-side service role. Neither plaintext password nor signing secret is stored in Git or browser code.

The initial username is `admin`. The initial password was provisioned as agreed with the project owner.

The Vault values can be rotated by an authorised project owner. Generate a new PBKDF2-SHA256 verifier using a fresh 16-byte random salt and 210,000 iterations, then update the Vault secret named `tcc_admin_password_hash`. Rotate `tcc_session_secret` with at least 32 cryptographically random bytes to invalidate existing sessions.

## API actions

All requests are POST JSON to `/functions/v1/tcc-orders`.

- `create_order`: public customer submission; server validates item IDs, availability, quantity, and prices.
- `admin_login`: accepts username/password and returns a four-hour signed staff token.
- `admin_session`: verifies an existing staff token.
- `list_orders`: returns the latest 100 orders; requires a valid staff token.
- `get_order`: returns one order by reference; requires a valid staff token.

Staff token is sent in `Authorization: Bearer <token>`. Keep it in memory only; do not store it in localStorage. The browser dashboard signs out when the page is refreshed or closed.

## Pricing

- The trusted catalog was derived from the current `order` branch `menu.html` (110 menu rows).
- 95 products are currently orderable; 15 products marked temporarily sold out are disabled.
- Prices are stored in paise and recalculated by the server.
- Takeaway adds ₹10 per unit ordered. Dine-in adds no takeaway fee.
- Customer-provided prices and totals are ignored.
- Public order submission is rate-limited to 10 attempts per source IP per 10-minute window.
- Staff login is atomically rate-limited to four failed attempts before a 15-minute lockout.

## CORS

Allowed origins are explicitly restricted in `index.ts` to the production Pages domain, the `order` branch preview domain, and localhost:8788 for local development. If Cloudflare Pages uses a different preview hostname, add the exact hostname in the allowlist and redeploy.

## Database

The function requires the `orders`, `order_items`, `staff_login_attempts`, and `order_submission_limits` tables plus the `create_tcc_order(jsonb,jsonb)`, `allow_tcc_order_submission(text)`, `begin_tcc_staff_login_attempt(text)`, and `get_tcc_staff_secret(text)` RPC functions. RLS is enabled with no public policies; direct table and RPC access is restricted to the service role. Vault stores the staff password verifier and signing secret encrypted at rest.
