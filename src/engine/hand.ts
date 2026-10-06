import type { Card, Rank, Upcard } from './types'

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K']

/** Kartenwert, Ass zählt hier als 1 (die 11 entsteht in handValue). */
export function pipValue(rank: Rank): number {
  if (rank === 'A') return 1
  if (rank === 'T' || rank === 'J' || rank === 'Q' || rank === 'K') return 10
  return Number(rank)
}

export interface HandValue {
  /** Bester Gesamtwert (Ass als 11, solange kein Bust entsteht). */
  total: number
  /** true, wenn ein Ass aktuell als 11 gezählt wird. */
  soft: boolean
}

export function handValue(cards: readonly Card[]): HandValue {
  let sum = 0
  let hasAce = false
  for (const c of cards) {
    sum += pipValue(c.rank)
    if (c.rank === 'A') hasAce = true
  }
  if (hasAce && sum + 10 <= 21) return { total: sum + 10, soft: true }
  return { total: sum, soft: false }
}

/** Strategischer Rang: alle Zehnerwerte (T, J, Q, K) sind gleich. */
export function strategicRank(rank: Rank): Rank {
  return pipValue(rank) === 10 ? 'T' : rank
}

export function isPair(cards: readonly Card[]): boolean {
  return cards.length === 2 && strategicRank(cards[0].rank) === strategicRank(cards[1].rank)
}

export function isBust(cards: readonly Card[]): boolean {
  return handValue(cards).total > 21
}

/** Natürlicher Blackjack: zwei Karten = 21. (Nach Split zählt 21 NICHT als Blackjack – das prüft die Runde.) */
export function isTwoCard21(cards: readonly Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21
}

export function upcardOf(card: Card): Upcard {
  return (card.rank === 'A' ? 'A' : pipValue(card.rank) === 10 ? 'T' : card.rank) as Upcard
}
