---
title: Meelyze+
summary: A web app for visitors to Japan that helps them understand menus and check with restaurant staff.
overview: A web app that helps visitors to Japan with food allergies or dietary restrictions enjoy Japanese food, by supporting them in understanding menus and checking with staff. It is published as a JPHACKS submission repository.
format: Web App
team: Team project
status: Demo available
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
  - label: View the demo
    href: https://meelyze-plus.vercel.app/
  - label: GitHub
    href: https://github.com/jphacks/ok_2611
screenshot:
  src: ../../../assets/projects/meelyze-plus.png
  alt: The Meelyze+ onboarding screen, with a Japanese headline about wanting to try food but worrying about ingredients and an illustration of a person studying a menu.
  orientation: portrait
art: matrix
order: 2
featured: true
published: true
---

## Problem

For travelers with food allergies or dietary restrictions, it is not easy to understand ingredients from a Japanese menu or to ask staff about ingredients and cross-contact.

## Goal

To reduce the language barrier, support everything from understanding the menu to checking with staff on one smartphone, and widen the food choices available while traveling.

## Design and implementation

### Keeping AI and staff answers separate

AI suggestions and staff answers are handled separately and never merged into a single safety probability. "Don't know" and unconfirmed answers are never treated as evidence that an ingredient is absent.

### Checking on one smartphone

The traveler's screens are in English and the staff screens are in Japanese. The traveler hands over the same device and staff answer from four choices.

### Reusing answers, with older ones counting less

Answers for the same restaurant, dish and item are aggregated, and older answers carry less weight.

### Controlling what is public

Menu images are stored privately, and only aggregated answers that meet the publication conditions are shown. Answers are saved together, and resubmissions do not create duplicates.

## Results

- Won the Sponsor Award (dip Corporation) at JPHACKS 2026 Okinawa Block.
- Implemented the main screens, including menu analysis, staff confirmation, a map of nearby restaurants and browsing of public menus.
- The demo is published on Vercel. Verification of the full flow in the public environment is not complete.

> AI predictions and unverified staff answers do not guarantee safety or suitability for a dietary restriction. Always check with the restaurant before eating.
