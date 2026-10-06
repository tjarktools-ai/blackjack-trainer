import { useState } from 'react'
import { FeedbackSheet } from './ui/FeedbackSheet'
import { fmtMoney } from './ui/cardUtils'
import { GameScreen } from './ui/GameScreen'
import { LearnScreen } from './ui/LearnScreen'
import { ProgressScreen } from './ui/ProgressScreen'
import { SettingsScreen } from './ui/SettingsScreen'
import { useGame } from './state/gameStore'

type Tab = 'play' | 'learn' | 'progress' | 'settings'

const ICONS: Record<Tab, React.ReactNode> = {
  play: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="11" height="16" rx="2" />
      <path d="M9 21h8a3 3 0 0 0 3-3V8" />
      <path d="M9.5 9.5l1.5 2.5-1.5 2.5" opacity="0" />
      <path d="M9.5 8.5c0 1.6-2 2.4-2 4a2 2 0 0 0 4 0c0-1.6-2-2.4-2-4z" fill="currentColor" stroke="none" />
    </svg>
  ),
  learn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 21.5V5.5" />
      <path d="M9 8h7M9 12h5" />
    </svg>
  ),
  progress: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
}

const LABEL: Record<Tab, string> = { play: 'Spielen', learn: 'Lernen', progress: 'Fortschritt', settings: 'Einstellungen' }

export default function App() {
  const [tab, setTab] = useState<Tab>('play')
  const balance = useGame((s) => s.snap.balance)
  const toast = useGame((s) => s.toast)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">♠</span>
          BJ Trainer
        </div>
        <div className="balance">
          <small>Spielgeld</small>
          <b>{fmtMoney(balance)}</b>
        </div>
      </header>

      {toast && <div className="toast">{toast}</div>}

      {tab === 'play' && <GameScreen />}
      {tab === 'learn' && <LearnScreen />}
      {tab === 'progress' && <ProgressScreen />}
      {tab === 'settings' && <SettingsScreen />}

      <FeedbackSheet />

      <nav className="nav" aria-label="Hauptnavigation">
        {(Object.keys(ICONS) as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}>
            {ICONS[t]}
            {LABEL[t]}
          </button>
        ))}
      </nav>
    </div>
  )
}
