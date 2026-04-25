# Упаковка игры Evolrace в мобильные приложения

Игра написана на HTML5+Canvas, поэтому быстрее всего обернуть её через **Capacitor** в нативные приложения для Android (APK/AAB) и iOS (IPA).

## Что вам понадобится

**Для Android:**
- Node.js 18+ (https://nodejs.org)
- Java JDK 17 (https://adoptium.net)
- Android Studio (https://developer.android.com/studio) - содержит Android SDK
- Аккаунт Google Play Developer ($25 единоразово)

**Для iOS:**
- Mac с macOS
- Xcode (бесплатно из App Store)
- Аккаунт Apple Developer ($99/год)

## Шаг 1 - Подготовка проекта

```bash
mkdir evolrace-app
cd evolrace-app
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Evolrace" "com.kondrashova.evolrace" --web-dir=www
mkdir www
```

Скопируйте `index.html` в `www/index.html`.

## Шаг 2 - Конфигурация capacitor.config.json

```json
{
  "appId": "com.kondrashova.evolrace",
  "appName": "Evolrace",
  "webDir": "www",
  "server": {
    "androidScheme": "https"
  },
  "android": {
    "allowMixedContent": false,
    "captureInput": true,
    "webContentsDebuggingEnabled": false
  },
  "ios": {
    "contentInset": "always",
    "scrollEnabled": false
  }
}
```

## Шаг 3 - Сборка Android (APK)

```bash
npx cap add android
npx cap sync android
npx cap open android
```

В Android Studio:
1. Build -> Generate Signed Bundle/APK -> APK
2. Создайте keystore (хранить в безопасном месте, потерять = потерять доступ к обновлениям)
3. Build APK -> файл будет в `android/app/release/app-release.apk`

Для Google Play нужен **AAB** (Android App Bundle):
- Build -> Generate Signed Bundle/APK -> Android App Bundle

## Шаг 4 - Сборка iOS (только на Mac)

```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

В Xcode:
1. Выбрать team (ваш Apple Developer)
2. Указать Bundle Identifier совпадающий с appId
3. Product -> Archive
4. Distribute App -> App Store Connect

## Шаг 5 - Публикация

**Google Play:**
1. https://play.google.com/console
2. Create app -> загрузить AAB
3. Заполнить описание, скриншоты, иконку, политику приватности
4. Privacy Policy URL обязателен (можно сделать на GitHub Pages бесплатно)
5. Submit for review (1-3 дня)

**App Store:**
1. https://appstoreconnect.apple.com
2. My Apps -> New App
3. Upload через Xcode (Archive -> Distribute)
4. Заполнить метаданные, скриншоты
5. Submit for Review (1-7 дней)

## Альтернатива - PWABuilder (самый простой путь)

1. https://www.pwabuilder.com
2. Введите URL вашего PWA (например с GitHub Pages)
3. Сгенерирует APK и iOS-проект автоматически

## Privacy Policy

```
Privacy Policy for Evolrace

This app does not collect any personal data.
The app does not use any third-party analytics.
The app does not require internet connection.
The app stores game progress (high score) only on the device.

Contact: kondrashova@example.com
```

**Возрастной рейтинг**: игра содержит мультяшное насилие (босс-файты), скелеты, соответствует ESRB Everyone 10+ / PEGI 7.
