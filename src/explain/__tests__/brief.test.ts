import { describe, expect, it } from 'vitest'
import type { PlayEvaluation } from '../../engine/round'
import { recommend } from '../../engine/strategy'
import { DEALER_COLS, HARD_ROWS, PAIR_ROWS, SOFT_ROWS } from '../../engine/strategyTables'
import type { Action, Rank, Upcard } from '../../engine/types'
import { cards } from '../../engine/__tests__/helpers'
import { briefExplanation } from '../brief'
import { explainPlay } from '../explain'

const rankOf = (v: number): Rank => (v === 1 ? 'A' : v === 10 ? 'T' : (String(v) as Rank))
const HARD_HANDS: Record<string, number[]> = {
  '8': [5, 3], '9': [5, 4], '10': [6, 4], '11': [6, 5], '12': [10, 2], '13': [10, 3], '14': [10, 4],
  '15': [10, 5], '16': [10, 6], '17': [10, 7],
}

function evaluation(ranks: Rank[], up: Upcard, chosen: Action): PlayEvaluation {
  const avail = { canDouble: true, canSplit: true, canSurrender: true }
  const hand = cards(...ranks)
  const recommendation = recommend(hand, up, avail)
  return {
    kind: 'play',
    chosen,
    recommendation,
    correct: recommendation.action === chosen,
    cards: hand,
    dealerUp: up,
    dealerCard: { id: 0, rank: up === 'T' ? 'K' : (up as Rank), suit: 'S' },
    availability: avail,
    handIndex: 0,
    handCount: 1,
  }
}

const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜØ])/).length

describe('Kurz-Hinweise (Spaß-Modus)', () => {
  it('sind für alle Felder und Fehlzüge kurz (höchstens 3 Sätze) und ohne Platzhalter-Fehler', () => {
    const hands: Rank[][] = []
    for (const row of HARD_ROWS) hands.push(HARD_HANDS[row].map(rankOf))
    for (const row of SOFT_ROWS) hands.push(['A', rankOf(Number(row.split(',')[1]))])
    for (const row of PAIR_ROWS) hands.push([row.split(',')[0] as Rank, row.split(',')[0] as Rank])
    hands.push(['T', '6'], ['T', '5'], ['9', '7'])
    const actions: Action[] = ['hit', 'stand', 'double', 'split', 'surrender']
    for (const hand of hands) {
      for (const up of DEALER_COLS) {
        for (const chosen of actions) {
          const b = briefExplanation(explainPlay(evaluation(hand, up, chosen)))
          const all = `${b.title} ${b.text}`
          expect(all, `${hand.join()} vs ${up}`).not.toMatch(/undefined|NaN|\[object/)
          expect(b.text.length).toBeGreaterThan(20)
          expect(b.text.length).toBeLessThan(300)
          expect(sentences(b.text), b.text).toBeLessThanOrEqual(3)
          expect(b.ok).toBe(chosen === recommend(cards(...hand), up, { canDouble: true, canSplit: true, canSurrender: true }).action)
        }
      }
    }
  })

  it('zeigt bei einem Fehler den besseren Zug und die Zahlen', () => {
    const b = briefExplanation(explainPlay(evaluation(['T', '2'], '3', 'stand')))
    expect(b.ok).toBe(false)
    expect(b.title).toContain('Hit')
    expect(b.text).toMatch(/%/)
  })
})
