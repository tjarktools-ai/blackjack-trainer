import { useState } from 'react'
import { pct } from '../explain/format'
import { BUDGET_MAX, BUDGET_MIN, defaultBet, useFun, type FunSummary, type HintMode } from '../state/funStore'
import { fmtMoney, fmtSigned } from './cardUtils'
import { ControlPanel, TableView } from './Table'

const PRESETS = [100, 500, 1000, 5000, 10000, 50000]

function SummaryCard({ s, title }: { s: FunSummary; title: string }) {
  const net = s.endBalance - s.startBudget
  const optimal = s.decisions ? s.optimal / s.decisions : null
  return (
    <div className="card-panel stack">
      <h2 style={{ fontSize: 18 }}>{title}</h2>
      <div className={`net-banner ${net > 0 ? 'plus' : net < 0 ? 'minus' : 'zero'}`} style={{ textAlign: 'center' }}>
        {fmtSigned(net)} <span className="sub">({net >= 0 ? '+' : '−'}
        {pct(Math.abs(net) / s.startBudget)})</span>
      </div>
      <div className="kpis">
        <div className="kpi">
          <small>Start-Budget</small>
          <b>{fmtMoney(s.startBudget)}</b>
        </div>
        <div className="kpi">
          <small>Endstand</small>
          <b>{fmtMoney(s.endBalance)}</b>
        </div>
        <div className="kpi">
          <small>Runden</small>
          <b>{s.rounds}</b>
        </div>
        <div className="kpi">
          <small>Optimale Züge</small>
          <b>{optimal === null ? '–' : pct(optimal)}</b>
        </div>
        <div className="kpi">
          <small>Höchststand</small>
          <b>{fmtMoney(s.peak)}</b>
        </div>
        <div className="kpi">
          <small>Tiefststand</small>
          <b>{fmtMoney(s.low)}</b>
        </div>
      </div>
    </div>
  )
}

function Setup() {
  const startSession = useFun((s) => s.startSession)
  const hintMode = useFun((s) => s.hintMode)
  const setHintMode = useFun((s) => s.setHintMode)
  const summary = useFun((s) => s.summary)
  const [budget, setBudget] = useState(1000)
  const [custom, setCustom] = useState('')

  const customNum = custom.trim() === '' ? null : Math.round(Number(custom.replace(/\./g, '').replace(',', '.')))
  const customValid = customNum !== null && Number.isFinite(customNum) && customNum >= BUDGET_MIN && customNum <= BUDGET_MAX
  const effective = customNum !== null ? (customValid ? customNum : null) : budget

  return (
    <div className="screen">
      <div className="stack">
        <div>
          <h1 className="title">Spaß-Modus</h1>
          <p className="sub">Einfach spielen – wie am echten Tisch, ohne Unterbrechung.</p>
        </div>

        <div className="card-panel">
          <ul className="plain">
            <li>
              <b>100 % realistisch:</b> 6 Decks, echter Zufall, normale Regeln, Cut Card.
            </li>
            <li>
              <b>Nie unterbrochen:</b> Die Erklärung zu deinem Zug erscheint klein in einer Leiste, das Spiel läuft weiter.
            </li>
            <li>
              <b>Eigenes Budget:</b> Dein Trainings-Spielgeld und dein Lernfortschritt bleiben unberührt.
            </li>
          </ul>
        </div>

        <div className="card-panel stack">
          <h3 style={{ fontSize: 16 }}>Dein Budget</h3>
          <div className="budget-grid">
            {PRESETS.map((p) => (
              <button
                key={p}
                className={`pill-btn${custom.trim() === '' && budget === p ? ' on' : ''}`}
                onClick={() => {
                  setBudget(p)
                  setCustom('')
                }}
              >
                {fmtMoney(p)}
              </button>
            ))}
          </div>
          <label className="field-label">
            Oder eigenen Betrag eingeben ({fmtMoney(BUDGET_MIN)} – {fmtMoney(BUDGET_MAX)})
            <input
              className="field-input"
              inputMode="numeric"
              placeholder="z. B. 2500"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^\d.,]/g, ''))}
            />
          </label>
          {customNum !== null && !customValid && <p className="caption" style={{ color: 'var(--red)' }}>Bitte einen Betrag zwischen {fmtMoney(BUDGET_MIN)} und {fmtMoney(BUDGET_MAX)} eingeben.</p>}
          {effective !== null && (
            <p className="sub">
              Start-Einsatz: <b style={{ color: 'var(--text)' }}>{fmtMoney(Math.min(defaultBet(effective), effective))}</b> – änderst du jederzeit mit den Chips.
            </p>
          )}
        </div>

        <div className="card-panel stack">
          <h3 style={{ fontSize: 16 }}>Hinweise zu deinen Zügen</h3>
          <div className="seg">
            {([['short', 'Kurz einblenden'], ['off', 'Aus']] as [HintMode, string][]).map(([v, l]) => (
              <button key={v} className={hintMode === v ? 'on' : ''} onClick={() => setHintMode(v)}>
                {l}
              </button>
            ))}
          </div>
          <p className="caption">Kurz = ein bis zwei Sätze, ob dein Zug nach der Basic Strategy richtig war und warum.</p>
        </div>

        <button className="btn primary" disabled={effective === null} onClick={() => effective !== null && startSession(effective)}>
          Los geht’s{effective !== null ? ` mit ${fmtMoney(effective)}` : ''}
        </button>

        {summary && <SummaryCard s={summary} title="Letzte Session" />}
      </div>
    </div>
  )
}

function Summary() {
  const summary = useFun((s) => s.summary)
  const newSession = useFun((s) => s.newSession)
  if (!summary) return null
  return (
    <div className="screen">
      <div className="stack">
        <div>
          <h1 className="title">Auswertung</h1>
          <p className="sub">So lief deine Session.</p>
        </div>
        <SummaryCard s={summary} title="Ergebnis" />
        <p className="caption">
          Mit perfekter Basic Strategy verliert man auf lange Sicht im Schnitt nur rund 0,5 % des Einsatzes – kurzfristig entscheidet der Zufall.
        </p>
        <button className="btn primary" onClick={newSession}>
          Neue Session
        </button>
      </div>
    </div>
  )
}

function FunBar() {
  const session = useFun((s) => s.session)
  const balance = useFun((s) => s.snap.balance)
  const phase = useFun((s) => s.snap.phase)
  const busy = useFun((s) => s.busy)
  const endSession = useFun((s) => s.endSession)
  if (!session) return null
  const net = balance - session.startBudget
  const optimal = session.decisions ? pct(session.optimal / session.decisions, 0) : '–'
  const canEnd = !busy && (phase === 'betting' || phase === 'settled')
  return (
    <div className="fun-bar">
      <div>
        <small>Start</small>
        <b>{fmtMoney(session.startBudget)}</b>
      </div>
      <div>
        <small>Ergebnis</small>
        <b className={net > 0 ? 'plus' : net < 0 ? 'minus' : ''}>{fmtSigned(net)}</b>
      </div>
      <div>
        <small>Runden</small>
        <b>{session.rounds}</b>
      </div>
      <div>
        <small>Optimal</small>
        <b>{optimal}</b>
      </div>
      <button className="btn small" onClick={endSession} disabled={!canEnd} title="Session beenden und auswerten">
        Beenden
      </button>
    </div>
  )
}

function HintStrip() {
  const hint = useFun((s) => s.hint)
  const mode = useFun((s) => s.hintMode)
  if (mode === 'off') return null
  return (
    <div className={`fun-hint${hint ? (hint.ok ? ' ok' : ' bad') : ''}`} aria-live="polite">
      {hint ? (
        <div key={hint.id} className="fun-hint-in">
          <b>{hint.title}</b>
          <span>{hint.text}</span>
        </div>
      ) : (
        <span className="muted">Hier erscheint nach jedem Zug ein kurzer Hinweis.</span>
      )}
    </div>
  )
}

function Play() {
  const ctl = useFun()
  const endSession = useFun((s) => s.endSession)
  return (
    <div className="screen game-screen" aria-busy={ctl.busy}>
      <FunBar />
      <TableView ctl={ctl} />
      <HintStrip />
      <ControlPanel ctl={ctl} broke={{ text: 'Dein Budget ist aufgebraucht.', label: 'Zur Auswertung', run: endSession }} />
    </div>
  )
}

export function FunScreen() {
  const phase = useFun((s) => s.phase)
  if (phase === 'setup') return <Setup />
  if (phase === 'summary') return <Summary />
  return <Play />
}
