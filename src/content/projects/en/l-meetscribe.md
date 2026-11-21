---
title: L Meetscribe
summary: An Obsidian plugin that records meetings from a note and transcribes them on your own Mac.
overview: An Obsidian plugin that records a meeting from an lms block in a note and transcribes it on your own Mac. When recording stops, it summarizes with the OpenAI API or Ollama on the same Mac.
format: Obsidian Plugin
team: Personal project
status: Prototype
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

## Problem

Sometimes meeting audio should not be sent outside, yet recording, transcribing and summarizing in separate tools takes effort.

## Goal

To complete recording, transcription and summarizing inside a note, without the audio leaving your Mac.

## Design and implementation

### Recording yourself and the other side separately

The microphone and playback audio are recorded separately, so speakers are labeled as me and them.

### Local transcription

whisper.cpp does the processing. Audio is not sent outside and is deleted once transcription finishes.

### Never overwriting what you wrote

It writes the summary, the transcript and the lms block in that order, and does not overwrite anything you edited by hand.

### Choosing the summarizer explicitly

You choose OpenAI or Ollama. If it is unavailable, the summary is skipped, and it never switches to the other automatically.

## Results

- Published on GitHub under the MIT License.
- Includes a setup script and unit tests.
