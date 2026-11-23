// hero-loop.html の好きな瞬間を静止画（JPEG）として書き出す。
// 使い方: node tools/media/render-stills.mjs <出力フォルダ> <幅> <高さ> <名前:秒> [<名前:秒> ...]
//   例) node tools/media/render-stills.mjs public/media 1200 800 card-basic:4 card-trial:7
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const [outDir, w, h, ...shots] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(resolve(outDir), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${pathToFileURL(join(here, 'hero-loop.html'))}?w=${w}&h=${h}&t=12`);
for (const s of shots) {
  const [name, t] = s.split(':');
  const data = await page.evaluate((t) => window.frameJpeg(t, 0.86), +t);
  writeFileSync(join(resolve(outDir), `${name}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
}
await browser.close();
console.log('done', shots.length);
