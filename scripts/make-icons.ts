/**
 * Erzeugt die PWA-Icons (192, 512, maskable, Apple-Touch-Icon) aus einem SVG.
 * Aufruf:  npx tsx scripts/make-icons.ts
 */
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const spade =
  'M50 14C50 14 20 38 20 58c0 11 8 18 17 18 5 0 9-2 11-6-1 8-3 13-8 18h20c-5-5-7-10-8-18 2 4 6 6 11 6 9 0 17-7 17-18C80 38 50 14 50 14z'

/** `scale` verkleinert das Motiv (maskable braucht Rand: sichere Zone = 80 %). */
function svg(rounded: boolean, scale: number): Buffer {
  const offset = (100 - 100 * scale) / 2
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" ${rounded ? 'rx="22"' : ''} fill="#0a141c"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path d="${spade}" fill="#00e701"/>
  </g>
</svg>`)
}

mkdirSync('public', { recursive: true })

async function png(name: string, size: number, rounded: boolean, scale: number) {
  await sharp(svg(rounded, scale), { density: 384 }).resize(size, size).png().toFile(`public/${name}`)
  console.log('erzeugt: public/' + name)
}

await png('pwa-192x192.png', 192, true, 0.9)
await png('pwa-512x512.png', 512, true, 0.9)
await png('maskable-512x512.png', 512, false, 0.62)
await png('apple-touch-icon.png', 180, false, 0.8)
