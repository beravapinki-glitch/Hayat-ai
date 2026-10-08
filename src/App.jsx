import { useEffect, useRef, useState } from "react";
import "./App.css";

const SESSION_ID =
  localStorage.getItem("hayat_session") ||
  crypto.randomUUID();
const API_URL = (import.meta.env.VITE_AGENT_API_URL || "").replace(/\/$/, "");

localStorage.setItem(
  "hayat_session",
  SESSION_ID
);

function App() {
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("hayat_messages") || "[]"
      );
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const requestRef = useRef(null);

  const recognitionRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(
      "hayat_messages",
      JSON.stringify(messages)
    );
  }, [messages]);

  useEffect(() => () => {
    requestRef.current?.abort();
    recognitionRef.current?.abort?.();
    window.speechSynthesis?.cancel();
  }, []);

  function addMessage(role, text) {
    setMessages((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        role,
        text,
        time: new Date().toLocaleTimeString()
      }
    ]);
  }

  async function sendMessage(text = input) {
    const message = text.trim();

    if (!message || loading) {
      return;
    }

    setInput("");
    setVoiceError("");

    addMessage(
      "user",
      message
    );

    setLoading(true);

    try {
      const controller = new AbortController();
      requestRef.current = controller;
      const response = await fetch(
        `${API_URL}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sessionId: SESSION_ID,
            message
          }),
          signal: controller.signal
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "Agent request failed"
        );
      }

      addMessage("assistant", data.text || "कोई जवाब नहीं मिला।");

      speak(data.text || "");

    } catch (error) {
      if (error.name !== "AbortError") {
        const message = error.message === "Failed to fetch"
          ? "Agent server से कनेक्शन नहीं हुआ। Server चालू करें और Android build के लिए VITE_AGENT_API_URL सेट करें।"
          : error.message;
        addMessage("assistant", `कनेक्शन में समस्या: ${message}`);
      }
    } finally {
      requestRef.current = null;
      setLoading(false);
    }
  }

  function stopGeneration() {
    requestRef.current?.abort();
  }

  function speak(text) {
    if (!text) {
      return;
    }

    if (!window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();
    setSpeaking(false);

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = "hi-IN";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(
      utterance
    );
  }

  function startVoice() {
    setVoiceError("");
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("इस Android WebView/Browser में speech recognition उपलब्ध नहीं है। Text input इस्तेमाल करें।");
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = navigator.language?.toLowerCase().startsWith("hi") ? "hi-IN" : "en-IN";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event) => {
      setListening(false);
      setVoiceError(event.error === "not-allowed"
        ? "Microphone permission नहीं मिली। Android app permissions में microphone access चालू करें।"
        : `Voice input उपलब्ध नहीं है (${event.error || "unknown error"})।`);
    };

    recognition.onresult = (event) => {
      const text =
        event.results[0][0].transcript;

      setInput(text);

      setTimeout(() => {
        sendMessage(text);
      }, 100);
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
      setVoiceError("Voice input शुरू नहीं हो सका। कृपया दोबारा कोशिश करें।");
    }
  }

  function clearChat() {
    stopGeneration();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    fetch(`${API_URL}/api/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID })
    }).catch(() => {});
    setMessages([]);
    localStorage.removeItem(
      "hayat_messages"
    );
  }

  const quickCommands = [
    "मेरे लिए एक वेबसाइट बनाओ",
    "आज की important news research करो",
    "एक Android app का structure बनाओ",
    "मेरे लिए Python code लिखो",
    "WhatsApp message तैयार करो",
    "मेरे लिए एक project plan बनाओ"
  ];

  return (
    <div className="app">

      <header className="header">

        <div>
          <div className="logo">
            HAYAT AI
          </div>

          <div className="status">
            ● Private assistant
          </div>
        </div>

        <button
          className="clear"
          onClick={clearChat}
        >
          Clear
        </button>

      </header>

      <main className="chat">

        {messages.length === 0 && (
          <div className="welcome">

            <div className="robot">
              🤖
            </div>

            <h1>
              Hello, मैं Hayat AI हूँ
            </h1>

            <p>
              Voice या text में command दो।
            </p>

            <div className="quick-grid">

              {quickCommands.map(
                (command) => (
                  <button
                    key={command}
                    onClick={() =>
                      sendMessage(command)
                    }
                  >
                    {command}
                  </button>
                )
              )}

            </div>

          </div>
        )}

        {messages.map(
          (message) => (
            <div
              key={message.id}
              className={
                "message-row " +
                message.role
              }
            >
              <div
                className={
                  "bubble " +
                  message.role
                }
              >
                <div>
                  {message.text}
                </div>

                <small>
                  {message.time}
                </small>
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="message-row assistant">
            <div className="bubble assistant">
              <div className="typing">
                Hayat सोच रहा है...
              </div>
            </div>
          </div>
        )}

      </main>

      <div className="composer">

        <button
          className={
            listening
              ? "voice listening"
              : "voice"
          }
          onClick={startVoice}
          aria-label={listening ? "Listening" : "Start voice input"}
        >
          🎙️
        </button>

        <input
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          placeholder={listening ? "सुन रहा हूँ… / Listening…" : "Hayat को command दो..."}
          aria-label="Message Hayat AI"
        />

        {loading ? (
          <button className="send" onClick={stopGeneration} aria-label="Stop generation">■</button>
        ) : (
          <button className="send" onClick={() => sendMessage()} disabled={!input.trim()} aria-label="Send message">➤</button>
        )}

        {speaking && <button className="clear" onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }} aria-label="Stop speaking">Stop voice</button>}

      </div>

      {voiceError && <div className="voice-error" role="status">{voiceError}</div>}

    </div>
  );
}

export default App;
