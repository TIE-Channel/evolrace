# Автоматический деплой в Google Play через GitHub Actions

После настройки каждый push в main будет автоматически загружать новый AAB
в Internal Testing трек Google Play. Тестеры получат обновление через 5-15 минут.

## Что нужно сделать ОДИН РАЗ

### Шаг 1: Загрузить ПЕРВЫЙ AAB вручную

Google Play API не разрешает первую загрузку через API - первый AAB должен быть
загружен **вручную** через Play Console.

1. Дождись успешной сборки в GitHub Actions
2. Скачай artifact `evolrace-aab-capacitor`
3. Зайди в https://play.google.com/console
4. Создай app Evolrace (если ещё не создан):
   - All apps -> Create app
   - App name: Evolrace
   - Default language: English (United States)
   - App or game: Game
   - Free or paid: Free
   - Подтверди декларации (developer policies, US export laws)
5. Заполни **App content**:
   - Privacy policy URL (нужен для production)
   - Ads: Yes (есть AdMob)
   - App access: All functionality available without restrictions
   - Content rating: пройди опросник
   - Target audience: 13+
6. **Internal testing -> Create new release**
7. Загрузи скачанный AAB
8. Add testers - email-список тестеров (минимум твой email)
9. Save -> Review release -> Rollout to Internal testing

После этого можно настраивать автодеплой.

### Шаг 2: Создать Service Account в Google Cloud

Service Account - это "робот-аккаунт" который сможет загружать AAB через API.

1. Открой https://console.cloud.google.com/
2. Выбери проект (или создай новый - "Evolrace")
3. **APIs & Services -> Library** -> найди **"Google Play Android Developer API"** -> Enable
4. **IAM & Admin -> Service Accounts -> Create Service Account**:
   - Name: `evolrace-play-deploy`
   - Description: GitHub Actions deployment to Play Store
   - Grant role: **None** (роль настроится в Play Console)
   - Done
5. Открой созданный Service Account -> **Keys -> Add key -> Create new key**
   - Type: **JSON**
   - Create -> скачается `.json` файл (хранить безопасно!)
6. Запомни email Service Account-а: `evolrace-play-deploy@PROJECT_ID.iam.gserviceaccount.com`

### Шаг 3: Дать Service Account доступ к Play Console

1. Play Console -> **Setup -> API access**
2. Если попросит - **Link Cloud project** -> выбери тот же project что в Шаг 2
3. **Service accounts -> Grant access** к `evolrace-play-deploy@...`
4. Прав:
   - Admin (all permissions)? - **No**, минимально:
     - **Releases**: View app information and download bulk reports
     - **Releases**: Manage testing track releases (releases to testing tracks)
     - **Releases**: Create, edit, and delete draft releases
     - **App access**: View app information (optional but useful)
   - Apps - выбери **Evolrace** в списке
5. **Send invite**

Подожди 5-10 минут для распространения прав.

### Шаг 4: Добавить Service Account JSON в GitHub Secrets

1. Зайди в свой GitHub репо `evolrace`
2. **Settings -> Secrets and variables -> Actions -> New repository secret**
3. Name: **`PLAY_STORE_SERVICE_ACCOUNT_JSON`** (точно так)
4. Secret: открой скачанный `.json` файл в текстовом редакторе и **скопируй ВСЁ его содержимое**
5. Add secret

## Проверка

1. Сделай любой push в main (или запусти workflow вручную)
2. Workflow build пройдёт как обычно
3. Step **"Deploy to Google Play (Internal Testing)"** должен выполниться
4. Через 5-15 минут в Play Console -> Internal testing появится новая версия

## Troubleshooting

### "The caller does not have permission"
- Service Account ещё не получил права (подожди 10-15 минут)
- В Play Console забыл выбрать Evolrace в списке apps
- Не дал минимально нужные roles

### "Version code XXX has already been used"
- Workflow использует GitHub run number как versionCode (auto-increment)
- Если этот run number уже был - запусти workflow ещё раз (run number увеличится)

### "App is not yet published"
- Первый AAB должен быть загружен вручную (см. Шаг 1)
- API нельзя использовать до первой ручной публикации

### Step пропускается
- Secret `PLAY_STORE_SERVICE_ACCOUNT_JSON` не настроен
- Проверь Settings -> Secrets, имя должно быть точное

## Workflow поведение

- При наличии secret: после билда автоматически деплой в Internal testing
- При отсутствии secret: деплой пропускается, но AAB всё равно доступен в Artifacts
- Если деплой fail: AAB всё равно доступен в Artifacts, можно загрузить вручную

## Версионирование

Workflow автоматически устанавливает:
- **versionCode**: `10 + GITHUB_RUN_NUMBER` (1-я сборка = 11, 2-я = 12, и т.д.)
- **versionName**: `1.0.X` где X = run number

Для major releases отредактируй `android/app/build.gradle` напрямую перед push.
