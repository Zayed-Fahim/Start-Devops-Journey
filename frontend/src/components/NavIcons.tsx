const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const IconCube = (
  <svg {...base} className="size-6" aria-hidden="true">
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </svg>
);

export const IconUsers = (
  <svg {...base} className="size-5" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconTeams = (
  <svg {...base} className="size-5" aria-hidden="true">
    <circle cx="12" cy="7" r="3" />
    <circle cx="5" cy="17" r="2.5" />
    <circle cx="19" cy="17" r="2.5" />
    <path d="M12 10v3M12 13 7 15.5M12 13l5 2.5" />
  </svg>
);

export const IconLock = (
  <svg {...base} className="size-5" aria-hidden="true">
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

export const IconHistory = (
  <svg {...base} className="size-5" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v4h4" />
    <path d="M12 8v4l3 2" />
  </svg>
);

export const IconSettings = (
  <svg {...base} className="size-5" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.4.55.71.66H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const IconSearch = (
  <svg {...base} className="size-5" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconPlus = (
  <svg {...base} className="size-[18px]" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconMenu = (
  <svg {...base} className="size-5" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconTrendUp = (
  <svg {...base} className="size-4" aria-hidden="true">
    <path d="m3 17 6-6 4 4 7-7" />
    <path d="M14 8h6v6" />
  </svg>
);

export const IconBolt = (
  <svg {...base} className="size-5" aria-hidden="true">
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </svg>
);

export const IconShield = (
  <svg {...base} className="size-5" aria-hidden="true">
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
  </svg>
);

export const IconCode = (
  <svg {...base} className="size-5" aria-hidden="true">
    <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
  </svg>
);

export const IconHelp = (
  <svg {...base} className="size-5" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.5a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconDocs = (
  <svg {...base} className="size-5" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);

export const IconBell = (
  <svg {...base} className="size-5" aria-hidden="true">
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export const IconChevronRight = (
  <svg {...base} className="size-4" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconOverview = (
  <svg {...base} className="size-5" aria-hidden="true">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

export const IconChevronLeft = (
  <svg {...base} className="size-5" aria-hidden="true">
    <path d="m15 6-6 6 6 6" />
  </svg>
);
