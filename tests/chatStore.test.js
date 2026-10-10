import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVE_CONVERSATION_KEY, BACKEND_URL_KEY, CONVERSATIONS_KEY, createConversation, loadConversations, normalizeBackendUrl, saveConversations } from "../src/lib/chatStore.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("migrates the existing single-chat local storage without losing messages", () => {
  const storage = memoryStorage({
    hayat_session: "existing-session",
    hayat_messages: JSON.stringify([{ id: "m1", role: "user", text: "Hello", time: "10:00" }]),
  });
  const [conversation] = loadConversations(storage);
  assert.equal(conversation.id, "existing-session");
  assert.equal(conversation.sessionId, "existing-session");
  assert.equal(conversation.messages[0].text, "Hello");
});

test("round-trips multiple conversations and keeps storage keys separate", () => {
  const storage = memoryStorage();
  const conversations = [createConversation("chat-one"), createConversation("chat-two")];
  saveConversations(conversations, storage);
  assert.deepEqual(loadConversations(storage).map((item) => item.id), ["chat-one", "chat-two"]);
  assert.equal(storage.getItem(ACTIVE_CONVERSATION_KEY), null);
  assert.equal(storage.getItem(BACKEND_URL_KEY), null);
  assert.ok(storage.getItem(CONVERSATIONS_KEY));
});

test("allows HTTPS and local development loopback URLs", () => {
  assert.equal(normalizeBackendUrl("https://agent.example.test/"), "https://agent.example.test");
  assert.equal(normalizeBackendUrl("http://127.0.0.1:8787/"), "http://127.0.0.1:8787");
});

test("rejects remote plaintext URLs, embedded credentials, and query secrets", () => {
  assert.throws(() => normalizeBackendUrl("http://agent.example.test"), /Use HTTPS/);
  assert.throws(() => normalizeBackendUrl("https://user:password@agent.example.test"), /username or password/);
  assert.throws(() => normalizeBackendUrl("https://agent.example.test/?token=secret"), /query parameters/);
});
