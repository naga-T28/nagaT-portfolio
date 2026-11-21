---
title: TabiSync
summary: 登録不要で、旅程や行きたい場所をURLで共有できる旅行しおりサービス。
overview: 旅程、行きたい場所、持ち物、メモをひとつのしおりにまとめ、URLで共有できるWebサービスです。AIコンシェルジュに相談しながら旅行の計画を進められます。
format: Web Service
team: 個人開発
status: 公開・運用中
period: 2025 —
stack:
  - Python
  - Django
  - PostgreSQL
  - Docker
  - Nginx
  - GPT API
  - SCSS
  - JavaScript
links:
  - label: サービスを見る
    href: https://tabisync.com
  - label: GitHub
    href: https://github.com/naga-T28/tabisync
screenshot:
  src: ../../../assets/projects/tabisync.png
  alt: TabiSyncのトップページ。「旅の計画を、AIと一緒にスマートに。」という見出しと、PCとスマートフォンのしおり画面。
  orientation: landscape
art: route
order: 1
featured: true
published: true
---

## 課題

複数人での旅行では、行きたい場所や予定、持ち物、メモが地図アプリやメッセージアプリ、メモアプリに分散しがちです。計画が進みにくく、当日も次の行き先や移動の無理のなさを確認しづらくなります。

## 目的

旅行に必要な情報を1つのしおりにまとめ、メンバー全員で共有・編集できるようにして、準備から当日の行動までを一貫して支えること。

## 設計・実装上の工夫

### アカウント登録なしで使える設計

共有URLだけで同行者が参加でき、必要に応じてパスワードもかけられます。友人同士でも使い始めるまでの手間を減らしました。

### AI機能を見据えたDjango採用

Pythonのライブラリや外部APIと連携しやすいこと、認証や管理画面が標準で揃うことから選びました。

### 文脈に沿ったAI提案

しおりの内容をもとにGPT APIで提案します。任意の入力を扱う機能のため、生成品質だけでなく安全性や運用時のリスクも考慮しました。

### DockerとNginxによる本番構成

実行環境をコンテナで揃えて開発環境との差を小さくし、本番ではNginxをリバースプロキシとして使っています。

## 成果

- tabisync.com で公開し、開発から運用まで一貫して担当しています。
- 旅程・行きたい場所・持ち物・メモの共有と、AIコンシェルジュを実装しました。
