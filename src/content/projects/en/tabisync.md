---
title: TabiSync
summary: A travel itinerary service that shares your plans and places to visit by URL, with no sign-up.
overview: A web service that gathers your itinerary, places to visit, packing list and notes into one travel plan and shares it by URL. You can plan a trip while asking an AI concierge for advice.
format: Web Service
team: Personal project
status: Live
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
  - label: Visit the service
    href: https://tabisync.com
  - label: GitHub
    href: https://github.com/naga-T28/tabisync
screenshot:
  src: ../../../assets/projects/tabisync.png
  alt: The TabiSync home page, with a Japanese headline about planning trips smartly with AI and itinerary screens on a laptop and a phone.
  orientation: landscape
art: route
order: 1
featured: true
published: true
---

## Problem

When several people travel together, places to visit, plans, packing lists and notes tend to scatter across map, messaging and note apps. Planning stalls, and on the day it is hard to check where to go next or whether the route is realistic.

## Goal

To gather everything a trip needs into one shared plan that all members can view and edit, supporting the whole trip from preparation to the day itself.

## Design and implementation

### Usable without an account

Companions can join with just the shared URL, and a password can be added when needed. This keeps the effort of getting started low, even among friends.

### Django, chosen with AI features in mind

I chose it because it works well with Python libraries and external APIs, and includes authentication and an admin site out of the box.

### AI suggestions that follow the context

Suggestions come from the GPT API, based on the contents of the plan. Because the feature handles free user input, I considered safety and operational risk as well as output quality.

### A production setup with Docker and Nginx

Containers keep the runtime consistent and narrow the gap with the development environment. In production, Nginx works as a reverse proxy.

## Results

- Live at tabisync.com. I handle everything from development through operation.
- Implemented sharing of itineraries, places to visit, packing lists and notes, along with the AI concierge.
