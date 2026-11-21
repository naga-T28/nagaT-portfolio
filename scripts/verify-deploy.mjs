/** Static checks on the generated deploy/ folder. Run after `npm run build`. Exits non-zero on failure. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sound } from '../src/data/site.ts';

const ROOT = resolve(fileURLToPath(new URL('../deploy/', import.meta.url)));
const SITE = 'https://naga-t.jp';
const REQUIRED = [
  'index.html',
  'about/index.html',
  'projects/index.html',
  'projects/tabisync/index.html',
  'projects/meelyze-plus/index.html',
  'projects/waripoke/index.html',
  'en/index.html',
  'en/about/index.html',
  'en/projects/index.html',
  'en/projects/tabisync/index.html',
  'en/projects/meelyze-plus/index.html',
  'en/projects/waripoke/index.html',
  'en/research/index.html',
  'en/contact/index.html',
  'research/index.html',
  'contact/index.html',
  '404.html',
  sound.src.slice(1),
  'favicon.ico',
  'favicon-64.png',
  'icon-192.png',
  'icon-header.png',
  'apple-touch-icon.png',
  'og-image.jpg',
  'robots.txt',
  'sitemap-index.xml',
  'sitemap-0.xml',
  '_astro',
];

const failures = [];
const fail = (message) => failures.push(message);

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(ROOT)) {
  console.error('deploy/ が見つかりません。先に npm run build を実行してください。');
  process.exit(1);
}

for (const path of REQUIRED) if (!existsSync(join(ROOT, path))) fail(`必須ファイルがありません: ${path}`);

const files = walk(ROOT);
for (const file of files) {
  const name = relative(ROOT, file);
  if (/\.(astro|ts|tsx|map|php)$/.test(name) || /(^|\/)(node_modules|src)\//.test(name) || name.endsWith('.DS_Store')) {
    fail(`公開すべきでないファイル: ${name}`);
  }
  if (name === '.htaccess') fail('ルートの .htaccess は同梱しない方針です(サーバー側の設定を上書きするため)');
}

function resolveLocal(fromFile, reference) {
  const clean = reference.split('#')[0].split('?')[0];
  if (!clean) return true;
  const target = clean.startsWith('/') ? join(ROOT, clean) : join(dirname(fromFile), clean);
  if (!existsSync(target)) return false;
  return statSync(target).isDirectory() ? existsSync(join(target, 'index.html')) : true;
}

const isLocal = (url) => !/^(https?:|mailto:|tel:|data:|#|\/\/)/.test(url);
const htmlFiles = files.filter((file) => extname(file) === '.html');
const titles = new Map();
const descriptions = new Map();
const pageUrls = [];

for (const file of htmlFiles) {
  const name = relative(ROOT, file);
  const html = readFileSync(file, 'utf8');
  const isNotFound = name === '404.html';
  const route = `/${name.replace(/index\.html$/, '')}`;

  const references = [
    ...html.matchAll(/\s(?:href|src)="([^"]+)"/g),
    ...[...html.matchAll(/\ssrcset="([^"]+)"/g)].flatMap((match) =>
      match[1].split(',').map((entry) => [null, entry.trim().split(/\s+/)[0]]),
    ),
  ].map((match) => match[1]);

  for (const reference of references) {
    if (isLocal(reference) && !resolveLocal(file, reference)) fail(`${name}: リンク切れ ${reference}`);
    if (isLocal(reference) && !reference.startsWith('/') && !reference.startsWith('#')) fail(`${name}: 相対パス ${reference}`);
    if (reference.startsWith('/') && !/[/#]|\.[a-z0-9]+$/i.test(reference.slice(-1)) && !/\.[a-z0-9]+([?#].*)?$/i.test(reference)) {
      fail(`${name}: 末尾スラッシュのない内部リンク ${reference}`);
    }
  }

  for (const match of html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)) {
    if (!isLocal(match[1])) fail(`${name}: 外部スクリプトを読み込んでいます ${match[1]}`);
  }
  for (const match of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
    if (!isLocal(match[1])) fail(`${name}: 外部CSSを読み込んでいます ${match[1]}`);
  }
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    // The header icon sits beside the site name (so no alt text) and is always on screen (so not lazy).
    if (match[0].includes('src="/icon-header.png"')) {
      if (!/\salt=""/.test(match[0])) fail(`${name}: ヘッダーのアイコンは装飾なのでalt=""にする`);
      continue;
    }
    if (!/\salt="[^"]+"/.test(match[0])) fail(`${name}: altのない画像`);
    if (!/\swidth="\d+"/.test(match[0]) || !/\sheight="\d+"/.test(match[0])) fail(`${name}: サイズ指定のない画像`);
    // An image marked as being on the first screen must load right away; everything else waits.
    const aboveFold = /\sdata-above-fold/.test(match[0]);
    if (aboveFold ? /loading="lazy"/.test(match[0]) : !/loading="lazy"/.test(match[0])) fail(`${name}: 画像の読み込み方が位置と合っていない`);
  }

  const isEnglish = route.startsWith('/en/');
  if (!html.includes(`<html lang="${isEnglish ? 'en' : 'ja'}"`)) fail(`${name}: lang属性が不正です`);
  if (!isNotFound) {
    const pair = isEnglish ? route.slice(3) : `/en${route}`;
    if (!existsSync(join(ROOT, pair, 'index.html'))) fail(`${name}: 別言語のページがありません (${pair})`);
    if (!html.includes(`hreflang="${isEnglish ? 'ja' : 'en'}" href="${SITE}${pair}"`)) fail(`${name}: hreflangが不正です`);
    if (!html.includes(`href="${pair}" hreflang="${isEnglish ? 'ja' : 'en'}"`)) fail(`${name}: 言語切り替えのリンク先が不正です`);
  }
  if (isEnglish) {
    for (const reference of references) {
      const page = /^\/[^.]*$/.test(reference);
      if (page && !reference.startsWith('/en/') && !html.includes(`href="${reference}" hreflang="ja"`) && !html.includes(`hreflang="ja" href="${reference}"`)) {
        fail(`${name}: 英語ページから日本語ページへのリンク ${reference}`);
      }
    }
  }
  if (/<del>/.test(html)) fail(`${name}: 取り消し線になっています。Markdownの ~ は \\~ と書いてください`);
  const h1Count = (html.match(/<h1\b/g) ?? []).length;
  if (h1Count !== 1) fail(`${name}: h1が${h1Count}個あります`);

  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
  levels.forEach((level, index) => {
    if (index > 0 && level > levels[index - 1] + 1) fail(`${name}: 見出しレベルが飛んでいます (h${levels[index - 1]} → h${level})`);
  });

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!title) fail(`${name}: titleがありません`);
  if (!description) fail(`${name}: descriptionがありません`);
  const language = isEnglish ? 'en:' : 'ja:';
  if (titles.has(language + title)) fail(`${name}: titleが ${titles.get(language + title)} と重複`);
  if (descriptions.has(description)) fail(`${name}: descriptionが ${descriptions.get(description)} と重複`);
  titles.set(language + title, name);
  descriptions.set(description, name);

  for (const property of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (!html.includes(`property="${property}"`)) fail(`${name}: ${property}がありません`);
  }

  if (!isNotFound) {
    pageUrls.push(`${SITE}${route}`);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (canonical !== `${SITE}${route}`) fail(`${name}: canonicalが不正 ${canonical}`);
  }
}

for (const file of files.filter((path) => extname(path) === '.css')) {
  const css = readFileSync(file, 'utf8');
  for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    if (isLocal(match[1]) && !resolveLocal(file, match[1])) fail(`${relative(ROOT, file)}: 参照切れ ${match[1]}`);
    if (/^https?:/.test(match[1])) fail(`${relative(ROOT, file)}: 外部アセット ${match[1]}`);
  }
}

const sitemap = readFileSync(join(ROOT, 'sitemap-0.xml'), 'utf8');
for (const url of pageUrls) if (!sitemap.includes(`<loc>${url}</loc>`)) fail(`sitemapに未掲載: ${url}`);
if (sitemap.includes('404')) fail('sitemapに404ページが含まれています');
if (!readFileSync(join(ROOT, 'robots.txt'), 'utf8').includes(`${SITE}/sitemap-index.xml`)) fail('robots.txtのSitemapが不正です');

const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(`HTML ${htmlFiles.length} ページ / 全 ${files.length} ファイル / ${(bytes / 1024).toFixed(0)} KB`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} 件の問題:\n${failures.map((item) => `  - ${item}`).join('\n')}`);
  process.exit(1);
}
console.log('✓ deploy/ の検査はすべて成功しました');
