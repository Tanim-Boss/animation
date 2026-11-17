/** Loads the bundled Poppins family once per page and blocks the render until it is ready. */
import { continueRender, delayRender, staticFile } from 'remotion';

const WEIGHTS = [400, 500, 600, 700, 800, 900];
const FILES: Array<[number, string]> = [
  [400, 'Poppins-Regular.ttf'],
  [500, 'Poppins-Medium.ttf'],
  [600, 'Poppins-SemiBold.ttf'],
  [700, 'Poppins-Bold.ttf'],
  [800, 'Poppins-ExtraBold.ttf'],
  [900, 'Poppins-Black.ttf'],
];

const handle = delayRender('Loading Poppins');

if (typeof document !== 'undefined') {
  const css = FILES.map(
    ([weight, file]) =>
      `@font-face{font-family:'Poppins';src:url('${staticFile(`fonts/${file}`)}') format('truetype');font-weight:${weight};font-style:normal;font-display:block;}`,
  ).join('\n');
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);

  Promise.all(WEIGHTS.map((w) => document.fonts.load(`${w} 64px Poppins`)))
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
} else {
  continueRender(handle);
}

export {};
