import { useEffect, useRef } from "react";
import { t } from "../i18n";

const TOAST_MS = 5000;

function Toast({ toast, onUndo, onClose }) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    const timerId = setTimeout(() => onCloseRef.current(), TOAST_MS);
    return () => clearTimeout(timerId);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div key={toast.id} className="toast" role="status">
      <span>{toast.message}</span>
      {toast.undo && (
        <button type="button" className="toast-undo" onClick={onUndo}>
          {t("Annulla")}
        </button>
      )}
    </div>
  );
}

export default Toast;
