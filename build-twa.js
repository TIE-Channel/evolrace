/**
 * Генерирует Android TWA проект из twa-manifest.json через @bubblewrap/core API
 * без интерактивного ввода
 */
const path = require('path');
const fs = require('fs');

async function main() {
  const manifestPath = path.resolve(__dirname, 'twa-manifest.json');
  const projectDir = path.resolve(__dirname, 'android-project');

  console.log('=== TWA Build Script ===');
  console.log('Manifest path:', manifestPath);
  console.log('Project dir:', projectDir);
  console.log('Manifest exists:', fs.existsSync(manifestPath));

  if (!fs.existsSync(manifestPath)) {
    console.error('ERROR: twa-manifest.json не найден!');
    process.exit(1);
  }

  console.log('\nManifest contents:');
  console.log(fs.readFileSync(manifestPath, 'utf-8'));

  console.log('\nLoading @bubblewrap/core...');
  const core = require('@bubblewrap/core');
  console.log('@bubblewrap/core exports:', Object.keys(core));

  const { TwaGenerator, TwaManifest } = core;

  if (!TwaManifest || !TwaGenerator) {
    console.error('ERROR: TwaManifest или TwaGenerator не найдены в @bubblewrap/core');
    console.error('Доступные exports:', Object.keys(core));
    process.exit(1);
  }

  console.log('\nLoading manifest via TwaManifest.fromTwaManifestFile...');
  let twaManifest;
  try {
    twaManifest = await TwaManifest.fromTwaManifestFile(manifestPath);
    console.log('Loaded via fromTwaManifestFile OK');
  } catch (e1) {
    console.error('fromTwaManifestFile failed:', e1.message);
    console.log('Trying constructor...');
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      twaManifest = new TwaManifest(data);
      console.log('Loaded via constructor OK');
    } catch (e2) {
      console.error('Constructor failed:', e2.message);
      process.exit(1);
    }
  }

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  console.log('\nGenerating TWA project...');
  const generator = new TwaGenerator();
  await generator.createTwaProject(projectDir, twaManifest);

  // Копируем twa-manifest.json в проект
  fs.copyFileSync(manifestPath, path.join(projectDir, 'twa-manifest.json'));

  console.log('\nSUCCESS: TWA Android project generated!');
  console.log('Files in project:');
  fs.readdirSync(projectDir).forEach((f) => {
    const fp = path.join(projectDir, f);
    const stat = fs.statSync(fp);
    console.log(`  ${stat.isDirectory() ? 'D' : 'F'} ${f}`);
  });
}

main().catch((err) => {
  console.error('\n=== FATAL ERROR ===');
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});
