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

export function IconUser() {
  return (
    <svg {...baseProps}>
      <circle cx="8" cy="5.5" r="2.75" />
      <path d="M2.75 13.5c.8-2.6 2.8-4 5.25-4s4.45 1.4 5.25 4" />
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

export function IconSparkle() {
  return (
    <svg {...baseProps}>
      <path d="M8 1.8l1.3 3.6c.2.5.6.9 1.1 1.1L14 7.8l-3.6 1.3c-.5.2-.9.6-1.1 1.1L8 13.8l-1.3-3.6c-.2-.5-.6-.9-1.1-1.1L2 7.8l3.6-1.3c.5-.2.9-.6 1.1-1.1z" />
    </svg>
  );
}

export function IconBolt() {
  return (
    <svg {...baseProps}>
      <path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z" />
    </svg>
  );
}

export function IconRepeat() {
  return (
    <svg {...baseProps} width={12} height={12}>
      <path d="M2.5 7V6a2.5 2.5 0 0 1 2.5-2.5h7.5M10.5 1.5l2 2-2 2" />
      <path d="M13.5 9v1a2.5 2.5 0 0 1-2.5 2.5H3.5M5.5 14.5l-2-2 2-2" />
    </svg>
  );
}

export function IconChevronLeft() {
  return (
    <svg {...baseProps}>
      <path d="M10 3.5L5.5 8l4.5 4.5" />
    </svg>
  );
}

export function IconChevronRight() {
  return (
    <svg {...baseProps}>
      <path d="M6 3.5L10.5 8 6 12.5" />
    </svg>
  );
}

export function IconWand() {
  return (
    <svg {...baseProps}>
      <path d="M2.5 13.5l7-7M9.5 6.5l1.5-1.5" />
      <path d="M11.5 1.5v2M10.5 2.5h2M13.5 6v1.6M12.7 6.8h1.6M6 1.8v1.4M5.3 2.5h1.4" />
    </svg>
  );
}

export function IconCopy() {
  return (
    <svg {...baseProps}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
      <path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
    </svg>
  );
}

export function IconDownload() {
  return (
    <svg {...baseProps}>
      <path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" />
    </svg>
  );
}

export function IconPlay() {
  return (
    <svg {...baseProps}>
      <path d="M5 3.2v9.6c0 .5.5.8.9.5l7-4.8c.4-.3.4-.8 0-1L5.9 2.7c-.4-.3-.9 0-.9.5z" />
    </svg>
  );
}

export function IconPause() {
  return (
    <svg {...baseProps}>
      <path d="M5.5 3v10M10.5 3v10" />
    </svg>
  );
}

export function IconExpand() {
  return (
    <svg {...baseProps}>
      <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
    </svg>
  );
}

export function IconTarget() {
  return (
    <svg {...baseProps}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

export function IconMinimize() {
  return (
    <svg {...baseProps}>
      <path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5" />
    </svg>
  );
}

export function IconSettings() {
  return (
    <svg {...baseProps}>
      <path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" />
      <circle cx="10" cy="4.5" r="1.5" />
      <circle cx="6" cy="11.5" r="1.5" />
    </svg>
  );
}

export function IconSend() {
  return (
    <svg {...baseProps}>
      <path d="M2.5 8h9M8 3.5L12.5 8 8 12.5" />
    </svg>
  );
}

export function IconStop() {
  return (
    <svg {...baseProps}>
      <rect x="4" y="4" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function IconGrid() {
  return (
    <svg {...baseProps}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="M6.2 2.5v11M9.8 2.5v11M2.5 6.2h11M2.5 9.8h11" />
    </svg>
  );
}

export function IconBulb() {
  return (
    <svg {...baseProps}>
      <path d="M6 13.5h4M6.5 11.5h3M8 2.5a4 4 0 0 0-2.4 7.2c.5.4.9 1 .9 1.8h3c0-.8.4-1.4.9-1.8A4 4 0 0 0 8 2.5z" />
    </svg>
  );
}

export function IconCalendarPlus() {
  return (
    <svg {...baseProps}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
      <path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5M8 8.5v3M6.5 10h3" />
    </svg>
  );
}

export function IconBatteryLow() {
  return (
    <svg {...baseProps}>
      <rect x="1.5" y="4.5" width="11" height="7" rx="1.5" />
      <path d="M14.5 7v2M3.75 6.75v2.5" />
    </svg>
  );
}

export function IconSpinner({ className = "" }) {
  return (
    <svg {...baseProps} className={`spin ${className}`}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" fill="none" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
