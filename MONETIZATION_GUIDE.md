# Полная инструкция: Capacitor + AdMob монетизация Evolrace

В пакете уже встроена интеграция **AdMob** (нативная мобильная реклама от Google)
через Capacitor framework. Когда пользователь установит APK из Play Store,
он увидит:

- **Banner рекламу 320x50** внизу экрана на READY/OVER экранах
- **Полноэкранную рекламу (interstitial)** после каждой 3-й смерти
- **Кнопку "Remove Ads $1.99"** для отключения рекламы

## Часть 1: Тестовый билд (без своего AdMob)

При первом запуске CI workflow используется **тестовый AdMob App ID** от Google:
`ca-app-pub-3940256099942544~3347511713`. Это публичный ID Google для тестирования
- показывается фейковая реклама с пометкой "TEST AD".

Это позволяет:
- Собрать APK прямо сейчас, без регистрации в AdMob
- Проверить что игра работает на Android
- Убедиться что реклама показывается правильно

**Важно**: с тестовым ID нельзя зарабатывать. Для реальных денег нужен свой AdMob.

## Часть 2: Регистрация в AdMob и получение реальных ID

### 2.1. Создание AdMob аккаунта

1. Откройте https://apps.admob.com/
2. Войдите тем же Google аккаунтом что Play Console
3. Согласитесь с правилами и заполните payment info
4. Привязка к Play Console происходит автоматически если используете один аккаунт

### 2.2. Создание AdMob app

После того как ваш APK загружен в Play Store (хотя бы Internal Testing):

1. AdMob Console → **Apps** → **Add App**
2. Platform: **Android**
3. **App available in app store**: Yes (если уже опубликовано) или No (для теста)
4. Если Yes - найдите ваше приложение по package ID `io.github.tiechannel.evolrace`
5. Получите **AdMob App ID** вида `ca-app-pub-1234567890123456~9876543210`

### 2.3. Создание Ad Units

В AdMob Console → ваше app → **Ad units** → **Add ad unit**:

**Banner ad unit**:
- Format: **Banner**
- Name: `Evolrace Bottom Banner`
- Получите **Ad unit ID** вида `ca-app-pub-1234567890123456/1111111111`

**Interstitial ad unit**:
- Format: **Interstitial**
- Name: `Evolrace Game Over Interstitial`
- Получите второй Ad unit ID вида `ca-app-pub-1234567890123456/2222222222`

### 2.4. Замена тестовых ID на реальные

В файле `index.html` найдите блок настроек (примерно в начале скрипта монетизации):

```javascript
const IS_TEST_MODE = true; // ставьте false когда будут реальные ID

const AD_IDS = IS_TEST_MODE ? {
  banner: 'ca-app-pub-3940256099942544/6300978111',       // Google test
  interstitial: 'ca-app-pub-3940256099942544/1033173712'  // Google test
} : {
  banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',       // ВАШ ID
  interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'  // ВАШ ID
};
```

**Замените**:
1. `IS_TEST_MODE = true` на `IS_TEST_MODE = false`
2. Два `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY` на ваши реальные Banner и Interstitial Ad unit IDs

В файле `.github/workflows/build-capacitor-apk.yml` найдите:

```bash
ADMOB_APP_ID="ca-app-pub-3940256099942544~3347511713"
```

Замените на ваш AdMob **App ID** (с тильдой `~`, не косой чертой `/`).

В файле `capacitor.config.json` найдите:

```json
"AdMob": {
  "appId": "ca-app-pub-3940256099942544~3347511713"
}
```

Замените на ваш AdMob App ID.

### 2.5. Commit и push

После замены - commit в репо, GitHub Actions соберёт APK с реальными ID,
реклама начнёт показывать настоящие объявления и приносить деньги.

## Часть 3: Доход от AdMob

### Как Google платит

- **eCPM (effective cost per mille)** - средний доход на 1000 показов
- Banner: $0.5 - $2 eCPM
- Interstitial: $5 - $15 eCPM
- Зависит от: страны игроков, тематики игры, времени года

### Минимальный порог выплат

- **$100** - минимум для перевода на банковский счёт
- Выплаты раз в месяц (~21-26 число)
- Деньги приходят на тот же payments profile что Play Store

### Реалистичные ожидания

Для casual игры с **1000 DAU**:
- 5 показов banner на пользователя/день = 5000 показов = ~$5/день
- 1 interstitial на пользователя/день = 1000 показов = ~$10/день
- **~$450 в месяц при 1000 DAU**

Чтобы достичь 1000 DAU нужны установки и retention - см. секцию "Маркетинг".

## Часть 4: In-App Purchases для "Remove Ads"

В текущем коде кнопка "Remove Ads $1.99" есть, но **IAP пока не работает** без
дополнительной настройки. Есть два пути:

### Путь A: RevenueCat (рекомендую)

RevenueCat - сервис для управления in-app purchases. Бесплатный до $10K MTR.

1. Зарегистрируйтесь на https://www.revenuecat.com/
2. Создайте проект "Evolrace"
3. Установите Capacitor плагин:
   ```
   npm install @revenuecat/purchases-capacitor
   ```
4. Я добавлю код интеграции - дайте знать когда зарегистрируетесь

### Путь B: Native Capacitor Google Play Billing

Сложнее, но без зависимости от RevenueCat. Используется плагин
`@squareetlabs/capacitor-google-play` или подобный.

Для production я рекомендую RevenueCat - проще, надёжнее, есть analytics
покупок встроено.

Сейчас в текущем APK кнопка Remove Ads показывает alert "Coming soon"
(плагин IAP не подключён). Если хотите включить - дайте знать.

## Часть 5: Публикация в Google Play Store

### 5.1. Production keystore

⚠️ КРИТИЧНО: текущий workflow генерирует одноразовый keystore. Каждый билд
имеет **разный** SHA-256 fingerprint. Для production нужен **постоянный** keystore.

#### Генерация production keystore

На любой машине с Java:

```bash
keytool -genkeypair \
  -dname "cn=Kateryna Kondrashova, ou=Apps, o=TieChannel, c=DE" \
  -alias evolrace-prod \
  -keypass "ВАШ_СИЛЬНЫЙ_ПАРОЛЬ_КЛЮЧА" \
  -keystore evolrace-production.keystore \
  -storepass "ВАШ_СИЛЬНЫЙ_ПАРОЛЬ_КИСТОРА" \
  -validity 36500 \
  -keyalg RSA -keysize 2048
```

⚠️ **Сохраните keystore файл и пароли в нескольких местах** (флешка, облако,
менеджер паролей). Если потеряете - **не сможете обновлять приложение
в Play Store никогда**.

#### Загрузка в GitHub Secrets

1. Закодируйте keystore в base64:
   ```
   base64 -w 0 evolrace-production.keystore > keystore.b64
   ```

2. В репо: **Settings > Secrets and variables > Actions** → создайте 4 secrets:
   - `KEYSTORE_BASE64` - содержимое keystore.b64
   - `KEYSTORE_PASSWORD` - пароль keystore
   - `KEY_ALIAS` - `evolrace-prod`
   - `KEY_PASSWORD` - пароль ключа

3. Обновите `.github/workflows/build-capacitor-apk.yml` шаг "Generate signing keystore" на:

```yaml
- name: Decode signing keystore
  run: |
    echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/evolrace.keystore
```

И в "Build APK" шаге замените:
- `-Pandroid.injected.signing.store.password=android` на `${{ secrets.KEYSTORE_PASSWORD }}`
- `-Pandroid.injected.signing.key.alias=evolrace` на `${{ secrets.KEY_ALIAS }}`
- `-Pandroid.injected.signing.key.password=android` на `${{ secrets.KEY_PASSWORD }}`

После этого каждый билд подписывается **тем же ключом**.

### 5.2. Загрузка в Play Console

1. https://play.google.com/console/ → создайте app "Evolrace"
2. Заполните Store Listing:
   - Название, описание
   - Screenshots (минимум 2)
   - Feature graphic 1024x500
   - Privacy policy URL
3. **Testing > Internal testing > Create new release**
4. Загрузите AAB из артефактов GitHub Actions (`evolrace-aab-capacitor.zip` → распакуйте)
5. Release notes: "Initial release"
6. Save → Review → Start rollout

### 5.3. AdMob привязка к Play Store

После публикации в любом track (Internal/Closed/Open/Production):

1. Вернитесь в AdMob
2. **Apps** → ваше app → **App settings**
3. Подтвердите что приложение в Play Store
4. Это активирует "User Metrics" и более точный таргетинг рекламы

### 5.4. Closed Testing требование (для новых аккаунтов)

Если ваш Google Play Developer аккаунт **новый** (зарегистрирован после ноября 2023):

- Нельзя сразу публиковать в Production
- Нужно провести **Closed Testing** минимум **14 дней** с минимум **12 активными тестерами**
- Создайте Closed Testing track в Play Console
- Получите opt-in URL и поделитесь с тестерами

После 14 дней + 12 тестеров - откроется кнопка "Apply for production access".

## Часть 6: Маркетинг (как набрать DAU)

Без игроков ни AdMob ни IAP не приносят денег. Стратегии:

### ASO (App Store Optimization)
- Правильные ключевые слова в названии и описании Play Store
- Привлекательная иконка и feature graphic
- Скриншоты с подписями объясняющими геймплей
- Видео-трейлер (YouTube)

### Социальные сети
- Reddit: r/AndroidGaming, r/IndieGames, r/incremental_games
- Twitter/X: gamedev hashtags
- TikTok: короткие гифки геймплея
- Discord: indie game communities

### Платная реклама
- Google Ads UAC campaigns - реклама в Play Store
- Rate $0.5-2 за установку (CPI)
- ROI положительный если retention > 30%

## Часть 7: Обновления игры

В отличие от TWA где push в GitHub Pages мгновенно обновляет игру у всех
пользователей, в Capacitor нужно:

1. Изменить `index.html` или другие файлы
2. Push в репо → GitHub Actions соберёт новый AAB
3. Загрузить новый AAB в Play Console
4. Дождаться review (1-3 дня)
5. Пользователи обновятся автоматически (если не отключили auto-update)

### Live Updates (продвинутый вариант)

Capacitor поддерживает Live Updates - обновлять только web-контент без
пересборки APK. Требуется свой сервер с HTTPS. Если интересно - дайте знать.

## Часть 8: Настройка кошелька AdMob

### Минимум для выплат
- $100 - порог выплаты
- Привязка банка - тот же payments profile что Play Store
- Tax form W-8BEN (как для Play Store)

### Когда AdMob прислуёт первые деньги
- Первый порог $10 - "verification deposit" на банк
- После подтверждения банка - регулярные выплаты

## Резюме - что делать прямо сейчас

### Шаг 1: Собрать APK с тестовой рекламой (сейчас)
1. Замените файлы в репо новым ZIP
2. GitHub Actions автоматически соберёт APK + AAB
3. Скачайте APK артефакт, установите на телефон, проверьте что реклама показывается

### Шаг 2: Опубликовать в Internal Testing (после успешного APK)
1. Зарегистрируйтесь в Google Play Developer ($25)
2. Создайте app в Play Console
3. Загрузите AAB → Internal Testing
4. Установите через Play Store на свой телефон

### Шаг 3: Зарегистрироваться в AdMob (после Internal Testing)
1. https://apps.admob.com/
2. Найдите ваше приложение по package ID
3. Создайте Banner и Interstitial ad units
4. Замените тестовые ID на реальные в коде

### Шаг 4: Production keystore + GitHub Secrets
1. Сгенерируйте production keystore
2. Загрузите в GitHub Secrets
3. Обновите workflow


### Шаг 5: Опубликовать в Production
1. Closed Testing (14 дней + 12 тестеров для новых аккаунтов)
2. Production release
3. Маркетинг → набор DAU → деньги от AdMob

Если на любом шаге будут вопросы - спрашивайте.
