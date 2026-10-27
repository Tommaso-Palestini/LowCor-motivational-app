import { useRef, useState } from "react";
import { DEFAULT_AI_URL } from "../logic/settings";
import { LANGUAGES, t } from "../i18n";

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
          <p className="settings-name">{t("AI locale")}</p>
          <p className={`settings-status settings-status--${ai.status}`}>
            <span aria-hidden="true" />
            {t(AI_STATUS[ai.status])}
            {ai.isReady && `, ${ai.model}`}
          </p>
        </div>
        {!ai.isReady && (
          <button type="button" className="button button--quiet" onClick={ai.retry}>
            {t("Riprova")}
          </button>
        )}
      </div>

      {ai.status === "offline" && (
        <p className="settings-hint">
          {t("Avvia Ollama sul computer")} (<code>ollama serve</code>) {t("oppure controlla l'indirizzo qui sotto.")}
        </p>
      )}
      {ai.status === "no-model" && (
        <p className="settings-hint">
          {t("Scarica un modello dal terminale:")} <code>ollama pull llama3.2</code>
        </p>
      )}

      {ai.models.length > 1 && (
        <label className="settings-field">
          <span className="settings-hint">{t("Modello")}</span>
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
        <span className="settings-hint">{t("Indirizzo di Ollama")}</span>
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
          <p className="settings-name">{t("Carte infinite")}</p>
          <p className="settings-hint">{t("Quando arrivi all'ultima carta del feed ne genera altre")}</p>
        </div>
        <Switch
          checked={settings.aiAutoCards}
          onChange={(value) => set("aiAutoCards", value)}
          label={t("Carte infinite")}
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
          <p className="settings-name">{t("Sfondo")}</p>
          <p className="settings-hint">{isImage ? t("La tua foto, velata dalla tinta dell'app") : t("Luci morbide che si muovono piano")}</p>
        </div>
      </div>
      <div className="segmented settings-segmented" role="group" aria-label={t("Tipo di sfondo")}>
        <button type="button" aria-pressed={!isImage} onClick={() => choose("lava")}>
          {t("Lava")}
        </button>
        <button type="button" aria-pressed={Boolean(isImage)} onClick={() => choose("image")}>
          {t("La tua foto")}
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
            <img src={image} alt={t("Anteprima dello sfondo")} />
            <div className="settings-bg-actions">
              <button type="button" className="button button--quiet" onClick={() => fileRef.current?.click()}>
                {t("Cambia foto")}
              </button>
              <button type="button" className="button button--quiet" onClick={onRemove}>
                {t("Rimuovi")}
              </button>
            </div>
          </div>
          <label className="settings-slider">
            <span className="settings-hint">{t("Velo scuro al {n}%", { n: settings.backgroundDim })}</span>
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
          <p className="settings-hint">{t("Lava in movimento")}</p>
          <Switch checked={settings.lava} onChange={(value) => set("lava", value)} label={t("Lava in movimento")} />
        </div>
      )}
    </div>
  );
}

const FONTS = [
  { id: "morbido", label: "Morbido", family: '"Bricolage Grotesque Variable"' },
  { id: "deciso", label: "Deciso", family: '"Unbounded Variable"' },
  { id: "elegante", label: "Elegante", family: '"Fraunces Variable"' },
  { id: "leggibile", label: "Leggibile", family: '"Lexend Variable"' },
];

const SIZES = [
  { id: "small", label: "Piccolo" },
  { id: "medium", label: "Normale" },
  { id: "large", label: "Grande" },
];

function AppearanceSection({ settings, set }) {
  return (
    <div className="settings-bg">
      <p className="settings-group">{t("Aspetto")}</p>
      <div className="segmented settings-segmented" role="group" aria-label={t("Lingua")}>
        {LANGUAGES.map((language) => (
          <button
            key={language.id}
            type="button"
            aria-pressed={(settings.language || "it") === language.id}
            onClick={() => set("language", language.id)}
          >
            {language.label}
          </button>
        ))}
      </div>
      {settings.language === "en" && (
        <p className="settings-hint">English is in beta: some sections are still in Italian.</p>
      )}
      <div className="settings-fonts" role="group" aria-label={t("Stile del testo")}>
        {FONTS.map((font) => (
          <button
            key={font.id}
            type="button"
            className="settings-font"
            aria-pressed={settings.font === font.id}
            onClick={() => set("font", font.id)}
          >
            <span className="settings-font-sample" style={{ fontFamily: font.family }} aria-hidden="true">
              Aa
            </span>
            {t(font.label)}
          </button>
        ))}
      </div>
      {settings.font === "leggibile" && (
        <p className="settings-hint">{t("Lexend è pensato per una lettura più scorrevole, anche con ADHD e dislessia.")}</p>
      )}

      <div className="segmented settings-segmented" role="group" aria-label={t("Dimensione del testo")}>
        {SIZES.map((size) => (
          <button
            key={size.id}
            type="button"
            aria-pressed={settings.textSize === size.id}
            onClick={() => set("textSize", size.id)}
          >
            {t(size.label)}
          </button>
        ))}
      </div>

      <div className="settings-row">
        <div>
          <p className="settings-name">{t("Contrasto alto")}</p>
          <p className="settings-hint">{t("Testi secondari e bordi più marcati")}</p>
        </div>
        <Switch
          checked={settings.contrast === "high"}
          onChange={(value) => set("contrast", value ? "high" : "normal")}
          label={t("Contrasto alto")}
        />
      </div>

      <div className="settings-row">
        <div>
          <p className="settings-name">{t("Riduci i movimenti")}</p>
          <p className="settings-hint">{t("Ferma onde, lava e animazioni: meno stimoli, più calma")}</p>
        </div>
        <Switch
          checked={settings.motion === "reduced"}
          onChange={(value) => set("motion", value ? "reduced" : "full")}
          label={t("Riduci i movimenti")}
        />
      </div>
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
          <p className="settings-name">{t("Promemoria dei blocchi")}</p>
          <p className="settings-hint">{t("Un avviso prima di iniziare, all'inizio e alla fine, per non perdere la cognizione del tempo")}</p>
        </div>
        <Switch checked={settings.blockAlerts} onChange={(value) => set("blockAlerts", value)} label={t("Promemoria dei blocchi")} />
      </div>
      {settings.blockAlerts && (
        <>
          <label className="settings-slider">
            <span className="settings-hint">{t("Avvisami {n} minuti prima", { n: settings.alertMinutes })}</span>
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
              {t("Avvisami anche quando l'app è in background")}
            </button>
          )}
          {supported && permission === "granted" && (
            <p className="settings-hint">{t("Notifiche di sistema attive quando l'app è aperta in background.")}</p>
          )}
          {supported && permission === "denied" && (
            <p className="settings-hint">{t("Notifiche bloccate dal browser: gli avvisi compaiono solo dentro l'app.")}</p>
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
    <div className="settings" role="dialog" aria-label={t("Impostazioni")}>
      <AppearanceSection settings={settings} set={set} />

      <p className="settings-group">{t("Colori e sfondo")}</p>
      <div className="settings-row">
        <div>
          <p className="settings-name">{t("Onda di colori")}</p>
          <p className="settings-hint">{t("La palette gira lentamente da rosso a rosso")}</p>
        </div>
        <Switch checked={settings.wave} onChange={(value) => set("wave", value)} label={t("Onda di colori")} />
      </div>

      {settings.wave ? (
        <label className="settings-slider">
          <span className="settings-hint">
            {t("Un giro completo in {n} secondi", { n: settings.waveSeconds })}
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
          <span className="settings-hint">{t("Tinta fissa")}</span>
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
          <p className="settings-name">{t("Full gas")}</p>
          <p className="settings-hint">{t("Annunci a schermo quando chiudi blocchi e obiettivi")}</p>
        </div>
        <Switch checked={settings.fullGas} onChange={(value) => set("fullGas", value)} label={t("Full gas")} />
      </div>

      <div className="settings-row">
        <div>
          <p className="settings-name">{t("Rischio overload")}</p>
          <p className="settings-hint">{t("Quando un giorno del calendario va segnalato come troppo pieno")}</p>
        </div>
      </div>
      <label className="settings-slider">
        <span className="settings-hint">{t("Più di {n} blocchi a energia alta", { n: settings.energyMaxHigh })}</span>
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
        <span className="settings-hint">{t("Oppure più di {n} punti di energia (alta 3, media 2, bassa 1)", { n: settings.energyMaxLoad })}</span>
        <input
          type="range"
          className="range"
          min="4"
          max="24"
          value={settings.energyMaxLoad}
          onChange={(event) => set("energyMaxLoad", Number(event.target.value))}
        />
      </label>

      <p className="settings-group">{t("Tempo")}</p>
      <AlertsSection settings={settings} set={set} />

      <p className="settings-group">{t("AI e scorciatoie")}</p>
      <AiSection ai={ai} settings={settings} set={set} />

      <div className="settings-shortcuts">
        <p className="settings-name">{t("Scorciatoie")}</p>
        <dl>
          {SHORTCUTS.map(([keys, description]) => (
            <div key={keys} className="settings-shortcut">
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{t(description)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default SettingsPanel;
