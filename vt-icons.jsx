/* ============================================================
   VetTooth Pro — ícones (stroke, 24x24)
   ============================================================ */
const VT_ICON_PATHS = {
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  paw: 'M5.5 13.5a2 2 0 1 0 0-.01z M9 9a1.6 1.6 0 1 0 0-.01z M15 9a1.6 1.6 0 1 0 0-.01z M18.5 13.5a2 2 0 1 0 0-.01z M8 17.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5-1.8 2.5-4 2.5-4-.5-4-2.5z',
  users: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19 M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4 M15.5 5.2a3 3 0 0 1 0 5.6',
  calendar: 'M7 3v3 M17 3v3 M4 8h16 M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
  tooth: 'M8 3c-2.5 0-4 1.8-4 4.5 0 2 .8 3 1.2 5.5.3 2 .3 5 1.8 5 1.4 0 1.3-2.5 2-4.5.3-.9.7-1.5 1-1.5s.7.6 1 1.5c.7 2 .6 4.5 2 4.5 1.5 0 1.5-3 1.8-5C16.2 10.5 17 9.5 17 7.5 17 4.8 15.5 3 13 3c-1.4 0-2 .8-2.5.8S9.4 3 8 3z',
  pen: 'M4 20l4-1L19 8a2 2 0 0 0-3-3L5 16l-1 4z M14 7l3 3',
  box: 'M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z M3.5 7.5L12 12l8.5-4.5 M12 12v9',
  dollar: 'M12 3v18 M16 7.5C16 6 14.5 5 12.5 5h-1C9.6 5 8 6 8 7.8 8 11 16 10 16 13.5c0 1.8-1.6 3-3.5 3h-1C9.5 19.5 8 18.4 8 17',
  chart: 'M4 20V4 M4 20h16 M8 16v-4 M12 16V9 M16 16v-7',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M19.4 13.5l1.6 1-2 3.4-1.9-.7a6.8 6.8 0 0 1-1.6.9L15 21h-4l-.5-1.9a6.8 6.8 0 0 1-1.6-.9l-1.9.7-2-3.4 1.6-1a6.6 6.6 0 0 1 0-1.8l-1.6-1 2-3.4 1.9.7a6.8 6.8 0 0 1 1.6-.9L11 3h4l.5 1.9a6.8 6.8 0 0 1 1.6.9l1.9-.7 2 3.4-1.6 1a6.6 6.6 0 0 1 0 3z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M18 16l.7 2 .3 .7-2-.7z',
  bell: 'M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6 M10.5 19a1.8 1.8 0 0 0 3 0',
  search: 'M11 11m-7 0a7 7 0 1 0 14 0 7 7 0 1 0-14 0 M21 21l-4.3-4.3',
  chevron: 'M6 9l6 6 6-6',
  plus: 'M12 5v14 M5 12h14',
  syringe: 'M18 2l4 4 M15 5l4 4 M8.5 9.5l5 5 M3 21l3-1 8-8-2-2-8 8-1 3z M14 8l2 2',
  alert: 'M12 3l9 16H3z M12 10v4 M12 17v.5',
  receipt: 'M6 3h12v18l-2.5-1.5L13 21l-1-1.5L11 21l-2.5-1.5L6 21z M9 8h6 M9 12h6',
  stethoscope: 'M6 3v5a4 4 0 0 0 8 0V3 M10 16a5 5 0 0 0 5 5 4 4 0 0 0 4-4v-2 M19 11a1.8 1.8 0 1 0 0 .01',
  pin: 'M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z M12 11a2 2 0 1 0 0-.01',
  phone: 'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 18v-3l-5-2-1.5 2.5',
  mail: 'M3 6h18v12H3z M3 7l9 6 9-6',
  user: 'M16 19v-1.5a4 4 0 0 0-4-4 4 4 0 0 0-4 4V19 M12 10a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4',
  check: 'M5 12.5l4.5 4.5L19 7',
  shield: 'M12 3l8 3v5c0 4.4-3.4 8.5-8 10-4.6-1.5-8-5.6-8-10V6z',
  link: 'M10 13a5 5 0 0 0 7.5.6l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7.5-.6l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z M14 3v5h5 M9 12h6 M9 16h4',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
};

function VtIcon({ name, size = 19 }) {
  const d = VT_ICON_PATHS[name] || VT_ICON_PATHS.grid;
  return (
    <svg className="vt-ic" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function VtLogoMark() {
  return (
    <svg className="vt-logo-mark" viewBox="0 0 40 40" fill="none">
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#102e4f" />
      <path d="M12 28 V17 C12 12 16 10 20 12 C24 10 28 12 28 17 V28" stroke="#14a8a0" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 12 C20 9 18 7.5 16 8 C17 9 17 10.5 16.5 11.5" stroke="#cfe0ee" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M20 12 C20 9 22 7.5 24 8 C23 9 23 10.5 23.5 11.5" stroke="#cfe0ee" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="16" y1="18" x2="16" y2="27" stroke="#14a8a0" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="24" y1="18" x2="24" y2="27" stroke="#14a8a0" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

Object.assign(window, { VtIcon, VtLogoMark });
