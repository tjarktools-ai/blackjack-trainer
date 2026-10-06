import { useState } from 'react'
import type { CellRef } from '../engine/types'
import { pct, upLabel } from '../explain/format'
import { PRINCIPLE_ORDER, PRINCIPLES } from '../explain/principles'
import { DEALER_STATS } from '../data/evData.generated'
import { DEALER_COLS } from '../engine/strategyTables'
import { CellDetail } from './CellDetail'
import { ChartLegend, StrategyChart } from './StrategyChart'

function cellName(c: CellRef): string {
  const row = c.category === 'hard' && c.row === '17' ? '17+' : c.row
  const kind = c.category === 'pair' ? 'Paar' : c.category === 'soft' ? 'Soft' : c.category === 'surrender' ? 'Surrender' : 'Hard'
  return `${kind} ${row} gegen ${upLabel(c.dealer)}`
}

function DealerTable() {
  return (
    <div className="block">
      <h3>Dealer-Bust-Wahrscheinlichkeit je offener Karte</h3>
      <div className="stack" style={{ gap: 6 }}>
        {DEALER_COLS.map((d) => {
          const bust = DEALER_STATS[d].bust
          return (
            <div className="bar-row" key={d} style={{ gridTemplateColumns: '60px 1fr 56px' }}>
              <span>Dealer {upLabel(d)}</span>
              <span className="bar">
                <i style={{ width: `${bust * 100 * 2}%` }} />
              </span>
              <b>{pct(bust)}</b>
            </div>
          )
        })}
      </div>
      <p className="caption">Exakt berechnet für 6 Decks, Dealer zieht auf Soft 17, nach Peek (ohne Dealer-Blackjack).</p>
    </div>
  )
}

export function LearnScreen() {
  const [tab, setTab] = useState<'why' | 'chart'>('why')
  const [cell, setCell] = useState<CellRef | null>(null)

  return (
    <div className="screen">
      <div className="stack">
        <div>
          <h1 className="title">Lernen</h1>
          <p className="sub">Nicht auswendig lernen – verstehen, warum jede Entscheidung richtig ist.</p>
        </div>
        <div className="seg" role="tablist">
          <button className={tab === 'why' ? 'on' : ''} onClick={() => setTab('why')}>
            Warum? (Prinzipien)
          </button>
          <button className={tab === 'chart' ? 'on' : ''} onClick={() => setTab('chart')}>
            Tabelle
          </button>
        </div>

        {tab === 'why' && (
          <>
            <DealerTable />
            {PRINCIPLE_ORDER.map((id, i) => {
              const p = PRINCIPLES[id]
              return (
                <details className="principle" key={id}>
                  <summary>
                    <span className="num">{i + 1}</span>
                    <span>{p.title}</span>
                  </summary>
                  <div className="principle-body">
                    <p className="rule">{p.rule}</p>
                    {p.body.map((t, k) => (
                      <p key={k}>{t}</p>
                    ))}
                    {p.examples.length > 0 && (
                      <>
                        <p className="caption">Beispiele – tippen für die genaue Rechnung:</p>
                        <div className="chips-inline">
                          {p.examples.map((c) => (
                            <button className="cell-chip" key={`${c.category}${c.row}${c.dealer}`} onClick={() => setCell(c)}>
                              {cellName(c)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </details>
              )
            })}
          </>
        )}

        {tab === 'chart' && (
          <>
            <StrategyChart mode="chart" onCell={setCell} />
            <ChartLegend />
          </>
        )}
      </div>
      {cell && <CellDetail cell={cell} onClose={() => setCell(null)} />}
    </div>
  )
}
