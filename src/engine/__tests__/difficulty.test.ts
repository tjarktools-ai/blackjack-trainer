import { describe, expect, it } from 'vitest'
import { ALL_CELLS } from '../cells'
import { HARD_CELL_KEYS, HARD_CELLS, cellGap, isHardCell } from '../difficulty'
import { cellKey, type CellRef } from '../types'

const c = (category: CellRef['category'], row: string, dealer: CellRef['dealer']): CellRef => ({ category, row, dealer })

describe('Schwierigkeit der Tabellenfelder', () => {
  it('rund ein Drittel der Felder gilt als schwer', () => {
    expect(HARD_CELLS.length).toBeGreaterThan(50)
    expect(HARD_CELLS.length).toBeLessThan(130)
    expect(HARD_CELLS.length).toBeLessThan(ALL_CELLS.length)
  })

  it('typische Stolperfallen sind schwer', () => {
    expect(isHardCell(c('soft', 'A,7', '2'))).toBe(true)
    expect(isHardCell(c('hard', '12', '4'))).toBe(true)
    expect(isHardCell(c('hard', '12', '3'))).toBe(true)
    expect(isHardCell(c('surrender', '16', 'T'))).toBe(true)
    expect(isHardCell(c('pair', '9,9', '7'))).toBe(true)
    expect(isHardCell(c('hard', '11', 'A'))).toBe(true)
  })

  it('offensichtliche Felder sind nicht schwer', () => {
    expect(isHardCell(c('pair', 'T,T', '6'))).toBe(false)
    expect(isHardCell(c('hard', '17', '7'))).toBe(false)
    expect(isHardCell(c('soft', 'A,9', '6'))).toBe(false)
    expect(isHardCell(c('hard', '11', '6'))).toBe(false)
    expect(isHardCell(c('pair', 'A,A', '6'))).toBe(false)
  })

  it('Abstand ist für den Tabellenzug nie negativ (Tabelle = EV-Optimum innerhalb der Aktionen)', () => {
    for (const cell of ALL_CELLS) {
      // 8,8 gegen Ass ist nicht betroffen, da Surrender dort nicht zu den Pair-Alternativen zählt
      expect(cellGap(cell), cellKey(cell)).toBeGreaterThan(-0.0005)
    }
    expect(HARD_CELL_KEYS.size).toBe(HARD_CELLS.length)
  })
})
