import { describe, expect, it } from 'vitest'
import { ALL_CELLS } from '../../engine/cells'
import { HARD_CELL_KEYS } from '../../engine/difficulty'
import { Game } from '../../engine/round'
import { recommend } from '../../engine/strategy'
import { cellKey } from '../../engine/types'
import { pickLearningDeal } from '../learnDeal'

describe('Schwer-Modus', () => {
  it('teilt ausschließlich schwierige Felder aus', () => {
    const game = new Game(1e9)
    for (let i = 0; i < 500; i++) {
      const forced = pickLearningDeal({}, 'hard')
      expect(game.deal(1, forced)).toBe(true)
      const hand = game.hands[0]
      const up = game.dealer[0]
      expect(hand.status).not.toBe('blackjack')
      const rec = recommend(hand.cards, up.rank === 'A' ? 'A' : ['T', 'J', 'Q', 'K'].includes(up.rank) ? 'T' : (up.rank as never), {
        canDouble: true,
        canSplit: true,
        canSurrender: true,
      })
      expect(HARD_CELL_KEYS.has(cellKey(rec.cell)), cellKey(rec.cell)).toBe(true)
      if (game.phase === 'insurance') game.decideInsurance(false)
      while (game.phase === 'player') game.act(game.currentRecommendation()!.action)
      while (game.phase === 'dealer') game.dealerStep()
    }
  })
})

describe('Lern-Deal', () => {
  it('liefert nur Starthände, die zu einem Tabellenfeld gehören, und entnimmt die Karten dem Schuh', () => {
    const game = new Game(1e9)
    const valid = new Set(ALL_CELLS.map(cellKey))
    for (let i = 0; i < 400; i++) {
      const forced = pickLearningDeal({})
      expect(forced).toBeDefined()
      const before = game.shoe.remaining
      expect(game.deal(1, forced)).toBe(true)
      // 4 Karten ausgeteilt – keine „doppelt“ erzeugt (nach einem Neumischen startet der Schuh voll)
      expect(game.shoe.remaining).toBe((game.shuffled ? game.shoe.total : before) - 4)
      const hand = game.hands[0]
      const up = game.dealer[0]
      if (hand.status === 'blackjack') {
        // A + 10er ist kein Tabellenfeld – darf bei A,x nie passieren (x ≤ 9)
        throw new Error('Lern-Deal hat einen Blackjack erzeugt')
      }
      const rec = recommend(hand.cards, up.rank === 'A' ? 'A' : ['T', 'J', 'Q', 'K'].includes(up.rank) ? 'T' : (up.rank as never), {
        canDouble: true,
        canSplit: true,
        canSurrender: true,
      })
      expect(valid.has(cellKey(rec.cell)), cellKey(rec.cell)).toBe(true)
      // Runde sauber beenden (Insurance ablehnen, nach Tabelle spielen)
      if (game.phase === 'insurance') game.decideInsurance(false)
      while (game.phase === 'player') game.act(game.currentRecommendation()!.action)
      while (game.phase === 'dealer') game.dealerStep()
    }
  })
})
