---
title: L Meetscribe
summary: Obsidianのノートから会議を録音し、手元のMacで文字起こしするプラグイン。
overview: Obsidianのノートに置いた lms ブロックから会議を録音し、手元のMacで文字起こしするプラグインです。録音を止めると、OpenAI APIまたは同じMacのOllamaで要約します。
format: Obsidian Plugin
team: 個人開発
status: 試作段階
period: "2026"
stack:
  - TypeScript
  - Swift
  - whisper.cpp
  - Ollama
  - OpenAI API
  - Obsidian Plugin API
links:
  - label: GitHub
    href: https://github.com/naga-T28/obsidian-l-meetscribe
art: wave
order: 4
featured: true
published: false
---

## 課題

会議の音声は外部へ送りたくないことがある一方で、録音、文字起こし、要約を別々のツールで行うと手間がかかります。

## 目的

録音から文字起こし、要約までをノートの中で完結させ、音声は手元のMacから外に出さないこと。

## 設計・実装上の工夫

### 自分と相手を分けて録音

マイクと再生音を別々に録音し、話者を「自分」「相手」で分けます。

### ローカルでの文字起こし

whisper.cppで処理し、音声は外部へ送らず、文字起こしが終われば削除します。

### 手で書いた部分を上書きしない

要約、文字起こし、lms ブロックの順にノートへ書き込み、手で編集した部分は上書きしません。

### 要約先を明示的に選ぶ

OpenAIかOllamaを選び、使えない場合は要約を省略します。別の実行先へは自動で切り替えません。

## 成果

- MITライセンスでGitHubに公開しています。
- セットアップスクリプトと単体テストを用意しています。
