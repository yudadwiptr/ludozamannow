// ============================================================================
// LudoZ — Brand logo (vector recreation of the LUDOZ wordmark + Z-dice mark)
// ============================================================================

// Z-dice mark, drawn in a 0..420 x 0..570 box. The die's top face tumbles into
// the diagonal of the "Z"; pips are punched out via mask so any background shows.
const Z_SHAPE = `
  <path d="M5 82 Q2 74 10 70 L222 6 Q232 3 240 9 L404 128 Q414 136 408 146 L180 472 H330 V560 H30 V496 L262 196 L210 214 Q200 217 192 211 Z"/>`;

const Z_PIPS = `
  <ellipse cx="95" cy="92" rx="30" ry="16"/>
  <ellipse cx="205" cy="70" rx="30" ry="16"/>
  <ellipse cx="205" cy="112" rx="30" ry="16"/>
  <ellipse cx="320" cy="118" rx="30" ry="16"/>
  <ellipse cx="205" cy="160" rx="30" ry="16"/>`;

// Little "rolling" dots beside the die
const Z_DOTS = `
  <ellipse cx="38" cy="228" rx="12" ry="19" transform="rotate(25 38 228)"/>
  <ellipse cx="86" cy="200" rx="12" ry="19" transform="rotate(25 86 200)"/>
  <ellipse cx="134" cy="166" rx="12" ry="19" transform="rotate(25 134 166)"/>
  <ellipse cx="340" cy="332" rx="11" ry="17" transform="rotate(25 340 332)"/>`;

const LUDO_LETTERS = `
  <path d="M0 72 H100 V470 H208 V555 H0 Z"/>
  <path d="M288 72 H368 V440 Q368 472 383 472 Q398 472 398 440 V72 H478 V455 Q478 562 383 562 Q288 562 288 455 Z"/>
  <path fill-rule="evenodd" d="M538 72 H655 Q753 72 753 172 V455 Q753 555 655 555 H538 Z M618 152 V475 H640 Q668 475 668 445 V182 Q668 152 640 152 Z"/>
  <path fill-rule="evenodd" d="M923 62 Q1033 62 1033 178 V449 Q1033 565 923 565 Q813 565 813 449 V178 Q813 62 923 62 Z M923 150 Q898 150 898 180 V447 Q898 477 923 477 Q948 477 948 447 V180 Q948 150 923 150 Z"/>`;

let uid = 0;

function zMark(maskId, fill) {
  return `
    <mask id="${maskId}" maskUnits="userSpaceOnUse" x="-20" y="-20" width="480" height="620">
      <rect x="-20" y="-20" width="480" height="620" fill="#fff"/>
      <g fill="#000">${Z_PIPS}</g>
    </mask>
    <g fill="${fill}" mask="url(#${maskId})">${Z_SHAPE}</g>
    <g fill="${fill}">${Z_DOTS}</g>`;
}

/**
 * Full LUDOZ wordmark.
 * @param {object} o { fill: paint for letters (color or 'url(#id)'), cls, gradient: true for neon gradient }
 */
export function logoWordmark(o = {}) {
  const id = `lz${++uid}`;
  const gradient = o.gradient
    ? `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0">
         <stop offset="0%" stop-color="#2dd4bf"/>
         <stop offset="45%" stop-color="#ffffff"/>
         <stop offset="100%" stop-color="#f2b544"/>
       </linearGradient>`
    : '';
  const fill = o.gradient ? `url(#${id}g)` : (o.fill || 'currentColor');
  return `<svg class="ludoz-logo ${o.cls || ''}" viewBox="-6 -6 1482 580" role="img" aria-label="LUDOZ" xmlns="http://www.w3.org/2000/svg">
    <defs>${gradient}</defs>
    <g fill="${fill}">${LUDO_LETTERS}</g>
    <g transform="translate(1058 -8)">${zMark(`${id}m`, fill)}</g>
  </svg>`;
}

/** Square Z-dice mark (favicon / compact brand). */
export function logoMark(o = {}) {
  const id = `lzm${++uid}`;
  const bg = o.bg
    ? `<rect x="0" y="0" width="640" height="640" rx="${o.radius ?? 140}" fill="${o.bg}"/>`
    : '';
  return `<svg class="ludoz-mark ${o.cls || ''}" viewBox="0 0 640 640" role="img" aria-label="LUDOZ" xmlns="http://www.w3.org/2000/svg">
    ${bg}
    <g transform="translate(110 35)">${zMark(id, o.fill || 'currentColor')}</g>
  </svg>`;
}
