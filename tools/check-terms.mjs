#!/usr/bin/env node
// 公開テキストの NGワード・商標表記チェッカー（Node.js 版。追加インストール不要）
//
// 使い方:
//   node tools/check-terms.mjs            # src/（原稿・コード）と dist/（ビルド後のHTML）を検査
//   node tools/check-terms.mjs path ...   # 指定ファイル/フォルダを検査
//
// ルールの根拠は docs/brand-guideline.md。指摘が1件でもあれば終了コード 1（ビルド・CIを止める）。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_EXT = new Set(['.html', '.htm', '.md', '.mdx', '.txt', '.astro', '.ts']);
const HTML_EXT = new Set(['.html', '.htm', '.astro']);
const FOOTNOTE = '「戦略MG®」は、株式会社戦略MG研究所の登録商標です';

const NG_RULES = [
  [/マネジメントゲーム\s*[（(]?\s*MG/g, 'NG「マネジメントゲームMG」→「戦略MG」を使う'],
  [/(?<!戦略MG)マネジメントゲーム/g, 'NG「マネジメントゲーム」単独 →「戦略MGマネジメントゲーム」と書く'],
  [/戦略MG会計/g, 'NG「戦略MG会計」'],
  [/戦略会計/g, 'NG「戦略会計」（戦略会計STRACも確認が取れるまで使用不可）'],
  [/STRAC/gi, 'NG「STRAC」'],
  [/(?<!戦略)MG(?![A-Za-z])/g, '「MG」単独 →「戦略MG」と書く'],
];

// コメント・script・style・タグを除いた本文だけを検査する（クラス名等の誤検知を防ぐ）
const stripHtml = (t) =>
  t.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '');

function* walk(p) {
  if (!existsSync(p)) return;
  if (statSync(p).isDirectory()) {
    for (const name of readdirSync(p).sort()) yield* walk(join(p, name));
  } else if (TARGET_EXT.has(extname(p))) {
    yield p;
  }
}

function check(file) {
  const raw = readFileSync(file, 'utf8');
  const ext = extname(file);
  const body = HTML_EXT.has(ext) ? stripHtml(raw) : raw;
  const rel = relative(ROOT, file);
  const errors = [];
  body.split('\n').forEach((line, i) => {
    for (const [re, msg] of NG_RULES) {
      for (const _ of line.matchAll(re)) errors.push(`${rel}:${i + 1}: ${msg}  …${line.trim().slice(0, 60)}`);
    }
  });
  if ((ext === '.html' || ext === '.htm') && body.includes('戦略MG')) {
    if (!body.includes('戦略MG®')) errors.push(`${rel}: 初出に「戦略MG®」表記がない`);
    if (!body.includes(FOOTNOTE)) errors.push(`${rel}: 登録商標の注記（${FOOTNOTE}）がない`);
  }
  return errors;
}

const args = process.argv.slice(2);
const targets = args.length ? args.map((a) => resolve(a)) : [join(ROOT, 'src'), join(ROOT, 'dist')];
const errors = targets.flatMap((t) => [...walk(t)].flatMap(check));
for (const e of errors) console.log(e);
console.log(errors.length ? `\n${errors.length} 件の指摘` : 'OK: 指摘なし');
process.exit(errors.length ? 1 : 0);
