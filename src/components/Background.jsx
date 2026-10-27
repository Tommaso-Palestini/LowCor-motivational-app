import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../logic/motion";
import "./Background.css";

// La lava è disegnata su un solo canvas piccolo (1/8 dello schermo) e ingrandito dal CSS:
// i gradienti morbidi non perdono niente, e il browser compone un solo strato opaco invece di sei
// gradienti giganti semitrasparenti a ogni fotogramma di scroll. Si aggiorna 20 volte al secondo,
// più che sufficiente per blob che si muovono in un minuto e mezzo.
const SCALE = 8;
const FRAME_MS = 50;

// Posizione (in frazioni di vmax dal bordo), dimensione, tinta relativa, periodo e ampiezza del moto
const BLOBS = [
  { x: -0.2, y: -0.25, size: 0.62, offset: 0, period: 70, dx: 0.12, dy: 0.28, alpha: 0.5 },
  { x: 0.7, y: 0.1, size: 0.62, offset: 55, period: 95, dx: -0.22, dy: 0.12, alpha: 0.5 },
  { x: 0.05, y: 0.55, size: 0.62, offset: 120, period: 82, dx: 0.26, dy: -0.18, alpha: 0.5 },
  { x: 0.6, y: 0.6, size: 0.48, offset: 190, period: 110, dx: -0.16, dy: -0.2, alpha: 0.5 },
  { x: -0.25, y: 0.3, size: 0.44, offset: 250, period: 125, dx: 0.14, dy: -0.18, alpha: 0.38 },
  { x: 0.35, y: -0.15, size: 0.4, offset: 310, period: 140, dx: -0.12, dy: 0.16, alpha: 0.36 },
];

function readHue() {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hue"));
  return Number.isFinite(value) ? value : 290;
}

function paint(context, width, height, time, hue) {
  const vmax = Math.max(width, height);
  context.fillStyle = `oklch(0.19 0.045 ${hue})`;
  context.fillRect(0, 0, width, height);

  BLOBS.forEach((blob) => {
    // Moto avanti e indietro, morbido come l'animazione CSS di prima
    const phase = (Math.sin(((time / 1000) * Math.PI * 2) / (blob.period * 2)) + 1) / 2;
    const radius = (blob.size * vmax) / 2;
    const cx = (blob.x + blob.dx * phase) * vmax + radius;
    const cy = (blob.y + blob.dy * phase) * vmax + radius;
    const blobHue = hue + blob.offset;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `oklch(0.62 0.15 ${blobHue} / ${blob.alpha})`);
    gradient.addColorStop(0.45, `oklch(0.55 0.13 ${blobHue} / ${blob.alpha * 0.45})`);
    gradient.addColorStop(1, `oklch(0.55 0.13 ${blobHue} / 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });

  // Vignetta ai bordi
  const vignette = context.createRadialGradient(width / 2, height / 2, vmax * 0.25, width / 2, height / 2, vmax * 0.75);
  vignette.addColorStop(0, "rgba(15, 12, 32, 0)");
  vignette.addColorStop(1, "rgba(15, 12, 32, 0.65)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

function Lava({ animated }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: false });
    let frameId = null;
    let lastPaint = 0;

    function resize() {
      canvas.width = Math.max(1, Math.ceil(window.innerWidth / SCALE));
      canvas.height = Math.max(1, Math.ceil(window.innerHeight / SCALE));
    }

    function draw(time) {
      paint(context, canvas.width, canvas.height, time, readHue());
    }

    function loop(time) {
      frameId = requestAnimationFrame(loop);
      if (document.hidden || time - lastPaint < FRAME_MS) {
        return;
      }
      lastPaint = time;
      draw(prefersReducedMotion() ? 0 : time);
    }

    resize();
    draw(0);
    if (animated) {
      frameId = requestAnimationFrame(loop);
    } else {
      // Ferma, ma segue comunque l'onda di colori una volta al secondo
      frameId = setInterval(() => draw(0), 1000);
    }
    const handleResize = () => {
      resize();
      draw(performance.now());
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [animated]);

  return <canvas ref={canvasRef} className="lava" aria-hidden="true" />;
}

function Background({ animated, image, dim }) {
  if (image) {
    return (
      <div className="custom-bg" aria-hidden="true">
        <div className="custom-bg-image" style={{ backgroundImage: `url(${image})` }} />
        <div className="custom-bg-veil" style={{ "--dim": `${dim}%` }} />
      </div>
    );
  }
  return <Lava animated={animated} />;
}

export default Background;
