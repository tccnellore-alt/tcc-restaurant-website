# TCC Manager — Android PWA + Firebase Push

This branch adds the installable TCC Manager shell to the existing Order Desk. Production is not changed by this branch.

## Included

- `manager.webmanifest` and TCC launcher icon.
- Root-scope PWA service worker with an offline shell fallback.
- Firebase Cloud Messaging background and foreground handling.
- A per-phone notification opt-in control shown after manager login.
- Device registration/unregistration using the existing TCC manager session.
- A server-side FCM sender Edge Function.
- New-order push invocation after a new order is inserted (idempotent retries do not re-notify).
- A service-role-only device registry migration.

## Firebase setup required before push can work

1. Create or select a Firebase project for TCC Manager.
2. In Firebase Console, add a **Web app** and copy its Web App config.
3. In Project settings → Cloud Messaging → Web Push certificates, generate a VAPID key pair. The public key is used by the web app.
4. Enable the Firebase Cloud Messaging API for the project.
5. Create a service account with permission to send Firebase Cloud Messaging messages. Download its JSON key securely.
6. Fill `manager-firebase-config.js` with the public Web App config and VAPID public key. These are public client values; do not put the service-account JSON in this file.
7. Store the full service-account JSON as a Supabase Edge Function secret named `FIREBASE_SERVICE_ACCOUNT_JSON` on project `pcxsdypqlavtulidpydn`. Never commit this secret.

## Supabase setup required before push can work

1. Apply `supabase/migrations/20261122000100_tcc_manager_devices.sql` to the development/preview database first. It creates `public.tcc_manager_devices` with RLS enabled and no anon/authenticated grants or policies.
2. Deploy `supabase/functions/tcc-manager-push/index.ts` as the `tcc-manager-push` Edge Function.
3. Deploy the updated `supabase/functions/tcc-orders/index.ts` from this branch. It calls the push function with the service-role key after a new order is created; push delivery failure does not fail customer checkout.
4. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` on that project. The existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` Edge Function secrets are used by Supabase.

Do not deploy either function or apply the migration to production until the branch has been reviewed and explicitly approved.

## Install on Android

After the branch is deployed to an HTTPS Cloudflare Pages preview and Firebase is configured:

1. Open the preview's `/orders.html` in Chrome on Android.
2. Sign in with the existing TCC manager credentials.
3. Choose **Install TCC Manager** (or Chrome menu → Install app / Add to Home screen).
4. Choose **Enable mobile notifications** and allow notifications.
5. Repeat on each manager phone. Each device is registered independently.

The app uses the existing Order Desk login. Logging out deactivates that phone's push registration. New order notifications are data-only FCM messages displayed by the shared service worker; tapping one opens the Order Desk.

## Notes

- PWA installation requires HTTPS and a browser with service worker / Web Push support.
- Android notification sound, channel importance and vibration are ultimately controlled by Android/Chrome device settings. The earlier Order Desk in-page alert-tone preferences do not set Android system notification-channel sounds.
- The service-account key and Supabase service-role key must never be added to the repository or client code.
- Firebase project values are intentionally placeholders until TCC's Firebase project is selected.
