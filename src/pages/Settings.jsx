import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";

export default function SettingsPage({ backendUrl, backendStatus, isNative, voiceReplies, voiceLanguage, onSaveBackend, onVoiceReplies, onVoiceLanguage, onTestConnection, onClearHistory }) {
  const [draftUrl, setDraftUrl] = useState(backendUrl);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  useEffect(() => setDraftUrl(backendUrl), [backendUrl]);

  function saveBackend(event) {
    event.preventDefault();
    const result = onSaveBackend(draftUrl);
    setSaveError(result.error || "");
    setSaveMessage(result.ok ? (draftUrl.trim() ? "Backend address saved on this device." : "Build-time backend address restored.") : "");
  }

  return (
    <main className="settings-page">
      <div className="page-intro"><span className="eyebrow">YOUR HAYAT</span><h1>Settings</h1><p>Configure how this device connects and how Hayat speaks. Private provider keys stay on the server.</p></div>

      <section className="settings-card"><div className="settings-card-head"><span className="settings-icon"><Icon name="tools" /></span><div><h2>Agent server</h2><p>Connection and provider readiness</p></div></div>
        <div className={`backend-status ${backendStatus.tone}`}><span className="status-light" /><div><strong>{backendStatus.label}</strong><small>{backendStatus.detail}</small></div><button type="button" className="button-secondary compact" onClick={onTestConnection}>Test connection</button></div>
        <form className="backend-form" onSubmit={saveBackend}><label htmlFor="backend-url">Backend base URL</label><input id="backend-url" type="url" value={draftUrl} onChange={(event) => { setDraftUrl(event.target.value); setSaveMessage(""); setSaveError(""); }} placeholder={isNative ? "https://your-private-agent.example" : "Leave blank to use the Vite development proxy"} autoCapitalize="none" autoCorrect="off" spellCheck="false" /><p className="field-help">Use HTTPS for a remote server. Loopback HTTP is only for development on the same device. Never add credentials or API keys to this URL.</p>{saveError && <p className="inline-error" role="alert">{saveError}</p>}{saveMessage && <p className="inline-success" role="status">{saveMessage}</p>}<button className="button-primary" type="submit">Save server address</button></form>
        <div className="provider-info"><span className="provider-badge">OPENAI</span><div><strong>Provider configured on server</strong><small>{backendStatus.configured ? "The server reports a provider key is configured. Hayat never displays it." : "Add OPENAI_API_KEY to agent-server/.env on your private server to enable replies."}</small></div></div>
      </section>

      <section className="settings-card"><div className="settings-card-head"><span className="settings-icon"><Icon name="mic" /></span><div><h2>Voice</h2><p>On-device speech options</p></div></div>
        <label className="setting-row"><span><strong>Speak assistant replies</strong><small>Uses system/browser text-to-speech when available.</small></span><input className="switch-input" type="checkbox" checked={voiceReplies} onChange={(event) => onVoiceReplies(event.target.checked)} /></label>
        <label className="setting-row"><span><strong>Recognition language</strong><small>Speech recognition is requested only after tapping the microphone.</small></span><select value={voiceLanguage} onChange={(event) => onVoiceLanguage(event.target.value)}><option value="auto">Automatic</option><option value="hi-IN">Hindi</option><option value="en-IN">English</option></select></label>
        <div className="privacy-note"><Icon name="screen" size={17} /><p>Voice input is a one-shot browser capability. Background listening and screen capture require native Android implementations and are not active.</p></div>
      </section>

      <section className="settings-card"><div className="settings-card-head"><span className="settings-icon"><Icon name="history" /></span><div><h2>Privacy & history</h2><p>Manage local conversation data</p></div></div><p className="history-explanation">Chats are stored in this app’s local storage on this device. The agent server also keeps short-lived context in memory until it is reset or the server restarts.</p><button className="button-danger" onClick={onClearHistory}>Clear all conversations</button></section>
    </main>
  );
}
