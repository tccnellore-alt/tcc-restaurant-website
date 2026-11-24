# TCC Order Desk Android — Test build

- Package: `com.tccnellore.orderdesk`
- Firebase project: `tcc-order-desk-b8569` (existing Android app registration)
- Minimum Android: 8.0 (API 26)
- Dashboard: Cloudflare Pages branch preview, with `tcc_env=test`
- Backend: isolated Supabase project `tcc-menu-availability-test`

The app loads the existing Order Desk web interface in a native Android shell. Login and desk actions use the same Order Desk frontend and API contract. The test URL explicitly selects the test Supabase project and must never silently fall back to production.

## Build APK

GitHub Actions builds a debug APK from this branch and uploads it as `tcc-orderdesk-android-test-apk`.

## Push notifications

Firebase Messaging uses the existing Firebase Android app. After staff sign in, the Android bridge registers the device token against the test Edge Function. The function sends FCM messages for new QR orders and Call Staff / Request Bill events when the Supabase secret `FCM_SERVICE_ACCOUNT_JSON` is configured with the Firebase service-account JSON. Logout deactivates that device registration.

The APK can be built without the server service-account secret, but background push delivery remains inactive until that secret is configured in the test Supabase project.
