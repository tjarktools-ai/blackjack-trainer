import { describe, expect, it } from 'vitest'
import { EV_DATA } from '../../data/evData.generated'
import { recommend } from '../strategy'
import { DEALER_COLS, HARD_ROWS, PAIR_ROWS, SOFT_ROWS } from '../strategyTables'
import type { Rank, Upcard } from '../types'
import { cards } from './helpers'

const all = { canDouble: true, canSplit: true, canSurrender: true }
const noDouble = { canDouble: false, canSplit: false, canSurrender: false }
const rec = (ranks: Rank[], up: Upcard, avail = all) => recommend(cards(...ranks), up, avail).action

describe('Basic Strategy – Stichproben aus der Tabelle', () => {
  it('Pairs', () => {
    expect(rec(['A', 'A'], 'A')).toBe('split')
    expect(rec(['8', '8'], 'A')).toBe('split') // Pair-Tabelle schlägt Surrender (16 gegen Ass)
    expect(rec(['T', 'T'], '6')).toBe('stand')
    expect(rec(['K', 'Q'], '5')).toBe('stand') // alle Zehnerwerte = T,T → nicht splitten
    expect(rec(['9', '9'], '7')).toBe('stand')
    expect(rec(['9', '9'], '8')).toBe('split')
    expect(rec(['7', '7'], '7')).toBe('split')
    expect(rec(['7', '7'], '8')).toBe('hit')
    expect(rec(['6', '6'], '2')).toBe('split') // Y/N, DAS erlaubt
    expect(rec(['6', '6'], '7')).toBe('hit')
    expect(rec(['5', '5'], '9')).toBe('double') // wie Hard 10
    expect(rec(['5', '5'], 'T')).toBe('hit')
    expect(rec(['4', '4'], '5')).toBe('split') // Y/N
    expect(rec(['4', '4'], '4')).toBe('hit')
    expect(rec(['3', '3'], '7')).toBe('split')
    expect(rec(['2', '2'], '8')).toBe('hit')
  })

  it('Soft totals', () => {
    expect(rec(['A', '9'], '6')).toBe('stand')
    expect(rec(['A', '8'], '6')).toBe('double') // Ds
    expect(recommend(cards('A', '8'), '6', noDouble).action).toBe('stand')
    expect(rec(['A', '7'], '2')).toBe('double') // Ds
    expect(recommend(cards('A', '7'), '2', noDouble).action).toBe('stand')
    expect(rec(['A', '7'], '9')).toBe('hit')
    expect(rec(['A', '6'], '3')).toBe('double')
    expect(recommend(cards('A', '6'), '3', noDouble).action).toBe('hit')
    expect(rec(['A', '6'], '2')).toBe('hit')
    expect(rec(['A', '5'], '4')).toBe('double')
    expect(rec(['A', '3'], '4')).toBe('hit')
    expect(rec(['A', '3'], '5')).toBe('double')
    expect(rec(['A', '2'], '6')).toBe('double')
  })

  it('Soft totals mit mehr als zwei Karten (Double nicht erlaubt)', () => {
    // A,2,3 = Soft 16 gegen 5: Tabelle "D" → ohne Double: Hit
    expect(recommend(cards('A', '2', '3'), '5', noDouble).action).toBe('hit')
    // A,3,4 = Soft 18 gegen 6: "Ds" → ohne Double: Stand
    expect(recommend(cards('A', '3', '4'), '6', noDouble).action).toBe('stand')
  })

  it('Hard totals', () => {
    expect(rec(['T', '7'], 'A')).toBe('stand')
    expect(rec(['T', '2'], '3')).toBe('hit')
    expect(rec(['T', '2'], '4')).toBe('stand')
    expect(rec(['T', '3'], '6')).toBe('stand')
    expect(rec(['T', '3'], '7')).toBe('hit')
    expect(rec(['5', '4'], '2')).toBe('hit')
    expect(rec(['5', '4'], '3')).toBe('double')
    expect(rec(['6', '4'], '9')).toBe('double')
    expect(rec(['6', '4'], 'T')).toBe('hit')
    expect(rec(['6', '5'], 'A')).toBe('double') // H17
    expect(rec(['5', '3'], '6')).toBe('hit')
    expect(rec(['T', '8'], 'T')).toBe('stand')
    expect(recommend(cards('6', '5'), '6', noDouble).action).toBe('hit')
  })

  it('Late Surrender', () => {
    expect(rec(['T', '6'], 'T')).toBe('surrender')
    expect(rec(['9', '7'], '9')).toBe('surrender')
    expect(rec(['T', '6'], 'A')).toBe('surrender')
    expect(rec(['T', '5'], 'T')).toBe('surrender')
    expect(rec(['T', '5'], 'A')).toBe('hit') // laut Tabelle kein Surrender
    expect(rec(['T', '4'], 'T')).toBe('hit')
    expect(rec(['T', '6'], '8')).toBe('hit')
    // nach der ersten Entscheidung kein Surrender mehr
    expect(recommend(cards('T', '3', '3'), 'T', { canDouble: false, canSplit: false, canSurrender: false }).action).toBe('hit')
  })

  it('Pair-Tabelle ist 10×10, Soft 8×10, Hard 10×10 und deckt alle Felder ab', () => {
    expect(PAIR_ROWS.length * DEALER_COLS.length).toBe(100)
    expect(SOFT_ROWS.length * DEALER_COLS.length).toBe(80)
    expect(HARD_ROWS.length * DEALER_COLS.length).toBe(100)
  })
})

describe('Tabelle ↔ exakter EV-Solver', () => {
  const rankOf = (v: number): Rank => (v === 1 ? 'A' : v === 10 ? 'T' : (String(v) as Rank))
  const HARD_HANDS: Record<number, number[]> = {
    8: [5, 3], 9: [5, 4], 10: [6, 4], 11: [6, 5], 12: [10, 2], 13: [10, 3], 14: [10, 4],
    15: [10, 5], 16: [10, 6], 17: [10, 7],
  }

  it('jede Hard-Hand: Tabellenzug = EV-Optimum (ohne Surrender)', () => {
    for (const up of DEALER_COLS) {
      for (let total = 8; total <= 17; total++) {
        const e = EV_DATA[`hard|${total}|${up}`]
        const best = (['stand', 'hit', 'double'] as const).reduce((a, b) => (e[b]! > e[a]! ? b : a))
        const r = recommend(cards(...HARD_HANDS[total].map(rankOf)), up, { canDouble: true, canSplit: true, canSurrender: false })
        expect(r.action, `hard ${total} vs ${up}`).toBe(best)
      }
    }
  })

  it('jede Soft-Hand: Tabellenzug = EV-Optimum', () => {
    for (const up of DEALER_COLS) {
      for (let p = 2; p <= 9; p++) {
        const e = EV_DATA[`soft|A,${p}|${up}`]
        const best = (['stand', 'hit', 'double'] as const).reduce((a, b) => (e[b]! > e[a]! ? b : a))
        const r = recommend(cards('A', rankOf(p)), up, { canDouble: true, canSplit: true, canSurrender: false })
        expect(r.action, `soft A,${p} vs ${up}`).toBe(best)
      }
    }
  })

  it('jedes Paar: Split genau dort, wo Split-EV am höchsten ist', () => {
    for (const up of DEALER_COLS) {
      for (const row of PAIR_ROWS) {
        const rank = row.split(',')[0] as Rank
        const e = EV_DATA[`pair|${row}|${up}`]
        const best = (['stand', 'hit', 'double', 'split'] as const).reduce((a, b) => (e[b]! > e[a]! ? b : a))
        const r = recommend(cards(rank, rank), up, { canDouble: true, canSplit: true, canSurrender: false })
        expect(r.action, `pair ${row} vs ${up}`).toBe(best)
      }
    }
  })
})
