# Evolrace - Capacitor + AdMob

Pixel-art rhythm runner упакованный как нативное Android приложение через Capacitor framework.

## Что в пакете

| Файл | Назначение |
|------|------------|
| `index.html` | Игра (включая интеграцию с AdMob через Capacitor) |
| `sw.js` | Service Worker для PWA |
| `manifest.webmanifest` | Web App Manifest |
| `icon-*.png` | Иконки приложения |
| `screenshot-1280x720.png` | Скриншот для Play Store |
| `package.json` | npm зависимости (Capacitor + AdMob plugin) |
| `capacitor.config.json` | Конфигурация Capacitor |
| `build-www.js` | Скрипт подготовки web-контента |
| `.github/workflows/build-capacitor-apk.yml` | CI workflow для сборки APK |
| `MONETIZATION_GUIDE.md` | Полная инструкция по монетизации |

## Структура

```
evolrace-package/
├── index.html            # Игра + AdMob интеграция
├── sw.js                 # Service Worker
├── manifest.webmanifest  # PWA manifest
├── icon-*.png            # Иконки
├── package.json          # npm зависимости
├── capacitor.config.json # Capacitor конфиг
├── build-www.js          # Build script
└── .github/
    └── workflows/
        └── build-capacitor-apk.yml  # CI workflow
```

## Quick Start

### 1. Загрузите все файлы в GitHub репозиторий
   `tie-channel/evolrace` (или ваш аналогичный)

### 2. GitHub Actions автоматически запустится
- Установит Node.js, Java 17, Android SDK
- Скачает Capacitor + AdMob plugin
- Соберёт Android проект через `npx cap add android`
- Соберёт APK + AAB через Gradle
- Загрузит как артефакты

### 3. Скачайте APK артефакт
- Откройте Actions → выберите успешный run
- Внизу страницы артефакт `evolrace-apk-capacitor.zip`
- Распакуйте → `*.apk` → перенесите на Android → установите

## Default состояние

При первом запуске используется **тестовый AdMob** (Google публичные test IDs):
- Реклама показывается, но это **тестовые объявления** с пометкой "TEST AD"
- Реальные деньги не зарабатываются

Для реального дохода см. `MONETIZATION_GUIDE.md` - регистрация в AdMob и
замена тестовых ID на ваши.

## Что отличается от TWA версии

| Аспект | TWA (предыдущая) | Capacitor (эта) |
|--------|------------------|-----------------|
| Размер APK | ~3 MB | ~10-15 MB |
| Нужен интернет | Да | **Нет (offline)** |
| Реклама | AdSense (web) | **AdMob (нативная)** |
| Доход на показ | $0.5-2 eCPM | $5-15 eCPM (interstitial) |
| Обновление | Push в GitHub Pages | Загрузка нового AAB |

Преимущества Capacitor:
- Легальная реклама AdMob (AdSense в TWA нарушает правила)
- Работает без интернета
- Доход в 5-10 раз выше
- Можно добавить нативные функции (push, sensors)

Недостатки:
- Обновления требуют новый AAB и review в Play Store
- APK больше по размеру

## Дальнейшие шаги

См. `MONETIZATION_GUIDE.md`:

1. ✅ Собрать APK с тестовой рекламой (текущее состояние)
2. ✅ Опубликовать в Google Play Internal Testing
3. ✅ Зарегистрироваться в AdMob, создать Ad units
4. ✅ Заменить тестовые ID на реальные
5. ✅ Production keystore + GitHub Secrets
6. ✅ Closed Testing → Production release

## Troubleshooting

### Workflow падает на "Add Android platform"

`npx cap add android` может ругаться если платформа уже добавлена. Можно
добавить в workflow проверку:

```yaml
- name: Add Android platform
  run: |
    if [ ! -d "android" ]; then
      npx cap add android
    fi
```

### APK устанавливается, но реклама не показывается

Возможные причины:
1. AdMob initialize не сработал - проверьте Logcat (`adb logcat` фильтр AdMob)
2. AdMob App ID в AndroidManifest не совпадает с конфигом
3. Тестовые объявления могут не показываться в некоторых регионах

### "Google Play Services not available"

Если устанавливаете на устройство без Google Play (например, Huawei),
AdMob не работает. Это нормально - на устройствах с GMS всё работает.

## Контакт

Если есть вопросы по сборке или монетизации - см. MONETIZATION_GUIDE.md
