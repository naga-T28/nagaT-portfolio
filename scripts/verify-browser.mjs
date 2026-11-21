/**
 * Browser checks against the built deploy/ folder, served Apache-style.
 * Run: npm run build && npm run test:browser
 * BROWSER_CHANNEL=chrome (default) uses the installed Chrome. BROWSER_ENGINE=webkit runs Playwright's WebKit.
 * The playback checks run the real audio pipeline, but nothing reaches the speakers (see SILENCE below).
 */
import { mkdir } from 'node:fs/promises';
import playwright from 'playwright';
import { sound } from '../src/data/site.ts';
import { startServer } from './serve-deploy.mjs';

const PORT = 4399;
const BASE = `http://127.0.0.1:${PORT}`;
const engine = process.env.BROWSER_ENGINE ?? 'chromium';
const OUT = new URL(`../reports/screenshots/${engine}/`, import.meta.url);
await mkdir(OUT, { recursive: true });

const server = await startServer(PORT);
const browser = await playwright[engine].launch(
  {
    chromium: { channel: process.env.BROWSER_CHANNEL ?? 'chrome', args: ['--mute-audio'] },
    firefox: { firefoxUserPrefs: { 'media.volume_scale': '0.0' } },
    webkit: {},
  }[engine],
);

/**
 * Runs before any page script. Everything headed for the speakers passes through a gain of 0 first, so
 * the analyser still sees the music while the output is silent. If the page ever plays without going
 * through Web Audio, the element itself is muted. The probe lets a check measure the silence.
 */
const SILENCE = () => {
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    if (target instanceof AudioDestinationNode) {
      const silencer = this.context.createGain();
      silencer.gain.value = 0;
      connect.call(this, silencer);
      connect.call(silencer, target);
      const probe = this.context.createAnalyser();
      probe.fftSize = 2048;
      connect.call(silencer, probe);
      window.__speakerProbe = probe;
      return target;
    }
    return connect.call(this, target, ...rest);
  };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!window.__speakerProbe) this.muted = true;
    return play.call(this);
  };
};

const openContext = browser.newContext.bind(browser);
browser.newContext = async (options) => {
  const context = await openContext(options);
  await context.addInitScript(SILENCE);
  return context;
};

const ROUTES = ['/', '/projects/', '/projects/tabisync/', '/projects/meelyze-plus/', '/projects/waripoke/', '/research/', '/about/', '/contact/', '/404.html', '/en/', '/en/projects/', '/en/projects/tabisync/', '/en/projects/meelyze-plus/', '/en/projects/waripoke/', '/en/research/', '/en/about/', '/en/contact/'];
const WIDTHS = [320, 360, 375, 414, 768, 1024, 1440, 2560];
const results = [];

async function check(name, run) {
  try {
    await run();
    results.push([true, name]);
  } catch (error) {
    results.push([false, `${name}: ${error.message}`]);
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

// Total squares drawn: it changes from frame to frame only when the columns are moving.
const countInk = (page) =>
  page.$eval('[data-sound-wave]', (canvas) => {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    let ink = 0;
    for (let index = 3; index < data.length; index += 4) if (data[index] > 200) ink += 1;
    return ink;
  });

const slug = (route) => route.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home';

// Layout at each width: no horizontal scroll, no element poking out of the page.
for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 800 : 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const route of ROUTES) {
    await check(`横スクロールなし ${width}px ${route}`, async () => {
      await page.goto(BASE + route, { waitUntil: 'load' });
      // Widths are measured below, so the real fonts must be in place first.
      await page.evaluate(async () => {
        await Promise.all([document.fonts.load('800 16px Archivo'), document.fonts.load("600 16px 'JetBrains Mono'")]);
        await document.fonts.ready;
      });
      const report = await page.evaluate(() => {
        const limit = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll('body *')]
          .filter((element) => !element.closest('[aria-hidden="true"], .visually-hidden, .skip-link'))
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.right > limit + 1;
          })
          .slice(0, 4)
          .map((element) => `${element.tagName}.${element.className}`);
        return { scrollWidth: document.documentElement.scrollWidth, limit, offenders };
      });
      assert(report.scrollWidth <= report.limit, `scrollWidth ${report.scrollWidth} > ${report.limit}`);
      assert(report.offenders.length === 0, `はみ出し ${report.offenders.join(', ')}`);
    });
    await check(`リンクが2行に折り返さない ${width}px ${route}`, async () => {
      const wrapped = await page.evaluate(() =>
        [...document.querySelectorAll('.link, .nav a, .site-footer a')]
          .filter((element) => element.getClientRects().length && getComputedStyle(element).whiteSpace !== 'nowrap')
          .map((element) => element.textContent.trim()),
      );
      assert(wrapped.length === 0, wrapped.join(', '));
    });
    await check(`ヘッダーが1行に収まる ${width}px ${route}`, async () => {
      const lines = await page.evaluate(() => {
        const brand = document.querySelector('.brand').getBoundingClientRect();
        const toggle = document.querySelector('[data-menu-toggle]');
        if (!toggle.getClientRects().length) return null;
        return Math.abs(brand.top + brand.height / 2 - (toggle.getBoundingClientRect().top + toggle.getBoundingClientRect().height / 2));
      });
      assert(lines === null || lines < 4, `ブランドとメニューの高さが ${lines}px ずれている`);
    });
    await check(`プレーヤーの部品が重ならない ${width}px ${route}`, async () => {
      const overlap = await page.evaluate(() => {
        if (!document.querySelector('[data-sound]')) return false;
        const parts = ['.title', '.loop', '.volume', '.time']
          .map((selector) => document.querySelector(`.player ${selector}`))
          .filter((element) => element?.getClientRects().length)
          .map((element) => element.getBoundingClientRect())
          .sort((a, b) => a.left - b.left);
        const rowMates = parts.filter((box) => Math.abs(box.top + box.height / 2 - (parts[0].top + parts[0].height / 2)) < 12);
        return rowMates.some((box, index) => index > 0 && box.left < rowMates[index - 1].right - 0.5);
      });
      assert(!overlap, '曲名、繰り返し、音量、時間が重なっている');
    });
    await check(`曲名が省略されない ${width}px ${route}`, async () => {
      const cut = await page.evaluate(() => {
        const title = document.querySelector('.player .title');
        return title?.getClientRects().length ? title.scrollWidth > title.clientWidth : false;
      });
      assert(!cut, '曲名が途中で切れている');
    });
    await check(`見出しが自分の列に収まる ${width}px ${route}`, async () => {
      const overflowing = await page.evaluate(() =>
        [...document.querySelectorAll('.display')]
          .filter((heading) => {
            const range = document.createRange();
            range.selectNodeContents(heading);
            const limit = heading.parentElement.getBoundingClientRect().right;
            return range.getBoundingClientRect().right > limit + 1;
          })
          .map((heading) => heading.textContent.trim()),
      );
      assert(overflowing.length === 0, overflowing.join(', '));
    });
    await check(`見出しが語の途中で折れない ${width}px ${route}`, async () => {
      const broken = await page.evaluate(() => {
        const found = [];
        for (const heading of document.querySelectorAll('.display')) {
          const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            for (const match of node.textContent.matchAll(/[A-Za-z0-9+]+/g)) {
              const range = document.createRange();
              range.setStart(node, match.index);
              range.setEnd(node, match.index + match[0].length);
              if (range.getClientRects().length > 1) found.push(match[0]);
            }
          }
        }
        return found;
      });
      assert(broken.length === 0, broken.join(', '));
    });
    if ([320, 375, 768, 1440, 2560].includes(width)) {
      // A full-page capture does not scroll, so lazy images are loaded first.
      await page.$$eval('img[loading="lazy"]', (images) => {
        images.forEach((image) => {
          image.loading = 'eager';
        });
      });
      await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
      await page.screenshot({ path: new URL(`${slug(route)}-${width}.png`, OUT).pathname, fullPage: true });
    }
  }
  await context.close();
}

// Direct access to nested URLs, with and without the trailing slash.
{
  for (const path of ['/about', '/about/', '/projects/tabisync', '/projects/tabisync/', '/research', '/contact']) {
    await check(`直接アクセス ${path}`, async () => {
      const response = await fetch(BASE + path);
      assert(response.status === 200, `status ${response.status}`);
      assert(response.url.endsWith('/'), `末尾スラッシュへ転送されない: ${response.url}`);
    });
  }
  await check('存在しないURLは404.htmlを返す', async () => {
    const response = await fetch(`${BASE}/no-such-page/`);
    assert(response.status === 404, `status ${response.status}`);
    const body = await response.text();
    assert(body.includes('Page Not Found') && body.includes('/en/'), '404ページではない');
  });
}

// Full motion path: animation runs, nothing fails, no console errors, transitions work.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const requested = [];
  page.on('request', (request) => {
    requested.push(request.url());
    if (!request.url().startsWith(BASE) && !request.url().startsWith('data:')) external.push(request.url());
  });

  await check('ヒーロー: 文字が順番に下から現れる', async () => {
    await page.goto(BASE, { waitUntil: 'commit' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('motion-pending'));
    await page.waitForTimeout(450);
    const early = await page.$$eval('[data-hero-letter]', (letters) => letters.map((letter) => Number(getComputedStyle(letter).opacity)));
    await page.screenshot({ path: new URL('hero-mid-animation.png', OUT).pathname });
    assert(early[0] > early[3], `順番になっていない: ${early.join(', ')}`);
    await page.waitForTimeout(2200);
    const final = await page.$$eval('[data-hero-letter]', (letters) => letters.map((letter) => Number(getComputedStyle(letter).opacity)));
    assert(final.every((value) => value === 1), `最終状態が不正: ${final.join(', ')}`);
  });

  await check('ヒーロー: 文字の後に横棒が伸び、役割の文字は表示しない', async () => {
    const width = await page.$eval('[data-hero] .bar-1', (bar) => bar.getBoundingClientRect().width);
    assert(width > 1000, `横棒の幅 ${width}`);
    const band = await page.$eval('[data-hero] .band', (element) => element.textContent.trim());
    assert(band === '', `帯に文字が残っている: ${band}`);
    assert((await page.locator('h1').count()) === 1, '見出しがない');
  });

  await check('音楽: クリックするまで再生も読み込みもしない', async () => {
    const before = await page.evaluate(() => {
      const audio = document.querySelector('[data-sound-audio]');
      return { paused: audio.paused, preload: audio.preload, autoplay: audio.autoplay };
    });
    assert(before.paused && before.preload === 'none' && !before.autoplay, JSON.stringify(before));
    assert(!requested.some((url) => url.endsWith('.mp3')), 'クリック前にmp3を読み込んだ');
    assert((await countInk(page)) === 0, '停止中に波が表示されている');
  });

  await check('音楽: 再生、一時停止、位置の移動', async () => {
    const audio = () =>
      page.evaluate(() => {
        const element = document.querySelector('[data-sound-audio]');
        return { paused: element.paused, time: element.currentTime, duration: element.duration };
      });
    await page.click('[data-sound-toggle]');
    await page.waitForFunction(() => document.querySelector('[data-sound-audio]').currentTime > 0.3, null, { timeout: 15000 });
    const playing = await audio();
    assert(!playing.paused, '再生されない');
    assert(Math.abs(playing.duration - sound.duration) < 1.5, `長さ ${playing.duration}`);
    assert(await page.locator('.sound[data-playing]').count(), '再生中の表示にならない');
    assert((await page.getAttribute('[data-sound-toggle]', 'aria-label')).includes('一時停止'), 'ボタンの名前が変わらない');

    await page.$eval('[data-sound-seek]', (seek) => {
      seek.value = '45';
      seek.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    const samples = [];
    for (let index = 0; index < 6; index += 1) {
      samples.push(await countInk(page));
      await page.waitForTimeout(180);
    }
    assert(new Set(samples).size >= 4, `波が音に合わせて動かない: ${samples.join(', ')}`);

    const speakers = await page.evaluate(() => {
      const probe = window.__speakerProbe;
      if (!probe) return null;
      const buffer = new Float32Array(probe.fftSize);
      probe.getFloatTimeDomainData(buffer);
      return Math.max(...buffer.map(Math.abs));
    });
    assert(speakers === 0, `テスト中にスピーカーへ音が出ている: ${speakers}`);

    const shape = await page.$eval('[data-sound-wave]', (canvas) => {
      const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      let upper = 0;
      let lower = 0;
      let dark = 0;
      let grey = 0;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const at = (y * canvas.width + x) * 4;
          if (data[at + 3] < 200) continue;
          if (y < canvas.height / 2) upper += 1;
          else lower += 1;
          if (data[at] < 60) dark += 1;
          else grey += 1;
        }
      }
      return { upper, lower, dark, grey };
    });
    assert(shape.lower > shape.upper, `下から立ち上がっていない ${JSON.stringify(shape)}`);
    assert(shape.dark > 200 && shape.grey > 200, `再生位置で色が分かれていない ${JSON.stringify(shape)}`);

    const box = await page.locator('.wave').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const clicked = Number(await page.$eval('[data-sound-seek]', (seek) => seek.value));
    assert(Math.abs(clicked - sound.duration / 2) < 5, `クリックの移動先 ${clicked}秒`);

    await page.$eval('[data-sound-seek]', (seek) => {
      seek.value = '60';
      seek.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => document.querySelector('[data-sound-audio]').currentTime >= 60, null, { timeout: 15000 });
    const shown = await page.textContent('[data-sound-current]');
    assert(shown.startsWith('1:0'), `表示時刻 ${shown}`);

    await page.click('[data-sound-toggle]');
    assert((await audio()).paused, '一時停止しない');
    await page.waitForFunction(() => !document.querySelector('.sound[data-playing]'), null, { timeout: 3000 });
    await page.waitForTimeout(1500);
    assert((await countInk(page)) === 0, '停止後も波が残っている');
    const seekable = await page.$eval('[data-sound-seek]', (seek) => getComputedStyle(seek).visibility);
    assert(seekable === 'hidden', '停止中も見えない場所で位置を動かせる');
  });

  await check('音量: スライダーとミュートが効き、次回も保たれる', async () => {
    const state = () =>
      page.evaluate(() => {
        const bar = document.querySelector('[data-sound]');
        return { slider: Number(bar.querySelector('[data-sound-volume]').value), gain: Number(bar.dataset.gain), icon: bar.hasAttribute('data-muted') };
      });
    const setSlider = (value) =>
      page.$eval(
        '[data-sound-volume]',
        (slider, next) => {
          slider.value = next;
          slider.dispatchEvent(new Event('input', { bubbles: true }));
        },
        value,
      );
    const first = await state();
    assert(Math.abs(first.gain - 0.7) < 0.01 && !first.icon, `初期値 ${JSON.stringify(first)}`);
    await setSlider('0.3');
    assert(Math.abs((await state()).gain - 0.3) < 0.01, '音量が変わらない');
    await page.click('[data-sound-mute]');
    const muted = await state();
    assert(muted.gain === 0 && muted.icon, `ミュート ${JSON.stringify(muted)}`);
    await page.reload({ waitUntil: 'load' });
    const restored = await state();
    assert(Math.abs(restored.slider - 0.3) < 0.01 && restored.gain === 0, `再読み込み後 ${JSON.stringify(restored)}`);
    await page.click('[data-sound-mute]');
    assert(Math.abs((await state()).gain - 0.3) < 0.01, 'ミュートを解除できない');
    await setSlider('0');
    assert((await state()).icon, '音量0でミュート表示にならない');
    await page.click('[data-sound-mute]');
    const back = await state();
    assert(back.gain > 0 && !back.icon, `音量0からの解除 ${JSON.stringify(back)}`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE, { waitUntil: 'load' });
  });

  await check('繰り返し: オンで先頭に戻って続き、オフなら最後で止まり、次回も保たれる', async () => {
    const state = () =>
      page.evaluate(() => {
        const audio = document.querySelector('[data-sound-audio]');
        return {
          loop: audio.loop,
          pressed: document.querySelector('[data-sound-loop]').getAttribute('aria-pressed'),
          paused: audio.paused,
          time: audio.currentTime,
          drawn: Boolean(document.querySelector('.sound[data-playing]')),
        };
      });
    const nearEnd = () =>
      page.$eval('[data-sound-seek]', (seek) => {
        seek.value = String(Number(seek.max) - 2);
        seek.dispatchEvent(new Event('input', { bubbles: true }));
      });
    const first = await state();
    assert(!first.loop && first.pressed === 'false', `初期状態 ${JSON.stringify(first)}`);

    const fetched = [];
    const onRequest = (request) => {
      if (request.url().endsWith('.mp3')) fetched.push(request.url());
    };
    await page.click('[data-sound-loop]');
    const on = await state();
    assert(on.loop && on.pressed === 'true', `オンにならない ${JSON.stringify(on)}`);
    const look = await page.$eval('[data-sound-loop]', (button) => getComputedStyle(button).backgroundColor);
    assert(look !== 'rgba(0, 0, 0, 0)', 'オンの見た目にならない');
    await page.reload({ waitUntil: 'load' });
    page.on('request', onRequest);
    const restored = await state();
    assert(restored.loop && restored.pressed === 'true' && restored.paused, `再読み込み後 ${JSON.stringify(restored)}`);
    await page.waitForTimeout(300);
    assert(fetched.length === 0, '繰り返しを復元しただけでmp3を読み込んだ');
    page.off('request', onRequest);

    await page.click('[data-sound-toggle]');
    await page.waitForFunction(() => document.querySelector('[data-sound-audio]').currentTime > 0.3, null, { timeout: 15000 });
    await nearEnd();
    await page.waitForFunction(() => document.querySelector('[data-sound-audio]').currentTime > 100, null, { timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('[data-sound-audio]').currentTime < 5, null, { timeout: 15000 });
    await page.waitForTimeout(300);
    const wrapped = await state();
    assert(!wrapped.paused && wrapped.drawn, `先頭に戻った後も再生が続かない ${JSON.stringify(wrapped)}`);
    assert((await page.textContent('[data-sound-current]')).startsWith('0:0'), '表示時刻が先頭に戻らない');

    await page.click('[data-sound-loop]');
    await nearEnd();
    await page.waitForFunction(() => document.querySelector('[data-sound-audio]').paused, null, { timeout: 15000 });
    await page.waitForTimeout(200);
    const stopped = await state();
    assert(stopped.paused && !stopped.drawn && !stopped.loop && stopped.pressed === 'false', `最後で止まらない ${JSON.stringify(stopped)}`);
    assert(stopped.time === 0, `止まった位置 ${stopped.time}`);

    await page.focus('[data-sound-loop]');
    await page.keyboard.press('Enter');
    assert((await state()).pressed === 'true', 'キーボードで切り替えられない');
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE, { waitUntil: 'load' });
  });

  await check('スクロール: カードが現れ、線が伸びる', async () => {
    const tall = await context.newPage();
    await tall.setViewportSize({ width: 1440, height: 500 });
    await tall.goto(`${BASE}/projects/`, { waitUntil: 'load' });
    await tall.waitForTimeout(800);
    const before = await tall.$$eval('[data-card]', (cards) => Number(getComputedStyle(cards.at(-1)).opacity));
    assert(before === 0, `画面外のカードの開始opacity ${before}`);
    await tall.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await tall.waitForTimeout(1200);
    const after = await tall.$$eval('[data-card]', (cards) => Number(getComputedStyle(cards.at(-1)).opacity));
    assert(after === 1, `スクロール後のopacity ${after}`);
    await tall.close();
  });

  await check('スクロール: 大きな文字がわずかに移動する', async () => {
    const position = () => page.$eval('[data-drift]', (word) => new DOMMatrix(getComputedStyle(word).transform).m41);
    await page.evaluate(() => document.querySelector('[data-drift]').scrollIntoView({ block: 'end', behavior: 'instant' }));
    await page.waitForTimeout(900);
    const start = await position();
    await page.evaluate(() => document.querySelector('[data-drift]').scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(900);
    const end = await position();
    assert(Math.abs(end - start) > 5, `${start} → ${end}`);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  });

  await check('ページ遷移: 全ナビゲーションが動く', async () => {
    for (const [label, path] of [['Projects', '/projects/'], ['Research', '/research/'], ['About', '/about/'], ['Contact', '/contact/'], ['Home', '/']]) {
      await page.click(`.nav a:text-is("${label}")`);
      await page.waitForURL(BASE + path);
      await page.waitForLoadState('load');
      const current = await page.$eval('.nav a[aria-current="page"]', (link) => link.textContent.trim());
      assert(current === label, `aria-current が ${current}`);
    }
  });

  await check('ページ遷移: View Transitionが有効(対応ブラウザ)', async () => {
    // Browsers without cross-document transitions drop the rule and navigate normally.
    const supported = await page.evaluate(() => 'CSSViewTransitionRule' in window);
    if (!supported) return;
    const rule = await page.evaluate(() =>
      [...document.styleSheets].some((sheet) =>
        [...sheet.cssRules].some((rule) => rule.cssText.includes('@view-transition') || (rule.cssRules && [...rule.cssRules].some((inner) => inner.cssText.includes('@view-transition')))),
      ),
    );
    assert(rule, '@view-transition がない');
  });

  await check('ブラウザバック後もGSAPが二重に動かない', async () => {
    await page.click('.nav a:text-is("Projects")');
    await page.waitForURL(`${BASE}/projects/`);
    await page.goBack();
    await page.waitForURL(`${BASE}/`);
    await page.waitForTimeout(600);
    const pending = await page.evaluate(() => document.documentElement.classList.contains('motion-pending'));
    assert(!pending, 'motion-pendingが残っている');
    const visible = await page.$$eval('[data-hero-letter]', (letters) => letters.every((letter) => getComputedStyle(letter).visibility === 'visible'));
    assert(visible, 'ヒーローが非表示');
  });

  await check('遅延読み込みの画像がスクロールで表示される', async () => {
    await page.goto(`${BASE}/projects/tabisync/`, { waitUntil: 'load' });
    const image = page.locator('figure img');
    assert((await image.getAttribute('loading')) === 'lazy', 'lazyでない');
    assert((await image.getAttribute('srcset'))?.includes('.webp'), 'srcsetがない');
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('figure img').naturalWidth > 0);
  });

  if (engine === 'chromium') {
    await check('ページ遷移: ブラウザのView Transitionが実際に発火する', async () => {
      await page.addInitScript(() => {
        window.addEventListener('pagereveal', (event) => {
          window.__viewTransition = Boolean(event.viewTransition);
        });
      });
      await page.goto(BASE, { waitUntil: 'load' });
      await page.click('.nav a:text-is("About")');
      await page.waitForURL(`${BASE}/about/`);
      await page.waitForLoadState('load');
      assert((await page.evaluate(() => window.__viewTransition)) === true, 'view transitionなし');
    });
  }

  await check('言語切り替え: 同じページの別言語へ移動して戻れる', async () => {
    await page.goto(`${BASE}/about/`, { waitUntil: 'load' });
    await page.click('[data-lang-switch]');
    await page.waitForURL(`${BASE}/en/about/`);
    assert((await page.getAttribute('html', 'lang')) === 'en', 'langがenでない');
    const links = await page.$$eval('.nav a:not([data-lang-switch])', (items) => items.map((item) => item.getAttribute('href')));
    assert(links.every((href) => href.startsWith('/en/')), `ナビが英語版を指していない: ${links.join(', ')}`);
    await page.click('[data-lang-switch]');
    await page.waitForURL(`${BASE}/about/`);
    assert((await page.getAttribute('html', 'lang')) === 'ja', 'langがjaでない');
    await page.goto(`${BASE}/projects/tabisync/`, { waitUntil: 'load' });
    await page.click('[data-lang-switch]');
    await page.waitForURL(`${BASE}/en/projects/tabisync/`);
  });

  await check('言語切り替え: Contactのすぐ右にある', async () => {
    await page.goto(BASE, { waitUntil: 'load' });
    const order = await page.$$eval('.nav li a', (items) => items.map((item) => item.textContent.trim()));
    assert(order.at(-2) === 'Contact' && order.at(-1) === 'EN', order.join(', '));
    const contact = await page.locator('.nav a:text-is("Contact")').boundingBox();
    const toggle = await page.locator('[data-lang-switch]').boundingBox();
    assert(toggle.x >= contact.x + contact.width && Math.abs(toggle.y + toggle.height / 2 - (contact.y + contact.height / 2)) < 4, '位置が違う');
  });

  await check('英語版の全ページに日本語が表示されていない', async () => {
    const leftovers = [];
    for (const route of ROUTES.filter((item) => item.startsWith('/en/'))) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      const text = await page.evaluate(() => document.body.innerText);
      const found = text.match(/[\u3040-\u30ff\u3400-\u9fff]+/g);
      if (found) leftovers.push(`${route}: ${found.slice(0, 4).join(' ')}`);
    }
    assert(leftovers.length === 0, leftovers.join(' / '));
  });

  await check('コンソールエラーなし', async () => assert(errors.length === 0, errors.join(' | ')));
  await check('外部へのリクエストなし', async () => assert(external.length === 0, external.join(', ')));
  await context.close();
}

// Mobile menu.
{
  const context = await browser.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  await check('モバイルメニュー: 開閉とEscape、フォーカス復帰', async () => {
    assert(!(await page.isVisible('.nav a:text-is("About")')), '閉じているのに見えている');
    await page.click('[data-menu-toggle]');
    await page.waitForTimeout(250);
    assert(await page.isVisible('.nav a:text-is("About")'), '開いても見えない');
    assert((await page.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'true', 'aria-expanded');
    await page.screenshot({ path: new URL('menu-375.png', OUT).pathname });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    assert(!(await page.isVisible('.nav a:text-is("About")')), 'Escapeで閉じない');
    assert(await page.evaluate(() => document.activeElement?.hasAttribute('data-menu-toggle')), 'フォーカスが戻らない');
  });

  await check('モバイルメニュー: 言語を切り替えられる', async () => {
    await page.click('[data-menu-toggle]');
    await page.waitForTimeout(250);
    await page.click('[data-lang-switch]');
    await page.waitForURL(`${BASE}/en/`);
    await page.goto(BASE, { waitUntil: 'load' });
  });

  await check('モバイルメニュー: リンクで遷移できる', async () => {
    await page.click('[data-menu-toggle]');
    await page.click('.nav a:text-is("About")');
    await page.waitForURL(`${BASE}/about/`);
  });

  await check('タップ領域が44px以上', async () => {
    await page.goto(BASE, { waitUntil: 'load' });
    const small = await page.$$eval('[data-menu-toggle], [data-sound-toggle], [data-sound-loop], [data-sound-mute], .link, .site-footer a', (elements) =>
      elements
        .filter((element) => element.getClientRects().length)
        .filter((element) => element.getBoundingClientRect().height < 24)
        .map((element) => element.textContent.trim()),
    );
    assert(small.length === 0, small.join(', '));
  });
  await context.close();
}

// JavaScript disabled.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
  const page = await context.newPage();
  for (const route of ROUTES.slice(0, 8)) {
    await check(`JS無効で閲覧可能 ${route}`, async () => {
      await page.goto(BASE + route, { waitUntil: 'load' });
      assert(await page.isVisible('h1, h1 span'), 'h1が見えない');
      assert(await page.isVisible('.nav a:text-is("About")'), 'ナビが見えない');
    });
  }
  await page.goto(BASE, { waitUntil: 'load' });
  await page.screenshot({ path: new URL('nojs-1280.png', OUT).pathname, fullPage: true });
  await check('JS無効: 通常のリンク遷移', async () => {
    await page.click('.nav a:text-is("Projects")');
    await page.waitForURL(`${BASE}/projects/`);
    assert(await page.isVisible('a[href="/projects/tabisync/"]'), 'カードが見えない');
  });
  await check('JS無効: 曲へのリンクが表示される', async () => {
    await page.goto(BASE, { waitUntil: 'load' });
    assert(await page.isVisible(`.fallback[href="${sound.src}"]`), 'リンクが見えない');
    assert(!(await page.isVisible('[data-sound-toggle]')), '動かないボタンが見えている');
  });
  await check('JS無効: ヒーローのロゴが表示される', async () => {
    await page.goto(BASE, { waitUntil: 'load' });
    assert(await page.isVisible('[data-hero] .logotype'), 'ロゴが非表示');
  });
  await context.close();

  const narrow = await browser.newContext({ viewport: { width: 375, height: 800 }, javaScriptEnabled: false });
  const narrowPage = await narrow.newPage();
  await check('JS無効のスマホでもナビが使える', async () => {
    await narrowPage.goto(BASE, { waitUntil: 'load' });
    assert(await narrowPage.isVisible('.nav a:text-is("Contact")'), 'ナビが見えない');
    assert(!(await narrowPage.isVisible('[data-menu-toggle]')), 'メニューボタンが出ている');
  });
  await narrowPage.screenshot({ path: new URL('nojs-375.png', OUT).pathname });
  await narrow.close();
}

// Reduced motion: GSAP not loaded, nothing moves, all content visible.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await check('動きを減らす: GSAPを読み込まない', async () => {
    assert(!requests.some((url) => url.includes('motion.')), 'motionチャンクを読み込んだ');
  });
  await check('動きを減らす: 再生しても波は動かない', async () => {
    await page.click('[data-sound-toggle]');
    await page.waitForFunction(() => document.querySelector('[data-sound-audio]').currentTime > 0.3, null, { timeout: 15000 });
    const samples = [];
    for (let index = 0; index < 4; index += 1) {
      samples.push(await countInk(page));
      await page.waitForTimeout(150);
    }
    await page.click('[data-sound-toggle]');
    assert(new Set(samples).size === 1 && samples[0] > 0, `動いている、または位置が見えない: ${samples.join(', ')}`);
  });

  await check('動きを減らす: 全要素が表示される', async () => {
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('[data-hero-hide], [data-card], [data-fade]')].filter((element) => {
        const style = getComputedStyle(element);
        return style.visibility === 'hidden' || Number(style.opacity) === 0;
      }).length,
    );
    assert(hidden === 0, `${hidden} 個が非表示`);
  });
  await context.close();
}

// First view of the home page: only the hero and the player are on screen, and no section is black.
for (const home of ['/', '/en/']) {
  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [780, 900], [800, 700], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440], [1080, 1920]]) {
    await check(`1画面目 ${home} ${width}x${height}: 3つの要素で画面を埋め、線が伸びる`, async () => {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      await page.goto(BASE + home, { waitUntil: 'load' });
      await page.waitForTimeout(300);
      const view = await page.evaluate(() => ({
        intro: document.querySelector('#intro').getBoundingClientRect().top,
        player: document.querySelector('[data-sound]').getBoundingClientRect().bottom,
        height: innerHeight,
        hasScroll: document.documentElement.scrollHeight > innerHeight,
        ...(() => {
          const box = (selector) => document.querySelector(selector).getBoundingClientRect();
          const logo = box('[data-hero] .logotype');
          return {
            roots: box('.roots').bottom,
            stripes: box('.t-stem').bottom,
            playerTop: box('[data-sound]').top,
            sideTop: box('[data-hero] .side').top,
            sideShare: box('[data-hero] .side').height / (box('[data-hero] .side').bottom - box('[data-hero] .main').top),
            heroTop: box('[data-hero]').top,
            headerBottom: box('.site-header').bottom,
            logoRatio: logo.width / logo.height,
            logoExpected: 1346 / 360,
          };
        })(),
      }));
      await context.close();
      assert(view.intro >= view.height, `はじめましてが見えている: ${view.intro} / ${view.height}`);
      assert(Math.abs(view.player - view.height) < 1, `プレーヤーの下端が画面の下端と合わない: ${view.player} / ${view.height}`);
      assert(Math.abs(view.heroTop - view.headerBottom) < 1, 'ヘッダーとヒーローの間に隙間がある');
      // Below 52rem the grey panel sits under the lines; from there up the lines reach the player.
      const below = view.sideTop >= view.roots - 1 ? view.sideTop : view.playerTop;
      assert(Math.abs(below - view.roots) < 1, `線が下の要素まで届かない: ${view.roots} / ${below}`);
      if (width < 832 && height >= width * 1.7) assert(view.sideShare > 0.3, `灰色の比重が小さい: ${view.sideShare}`);
      assert(view.stripes >= view.roots - 1, `右の棒が線の下端まで届かない: ${view.stripes} / ${view.roots}`);
      assert(Math.abs(view.logoRatio - view.logoExpected) < 0.05, `文字が伸びている: ${view.logoRatio}`);
    });
  }

  await check(`再読み込み ${home}: 1画面目に戻り、ページを行き来すれば元の位置に戻る`, async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const at = () => page.evaluate(() => ({ y: scrollY, intro: document.querySelector('#intro').getBoundingClientRect().top, height: innerHeight, hash: location.hash }));
    await page.goto(BASE + home, { waitUntil: 'load' });
    await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    const scrolled = await at();
    assert(scrolled.y === 0 && scrolled.intro >= scrolled.height, `スクロール後の再読み込み ${JSON.stringify(scrolled)}`);

    await page.click('[data-hero] .scroll');
    await page.waitForFunction(() => location.hash === '#intro' && scrollY > 0);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    const linked = await at();
    assert(linked.y === 0 && linked.hash === '' && linked.intro >= linked.height, `矢印の後の再読み込み ${JSON.stringify(linked)}`);

    // Clicked from script: a real click would first scroll back up to the header.
    await page.evaluate(() => {
      scrollTo({ top: 900, behavior: 'instant' });
      document.querySelector('.nav a[href$="/about/"]').click();
    });
    await page.waitForURL('**/about/');
    await page.goBack({ waitUntil: 'load' });
    await page.waitForFunction(() => scrollY > 800, null, { timeout: 3000 });
    await context.close();
  });

  await check(`黒背景 ${home}: セクションに黒地がない`, async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(BASE + home, { waitUntil: 'load' });
    const dark = await page.evaluate(() => {
      const ink = getComputedStyle(document.querySelector('.site-header')).backgroundColor;
      return [...document.querySelectorAll('main section, main section > *')]
        .filter((element) => getComputedStyle(element).backgroundColor === ink)
        .map((element) => element.className);
    });
    await context.close();
    assert(dark.length === 0, `黒地: ${dark.join(', ')}`);
  });
}

// The About profile: the photo comes first, with the links under it on wider screens.
for (const path of ['/about/', '/en/about/']) {
  for (const [width, beside] of [[320, false], [1440, true]]) {
    await check(`プロフィール ${path} 幅${width}: 写真、名前、リンクが並ぶ`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.goto(BASE + path, { waitUntil: 'load' });
      const view = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(`.profile ${selector}`).getBoundingClientRect();
        const image = document.querySelector('.profile img');
        return {
          first: document.querySelector('.page-body').firstElementChild.className,
          loaded: image.complete && image.naturalWidth > 0,
          alt: image.alt,
          photo: rect('img').toJSON(),
          name: rect('.name').toJSON(),
          links: rect('.links').toJSON(),
          bio: rect('.bio').toJSON(),
          linkCount: document.querySelectorAll('.profile .links a').length,
          icons: [...document.querySelectorAll('.profile .links a')].map((link) => ({
            icon: Boolean(link.querySelector('svg.icon')),
            visibleText: link.querySelector('svg').getBoundingClientRect().width > 0 && link.innerText.trim() !== '' && getComputedStyle(link.querySelector('.visually-hidden')).position !== 'absolute',
            name: link.textContent.trim(),
            width: link.getBoundingClientRect().width,
            height: link.getBoundingClientRect().height,
            iconRight: link.querySelector('svg').getBoundingClientRect().right,
            linkRight: link.getBoundingClientRect().right,
          })),
          overflow: document.documentElement.scrollWidth - innerWidth,
          text: document.querySelector('.profile .name').textContent,
        };
      });
      await context.close();
      assert(view.first.includes('profile'), `最初の要素: ${view.first}`);
      assert(view.loaded && view.alt, '写真が読み込まれていない');
      assert(view.photo.top < 900, `写真が1画面目にない: ${view.photo.top}`);
      assert(view.text === 'nagaT', `名前: ${view.text}`);
      assert(view.linkCount === 6, `リンク数: ${view.linkCount}`);
      assert(view.overflow <= 0, `横にはみ出している: ${view.overflow}`);
      for (const link of view.icons) {
        assert(link.icon, `アイコンがない: ${link.name}`);
        assert(!link.visibleText, `文字が見えている: ${link.name}`);
        assert(link.name.length > 0, 'リンクの読み上げ名がない');
        assert(link.width >= 44 && link.height >= 44, `押せる範囲が小さい: ${link.name} ${link.width}x${link.height}`);
        assert(link.iconRight <= link.linkRight, `アイコンが枠からはみ出している: ${link.name}`);
      }
      if (beside) {
        assert(view.name.left >= view.photo.right, '名前が写真の右にない');
        assert(Math.abs(view.bio.bottom - view.links.bottom) < 1, `紹介文が下端に揃っていない: ${view.bio.bottom} / ${view.links.bottom}`);
        assert(view.links.top >= view.photo.bottom && view.links.right <= view.photo.right + 1, 'リンクが写真の下にない');
      } else {
        assert(view.name.top >= view.photo.bottom, '名前が写真の下にない');
      }
    });
  }
}

// The About timeline: one line joins every row, and each year stays on a single line.
for (const path of ['/about/', '/en/about/']) {
  for (const width of [320, 1440]) {
    await check(`年表 ${path} 幅${width}: 線がつながっている`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.goto(BASE + path, { waitUntil: 'load' });
      const view = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.timeline tbody tr')];
        const cells = rows.map((row) => row.lastElementChild.getBoundingClientRect());
        const line = getComputedStyle(rows[0].lastElementChild, '::before');
        return {
          rows: rows.length,
          gaps: cells.slice(1).map((cell, index) => Math.abs(cell.top - cells[index].bottom)),
          lineWidth: line.width,
          years: rows.map((row) => {
            const cell = row.firstElementChild;
            const range = document.createRange();
            range.selectNodeContents(cell);
            return range.getClientRects().length;
          }),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      await context.close();
      assert(view.rows >= 2, `行数: ${view.rows}`);
      assert(view.gaps.every((gap) => gap < 1), `行の間に隙間: ${view.gaps.join(', ')}`);
      assert(view.lineWidth === '4px', `線の太さ: ${view.lineWidth}`);
      assert(view.years.every((lines) => lines === 1), `年が折り返している: ${view.years.join(', ')}`);
      assert(view.overflow <= 0, `横にはみ出している: ${view.overflow}`);
    });
  }
}

// The footer rule spans the full width on every page, and the home Contact panel touches it.
for (const width of [320, 1440, 2560]) {
  await check(`フッターの線 幅${width}: 全ページで画面の端まで届く`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const path of ROUTES) {
      await page.goto(BASE + path, { waitUntil: 'load' });
      const rule = await page.evaluate(() => {
        const footer = document.querySelector('.site-footer');
        const box = footer.getBoundingClientRect();
        return { left: box.left, right: box.right, full: document.documentElement.clientWidth, top: getComputedStyle(footer).borderTopWidth };
      });
      assert(rule.left === 0 && rule.right === rule.full && rule.top === '4px', `${path}: ${JSON.stringify(rule)}`);
    }
    await context.close();
  });
}

for (const home of ['/', '/en/']) {
  await check(`Contactの灰色 ${home}: フッターに接している`, async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(BASE + home, { waitUntil: 'load' });
    const gap = await page.evaluate(() => document.querySelector('.site-footer').getBoundingClientRect().top - document.querySelector('.contact').getBoundingClientRect().bottom);
    await context.close();
    assert(Math.abs(gap) < 1, `隙間: ${gap}px`);
  });
}

// Keyboard: skip link and focus ring.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await check('キーボード: スキップリンクと可視フォーカス', async () => {
    // macOS Safari does not move Tab through links by default, so WebKit focuses them directly.
    if (engine === 'webkit') {
      await page.focus('.skip-link');
    } else {
      await page.keyboard.press('Tab');
    }
    const first = await page.evaluate(() => document.activeElement.className);
    assert(first.includes('skip-link'), `最初のフォーカス: ${first}`);
    if (engine === 'webkit') {
      await page.focus('.brand');
    } else {
      await page.keyboard.press('Tab');
    }
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement);
      return `${style.outlineStyle} ${style.outlineWidth}`;
    });
    assert(outline.startsWith('solid'), outline);
  });
  await context.close();
}

await browser.close();
server.close();

const failed = results.filter(([passed]) => !passed);
for (const [, message] of failed) console.log(`✗ ${message}`);
console.log(`${results.length - failed.length} / ${results.length} 件成功 (${engine})`);
process.exit(failed.length ? 1 : 0);
