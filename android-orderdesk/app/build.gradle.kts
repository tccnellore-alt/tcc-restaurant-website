plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
apply(plugin = "com.google.gms.google-services")

android {
    namespace = "com.tccnellore.orderdesk"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.tccnellore.orderdesk"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-test"
        buildConfigField("String", "DASHBOARD_URL", "\"https://feature-android-orderdesk-te.tcc-restaurant-website.pages.dev/orders.html?tcc_env=test\"")
    }
    buildFeatures { buildConfig = true }
}
dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("com.google.firebase:firebase-messaging:24.1.0")
}
