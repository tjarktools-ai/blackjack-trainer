import { describe, expect, it } from 'vitest'
import { bustOnHit, fmtEv, pct, per100 } from '../format'

describe('Prozent-Formatierung', () => {
  it('Wahrscheinlichkeiten als Prozent mit einer Nachkommastelle', () => {
    expect(pct(1 / 3)).toBe('33,3 %')
    expect(pct(96 / 311)).toBe('30,9 %')
    expect(pct(0.4)).toBe('40,0 %')
    expect(pct(0.0123, 2)).toBe('1,23 %')
  })

  it('Erwartungswerte erscheinen als Prozent, nie als 0,xxx', () => {
    expect(fmtEv(-0.2034)).toBe('−20,3 %')
    expect(fmtEv(0.1163)).toBe('+11,6 %')
    expect(fmtEv(-0.5)).toBe('−50,0 %')
    expect(fmtEv(-1.0694)).toBe('−106,9 %')
    expect(per100(0.0347)).toBe('3,5 % vom Einsatz')
  })

  it('Bust-Risiko bei Hit', () => {
    expect(pct(bustOnHit(16, false))).toBe('61,5 %')
    expect(pct(bustOnHit(12, false))).toBe('30,8 %')
    expect(bustOnHit(18, true)).toBe(0)
  })
})
