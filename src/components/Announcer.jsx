import { useEffect, useRef } from "react";
import "./Announcer.css";

const DURATION = { big: 2800, small: 1800 };

function Announcer({ announcement, onDone }) {
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!announcement) {
      return undefined;
    }
    const timerId = setTimeout(
      () => onDoneRef.current(),
      DURATION[announcement.size || "big"]
    );
    return () => clearTimeout(timerId);
  }, [announcement]);

  return (
    <div className="announcer" aria-live="polite">
      {announcement && (
        <div
          key={announcement.id}
          className={`announce announce--${announcement.size || "big"} announce--${announcement.tone || "planned"}`}
        >
          <p className="announce-title">{announcement.title}</p>
          {announcement.sub && <p className="announce-sub">{announcement.sub}</p>}
          {announcement.aura > 0 && <p className="announce-aura">+{announcement.aura} aura</p>}
        </div>
      )}
    </div>
  );
}

export default Announcer;
