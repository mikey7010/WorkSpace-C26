# WorkSpace C26 — Android APK build

This folder is the React Native / Expo Android app. The app has been prepared for an installable APK using EAS Build.

## Before building

1. Install Node.js LTS and Git on your computer.
2. Open a terminal in this `mobile` folder and run `npm ci`.
3. Sign in to an Expo account: `npx eas-cli login`.
4. Confirm the backend is deployed or running and reachable from the phone. The default API URL is `http://192.168.31.177:4000` (defined in `src/api/config.js`).
   - For local development, use your computer's LAN IP (phone and computer on the same Wi-Fi).
   - `localhost` on the phone means the phone itself, not your computer.
   - For an APK used outside your Wi-Fi, deploy the backend to a reachable HTTPS host and update the URL.
5. In the app's sign-in screen, tap **Server Connection Settings** to test connectivity or enter a new server URL. This setting is automatically saved to device storage and persists across app restarts.

## Build an installable APK

```bash
npx eas-cli build --platform android --profile preview
```

The build profile `preview` (and `preview-apk`) in `eas.json` is configured with `buildType: "apk"` to produce a direct `.apk` installer file, not an Android App Bundle (`.aab`). Accept the guided setup, then download the APK from the EAS build link after the cloud build completes. Install it on your Android device.

## Notes

- Package ID: `com.workspacec26.mobile`
- Build profile `preview` is configured to output an APK.
- The backend and database are separate services; installing the APK does not deploy them.
- The quick-profile buttons are demo credentials and should be removed or disabled before production release if they are not intended for real users.
