Well-known assets for Rekindle universal links.

How to use:
- Copy the files from the appropriate env folder into your NextJS `public/.well-known/`.
  - prod -> https://userekindle.com/.well-known/
  - staging -> https://<staging-domain>/.well-known/
  - dev -> https://<dev-domain>/.well-known/

You must replace placeholders:
- APPLE_TEAM_ID (from Apple Developer account)
- ANDROID_SHA256_CERT (signing certificate SHA-256)

Notes:
- iOS requires the apple-app-site-association file to be served without an extension and with a valid JSON content type.
- Android requires assetlinks.json to be served at /.well-known/assetlinks.json.

Where to get Android SHA-256 cert:
- EAS builds: use the keystore used for the build (or Play App Signing if on Play Store).
- Local debug/dev: use the debug keystore fingerprint if you want dev links.

Bundle IDs / package names:
- Prod:  com.mikesolis.rekindle
- Staging: com.mikesolis.rekindle.staging
- Dev: com.mikesolis.rekindle.dev
