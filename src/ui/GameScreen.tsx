import { START_BALANCE } from '../engine/rules'
import { useGame } from '../state/gameStore'
import { useSettings, type DealMode } from '../state/settingsStore'
import { fmtMoney } from './cardUtils'
import { ControlPanel, TableView } from './Table'

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

/** Training: nach jedem Zug blockiert ein Panel mit der ausführlichen Erklärung (siehe FeedbackSheet). */
export function GameScreen() {
  const ctl = useGame()
  const { feedback, busy, newBankroll } = ctl

  return (
    <div className="screen game-screen" aria-busy={busy}>
      <TableView ctl={ctl} centerExtra={<ModeSwitch />} />
      {feedback ? (
        <div className="controls" style={{ opacity: 0.5 }} aria-hidden />
      ) : (
        <ControlPanel
          ctl={ctl}
          broke={{ text: 'Dein Spielgeld ist aufgebraucht.', label: `Neues Guthaben (${fmtMoney(START_BALANCE)})`, run: newBankroll }}
          actionsHint={<p className="action-hint">Nach jedem Zug erklärt dir die App, ob er richtig war – und warum.</p>}
        />
      )}
    </div>
  )
}
