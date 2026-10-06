import { RANKS } from './hand'
import { RULES } from './rules'
import type { Card, Suit } from './types'

const SUITS: Suit[] = ['S', 'H', 'D', 'C']

/** Gleichverteilte Zufallszahl 0 … max-1 (kryptografischer Zufall, Rejection Sampling → kein Modulo-Bias). */
export function randomInt(max: number): number {
  if (max <= 1) return 0
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

export function buildDecks(decks: number): Card[] {
  const cards: Card[] = []
  let id = 0
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) cards.push({ id: id++, rank, suit })
    }
  }
  return cards
}

/** Fisher-Yates. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export class Shoe {
  private cards: Card[] = []
  private index = 0
  /** Karten, die per takeRank (Lern-Deal) entnommen wurden – zählen als ausgeteilt. */
  private removed = 0
  private size = 0
  /** Anzahl ausgeteilter Karten, ab der (nach der Runde) neu gemischt wird (Cut Card). */
  private cutPosition = 0

  constructor() {
    this.reshuffle()
  }

  reshuffle(): void {
    this.cards = shuffle(buildDecks(RULES.decks))
    this.size = this.cards.length
    this.index = 0
    this.removed = 0
    const jitter = (randomInt(2001) / 1000 - 1) * RULES.penetrationJitter
    this.cutPosition = Math.floor(this.size * (RULES.penetration + jitter))
  }

  draw(): Card {
    if (this.index >= this.cards.length) this.reshuffle()
    return this.cards[this.index++]
  }

  private get consumed(): number {
    return this.index + this.removed
  }

  /** Cut Card erreicht → vor der nächsten Runde neu mischen. */
  get needsShuffle(): boolean {
    return this.consumed >= this.cutPosition
  }

  get remaining(): number {
    return this.cards.length - this.index
  }

  get total(): number {
    return this.size
  }

  /** Anteil der bereits ausgeteilten Karten (0–1). */
  get dealtFraction(): number {
    return this.consumed / this.size
  }

  /**
   * Nimmt gezielt eine Karte mit dem gewünschten Rang aus dem Rest des Schuhs.
   * Nur für den optionalen „Lern-Deal“. Gibt null zurück, wenn keine mehr da ist.
   * Die Karte verschwindet aus dem Schuh (physisch konsistent) und zählt als ausgeteilt.
   */
  takeRank(ranks: readonly string[]): Card | null {
    const candidates: number[] = []
    for (let i = this.index; i < this.cards.length; i++) {
      if (ranks.includes(this.cards[i].rank)) candidates.push(i)
    }
    if (candidates.length === 0) return null
    const pick = candidates[randomInt(candidates.length)]
    const [card] = this.cards.splice(pick, 1)
    this.removed++
    return card
  }
}
