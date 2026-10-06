import { Shoe } from '../shoe'
import type { Card, Rank } from '../types'

/** Schuh mit vorgegebener Kartenreihenfolge (Ränge) für deterministische Tests. */
export class StackedShoe extends Shoe {
  private queue: Card[]

  constructor(ranks: Rank[]) {
    super()
    this.queue = ranks.map((rank, i) => ({ id: 1000 + i, rank, suit: 'S' as const }))
  }

  override draw(): Card {
    const c = this.queue.shift()
    if (!c) throw new Error('Test-Schuh leer')
    return c
  }

  override get needsShuffle(): boolean {
    return false
  }
}

export function cards(...ranks: Rank[]): Card[] {
  return ranks.map((rank, i) => ({ id: i, rank, suit: 'S' as const }))
}
