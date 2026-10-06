import { EV_DATA } from '../data/evData.generated'
import { ALL_CELLS } from './cells'
import { handForCell } from './canonical'
import { recommend } from './strategy'
import { cellKey, type CellRef } from './types'

/**
 * Schwierigkeit eines Tabellenfelds = wie knapp die richtige Entscheidung gewinnt:
 * Abstand (in Anteilen des Einsatzes) zwischen dem Tabellenzug und der besten Alternative.
 * Kleiner Abstand = leicht zu verwechseln = schwer zu lernen (z. B. Soft 18 gegen 2, 12 gegen 4).
 */
export function cellGap(cell: CellRef): number {
  const rec = recommend(handForCell(cell), cell.dealer, {
    canDouble: true,
    canSplit: cell.category === 'pair',
    canSurrender: cell.category === 'surrender',
  })
  const key =
    cell.category === 'pair' || cell.category === 'soft' ? cellKey(cell) : `hard|${cell.row}|${cell.dealer}`
  const e = EV_DATA[key]
  const evs: Record<string, number> = { stand: e.stand ?? -9, hit: e.hit ?? -9, double: e.double ?? -9 }
  if (cell.category === 'pair') evs.split = e.split ?? -9
  if (cell.category === 'surrender') evs.surrender = -0.5
  const own = evs[rec.action]
  const best = Math.max(...Object.entries(evs).filter(([a]) => a !== rec.action).map(([, v]) => v))
  return own - best
}

/** Ein Feld gilt als „schwer“, wenn der Tabellenzug nur um weniger als 8 % des Einsatzes besser ist. */
export const HARD_GAP = 0.08

export const HARD_CELLS: CellRef[] = ALL_CELLS.filter((c) => cellGap(c) < HARD_GAP)
export const HARD_CELL_KEYS = new Set(HARD_CELLS.map(cellKey))

export function isHardCell(cell: CellRef): boolean {
  return HARD_CELL_KEYS.has(cellKey(cell))
}
