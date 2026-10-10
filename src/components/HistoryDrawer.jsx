import Icon from "./Icon.jsx";

export default function HistoryDrawer({ open, conversations, activeId, onClose, onSelect, onNew }) {
  if (!open) return null;
  const ordered = [...conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="history-drawer" onClick={(event) => event.stopPropagation()} aria-label="Conversation history">
        <div className="drawer-heading"><div><span className="eyebrow">YOUR SPACE</span><h2>Conversations</h2></div><button className="icon-button" onClick={onClose} aria-label="Close history"><Icon name="close" /></button></div>
        <button className="new-chat-button" onClick={onNew}><Icon name="plus" size={18} /> New conversation</button>
        <div className="history-list">
          {ordered.map((conversation) => (
            <button className={`history-item ${conversation.id === activeId ? "selected" : ""}`} key={conversation.id} onClick={() => onSelect(conversation.id)}>
              <span className="history-item-icon"><Icon name="chat" size={17} /></span>
              <span className="history-item-copy"><strong>{conversation.title || "New conversation"}</strong><small>{conversation.messages.length ? `${conversation.messages.length} messages` : "No messages yet"}</small></span>
            </button>
          ))}
          {!ordered.length && <p className="empty-note">Your saved conversations will appear here.</p>}
        </div>
        <p className="drawer-privacy">Conversation history stays on this device.</p>
      </aside>
    </div>
  );
}
