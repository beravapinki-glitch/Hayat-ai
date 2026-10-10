import Icon from "./Icon.jsx";

const items = [
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "tools", label: "Tools", icon: "tools" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => (
        <button key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => onChange(item.id)} aria-current={active === item.id ? "page" : undefined}>
          <Icon name={item.icon} size={19} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
