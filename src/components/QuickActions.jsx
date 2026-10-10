import Icon from "./Icon.jsx";

const actions = [
  { title: "Research a topic", text: "Research this topic using current web sources: ", icon: "spark", tag: "Web research" },
  { title: "Build a project", text: "Create a small project in my workspace. First ask me what it should do if needed.", icon: "folder", tag: "Files & code" },
  { title: "Plan my day", text: "Help me make a clear, practical plan for today.", icon: "clock", tag: "Planning" },
];

export default function QuickActions({ onSelect }) {
  return (
    <div className="quick-actions">
      {actions.map((action) => (
        <button className="quick-action" key={action.title} onClick={() => onSelect(action.text)}>
          <span className="quick-icon"><Icon name={action.icon} size={18} /></span>
          <span><small>{action.tag}</small><strong>{action.title}</strong></span>
          <span className="quick-arrow" aria-hidden="true">↗</span>
        </button>
      ))}
    </div>
  );
}
