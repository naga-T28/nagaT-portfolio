/** Generates the share image, public/og-image.jpg. Run with Node 24: npm run assets:og */
import { chromium } from 'playwright';
import { LOGO_HEIGHT, LOGO_WIDTH, T_STEM_WIDTH, letters, roots, slits, tStemBars } from '../src/lib/logotype.ts';

const INK = '#0a0a0a';
const PAPER = '#fcfcfc';
const out = new URL('../public/', import.meta.url);

const logotype = `<svg viewBox="0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}" width="960" style="display:block">
  ${letters.map((l) => `<path d="${l.d}" fill="${INK}" fill-rule="evenodd"/>`).join('')}
  ${slits.map((p) => `<polygon points="${p}" fill="${PAPER}"/>`).join('')}
</svg>`;
const rootsSvg = `<svg viewBox="0 0 ${LOGO_WIDTH} 100" preserveAspectRatio="none" width="960" height="215" style="display:block">${roots.map((r) => `<rect x="${r.x}" width="${r.width}" height="100" fill="${INK}"/>`).join('')}</svg>`;
const stripes = `<svg viewBox="0 0 ${T_STEM_WIDTH} 10" preserveAspectRatio="none" width="208" height="100%" style="display:block;height:100%">${tStemBars.map((b) => `<rect x="${b.x}" width="${b.width}" height="10" fill="${INK}"/>`).join('')}</svg>`;
const bar = (height, gap) => `<div style="height:${height}px;background:${INK};margin-bottom:${gap}px"></div>`;
const ogHtml = `<!doctype html><body style="margin:0;width:1200px;height:630px;background:${PAPER};overflow:hidden">
  ${bar(44, 8)}${bar(16, 6)}${bar(12, 0)}
  <div style="display:flex;justify-content:space-between;height:544px">
    <div style="width:960px">
      ${logotype}
      ${bar(48, 0)}
      <div style="margin-top:8px">${bar(16, 0)}</div>
      ${rootsSvg}
    </div>
    <div style="width:208px;margin-right:32px">${stripes}</div>
  </div>
</body>`;

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(ogHtml);
await page.screenshot({ path: new URL('og-image.jpg', out).pathname, type: 'jpeg', quality: 86 });
await browser.close();
console.log('Share image written to public/og-image.jpg');
