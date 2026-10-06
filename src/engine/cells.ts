import {
  DEALER_COLS,
  HARD_ROWS,
  PAIR_ROWS,
  SOFT_ROWS,
  SURRENDER_ROWS,
  SURRENDER_TABLE,
} from './strategyTables'
import { cellKey, type CellRef } from './types'

/** Alle lernbaren Felder der Tabelle (Pairs 100, Soft 80, Hard 100, Surrender 4). */
export const ALL_CELLS: CellRef[] = (() => {
  const cells: CellRef[] = []
  for (const row of PAIR_ROWS) for (const dealer of DEALER_COLS) cells.push({ category: 'pair', row, dealer })
  for (const row of SOFT_ROWS) for (const dealer of DEALER_COLS) cells.push({ category: 'soft', row, dealer })
  for (const row of HARD_ROWS) for (const dealer of DEALER_COLS) cells.push({ category: 'hard', row, dealer })
  for (const row of SURRENDER_ROWS) {
    DEALER_COLS.forEach((dealer, i) => {
      if (SURRENDER_TABLE[row][i] === 'SUR') cells.push({ category: 'surrender', row, dealer })
    })
  }
  return cells
})()

export const CELL_KEYS = new Set(ALL_CELLS.map(cellKey))

export const CATEGORY_LABEL = {
  pair: 'Pairs (Splitten)',
  soft: 'Soft Totals',
  hard: 'Hard Totals',
  surrender: 'Surrender',
} as const

export function cellsOf(category: CellRef['category']): CellRef[] {
  return ALL_CELLS.filter((c) => c.category === category)
}
