// Renders an SVG from ../svg to square PNG exports, transparent background,
// using the @resvg/resvg-js package already installed for build.mjs.
// Usage: `npm install && node render-png.mjs [--svg <file>] [--name <prefix>] [size ...]`
// Defaults: --svg ../svg/mdzip-mark-square.svg, --name mdzip-mark-square, size 1024.
// Writes ../png/<prefix>-<size>.png.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = path.dirname(fileURLToPath(import.meta.url));
let svgPath = path.resolve(here, '../svg/mdzip-mark-square.svg');
let name = 'mdzip-mark-square';
const sizes = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--svg') svgPath = path.resolve(args[++i]);
  else if (args[i] === '--name') name = args[++i];
  else sizes.push(Number(args[i]));
}
const targets = sizes.length ? sizes : [1024];

for (const size of targets) {
  if (!Number.isInteger(size) || size <= 0) throw new Error(`Invalid size: ${size}`);
  const png = new Resvg(fs.readFileSync(svgPath), {
    fitTo: { mode: 'width', value: size },
  }).render();
  const out = path.resolve(here, `../png/${name}-${size}.png`);
  fs.writeFileSync(out, png.asPng());
  console.log(`${out}: ${png.width}x${png.height}`);
}
