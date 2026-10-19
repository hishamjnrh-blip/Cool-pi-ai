# Cool-pi-ai

Cool pi AI — a reusable AI backend and API with Telegram bot integration.

## Mobile-ready update

This project now includes a more app-friendly API contract for Android and web clients.

### New API features

- `POST /api/chat` accepts an optional `chatId` and returns richer response metadata.
- `GET /api/chat/history/:chatId` returns the saved conversation for a device/session.
- `POST /api/chat/reset` clears a device/session conversation.

### Example request

```json
{
  "chatId": 12345,
  "message": "How are you today?",
  "language": "en",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi!" }
  ]
}
```

### Example response

```json
{
  "success": true,
  "reply": "Hello! I am here to help.",
  "chatId": 12345,
  "language": "en",
  "historyLength": 2,
  "timestamp": "2026-10-19T12:00:00.000Z"
}
```

## Suggested Android interface improvements

- Chat bubbles with modern Material 3 styling
- New chat and session list screen
- Language toggle (English / Hausa / Pidgin)
- Typing indicator and loading states
- Dark mode and accessible contrast
- Clear conversation and history management
- Retry and error handling for flaky network conditions

## Running locally

```bash
npm install
npm run dev
```

Then open the health check:

```bash
curl http://localhost:3000/api/health
```
