// Renders the approved feather icon (docs/design/icon.svg) to the PWA icon set.
// Re-run with `npm run icons` after changing the source SVG; PNGs are committed.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const source = readFileSync('docs/design/icon.svg', 'utf8')
const feather = source.match(/<g transform="rotate\(-28 50 50\)">[\s\S]*?<\/g>/)[0]

// Full-bleed square (no rounded corners) with the feather scaled into the
// maskable safe zone. iOS and Android apply their own corner masks.
const fullBleed = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f6b6b"/>
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${feather}</g>
</svg>`

const render = (svg, size, out) => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(out, png)
}

copyFileSync('docs/design/icon.svg', 'public/favicon.svg')
render(source, 192, 'public/icon-192.png')
render(source, 512, 'public/icon-512.png')
render(fullBleed(0.72), 512, 'public/icon-maskable-512.png')
render(fullBleed(0.85), 180, 'public/apple-touch-icon.png')
