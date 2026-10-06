import { handValue } from '../engine/hand'
import type { PlayerHand } from '../engine/round'
import { CHIP_VALUES, MAX_BET, MIN_BET, START_BALANCE } from '../engine/rules'
import type { Action } from '../engine/types'
import { useGame } from '../state/gameStore'
import { useSettings, type DealMode } from '../state/settingsStore'
import { CardBack, CardView } from './Cards'
import { fmtMoney, fmtSigned, resultTag, totalLabel } from './cardUtils'

function cardWidth(handCount: number): number {
  if (handCount <= 1) return 66
  if (handCount === 2) return 56
  if (handCount === 3) return 46
  return 38
}

function DealerZone() {
  const snap = useGame((s) => s.snap)
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

function HandView({ hand, index, active, count }: { hand: PlayerHand; index: number; active: boolean; count: number }) {
  const label = totalLabel(hand.cards, hand.fromSplit)
  const tag = resultTag(hand)
  return (
    <div className={`hand${active ? ' active' : ''}`}>
      <div className="cards" style={{ ['--cw' as string]: `${cardWidth(count)}px` }}>
        {hand.cards.map((c, i) => (
          <CardView key={c.id} card={c} delay={count === 1 && i === 0 ? 0 : count === 1 && i === 1 ? 320 : 0} />
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
      <span style={{ display: 'none' }}>{index}</span>
    </div>
  )
}

function PlayerZone() {
  const snap = useGame((s) => s.snap)
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
          <HandView key={h.id} hand={h} index={i} active={snap.phase === 'player' && i === snap.active && snap.hands.length > 1} count={snap.hands.length} />
        ))}
      </div>
    </div>
  )
}

const MODES: { id: DealMode; label: string; hint: string }[] = [
  { id: 'realistic', label: 'Realistisch', hint: 'Karten wie am echten Tisch' },
  { id: 'learn', label: 'Lern-Deal', hint: 'Bevorzugt Felder, die du noch nicht kannst' },
  { id: 'hard', label: 'Schwer', hint: 'Nur knappe, schwierige Entscheidungen' },
]

/** Umschalter zwischen realistischem Austeilen und Übungsmodi. */
function ModeSwitch() {
  const mode = useSettings((s) => s.dealMode)
  const set = useSettings((s) => s.set)
  const current = MODES.find((m) => m.id === mode)!
  return (
    <div className="mode-switch">
      <div className="seg" role="radiogroup" aria-label="Austeil-Modus">
        {MODES.map((m) => (
          <button key={m.id} role="radio" aria-checked={mode === m.id} className={mode === m.id ? 'on' : ''} onClick={() => set('dealMode', m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <span className="status-line">{current.hint}</span>
    </div>
  )
}

function CenterInfo() {
  const snap = useGame((s) => s.snap)
  const busy = useGame((s) => s.busy)
  const shoePct = Math.round(snap.shoe.dealtFraction * 100)
  let content: React.ReactNode = null
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
      {(snap.phase === 'betting' || snap.phase === 'settled') && <ModeSwitch />}
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

function Chip({ value, disabled, onClick }: { value: number; disabled: boolean; onClick: () => void }) {
  return (
    <button className={`chip c${value}`} disabled={disabled} onClick={onClick} aria-label={`Chip ${value}`}>
      {value}
    </button>
  )
}

function BetPanel() {
  const { bet, snap, busy, addBet, undoBet, clearBet, setBet, deal, lastBet, newBankroll } = useGame()
  const free = Math.min(MAX_BET, snap.balance) - bet
  if (snap.balance < MIN_BET && bet === 0) {
    return (
      <div className="controls">
        <p className="action-hint">Dein Spielgeld ist aufgebraucht.</p>
        <button className="btn primary" onClick={newBankroll}>
          Neues Guthaben ({fmtMoney(START_BALANCE)})
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

function InsurancePanel() {
  const snap = useGame((s) => s.snap)
  const busy = useGame((s) => s.busy)
  const insurance = useGame((s) => s.insurance)
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

function ActionsPanel() {
  const snap = useGame((s) => s.snap)
  const busy = useGame((s) => s.busy)
  const act = useGame((s) => s.act)
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
      <p className="action-hint">Nach jedem Zug erklärt dir die App, ob er richtig war – und warum.</p>
    </div>
  )
}

function DealerPanel() {
  const snap = useGame((s) => s.snap)
  const d = handValue(snap.dealer.length ? snap.dealer : [])
  return (
    <div className="controls">
      <p className="action-hint">Dealer deckt auf und zieht nach Regeln (zieht bis 17, auch auf Soft 17)…{snap.dealer.length && !snap.holeHidden ? ` Aktuell: ${d.total}` : ''}</p>
    </div>
  )
}

export function GameScreen() {
  const snap = useGame((s) => s.snap)
  const feedback = useGame((s) => s.feedback)
  const busy = useGame((s) => s.busy)

  let panel: React.ReactNode
  if (snap.phase === 'betting' || snap.phase === 'settled') panel = <BetPanel />
  else if (snap.phase === 'insurance') panel = <InsurancePanel />
  else if (snap.phase === 'player') panel = <ActionsPanel />
  else panel = <DealerPanel />

  return (
    <div className="screen game-screen" aria-busy={busy}>
      <div className="table">
        <DealerZone />
        <CenterInfo />
        <PlayerZone />
      </div>
      {!feedback && panel}
      {feedback && <div className="controls" style={{ opacity: 0.5 }} aria-hidden />}
    </div>
  )
}
