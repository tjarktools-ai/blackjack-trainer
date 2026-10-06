import { useMemo, useState } from 'react'
import { ALL_CELLS, CATEGORY_LABEL } from '../engine/cells'
import { cellKey, type CellRef } from '../engine/types'
import { upLabel } from '../explain/format'
import { PRINCIPLE_ORDER, PRINCIPLES } from '../explain/principles'
import { cellStatus, computeProgress, useStats } from '../state/statsStore'
import { CellDetail } from './CellDetail'
import { fmtMoney } from './cardUtils'
import { HeatLegend, StrategyChart } from './StrategyChart'

const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)} %`)

function Ring({ value }: { value: number }) {
  const r = 50
  const c = 2 * Math.PI * r
  return (
    <svg className="ring" viewBox="0 0 120 120" role="img" aria-label={`Strategie beherrscht: ${Math.round(value * 100)} Prozent`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--panel-2)" strokeWidth="12" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="var(--green)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="68" textAnchor="middle" fontSize="26">
        {Math.round(value * 100)}%
      </text>
    </svg>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="empty">Spiele ein paar Runden, dann erscheint hier dein Guthabenverlauf.</p>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 300},${58 - ((v - min) / span) * 52}`).join(' ')
  return (
    <svg className="spark" viewBox="0 0 300 64" preserveAspectRatio="none" role="img" aria-label="Guthabenverlauf">
      <polyline points={pts} fill="none" stroke="var(--green)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function cellName(c: CellRef): string {
  const row = c.category === 'hard' && c.row === '17' ? '17+' : c.row
  const kind = c.category === 'pair' ? 'Paar' : c.category === 'soft' ? 'Soft' : c.category === 'surrender' ? 'Surrender' : 'Hard'
  return `${kind} ${row} gegen ${upLabel(c.dealer)}`
}

export function ProgressScreen() {
  const stats = useStats()
  const [cell, setCell] = useState<CellRef | null>(null)
  const p = useMemo(() => computeProgress(stats), [stats])

  const byCategory = useMemo(() => {
    return (['pair', 'soft', 'hard', 'surrender'] as const).map((cat) => {
      const cells = ALL_CELLS.filter((c) => c.category === cat)
      const mastered = cells.filter((c) => cellStatus(stats.cells[cellKey(c)]) === 'mastered').length
      return { cat, mastered, total: cells.length }
    })
  }, [stats.cells])

  const problems = useMemo(() => {
    return ALL_CELLS.map((c) => ({ c, s: stats.cells[cellKey(c)] }))
      .filter((x) => x.s && x.s.attempts > x.s.correct)
      .sort((a, b) => b.s!.attempts - b.s!.correct - (a.s!.attempts - a.s!.correct))
      .slice(0, 6)
  }, [stats.cells])

  const quizRows = PRINCIPLE_ORDER.map((id) => ({ id, s: stats.quiz.byPrinciple[id] })).filter((x) => x.s && x.s.asked > 0)

  return (
    <div className="screen">
      <div className="stack">
        <div>
          <h1 className="title">Fortschritt</h1>
          <p className="sub">Wie sicher du die Basic Strategy wirklich kannst.</p>
        </div>

        <div className="card-panel">
          <div className="ring-wrap">
            <Ring value={p.mastery} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Strategie beherrscht</div>
              <div className="sub">
                {p.masteredCount} von {p.totalCells} Tabellenfeldern gemeistert
              </div>
              <div className="sub" style={{ marginTop: 6 }}>
                Gemeistert = mindestens 3 Versuche und die letzten 3 richtig.
              </div>
            </div>
          </div>
        </div>

        <div className="kpis">
          <div className="kpi">
            <small>Trefferquote (letzte 100)</small>
            <b>{pct(p.recentAccuracy)}</b>
          </div>
          <div className="kpi">
            <small>Trefferquote gesamt</small>
            <b>{pct(p.accuracy)}</b>
          </div>
          <div className="kpi">
            <small>Entscheidungen</small>
            <b>{stats.decisions}</b>
          </div>
          <div className="kpi">
            <small>Aktuelle Serie</small>
            <b>
              {stats.streak} <span className="sub">(Best {stats.bestStreak})</span>
            </b>
          </div>
          <div className="kpi">
            <small>Gesehene Felder</small>
            <b>
              {p.seenCount} / {p.totalCells}
            </b>
          </div>
          <div className="kpi">
            <small>Schwache Felder</small>
            <b style={{ color: p.weakCount ? 'var(--red)' : undefined }}>{p.weakCount}</b>
          </div>
        </div>

        <div className="card-panel stack">
          <h3 className="sub" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12 }}>
            Nach Bereich
          </h3>
          {byCategory.map(({ cat, mastered, total }) => (
            <div className="bar-row" key={cat}>
              <span>{CATEGORY_LABEL[cat]}</span>
              <span className="bar">
                <i style={{ width: `${(mastered / total) * 100}%` }} />
              </span>
              <b>
                {mastered}/{total}
              </b>
            </div>
          ))}
          <div className="bar-row">
            <span>Insurance ablehnen</span>
            <span className="bar">
              <i style={{ width: `${stats.insurance.offered ? (stats.insurance.correct / stats.insurance.offered) * 100 : 0}%` }} />
            </span>
            <b>
              {stats.insurance.correct}/{stats.insurance.offered}
            </b>
          </div>
        </div>

        <div className="card-panel stack">
          <h3 className="sub" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12 }}>
            Deine Problemfelder
          </h3>
          {problems.length === 0 && <p className="empty">Noch keine Fehler – spiele Hände, dann siehst du hier, wo du noch üben musst.</p>}
          <div className="chips-inline">
            {problems.map(({ c, s }) => (
              <button className="cell-chip" key={cellKey(c)} onClick={() => setCell(c)}>
                {cellName(c)} · {s!.attempts - s!.correct}× falsch
              </button>
            ))}
          </div>
        </div>

        <div className="card-panel stack">
          <h3 className="sub" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12 }}>
            Verständnis („Warum?“-Quiz)
          </h3>
          <p className="sub">
            {stats.quiz.asked === 0
              ? 'Das Quiz erscheint nach manchen Entscheidungen (einstellbar). Hier siehst du, ob du die Gründe verstehst – nicht nur die Tabelle.'
              : `${stats.quiz.correct} von ${stats.quiz.asked} Antworten richtig (${Math.round((stats.quiz.correct / stats.quiz.asked) * 100)} %).`}
          </p>
          {quizRows.map(({ id, s }) => (
            <div className="bar-row" key={id} style={{ gridTemplateColumns: '1fr 70px 38px' }}>
              <span style={{ fontSize: 13 }}>{PRINCIPLES[id].title}</span>
              <span className="bar">
                <i style={{ width: `${(s!.correct / s!.asked) * 100}%` }} />
              </span>
              <b>
                {s!.correct}/{s!.asked}
              </b>
            </div>
          ))}
        </div>

        <div className="card-panel stack">
          <h3 className="sub" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12 }}>
            Heatmap der Tabelle
          </h3>
          <StrategyChart mode="heat" onCell={setCell} />
          <HeatLegend />
        </div>

        <div className="card-panel stack">
          <h3 className="sub" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12 }}>
            Spielgeld
          </h3>
          <div className="kpis">
            <div className="kpi">
              <small>Runden</small>
              <b>{stats.rounds}</b>
            </div>
            <div className="kpi">
              <small>Gewinn / Verlust</small>
              <b style={{ color: stats.netTotal > 0 ? 'var(--green)' : stats.netTotal < 0 ? 'var(--red)' : undefined }}>
                {stats.netTotal > 0 ? '+' : stats.netTotal < 0 ? '−' : ''}
                {fmtMoney(Math.abs(stats.netTotal))}
              </b>
            </div>
          </div>
          <Sparkline values={stats.balanceHistory} />
          <p className="caption">
            Selbst mit perfekter Strategie verliert man über viele Hände im Schnitt rund 0,5 % des Einsatzes – kurzfristig entscheidet der Zufall. Hier geht es nur um die richtigen Entscheidungen.
          </p>
        </div>
      </div>
      {cell && <CellDetail cell={cell} onClose={() => setCell(null)} />}
    </div>
  )
}
