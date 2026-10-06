import type { PlayEvaluation } from '../engine/round'
import { recommend } from '../engine/strategy'
import type { Card, CellRef, Rank, Upcard } from '../engine/types'
import { explainPlay, type PlayExplanation } from './explain'

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

const upRank = (u: Upcard): Rank => (u === 'T' ? 'K' : (u as Rank))

/** Erklärung für ein Tabellenfeld (so, als hättest du den richtigen Zug gespielt). */
export function explainCell(cell: CellRef): PlayExplanation {
  const cards = handForCell(cell)
  // Hard-/Soft-Felder der Tabelle gelten auch für Hände mit mehr Karten; Surrender hat eine eigene Tabelle.
  const availability = {
    canDouble: true,
    canSplit: cell.category === 'pair',
    canSurrender: cell.category === 'surrender' || cell.category === 'pair',
  }
  const recommendation = recommend(cards, cell.dealer, availability)
  const evaluation: PlayEvaluation = {
    kind: 'play',
    chosen: recommendation.action,
    recommendation,
    correct: true,
    cards,
    dealerUp: cell.dealer,
    dealerCard: card(upRank(cell.dealer), 99),
    availability,
    handIndex: 0,
    handCount: 1,
  }
  return explainPlay(evaluation)
}
