import { useEffect, useState } from "react";
import * as api from "../../cloud/api";
import { cloudErrorMessage, groupShared } from "../../logic/cloud";
import { formatDate } from "../../logic/dates";
import { minutesToTime } from "../../logic/time";
import { t } from "../../i18n";
import "./Account.css";

// Gli impegni che le persone collegate hanno scelto di mostrarti, per la settimana in vista.
// Chi la usa le dà come key la settimana: cambiando settimana riparte vuota.
function SharedSchedule({ from, to }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .sharedSchedule(from, to)
      .then((rows) => alive && setItems(rows))
      .catch((caught) => alive && setError(cloudErrorMessage(caught)));
    return () => {
      alive = false;
    };
  }, [from, to]);

  if (error) {
    return (
      <section className="panel shared" aria-labelledby="shared-title">
        <h2 id="shared-title" className="section-title">
          {t("Impegni condivisi")}
        </h2>
        <p className="form-error">{t(error)}</p>
      </section>
    );
  }
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="panel shared" aria-labelledby="shared-title">
      <h2 id="shared-title" className="section-title">
        {t("Impegni condivisi")}
      </h2>
      {groupShared(items).map((group) => (
        <div key={group.day} className="shared-day">
          <h3 className="shared-day-title">{formatDate(group.day, { weekday: "long", day: "numeric", month: "long" })}</h3>
          <ul className="shared-list">
            {group.items.map((item, index) => (
              <li key={`${item.owner}-${item.start_min}-${index}`} className="shared-item">
                <span className="shared-time">
                  {minutesToTime(item.start_min)}–{minutesToTime(item.end_min)}
                </span>
                <span className="shared-title">
                  <strong>{item.display_name}</strong> · {item.title || t("Occupato")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default SharedSchedule;
