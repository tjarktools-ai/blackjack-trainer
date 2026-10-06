import { create } from 'zustand'
import { Game, type Evaluation, type RoundSnapshot } from '../engine/round'
import { CHIP_VALUES, MAX_BET, MIN_BET } from '../engine/rules'
import type { Action } from '../engine/types'
import { briefExplanation, type Brief } from '../explain/brief'
import { explain } from '../explain/explain'
import { play } from '../ui/sound'
import { canDoubleBet, canHalveBet, doubledBet, halvedBet } from './betMath'
import { useSettings } from './settingsStore'
import { loadJson, saveJson } from './storage'

/**
 * Spaß-Modus: 100 % realistischer Tisch mit selbst gewähltem Budget.
 * Das Spiel wird nie unterbrochen – Hinweise erscheinen klein in einer Leiste.
 * Eigener Zustand, zählt nicht für den Lernfortschritt.
 */
const SAVE_KEY = 'bj-trainer-fun-v1'

export type HintMode = 'short' | 'off'
export type FunPhase = 'setup' | 'play' | 'summary'

export interface FunSession {
  startBudget: number
  rounds: number
  decisions: number
  optimal: number
  peak: number
  low: number
  startedAt: number
}

export interface FunSummary extends FunSession {
  endBalance: number
  endedAt: number
}

interface Saved {
  phase: FunPhase
  balance: number
  lastBet: number
  session: FunSession | null
  summary: FunSummary | null
  hintMode: HintMode
}

const saved = loadJson<Saved>(SAVE_KEY, { phase: 'setup', balance: 0, lastBet: 25, session: null, summary: null, hintMode: 'short' })
const resumable = saved.phase === 'play' && saved.session !== null && Number.isFinite(saved.balance)

let game = new Game(resumable ? saved.balance : 0)
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const sound = (name: Parameters<typeof play>[0]) => play(name, useSettings.getState().sound)

export interface FunHint extends Brief {
  id: number
}

interface FunStore {
  phase: FunPhase
  session: FunSession | null
  summary: FunSummary | null
  hintMode: HintMode
  snap: RoundSnapshot
  bet: number
  lastBet: number
  busy: boolean
  hint: FunHint | null

  setHintMode: (m: HintMode) => void
  startSession: (budget: number) => void
  endSession: () => void
  newSession: () => void
  addBet: (amount: number) => void
  undoBet: () => void
  clearBet: () => void
  setBet: (amount: number) => void
  doubleBet: () => void
  halveBet: () => void
  deal: () => Promise<void>
  act: (action: Action) => void
  insurance: (take: boolean) => void
}

const betStack: number[] = []
let settledRecorded = false
let hintId = 0

/** Sinnvoller Start-Einsatz: etwa 2 % des Budgets, gerundet auf eine runde Zahl. */
export function defaultBet(budget: number): number {
  const target = budget / 50
  const nice = [500, 250, 100, 50, 25, 10, 5, 1]
  return nice.find((n) => n <= target) ?? 1
}

export const BUDGET_MIN = 10
export const BUDGET_MAX = 1_000_000

export const useFun = create<FunStore>((set, get) => {
  const refresh = (extra: Partial<FunStore> = {}) => set({ snap: game.snapshot(), ...extra })

  const persist = () => {
    const s = get()
    saveJson(SAVE_KEY, {
      phase: s.phase,
      balance: game.balance,
      lastBet: s.lastBet,
      session: s.session,
      summary: s.summary,
      hintMode: s.hintMode,
    } satisfies Saved)
  }

  const bumpSession = (patch: (s: FunSession) => FunSession) => {
    const cur = get().session
    if (cur) set({ session: patch(cur) })
  }

  const onSettled = () => {
    if (settledRecorded || game.phase !== 'settled') return
    settledRecorded = true
    const net = game.net
    bumpSession((s) => ({ ...s, rounds: s.rounds + 1, peak: Math.max(s.peak, game.balance), low: Math.min(s.low, game.balance) }))
    sound(net > 0 ? 'win' : net < 0 ? 'lose' : 'chip')
    // Einsatz an das Restbudget anpassen (kein Einsatz mehr möglich → Budget aufgebraucht)
    const bet = get().bet
    if (bet > game.balance) {
      betStack.length = 0
      set({ bet: game.balance >= MIN_BET ? Math.floor(game.balance) : 0 })
    }
    refresh()
    persist()
  }

  const runDealer = async () => {
    set({ busy: true })
    for (let guard = 0; guard < 30; guard++) {
      await sleep(600)
      const step = game.dealerStep()
      if (step === 'drew') sound('card')
      refresh()
      if (step === 'done') break
    }
    set({ busy: false })
    onSettled()
  }

  const showHint = (evaluation: Evaluation) => {
    const stats = (s: FunSession): FunSession => ({
      ...s,
      decisions: s.decisions + 1,
      optimal: s.optimal + (evaluation.correct ? 1 : 0),
    })
    bumpSession(stats)
    if (get().hintMode === 'short') set({ hint: { ...briefExplanation(explain(evaluation)), id: ++hintId } })
  }

  return {
    phase: resumable ? 'play' : saved.summary && saved.phase === 'summary' ? 'summary' : 'setup',
    session: resumable ? saved.session : null,
    summary: saved.summary,
    hintMode: saved.hintMode ?? 'short',
    snap: game.snapshot(),
    bet: resumable ? Math.min(saved.lastBet, Math.floor(saved.balance)) : 0,
    lastBet: saved.lastBet,
    busy: false,
    hint: null,

    setHintMode: (m) => {
      set({ hintMode: m, hint: m === 'off' ? null : get().hint })
      persist()
    },

    startSession: (budget) => {
      const b = Math.round(budget)
      if (!Number.isFinite(b) || b < BUDGET_MIN || b > BUDGET_MAX) return
      game = new Game(b)
      betStack.length = 0
      settledRecorded = false
      const bet = Math.min(defaultBet(b), b)
      set({
        phase: 'play',
        session: { startBudget: b, rounds: 0, decisions: 0, optimal: 0, peak: b, low: b, startedAt: Date.now() },
        summary: null,
        hint: null,
        busy: false,
        bet,
        lastBet: bet,
      })
      refresh()
      persist()
    },

    endSession: () => {
      const s = get().session
      if (!s) return
      const summary: FunSummary = { ...s, endBalance: game.balance, endedAt: Date.now() }
      set({ phase: 'summary', summary, session: null, hint: null, busy: false })
      persist()
    },

    newSession: () => {
      set({ phase: 'setup' })
      persist()
    },

    addBet: (amount) => {
      const { bet, snap } = get()
      if (snap.phase !== 'betting' && snap.phase !== 'settled') return
      const next = bet + amount
      if (next > Math.min(MAX_BET, game.balance)) return
      betStack.push(amount)
      sound('chip')
      set({ bet: next })
    },
    undoBet: () => {
      const last = betStack.pop()
      if (last === undefined) {
        set({ bet: 0 })
        return
      }
      set((s) => ({ bet: Math.max(0, s.bet - last) }))
    },
    clearBet: () => {
      betStack.length = 0
      set({ bet: 0 })
    },
    setBet: (amount) => {
      betStack.length = 0
      const v = Math.max(0, Math.min(Math.floor(amount), MAX_BET, Math.floor(game.balance)))
      let rest = v
      for (const chip of [...CHIP_VALUES].reverse()) {
        while (rest >= chip) {
          betStack.push(chip)
          rest -= chip
        }
      }
      set({ bet: v })
    },
    doubleBet: () => {
      const { bet, snap } = get()
      if (snap.phase !== 'betting' && snap.phase !== 'settled') return
      if (!canDoubleBet(bet, game.balance)) return
      sound('chip')
      get().setBet(doubledBet(bet, game.balance))
    },
    halveBet: () => {
      const { bet, snap } = get()
      if (snap.phase !== 'betting' && snap.phase !== 'settled') return
      if (!canHalveBet(bet)) return
      sound('chip')
      get().setBet(halvedBet(bet))
    },

    deal: async () => {
      const { bet, busy, snap } = get()
      if (busy) return
      if (snap.phase !== 'betting' && snap.phase !== 'settled') return
      if (bet < MIN_BET || bet > game.balance) return
      settledRecorded = false
      if (!game.deal(bet)) return // immer realistisch: kein Lern-Deal
      for (let i = 0; i < 4; i++) setTimeout(() => sound('card'), i * 160)
      refresh({ lastBet: bet, busy: true, hint: null })
      persist()
      await sleep(900)
      set({ busy: false })
      onSettled()
    },

    act: (action) => {
      if (get().busy) return
      const evaluation = game.act(action)
      if (!evaluation) return
      if (action === 'hit' || action === 'double' || action === 'split') sound('card')
      showHint(evaluation)
      refresh()
      persist()
      if (game.phase === 'dealer') void runDealer()
    },

    insurance: (take) => {
      if (get().busy) return
      const evaluation = game.decideInsurance(take)
      if (!evaluation) return
      showHint(evaluation)
      refresh()
      persist()
      onSettled()
    },
  }
})
