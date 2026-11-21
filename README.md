# nagaT Portfolio

[naga-t.jp](https://naga-t.jp) のソースコードです。Astroで静的サイトを生成し、できあがった `deploy/` の中身をXserverの公開ディレクトリへ置くだけで動きます。サーバー側のNode.jsやPHPは使いません。

- 構成: Astro / TypeScript / GSAP + ScrollTrigger / CSS
- 必要な環境: Node.js 24(`.nvmrc`)

## 1. ローカル開発

```sh
npm ci
npm run dev
```

`http://localhost:4321/` を開きます。Astro 7の開発サーバーはバックグラウンドで動くので、終わったら止めてください。

```sh
npx astro dev stop
```

## 2. ビルドと `deploy/` の生成

```sh
npm run build
```

これだけで公開に必要なファイルがすべて `deploy/` に生成されます。HTMLの手動編集は不要です。`deploy/` は生成物なのでGitでは管理しません。

```text
deploy/
├── index.html
├── about/index.html
├── en/              英語版(en/about/index.html など、同じ構成)
├── projects/index.html
├── projects/tabisync/index.html   ほか各プロジェクト
├── research/index.html
├── contact/index.html
├── 404.html
├── _astro/        CSS、JavaScript、フォント、画像
├── audio/         トップページの曲
├── favicon.ico    ほかアイコン、og-image.jpg
├── robots.txt
└── sitemap-index.xml, sitemap-0.xml
```

アップロードするのは `deploy/` の**中身だけ**です。`src/`、`node_modules/` などは不要です。

## 3. ビルド結果の確認

```sh
npm run verify        # リンク切れ、必須ファイル、SEO項目を検査
npm run preview       # deploy/ を http://127.0.0.1:4322/ で表示(Xserverと同じ動き)
npm run test:browser  # 実ブラウザで各画面幅、JS無効、動きを減らす設定などを検査
npm run check         # 型チェック
```

`test:browser` はインストール済みのChromeを使い、スクリーンショットを `reports/screenshots/` に保存します。再生の検査は音を出さずに行います(スピーカーへの出力が0であることも確認します)。

## 4. Xserverで公開する

### 事前に確認する値

実際の値は推測せず、Xserverのサーバーパネルで確認してください。

| 値 | 確認する場所 |
| --- | --- |
| `<SSH_USER>` | サーバーパネル「サーバー情報」のサーバーID |
| `<SSH_HOST>` | サーバーパネル「サーバー情報」のホスト名 |
| `<SSH_PORT>` | Xserverの「SSH設定」の案内 |
| `<PUBLIC_HTML>` | SSHでログインし、naga-t.jp の `public_html` の絶対パスを確認 |

SSHを初めて使う場合は、サーバーパネルの「SSH設定」で有効にし、公開鍵を登録します。

### 手順A: SFTP(FileZillaなど)

1. `npm run build` を実行します。
2. サーバーの `public_html` を丸ごとローカルへダウンロードして、バックアップにします。
3. `deploy/` の**中身**を `public_html` へアップロードします。`_astro/.htaccess` は隠しファイルなので、クライアントの設定で隠しファイルを表示して転送してください。
4. 後述の「公開後の確認」を行います。

### 手順B: SSHとrsync

以下の `<...>` を実際の値に置き換えて実行します。

**1. バックアップを取る**

```sh
ssh -p <SSH_PORT> <SSH_USER>@<SSH_HOST> \
  'tar czf ~/backup-public_html-$(date +%Y%m%d-%H%M%S).tar.gz -C <PUBLIC_HTML> .'
```

**2. サーバーの現状を確認する**

```sh
ssh -p <SSH_PORT> <SSH_USER>@<SSH_HOST> 'ls -la <PUBLIC_HTML>; cat <PUBLIC_HTML>/.htaccess'
```

`.htaccess` がある場合は、mod_pagespeedなどのサーバー設定が書かれている可能性があります。**上書きしないでください。** 下記のコマンドは除外しています。

**3. 差分を確認する(何も変更しません)**

```sh
npm run build
rsync -avzn --itemize-changes --exclude='.DS_Store' --exclude='/.htaccess' \
  -e 'ssh -p <SSH_PORT>' deploy/ <SSH_USER>@<SSH_HOST>:<PUBLIC_HTML>/
```

`-n` がドライラン(確認のみ)です。`deploy/` の末尾の `/` は「中身を転送する」という意味なので、省略しないでください。

**4. 問題がなければアップロードする**

```sh
rsync -avz --exclude='.DS_Store' --exclude='/.htaccess' \
  -e 'ssh -p <SSH_PORT>' deploy/ <SSH_USER>@<SSH_HOST>:<PUBLIC_HTML>/
```

> `--delete` は付けないでください。`public_html` にある別のファイルまで削除するおそれがあります。古い `_astro/` のファイルが残っても表示には影響しません。整理したいときは、バックアップを取ったうえで、対象を確認してから個別に削除します。

### 元に戻すとき

1でバックアップしたファイルを展開します。

```sh
ssh -p <SSH_PORT> <SSH_USER>@<SSH_HOST> \
  'tar xzf ~/backup-public_html-<日時>.tar.gz -C <PUBLIC_HTML>'
```

### `.htaccess` について(任意)

サイトは `.htaccess` がなくても動きます。ルートの `.htaccess` は既存の設定を壊さないよう、あえて同梱していません。次の2つを使いたい場合は、[xserver/htaccess.example](xserver/htaccess.example) を見ながら、サーバーの `.htaccess` に**追記**してください。

- 独自の404ページ(`/404.html`)を表示する
- `http://` を `https://` へ転送する(2026年11月の時点で、naga-t.jp の `http://` は転送されていません)

`deploy/_astro/.htaccess` は `_astro/` の中だけに効く長期キャッシュの設定で、そのままアップロードして構いません。

## 5. 公開後の確認

ブラウザの開発者ツールを開いて確認します。

**URLの直接アクセス** — 次のURLをアドレスバーに直接入力し、再読み込みもします。

- `https://naga-t.jp/about/` が表示される
- `https://naga-t.jp/about` が `/about/` へ転送される
- `https://naga-t.jp/projects/tabisync/` が表示される

コマンドでも確認できます。

```sh
curl -I https://naga-t.jp/about/   # 200 になること
curl -I https://naga-t.jp/about    # 301 になり、Location が /about/ であること
```

**確認項目**

- [ ] Home、Projects、Research、About、Contact と、各プロジェクト詳細が表示される
- [ ] ネットワークタブに404やコンソールエラーがない
- [ ] フォント、画像、ファビコンが表示される
- [ ] ヒーローの文字が下から順に現れ、その後に線が伸びる
- [ ] トップページの再生ボタンで曲が流れる(`curl -I https://naga-t.jp/audio/nagat-theme.mp3` が 200 で、`Accept-Ranges: bytes` と `Content-Type: audio/mpeg` を返す)
- [ ] スマートフォンでメニューが開閉でき、横スクロールが出ない
- [ ] `https://naga-t.jp/robots.txt` と `https://naga-t.jp/sitemap-index.xml` が開ける
- [ ] SNSに URL を貼ると共有画像が出る(SNS側のキャッシュが残る場合があります)
- [ ] 古い表示のままなら強制再読み込みする。naga-t.jp ではmod_pagespeedが有効で、表示が崩れる場合はサーバーパネルで設定を確認する

## 6. 文章を編集する

サイトに表示される文字は、すべて `src/content/` のMarkdownファイルにあります。コードを触らずに編集できます。

### 基本の流れ

```sh
npm run dev                  # http://localhost:4321/ を開く
# Markdownを編集して保存すると、ブラウザにすぐ反映されます
npx astro dev stop           # 確認が終わったら止める
npm run build && npm run verify
# 問題なければ、4章の手順Bの 3(差分確認)→ 4(アップロード)
```

### どのファイルを開くか

日本語と英語で同じ名前のファイルがあります。下の `<ja|en>` は、日本語なら `ja`、英語なら `en` です。**片方を変えたら、もう片方も同じように変えてください。**

| 変えたい内容 | ファイル |
| --- | --- |
| 全ページ共通(サイト名、メニュー、切り替えボタン、タブのタイトル) | `src/content/pages/<ja\|en>/site.md` |
| トップ(はじめまして、Aboutの一言、ヒーローの単語、曲名、ボタンの文字) | `src/content/pages/<ja\|en>/home.md` |
| About(プロフィール、経歴、受賞、技術スタック、趣味) | `src/content/pages/<ja\|en>/about.md` |
| Research | `src/content/pages/<ja\|en>/research.md` |
| Contact(案内文、外部リンク) | `src/content/pages/<ja\|en>/contact.md` |
| Projectsの説明文、詳細ページ共通の見出しやボタンの文字 | `src/content/pages/<ja\|en>/projects.md` |
| 各プロジェクト | `src/content/projects/<ja\|en>/<名前>.md` |
| ページが見つからないとき(404) | `src/content/pages/<ja\|en>/404.md` |

### 日本語と英語の切り替え

- ヘッダーのボタンで、同じページの別の言語へ移動します。日本語は `/about/`、英語は `/en/about/` です。スマートフォンではメニューの中にあります。
- 英語ページ内のリンクは `/en/` から書きます(例: `[Meelyze+](/en/projects/meelyze-plus/)`)。
- 片方の言語のページだけを作ると、`npm run verify` がエラーで知らせます。
- 英語版の「ページが見つからない」は日本語版と同じページに並べて表示します(サーバーのエラーページは1つのためです)。

### ファイルの書き方

上の `---` で挟まれた部分(一覧や見出しに使う短い項目)と、その下の本文に分かれています。

```markdown
---
title: TabiSync
status: 公開・運用中
---

## 課題

本文はここに書きます。
```

本文で使える書き方は次のとおりです。

| 書き方 | 表示 |
| --- | --- |
| `## 見出し` | 罫線付きの見出し |
| `### 小見出し` | 太字の小見出し |
| `**太字**` | 太字 |
| `- 項目` | 箇条書き |
| `[文字](https://example.com)` | リンク |
| `> 文章` | 注意書き(小さめのグレー) |
| 空行 | 段落の区切り |

Aboutの経歴や受賞は表で書いています(`ja/about.md`、`en/about.md`)。行を足すときは、上の行をコピーして書き換えてください。経歴の表は `<div class="timeline">` で囲まれていて、線でつないだ年表として表示されます。この2行(`<div class="timeline">` と `</div>`)とその前後の空行は消さないでください。

```markdown
| 2026 | JPHACKS 2026 沖縄ブロック **スポンサー賞** |
```

### プロジェクトを増減する

- **追加**: `src/content/projects/ja/` と `en/` の両方に、既存ファイルをコピーして同じ名前で作ります。ファイル名がURLになります(`new-app.md` → `/projects/new-app/` と `/en/projects/new-app/`)。
- **非公開**: `published: false` にすると、一覧にも詳細ページにも出ません。`true` に戻せば再掲載できます。日本語と英語で揃えてください。
- **トップに表示**: `featured: true` にします。
- **並び順**: `order` の数字が小さい順です。
- **サムネイル**: `art` で図形を選びます(`route` / `matrix` / `scan` / `wave` / `panes` / `shafts` / `split`)。
- **実画面**: 画像を `src/assets/projects/` に置き、`screenshot` の `src` にパスを書きます(`ja/tabisync.md` が例です)。

### 外部リンクとメール

`src/content/pages/<ja|en>/contact.md` に書きます。ここを変えると、その言語のContact、About、トップページに反映されます。

- **リンクの追加**: `links:` の4行をコピーして書き換えます。Aboutではアイコンだけを表示します。`label` に対応するアイコンは `src/components/SocialIcon.astro` にあり、ない場合は矢印になります。`showOnHome: true` を付けると、トップページのContactにも表示されます。
- **メールの公開**: `src/content/pages/ja/contact.md` の `# email: hello@example.com` の先頭の `# ` を消してアドレスを書きます。両方の言語に表示されます。今は非公開です。

### エラーが出たら

項目が抜けていたり、項目名を書き間違えたりするとビルドが止まり、原因のファイルと項目が表示されます。次の例は `home.md` の `musicTitle` が抜けているという意味です。

```text
[InvalidContentEntryDataError] home → home data does not match collection schema.
  musicTitle: Required
```

`Unrecognized key` と出たときは、項目名の書き間違いです。

本文で半角の `~` を文字として使うときは `\~` と書いてください。そのままだと取り消し線になります(`npm run verify` が知らせます)。

`---` の中で `:` や `"` を文字として使うときは、値全体を `"..."` で囲んでください。数字だけの値も同じです(`period: "2026"`)。

### Markdown以外の設定

| 変えたい内容 | ファイル |
| --- | --- |
| トップページの曲 | `public/audio/` に置き、`src/data/site.ts` の `src` と `duration`(秒)を変更。曲名は日本語と英語の `home.md` の `musicTitle` |
| プロフィール写真 | `src/assets/photos/nagat.jpg` |
| 色、余白、文字サイズ | `src/styles/tokens.css` |
| サムネイルの図形 | `src/components/ProjectArt.astro` |
| アイコン、ファビコン | ルートの `icon-naga-t.png` を差し替えて `npm run assets`(縮小のみ) |
| OGP画像(`public/og-image.jpg`) | `npm run assets:og`(Chromeが必要) |

ボタンの読み上げ用の説明(「ミュート」など)はコード側にあります。画面に表示される文字ではないので、普段は編集の必要はありません。

未確認の数値、成果、受賞は掲載しない方針です。

## ディレクトリ

```text
src/content/     各ページの文章(Markdown。ja/ と en/ に分かれています。編集するのは主にここ)
src/pages/       ページとルーティング(日本語と英語の両方を getStaticPaths で生成)
src/layouts/     共通レイアウト、SEOのメタ情報
src/components/  ヘッダー、ヒーロー、カードなど
src/data/        技術的な設定(サイトのURL、曲のファイル)
src/lib/         ロゴの座標、モールス符号の計算
src/styles/      デザイントークンと共通CSS
src/scripts/     メニュー、マーキー、GSAP
src/assets/      フォント、プロフィール写真、プロジェクトの画面
public/          そのままコピーされるファイル
scripts/         検証、素材生成
xserver/         サーバー設定の見本(ビルドに含まれません)
deploy/          ビルド結果(Git管理外)
```

デザインの決まりごとは [design.md](design.md) にまとめています。

## 設計メモ

- **ページ遷移**: CSSの `@view-transition` を使います。JavaScriptが不要で、ページごとにスクリプトが読み直されるのでGSAPが二重に初期化されません。未対応のブラウザでは通常の遷移になります。`ClientRouter` は導入していません。
- **GSAP**: 動きが許可されている場合のみ動的に読み込みます。`gsap.matchMedia` で管理しているので、「動きを減らす」設定に切り替えると、アニメーションとScrollTriggerはすべて破棄されます。
- **JavaScriptなし**: 全ページの閲覧とページ遷移ができます。ナビはヘッダーに並び、曲はファイルへの直接リンクになります。
- **音楽**: 自動再生はせず、クリックするまでファイルを読み込みません。繰り返しボタンは初期状態がオフで、オンにすると曲の最後から先頭に戻って流れ続けます(設定はブラウザに保存)。ページを移動すると再生は止まります。波はWeb Audioのアナライザーで音を解析して動かし、停止中は表示しません。「動きを減らす」設定では動かさず、再生位置を示す1段だけを表示します。

## クレジット

- フォント: [Archivo](https://github.com/Omnibus-Type/Archivo)、[JetBrains Mono](https://github.com/JetBrains/JetBrainsMono)(いずれもSIL Open Font License 1.1)
- アニメーション: [GSAP](https://gsap.com/)(GreenSock Standard License)
