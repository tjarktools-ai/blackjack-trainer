import type { DealerInfo, EvRow, Explanation } from '../explain/explain'
import { fmtEv, actionName, pct, upLabel } from '../explain/format'
import { PRINCIPLES } from '../explain/principles'

/** Balken der Erwartungswerte aller möglichen Züge. */
export function EvBars({ rows, chosenWrong }: { rows: EvRow[]; chosenWrong?: boolean }) {
  if (rows.length === 0) return null
  const max = Math.max(0.6, ...rows.map((r) => Math.abs(r.ev)))
  return (
    <div className="ev-rows">
      {rows.map((r) => {
        const w = Math.min(50, (Math.abs(r.ev) / max) * 50)
        const cls = ['ev-row', r.recommended ? 'best' : '', r.chosen ? 'chosen' : '', r.chosen && chosenWrong && !r.recommended ? 'wrong' : '']
          .filter(Boolean)
          .join(' ')
        return (
          <div className={cls} key={r.action}>
            <span className="name">
              {actionName(r.action)}
              {r.recommended && <span className="tag">Tabelle</span>}
            </span>
            <span className="ev-track">
              <span className={`ev-fill ${r.ev >= 0 ? 'pos' : 'neg'}`} style={{ width: `${w}%` }} />
            </span>
            <span className="val">{fmtEv(r.ev)}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Wie der Dealer mit dieser offenen Karte endet. */
export function DealerBar({ info }: { info: DealerInfo }) {
  const segs: { cls: string; label: string; p: number }[] = [
    { cls: 't17', label: '17', p: info.totals[0] },
    { cls: 't18', label: '18', p: info.totals[1] },
    { cls: 't19', label: '19', p: info.totals[2] },
    { cls: 't20', label: '20', p: info.totals[3] },
    { cls: 't21', label: '21', p: info.totals[4] },
    { cls: 'bust', label: 'Bust', p: info.bust },
  ]
  return (
    <div>
      <div className="dealer-bar" role="img" aria-label={`Dealer-Endergebnis bei ${upLabel(info.up)}`}>
        {segs.map((s) => (
          <div key={s.cls} className={s.cls} style={{ width: `${s.p * 100}%` }} />
        ))}
      </div>
      <div className="dealer-grid">
        {segs.map((s) => (
          <div key={s.cls} className={s.cls === 'bust' ? 'bust' : ''}>
            <small>{s.label}</small>
            <b>{pct(s.p)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Gemeinsamer Inhalt: Feedback nach dem Zug UND Erklärung eines Tabellenfelds. */
export function ExplanationBody({ x, showVerdict = true }: { x: Explanation; showVerdict?: boolean }) {
  const principle = PRINCIPLES[x.principle]
  const play = x.kind === 'play' ? x : null
  return (
    <>
      {showVerdict && (
        <div className="verdict">
          <div className="icon">{x.correct ? '✓' : '✗'}</div>
          <div>
            <h2>{x.headline}</h2>
            <p>{x.situation}</p>
          </div>
        </div>
      )}
      {!showVerdict && <p className="sub">{x.situation}</p>}

      {play && showVerdict && (
        <div className="pill-row">
          <span className={`pill ${x.correct ? 'ok' : 'bad'}`}>Dein Zug: {actionName(play.chosen)}</span>
          <span className="pill">
            Tabelle: {play.tableCode} · {play.tableCodeText}
          </span>
        </div>
      )}

      {x.evRows.length > 0 && (
        <div className="block">
          <h3>Was jeder Zug im Schnitt bringt</h3>
          <EvBars rows={x.evRows} chosenWrong={!x.correct} />
          <p className="caption">
            Durchschnittsergebnis pro Einsatz: +10 % = im Schnitt 10 Gewinn je 100 gesetzte, −50 % = 50 Verlust je 100. Exakt berechnet für 6 Decks, H17, Double After Split, Late Surrender.
          </p>
        </div>
      )}

      <div className="block">
        <h3>Warum ist das so?</h3>
        {x.why.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {play?.whyNot && (
        <div className="block warn">
          <h3>Warum dein Zug schlechter war</h3>
          <p>{play.whyNot}</p>
        </div>
      )}

      {x.notes.map((n, i) => (
        <div className="block info" key={i}>
          <p>{n}</p>
        </div>
      ))}

      <div className="block">
        <h3>So endet der Dealer mit {upLabel(x.dealer.up)}</h3>
        <DealerBar info={x.dealer} />
      </div>

      <div className="block rule">
        <h3>Merksatz · {principle.title}</h3>
        <strong>{principle.rule}</strong>
      </div>
    </>
  )
}
