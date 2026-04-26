name: Build Android APK

on:
  push:
    branches: [main]
    paths:
      - 'manifest.webmanifest'
      - 'index.html'
      - 'sw.js'
      - 'icon-*.png'
      - '.github/workflows/build-apk.yml'
      - 'twa-manifest.json'
      - 'build-twa.js'
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
        with:
          packages: 'platforms;android-34 build-tools;34.0.0'

      - name: Install Bubblewrap Core
        run: npm install @bubblewrap/core@latest

      - name: Wait for GitHub Pages to deploy
        run: sleep 30

      - name: Generate TWA Android Project
        run: node build-twa.js

      - name: Generate signing keystore
        run: |
          keytool -genkeypair \
            -dname "cn=Evolrace, ou=Apps, o=TieChannel, c=US" \
            -alias evolrace \
            -keypass android \
            -keystore android-project/android.keystore \
            -storepass android \
            -validity 20000 \
            -keyalg RSA \
            -keysize 2048

      - name: Print signing key SHA-256 fingerprint
        run: |
          echo "Add this fingerprint to /.well-known/assetlinks.json:"
          keytool -list -v \
            -keystore android-project/android.keystore \
            -alias evolrace \
            -storepass android \
            -keypass android | grep -E "SHA256:"

      - name: Build APK with Gradle
        working-directory: android-project
        run: |
          chmod +x gradlew
          ./gradlew bundleRelease assembleRelease \
            -Pandroid.injected.signing.store.file=$(pwd)/android.keystore \
            -Pandroid.injected.signing.store.password=android \
            -Pandroid.injected.signing.key.alias=evolrace \
            -Pandroid.injected.signing.key.password=android

      - name: Find generated APK and AAB
        id: find_apk
        run: |
          APK_PATH=$(find android-project -name "*.apk" -type f | head -1)
          AAB_PATH=$(find android-project -name "*.aab" -type f | head -1)
          echo "APK: $APK_PATH"
          echo "AAB: $AAB_PATH"
          echo "apk_path=$APK_PATH" >> $GITHUB_OUTPUT
          echo "aab_path=$AAB_PATH" >> $GITHUB_OUTPUT

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: evolrace-apk
          path: ${{ steps.find_apk.outputs.apk_path }}
          if-no-files-found: error

      - name: Upload AAB artifact (for Google Play)
        uses: actions/upload-artifact@v4
        with:
          name: evolrace-aab
          path: ${{ steps.find_apk.outputs.aab_path }}
          if-no-files-found: warn

      - name: Create assetlinks.json template
        run: |
          FINGERPRINT=$(keytool -list -v \
            -keystore android-project/android.keystore \
            -alias evolrace \
            -storepass android \
            -keypass android | grep -E "SHA256:" | head -1 | awk '{print $2}')

          cat > assetlinks.json << ASSETLINK
          [{
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
              "namespace": "android_app",
              "package_name": "io.github.tiechannel.evolrace",
              "sha256_cert_fingerprints": ["$FINGERPRINT"]
            }
          }]
          ASSETLINK
          cat assetlinks.json

      - name: Upload assetlinks.json
        uses: actions/upload-artifact@v4
        with:
          name: assetlinks-json
          path: assetlinks.json
