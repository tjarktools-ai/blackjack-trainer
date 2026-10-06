import { describe, expect, it } from 'vitest'
import { canDoubleBet, canHalveBet, doubledBet, halvedBet } from '../betMath'

describe('Einsatz verdoppeln / halbieren', () => {
  it('verdoppelt', () => {
    expect(doubledBet(25, 10000)).toBe(50)
    expect(doubledBet(1, 10000)).toBe(2)
    expect(doubledBet(1000, 10000)).toBe(2000)
  })

  it('verdoppelt höchstens bis zum Tischlimit (5.000) und zum Restguthaben', () => {
    expect(doubledBet(3000, 100000)).toBe(5000)
    expect(doubledBet(60, 100)).toBe(100)
    expect(doubledBet(60, 99.5)).toBe(99) // keine halben Einsätze
    expect(canDoubleBet(5000, 100000)).toBe(false)
    expect(canDoubleBet(100, 100)).toBe(false)
    expect(canDoubleBet(0, 100)).toBe(false)
    expect(canDoubleBet(40, 100)).toBe(true)
  })

  it('halbiert abgerundet, aber nie unter den Mindesteinsatz', () => {
    expect(halvedBet(50)).toBe(25)
    expect(halvedBet(25)).toBe(12)
    expect(halvedBet(3)).toBe(1)
    expect(halvedBet(2)).toBe(1)
    expect(halvedBet(1)).toBe(1)
    expect(canHalveBet(1)).toBe(false)
    expect(canHalveBet(0)).toBe(false)
    expect(canHalveBet(2)).toBe(true)
  })
})
