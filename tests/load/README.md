# TCC Orders API — 50-user load test

## Safety
- Targets the existing `tcc-app-order` Supabase project and its deployed `tcc-orders` Edge Function.
- This is a **read-only** test. It calls `action=order-lookup` using the synthetic, future-dated reference `TCC-20990101-LOAD50`.
- It does not submit, edit, cancel, archive, or delete orders; it does not log in or access customer records.
- The test expects an empty result for that synthetic reference.
- Do not change this to `create-order` against the live project without an isolated test-data strategy and explicit approval.

## Load profile
| Phase | Virtual users | Duration |
|---|---:|---:|
| Warm-up | 5 | 1 min |
| Ramp | 10 | 2 min |
| Ramp | 25 | 2 min |
| Peak | 50 | 10 min |
| Recovery | 5 | 2 min |

Each virtual user waits one second between requests. Actual request rate depends on response time.

## Pass criteria
- HTTP request failure rate below 1%
- p95 response time below 2,000 ms
- More than 99% of checks pass (HTTP 200, JSON orders array, empty synthetic lookup)

These are initial engineering targets, not a guarantee of business capacity. This test measures the read-only order-lookup path, not full customer order submission or dashboard login/edit flows.

## Run
1. Open the repository's **Actions** tab.
2. Select **TCC Orders Read-only Load Test**.
3. Choose **Run workflow** on branch `loadtest-50-users`.
4. Open the run and inspect the k6 summary and threshold results.

The workflow is manual-only; creating this branch does not trigger a load test or deploy website/backend code.
