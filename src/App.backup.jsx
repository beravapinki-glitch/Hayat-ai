import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const QUICK_COMMANDS = [
  "Hello",
  "What can you do?",
  "Tell me the time",
  "Tell me today's date",
  "Open YouTube",
  "Clear chat"
];

function getTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getDate() {
  return new Date().toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function assistantReply(text) {
  const t = text.toLowerCase().trim();

  if (!t) return "Please say or type something.";

  if (
    t.includes("hello") ||
    t.includes("hi") ||
    t.includes("hey") ||
    t.includes("नमस्ते") ||
    t.includes("हेलो")
  ) {
    return "Hello! मैं आपका voice और chat assistant हूँ। आप मुझसे बोलकर या लिखकर बात कर सकते हैं।";
  }

  if (
    t.includes("what can you do") ||
    t.includes("क्या कर सकते") ||
    t.includes("features")
  ) {
    return "मैं voice input ले सकता हूँ, text chat कर सकता हूँ, जवाब बोलकर सुना सकता हूँ, समय और तारीख बता सकता हूँ और कुछ basic commands चला सकता हूँ।";
  }

  if (
    t.includes("time") ||
    t.includes("समय") ||
    t.includes("टाइम")
  ) {
    return `अभी समय ${getTime()} है।`;
  }

  if (
    t.includes("date") ||
    t.includes("आज की तारीख") ||
    t.includes("तारीख")
  ) {
    return `आज ${getDate()} है।`;
  }

  if (
    t.includes("youtube") ||
    t.includes("यूट्यूब")
  ) {
    window.open("https://www.youtube.com", "_blank");
    return "YouTube खोलने की कोशिश कर रहा हूँ।";
  }

  if (
    t.includes("google") ||
    t.includes("गूगल")
  ) {
    window.open("https://www.google.com", "_blank");
    return "Google खोलने की कोशिश कर रहा हूँ।";
  }

  if (
    t.includes("clear chat") ||
    t.includes("चैट साफ") ||
    t.includes("chat clear")
  ) {
    return "__CLEAR_CHAT__";
  }

  return `आपने कहा: "${text}"\n\nअभी यह basic assistant mode में है। बाद में इसी जगह real AI backend जोड़कर इसे full AI agent बनाया जा सकता है।`;
}

export default function App() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("ai-agent-chat");
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 1,
              role: "assistant",
              text: "नमस्ते! 👋 मैं आपका AI Assistant हूँ। आप मुझे बोलकर या लिखकर command दे सकते हैं।",
              time: getTime()
            }
          ];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("ai-agent-chat", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    setSupported(true);

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "hi-IN";

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      setInput(result);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const clean = text.replace("__CLEAR_CHAT__", "");

    const utterance = new SpeechSynthesisUtterance(clean);

    utterance.lang = /[\u0900-\u097F]/.test(clean)
      ? "hi-IN"
      : "en-US";

    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = (value = input) => {
    const text = value.trim();

    if (!text) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      text,
      time: getTime()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setTimeout(() => {
      const reply = assistantReply(text);

      if (reply === "__CLEAR_CHAT__") {
        const welcome = {
          id: Date.now() + 1,
          role: "assistant",
          text: "चैट साफ कर दी गई है। फिर से शुरू करते हैं।",
          time: getTime()
        };

        setMessages([welcome]);
        speak(welcome.text);
        return;
      }

      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: reply,
        time: getTime()
      };

      setMessages((prev) => [...prev, assistantMessage]);
      speak(reply);
    }, 400);
  };

  const toggleListening = () => {
    if (!supported) {
      alert("इस browser/WebView में voice recognition उपलब्ध नहीं है।");
      return;
    }

    try {
      if (listening) {
        recognitionRef.current?.stop();
      } else {
        recognitionRef.current?.start();
      }
    } catch {}
  };

  const clearChat = () => {
    const welcome = {
      id: Date.now(),
      role: "assistant",
      text: "चैट साफ कर दी गई है। अब नई बातचीत शुरू करें।",
      time: getTime()
    };

    setMessages([welcome]);
  };

  const copyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">AI</div>
          <div>
            <div className="title">AI Assistant</div>
            <div className="status">
              <span className="status-dot"></span>
              Ready
            </div>
          </div>
        </div>

        <button className="clear-btn" onClick={clearChat}>
          Clear
        </button>
      </header>

      <main className="chat">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-row ${
              message.role === "user" ? "user-row" : "assistant-row"
            }`}
          >
            <div
              className={`avatar ${
                message.role === "user"
                  ? "user-avatar"
                  : "assistant-avatar"
              }`}
            >
              {message.role === "user" ? "U" : "AI"}
            </div>

            <div className="message-content">
              <div
                className={`bubble ${
                  message.role === "user"
                    ? "user-bubble"
                    : "assistant-bubble"
                }`}
              >
                {message.text}
              </div>

              <div className="message-meta">
                <span>{message.time}</span>

                {message.role === "assistant" && (
                  <button
                    className="small-btn"
                    onClick={() => speak(message.text)}
                  >
                    🔊
                  </button>
                )}

                <button
                  className="small-btn"
                  onClick={() => copyMessage(message.text)}
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        ))}

        <div ref={bottomRef}></div>
      </main>

      <div className="quick-area">
        {QUICK_COMMANDS.map((command) => (
          <button
            key={command}
            className="quick-btn"
            onClick={() => sendMessage(command)}
          >
            {command}
          </button>
        ))}
      </div>

      <footer className="composer">
        <div className="input-wrap">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              listening
                ? "Listening..."
                : "Type your message..."
            }
            rows="1"
          />

          <button
            className={`mic-btn ${listening ? "listening" : ""}`}
            onClick={toggleListening}
            title="Voice input"
          >
            {listening ? "⏹" : "🎙️"}
          </button>

          <button
            className="send-btn"
            onClick={() => sendMessage()}
          >
            ➤
          </button>
        </div>

        <div className="footer-status">
          {listening
            ? "🎙️ Listening..."
            : speaking
            ? "🔊 Speaking..."
            : "Voice + Text Assistant"}
        </div>
      </footer>
    </div>
  );
}
