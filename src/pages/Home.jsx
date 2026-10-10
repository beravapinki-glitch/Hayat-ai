import ChatBox from "../components/ChatBox.jsx";
import Icon from "../components/Icon.jsx";
import QuickActions from "../components/QuickActions.jsx";

export default function Home({ title, messages, input, setInput, loading, voiceState, voiceLanguage, onSend, onStop, onVoice, onStopSpeaking, onCopy, onClear }) {
  const hasMessages = messages.length > 0;
  return (
    <section className="chat-page" aria-label="Hayat AI chat">
      <div className="chat-toolbar">
        <div className="chat-model"><span className="model-dot" /><span>OpenAI assistant</span><span className="toolbar-divider" /><span>Private server</span></div>
        {hasMessages && <button className="text-button" onClick={onClear}>Clear chat</button>}
      </div>
      <div className="chat-scroll" id="chat-scroll">
        {!hasMessages ? (
          <div className="welcome-panel">
            <div className="welcome-orb" aria-hidden="true"><span>H</span><i /><b /></div>
            <span className="eyebrow welcome-eyebrow">A LITTLE MORE CLARITY, EVERY DAY</span>
            <h1>{title || "Hello, I’m Hayat."}</h1>
            <p className="welcome-copy">Your personal assistant for thinking, research, and getting things done.</p>
            <QuickActions onSelect={onSend} />
          </div>
        ) : <ChatBox messages={messages} loading={loading} onCopy={onCopy} />}
      </div>
      <div className="composer-wrap">
        <div className={`voice-status ${voiceState}`} aria-live="polite">
          <span className="voice-status-dot" />
          {voiceState === "listening" ? "Listening — speak now" : voiceState === "speaking" ? "Hayat is speaking" : loading ? "Thinking through your request" : `Voice ready · ${voiceLanguage === "auto" ? "Auto language" : voiceLanguage}`}
          {voiceState === "speaking" && <button onClick={onStopSpeaking}>Stop voice</button>}
        </div>
        <form className="composer" onSubmit={(event) => { event.preventDefault(); onSend(input); }}>
          <button type="button" className={`composer-icon mic-button ${voiceState === "listening" ? "recording" : ""}`} onClick={onVoice} aria-label={voiceState === "listening" ? "Stop listening" : "Start voice input"} title={voiceState === "listening" ? "Stop listening" : "Voice input"}><Icon name={voiceState === "listening" ? "close" : "mic"} size={19} /></button>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (input.trim() && !loading) onSend(input); } }} rows={1} placeholder="Message Hayat…" aria-label="Message Hayat AI" />
          {loading ? <button type="button" className="send-button stop-button" onClick={onStop} aria-label="Stop response" title="Stop response"><Icon name="stop" size={18} /></button> : <button type="submit" className="send-button" disabled={!input.trim()} aria-label="Send message" title="Send message"><Icon name="send" size={18} /></button>}
        </form>
        <p className="composer-footnote">Hayat can make mistakes. Review important information.</p>
      </div>
    </section>
  );
}
