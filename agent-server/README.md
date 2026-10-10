# Hayat AI agent server

The API key belongs in `agent-server/.env` only. Copy `.env.example` to `.env`, then set `OPENAI_API_KEY`. Keep `.env` private and out of frontend `VITE_` variables.

Run the server from this directory with `npm start`. The Vite development server proxies `/api` and `/health` to `http://127.0.0.1:8787`.

The current backend integrates OpenAI Responses API with web search and the tools in `tools/agent-tools.js`. Image generation, video generation, screen capture, multi-provider routing, and background microphone service are not implemented. The chat API returns a completed response as JSON; it does not stream tokens.

For Android, enter the reachable backend base URL in **Settings** in Hayat AI, or set `VITE_AGENT_API_URL` before the build. Use HTTPS for a remote host. A phone's `127.0.0.1` points to the phone itself; it will not reach a server running on another computer. Add the app's exact origin to `CORS_ORIGINS` on the server. The current agent API has no user authentication, so keep it bound to loopback or an isolated trusted network and do not expose it to the public internet. Do not put provider keys in the Android app or `VITE_` variables.

Chat history is stored on the device in local storage. The agent's working context is held in server memory and resets when the server restarts or the conversation is cleared.

Voice input uses browser speech recognition when available and requests access only after tapping the microphone. Spoken replies use system/browser speech synthesis. Browser speech recognition may be unavailable in Android WebView. Continuous/background voice and Android MediaProjection screen capture need additional native Android implementations and are not claimed by this app.

The WhatsApp draft action opens a prefilled conversation for the user to review and send. Hayat does not send it automatically.

Run frontend checks from the project root with `npm test` and `npm run build`. Run backend syntax checks from the project root with `node --check agent-server/server.js` and `node --check agent-server/tools/agent-tools.js`.
