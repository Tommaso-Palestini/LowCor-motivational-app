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
  ["1 / 2", "Oggi / Calendario"],
  ["← →", "Settimana o mese precedente e successivo"],
  ["T", "Torna a oggi nel calendario"],
  ["N", "Nuovo blocco nel calendario"],
  ["Ctrl Z", "Annulla l'ultima modifica"],
];

function SettingsPanel({ settings, onChange }) {
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
