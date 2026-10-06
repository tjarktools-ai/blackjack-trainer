import type { Card, CellRef, Rank } from './types'

/** Repräsentative Starthände je Hard-Zeile. */
const HARD_CANON: Record<string, [Rank, Rank]> = {
  '17': ['T', '7'],
  '16': ['T', '6'],
  '15': ['T', '5'],
  '14': ['T', '4'],
  '13': ['T', '3'],
  '12': ['T', '2'],
  '11': ['6', '5'],
  '10': ['6', '4'],
  '9': ['5', '4'],
  '8': ['5', '3'],
}

const card = (rank: Rank, id: number): Card => ({ id, rank, suit: 'S' })

/** Typische Starthand zu einem Tabellenfeld (für Erklärungen und Schwierigkeitsberechnung). */
export function handForCell(cell: CellRef): Card[] {
  if (cell.category === 'pair') {
    const r = cell.row.split(',')[0] as Rank
    return [card(r, 1), card(r, 2)]
  }
  if (cell.category === 'soft') {
    return [card('A', 1), card(cell.row.split(',')[1] as Rank, 2)]
  }
  const [a, b] = HARD_CANON[cell.row]
  return [card(a, 1), card(b, 2)]
}
