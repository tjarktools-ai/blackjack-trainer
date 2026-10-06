import { describe, expect, it } from 'vitest'
import type { PlayEvaluation } from '../../engine/round'
import { recommend } from '../../engine/strategy'
import { DEALER_COLS, HARD_ROWS, PAIR_ROWS, SOFT_ROWS } from '../../engine/strategyTables'
import type { Action, Rank, Upcard } from '../../engine/types'
import { cards } from '../../engine/__tests__/helpers'
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

function allHands(): Rank[][] {
  const out: Rank[][] = []
  for (const row of HARD_ROWS) out.push(HARD_HANDS[row].map(rankOf))
  for (const row of SOFT_ROWS) out.push(['A', rankOf(Number(row.split(',')[1]))])
  for (const row of PAIR_ROWS) {
    const r = row.split(',')[0] as Rank
    out.push([r, r])
  }
  out.push(['T', '6'], ['T', '5'], ['9', '7'], ['9', '6']) // Surrender-Hände
  return out
}

describe('Erklärungen', () => {
  it('liefern für JEDES Tabellenfeld und JEDEN möglichen falschen Zug einen vollständigen Text', () => {
    const actions: Action[] = ['hit', 'stand', 'double', 'split', 'surrender']
    let n = 0
    for (const hand of allHands()) {
      for (const up of DEALER_COLS) {
        for (const chosen of actions) {
          const x = explainPlay(evaluation(hand, up, chosen))
          const text = [x.headline, x.situation, ...x.why, x.whyNot ?? '', ...x.notes].join(' ')
          expect(text, `${hand.join()} vs ${up} / ${chosen}`).not.toMatch(/undefined|NaN|\[object/)
          expect(x.why.length).toBeGreaterThan(0)
          expect(x.evRows.length).toBeGreaterThan(0)
          if (!x.correct) expect(x.whyNot?.length ?? 0).toBeGreaterThan(10)
          n++
        }
      }
    }
    expect(n).toBe(allHands().length * DEALER_COLS.length * actions.length)
  })

  it('weist auf den knappen Surrender-Vorteil hin (8,8 gegen Ass)', () => {
    const x = explainPlay(evaluation(['8', '8'], 'A', 'split'))
    expect(x.correct).toBe(true)
    expect(x.notes.join(' ')).toMatch(/Surrender/)
  })
})
