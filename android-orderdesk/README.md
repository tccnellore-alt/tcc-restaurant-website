# TCC Order Desk Android

Native Android application foundation for the TCC QR Order Desk.

- Package: `com.tccnellore.orderdesk`
- Android minimum: 8.0 (API 26)
- Branding: TCC forest green / sage / cream
- Firebase Cloud Messaging receiver is included.

## Build

Open this folder in Android Studio and build the `app` debug variant, or use the GitHub Actions workflow in `.github/workflows/android-orderdesk.yml`.

## Required before push notifications can work

1. Create/register the Android app in the TCC Firebase project using package `com.tccnellore.orderdesk`.
2. Add Firebase's `google-services.json` under `app/` (do not commit secrets if project policy requires secure handling).
3. Add the Google Services Gradle plugin.
4. Implement secure FCM token registration and server-side delivery in the existing Supabase Edge Function, using Firebase service-account credentials stored as Supabase secrets.
5. Deploy the updated Edge Function and test on real Android devices, including battery optimisation and lock-screen behaviour.

The FCM receiver in this initial scaffold displays incoming push messages; it does not yet send or schedule them. No production branches are changed.
