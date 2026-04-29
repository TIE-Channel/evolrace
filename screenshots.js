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
async function typeChars(page, str) {
  for (const ch of str) {
    await page.keyboard.press(ch);
    await sleep(50);
  }
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
      await typeChars(page, 'itted01');
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 2,
        { timeout: 10000 }
      );
      await sleep(7000);
    }
  },
  {
    name: '03-itted02',
    description: 'Level 2 (itted02)',
    setup: async (page) => {
      await page.reload();
      await sleep(5500);
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 0,
        { timeout: 15000 }
      );
      await typeChars(page, 'itted02');
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 2,
        { timeout: 10000 }
      );
      await sleep(2500);
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
      await typeChars(page, 'itted03');
      await page.waitForFunction(
        () => window._evolrace && window._evolrace.getState() === 2,
        { timeout: 10000 }
      );
      await sleep(7000);
    }
  },
  {
    name: '05-game-over',
    description: 'Game over screen with score',
    setup: async (page) => {
      // Ждём пока герой умрёт от препятствий после itted03
      let attempts = 0;
      while (attempts < 60) {
        const state = await page.evaluate(() =>
          (window._evolrace && window._evolrace.getState) ? window._evolrace.getState() : -1
        );
        if (state === 3) break;
        await sleep(1000);
        attempts++;
      }
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
      '--disable-features=IsolateOrigins,site-per-process'
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage();
  await page.goto(`file://${HTML_FILE}`);
  await sleep(5500); // splash

  await page.waitForFunction(
    () => window._evolrace && window._evolrace.getState && window._evolrace.getState() === 0,
    { timeout: 15000 }
  );

  // Cheat itted05 - сразу на интересную стадию (5й уровень)
  await typeChars(page, 'itted05');
  await page.waitForFunction(
    () => window._evolrace && window._evolrace.getState() === 2,
    { timeout: 10000 }
  );

  console.log('  Recording 30 seconds of gameplay...');
  const recorder = new PuppeteerScreenRecorder(page, {
    fps: 30,
    videoFrame: { width: device.width, height: device.height },
    aspectRatio: `${device.width}:${device.height}`,
    videoCodec: 'libx264',
    videoBitrate: 3000  // 3 Mbps - выше для лучшего качества
  });

  const videoPath = path.join(videoDir, 'gameplay.mp4');
  await recorder.start(videoPath);

  // Симулируем тапы для прыжков (рандомно каждые 1.5-3 сек)
  const recordDuration = 30000;
  const startTime = Date.now();
  while (Date.now() - startTime < recordDuration) {
    await sleep(1500 + Math.random() * 1500);
    await tapCanvas(page).catch(() => {});
  }

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

