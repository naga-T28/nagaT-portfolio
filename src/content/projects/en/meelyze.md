---
title: Meelyze
summary: An iOS app that lets travelers photograph a Japanese menu and see possible allergens in their own language.
overview: An iOS app for visitors to Japan with food allergies or religious and belief-based dietary restrictions. It lets them photograph a Japanese menu and see possible allergens and restricted ingredients in their own language, and helps with translation for checking with staff.
format: iOS App
team: Team of two
status: In development
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

## Problem

Ingredients can be hard to judge from a dish's name. Okinawan dishes such as rafute and mimiga do not sound like pork, and hidden ingredients such as lard and bonito broth never appear in the name.

## Goal

To support the final check before ordering, with the top priority of never wrongly telling someone a dish is safe.

## Design and implementation

### Dividing work between the LLM and rules

The LLM is limited to understanding and structuring the menu. The final decision comes from a database and a deterministic rule engine.

### Decisions that lean toward safety

An LLM inference that something is absent is never used as evidence on its own. If anything remains unresolved, the result is "cannot determine".

### Processing on the device

The design combines OCR with Apple Vision, an on-device LLM and a local database.

## Results

- MVP development is in progress. The app is not on the App Store.

> This tool supports checking before ordering. It does not guarantee that food is safe to eat.
