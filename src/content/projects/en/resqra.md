---
title: Resqra
summary: A desktop app that handles research files, tasks, progress and AI agents on one screen.
overview: A local-first desktop application that handles a research project's files, tasks, progress, AI agents and change history on one screen.
format: Desktop App
team: Personal project
status: MVP in development
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

## Problem

Research tends to keep files, tasks, progress, AI conversations and change history in separate places.

## Goal

To bring what research needs onto one screen while keeping research files stored locally as a rule.

## Design and implementation

### Process separation

Main, Preload and Renderer are separated, so the Renderer cannot use Node.js APIs directly.

### Runtime validation of IPC

IPC input and output are validated with Zod, and paths are checked against the project root.

### Handling secrets

A credential layer uses Electron's safeStorage, with a policy of not storing API keys as plain text in research projects.

## Results

- Implemented a three-pane UI, registering and switching projects, and the IPC foundation.
- Markdown editing, AI agent integration, checkpoints and history are planned.
