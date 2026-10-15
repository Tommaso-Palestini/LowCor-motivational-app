import { useEffect, useState } from "react";

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timerId);
  }, [intervalMs]);

  return now;
}