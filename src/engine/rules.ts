/**
 * Tischregeln – fix, passend zur Strategie-Tabelle:
 * 6 Decks, Dealer zieht auf Soft 17 (H17), Double After Split, Late Surrender,
 * Blackjack zahlt 3:2, Dealer prüft (Peek) bei Zehner oder Ass.
 *
 * Ergänzungen, die die Tabelle nicht festlegt (Standard an echten H17-Tischen):
 * Resplit bis 4 Hände, Asse nur 1 Karte und kein Resplit der Asse,
 * 21 nach Split ist kein Blackjack, Double auf jede 2-Karten-Hand.
 */
export const RULES = {
  decks: 6,
  dealerHitsSoft17: true,
  doubleAfterSplit: true,
  lateSurrender: true,
  blackjackPayout: 1.5,
  maxHands: 4,
  resplitAces: false,
  /** Anteil des Schuhs, ab dem (nach der Runde) neu gemischt wird. */
  penetration: 0.75,
  /** Zufällige Schwankung der Cut-Card-Position (± Anteil). */
  penetrationJitter: 0.03,
  insurancePayout: 2,
} as const

export const MIN_BET = 1
export const MAX_BET = 5000
export const START_BALANCE = 10000
export const CHIP_VALUES = [1, 5, 25, 100, 500] as const
