// tools/media/hero-loop.html を1コマずつ描いて動画にする。
// 使い方: node tools/media/render-video.mjs <出力名> <幅> <高さ> [秒数=12] [fps=24]
//   例) node tools/media/render-video.mjs public/media/hero-loop 1920 1080
// 出力: <出力名>.mp4（H.264）/ <出力名>.webm（VP9）/ <出力名>-poster.jpg（最初のコマ）
// 必要なもの: Playwright（Chromium）と ffmpeg
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const [out, w = '1920', h = '1080', sec = '12', fps = '24'] = process.argv.slice(2);
if (!out) throw new Error('出力名を指定してください');
const here = dirname(fileURLToPath(import.meta.url));
const page_url = `${pathToFileURL(join(here, 'hero-loop.html'))}?w=${w}&h=${h}&t=${sec}`;
const frames = Math.round(+sec * +fps);
const tmp = mkdtempSync(join(tmpdir(), 'frames-'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
await page.goto(page_url);
await page.evaluate(() => document.fonts.ready);
for (let i = 0; i < frames; i++) {
  const data = await page.evaluate((t) => window.frameJpeg(t, 0.92), (i / +fps));
  writeFileSync(join(tmp, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
}
await browser.close();

const outAbs = resolve(out);
mkdirSync(dirname(outAbs), { recursive: true });
const input = ['-y', '-loglevel', 'error', '-framerate', fps, '-i', join(tmp, 'f%04d.jpg')];
execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', `${outAbs}.mp4`]);
execFileSync('ffmpeg', [...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-row-mt', '1', '-an', `${outAbs}.webm`]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(tmp, 'f0000.jpg'), '-q:v', '4', `${outAbs}-poster.jpg`]);
rmSync(tmp, { recursive: true, force: true });
console.log('done', outAbs, frames, 'frames');
