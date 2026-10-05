import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { VILLAGE_STUDY_PATCHES } from '../src/scene/villageStudyPatches.ts'

// Local study asset only. ImageMagick is also used by the existing reference/capture workflow.
const source = 'reference/starry-night-source.jpg'
const scratch = 'scratch/village-study-2026-10-05/atlas'
mkdirSync(scratch, { recursive: true })
const [sw, sh] = execFileSync('magick', ['identify', '-format', '%w %h', source], { encoding: 'utf8' }).split(' ').map(Number)
const size = 1024, cell = 256, margin = 10
const compositing = ['-size', `${size}x${size}`, 'xc:#151b24']
const entries = {}
const draw = []
for (const [index, [name, points]] of Object.entries(VILLAGE_STUDY_PATCHES).entries()) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1])
  // Include neighbouring source paint as a mip/filter gutter, not an adjacent unrelated tile.
  const x = Math.floor((Math.min(...xs) - 4) / 1600 * sw)
  const y = Math.floor((Math.min(...ys) - 4) / 1267 * sh)
  const w = Math.ceil((Math.max(...xs) + 4) / 1600 * sw) - x
  const h = Math.ceil((Math.max(...ys) + 4) / 1267 * sh) - y
  const scale = Math.min(1, (cell - margin * 2) / w, (cell - margin * 2) / h)
  const tw = Math.round(w * scale), th = Math.round(h * scale)
  const ax = (index % 4) * cell + margin, ay = Math.floor(index / 4) * cell + margin
  const tile = `${scratch}/${name}.png`
  execFileSync('magick', [source, '-crop', `${w}x${h}+${x}+${y}`, '+repage', '-resize', `${tw}x${th}!`, tile])
  compositing.push(tile, '-geometry', `+${ax}+${ay}`, '-composite')
  entries[name] = points.map(([px, py]) => [
    (ax + (px / 1600 * sw - x) * tw / w) / size,
    1 - (ay + (py / 1267 * sh - y) * th / h) / size,
  ])
  const colour = ['#ffdf72', '#f597b5', '#75efee', '#eeeeee'][index % 4]
  draw.push(`fill none stroke '${colour}' stroke-width 2 polygon ${points.map(p => p.join(',')).join(' ')} fill '${colour}' stroke '#111111' stroke-width 0.6 text ${Math.min(...xs)},${Math.min(...ys) - 8} '${name}'`)
}
const atlas = 'public/reference/village-study-atlas.webp'
execFileSync('magick', [...compositing, '-quality', '95', atlas])
writeFileSync('src/scene/village-study-atlas.json', JSON.stringify({
  source, sourceSha256: createHash('sha256').update(readFileSync(source)).digest('hex'),
  atlas, size, patches: entries,
}, null, 2) + '\n')
mkdirSync('output/playwright/village-study-2026-10-05', { recursive: true })
execFileSync('magick', ['public/reference/painting.jpg', '-font', process.env.STUDY_FONT || '/System/Library/Fonts/Helvetica.ttc', '-pointsize', '16', '-draw', draw.join(' '),
  '-crop', '830x492+640+775', '+repage', 'output/playwright/village-study-2026-10-05/patch-map.png'])
console.log(`${Object.keys(entries).length} patches from ${sw}x${sh} source -> ${atlas}`)
