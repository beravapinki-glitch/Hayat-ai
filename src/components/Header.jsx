import Icon from "./Icon.jsx";

export default function Header({ title, status, onHistory, onNewChat, onSettings }) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">H</div>
        <div className="brand-copy">
          <span className="brand-name">Hayat <b>AI</b></span>
          <span className={`connection-label ${status.tone}`}><i />{status.label}</span>
        </div>
      </div>
      <div className="topbar-center"><span className="eyebrow">PERSONAL ASSISTANT</span><strong>{title}</strong></div>
      <div className="topbar-actions">
        <button className="icon-button mobile-only" onClick={onHistory} aria-label="Open conversation history" title="History"><Icon name="history" /></button>
        <button className="icon-button" onClick={onNewChat} aria-label="Start a new conversation" title="New chat"><Icon name="plus" /></button>
        <button className="icon-button mobile-only" onClick={onSettings} aria-label="Open settings" title="Settings"><Icon name="settings" /></button>
      </div>
    </header>
  );
}
