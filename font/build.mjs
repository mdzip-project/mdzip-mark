// Builds mdzip-icons.woff — the MDZip and Markdown marks as icon-font glyphs —
// from the SVGs in ../svg. Usage: `npm install && npm run build` in this folder.
//
// An icon font can only hold single-colour filled outlines, but the folder
// marks are stroked shapes with white fills hiding the tab behind the card. So
// each source is rasterized (black on white), traced back to a single filled
// outline with potrace, and written to src/<name>.svg (committed, so the
// traced result is reviewable). The Markdown mark is already plain filled
// paths, but goes through the same pipeline for consistent sizing.
//
// The glyphs are height-normalized (each mark is 0.8em tall) and keep their
// own aspect ratio, so they are wider than an em, like an inline logo. They're
// raised (LIFT) so the mark's centre lines up with the middle of digits and
// capitals rather than the middle of the em box, which reads low next to text
// (measured in a real VS Code status bar), and carry a little space on the
// right (RIGHT_BEARING) so a following label doesn't crowd them.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import * as svgicons2svgfont from 'svgicons2svgfont';

const require = createRequire(import.meta.url);
const potrace = require('potrace');
const svg2ttf = require('svg2ttf');
const ttf2woff = require('ttf2woff');

const here = path.dirname(fileURLToPath(import.meta.url));
const FontStream = svgicons2svgfont.SVGIcons2SVGFontStream ?? svgicons2svgfont.default;

// Private Use Area codepoints; keep stable once published — they are what
// consumers (e.g. a VS Code `contributes.icons` entry) map to.
const GLYPHS = [
  { name: 'mdzip-logo', codepoint: 0xe900, source: '../svg/mdzip-mark.svg' },
  { name: 'mdzip-logo-open', codepoint: 0xe901, source: '../svg/mdzip-mark-open.svg' },
  { name: 'mdzip-markdown', codepoint: 0xe902, source: 'src/markdown-mark.svg' },
];

const EM = 1000; // font units per em
const MARK_HEIGHT = 800; // glyph artwork height within the em box
const PADDING = (EM - MARK_HEIGHT) / 2;
const LIFT = 125; // font units the artwork is raised from centred (2px at 16px)
const RIGHT_BEARING = 200; // extra advance after the artwork (~3px at 16px)
const DESCENT = 200;
const RASTER_HEIGHT = 800;

function rasterize(svgPath) {
  const png = new Resvg(fs.readFileSync(path.resolve(here, svgPath)), {
    fitTo: { mode: 'height', value: RASTER_HEIGHT },
    background: '#ffffff',
  }).render();
  return { buffer: png.asPng(), width: png.width };
}

function trace(buffer) {
  return new Promise((resolve, reject) => {
    potrace.trace(buffer, { threshold: 128, turdSize: 4, optTolerance: 0.4 }, (error, svg) =>
      error ? reject(error) : resolve([...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' '))
    );
  });
}

// potrace writes every subpath in the same direction and relies on even-odd
// filling to cut out the holes. Fonts fill non-zero, so make nesting depth
// decide direction instead: outer shapes one way, holes the opposite way,
// islands inside holes the first way again. Handles potrace's M / C / L / Z.
function parseSubpaths(d) {
  return d
    .split(/(?=M)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const tokens = chunk.match(/[MCLZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
      let start = null;
      const segments = [];
      let command = null;
      for (let i = 0; i < tokens.length; ) {
        if (/[MCLZ]/i.test(tokens[i])) {
          command = tokens[i++].toUpperCase();
          if (command === 'Z') continue;
        }
        const take = (count) => tokens.slice(i, (i += count)).map(Number);
        if (command === 'M') start = take(2);
        else if (command === 'L') segments.push({ type: 'L', to: take(2) });
        else if (command === 'C') {
          const [x1, y1, x2, y2, x, y] = take(6);
          segments.push({ type: 'C', c1: [x1, y1], c2: [x2, y2], to: [x, y] });
        }
      }
      return { start, segments };
    });
}

const polygonOf = (sub) => [sub.start, ...sub.segments.map((s) => s.to)];

function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function contains(points, [px, py]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function reverse(sub) {
  const points = polygonOf(sub);
  const segments = [];
  for (let k = sub.segments.length - 1; k >= 0; k -= 1) {
    const seg = sub.segments[k];
    const previous = points[k];
    segments.push(seg.type === 'C' ? { type: 'C', c1: seg.c2, c2: seg.c1, to: previous } : { type: 'L', to: previous });
  }
  return { start: points[points.length - 1], segments };
}

function toPath(subs) {
  const n = (v) => Number(v.toFixed(3));
  const pt = ([x, y]) => `${n(x)} ${n(y)}`;
  return subs
    .map(
      (sub) =>
        `M ${pt(sub.start)} ` +
        sub.segments.map((s) => (s.type === 'C' ? `C ${pt(s.c1)} ${pt(s.c2)} ${pt(s.to)}` : `L ${pt(s.to)}`)).join(' ') +
        ' Z'
    )
    .join(' ');
}

function fixWinding(d) {
  const subs = parseSubpaths(d);
  const polygons = subs.map(polygonOf);
  const areas = polygons.map(signedArea);
  const outerSign = Math.sign(areas[areas.indexOf(areas.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a)))]);
  return toPath(
    subs.map((sub, i) => {
      const depth = polygons.filter((polygon, j) => j !== i && contains(polygon, sub.start)).length;
      const wanted = depth % 2 === 0 ? outerSign : -outerSign;
      return Math.sign(areas[i]) === wanted ? sub : reverse(sub);
    })
  );
}

const glyphFiles = [];
for (const glyph of GLYPHS) {
  const { buffer, width } = rasterize(glyph.source);
  const d = fixWinding(await trace(buffer));
  const file = path.join(here, 'src', `${glyph.name}.svg`);
  // Centre the artwork in the em box (PADDING), then raise it by LIFT.
  fs.writeFileSync(
    file,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width + RIGHT_BEARING}" height="${EM}" viewBox="0 ${LIFT - PADDING} ${width + RIGHT_BEARING} ${EM}">` +
      `<path d="${d}"/></svg>\n`
  );
  glyphFiles.push({ ...glyph, file });
  console.log(`${glyph.name}: ${width}x${RASTER_HEIGHT}, ${(d.match(/M/g) ?? []).length} subpaths`);
}

let svgFont = '';
const stream = new FontStream({
  fontName: 'mdzip-icons',
  fontHeight: EM,
  descent: DESCENT,
  normalize: true,
  log() {},
});
stream.on('data', (chunk) => {
  svgFont += chunk;
});
const finished = new Promise((resolve, reject) => {
  stream.on('end', resolve);
  stream.on('error', reject);
});
for (const glyph of glyphFiles) {
  const input = fs.createReadStream(glyph.file);
  input.metadata = { name: glyph.name, unicode: [String.fromCodePoint(glyph.codepoint)] };
  stream.write(input);
}
stream.end();
await finished;

const ttf = svg2ttf(svgFont, {});
const woff = Buffer.from(ttf2woff(new Uint8Array(ttf.buffer)));
fs.writeFileSync(path.join(here, 'mdzip-icons.woff'), woff);
fs.writeFileSync(
  path.join(here, 'mdzip-icons.json'),
  JSON.stringify(Object.fromEntries(GLYPHS.map((g) => [g.name, g.codepoint.toString(16).toUpperCase()])), null, 2) + '\n'
);
console.log(`mdzip-icons.woff: ${woff.length} bytes`);
