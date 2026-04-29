// Evolrace - Puppeteer screenshot & video generator
// Делает скриншоты игры для Google Play Store в разных размерах:
//   - Phone (1920x1080 landscape)
//   - 7-inch tablet (1024x600 landscape)
//   - 10-inch tablet (1920x1200 landscape)
//
// + Записывает видео геймплея 30 секунд (для Promo video в Play Store)
//
// Запуск:
//   1. cd evolrace-package
//   2. npm install --save-dev puppeteer puppeteer-screen-recorder
//   3. node screenshots.js
//
// Скриншоты будут в папке ./screenshots/
// Видео будет в ./screenshots/video/gameplay.mp4

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Определяем environment - режим запуска
const args = process.argv.slice(2);
const SKIP_VIDEO = args.includes('--no-video');
const SKIP_TABLETS = args.includes('--phone-only');

const HTML_FILE = path.resolve(__dirname, 'index.html');
const OUTPUT_DIR = path.resolve(__dirname, 'screenshots');

// Создаём папку для скриншотов
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const ALL_DEVICES = [
  { name: 'phone',     width: 1920, height: 1080 }, // 16:9 phone landscape
  { name: 'tablet-7',  width: 1024, height: 600  }, // 7-inch tablet
  { name: 'tablet-10', width: 1920, height: 1200 }  // 10-inch tablet (16:10)
];
const DEVICES = SKIP_TABLETS ? [ALL_DEVICES[0]] : ALL_DEVICES;

// Вспомогательная функция: ввод строки символ за символом (для cheat кодов)
// Используем dispatchEvent напрямую - надёжнее чем page.keyboard.press для headless mode
async function typeChars(page, str) {
  for (const ch of str) {
    await page.evaluate((c) => {
      const event = new KeyboardEvent('keydown', {
        key: c,
        code: 'Key' + c.toUpperCase(),
        keyCode: c.charCodeAt(0),
        which: c.charCodeAt(0),
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
    }, ch);
    await sleep(80); // даём event handler время отработать
  }
  // После cheat-кода даём время на startGame() и переход в RUN
  await sleep(500);
}

// Альтернативная функция - запускаем cheat-код через прямой вызов внутренней логики
// Это использовать если typeChars не работает (например WebView фильтрует synthetic events)
async function applyCheat(page, levelNum) {
  // Прямо устанавливаем состояние через _evolrace API + dispatchEvent
  const padded = String(levelNum).padStart(2, '0');
  await typeChars(page, 'itted' + padded);
}

// Вспомогательная: тап на canvas для старта игры
async function tapCanvas(page) {
  try {
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      ['mousedown', 'mouseup'].forEach(type => {
        canvas.dispatchEvent(new MouseEvent(type, {
          bubbles: true, cancelable: true,
          clientX: rect.width / 2, clientY: rect.height / 2,
          button: 0
        }));
      });
    });
  } catch (e) {
    await page.click('canvas').catch(() => {});
  }
}

// Применяет cheat-код напрямую через _evolrace.applyCheat
// + skipIntro = true: сразу переходит в RUN минуя INTRO (RAF throttled в headless)
// + Диагностика - возвращает state до и после
async function applyCheatLevel(page, levelNum) {
  const result = await page.evaluate((n) => {
    if (!window._evolrace) {
      return { ok: false, error: 'window._evolrace not exposed' };
    }
    if (!window._evolrace.applyCheat) {
      return { ok: false, error: 'applyCheat function missing - update index.html', stateBefore: window._evolrace.getState() };
    }
    const stateBefore = window._evolrace.getState();
    // Передаём skipIntro=true чтобы сразу был state=RUN (не INTRO)
    const ok = window._evolrace.applyCheat(n, true);
    const stateAfter = window._evolrace.getState();
    return { ok: ok, stateBefore, stateAfter };
  }, levelNum);

  console.log(`    applyCheat(${levelNum}) result:`, JSON.stringify(result));

  if (!result.ok) {
    throw new Error(`applyCheat(${levelNum}) failed: ${result.error || 'returned false'}`);
  }
  await sleep(500);

  const finalState = await page.evaluate(() => window._evolrace.getState());
  console.log(`    finalState after sleep: ${finalState} (expected 2 for RUN)`);

  return finalState;
}

// Ждёт N миллисекунд игрового времени через _evolrace.tickFrames
// (надёжно работает даже когда RAF throttled в headless Chrome)
// 7 секунд = 7 * 60 = 420 кадров (60 fps target)
async function waitGameFrames(page, durationMs) {
  const targetFrames = Math.round(durationMs * 60 / 1000); // 60 fps

  // Принудительно тикаем кадры через экспортированную функцию игры
  const result = await page.evaluate((nFrames) => {
    if (window._evolrace && window._evolrace.tickFrames) {
      const fcBefore = window._evolrace.getFrameCount();
      const ticked = window._evolrace.tickFrames(nFrames);
      const fcAfter = window._evolrace.getFrameCount();
      return { ok: true, ticked, fcBefore, fcAfter };
    }
    return { ok: false, error: 'tickFrames not available' };
  }, targetFrames);

  console.log(`    waitGameFrames(${durationMs}ms = ${targetFrames} frames):`, JSON.stringify(result));

  if (!result.ok) {
    // Fallback - просто sleep если функция недоступна
    await sleep(durationMs);
  } else {
    // Даём 100мс на render() финального состояния
    await sleep(100);
  }
}

// Сценарии скриншотов
const SCENARIOS = [
  {
    name: '01-ready',
    description: 'READY screen with title and characters',
    setup: async (page) => {
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState && window._evolrace.getState() === 0,
        { timeout: 15000 }
      );
      await sleep(1500);
    }
  },
  {
    name: '02-itted01-boss',
    description: 'Level 1 with boss (itted01 + 7 sec)',
    setup: async (page) => {
      await page.reload();
      await sleep(5500);
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 0,
        { timeout: 15000 }
      );
      await applyCheatLevel(page, 1);
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 2,
        { timeout: 20000 }
      );
      await waitGameFrames(page, 7000);
    }
  },
  {
    name: '03-itted02',
    description: 'Level 2 (itted02 + 7 sec)',
    setup: async (page) => {
      await page.reload();
      await sleep(5500);
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 0,
        { timeout: 15000 }
      );
      await applyCheatLevel(page, 2);
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 2,
        { timeout: 20000 }
      );
      await waitGameFrames(page, 7000);
    }
  },
  {
    name: '04-itted03-boss',
    description: 'Level 3 with boss (itted03 + 7 sec)',
    setup: async (page) => {
      await page.reload();
      await sleep(5500);
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 0,
        { timeout: 15000 }
      );
      await applyCheatLevel(page, 3);
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 2,
        { timeout: 20000 }
      );
      await waitGameFrames(page, 7000);
    }
  },
  {
    name: '05-game-over',
    description: 'Game over screen with score',
    setup: async (page) => {
      // Reload + applyCheat(2) + forceGameOver - моментальный game over
      // (раньше ждали до 60 сек смерти от препятствий - слишком долго для CI)
      await page.reload();
      await sleep(5500);
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 0,
        { timeout: 15000 }
      );
      await applyCheatLevel(page, 2);
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 2,
        { timeout: 20000 }
      );
      // Даём 1.5 сек побегать чтобы score набрался
      await sleep(1500);
      // Принудительно в OVER через forceGameOver
      await page.evaluate(() => {
        if (window._evolrace && window._evolrace.forceGameOver) {
          window._evolrace.forceGameOver();
        }
      });
      await sleep(1500);
    }
  }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshots(device) {
  console.log(`\n=== Device: ${device.name} (${device.width}x${device.height}) ===`);
  const deviceDir = path.join(OUTPUT_DIR, device.name);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: {
      width: device.width,
      height: device.height,
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      isLandscape: true
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-features=IsolateOrigins,site-per-process',
      // Отключаем throttling background tabs/headless mode
      '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });

  const page = await browser.newPage();
  await page.goto(`file://${HTML_FILE}`);

  // Ждём пока splash пройдёт (5 секунд)
  console.log('Waiting for splash to finish...');
  await sleep(5500);

  for (const scenario of SCENARIOS) {
    try {
      console.log(`  ${scenario.name}: ${scenario.description}`);
      await scenario.setup(page);
      const screenshotPath = path.join(deviceDir, `${scenario.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        omitBackground: false
      });
      console.log(`    -> saved ${screenshotPath}`);
    } catch (e) {
      console.warn(`    !! Error in scenario ${scenario.name}:`, e.message);
    }
  }

  await browser.close();
}

async function recordVideo(device) {
  console.log(`\n=== Recording gameplay video for ${device.name} (${device.width}x${device.height}) ===`);
  const videoDir = path.join(OUTPUT_DIR, device.name, 'video');
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  let PuppeteerScreenRecorder;
  try {
    PuppeteerScreenRecorder = require('puppeteer-screen-recorder').PuppeteerScreenRecorder;
  } catch (e) {
    console.warn('  puppeteer-screen-recorder not installed - skipping video');
    console.warn('  install with: npm install --save-dev puppeteer-screen-recorder');
    return;
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: {
      width: device.width, height: device.height,
      isMobile: true, hasTouch: true, isLandscape: true,
      deviceScaleFactor: 1
    },
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });

  const page = await browser.newPage();
  await page.goto(`file://${HTML_FILE}`);
  await sleep(5500); // splash

  await page.waitForFunction(
    () => window._evolrace && window._evolrace.getState && window._evolrace.getState() === 0,
    { timeout: 15000 }
  );

  // Cheat itted05 - сразу на интересную стадию (5й уровень)
  await applyCheatLevel(page, 5);
  await page.waitForFunction(
    () => window._evolrace && window._evolrace.getState() === 2,
    { timeout: 20000 }
  );

  console.log('  Recording 30 seconds of gameplay...');
  const recorder = new PuppeteerScreenRecorder(page, {
    fps: 60,  // 60 FPS видео - совпадает с частотой игровой логики
    videoFrame: { width: device.width, height: device.height },
    aspectRatio: `${device.width}:${device.height}`,
    videoCodec: 'libx264',
    videoBitrate: 5000  // 5 Mbps - выше для 60fps хорошего качества
  });

  const videoPath = path.join(videoDir, 'gameplay.mp4');
  await recorder.start(videoPath);

  // Принудительно тикаем игровые кадры пока recorder пишет
  // (в headless RAF throttled - без этого видео будет статичным)
  // Целевая частота: 60 game ticks/sec (совпадает с recorder fps)
  // tick interval = 16ms (~60 FPS), 1 game frame на каждый tick
  const recordDuration = 30000;
  const tickIntervalMs = 16;  // ~60 ticks/sec
  const framesPerTick = 1;
  const startTime = Date.now();
  let frameCounter = 0;
  let lastTapAt = startTime;
  let nextTapDelay = 1500 + Math.random() * 1500;

  while (Date.now() - startTime < recordDuration) {
    // Тикаем 3 кадра игры + рендерим
    await page.evaluate((nFrames) => {
      if (window._evolrace && window._evolrace.tickFrames) {
        window._evolrace.tickFrames(nFrames);
      }
    }, framesPerTick).catch(() => {});

    // Случайный тап для прыжка
    const now = Date.now();
    if (now - lastTapAt >= nextTapDelay) {
      await tapCanvas(page).catch(() => {});
      lastTapAt = now;
      nextTapDelay = 1500 + Math.random() * 1500;
    }

    await sleep(tickIntervalMs);
    frameCounter++;
  }
  console.log(`  Total ticks: ${frameCounter} (~${(frameCounter * framesPerTick / 30).toFixed(1)} sec game time)`);

  await recorder.stop();
  await browser.close();
  console.log(`  -> saved ${videoPath}`);
}

async function main() {
  console.log('=== Evolrace Screenshot & Video Generator ===');
  console.log(`HTML file: ${HTML_FILE}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Skip video: ${SKIP_VIDEO}, Skip tablets: ${SKIP_TABLETS}`);

  if (!fs.existsSync(HTML_FILE)) {
    console.error(`ERROR: HTML file not found: ${HTML_FILE}`);
    process.exit(1);
  }

  for (const device of DEVICES) {
    try {
      await takeScreenshots(device);
    } catch (e) {
      console.error(`Error with device ${device.name}:`, e.message);
    }
  }

  if (!SKIP_VIDEO) {
    for (const device of DEVICES) {
      try {
        await recordVideo(device);
      } catch (e) {
        console.error(`Error recording video for ${device.name}:`, e.message);
      }
    }
  }

  console.log('\n=== Done! ===');
  console.log(`Screenshots in: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

