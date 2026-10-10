import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatBox({ messages, loading, onCopy }) {
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, loading]);

  return (
    <div className="message-list" aria-live="polite">
      {messages.map((message) => (
        <article className={`message-row ${message.role}`} key={message.id}>
          {message.role === "assistant" && <div className="assistant-avatar" aria-hidden="true">H</div>}
          <div className={`message-bubble ${message.role}`}>
            <div className="message-text">{message.text}</div>
            <div className="message-meta">
              <time>{formatTime(message.time)}</time>
              {message.role === "assistant" && <button className="copy-button" onClick={() => onCopy(message.text)} aria-label="Copy assistant response" title="Copy response"><Icon name="copy" size={15} /></button>}
            </div>
          </div>
        </article>
      ))}
      {loading && <div className="message-row assistant"><div className="assistant-avatar" aria-hidden="true">H</div><div className="message-bubble assistant thinking"><span className="thinking-dots"><i /><i /><i /></span><span>Hayat is thinking</span></div></div>}
      <div ref={endRef} />
    </div>
  );
}
