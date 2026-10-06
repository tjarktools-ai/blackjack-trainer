import type { ReactNode } from 'react'
import { handValue } from '../engine/hand'
import type { PlayerHand, RoundSnapshot } from '../engine/round'
import { CHIP_VALUES, MAX_BET, MIN_BET } from '../engine/rules'
import type { Action } from '../engine/types'
import { CardBack, CardView } from './Cards'
import { fmtMoney, fmtSigned, resultTag, totalLabel } from './cardUtils'

/**
 * Gemeinsame Tisch-Bausteine für Training und Spaß-Modus.
 * Beide Modi haben ihren eigenen Zustand, bedienen den Tisch aber über dieselbe Schnittstelle.
 */
export interface TableController {
  snap: RoundSnapshot
  bet: number
  lastBet: number
  busy: boolean
  addBet: (amount: number) => void
  undoBet: () => void
  clearBet: () => void
  setBet: (amount: number) => void
  deal: () => Promise<void>
  act: (action: Action) => void
  insurance: (take: boolean) => void
}

function cardWidth(handCount: number): number {
  if (handCount <= 1) return 66
  if (handCount === 2) return 56
  if (handCount === 3) return 46
  return 38
}

function DealerZone({ snap }: { snap: RoundSnapshot }) {
  const { dealer, holeHidden } = snap
  if (dealer.length === 0) {
    return (
      <div className="zone">
        <div className="zone-label">Dealer</div>
        <div className="cards" style={{ ['--cw' as string]: '66px' }} />
      </div>
    )
  }
  const visible = holeHidden ? [dealer[0]] : dealer
  const label = totalLabel(visible)
  return (
    <div className="zone">
      <div className="zone-label">
        Dealer <span className={`total-badge ${label.kind}`}>{label.text}</span>
      </div>
      <div className="cards" style={{ ['--cw' as string]: '66px' }}>
        {dealer.map((c, i) =>
          i === 1 && holeHidden ? (
            <CardBack key="hole" delay={480} />
          ) : (
            <CardView key={c.id} card={c} delay={i === 0 ? 160 : i === 1 ? 480 : 0} flip={i === 1} />
          ),
        )}
      </div>
    </div>
  )
}

function HandView({ hand, active, count }: { hand: PlayerHand; active: boolean; count: number }) {
  const label = totalLabel(hand.cards, hand.fromSplit)
  const tag = resultTag(hand)
  return (
    <div className={`hand${active ? ' active' : ''}`}>
      <div className="cards" style={{ ['--cw' as string]: `${cardWidth(count)}px` }}>
        {hand.cards.map((c, i) => (
          <CardView key={c.id} card={c} delay={count === 1 && i === 1 ? 320 : 0} />
        ))}
      </div>
      <div className="hand-meta">
        <span className={`total-badge ${label.kind}`}>{label.text}</span>
        <span className="hand-bet">
          <span className="dot" />
          {fmtMoney(hand.bet)}
        </span>
      </div>
      {tag && <span className={`result-tag ${tag.kind}`}>{tag.text}</span>}
      {count > 1 && !tag && hand.status === 'pending' && <span className="hand-bet">wartet …</span>}
    </div>
  )
}

function PlayerZone({ snap }: { snap: RoundSnapshot }) {
  if (snap.hands.length === 0) {
    return (
      <div className="zone">
        <div className="cards" style={{ ['--cw' as string]: '66px' }} />
        <div className="zone-label">Deine Hand</div>
      </div>
    )
  }
  return (
    <div className="zone">
      <div className="hands">
        {snap.hands.map((h, i) => (
          <HandView key={h.id} hand={h} active={snap.phase === 'player' && i === snap.active && snap.hands.length > 1} count={snap.hands.length} />
        ))}
      </div>
    </div>
  )
}

function CenterInfo({ snap, busy, extra }: { snap: RoundSnapshot; busy: boolean; extra?: ReactNode }) {
  const shoePct = Math.round(snap.shoe.dealtFraction * 100)
  let content: ReactNode = null
  if (snap.phase === 'settled') {
    const n = snap.net
    content = <div className={`net-banner ${n > 0 ? 'plus' : n < 0 ? 'minus' : 'zero'}`}>{n === 0 ? 'Push' : fmtSigned(n)}</div>
  } else if (snap.phase === 'dealer') {
    content = <div className="status-line">Dealer spielt …</div>
  } else if (snap.phase === 'player' && snap.hands.length > 1) {
    content = (
      <div className="status-line">
        Hand {snap.active + 1} von {snap.hands.length}
      </div>
    )
  } else if (snap.phase === 'betting') {
    content = <div className="status-line">Setze deinen Einsatz</div>
  } else if (snap.phase === 'insurance' && !busy) {
    content = <div className="status-line">Dealer zeigt ein Ass …</div>
  }
  return (
    <div className="table-center">
      {content}
      {(snap.phase === 'betting' || snap.phase === 'settled') && extra}
      <div className="shoe" title="Cut Card bei ca. 75 %">
        <span>Schuh</span>
        <span className="bar">
          <i style={{ width: `${shoePct}%` }} />
        </span>
        <span>{shoePct} %</span>
      </div>
    </div>
  )
}

/** Dealer, Mitte (Status/Ergebnis/Schuh) und Spieler-Hände. */
export function TableView({ ctl, centerExtra }: { ctl: TableController; centerExtra?: ReactNode }) {
  return (
    <div className="table">
      <DealerZone snap={ctl.snap} />
      <CenterInfo snap={ctl.snap} busy={ctl.busy} extra={centerExtra} />
      <PlayerZone snap={ctl.snap} />
    </div>
  )
}

function Chip({ value, disabled, onClick }: { value: number; disabled: boolean; onClick: () => void }) {
  return (
    <button className={`chip c${value}`} disabled={disabled} onClick={onClick} aria-label={`Chip ${value}`}>
      {value}
    </button>
  )
}

export interface BrokeAction {
  text: string
  label: string
  run: () => void
}

function BetPanel({ ctl, broke }: { ctl: TableController; broke: BrokeAction }) {
  const { bet, snap, busy, addBet, undoBet, clearBet, setBet, deal, lastBet } = ctl
  const free = Math.min(MAX_BET, snap.balance) - bet
  if (snap.balance < MIN_BET && bet === 0) {
    return (
      <div className="controls">
        <p className="action-hint">{broke.text}</p>
        <button className="btn primary" onClick={broke.run}>
          {broke.label}
        </button>
      </div>
    )
  }
  return (
    <div className="controls">
      <div className="bet-row">
        <div className="bet-display">
          <small>Einsatz</small>
          <b>{fmtMoney(bet)}</b>
        </div>
        <div className="btn-row" style={{ flex: 'none' }}>
          <button className="btn small" onClick={undoBet} disabled={bet === 0 || busy}>
            Zurück
          </button>
          <button className="btn small" onClick={clearBet} disabled={bet === 0 || busy}>
            Löschen
          </button>
          <button className="btn small" onClick={() => setBet(lastBet)} disabled={busy || lastBet > snap.balance || lastBet === bet}>
            Letzter
          </button>
        </div>
      </div>
      <div className="chip-row">
        {CHIP_VALUES.map((v) => (
          <Chip key={v} value={v} disabled={busy || v > free} onClick={() => addBet(v)} />
        ))}
      </div>
      <button className="btn primary" disabled={busy || bet < MIN_BET || bet > snap.balance} onClick={() => void deal()}>
        {snap.phase === 'settled' ? 'Nächste Runde' : 'Austeilen'}
      </button>
    </div>
  )
}

function InsurancePanel({ ctl }: { ctl: TableController }) {
  const { snap, busy, insurance } = ctl
  const hand = snap.hands[0]
  const cost = hand ? hand.bet / 2 : 0
  const even = snap.playerHasBlackjack
  return (
    <div className="controls">
      <div className="insurance-panel">
        <p>{even ? 'Du hast Blackjack, der Dealer zeigt ein Ass. Even Money anbieten?' : 'Der Dealer zeigt ein Ass. Insurance abschließen?'}</p>
        <div className="btn-row">
          <button className="btn" disabled={busy || (!even && !snap.canTakeInsurance)} onClick={() => insurance(true)}>
            {even ? 'Even Money (1:1)' : `Insurance (${fmtMoney(cost)})`}
          </button>
          <button className="btn primary" disabled={busy} onClick={() => insurance(false)}>
            Nein, weiter
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionsPanel({ ctl, hint }: { ctl: TableController; hint?: ReactNode }) {
  const { snap, busy, act } = ctl
  const can = (a: Action) => !busy && snap.actions.includes(a)
  return (
    <div className="controls">
      <div className="actions">
        <button className="btn hit" disabled={!can('hit')} onClick={() => act('hit')}>
          Hit
        </button>
        <button className="btn stand" disabled={!can('stand')} onClick={() => act('stand')}>
          Stand
        </button>
        <button className="btn double" disabled={!can('double')} onClick={() => act('double')}>
          Double
        </button>
        <button className="btn split wide" disabled={!can('split')} onClick={() => act('split')}>
          Split
        </button>
        <button className="btn surrender wide" disabled={!can('surrender')} onClick={() => act('surrender')}>
          Surrender
        </button>
      </div>
      {hint}
    </div>
  )
}

function DealerPanel({ ctl }: { ctl: TableController }) {
  const { snap } = ctl
  const d = handValue(snap.dealer.length ? snap.dealer : [])
  return (
    <div className="controls">
      <p className="action-hint">Dealer deckt auf und zieht nach Regeln (zieht bis 17, auch auf Soft 17)…{snap.dealer.length && !snap.holeHidden ? ` Aktuell: ${d.total}` : ''}</p>
    </div>
  )
}

/** Steuerung passend zur Runden-Phase: Einsatz, Insurance, Aktionen oder Dealer-Phase. */
export function ControlPanel({ ctl, broke, actionsHint }: { ctl: TableController; broke: BrokeAction; actionsHint?: ReactNode }) {
  const phase = ctl.snap.phase
  if (phase === 'betting' || phase === 'settled') return <BetPanel ctl={ctl} broke={broke} />
  if (phase === 'insurance') return <InsurancePanel ctl={ctl} />
  if (phase === 'player') return <ActionsPanel ctl={ctl} hint={actionsHint} />
  return <DealerPanel ctl={ctl} />
}
