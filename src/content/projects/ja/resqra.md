---
title: Resqra
summary: 研究のファイル、タスク、進捗、AIエージェントを一つの画面で扱うデスクトップアプリ。
overview: 研究プロジェクトのファイル、タスク、進捗、AIエージェント、変更履歴を一つの画面で扱う、ローカルファーストのデスクトップアプリケーションです。
format: Desktop App
team: 個人開発
status: MVP開発中
period: 2026 —
stack:
  - TypeScript
  - Electron
  - React
  - Zod
  - Playwright
links:
  - label: GitHub
    href: https://github.com/naga-T28/Resqra
art: panes
order: 6
featured: false
published: false
---

## 課題

研究では、ファイルやタスク、進捗、AIとのやり取り、変更履歴を別々の場所で管理しがちです。

## 目的

研究に必要な情報を一つの画面に集めつつ、研究ファイルは原則としてローカルに保存すること。

## 設計・実装上の工夫

### プロセス分離

Main、Preload、Rendererを分離し、RendererからNode.js APIを直接使えないようにしています。

### IPCの実行時検証

IPCの入出力をZodで検証し、パスはプロジェクトルートを基準に検証します。

### 秘密情報の扱い

Electronの safeStorage を使う認証情報基盤を用意し、APIキーを研究プロジェクトに平文で保存しない方針です。

## 成果

- 3ペインUI、プロジェクトの登録と切り替え、IPC基盤を実装しました。
- Markdown編集、AIエージェント連携、チェックポイントや履歴は今後実装します。
