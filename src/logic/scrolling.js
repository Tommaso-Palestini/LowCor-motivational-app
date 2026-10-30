// Sa se l'utente sta scorrendo la pagina. Mentre scorre, gli effetti decorativi (onda di colori,
// lava, onde dell'anello) si fermano: ogni loro aggiornamento costringe il browser a ridipingere
// e, soprattutto su Safari, ruberebbe i fotogrammi allo scroll. Ripartono appena il dito si ferma.
const QUIET_MS = 250;

let lastActivity = -Infinity;
let listening = false;

function mark() {
  lastActivity = performance.now();
}

function listen() {
  if (listening || typeof window === "undefined") {
    return;
  }
  listening = true;
  const options = { passive: true, capture: true };
  window.addEventListener("scroll", mark, options);
  window.addEventListener("wheel", mark, options);
  window.addEventListener("touchmove", mark, options);
}

export function isScrolling() {
  listen();
  return performance.now() - lastActivity < QUIET_MS;
}
