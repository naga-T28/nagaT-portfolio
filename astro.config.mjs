import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static build for Xserver: copy the contents of deploy/ into public_html.
export default defineConfig({
  site: 'https://naga-t.jp',
  output: 'static',
  outDir: './deploy',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'ja', locales: { ja: 'ja-JP', en: 'en-US' } },
    }),
  ],
});
