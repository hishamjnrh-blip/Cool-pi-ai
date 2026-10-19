# Cool-pi-ai

Cool pi AI — a reusable AI backend and API with Telegram bot integration.

## Current status

This project is a backend-first AI service and not yet a full Android app. It already exposes a chat API and Telegram bot flow, which makes it a strong foundation for a mobile client.

## Android app roadmap

The next improvement step is to build a polished Android interface on top of the existing API.

### Recommended stack

- Kotlin
- Jetpack Compose
- Material 3
- ViewModel + StateFlow
- Retrofit or Ktor
- Room for local chat caching

### Planned UI screens

- Welcome / onboarding
- AI chat screen
- History / recent conversations
- Settings / language preferences
- Dark mode and accessibility screen

### Interface improvements

- modern chat bubble layout
- typed indicator and loading states
- quick reply action chips
- better spacing and typography
- resizable text for accessibility
- clear error and retry UX
- session reset and history controls

### API updates needed for mobile

- richer response metadata
- chat session IDs
- history retrieval endpoint
- clear language preference support
- mobile-friendly response formatting

## Project direction

The repo should evolve into two connected layers:

1. Backend AI service (current repo)
2. Android app client (new mobile UI layer)

This keeps the AI logic centralized while delivering a better user experience on mobile.

## Local run

```bash
npm install
npm run dev
```

Then check health:

```bash
curl http://localhost:3000/api/health
```

## Mobile-ready next step

Focus on the chat experience first, then add settings, conversations, and polished interface improvements.
