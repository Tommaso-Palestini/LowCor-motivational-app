import { useCallback, useEffect, useState } from "react";
import * as api from "../../cloud/api";
import { SHARE_LEVELS, cloudErrorMessage, inviteFromText, inviteLink } from "../../logic/cloud";
import { consumePendingInvite } from "../../logic/invite";
import { t } from "../../i18n";

// Persone collegate: un invito per collegarsi, e per ognuna la scelta di cosa mostrarle
function People({ onChange }) {
  const [connections, setConnections] = useState(null);
  const [invite, setInvite] = useState(null);
  const [code, setCode] = useState(() => consumePendingInvite() || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setConnections(await api.myConnections());
    } catch (caught) {
      setError(cloudErrorMessage(caught));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .myConnections()
      .then((rows) => alive && setConnections(rows))
      .catch((caught) => alive && setError(cloudErrorMessage(caught)));
    return () => {
      alive = false;
    };
  }, []);

  async function run(task) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (caught) {
      setError(cloudErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function createInvite() {
    return run(async () => {
      const created = await api.createInvite();
      setInvite({ ...created, link: inviteLink(window.location.origin, created.token) });
    });
  }

  function copyInvite() {
    return run(async () => {
      const text = t("Collegati con me su LowCor: {link} (oppure incolla il codice {code})", { link: invite.link, code: invite.token });
      if (navigator.share) {
        await navigator.share({ text }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(text);
        setMessage(t("Invito copiato."));
      }
    });
  }

  function acceptInvite(event) {
    event.preventDefault();
    const token = inviteFromText(code);
    if (!token) {
      setError(cloudErrorMessage("invalid"));
      return undefined;
    }
    return run(async () => {
      const result = await api.acceptInvite(token);
      if (!result.ok) {
        setError(cloudErrorMessage(result.reason));
        return;
      }
      setCode("");
      setMessage(t("Ora sei collegato con {name}.", { name: result.display_name }));
      await load();
      onChange();
    });
  }

  function setLevel(person, level) {
    return run(async () => {
      await api.setShareLevel(person.id, level);
      await load();
      onChange();
    });
  }

  function remove(person) {
    return run(async () => {
      await api.removeConnection(person.id);
      await load();
      onChange();
    });
  }

  return (
    <section className="account-section" aria-labelledby="people-title">
      <h3 id="people-title" className="account-section-title">
        {t("Persone collegate")}
      </h3>
      <p className="account-lead">
        {t("Chi è collegato vede i tuoi impegni delle prossime 4 settimane, come scegli tu: solo occupato/libero, oppure anche i titoli. Note ed energia non si vedono mai.")}
      </p>

      {connections === null ? (
        <p className="account-lead">{t("Carico…")}</p>
      ) : connections.length === 0 ? (
        <p className="account-lead">{t("Ancora nessuno.")}</p>
      ) : (
        <ul className="people-list">
          {connections.map((person) => (
            <li key={person.id} className="people-item">
              <div className="people-who">
                <span className="people-name">{person.display_name}</span>
                <span className="people-meta">
                  {t("Ti mostra: {level}", {
                    level: t(SHARE_LEVELS.find((item) => item.id === person.they_share)?.label || "Niente").toLowerCase(),
                  })}
                </span>
              </div>
              <label className="people-level">
                <span className="sr-only">{t("Cosa mostri a {name}", { name: person.display_name })}</span>
                <select className="field" value={person.i_share} disabled={busy} onChange={(event) => setLevel(person, event.target.value)}>
                  {SHARE_LEVELS.map((level) => (
                    <option key={level.id} value={level.id}>
                      {t(level.label)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button--quiet"
                disabled={busy}
                onClick={() => remove(person)}
                aria-label={t("Scollega {name}", { name: person.display_name })}
              >
                {t("Scollega")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {invite ? (
        <div className="people-invite">
          <p className="account-lead">{t("Manda questo codice alla persona da collegare. Vale per una persona sola, per 7 giorni.")}</p>
          <code className="people-code">{invite.token}</code>
          <button type="button" className="button button--ghost" onClick={copyInvite} disabled={busy}>
            {t("Condividi l'invito")}
          </button>
        </div>
      ) : (
        <button type="button" className="button button--ghost" onClick={createInvite} disabled={busy}>
          {t("Invita una persona")}
        </button>
      )}

      <form className="people-accept" onSubmit={acceptInvite}>
        <label className="editor-field">
          <span>{t("Hai ricevuto un codice?")}</span>
          <input className="field" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" spellCheck="false" />
        </label>
        <button type="submit" className="button button--ghost" disabled={busy || !code.trim()}>
          {t("Collegati")}
        </button>
      </form>

      {message && (
        <p className="account-lead" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
    </section>
  );
}

export default People;
