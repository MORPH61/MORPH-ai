# MORPH AI

MORPH is a Turkish chat interface powered by OpenRouter's `nvidia/nemotron-3-ultra-550b-a55b:free` model.

## Run locally

1. Install Node.js 20 or later.
2. Create a local `.env` file containing `OPENROUTER_API_KEY=your_key`.
3. Run `npm start` and open `http://localhost:8000`.

The `.env` file is ignored by Git. Never add API keys to the browser code or commit them.

## Deploy to Render

1. Push this repository to GitHub.
2. In Render, create a Web Service from the repository or use **New > Blueprint** to apply `render.yaml`.
3. Add `OPENROUTER_API_KEY` in the service's Environment settings. Render keeps this value outside the source repository and injects it at runtime.
4. Deploy and open the service's `onrender.com` URL.

The server binds to Render's `PORT`, listens on `0.0.0.0`, and exposes `/api/health` for deployment checks. It applies a small per-IP request limit to reduce accidental API usage.

## Project files

- `chat.html` — responsive chat interface and browser-local conversation history.
- `server.js` — local server and server-side OpenRouter proxy.
- `render.yaml` — Render Blueprint configuration.
- `package.json` — Node start command and runtime requirement.
- `package-lock.json` — reproducible dependency install (the app uses Node built-ins only).

