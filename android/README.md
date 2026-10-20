# Fumufumu for Android (test app)

A thin Capacitor shell: a real Android app whose window loads the app from
https://laurmoe7.github.io/pet-shopper/ (the same way the Windows app does), so page changes
arrive without a new APK. A new APK is only needed when this folder changes.

Build: Actions > "Build the Android app" > Run workflow. Every APK is signed with the same key, the repository secret `ANDROID_DEBUG_KEYSTORE` (base64 of a keystore, alias `androiddebugkey`, passwords `android`; `android.yml` points `app/build.gradle` at it and fails the build if the APK carries another key; set up in build 734, after android-3 would not install over android-1 because each build had made its own key). Without the secret the build still works but makes a new key, and Android refuses it as an update ("App not installed"); losing the key means uninstalling once. It publishes a pre-release named
`android-N` with `Fumufumu.apk`. Open that page on the phone, download the APK, allow
"install unknown apps" for the browser once, and install. Debug-signed, for testing only.

Updates (build 739, `app-apk.js`): from android-6 on, `android.yml` stamps each APK with its run number (Android's
versionCode and versionName `android-N`, and `FumuAPK/N` added to the browser's name, `appendUserAgent`). The page asks
GitHub for the `android-N` tags (at most every 6 hours, and from Options > Check for updates) and shows a card when a newer
one exists; Install opens the APK's download in Chrome, and Chrome's Open installs it. An APK without the number counts as
android-5 (`APK_UNMARKED`), the last one made before this. The check needs the repository (or wherever the APKs are
released) to be public.

The `android/` project itself is generated in CI (`npx cap add android`), so it is not checked in.

Phone alerts (build 729): the APK carries `@capacitor/local-notifications`, the `SCHEDULE_EXACT_ALARM` permission and the status bar icon in `res/drawable/` (both added to the generated project by `android.yml`). An APK from before that has no alerts; the page then just leaves them out.

Home screen icon and start-up picture: `res/mipmap-*/` and `res/drawable*/splash.png`, made from `icon-maskable-512.png` and `icon-512.png` by `python3 tools/android-icons.py` (run it again after changing those icons); `android.yml` copies all of `res/` over the generated project.
