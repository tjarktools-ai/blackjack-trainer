import { CELL_KEYS } from '../engine/cells'
import {
  DEALER_COLS,
  HARD_ROWS,
  HARD_TABLE,
  PAIR_ROWS,
  PAIR_TABLE,
  SOFT_ROWS,
  SOFT_TABLE,
  SURRENDER_ROWS,
  SURRENDER_TABLE,
} from '../engine/strategyTables'
import { cellKey, type CellRef } from '../engine/types'
import { upLabel } from '../explain/format'
import { cellStatus, useStats } from '../state/statsStore'

export type ChartMode = 'chart' | 'heat'

function codeClass(code: string): string {
  if (code === 'Y/N') return 'YN'
  if (code === '-') return 'dash'
  return code
}

function Header() {
  return (
    <thead>
      <tr>
        <th />
        {DEALER_COLS.map((d) => (
          <th key={d}>{d === 'T' ? '10' : d}</th>
        ))}
      </tr>
    </thead>
  )
}

interface TableProps {
  mode: ChartMode
  onCell: (c: CellRef) => void
  highlight?: CellRef | null
}

function useCellClass(mode: ChartMode, highlight?: CellRef | null) {
  const cells = useStats((s) => s.cells)
  return (cell: CellRef, code: string): string => {
    const classes = [codeClass(code)]
    if (mode === 'heat') {
      const key = cellKey(cell)
      if (CELL_KEYS.has(key)) classes.push(`st-${cellStatus(cells[key])}`)
    }
    if (highlight && cellKey(highlight) === cellKey(cell)) classes.push('hl')
    return classes.join(' ')
  }
}

export function StrategyChart({ mode, onCell, highlight }: TableProps) {
  const cls = useCellClass(mode, highlight)
  const label = (code: string) => (code === '-' ? '' : code)
  return (
    <div className="stack">
      <table className={`chart ${mode === 'heat' ? 'heat' : ''}`}>
        <caption>Pair Splitting</caption>
        <Header />
        <tbody>
          {PAIR_ROWS.map((row) => (
            <tr key={row}>
              <th className="row">{row}</th>
              {DEALER_COLS.map((d, i) => {
                const cell: CellRef = { category: 'pair', row, dealer: d }
                const code = PAIR_TABLE[row][i]
                return (
                  <td key={d} className={cls(cell, code)} onClick={() => onCell(cell)}>
                    {code}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <table className={`chart ${mode === 'heat' ? 'heat' : ''}`}>
        <caption>Soft Totals</caption>
        <Header />
        <tbody>
          {SOFT_ROWS.map((row) => (
            <tr key={row}>
              <th className="row">{row}</th>
              {DEALER_COLS.map((d, i) => {
                const cell: CellRef = { category: 'soft', row, dealer: d }
                const code = SOFT_TABLE[row][i]
                return (
                  <td key={d} className={cls(cell, code)} onClick={() => onCell(cell)}>
                    {code}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <table className={`chart ${mode === 'heat' ? 'heat' : ''}`}>
        <caption>Hard Totals</caption>
        <Header />
        <tbody>
          {HARD_ROWS.map((row) => (
            <tr key={row}>
              <th className="row">{row === '17' ? '17+' : row === '8' ? '≤8' : row}</th>
              {DEALER_COLS.map((d, i) => {
                const cell: CellRef = { category: 'hard', row, dealer: d }
                const code = HARD_TABLE[row][i]
                return (
                  <td key={d} className={cls(cell, code)} onClick={() => onCell(cell)}>
                    {code}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <table className={`chart ${mode === 'heat' ? 'heat' : ''}`}>
        <caption>Late Surrender</caption>
        <Header />
        <tbody>
          {SURRENDER_ROWS.map((row) => (
            <tr key={row}>
              <th className="row">{row}</th>
              {DEALER_COLS.map((d, i) => {
                const cell: CellRef = { category: 'surrender', row, dealer: d }
                const code = SURRENDER_TABLE[row][i]
                return (
                  <td
                    key={d}
                    className={cls(cell, code)}
                    onClick={() => (code === 'SUR' ? onCell(cell) : onCell({ category: 'hard', row, dealer: d }))}
                  >
                    {label(code)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="caption">Spalten = offene Dealer-Karte ({DEALER_COLS.map(upLabel).join(', ')}). Tippe auf ein Feld, um zu sehen, warum der Zug richtig ist.</p>
    </div>
  )
}

export function ChartLegend() {
  return (
    <div className="legend">
      <span>
        <i style={{ background: '#14a85a' }} />
        Y Split · D Double · SUR Surrender
      </span>
      <span>
        <i style={{ background: '#1d9aa0' }} />
        Y/N Split (mit DAS) · Ds Double, sonst Stand
      </span>
      <span>
        <i style={{ background: '#d9ad0f' }} />S Stand
      </span>
      <span>
        <i style={{ background: '#213645', border: '1px solid #3a566a' }} />H Hit · N nicht splitten
      </span>
    </div>
  )
}

export function HeatLegend() {
  return (
    <div className="legend">
      <span>
        <i style={{ background: '#14a85a' }} />
        gemeistert
      </span>
      <span>
        <i style={{ background: '#d9a30f' }} />
        lernst du gerade
      </span>
      <span>
        <i style={{ background: '#d63b4b' }} />
        schwach
      </span>
      <span>
        <i style={{ background: '#213645', border: '1px solid #3a566a' }} />
        noch nicht gesehen
      </span>
    </div>
  )
}
