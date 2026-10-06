import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handValue } from '../../engine/hand'
import { recommend } from '../../engine/strategy'
import type { Action, Upcard } from '../../engine/types'
import { BUDGET_MIN, useFun } from '../funStore'

const upOf = (rank: string): Upcard => (rank === 'A' ? 'A' : ['T', 'J', 'Q', 'K'].includes(rank) ? 'T' : (rank as Upcard))

/** Spielt genau eine Runde nach der Basic Strategy (wie ein Spieler am Tisch). */
async function playRound(): Promise<void> {
  const fun = () => useFun.getState()
  const p = fun().deal()
  await vi.advanceTimersByTimeAsync(1000)
  await p
  for (let i = 0; i < 40 && fun().snap.phase !== 'settled'; i++) {
    const s = fun().snap
    if (s.phase === 'insurance') fun().insurance(false)
    else if (s.phase === 'player') {
      const hand = s.hands[s.active]
      const rec = recommend(hand.cards, upOf(s.dealer[0].rank), {
        canDouble: s.actions.includes('double'),
        canSplit: s.actions.includes('split'),
        canSurrender: s.actions.includes('surrender'),
      })
      fun().act(rec.action as Action)
    }
    await vi.advanceTimersByTimeAsync(700)
  }
}

describe('Spaß-Modus', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lehnt zu kleine oder ungültige Budgets ab', () => {
    useFun.getState().startSession(BUDGET_MIN - 1)
    expect(useFun.getState().phase).not.toBe('play')
    useFun.getState().startSession(Number.NaN)
    expect(useFun.getState().phase).not.toBe('play')
  })

  it('startet mit dem gewählten Budget und spielt ohne Unterbrechung durch', async () => {
    useFun.getState().startSession(2500)
    expect(useFun.getState().phase).toBe('play')
    expect(useFun.getState().snap.balance).toBe(2500)
    expect(useFun.getState().bet).toBe(50) // ca. 2 % des Budgets

    let hinted = 0
    for (let r = 0; r < 25 && useFun.getState().snap.balance >= 1; r++) {
      const before = useFun.getState().session!.decisions
      await playRound()
      const s = useFun.getState()
      expect(s.snap.phase).toBe('settled')
      expect(s.busy).toBe(false)
      expect(s.session!.rounds).toBe(r + 1)
      if (s.session!.decisions > before) {
        // Der Hinweis erscheint klein und bleibt bis zur nächsten Runde stehen
        expect(s.hint?.ok).toBe(true)
        expect(s.hint!.text.length).toBeGreaterThan(10)
        hinted++
      }
    }
    const { session } = useFun.getState()
    expect(hinted).toBeGreaterThan(5)
    expect(session!.optimal).toBe(session!.decisions) // nach Tabelle gespielt → immer optimal
  })

  it('beendet die Session mit Auswertung und erlaubt eine neue', async () => {
    const before = useFun.getState().snap.balance
    useFun.getState().endSession()
    const { phase, summary, session } = useFun.getState()
    expect(phase).toBe('summary')
    expect(session).toBeNull()
    expect(summary!.endBalance).toBe(before)
    expect(summary!.startBudget).toBe(2500)
    expect(summary!.peak).toBeGreaterThanOrEqual(Math.min(summary!.startBudget, summary!.endBalance))
    useFun.getState().newSession()
    expect(useFun.getState().phase).toBe('setup')
  })

  it('Einsatz lässt sich mit den Tasten ×2 und ½ ändern', () => {
    useFun.getState().startSession(1000) // Start-Einsatz ≈ 2 % → 10
    expect(useFun.getState().bet).toBe(10)
    useFun.getState().doubleBet()
    expect(useFun.getState().bet).toBe(20)
    useFun.getState().doubleBet()
    expect(useFun.getState().bet).toBe(40)
    useFun.getState().halveBet()
    useFun.getState().halveBet()
    expect(useFun.getState().bet).toBe(10)
    // „Zurück“ funktioniert danach weiter mit dem neu aufgebauten Chip-Stapel (10 = 5+5 → 5)
    useFun.getState().undoBet()
    expect(useFun.getState().bet).toBe(5)
    // nie mehr als das Budget
    useFun.getState().setBet(900)
    useFun.getState().doubleBet()
    expect(useFun.getState().bet).toBe(1000)
    useFun.getState().doubleBet()
    expect(useFun.getState().bet).toBe(1000)
    // Halbieren stoppt bei 1
    useFun.getState().setBet(1)
    useFun.getState().halveBet()
    expect(useFun.getState().bet).toBe(1)
  })

  it('Hinweise lassen sich ausschalten', async () => {
    useFun.getState().setHintMode('off')
    useFun.getState().startSession(1000)
    await playRound()
    expect(useFun.getState().hint).toBeNull()
    expect(handValue(useFun.getState().snap.hands[0].cards).total).toBeGreaterThan(0)
    useFun.getState().setHintMode('short')
  })
})
