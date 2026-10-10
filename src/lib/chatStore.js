export const CONVERSATIONS_KEY = "hayat_conversations";
export const ACTIVE_CONVERSATION_KEY = "hayat_active_conversation";
export const BACKEND_URL_KEY = "hayat_backend_url";
export const VOICE_REPLY_KEY = "hayat_voice_replies";
export const VOICE_LANGUAGE_KEY = "hayat_voice_language";

export function createId() {
  return globalThis.crypto?.randomUUID?.() || `hayat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createConversation(id = createId()) {
  const now = new Date().toISOString();
  return {
    id,
    sessionId: id,
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function parseMessages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message) => message && ["user", "assistant"].includes(message.role) && typeof message.text === "string")
    .map((message) => ({
      id: typeof message.id === "string" ? message.id : createId(),
      role: message.role,
      text: message.text,
      time: typeof message.time === "string" ? message.time : "",
    }));
}

export function loadConversations(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage?.getItem(CONVERSATIONS_KEY) || "null");
    if (Array.isArray(saved) && saved.length) {
      const conversations = saved
        .filter((item) => item && typeof item.id === "string")
        .map((item) => ({
          ...createConversation(item.id),
          ...item,
          sessionId: typeof item.sessionId === "string" ? item.sessionId : item.id,
          title: typeof item.title === "string" ? item.title : "Conversation",
          messages: parseMessages(item.messages),
        }));
      if (conversations.length) return conversations;
    }

    const legacyMessages = parseMessages(JSON.parse(storage?.getItem("hayat_messages") || "[]"));
    if (legacyMessages.length) {
      const id = storage?.getItem("hayat_session") || createId();
      const firstPrompt = legacyMessages.find((message) => message.role === "user")?.text;
      const migrated = createConversation(id);
      migrated.title = firstPrompt ? firstPrompt.slice(0, 42) : "Previous conversation";
      migrated.messages = legacyMessages;
      return [migrated];
    }
  } catch {
    // Recover from malformed or unavailable local storage with a fresh chat.
  }

  return [createConversation()];
}

export function saveConversations(conversations, storage = globalThis.localStorage) {
  try {
    storage?.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch {
    // Chat remains usable for this session if storage is disabled or full.
  }
}

export function loadBackendUrl(storage = globalThis.localStorage, buildTimeUrl = "") {
  try {
    return storage?.getItem(BACKEND_URL_KEY) ?? buildTimeUrl.trim().replace(/\/$/, "");
  } catch {
    return buildTimeUrl.trim().replace(/\/$/, "");
  }
}

export function normalizeBackendUrl(value) {
  const input = String(value || "").trim();
  if (!input) return "";

  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a complete backend URL, such as https://agent.example.com.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Backend URLs must use HTTP or HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("Do not put a username or password in the backend URL.");
  }
  if (url.search || url.hash) {
    throw new Error("Backend URLs cannot contain query parameters or fragments.");
  }

  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol === "http:" && !isLoopback) {
    throw new Error("Use HTTPS for a remote backend. HTTP is allowed only for loopback development.");
  }

  return url.toString().replace(/\/$/, "");
}
