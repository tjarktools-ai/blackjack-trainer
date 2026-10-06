import { ALL_CELLS } from '../engine/cells'
import { HARD_CELLS } from '../engine/difficulty'
import type { ForcedDeal } from '../engine/round'
import { randomInt } from '../engine/shoe'
import { cellKey, type CellRef, type Rank, type Upcard } from '../engine/types'
import { cellStatus, type CellStat, type CellStatus } from './statsStore'

const TENS: Rank[] = ['T', 'J', 'Q', 'K']
const group = (r: string): Rank[] => (r === 'T' ? TENS : [r as Rank])

/** Mögliche Zwei-Karten-Kombinationen für eine Hard-Zeile (keine Paare, kein Ass). */
const HARD_COMBOS: Record<string, [string, string][]> = {
  '8': [['3', '5'], ['2', '6']],
  '9': [['2', '7'], ['3', '6'], ['4', '5']],
  '10': [['2', '8'], ['3', '7'], ['4', '6']],
  '11': [['2', '9'], ['3', '8'], ['4', '7'], ['5', '6']],
  '12': [['2', 'T'], ['3', '9'], ['4', '8'], ['5', '7']],
  '13': [['3', 'T'], ['4', '9'], ['5', '8'], ['6', '7']],
  '14': [['4', 'T'], ['5', '9'], ['6', '8']],
  '15': [['5', 'T'], ['6', '9'], ['7', '8']],
  '16': [['6', 'T'], ['7', '9']],
  '17': [['7', 'T'], ['8', '9']],
}

function combosFor(cell: CellRef): [string, string][] {
  switch (cell.category) {
    case 'pair': {
      const r = cell.row.split(',')[0]
      return [[r, r]]
    }
    case 'soft':
      return [['A', cell.row.split(',')[1]]]
    case 'surrender':
      return HARD_COMBOS[cell.row]
    default:
      return HARD_COMBOS[cell.row]
  }
}

const WEIGHT: Record<CellStatus, number> = { weak: 5, unseen: 3, learning: 2, mastered: 0.3 }
/** Im Schwer-Modus tauchen auch gemeisterte Felder weiter auf (sie sollen ja sitzen bleiben). */
const WEIGHT_HARD: Record<CellStatus, number> = { weak: 3, unseen: 2, learning: 2, mastered: 1 }

/**
 * Wählt ein Tabellenfeld gewichtet nach Lernbedarf und baut daraus eine Starthand.
 * mode 'hard': nur aus den schwierigen Feldern (knappe Entscheidungen).
 * Gilt nur für Felder, die bei der ersten Austeilung auftreten können.
 */
export function pickLearningDeal(cells: Record<string, CellStat>, mode: 'learn' | 'hard' = 'learn'): ForcedDeal | undefined {
  const source = mode === 'hard' ? HARD_CELLS : ALL_CELLS
  const weights = mode === 'hard' ? WEIGHT_HARD : WEIGHT
  const pool = source.map((c) => ({ c, w: weights[cellStatus(cells[cellKey(c)])] }))
  const total = pool.reduce((a, b) => a + b.w, 0)
  let x = (randomInt(1_000_000) / 1_000_000) * total
  let chosen = pool[0].c
  for (const p of pool) {
    x -= p.w
    if (x <= 0) {
      chosen = p.c
      break
    }
  }
  const combos = combosFor(chosen)
  if (!combos?.length) return undefined
  const [a, b] = combos[randomInt(combos.length)]
  const dealer: Upcard = chosen.dealer
  // Zufällig vertauschen, wer die erste Karte bekommt – wie am echten Tisch
  const swap = randomInt(2) === 1
  return {
    player: swap ? [group(b), group(a)] : [group(a), group(b)],
    dealerUp: group(dealer === 'T' ? 'T' : dealer),
  }
}
