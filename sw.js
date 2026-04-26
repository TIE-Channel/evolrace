# Как использовать pwabuilder.com с этим пакетом

## ВАЖНО: PWA Builder не принимает ZIP файлы!

PWA Builder требует **публичный HTTPS URL** где развёрнута ваша PWA. Если вы пытаетесь
загрузить ZIP - сервис никогда не закончит загрузку.

## Правильный workflow:

### Вариант 1: GitHub Pages (бесплатно, легко)

1. Создайте новый репозиторий на github.com
2. Загрузите все файлы из этого ZIP в корень репозитория:
   - index.html
   - manifest.json
   - sw.js
   - icon-192.png, icon-512.png, icon-maskable.png
   - screenshot-1280x720.png
3. В Settings -> Pages -> Source: "Deploy from a branch", выберите main
4. Через 1-2 минуты получите URL вида `https://username.github.io/repo-name/`
5. Идите на pwabuilder.com и введите этот URL

### Вариант 2: Netlify Drop (мгновенно, без аккаунта)

1. Откройте https://app.netlify.com/drop
2. Перетащите всю распакованную папку из ZIP на эту страницу
3. Получите URL вида `https://random-name.netlify.app`
4. Введите этот URL на pwabuilder.com

### Вариант 3: Vercel

1. https://vercel.com (бесплатный аккаунт)
2. New Project -> Import folder
3. Получите URL и используйте его на pwabuilder.com

## Что делать дальше после ввода URL на PWABuilder

После ввода правильного HTTPS URL pwabuilder.com:
1. Покажет проверку Manifest, Service Worker, Security
2. Все три должны быть зелёными (валидаторы прошли)
3. Нажмите "Package for stores"
4. Выберите Android (или iOS, Windows)
5. Скачается готовый APK / iOS пакет

## Если pwabuilder.com всё равно зависает

1. Проверьте что URL открывается в браузере
2. Проверьте что URL начинается с `https://` (не `http://`)
3. Проверьте что нет 404 ошибок на ресурсы (manifest.json, sw.js, иконки)
4. Откройте DevTools -> Application -> Manifest, должен показаться ваш manifest без ошибок
5. DevTools -> Application -> Service Workers, должен быть зарегистрирован
