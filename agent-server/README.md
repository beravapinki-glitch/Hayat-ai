# Hayat AI agent server

The API key belongs in `agent-server/.env` only. Copy `.env.example` to `.env`, then set `OPENAI_API_KEY`. Keep `.env` private and out of frontend `VITE_` variables.

Run the server from this directory with `npm start`. The Vite development server proxies `/api` and `/health` to `http://127.0.0.1:8787`.

For an Android build, set `VITE_AGENT_API_URL` to the reachable base URL of this server before building and syncing. A phone's `127.0.0.1` points to the phone itself; it will not reach a server running on a different computer. Add the app's exact origin to `CORS_ORIGINS` on the server. The current agent API has no user authentication, so keep it bound to loopback or an isolated trusted network and do not expose it to the public internet.

Chat history is stored in the app's local storage. The agent's working context is held in server memory and resets when the server restarts.

The current Android project has no native foreground voice service or MediaProjection screen capture flow. Browser speech recognition may be unavailable in Android WebView; the app reports that limitation and keeps text chat available.
