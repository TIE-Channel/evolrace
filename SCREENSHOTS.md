# Скриншоты и видео для Google Play Store

Автоматическая генерация скриншотов и promo видео через Puppeteer.

## Способ 1: GitHub Actions (рекомендую)

Самый простой - не нужно ничего ставить локально.

1. Push в main (если изменился `index.html` или `screenshots.js`)
2. Или ручной запуск: GitHub -> Actions -> Generate Screenshots and Video -> Run workflow
3. Дождись завершения (~10 минут)
4. Скачай артефакты:
   - **`evolrace-screenshots`** - все скриншоты (zip)
   - **`evolrace-gameplay-video`** - mp4 видео

## Способ 2: Локально

### Установка

```
cd evolrace-package
npm install --save-dev puppeteer puppeteer-screen-recorder
# На Linux также нужен ffmpeg для видео
sudo apt-get install ffmpeg     # Ubuntu/Debian
brew install ffmpeg             # macOS
```

### Запуск

```
node screenshots.js                    # Полный запуск (screenshots + video)
node screenshots.js --no-video         # Только скриншоты
node screenshots.js --phone-only       # Только phone размер
```

Время выполнения:
- Полный режим: 5-10 минут
- Только скриншоты: 3-5 минут
- Phone-only: 1-2 минуты

## Что получишь

### Скриншоты

7 сценариев x 3 размера устройств = **21 скриншот**

```
screenshots/
  phone/         1920x1080 - Phone landscape
  tablet-7/      1024x600 - 7-inch tablet
  tablet-10/     1920x1200 - 10-inch tablet
  video/
    gameplay.mp4 30 sec видео 1280x720
```

В каждой папке устройства 7 файлов:
- `01-ready.png` - READY экран
- `02-running-early.png` - Начало игры
- `03-running-mid.png` - Активный геймплей
- `04-evolution-cyborg.png` - После эволюции на cyborg
- `05-boss-early.png` - Boss fight (уровень 3)
- `06-boss-late.png` - Boss fight (уровень 15)
- `07-game-over.png` - Game Over экран

### Видео

30-секундный mp4 1280x720 (HD). Можно использовать для:
- **Promo video** в Play Store (требуется YouTube ссылка)
- Reddit/Twitter/Discord posts
- Trailer для других платформ

## Что загружать в Play Console

В Play Console -> Store presence -> Main store listing -> Graphics:

### Phone screenshots (обязательно, минимум 2, максимум 8)

Из `screenshots/phone/` рекомендую загрузить:
1. `01-ready.png` - визитная карточка
2. `02-running-early.png` - геймплей
3. `05-boss-early.png` - boss fight (зацепляет внимание!)
4. `04-evolution-cyborg.png` - показывает эволюцию
5. `06-boss-late.png` - продвинутый boss
6. `07-game-over.png` - score reveal

### Tablet screenshots (опционально)

Не обязательно если нет планшетной поддержки. Если есть - 2-8 из соответствующей папки.

### Promo video

1. Залей `video/gameplay.mp4` на YouTube как **Unlisted**
2. В Play Console: Store listing -> Promo video -> вставь YouTube URL

## Сценарии (что делает скрипт)

| Сценарий | Действия |
|----------|----------|
| 01-ready | Загружает игру, ждёт READY экран |
| 02-running-early | Тапает чтобы стартовать, ждёт 2.5 сек |
| 03-running-mid | Продолжает геймплей ещё 8 сек |
| 04-evolution-cyborg | Reload + cheat `itted17` (cyborg уровень) |
| 05-boss-early | Reload + cheat `itted03` + ждёт 7 сек (босс) |
| 06-boss-late | Reload + cheat `itted15` + ждёт 7 сек |
| 07-game-over | Ждёт пока умрёт (до 60 сек) |

## Если что-то не работает

### "Cannot find module 'puppeteer'"
Запусти `npm install --save-dev puppeteer puppeteer-screen-recorder`

### Скриншоты пустые/чёрные
- Splash overlay не успел закрыться - увеличь sleep после `page.goto()`
- Canvas не успел отрендериться - увеличь sleep в setup сценария

### Boss скриншоты без босса
- Босс спавнится через 5 сек после cheat
- Если у тебя медленный CI - увеличь sleep до 9-10 сек в boss сценариях

### Game over сценарий не сработал
В Evolrace игрок может долго не умирать. Если 60 сек мало - увеличь `attempts < 60` до `attempts < 120`.

### Видео получилось без звука
Это нормально - puppeteer-screen-recorder не записывает audio. Для звука:
- Использовать OBS Studio для записи
- Добавить background music через ffmpeg post-processing

### Видео в плохом качестве
В `screenshots.js` функция `recordVideo()`:
- `videoBitrate: 2000` (2 Mbps) - можно увеличить до 4000-5000
- `videoFrame: 1280x720` - можно поднять до 1920x1080

## Альтернатива - реальные скриншоты

Если хочешь натуральные скриншоты с реального устройства:

1. Установи APK через Internal Testing
2. Запусти игру в landscape
3. Power + Volume Down = скриншот -> в Photos
4. На планшете аналогично

Реальные скриншоты часто выглядят лучше - правильное DPI, anti-aliasing, реальные системные шрифты.
