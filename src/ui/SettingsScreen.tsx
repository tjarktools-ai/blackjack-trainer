import { useState } from 'react'
import { START_BALANCE } from '../engine/rules'
import { useGame } from '../state/gameStore'
import { useSettings, type DealMode, type QuizFrequency } from '../state/settingsStore'
import { useStats } from '../state/statsStore'
import { fmtMoney } from './cardUtils'

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="toggle-row">
      <div className="t">
        <b>{label}</b>
        <small>{hint}</small>
      </div>
      <button className={`switch${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
    </div>
  )
}

export function SettingsScreen() {
  const { sound, dealMode, quiz, set } = useSettings()
  const newBankroll = useGame((s) => s.newBankroll)
  const exportJson = useStats((s) => s.exportJson)
  const importJson = useStats((s) => s.importJson)
  const reset = useStats((s) => s.reset)
  const [backup, setBackup] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const note = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 3500)
  }

  const doExport = async () => {
    const json = exportJson()
    setBackup(json)
    try {
      await navigator.clipboard.writeText(json)
      note('Backup in die Zwischenablage kopiert.')
    } catch {
      note('Kopieren nicht möglich – markiere den Text unten und kopiere ihn manuell.')
    }
  }

  return (
    <div className="screen">
      <div className="stack">
        <h1 className="title">Einstellungen</h1>

        <div className="card-panel">
          <Toggle on={sound} onChange={(v) => set('sound', v)} label="Sound" hint="Chips, Karten und Richtig/Falsch-Töne." />
          <div className="toggle-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="t">
              <b>Austeil-Modus</b>
              <small>
                Realistisch = Karten wie am echten Tisch. Lern-Deal = bevorzugt Felder, die du noch nicht sicher kannst. Schwer = nur knappe, schwierige Entscheidungen (z. B. Soft 18 gegen 2, 12 gegen 4, 16 gegen 10). Lern-Deal und Schwer sind bewusst nicht realistisch, dafür lernst du schneller.
              </small>
            </div>
            <div className="seg" style={{ marginTop: 8 }}>
              {([['realistic', 'Realistisch'], ['learn', 'Lern-Deal'], ['hard', 'Schwer']] as [DealMode, string][]).map(([v, l]) => (
                <button key={v} className={dealMode === v ? 'on' : ''} onClick={() => set('dealMode', v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="toggle-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="t">
              <b>„Warum?“-Quiz</b>
              <small>Nach deinem Zug fragt dich die App, ob du den Grund verstehst.</small>
            </div>
            <div className="seg" style={{ marginTop: 8 }}>
              {([['off', 'Aus'], ['sometimes', 'Manchmal'], ['always', 'Immer']] as [QuizFrequency, string][]).map(([v, l]) => (
                <button key={v} className={quiz === v ? 'on' : ''} onClick={() => set('quiz', v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-panel stack">
          <h3 style={{ fontSize: 16 }}>Tischregeln (fest)</h3>
          <ul className="plain">
            <li>6 Decks, Schuh wird bei ca. 75 % neu gemischt (Cut Card)</li>
            <li>Dealer zieht auf Soft 17 (H17), prüft bei Zehner/Ass auf Blackjack</li>
            <li>Blackjack zahlt 3:2 · Insurance zahlt 2:1</li>
            <li>Double auf jede 2-Karten-Hand, auch nach Split (DAS)</li>
            <li>Split bis zu 4 Hände · Asse: nur eine Karte, kein Resplit</li>
            <li>Late Surrender nur als erste Entscheidung</li>
            <li>Chips: 1 · 5 · 25 · 100, dazu ½ und ×2 für den Einsatz · Einsatz {fmtMoney(1)}–{fmtMoney(5000)}</li>
          </ul>
          <p className="caption">
            Die Strategie folgt exakt deiner Tabelle. Die Zahlen („Erwartungswert“) sind mit einem exakten Rechenmodell für genau diese Regeln berechnet; eine Simulation mit 30 Mio. Runden ergab einen Hausvorteil von 0,56 % (± 0,04 %) bei perfekter Strategie – wie am echten Tisch.
          </p>
        </div>

        <div className="card-panel stack">
          <h3 style={{ fontSize: 16 }}>Als App aufs iPhone</h3>
          <p className="sub">
            Öffne die Seite in <b>Safari</b> → Teilen-Symbol → <b>„Zum Home-Bildschirm“</b>. Danach startet sie wie eine App, ohne Adresszeile, und läuft auch offline.
          </p>
        </div>

        <div className="card-panel stack">
          <h3 style={{ fontSize: 16 }}>Daten</h3>
          <p className="sub">Alles bleibt lokal auf diesem Gerät. Mit einem Backup kannst du deinen Fortschritt sichern oder auf ein anderes Gerät übertragen.</p>
          <div className="btn-row">
            <button className="btn" onClick={() => void doExport()}>
              Backup erstellen
            </button>
            <button
              className="btn"
              onClick={() => {
                if (importJson(backup)) note('Backup eingespielt.')
                else note('Das ist kein gültiges Backup.')
              }}
              disabled={!backup.trim()}
            >
              Backup einspielen
            </button>
          </div>
          <textarea
            className="field"
            placeholder="Backup-Text hier einfügen, um ihn einzuspielen …"
            value={backup}
            onChange={(e) => setBackup(e.target.value)}
          />
          {msg && <p className="caption" style={{ color: 'var(--green)' }}>{msg}</p>}
          <div className="btn-row">
            <button
              className="btn"
              onClick={() => {
                newBankroll()
                note(`Guthaben auf ${fmtMoney(START_BALANCE)} zurückgesetzt.`)
              }}
            >
              Guthaben zurücksetzen
            </button>
            <button
              className="btn danger"
              onClick={() => {
                if (window.confirm('Wirklich den gesamten Lernfortschritt löschen?')) {
                  reset()
                  note('Fortschritt gelöscht.')
                }
              }}
            >
              Fortschritt löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
