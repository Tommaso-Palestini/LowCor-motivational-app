import { useRef, useState } from "react";
import { DEFAULT_AI_URL } from "../logic/settings";

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  );
}

const SHORTCUTS = [
  ["F", "Apre il focus"],
  ["1 2 3 4 5", "Oggi, Attività, Calendario, Obiettivi, Idee"],
  ["← →", "Settimana o mese precedente e successivo"],
  ["T", "Torna a oggi nel calendario"],
  ["N", "Nuovo blocco nel calendario"],
  ["Ctrl Z", "Annulla l'ultima modifica"],
];

const AI_STATUS = {
  checking: "Cerco Ollama…",
  ready: "Connessa",
  offline: "Ollama non risponde",
  "no-model": "Nessun modello installato",
};

function AiSection({ ai, settings, set }) {
  return (
    <div className="settings-ai">
      <div className="settings-row">
        <div>
          <p className="settings-name">AI locale</p>
          <p className={`settings-status settings-status--${ai.status}`}>
            <span aria-hidden="true" />
            {AI_STATUS[ai.status]}
            {ai.isReady && `, ${ai.model}`}
          </p>
        </div>
        {!ai.isReady && (
          <button type="button" className="button button--quiet" onClick={ai.retry}>
            Riprova
          </button>
        )}
      </div>

      {ai.status === "offline" && (
        <p className="settings-hint">
          Avvia Ollama sul computer (<code>ollama serve</code>) oppure controlla l'indirizzo qui sotto.
        </p>
      )}
      {ai.status === "no-model" && (
        <p className="settings-hint">
          Scarica un modello dal terminale: <code>ollama pull llama3.2</code>
        </p>
      )}

      {ai.models.length > 1 && (
        <label className="settings-field">
          <span className="settings-hint">Modello</span>
          <select className="field" value={ai.model || ""} onChange={(event) => set("aiModel", event.target.value)}>
            {ai.models.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="settings-field">
        <span className="settings-hint">Indirizzo di Ollama</span>
        <input
          className="field"
          defaultValue={settings.aiUrl}
          placeholder={DEFAULT_AI_URL}
          spellCheck="false"
          onBlur={(event) => {
            const value = event.target.value.trim().replace(/\/+$/, "") || DEFAULT_AI_URL;
            if (value !== settings.aiUrl) {
              set("aiUrl", value);
            }
          }}
        />
      </label>

      <div className="settings-row">
        <div>
          <p className="settings-name">Carte infinite</p>
          <p className="settings-hint">Quando arrivi all'ultima carta del feed ne genera altre</p>
        </div>
        <Switch
          checked={settings.aiAutoCards}
          onChange={(value) => set("aiAutoCards", value)}
          label="Carte infinite"
        />
      </div>
    </div>
  );
}

function BackgroundSection({ settings, set, image, onPick, onRemove }) {
  const fileRef = useRef(null);
  const isImage = settings.background === "image" && image;

  function choose(mode) {
    if (mode === "image" && !image) {
      fileRef.current?.click();
      return;
    }
    set("background", mode);
  }

  return (
    <div className="settings-bg">
      <div className="settings-row">
        <div>
          <p className="settings-name">Sfondo</p>
          <p className="settings-hint">{isImage ? "La tua foto, velata dalla tinta dell'app" : "Luci morbide che si muovono piano"}</p>
        </div>
      </div>
      <div className="segmented settings-segmented" role="group" aria-label="Tipo di sfondo">
        <button type="button" aria-pressed={!isImage} onClick={() => choose("lava")}>
          Lava
        </button>
        <button type="button" aria-pressed={Boolean(isImage)} onClick={() => choose("image")}>
          La tua foto
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files[0];
          event.target.value = "";
          if (file) {
            onPick(file);
          }
        }}
      />

      {isImage ? (
        <>
          <div className="settings-bg-preview">
            <img src={image} alt="Anteprima dello sfondo" />
            <div className="settings-bg-actions">
              <button type="button" className="button button--quiet" onClick={() => fileRef.current?.click()}>
                Cambia foto
              </button>
              <button type="button" className="button button--quiet" onClick={onRemove}>
                Rimuovi
              </button>
            </div>
          </div>
          <label className="settings-slider">
            <span className="settings-hint">Velo scuro al {settings.backgroundDim}%</span>
            <input
              type="range"
              className="range"
              min="10"
              max="85"
              step="5"
              value={settings.backgroundDim}
              onChange={(event) => set("backgroundDim", Number(event.target.value))}
            />
          </label>
        </>
      ) : (
        <div className="settings-row">
          <p className="settings-hint">Lava in movimento</p>
          <Switch checked={settings.lava} onChange={(value) => set("lava", value)} label="Lava in movimento" />
        </div>
      )}
    </div>
  );
}

function AlertsSection({ settings, set }) {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : "denied");

  async function askPermission() {
    setPermission(await Notification.requestPermission());
  }

  return (
    <div className="settings-bg">
      <div className="settings-row">
        <div>
          <p className="settings-name">Promemoria dei blocchi</p>
          <p className="settings-hint">Un avviso prima di iniziare, all'inizio e alla fine, per non perdere la cognizione del tempo</p>
        </div>
        <Switch checked={settings.blockAlerts} onChange={(value) => set("blockAlerts", value)} label="Promemoria dei blocchi" />
      </div>
      {settings.blockAlerts && (
        <>
          <label className="settings-slider">
            <span className="settings-hint">Avvisami {settings.alertMinutes} minuti prima</span>
            <input
              type="range"
              className="range"
              min="1"
              max="15"
              value={settings.alertMinutes}
              onChange={(event) => set("alertMinutes", Number(event.target.value))}
            />
          </label>
          {supported && permission === "default" && (
            <button type="button" className="button button--ghost" onClick={askPermission}>
              Avvisami anche quando l'app è in background
            </button>
          )}
          {supported && permission === "granted" && (
            <p className="settings-hint">Notifiche di sistema attive quando l'app è aperta in background.</p>
          )}
          {supported && permission === "denied" && (
            <p className="settings-hint">Notifiche bloccate dal browser: gli avvisi compaiono solo dentro l'app.</p>
          )}
        </>
      )}
    </div>
  );
}

function SettingsPanel({ settings, onChange, ai, backgroundImage, onPickBackground, onRemoveBackground }) {
  function set(key, value) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="settings" role="dialog" aria-label="Impostazioni">
      <div className="settings-row">
        <div>
          <p className="settings-name">Onda di colori</p>
          <p className="settings-hint">La palette gira lentamente da rosso a rosso</p>
        </div>
        <Switch checked={settings.wave} onChange={(value) => set("wave", value)} label="Onda di colori" />
      </div>

      {settings.wave ? (
        <label className="settings-slider">
          <span className="settings-hint">
            Un giro completo in {settings.waveSeconds} secondi
          </span>
          <input
            type="range"
            className="range"
            min="20"
            max="300"
            step="10"
            value={settings.waveSeconds}
            onChange={(event) => set("waveSeconds", Number(event.target.value))}
          />
        </label>
      ) : (
        <label className="settings-slider">
          <span className="settings-hint">Tinta fissa</span>
          <input
            type="range"
            className="range range--hue"
            min="0"
            max="360"
            value={settings.hue}
            onChange={(event) => set("hue", Number(event.target.value))}
          />
        </label>
      )}

      <BackgroundSection
        settings={settings}
        set={set}
        image={backgroundImage}
        onPick={onPickBackground}
        onRemove={onRemoveBackground}
      />

      <div className="settings-row">
        <div>
          <p className="settings-name">Full gas</p>
          <p className="settings-hint">Annunci a schermo quando chiudi blocchi e obiettivi</p>
        </div>
        <Switch checked={settings.fullGas} onChange={(value) => set("fullGas", value)} label="Full gas" />
      </div>

      <div className="settings-row">
        <div>
          <p className="settings-name">Rischio overload</p>
          <p className="settings-hint">Quando un giorno del calendario va segnalato come troppo pieno</p>
        </div>
      </div>
      <label className="settings-slider">
        <span className="settings-hint">Più di {settings.energyMaxHigh} blocchi a energia alta</span>
        <input
          type="range"
          className="range"
          min="1"
          max="8"
          value={settings.energyMaxHigh}
          onChange={(event) => set("energyMaxHigh", Number(event.target.value))}
        />
      </label>
      <label className="settings-slider">
        <span className="settings-hint">Oppure più di {settings.energyMaxLoad} punti di energia (alta 3, media 2, bassa 1)</span>
        <input
          type="range"
          className="range"
          min="4"
          max="24"
          value={settings.energyMaxLoad}
          onChange={(event) => set("energyMaxLoad", Number(event.target.value))}
        />
      </label>

      <AlertsSection settings={settings} set={set} />

      <AiSection ai={ai} settings={settings} set={set} />

      <div className="settings-shortcuts">
        <p className="settings-name">Scorciatoie</p>
        <dl>
          {SHORTCUTS.map(([keys, description]) => (
            <div key={keys} className="settings-shortcut">
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default SettingsPanel;
