export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K'
export type Suit = 'S' | 'H' | 'D' | 'C'

export interface Card {
  /** Eindeutige ID innerhalb eines Schuhs (für Animationen / React-Keys). */
  id: number
  rank: Rank
  suit: Suit
}

/** Dealer-Upcard-Klasse wie in der Strategie-Tabelle: 2–9, 10 (T/J/Q/K) und Ass. */
export type Upcard = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'A'

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender'

export type StrategyCategory = 'pair' | 'soft' | 'hard' | 'surrender'

/** Ein Feld der Strategie-Tabelle. */
export interface CellRef {
  category: StrategyCategory
  /** Zeilenlabel, z. B. "8,8", "A,7", "16" */
  row: string
  dealer: Upcard
}

export const ACTION_LABEL: Record<Action, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
  surrender: 'Surrender',
}

export function cellKey(c: CellRef): string {
  return `${c.category}|${c.row}|${c.dealer}`
}
