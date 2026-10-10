import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import "./App.css";
import BottomNav from "./components/BottomNav.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import Header from "./components/Header.jsx";
import HistoryDrawer from "./components/HistoryDrawer.jsx";
import Icon from "./components/Icon.jsx";
import AgentPage from "./pages/Agent.jsx";
import HomePage from "./pages/Home.jsx";
import SettingsPage from "./pages/Settings.jsx";
import {
  ACTIVE_CONVERSATION_KEY,
  BACKEND_URL_KEY,
  VOICE_LANGUAGE_KEY,
  VOICE_REPLY_KEY,
  createConversation,
  createId,
  loadBackendUrl,
  loadConversations,
  normalizeBackendUrl,
  saveConversations,
} from "./lib/chatStore.js";

const BUILD_BACKEND_URL = (import.meta.env.VITE_AGENT_API_URL || "").trim().replace(/\/$/, "");

function readStored(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function requestUrl(base, path, isNative) {
  if (base) return base + path;
  return isNative ? null : path;
}

function getInitialBackendUrl() {
  try {
    return normalizeBackendUrl(loadBackendUrl(undefined, BUILD_BACKEND_URL));
  } catch {
    return "";
  }
}

function App() {
  const isNative = Capacitor.isNativePlatform();
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeId, setActiveId] = useState(() => readStored(ACTIVE_CONVERSATION_KEY));
  const activeConversation = conversations.find((conversation) => conversation.id === activeId) || conversations[0];
  const messages = activeConversation?.messages || [];
  const [view, setView] = useState("chat");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [backendUrl, setBackendUrl] = useState(getInitialBackendUrl);
  const [voiceReplies, setVoiceReplies] = useState(() => readStored(VOICE_REPLY_KEY, "true") !== "false");
  const [voiceLanguage, setVoiceLanguage] = useState(() => readStored(VOICE_LANGUAGE_KEY, "auto"));
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState({ state: "checking", configured: false, detail: "Checking your agent server" });
  const [toast, setToast] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const requestRef = useRef(null);
  const cancelReasonRef = useRef("");
  const recognitionRef = useRef(null);
  const toastTimerRef = useRef(null);
  const speechRef = useRef(null);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    try {
      if (activeConversation?.id) localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeConversation.id);
    } catch {
      // The current chat remains usable if browser storage is unavailable.
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(VOICE_REPLY_KEY, String(voiceReplies));
      localStorage.setItem(VOICE_LANGUAGE_KEY, voiceLanguage);
    } catch {
      // Voice preferences are optional and are not required for chat.
    }
  }, [voiceReplies, voiceLanguage]);

  const showToast = useCallback((message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 3600);
  }, []);

  const checkConnection = useCallback(async () => {
    const url = requestUrl(backendUrl, "/health", isNative);
    if (!url) {
      setConnection({ state: "unconfigured", configured: false, detail: "Add a reachable backend URL for this Android app." });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error("Agent server is unavailable.");
      setConnection({
        state: "online",
        configured: data.configured === true,
        detail: data.configured === true ? "OpenAI provider is configured on the server." : "Server is reachable, but the OpenAI provider needs setup.",
      });
    } catch {
      setConnection({ state: "offline", configured: false, detail: "Could not reach the agent server. Check its address and that it is running." });
    } finally {
      clearTimeout(timeout);
    }
  }, [backendUrl, isNative]);

  useEffect(() => {
    checkConnection();
    const timer = setInterval(checkConnection, 30000);
    return () => clearInterval(timer);
  }, [checkConnection]);

  useEffect(() => () => {
    requestRef.current?.abort();
    recognitionRef.current?.abort?.();
    window.speechSynthesis?.cancel();
    clearTimeout(toastTimerRef.current);
  }, []);

  const connectionStatus = useMemo(() => {
    if (connection.state === "online" && connection.configured) return { label: "Agent ready", tone: "online" };
    if (connection.state === "online") return { label: "Provider setup needed", tone: "warning" };
    if (connection.state === "unconfigured") return { label: "Set up backend", tone: "warning" };
    if (connection.state === "checking") return { label: "Connecting", tone: "checking" };
    return { label: "Agent offline", tone: "offline" };
  }, [connection]);

  function updateConversation(conversationId, transform) {
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? transform(conversation) : conversation));
  }

  function addMessage(conversationId, role, text) {
    const message = { id: createId(), role, text, time: new Date().toISOString() };
    updateConversation(conversationId, (conversation) => {
      const isFirstUserMessage = role === "user" && !conversation.messages.some((item) => item.role === "user");
      return {
        ...conversation,
        title: isFirstUserMessage ? text.trim().slice(0, 42) || "New conversation" : conversation.title,
        updatedAt: message.time,
        messages: [...conversation.messages, message],
      };
    });
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    speechRef.current = null;
    setSpeaking(false);
  }

  function speak(text) {
    if (!voiceReplies || !text || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLanguage === "auto" ? (navigator.language?.toLowerCase().startsWith("hi") ? "hi-IN" : "en-IN") : voiceLanguage;
    utterance.rate = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(value = input) {
    const text = String(value || "").trim();
    const conversation = activeConversation;
    if (!text || !conversation || requestRef.current) return;

    setInput("");
    setVoiceError("");
    addMessage(conversation.id, "user", text);

    const url = requestUrl(backendUrl, "/api/chat", isNative);
    if (!url) {
      addMessage(conversation.id, "assistant", "इस Android app के लिए backend URL सेट नहीं है। Settings में अपने निजी agent server का reachable HTTPS address जोड़ें।");
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    cancelReasonRef.current = "";
    const timeout = setTimeout(() => {
      cancelReasonRef.current = "timeout";
      controller.abort();
    }, 120000);
    setLoading(true);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: conversation.sessionId, message: text }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        const errorText = typeof data.error === "string" && data.error.length < 320 ? data.error : "Agent request failed. Check the server configuration and try again.";
        throw new Error(errorText);
      }
      const reply = typeof data.text === "string" && data.text.trim() ? data.text : "कोई जवाब नहीं मिला।";
      addMessage(conversation.id, "assistant", reply);
      speak(reply);
    } catch (error) {
      if (controller.signal.aborted) {
        if (cancelReasonRef.current === "user") addMessage(conversation.id, "assistant", "जवाब रोक दिया गया।");
        if (cancelReasonRef.current === "timeout") addMessage(conversation.id, "assistant", "जवाब में बहुत समय लगा। Connection जाँचकर फिर कोशिश करें।");
      } else {
        const message = error instanceof TypeError
          ? "Agent server से कनेक्शन नहीं हुआ। Settings में backend address और server status जाँचें।"
          : error.message || "Request पूरी नहीं हो सकी।";
        addMessage(conversation.id, "assistant", "कनेक्शन में समस्या: " + message);
      }
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
      setLoading(false);
      checkConnection();
    }
  }

  function stopGeneration(reason = "user") {
    if (!requestRef.current) return;
    cancelReasonRef.current = reason;
    requestRef.current.abort();
  }

  function startNewConversation() {
    stopGeneration("switch");
    recognitionRef.current?.abort?.();
    setListening(false);
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setInput("");
    setHistoryOpen(false);
    setView("chat");
  }

  function selectConversation(id) {
    stopGeneration("switch");
    recognitionRef.current?.abort?.();
    setListening(false);
    setActiveId(id);
    setInput("");
    setHistoryOpen(false);
    setView("chat");
  }

  function startVoice() {
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    setVoiceError("");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("इस Android WebView/Browser में speech recognition उपलब्ध नहीं है। Text input इस्तेमाल करें।");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage === "auto" ? (navigator.language?.toLowerCase().startsWith("hi") ? "hi-IN" : "en-IN") : voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      const detail = event.error === "not-allowed"
        ? "Microphone permission नहीं मिली। Android की permission prompt में access allow करें।"
        : "Voice input उपलब्ध नहीं है (" + (event.error || "unknown error") + ")।";
      setVoiceError(detail);
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput(transcript);
        setTimeout(() => sendMessage(transcript), 180);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
      setVoiceError("Voice input शुरू नहीं हो सका। कृपया दोबारा कोशिश करें।");
    }
  }

  function handleSaveBackend(value) {
    try {
      const normalized = normalizeBackendUrl(value);
      if (normalized) localStorage.setItem(BACKEND_URL_KEY, normalized);
      else localStorage.removeItem(BACKEND_URL_KEY);
      setBackendUrl(normalized || getInitialBackendUrl());
      showToast("Backend address updated.");
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  function handleVoiceReplies(enabled) {
    setVoiceReplies(enabled);
    if (!enabled) stopSpeaking();
  }

  function handlePrompt(prompt) {
    setView("chat");
    setHistoryOpen(false);
    setInput("");
    setTimeout(() => sendMessage(prompt), 0);
  }

  async function resetServerSession(sessionId) {
    const url = requestUrl(backendUrl, "/api/reset", isNative);
    if (!url) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  function askToClearCurrent() {
    setConfirmation({ type: "current", title: "Clear this conversation?", description: "This removes its saved messages from this device and resets its temporary agent context.", confirmLabel: "Clear conversation" });
  }

  function askToClearAll() {
    setConfirmation({ type: "all", title: "Clear all conversations?", description: "All saved chat history on this device will be removed. This cannot be undone.", confirmLabel: "Clear all chats" });
  }

  async function confirmDestructiveAction() {
    const action = confirmation?.type;
    setConfirmation(null);
    if (action === "current" && activeConversation) {
      const id = activeConversation.id;
      stopGeneration("switch");
      const reset = await resetServerSession(activeConversation.sessionId);
      updateConversation(id, (conversation) => ({ ...conversation, title: "New conversation", updatedAt: new Date().toISOString(), messages: [] }));
      showToast(reset ? "Conversation cleared." : "Local history cleared. The server was unavailable to reset its temporary context.");
    } else if (action === "all") {
      stopGeneration("switch");
      const resetResults = await Promise.all(conversations.map((conversation) => resetServerSession(conversation.sessionId)));
      const fresh = createConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
      setInput("");
      showToast(resetResults.every(Boolean) ? "All conversations cleared." : "Local history cleared. The server may still hold temporary context until it restarts.");
    }
  }

  async function copyMessage(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Response copied.");
    } catch {
      showToast("Clipboard access is unavailable in this browser.");
    }
  }

  const voiceState = listening ? "listening" : speaking ? "speaking" : loading ? "thinking" : "ready";
  const pageTitle = view === "chat"
    ? (activeConversation?.title === "New conversation" ? "New conversation" : activeConversation?.title || "Chat")
    : view === "tools" ? "Tools" : "Settings";

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="sidebar-brand"><div className="brand-mark">H</div><span>Hayat <b>AI</b></span></div>
        <button className="new-chat-button sidebar-new" onClick={startNewConversation}><Icon name="plus" size={18} /> New conversation</button>
        <nav className="side-nav" aria-label="Main navigation">
          {[{ id: "chat", label: "Chat", icon: "chat" }, { id: "tools", label: "Tools", icon: "tools" }, { id: "settings", label: "Settings", icon: "settings" }].map((item) => <button key={item.id} className={view === item.id ? "side-nav-item active" : "side-nav-item"} onClick={() => setView(item.id)}><Icon name={item.icon} size={18} /><span>{item.label}</span></button>)}
        </nav>
        <button className="sidebar-history-link" onClick={() => setHistoryOpen(true)}><Icon name="history" size={17} /> Recent conversations</button>
        <div className="sidebar-bottom"><span className={"sidebar-connection " + connectionStatus.tone}><i />{connectionStatus.label}</span><span className="private-label">Private assistant · on this device</span></div>
      </aside>

      <div className="app-main">
        <Header title={pageTitle} status={connectionStatus} onHistory={() => setHistoryOpen(true)} onNewChat={startNewConversation} onSettings={() => setView("settings")} />
        <div className="page-viewport">
          {view === "chat" && <HomePage title="Hello, I’m Hayat." messages={messages} input={input} setInput={setInput} loading={loading} voiceState={voiceState} voiceLanguage={voiceLanguage} onSend={sendMessage} onStop={() => stopGeneration("user")} onVoice={startVoice} onStopSpeaking={stopSpeaking} onCopy={copyMessage} onClear={askToClearCurrent} />}
          {view === "tools" && <AgentPage onPrompt={handlePrompt} onToast={showToast} />}
          {view === "settings" && <SettingsPage backendUrl={backendUrl} backendStatus={{ ...connectionStatus, configured: connection.configured, detail: connection.detail }} isNative={isNative} voiceReplies={voiceReplies} voiceLanguage={voiceLanguage} onSaveBackend={handleSaveBackend} onVoiceReplies={handleVoiceReplies} onVoiceLanguage={setVoiceLanguage} onTestConnection={checkConnection} onClearHistory={askToClearAll} />}
        </div>
        <BottomNav active={view} onChange={setView} />
      </div>

      <HistoryDrawer open={historyOpen} conversations={conversations} activeId={activeConversation?.id} onClose={() => setHistoryOpen(false)} onSelect={selectConversation} onNew={startNewConversation} />

      {confirmation && <ConfirmDialog title={confirmation.title} description={confirmation.description} confirmLabel={confirmation.confirmLabel} onCancel={() => setConfirmation(null)} onConfirm={confirmDestructiveAction} />}
      {voiceError && <div className="voice-error-toast" role="alert"><Icon name="mic" size={17} /><span>{voiceError}</span><button className="icon-button" onClick={() => setVoiceError("")} aria-label="Dismiss voice message"><Icon name="close" size={16} /></button></div>}
      {toast && <div className="toast-message" role="status" aria-live="polite"><Icon name="check" size={17} />{toast}</div>}
    </div>
  );
}

export default App;
