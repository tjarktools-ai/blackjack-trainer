/**
 * Berechnet die Erwartungswerte (EV) aller Aktionen für jedes Feld der Strategie-Tabelle
 * und die Dealer-Statistiken und schreibt sie nach src/data/evData.generated.ts.
 *
 * Aufruf:  npm run compute-ev
 *
 * Danach wird jedes Tabellenfeld gegen das EV-Optimum geprüft. Abweichungen werden
 * ausgegeben (Tabelle ist maßgeblich; kleine Differenzen sind erwartbar, weil die Tabelle
 * totalabhängig ist und der Solver kartenzusammensetzungsabhängig rechnet).
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { Solver } from '../src/engine/solver'
import { DEALER_COLS, HARD_ROWS, PAIR_ROWS, PAIR_TABLE, SOFT_ROWS, SOFT_TABLE, HARD_TABLE } from '../src/engine/strategyTables'
import type { Upcard } from '../src/engine/types'

const upVal = (u: Upcard): number => (u === 'A' ? 1 : u === 'T' ? 10 : Number(u))

type Evs = { stand?: number; hit?: number; double?: number; split?: number; surrender?: number }
const r4 = (x: number) => Math.round(x * 10000) / 10000

const solver = new Solver()
const data: Record<string, Evs> = {}
const dealerStats: Record<string, { bust: number; totals: number[]; blackjack: number }> = {}

// Repräsentative Starthände je Hard-Total (Kartenwerte)
const HARD_HANDS: Record<number, number[]> = {
  8: [5, 3], 9: [5, 4], 10: [6, 4], 11: [6, 5], 12: [10, 2], 13: [10, 3], 14: [10, 4],
  15: [10, 5], 16: [10, 6], 17: [10, 7], 18: [10, 8], 19: [10, 9], 20: [10, 10],
}

const t0 = Date.now()
const mismatches: string[] = []

for (const dealer of DEALER_COLS) {
  const up = upVal(dealer)
  solver.reset()

  const out = solver.dealerOutcome(up)
  dealerStats[dealer] = {
    bust: r4(out.dist[5]),
    totals: out.dist.slice(0, 5).map(r4),
    blackjack: r4(out.blackjack),
  }

  // Hard
  for (let total = 8; total <= 20; total++) {
    const e = solver.evaluateHand(HARD_HANDS[total], up, false)
    data[`hard|${total}|${dealer}`] = { stand: r4(e.stand), hit: r4(e.hit), double: r4(e.double), surrender: -0.5 }
  }
  // Soft (A,2 … A,9)
  for (const rowName of SOFT_ROWS) {
    const partner = Number(rowName.split(',')[1])
    const e = solver.evaluateHand([1, partner], up, false)
    data[`soft|${rowName}|${dealer}`] = { stand: r4(e.stand), hit: r4(e.hit), double: r4(e.double) }
  }
  // Pairs
  for (const rowName of PAIR_ROWS) {
    const r = rowName.split(',')[0]
    const val = r === 'A' ? 1 : r === 'T' ? 10 : Number(r)
    const e = solver.evaluateHand([val, val], up, true)
    data[`pair|${rowName}|${dealer}`] = {
      stand: r4(e.stand), hit: r4(e.hit), double: r4(e.double), split: r4(e.split!),
    }
  }
  console.log(`Upcard ${dealer} fertig (${((Date.now() - t0) / 1000).toFixed(1)} s)`)
}

// ---- Abgleich Tabelle ↔ EV-Optimum ----
function bestOf(e: Evs, allowed: (keyof Evs)[]): [keyof Evs, number] {
  let best: keyof Evs = allowed[0]
  for (const a of allowed) if ((e[a] ?? -9) > (e[best] ?? -9)) best = a
  return [best, e[best] ?? -9]
}

DEALER_COLS.forEach((dealer, col) => {
  for (const rowName of HARD_ROWS) {
    const code = HARD_TABLE[rowName][col]
    const total = Number(rowName)
    const e = data[`hard|${total}|${dealer}`]
    const chart = code === 'S' ? 'stand' : code === 'H' ? 'hit' : 'double'
    const [best, bestEv] = bestOf(e, ['stand', 'hit', 'double'])
    if (best !== chart) mismatches.push(`hard ${rowName} vs ${dealer}: Tabelle=${chart} (${e[chart as keyof Evs]}), EV-Optimum=${best} (${bestEv})`)
  }
  for (const rowName of SOFT_ROWS) {
    const code = SOFT_TABLE[rowName][col]
    const e = data[`soft|${rowName}|${dealer}`]
    const chart = code === 'S' || code === 'Ds' ? (code === 'Ds' ? 'double' : 'stand') : code === 'H' ? 'hit' : 'double'
    const [best, bestEv] = bestOf(e, ['stand', 'hit', 'double'])
    if (best !== chart) mismatches.push(`soft ${rowName} vs ${dealer}: Tabelle=${chart} (${e[chart as keyof Evs]}), EV-Optimum=${best} (${bestEv})`)
  }
  for (const rowName of PAIR_ROWS) {
    const code = PAIR_TABLE[rowName][col]
    const e = data[`pair|${rowName}|${dealer}`]
    const [best, bestEv] = bestOf(e, ['stand', 'hit', 'double', 'split'])
    const chartSplit = code !== 'N'
    if (chartSplit && best !== 'split') mismatches.push(`pair ${rowName} vs ${dealer}: Tabelle=split (${e.split}), EV-Optimum=${best} (${bestEv})`)
    if (!chartSplit && best === 'split') mismatches.push(`pair ${rowName} vs ${dealer}: Tabelle=kein Split (beste Nicht-Split-Aktion ${r4(Math.max(e.stand!, e.hit!, e.double!))}), EV-Optimum=split (${e.split})`)
  }
})

console.log(`\nAbweichungen Tabelle ↔ EV-Optimum: ${mismatches.length}`)
for (const m of mismatches) console.log('  ' + m)

const file = 'src/data/evData.generated.ts'
mkdirSync(dirname(file), { recursive: true })
const header = `// AUTOMATISCH ERZEUGT von scripts/compute-ev.ts – nicht von Hand ändern.
// Regeln: 6 Decks, H17, DAS, Late Surrender, Peek (Werte gelten, wenn der Dealer keinen Blackjack hat).
// EV in Einheiten des Grund-Einsatzes. Double-EV bezieht sich auf den Grund-Einsatz (Einsatz wird verdoppelt).
`
writeFileSync(
  file,
  header +
    `export interface EvEntry { stand?: number; hit?: number; double?: number; split?: number; surrender?: number }\n` +
    `export const EV_DATA: Record<string, EvEntry> = ${JSON.stringify(data)}\n` +
    `export const DEALER_STATS: Record<string, { bust: number; totals: number[]; blackjack: number }> = ${JSON.stringify(dealerStats)}\n`,
)
console.log(`\nGeschrieben: ${file} (${Object.keys(data).length} Felder, ${((Date.now() - t0) / 1000).toFixed(1)} s)`)
