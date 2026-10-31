import { useEffect, useRef, useState } from "react";
import { TEMPLATES } from "../../data/templates";
import { LANGUAGES, getLanguage, t } from "../../i18n";
import { IconCheck, IconChevronLeft, IconChevronRight } from "../Icons";
import { ConsentCheck } from "../legal/Legal";
import "./Onboarding.css";

const STEPS = ["Benvenuto", "Cosa coltivare", "Come ti aiuto", "Pronti"];

function goalLabel(goal) {
  return goal.period === "day"
    ? t("{n} al giorno", { n: goal.amount })
    : t("{n} a settimana", { n: goal.amount });
}

function ToggleRow({ title, text, checked, onChange }) {
  return (
    <button type="button" className="onb-toggle" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className="onb-toggle-text">
        <span className="onb-toggle-title">{title}</span>
        <span className="onb-toggle-desc">{text}</span>
      </span>
      <span className="onb-switch" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

// Primo avvio: quattro schermate, una domanda per volta. Si può sempre cambiare tutto dopo.
// Chi ha già un account (onSignIn, solo se il backend c'è) può saltare tutto e riprendere i suoi dati.
function Onboarding({ settings, onLanguage, onFinish, onSignIn }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.userName || "");
  const [picked, setPicked] = useState(["morning", "move"]);
  const [alerts, setAlerts] = useState(true);
  const [readable, setReadable] = useState(false);
  const [calm, setCalm] = useState(false);
  const [planFirstWeek, setPlanFirstWeek] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const headingRef = useRef(null);
  const language = getLanguage();

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  function toggleTemplate(id) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function finish(mode) {
    onFinish({
      mode,
      templates: picked,
      name: name.trim(),
      settings: {
        blockAlerts: alerts,
        font: readable ? "leggibile" : settings.font,
        motion: calm ? "reduced" : settings.motion,
      },
      planFirstWeek: mode === "templates" && planFirstWeek,
    });
  }

  const chosen = TEMPLATES.filter((template) => picked.includes(template.id));

  return (
    <div className="onb" role="dialog" aria-modal="true" aria-labelledby="onb-heading">
      <header className="onb-bar">
        <ol className="review-steps" aria-label={t("Passo {n} di {total}", { n: step + 1, total: STEPS.length })}>
          {STEPS.map((label, index) => (
            <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""}>
              <span className="review-step-dot" />
              <span className="review-step-label">{t(label)}</span>
            </li>
          ))}
        </ol>
      </header>

      <main className="onb-body">
        {step === 0 && (
          <section className="onb-step onb-welcome">
            <svg className="onb-logo" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="22" className="onb-logo-track" />
              <path d="M32 10 A22 22 0 1 1 10 32" className="onb-logo-arc" pathLength="1" />
              <circle cx="10" cy="32" r="4.5" className="onb-logo-dot" />
            </svg>
            <h1 ref={headingRef} tabIndex={-1} id="onb-heading" className="onb-title">
              {t("La tua giornata, in un anello.")}
            </h1>
            <p className="onb-lead">
              {t(
                "LowCor ti aiuta a tenere le cose che contano: blocchi di tempo, promemoria prima che inizino e un piano che si adatta quando la giornata va storta."
              )}
            </p>
            <div className="segmented onb-language" role="group" aria-label={t("Lingua")}>
              {LANGUAGES.map((item) => (
                <button key={item.id} type="button" aria-pressed={language === item.id} onClick={() => onLanguage(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <label className="onb-field">
              <span>{t("Come ti chiami?")}</span>
              <input
                className="field"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("Il tuo nome")}
                autoComplete="given-name"
              />
            </label>
            <ConsentCheck checked={accepted} onChange={setAccepted} />
            {onSignIn && (
              <div className="onb-alt">
                <button type="button" className="button button--quiet" onClick={onSignIn}>
                  {t("Ho già un account")}
                </button>
              </div>
            )}
          </section>
        )}

        {step === 1 && (
          <section className="onb-step">
            <h1 ref={headingRef} tabIndex={-1} id="onb-heading" className="onb-title">
              {name ? t("{name}, cosa vuoi coltivare?", { name }) : t("Cosa vuoi coltivare?")}
            </h1>
            <p className="onb-lead">
              {t("Scegline da una a quattro per cominciare. Le non negoziabili sono impegni fissi, le passioni scelte libere.")}
            </p>
            <div className="onb-templates" role="group" aria-label={t("Modelli di partenza")}>
              {TEMPLATES.map((template) => {
                const text = template[language] || template.it;
                const isPicked = picked.includes(template.id);
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={`onb-template onb-template--${template.type}`}
                    aria-pressed={isPicked}
                    onClick={() => toggleTemplate(template.id)}
                  >
                    <span className="onb-template-kind">
                      {template.type === "fixed" ? t("Non negoziabile") : t("Passione")}
                    </span>
                    <span className="onb-template-label">{text.label}</span>
                    <span className="onb-template-meta">
                      {text.name}, {goalLabel(template.goal)}
                    </span>
                    <span className="onb-template-check" aria-hidden="true">
                      {isPicked && <IconCheck />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="onb-alt">
              <button type="button" className="button button--quiet" onClick={() => finish("sample")}>
                {t("Preferisco vedere un esempio")}
              </button>
              <button type="button" className="button button--quiet" onClick={() => finish("empty")}>
                {t("Parto da zero")}
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="onb-step">
            <h1 ref={headingRef} tabIndex={-1} id="onb-heading" className="onb-title">
              {t("Come ti aiuto meglio?")}
            </h1>
            <p className="onb-lead">{t("Tre scelte veloci. Le ritrovi nelle impostazioni.")}</p>
            <div className="onb-toggles">
              <ToggleRow
                title={t("Avvisami prima dei blocchi")}
                text={t("Un promemoria qualche minuto prima, all'inizio e alla fine: il tempo non scappa.")}
                checked={alerts}
                onChange={setAlerts}
              />
              <ToggleRow
                title={t("Testo più leggibile")}
                text={t("Un font pensato per leggere con meno fatica, anche con ADHD e dislessia.")}
                checked={readable}
                onChange={setReadable}
              />
              <ToggleRow
                title={t("Meno movimento")}
                text={t("Animazioni ferme e meno stimoli visivi.")}
                checked={calm}
                onChange={setCalm}
              />
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="onb-step">
            <h1 ref={headingRef} tabIndex={-1} id="onb-heading" className="onb-title">
              {t("Tutto pronto.")}
            </h1>
            <p className="onb-lead">{t("Ecco da dove parti. Puoi cambiare tutto dalla sezione Attività.")}</p>
            <ul className="onb-summary">
              {chosen.map((template) => {
                const text = template[language] || template.it;
                return (
                  <li key={template.id}>
                    <span className="onb-summary-name">{text.name}</span>
                    <span className="onb-summary-meta">
                      {goalLabel(template.goal)}, {t("verso le {time}", { time: template.start })}
                    </span>
                  </li>
                );
              })}
            </ul>
            <label className="share-check">
              <input
                type="checkbox"
                className="check"
                checked={planFirstWeek}
                onChange={(event) => setPlanFirstWeek(event.target.checked)}
              />
              {t("Metti già in agenda questa settimana")}
            </label>
          </section>
        )}
      </main>

      <footer className="onb-foot">
        <button
          type="button"
          className="button button--quiet"
          onClick={() => setStep((current) => current - 1)}
          disabled={step === 0}
        >
          <IconChevronLeft />
          {t("Indietro")}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="button button--primary"
            onClick={() => setStep((current) => current + 1)}
            disabled={(step === 0 && !accepted) || (step === 1 && picked.length === 0)}
          >
            {step === 0 ? t("Cominciamo") : t("Avanti")}
            <IconChevronRight />
          </button>
        ) : (
          <button type="button" className="button button--primary" onClick={() => finish("templates")}>
            <IconCheck />
            {t("Entra in LowCor")}
          </button>
        )}
      </footer>
    </div>
  );
}

export default Onboarding;
