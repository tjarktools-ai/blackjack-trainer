import { handForCell } from '../engine/canonical'
import type { PlayEvaluation } from '../engine/round'
import { recommend } from '../engine/strategy'
import type { Card, CellRef, Rank, Upcard } from '../engine/types'
import { explainPlay, type PlayExplanation } from './explain'

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
  const dealerCard: Card = { id: 99, rank: upRank(cell.dealer), suit: 'S' }
  const evaluation: PlayEvaluation = {
    kind: 'play',
    chosen: recommendation.action,
    recommendation,
    correct: true,
    cards,
    dealerUp: cell.dealer,
    dealerCard,
    availability,
    handIndex: 0,
    handCount: 1,
  }
  return explainPlay(evaluation)
}
