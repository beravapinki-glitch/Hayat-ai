import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { createWhatsAppUrl, openWhatsApp } from "../native/agentActions.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Icon from "../components/Icon.jsx";

const availableTools = [
  { icon: "spark", title: "Web research", copy: "Ask questions that need current web sources.", prompt: "Research this topic using current web sources and summarize the key findings with links: " },
  { icon: "folder", title: "Create files & projects", copy: "Generate code and project files in the agent workspace.", prompt: "Create a project in my workspace for: " },
  { icon: "clock", title: "Time & device info", copy: "Ask for the agent server’s time or runtime details.", prompt: "Tell me the current time and basic server runtime information." },
];

function UnavailableCard({ icon, title, copy }) {
  return <article className="capability-card unavailable"><span className="capability-icon"><Icon name={icon} /></span><span className="capability-copy"><strong>{title}</strong><small>{copy}</small></span><span className="availability-tag">Not configured</span></article>;
}

export default function AgentPage({ onPrompt, onToast }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [confirmWhatsApp, setConfirmWhatsApp] = useState(false);
  const [whatsAppBusy, setWhatsAppBusy] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState("");
  const phoneDigits = phone.replace(/\D/g, "");

  async function openDraft() {
    if (whatsAppBusy) return;
    setWhatsAppBusy(true);
    setWhatsAppError("");
    try {
      if (Capacitor.isNativePlatform()) {
        await openWhatsApp(phone, message);
      } else {
        window.open(createWhatsAppUrl(phone, message), "_blank", "noopener,noreferrer");
      }
      setConfirmWhatsApp(false);
      onToast("WhatsApp opened with your draft. Review and send it there.");
      setPhone("");
      setMessage("");
    } catch {
      setWhatsAppError("WhatsApp could not be opened. Check that it is installed or try again in a browser.");
    } finally {
      setWhatsAppBusy(false);
    }
  }

  return (
    <main className="tools-page">
      <div className="page-intro"><span className="eyebrow">SAFE, CONNECTED CAPABILITIES</span><h1>Tools for getting things done</h1><p>Use a supported action below, or ask Hayat in chat. Actions that change something on your device stay under your control.</p></div>

      <section className="tool-section"><div className="section-heading"><h2>Available now</h2><span>Connected through your agent server</span></div><div className="capability-grid">
        {availableTools.map((tool) => <button className="capability-card" key={tool.title} onClick={() => onPrompt(tool.prompt)}><span className="capability-icon"><Icon name={tool.icon} /></span><span className="capability-copy"><strong>{tool.title}</strong><small>{tool.copy}</small></span><span className="capability-arrow" aria-hidden="true">↗</span></button>)}
      </div></section>

      <section className="tool-section"><div className="section-heading"><h2>In development</h2><span>Unavailable until real integrations are added</span></div><div className="capability-grid">
        <UnavailableCard icon="image" title="Image generation" copy="No image-generation provider or API route is configured." />
        <UnavailableCard icon="video" title="Video generation" copy="No video-generation provider or job-status route is configured." />
        <UnavailableCard icon="screen" title="Screen understanding" copy="Android MediaProjection consent and native capture are not implemented." />
      </div></section>

      <section className="tool-section whatsapp-section"><div className="section-heading"><h2>WhatsApp draft</h2><span>Nothing is sent automatically</span></div><div className="whatsapp-card">
        <div className="whatsapp-heading"><span className="whatsapp-icon"><Icon name="whatsapp" size={21} /></span><div><strong>Prepare a message</strong><small>Hayat opens WhatsApp with a draft for you to review.</small></div></div>
        <div className="whatsapp-fields"><label>Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="Country code + number" /></label><label>Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Write your message…" /></label></div>
        {whatsAppError && <p className="inline-error" role="alert">{whatsAppError}</p>}
        <button className="button-primary" disabled={phoneDigits.length < 7 || phoneDigits.length > 15 || !message.trim()} onClick={() => { setWhatsAppError(""); setConfirmWhatsApp(true); }}>Review before opening WhatsApp</button>
      </div></section>

      {confirmWhatsApp && <ConfirmDialog title="Review WhatsApp draft" description="This opens a WhatsApp conversation with the message filled in. Hayat will not send it; review and send it yourself in WhatsApp." confirmLabel={whatsAppBusy ? "Opening…" : "Open WhatsApp to review"} onCancel={() => !whatsAppBusy && setConfirmWhatsApp(false)} onConfirm={openDraft}>
        <div className="draft-preview"><span><b>To</b> {phone}</span><p>{message}</p></div>
      </ConfirmDialog>}
    </main>
  );
}
