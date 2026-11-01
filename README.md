# MORPH — Turkish AI Chat

MORPH is a Turkish chat website powered by OpenRouter's `nvidia/nemotron-3-ultra-550b-a55b:free` model.

**Live website:** [Open MORPH](https://morph-ai-pal4.onrender.com)

## Run locally

1. Install [Node.js 20 or later](https://nodejs.org/).
2. Create an API key in your OpenRouter account.
3. Open PowerShell in the MORPH folder and copy the example environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Open `.env` in Notepad and add your own API key:

   ```env
   OPENROUTER_API_KEY=paste_your_own_api_key_here
   ```

5. Install the required packages and start the server:

   ```powershell
   npm ci
   npm start
   ```

6. Open <http://localhost:8000> in your browser.

Git ignores the `.env` file. Never put your API key in `chat.html` or any other source file, and never upload it to GitHub.

## How the API key works

The browser sends messages to the MORPH server, and the server forwards them to OpenRouter. The API key stays on the server and is never sent to the browser. For the live website, the key is stored as the secret `OPENROUTER_API_KEY` environment variable on Render. Site visitors' requests use this key.

## Project files

- `chat.html` — chat interface and browser-stored conversation history.
- `server.js` — web server and server-side OpenRouter connection.
- `render.yaml` — Render deployment settings.
- `package.json` and `package-lock.json` — Node.js startup and install configuration.
- `.env.example` — blank example for the local API key setting.

