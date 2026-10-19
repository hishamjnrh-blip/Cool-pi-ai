# Android AI App UI Update Plan

## Overview

This repo is currently a backend AI service with Telegram integration. To improve the mobile user experience, the next phase should be a native Android app layer that connects to the existing API.

## Current State

- Backend API available at `/api/chat`
- Telegram bot supported for chat conversations
- SQLite memory layer for saved chat history
- AI provider integration via OpenAI-compatible endpoint

## Recommended Android App Architecture

### Technology stack

- Kotlin
- Jetpack Compose
- Material 3
- ViewModel + StateFlow
- Retrofit or Ktor for HTTP
- Room for local message cache
- Navigation Compose

### Core screens

1. Welcome screen
   - app branding
   - language selection
   - quick actions

2. Chat screen
   - user and assistant message bubbles
   - input field and send button
   - typing indicator
   - top app bar with conversation title

3. History screen
   - recent conversations list
   - search and filter
   - delete/reset session

4. Settings screen
   - language preference
   - dark mode
   - API base URL / local dev mode
   - notifications and accessibility

## Interface Improvements

### Layout

- cleaner message bubble styling
- rounded cards and spacing system
- high-contrast dark mode
- responsive layout for phones and tablets

### UX improvements

- quick action buttons: Ask, Translate, Summarize
- message resend button on failure
- empty state for new conversations
- app branding and onboarding flow
- better permissions and voice input support

### Accessibility

- text scaling support
- large touch targets
- proper contrast and semantics
- keyboard navigation for settings and forms

## API Improvements for Mobile

The backend should expose a mobile-friendly payload contract:

```json
{
  "success": true,
  "chatId": "abc123",
  "reply": "Hi! How can I help?",
  "timestamp": "2026-10-19T12:00:00Z",
  "language": "en",
  "historyLength": 3
}
```

### Suggested endpoints

- `POST /api/chat`
  - accepts `message`, `chatId`, `language`, `history`
- `GET /api/chat/history/:chatId`
  - fetch previous conversation
- `POST /api/chat/reset`
  - clear conversation for a session

## Backend Enhancements

- normalize message history format for mobile clients
- detect local language preference
- support short answer mode for app UI
- add robust retry and timeout handling
- sanitize output for chat rendering
- include error state codes for UI display

## Suggested Next Milestone

The next step is to create a mobile-ready app shell that consumes the backend, then refine the UI based on the following priorities:

1. chat experience
2. dark theme and accessibility
3. histories and settings
4. performance and reliability
5. final polish and branding

## Expected Outcome

A modern Android AI assistant app with:

- simple onboarding
- excellent chat UX
- local language support
- clean, professional interface
- robust backend connection
