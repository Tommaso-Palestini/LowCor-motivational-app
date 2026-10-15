import { useEffect, useRef, useState } from "react";
import SettingsPanel from "./SettingsPanel";
import { VIEWS } from "../logic/views";
import { IconSettings, IconSparkle, IconTarget } from "./Icons";
import "./TopBar.css";

function ViewTabs({ className, view, onViewChange }) {
  return (
    <nav className={className} aria-label="Sezioni">
      {VIEWS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="topbar-tab"
          aria-current={view === item.id ? "page" : undefined}
          onClick={() => onViewChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function TopBar({ view, onViewChange, aura, hasFocus, onOpenFocus, settings, onSettingsChange, ai }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    if (!isSettingsOpen) {
      return undefined;
    }
    function handlePointer(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    }
    function handleKey(event) {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isSettingsOpen]);

  return (
    <>
      <header className="topbar">
        <p className="topbar-brand">LowCor</p>
        <ViewTabs className="topbar-tabs" view={view} onViewChange={onViewChange} />

        <div className="topbar-actions">
          <p className="topbar-aura" title="Aura: la guadagni chiudendo blocchi, obiettivi e sessioni di focus">
            <IconSparkle />
            <span key={aura} className="topbar-aura-value">
              {aura.toLocaleString("it-IT")}
            </span>
            <span className="sr-only">punti aura</span>
          </p>

          <button
            type="button"
            className={`button topbar-focus ${hasFocus ? "topbar-focus--live" : ""}`}
            onClick={onOpenFocus}
          >
            <IconTarget />
            <span className="topbar-focus-label">{hasFocus ? "Focus attivo" : "Focus"}</span>
          </button>

          <div className="topbar-settings" ref={settingsRef}>
            <button
              type="button"
              className={`icon-button ${ai.isReady ? "topbar-settings-button--ai" : ""}`}
              aria-label="Impostazioni"
              aria-expanded={isSettingsOpen}
              onClick={() => setIsSettingsOpen((open) => !open)}
            >
              <IconSettings />
            </button>
            {isSettingsOpen && <SettingsPanel settings={settings} onChange={onSettingsChange} ai={ai} />}
          </div>
        </div>
      </header>
      <ViewTabs className="bottom-nav" view={view} onViewChange={onViewChange} />
    </>
  );
}

export default TopBar;
