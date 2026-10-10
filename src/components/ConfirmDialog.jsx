import Icon from "./Icon.jsx";

export default function ConfirmDialog({ title, description, confirmLabel = "Confirm", onConfirm, onCancel, children }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <button className="dialog-close icon-button" onClick={onCancel} aria-label="Close"><Icon name="close" /></button>
        <div className="dialog-icon"><Icon name="spark" size={22} /></div>
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        {children}
        <div className="dialog-actions"><button className="button-secondary" onClick={onCancel}>Cancel</button><button className="button-primary" onClick={onConfirm}>{confirmLabel}</button></div>
      </section>
    </div>
  );
}
