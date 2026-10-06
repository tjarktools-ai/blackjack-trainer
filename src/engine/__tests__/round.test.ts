import { describe, expect, it } from 'vitest'
import { Game } from '../round'
import { Shoe, buildDecks } from '../shoe'
import type { Rank } from '../types'
import { StackedShoe } from './helpers'

/** Reihenfolge am Tisch: Spieler 1, Dealer-Upcard, Spieler 2, Dealer-Hole, dann Nachzieh-Karten. */
const game = (ranks: Rank[], balance = 1000) => new Game(balance, new StackedShoe(ranks))

function finishDealer(g: Game) {
  let guard = 0
  while (g.phase === 'dealer' && guard++ < 20) g.dealerStep()
}

describe('Schuh', () => {
  it('6 Decks = 312 Karten, korrekte Zusammensetzung', () => {
    const cards = buildDecks(6)
    expect(cards.length).toBe(312)
    expect(cards.filter((c) => c.rank === 'A').length).toBe(24)
    expect(cards.filter((c) => c.rank === '7').length).toBe(24)
    expect(cards.filter((c) => ['T', 'J', 'Q', 'K'].includes(c.rank)).length).toBe(96)
  })

  it('mischt neu, wenn die Cut Card (≈75 %) erreicht ist', () => {
    const shoe = new Shoe()
    expect(shoe.needsShuffle).toBe(false)
    for (let i = 0; i < 200; i++) shoe.draw()
    expect(shoe.needsShuffle).toBe(false)
    for (let i = 0; i < 60; i++) shoe.draw()
    expect(shoe.needsShuffle).toBe(true)
  })
})

describe('Runde: Blackjack, Peek, Insurance', () => {
  it('Spieler-Blackjack zahlt 3:2', () => {
    const g = game(['A', '6', 'K', '5'])
    g.deal(100)
    expect(g.phase).toBe('settled')
    expect(g.balance).toBe(1150)
  })

  it('Dealer-Blackjack (Zehner offen) beendet die Runde sofort', () => {
    const g = game(['9', 'K', '7', 'A'])
    g.deal(100)
    expect(g.phase).toBe('settled')
    expect(g.balance).toBe(900)
  })

  it('Ass offen: Insurance abgelehnt, Dealer hat Blackjack → Einsatz verloren', () => {
    const g = game(['9', 'A', '7', 'K'])
    g.deal(100)
    expect(g.phase).toBe('insurance')
    const ev = g.decideInsurance(false)!
    expect(ev.correct).toBe(true)
    expect(g.phase).toBe('settled')
    expect(g.balance).toBe(900)
  })

  it('Ass offen: Insurance genommen, Dealer hat Blackjack → Break-even (2:1)', () => {
    const g = game(['9', 'A', '7', 'K'])
    g.deal(100)
    const ev = g.decideInsurance(true)!
    expect(ev.correct).toBe(false)
    expect(g.balance).toBe(1000)
  })

  it('Ass offen: Insurance genommen, Dealer hat KEINEN Blackjack → Insurance verloren, Spiel läuft', () => {
    const g = game(['9', 'A', '7', '5'])
    g.deal(100)
    g.decideInsurance(true)
    expect(g.phase).toBe('player')
    expect(g.balance).toBe(850)
  })

  it('Even Money bei eigenem Blackjack zahlt sofort 1:1 und ist als Fehler zu werten', () => {
    const g = game(['A', 'A', 'K', '5'])
    g.deal(100)
    const ev = g.decideInsurance(true)!
    expect(ev.evenMoney).toBe(true)
    expect(ev.correct).toBe(false)
    expect(g.balance).toBe(1100)
  })

  it('Beide Blackjack → Push', () => {
    const g = game(['A', 'A', 'K', 'K'])
    g.deal(100)
    g.decideInsurance(false)
    expect(g.phase).toBe('settled')
    expect(g.balance).toBe(1000)
  })
})

describe('Runde: Spielzüge und Dealer (H17)', () => {
  it('Dealer zieht auf Soft 17', () => {
    // Spieler 10+8=18 steht. Dealer 6+A = Soft 17 → muss ziehen: +3 = Soft 20 (steht)
    const g = game(['T', '6', '8', 'A', '3'])
    g.deal(100)
    const ev = g.act('stand')!
    expect(ev.correct).toBe(true)
    expect(g.phase).toBe('dealer')
    finishDealer(g)
    expect(g.dealer.length).toBe(3)
    expect(g.phase).toBe('settled')
    expect(g.balance).toBe(900) // Dealer 20 schlägt 18
  })

  it('Dealer steht auf Hard 17', () => {
    const g = game(['T', '7', '8', 'T'])
    g.deal(100)
    g.act('stand')
    finishDealer(g)
    expect(g.dealer.length).toBe(2)
    expect(g.balance).toBe(1100) // 18 schlägt 17
  })

  it('Double auf 11: Einsatz verdoppelt, genau eine Karte', () => {
    // Spieler 6+5=11 gegen 6 (Hole 10 = 16). Double bekommt 10 = 21; Dealer zieht 8 → Bust
    const g = game(['6', '6', '5', 'T', 'T', '8'])
    g.deal(100)
    const ev = g.act('double')!
    expect(ev.recommendation.action).toBe('double')
    expect(ev.correct).toBe(true)
    expect(g.hands[0].cards.length).toBe(3)
    expect(g.hands[0].bet).toBe(200)
    finishDealer(g)
    expect(g.balance).toBe(1200)
  })

  it('Falscher Zug wird erkannt (16 gegen 10 → Surrender statt Hit)', () => {
    const g = game(['T', 'T', '6', '7', '5'])
    g.deal(100)
    const ev = g.act('hit')!
    expect(ev.correct).toBe(false)
    expect(ev.recommendation.action).toBe('surrender')
  })

  it('Surrender gibt den halben Einsatz zurück', () => {
    const g = game(['T', 'T', '6', '7'])
    g.deal(100)
    const ev = g.act('surrender')!
    expect(ev.correct).toBe(true)
    finishDealer(g)
    expect(g.balance).toBe(950)
  })

  it('Bust: alle Hände verloren → Dealer zieht nicht', () => {
    const g = game(['T', '6', '6', '5', 'T'])
    g.deal(100)
    g.act('hit') // 16 + 10 = 26
    expect(g.phase).toBe('dealer')
    finishDealer(g)
    expect(g.dealer.length).toBe(2)
    expect(g.balance).toBe(900)
  })
})

describe('Runde: Split', () => {
  it('Gesplittete Asse bekommen genau eine Karte, 21 ist kein Blackjack', () => {
    // A,A gegen 6 (Hole 5 = 11). Hand 1: +K = 21, Hand 2: +9 = 20. Dealer 11 +10 = 21 …
    const g = game(['A', '6', 'A', '5', 'K', '9', 'T'])
    g.deal(100)
    const ev = g.act('split')!
    expect(ev.correct).toBe(true)
    expect(g.phase).toBe('dealer') // keine weiteren Entscheidungen
    expect(g.hands.length).toBe(2)
    expect(g.hands.every((h) => h.cards.length === 2)).toBe(true)
    finishDealer(g)
    // Dealer: 6+5+10 = 21 → beide Hände: 21 = Push, 20 verliert
    expect(g.hands[0].result).toBe('push')
    expect(g.hands[1].result).toBe('lose')
    expect(g.balance).toBe(1000 - 200 + 100)
  })

  it('Split von Achten: zweite Hand erhält ihre Karte erst, wenn sie dran ist', () => {
    // 8,8 gegen 6. Hand 1 bekommt 3 (=11), double → +10 = 21 …
    const g = game(['8', '6', '8', 'T', '3', 'T', '9', '5'])
    g.deal(100)
    g.act('split')
    expect(g.hands[0].cards.length).toBe(2)
    expect(g.hands[1].cards.length).toBe(1)
    expect(g.hands[1].status).toBe('pending')
    const ev = g.act('double')! // 11 gegen 6 nach Split (DAS)
    expect(ev.correct).toBe(true)
    expect(g.hands[1].cards.length).toBe(2)
    expect(g.active).toBe(1)
  })

  it('höchstens 4 Hände', () => {
    const g = game(['8', '6', '8', 'T', '8', '8', '8', '8', '8', '8'])
    g.deal(100)
    g.act('split')
    g.act('split')
    g.act('split')
    expect(g.hands.length).toBe(4)
    expect(g.availability().canSplit).toBe(false)
  })
})
