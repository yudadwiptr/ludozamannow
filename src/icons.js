// ============================================================================
// LudoZ — SVG Icon Set (replaces emoji for crisp, theme-colored UI glyphs)
// All icons are 24x24, stroke-based and inherit `currentColor`.
// ============================================================================

const P = {
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.3" cy="8.3" r="1.3" fill="currentColor"/><circle cx="15.7" cy="8.3" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="8.3" cy="15.7" r="1.3" fill="currentColor"/><circle cx="15.7" cy="15.7" r="1.3" fill="currentColor"/>',
  odd: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/>',
  even: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/>',
  volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  volumeOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9v.5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>',
  gamepad: '<path d="M7 7.5h10a4.5 4.5 0 0 1 4.4 5.5l-.8 3.6a2.4 2.4 0 0 1-4.1 1.1L14.4 15H9.6l-2.1 2.7a2.4 2.4 0 0 1-4.1-1.1L2.6 13A4.5 4.5 0 0 1 7 7.5z"/><path d="M7.5 10.5v3M6 12h3"/><circle cx="16" cy="11" r=".8" fill="currentColor"/><circle cx="17.6" cy="13" r=".8" fill="currentColor"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.7 1.8-1.6 0-1.3-1.2-1.6-1.2-2.7 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor"/>',
  play: '<path d="M7 4.8v14.4a1 1 0 0 0 1.5.9l11.3-7.2a1 1 0 0 0 0-1.7L8.5 3.9A1 1 0 0 0 7 4.8z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  key: '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3M16.5 6.5l2.5 2.5M14 9l2 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3.5"/><path d="M12 4v4"/><circle cx="12" cy="3.5" r="1" fill="currentColor"/><circle cx="9" cy="14" r="1.4" fill="currentColor"/><circle cx="15" cy="14" r="1.4" fill="currentColor"/><path d="M2 13v3M22 13v3"/>',
  off: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  crown: '<path d="M3.5 8l4.5 4 4-7 4 7 4.5-4-2 11h-13z"/><path d="M5.5 19h13"/>',
  bolt: '<path d="M13.5 2.5L5 13.5h6l-1 8 8.5-11h-6z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  crosshair: '<circle cx="12" cy="12" r="7"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/>',
  skull: '<path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.3 3 5.4V20h10v-3.6c1.8-1.1 3-2.8 3-5.4a8 8 0 0 0-8-8z"/><circle cx="9" cy="11.5" r="1.8" fill="currentColor"/><circle cx="15" cy="11.5" r="1.8" fill="currentColor"/><path d="M10.5 20v-2M13.5 20v-2"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8c-1.2-2.8-5.5-3.8-5.5-1.3S9.5 8 12 8zM12 8c1.2-2.8 5.5-3.8 5.5-1.3S14.5 8 12 8z"/>',
  portal: '<path d="M12 12a2 2 0 1 1 2-2 4 4 0 0 1-4 4 6 6 0 0 1-6-6"/><path d="M12 12a2 2 0 1 0-2 2 4 4 0 0 0 4-4 6 6 0 0 0-6-6" opacity=".55"/><path d="M14 10a6 6 0 0 1-2 8.5M10 14a6 6 0 0 1 2-8.5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  gem: '<path d="M6.5 3.5h11l3.5 5.5-9 11.5L3 9z"/><path d="M3 9h18M9.5 3.5L8 9l4 11.5L16 9l-1.5-5.5"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" opacity=".6"/><path d="M12 12l6-6"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  feed: '<circle cx="6" cy="18" r="1.6" fill="currentColor"/><path d="M4.5 11a8.5 8.5 0 0 1 8.5 8.5"/><path d="M4.5 4.5a15 15 0 0 1 15 15"/>',
  chat: '<path d="M4 5.5h16v10H10l-4.5 4v-4H4z"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01" stroke-width="2.6"/>',
  backpack: '<path d="M6 9a6 6 0 0 1 12 0v11H6z"/><path d="M9.5 3.8V3h5v.8"/><rect x="9" y="13" width="6" height="4" rx="1"/>',
  burst: '<path d="M12 2.5l1.8 5.2 5.4-2.1-2.6 5.1 4.9 2.6-5.4 1.3.9 5.6-4.9-3-4.4 3.6.7-5.6-5.5-.8 4.6-3.1-2.8-5 5.5 1.7z"/>',
  cube: '<path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z"/><path d="M4 7.4l8 4.6 8-4.6M12 12v9.2"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 12h16M12 4v16" opacity=".5"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/><path d="M12 14v3.5M8 20.5h8M9.5 17.5h5v3h-5z"/>',
  hourglass: '<path d="M6.5 3h11M6.5 21h11"/><path d="M7.5 3v3.5L12 12l4.5-5.5V3M7.5 21v-3.5L12 12l4.5 5.5V21"/>',
  pointer: '<path d="M9 11V5a1.5 1.5 0 0 1 3 0v5"/><path d="M12 10V8.5a1.5 1.5 0 0 1 3 0V11"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.9-2.6L3.6 15a1.6 1.6 0 0 1 2.6-1.8L9 15.5"/>',
  magnet: '<path d="M5 4h4v8a3 3 0 0 0 6 0V4h4v8a7 7 0 0 1-14 0z"/><path d="M5 8h4M15 8h4"/>',
  mirror: '<rect x="3" y="6" width="8" height="12" rx="2"/><rect x="13" y="6" width="8" height="12" rx="2" opacity="0.55"/><circle cx="7" cy="12" r="1.3" fill="currentColor"/><circle cx="17" cy="12" r="1.3" fill="currentColor"/>',
  slime: '<path d="M12 3.5c3.6 4.4 6 7.6 6 10.5a6 6 0 0 1-12 0c0-2.9 2.4-6.1 6-10.5z"/><path d="M9.3 14.5a2.8 2.8 0 0 0 2.4 2.6"/>',
  flame: '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.3-3.2-6.4-4.5-11-2.6 2-3.4 4.6-3.2 6.7C9.7 9.4 8.8 8.4 8.6 7 6.6 9 5.5 11.4 5.5 14.5A6.5 6.5 0 0 0 12 21z"/><path d="M12 21a2.8 2.8 0 0 1-2.8-2.8c0-1.9 1.7-2.7 2.8-4.7 1.1 2 2.8 2.8 2.8 4.7A2.8 2.8 0 0 1 12 21z"/>',
  map: '<path d="M3.5 6.5l5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  pawn: '<circle cx="12" cy="6.5" r="3.2"/><path d="M9.6 10.5h4.8l1.4 6H8.2z"/><path d="M6 20.5h12M7.5 16.5h9l1 4h-11z"/>',
  layers: '<path d="M12 3.5l9 4.5-9 4.5L3 8z"/><path d="M3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5" opacity=".7"/>',
  rotateCw: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4.5V11h-6.5"/>',
  rotateCcw: '<path d="M4 11a8 8 0 1 1 2.3 5.7"/><path d="M4 4.5V11h6.5"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".7" fill="currentColor"/>',
  bulb: '<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2v1.5h5V16c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  book: '<path d="M4 4.5h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4.5h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  swap: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  laugh: '<circle cx="12" cy="12" r="9"/><path d="M7.5 13.5a4.5 4.5 0 0 0 9 0z" fill="currentColor" fill-opacity=".25"/><path d="M8 9.5l1.6-1 1.4 1M13 9.5l1.4-1 1.6 1"/>',
  pray: '<path d="M12 4l-3 8-3 3.5V20M12 4l3 8 3 3.5V20"/><path d="M12 4v11"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  sparkle: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/><path d="M19 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.2" r="1.1" fill="currentColor"/>',
  dot: '<circle cx="12" cy="12" r="5" fill="currentColor"/>',
};

/** Raw inner SVG markup for an icon (for embedding into larger SVGs). */
export function iconInner(name) {
  return P[name] || P.dot;
}

/**
 * Render an inline SVG icon string.
 * @param {string} name icon key
 * @param {object} [o] { size, cls, stroke, title }
 */
export function icon(name, o = {}) {
  const size = o.size ? ` width="${o.size}" height="${o.size}"` : '';
  const cls = `ico ico-${name}${o.cls ? ' ' + o.cls : ''}`;
  const sw = o.stroke ?? 2;
  const title = o.title ? `<title>${o.title}</title>` : '';
  return `<svg class="${cls}"${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="${o.title ? 'false' : 'true'}">${title}${iconInner(name)}</svg>`;
}

/** Icon + label helper, e.g. for buttons. */
export function iconLabel(name, label, o = {}) {
  return `${icon(name, o)}<span>${label}</span>`;
}

// Matches pictographic emoji + variation selectors / ZWJ / regional flags.
const EMOJI_RE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u{FE0F}\u{200D}\u{20E3}])/gu;

/** Remove emoji from plain text (engine logs, floating combat text, etc). */
export function stripEmoji(text) {
  return String(text ?? '')
    .replace(EMOJI_RE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[:\-—]\s*/, '')
    .trim();
}
