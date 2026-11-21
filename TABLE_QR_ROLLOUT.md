# TCC Dedicated Table QR Ordering

## Scope

This change adds a second ordering path while preserving the existing public menu URL and manual table selection.

- Existing menu URL: unchanged manual table selection and checkout.
- Dedicated QR URL: `menu.html?tcc_qr=<opaque-token>#menu`; the table is resolved from the server and manual table selection is locked.
- The server verifies the QR token again during order creation and assigns the table from the database, ignoring any client-supplied table override.
- QR credentials are stored as SHA-256 hashes only.
- QR creation, listing, regeneration and revocation require an authenticated TCC admin session.

## Tables covered

S1–S6, C1–C4, P1–P3, T1–T2 (15 tables).

## Files

- `supabase/migrations/20261121000100_table_qr_tokens.sql`: token table, RLS and grants.
- `supabase/functions/tcc-orders/index.ts`: public token resolution, server-side create-order validation, and admin QR management actions.
- `script.js`: QR-aware customer flow.
- `table-qr-admin.html`: authenticated QR manager.
- `orders.html`: link to QR manager.
- `menu.html`: script cache-bust update.

## Safe rollout order

1. Review this branch and the SQL migration.
2. Apply the additive migration to the intended Supabase project.
3. Deploy the updated `tcc-orders` Edge Function from this branch.
4. Deploy the Cloudflare Pages branch as a preview first and test it.
5. Deploy the website change to production only after the preview tests pass.
6. Open `/table-qr-admin.html` while signed in and generate each table QR.
7. Print and test each QR at its matching table.

Do not generate production QR codes until the migration and Edge Function routes are deployed.

## Acceptance checklist

- [ ] Existing regular menu URL still opens and allows manual table selection.
- [ ] Existing regular URL can still place a dine-in order.
- [ ] Valid QR resolves to its mapped table.
- [ ] QR checkout does not expose manual table selection.
- [ ] Changing `table_number` in the browser request does not change the server-assigned table.
- [ ] Invalid token cannot resolve or create an order.
- [ ] Revoked token cannot resolve or create an order.
- [ ] Regenerating a QR invalidates the old token.
- [ ] QR order appears in the existing Order Desk with the correct table.
- [ ] Duplicate-submit protection still works.
- [ ] Takeaway and other existing order flows remain unchanged.
- [ ] Kitchen/billing integrations continue receiving the same order record shape.

## Important rollout boundary

This feature does not disable manual table selection. The legacy ordering path remains enabled by design. Disabling manual ordering is a separate future change and should only happen after the dedicated QR rollout has been verified in the café.
