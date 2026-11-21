---
title: Meelyze
summary: 日本語メニューを撮影し、含まれる可能性のあるアレルゲンを母語で確認できるiOSアプリ。
overview: 食物アレルギーや宗教・信条上の食事制限を持つ訪日旅行者が、日本語メニューを撮影して、含まれる可能性のあるアレルゲンや制限食材を母語で確認できるiOSアプリです。店員へ確認するための翻訳支援も備えます。
format: iOS App
team: 2名体制
status: 開発中
period: 2026 —
stack:
  - Swift
  - SwiftUI
  - Apple Vision
  - Apple Foundation Models
  - SwiftData
  - Translation Framework
links:
  - label: GitHub
    href: https://github.com/naga-T28/Meelyze
art: scan
order: 5
featured: false
published: false
---

## 課題

料理名からは食材を判断しにくいことがあります。たとえば沖縄料理のラフテーやミミガーは名前から豚肉料理とわかりにくく、ラードやかつおだしのような隠れ食材は料理名に現れません。

## 目的

注文前の最終確認を補助すること。何より、誤って「安全」と伝えないことを優先します。

## 設計・実装上の工夫

### LLMとルールの責務分担

LLMはメニューの理解と構造化に限定し、最終判定はDBと決定論的なRule Engineで行います。

### 安全側に倒す判定

「含まれない」というLLMの推論は単独で根拠にせず、解決できない要素があれば「判定不可」にします。

### 端末内での処理

Apple VisionのOCR、端末内LLM、ローカルDBを組み合わせた構成です。

## 成果

- MVPの開発を進めています。App Storeでは公開していません。

> 注文前の確認を補助するツールであり、摂食の安全を保証するものではありません。
