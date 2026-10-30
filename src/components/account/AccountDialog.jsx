import { useEffect, useRef, useState } from "react";
import * as api from "../../cloud/api";
import { cloudErrorMessage, isValidEmail, passwordProblems, PASSWORD_MIN } from "../../logic/cloud";
import { LEGAL_VERSION } from "../../logic/consent";
import { ConsentCheck } from "../legal/Legal";
import { IconClose } from "../Icons";
import People from "./People";
import { t } from "../../i18n";
import "./Account.css";

const STATUS = {
  "signed-out": "",
  syncing: "Allineo i dati…",
  saving: "Salvo…",
  saved: "Dati salvati online",
  offline: "Offline: salvo appena torna la connessione",
  conflict: "Da decidere: quali dati tenere",
  "too-large": "Dati oltre i 2 MB: il salvataggio online è in pausa",
};

function useModal() {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);
  return ref;
}

// Esegue un'azione asincrona mostrando l'attesa e l'eventuale errore in parole semplici
function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(task) {
    setBusy(true);
    setError("");
    try {
      return await task();
    } catch (caught) {
      setError(cloudErrorMessage(caught));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

function Field({ label, ...props }) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <input className="field" {...props} />
    </label>
  );
}

function SignIn({ email, setEmail, onGo }) {
  const [password, setPassword] = useState("");
  const { busy, error, run } = useTask();

  async function handleSubmit(event) {
    event.preventDefault();
    await run(() => api.signIn(email, password));
  }

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <p className="account-lead">
        {t("L'account è facoltativo: serve per avere gli stessi dati su più dispositivi e per condividere gli impegni con chi vuoi.")}
      </p>
      <Field label={t("Email")} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Field
        label={t("Password")}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
      <div className="editor-actions">
        <button type="submit" className="button button--primary" disabled={busy || !email || !password}>
          {t("Accedi")}
        </button>
        <button type="button" className="button button--ghost" onClick={() => onGo("signup")}>
          {t("Crea un account")}
        </button>
      </div>
      <button type="button" className="button button--quiet account-link" onClick={() => onGo("forgot")}>
        {t("Password dimenticata?")}
      </button>
    </form>
  );
}

function SignUp({ email, setEmail, onGo }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [legal, setLegal] = useState(false);
  const [health, setHealth] = useState(false);
  const [age, setAge] = useState(false);
  const { busy, error, setError, run } = useTask();
  const problems = passwordProblems(password);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Scrivi il nome che vedranno le persone collegate.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Controlla l'indirizzo email.");
      return;
    }
    if (problems.length > 0) {
      setError(t("La password deve avere {list}.", { list: problems.map((problem) => t(problem)).join(", ") }));
      return;
    }
    const done = await run(() => api.signUp({ email, password, displayName: name, legalVersion: LEGAL_VERSION }));
    if (done !== undefined) {
      onGo("verify");
    }
  }

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <Field label={t("Nome da mostrare")} autoComplete="nickname" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
      <Field label={t("Email")} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Field
        label={t("Password (almeno {n} caratteri, con maiuscole, minuscole e numeri)", { n: PASSWORD_MIN })}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <div className="account-consents">
        <ConsentCheck checked={legal} onChange={setLegal} />
        <label className="share-check legal-check">
          <input type="checkbox" className="check" checked={health} onChange={(event) => setHealth(event.target.checked)} />
          <span>
            {t("Acconsento a salvare online i miei dati di LowCor, che possono dire qualcosa sulla mia salute (energia, giornate no, focus). Posso ritirare il consenso cancellando l'account.")}
          </span>
        </label>
        <label className="share-check legal-check">
          <input type="checkbox" className="check" checked={age} onChange={(event) => setAge(event.target.checked)} />
          <span>{t("Ho almeno 14 anni")}</span>
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
      <div className="editor-actions">
        <button type="submit" className="button button--primary" disabled={busy || !legal || !health || !age}>
          {t("Crea l'account")}
        </button>
        <button type="button" className="button button--ghost" onClick={() => onGo("signin")}>
          {t("Ho già un account")}
        </button>
      </div>
    </form>
  );
}

function Verify({ email, onGo }) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useTask();

  async function handleSubmit(event) {
    event.preventDefault();
    await run(() => api.verifySignup(email, code));
  }

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <p className="account-lead">
        {t("Se l'indirizzo {email} non era già registrato, ti abbiamo mandato un codice di 6 cifre. Scade tra 15 minuti.", { email })}
      </p>
      <Field
        label={t("Codice")}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
      />
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
      {sent && <p className="account-lead">{t("Nuovo codice inviato.")}</p>}
      <div className="editor-actions">
        <button type="submit" className="button button--primary" disabled={busy || code.length !== 6}>
          {t("Conferma")}
        </button>
        <button
          type="button"
          className="button button--ghost"
          disabled={busy}
          onClick={async () => {
            const done = await run(() => api.resendSignup(email));
            setSent(done !== undefined);
          }}
        >
          {t("Manda un nuovo codice")}
        </button>
      </div>
      <button type="button" className="button button--quiet account-link" onClick={() => onGo("signin")}>
        {t("Torna all'accesso")}
      </button>
    </form>
  );
}

function Forgot({ email, setEmail, onGo }) {
  const [step, setStep] = useState("ask");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, setError, run } = useTask();

  async function handleAsk(event) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Controlla l'indirizzo email.");
      return;
    }
    // La risposta è la stessa che l'indirizzo esista o no: non si rivela chi ha un account
    const done = await run(() => api.requestPasswordReset(email));
    if (done !== undefined) {
      setStep("code");
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    const problems = passwordProblems(password);
    if (problems.length > 0) {
      setError(t("La password deve avere {list}.", { list: problems.map((problem) => t(problem)).join(", ") }));
      return;
    }
    await run(() => api.resetPassword(email, code, password));
  }

  if (step === "ask") {
    return (
      <form className="account-form" onSubmit={handleAsk} noValidate>
        <p className="account-lead">{t("Ti mandiamo un codice per scegliere una nuova password.")}</p>
        <Field label={t("Email")} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        {error && (
          <p className="form-error" role="alert">
            {t(error)}
          </p>
        )}
        <div className="editor-actions">
          <button type="submit" className="button button--primary" disabled={busy}>
            {t("Manda il codice")}
          </button>
          <button type="button" className="button button--ghost" onClick={() => onGo("signin")}>
            {t("Annulla")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="account-form" onSubmit={handleReset} noValidate>
      <p className="account-lead">{t("Se {email} ha un account, è arrivato un codice di 6 cifre.", { email })}</p>
      <Field
        label={t("Codice")}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
      />
      <Field
        label={t("Nuova password")}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
      <div className="editor-actions">
        <button type="submit" className="button button--primary" disabled={busy || code.length !== 6 || !password}>
          {t("Cambia la password")}
        </button>
      </div>
    </form>
  );
}

function downloadJson(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Il nome arriva dal server dopo il login: chi la usa le dà come key il nome salvato
function NameForm({ cloud, notify }) {
  const [name, setName] = useState(cloud.profileName);
  const { busy, error, run } = useTask();

  async function saveName(event) {
    event.preventDefault();
    const saved = await run(() => api.updateProfile(name));
    if (saved !== undefined) {
      cloud.setProfileName(saved);
      notify(t("Nome aggiornato"));
    }
  }

  return (
    <form className="account-name" onSubmit={saveName}>
      <Field label={t("Nome da mostrare")} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
      <button type="submit" className="button button--ghost" disabled={busy || !name.trim() || name.trim() === cloud.profileName}>
        {t("Salva")}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
    </form>
  );
}

function SignedIn({ cloud, today, onClearDevice, notify }) {
  const [confirm, setConfirm] = useState(null);
  const [typed, setTyped] = useState("");
  const { busy, error, run } = useTask();
  const word = t("ELIMINA");

  async function exportData() {
    const exported = await run(() => api.exportMyData());
    if (exported) {
      downloadJson(exported, `lowcor-account-${today}.json`);
    }
  }

  async function signOut(clearDevice) {
    const done = await run(async () => {
      await api.signOut();
      return true;
    });
    if (done && clearDevice) {
      onClearDevice();
    }
  }

  async function deleteAccount() {
    const done = await run(async () => {
      await api.deleteAccount();
      return true;
    });
    if (done) {
      notify(t("Account cancellato. I dati restano solo su questo dispositivo."));
    }
  }

  return (
    <div className="account-form">
      <p className="account-status" role="status">
        <span className={`account-dot account-dot--${cloud.status}`} aria-hidden="true" />
        {cloud.user.email} · {t(STATUS[cloud.status] || "")}
      </p>

      <NameForm key={cloud.profileName} cloud={cloud} notify={notify} />

      <People onChange={cloud.republish} />

      <section className="account-section" aria-labelledby="account-data-title">
        <h3 id="account-data-title" className="account-section-title">
          {t("I tuoi dati")}
        </h3>
        <div className="editor-actions">
          <button type="button" className="button button--ghost" onClick={exportData} disabled={busy}>
            {t("Scarica i dati dell'account")}
          </button>
          <button type="button" className="button button--ghost" onClick={() => signOut(false)} disabled={busy}>
            {t("Esci")}
          </button>
          <button type="button" className="button button--ghost" onClick={() => setConfirm("signout")} disabled={busy}>
            {t("Esci e togli i dati da qui")}
          </button>
          <button type="button" className="button button--ghost" onClick={() => run(() => api.signOutEverywhere())} disabled={busy}>
            {t("Esci da tutti i dispositivi")}
          </button>
        </div>
        {confirm === "signout" && (
          <div className="settings-backup-confirm" role="alert">
            <p>{t("Esco e cancello i dati di LowCor da questo dispositivo. Restano salvati nel tuo account.")}</p>
            <div className="editor-actions">
              <button type="button" className="button button--primary" onClick={() => signOut(true)}>
                {t("Esci e cancella da qui")}
              </button>
              <button type="button" className="button button--ghost" onClick={() => setConfirm(null)}>
                {t("Annulla")}
              </button>
            </div>
          </div>
        )}
        <button type="button" className="button button--quiet settings-danger" onClick={() => setConfirm("delete")}>
          {t("Cancella l'account")}
        </button>
        {confirm === "delete" && (
          <div className="settings-backup-confirm" role="alert">
            <p>
              {t("Cancello per sempre account, dati online, collegamenti e inviti. I dati su questo dispositivo restano. Scrivi {word} per confermare.", { word })}
            </p>
            <input className="field" value={typed} onChange={(event) => setTyped(event.target.value)} aria-label={t("Conferma la cancellazione")} />
            <div className="editor-actions">
              <button type="button" className="button button--primary" disabled={typed.trim() !== word || busy} onClick={deleteAccount}>
                {t("Cancella per sempre")}
              </button>
              <button type="button" className="button button--ghost" onClick={() => setConfirm(null)}>
                {t("Annulla")}
              </button>
            </div>
          </div>
        )}
      </section>
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}

function AccountDialog({ cloud, today, onClose, onClearDevice, notify }) {
  const dialogRef = useModal();
  const [screen, setScreen] = useState("signin");
  const [email, setEmail] = useState("");
  const titles = {
    signin: "Accedi",
    signup: "Crea un account",
    verify: "Conferma l'email",
    forgot: "Nuova password",
  };
  const title = cloud.user ? "Account" : titles[screen];

  return (
    <dialog
      ref={dialogRef}
      className="editor account"
      aria-labelledby="account-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="editor-form">
        <div className="editor-head">
          <h2 id="account-title" className="section-title">
            {t(title)}
          </h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("Chiudi")}>
            <IconClose />
          </button>
        </div>
        {cloud.user ? (
          <SignedIn cloud={cloud} today={today} onClearDevice={onClearDevice} notify={notify} />
        ) : screen === "signup" ? (
          <SignUp email={email} setEmail={setEmail} onGo={setScreen} />
        ) : screen === "verify" ? (
          <Verify email={email} onGo={setScreen} />
        ) : screen === "forgot" ? (
          <Forgot email={email} setEmail={setEmail} onGo={setScreen} />
        ) : (
          <SignIn email={email} setEmail={setEmail} onGo={setScreen} />
        )}
      </div>
    </dialog>
  );
}

export default AccountDialog;
