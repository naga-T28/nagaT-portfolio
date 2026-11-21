---
title: Meelyze+
summary: メニューの理解と店員への確認を支援する、訪日旅行者向けのWebアプリ。
overview: 食物アレルギーや食事制限のある訪日旅行者が、日本の食文化を楽しめるように、メニューの理解と店員への確認を支援するWebアプリです。JPHACKSの提出リポジトリとして公開しています。
format: Web App
team: チーム開発
status: デモ公開中
period: "2026"
stack:
  - TypeScript
  - React Native
  - Expo
  - FastAPI
  - Python
  - Supabase
  - Gemini
  - Google Maps Platform
  - Upstash Redis
  - Vercel
links:
  - label: デモを見る
    href: https://meelyze-plus.vercel.app/
  - label: GitHub
    href: https://github.com/jphacks/ok_2611
screenshot:
  src: ../../../assets/projects/meelyze-plus.png
  alt: Meelyze+のオンボーディング画面。「食べてみたい。でも、食材が気になる。」という見出しと、メニューを見て悩む人物のイラスト。
  orientation: portrait
art: matrix
order: 2
featured: true
published: true
---

## 課題

食物アレルギーや食事制限のある旅行者にとって、日本語のメニューから原材料を理解し、使用食材や交差接触を店員に確認するのは簡単ではありません。

## 目的

言語の壁を減らし、メニューの理解から店員への確認までを1台のスマートフォンで支援して、旅行先での食体験の選択肢を広げること。

## 設計・実装上の工夫

### AIと店員の回答を分離

AIの候補と店員の回答を区別して扱い、単一の安全確率には合成しません。「わからない」や未確認を、含まれない根拠にもしません。

### 1台のスマートフォンで確認

利用者向けは英語、店員向けは日本語で表示し、同じ端末を渡して4択で回答してもらいます。

### 回答の再利用と時間減衰

同じ店舗・料理・確認項目の回答を集計し、古い回答ほど重みを小さくします。

### 公開情報の制御

メニュー画像は非公開で保管し、公開条件を満たす回答の集計のみを公開します。回答はまとめて保存し、再送による二重登録を防ぎます。

## 成果

- JPHACKS 2026 沖縄ブロックで、スポンサー賞(ディップ株式会社)を受賞しました。
- メニュー解析、店員確認、周辺店舗の地図、公開メニューの閲覧など、主要画面を実装しました。
- デモをVercelで公開しています。公開環境での全フローの検証は完了していません。

> AIの予測や未認証の店員回答は、安全性や食事制限への適合を保証するものではありません。食べる前には店舗への確認が必要です。
