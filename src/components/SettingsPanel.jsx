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

function SettingsPanel({ settings, onChange, ai }) {
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

      <div className="settings-row">
        <div>
          <p className="settings-name">Sfondo lava</p>
          <p className="settings-hint">Luci morbide che si muovono piano</p>
        </div>
        <Switch checked={settings.lava} onChange={(value) => set("lava", value)} label="Sfondo lava" />
      </div>

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
