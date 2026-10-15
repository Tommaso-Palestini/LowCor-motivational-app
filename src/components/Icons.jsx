const baseProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function IconClose() {
  return (
    <svg {...baseProps}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function IconPlus() {
  return (
    <svg {...baseProps}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg {...baseProps}>
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function IconShuffle() {
  return (
    <svg {...baseProps}>
      <path d="M2 4.5h2.2c1.4 0 2.2.6 3 1.8l1.6 2.4c.8 1.2 1.6 1.8 3 1.8H14" />
      <path d="M2 11.5h2.2c1.4 0 2.2-.6 3-1.8" />
      <path d="M8.8 6.3c.8-1.2 1.6-1.8 3-1.8H14" />
      <path d="M12.3 2.8l1.7 1.7-1.7 1.7M12.3 8.8l1.7 1.7-1.7 1.7" />
    </svg>
  );
}