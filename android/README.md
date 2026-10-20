# Fumufumu for Android (test app)

A thin Capacitor shell: a real Android app whose window loads the app from
https://laurmoe7.github.io/pet-shopper/ (the same way the Windows app does), so page changes
arrive without a new APK. A new APK is only needed when this folder changes.

Build: Actions > "Build the Android app" > Run workflow. It publishes a pre-release named
`android-N` with `Fumufumu.apk`. Open that page on the phone, download the APK, allow
"install unknown apps" for the browser once, and install. Debug-signed, for testing only.

The `android/` project itself is generated in CI (`npx cap add android`), so it is not checked in.

Phone alerts (build 729): the APK carries `@capacitor/local-notifications`, the `SCHEDULE_EXACT_ALARM` permission and the status bar icon in `res/drawable/` (both added to the generated project by `android.yml`). An APK from before that has no alerts; the page then just leaves them out.
