# Настройка In-App Purchases для Evolrace

Используется **cordova-plugin-purchase** (CdvPurchase) - стандартный плагин для Capacitor IAP.
Работает напрямую с Google Play Billing, бесплатный, без посредников.

## Шаг 1: Установить плагин (на твоём компьютере)

```bash
cd evolrace-package
npm install
npx cap sync android
```

Это:
- Установит `cordova-plugin-purchase@13.12.1` (уже в package.json)
- Скопирует нативный код в Android проект
- Настроит Capacitor compatibility layer

После этого `window.CdvPurchase` будет доступно в WebView.

## Шаг 2: Зарегистрировать продукт в Google Play Console

1. Открой https://play.google.com/console
2. Выбери приложение Evolrace
3. **Monetize → Products → In-app products → Create product**

Параметры:
- **Product ID**: `remove_ads` (точно так - совпадает с кодом)
- **Product type**: **Managed product** (не consumable - покупается один раз)
- **Name**: Remove Ads
- **Description**: Remove all advertisements from the game
- **Default price**: 1.99 USD (или эквивалент)

После создания нажми **Activate**.

## Шаг 3: Настроить License Tester (чтобы НЕ списывались деньги)

1. Play Console → **Setup → License testing**
2. Add testers - добавь Gmail который установлен на твоём телефоне
3. License response: **RESPOND_NORMALLY**

Без этого настоящие $1.99 будут списываться при тесте!

## Шаг 4: Загрузить APK в Internal Testing

1. Play Console → **Testing → Internal testing**
2. **Create new release**
3. Загрузи `.aab` (Android App Bundle, не .apk)
4. **Add testers** - своя группа с твоим email
5. **Review and rollout**
6. Получи **Opt-in URL** (ссылка вида `https://play.google.com/apps/internaltest/...`)

## Шаг 5: Установить через Internal Testing

1. На телефоне открой Opt-in URL (с того Gmail который License Tester)
2. **Become a tester** → **Download from Play Store**
3. Установи приложение через Play Store

**Важно**: покупки работают **ТОЛЬКО когда приложение установлено через Play Store** (Internal Testing засчитывается). При sideload через ADB кнопка покупки фейлится.

## Шаг 6: Тестировать

1. Запусти Evolrace
2. Нажми **Remove Ads $1.99**
3. Откроется настоящий Google Play dialog с надписью "[Test card]" вместо реальной карты
4. Подтверди покупку
5. Списания НЕ произойдёт (License Tester)
6. Activates `adsRemoved=true`:
   - Banner пропадает
   - Frame скрывается
   - Кнопка пропадает
   - Offline overlay больше не показывается

## Шаг 7: Тест восстановления покупки

1. Удали приложение
2. Установи заново через Play Store
3. Запусти - покупка должна **автоматически восстановиться** через `store.restorePurchases()`

## Шаг 8: Production release

После успешного Internal Testing:
1. **Closed Testing** (минимум 14 дней + 12 тестеров)
2. **Production release** + App review (1-7 дней)
3. Реальные пользователи могут покупать

## Troubleshooting

### "Product not available"
- Продукт не активирован в Play Console
- Прошло меньше 4 часов после создания (Google индексирует)
- Приложение не установлено через Play Store
- Аккаунт не License Tester (или другой регион где не доступно)

### "Purchase failed"
- Проверь что Application ID в `capacitor.config.json` совпадает с Play Console
- Проверь что версия APK подписана тем же ключом что и в Play Console
- Проверь интернет

### Покупка зависает
- В России Google Play Billing **может не работать** для test покупок
- Попробуй с VPN или другого аккаунта

### DEBUG bypass для UI теста (без реального плагина)
Long press на кнопку Remove Ads (3 секунды) активирует тестовое состояние ads removed.
Это не настоящая покупка, но даёт проверить UI флоу.
