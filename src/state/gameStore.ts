import { create } from 'zustand'
import { Game, type Evaluation, type RoundSnapshot } from '../engine/round'
import { CHIP_VALUES, MAX_BET, MIN_BET, START_BALANCE } from '../engine/rules'
import { randomInt } from '../engine/shoe'
import type { Action } from '../engine/types'
import { explain, type Explanation } from '../explain/explain'
import { PRINCIPLES, type PrincipleId } from '../explain/principles'
import { play } from '../ui/sound'
import { pickLearningDeal } from './learnDeal'
import { useSettings } from './settingsStore'
import { loadJson, saveJson } from './storage'
import { useStats } from './statsStore'

const SAVE_KEY = 'bj-trainer-game-v1'
interface Saved {
  balance: number
  lastBet: number
}
const saved = loadJson<Saved>(SAVE_KEY, { balance: START_BALANCE, lastBet: 25 })
const startBalance = Number.isFinite(saved.balance) && saved.balance >= 0 ? saved.balance : START_BALANCE

const game = new Game(startBalance)

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const sound = (name: Parameters<typeof play>[0]) => play(name, useSettings.getState().sound)

export interface QuizState {
  principle: PrincipleId
  question: string
  options: { text: string; correct: boolean }[]
  answered: number | null
}

export interface Feedback {
  evaluation: Evaluation
  explanation: Explanation
  quiz: QuizState | null
}

interface GameStore {
  snap: RoundSnapshot
  bet: number
  lastBet: number
  feedback: Feedback | null
  busy: boolean
  /** Hinweis-Toast (z. B. „Schuh gemischt“) */
  toast: string | null

  addBet: (amount: number) => void
  clearBet: () => void
  undoBet: () => void
  setBet: (amount: number) => void
  deal: () => Promise<void>
  act: (action: Action) => void
  insurance: (take: boolean) => void
  dismissFeedback: () => Promise<void>
  answerQuiz: (index: number) => void
  newBankroll: () => void
}

let settledRecorded = false
const betStack: number[] = []

function persist(balance: number, lastBet: number) {
  saveJson(SAVE_KEY, { balance, lastBet })
}

function makeQuiz(principle: PrincipleId): QuizState {
  const def = PRINCIPLES[principle].quiz
  const options = [
    { text: def.right, correct: true },
    { text: def.wrong[0], correct: false },
    { text: def.wrong[1], correct: false },
  ]
  // mischen (Fisher-Yates)
  for (let i = options.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { principle, question: def.question, options, answered: null }
}

function shouldAskQuiz(): boolean {
  const f = useSettings.getState().quiz
  if (f === 'off') return false
  if (f === 'always') return true
  return randomInt(100) < 35
}

// Nur im Entwicklungsmodus: Zugriff für Browser-Tests (z. B. feste Kartenreihenfolge).
if (import.meta.env.DEV) {
  ;(window as unknown as { __bj: unknown }).__bj = { game }
}

export const useGame = create<GameStore>((set, get) => {
  const refresh = (extra: Partial<GameStore> = {}) => set({ snap: game.snapshot(), ...extra })

  const showToast = (message: string) => {
    set({ toast: message })
    setTimeout(() => {
      if (get().toast === message) set({ toast: null })
    }, 2600)
  }

  const onSettled = () => {
    if (settledRecorded || game.phase !== 'settled') return
    settledRecorded = true
    const net = game.net
    useStats.getState().recordRound(net, game.balance)
    sound(net > 0 ? 'win' : net < 0 ? 'lose' : 'chip')
    persist(game.balance, get().lastBet)
    // Einsatz ans Restguthaben anpassen (sonst bleibt ein nicht mehr setzbarer Betrag stehen)
    if (get().bet > game.balance) {
      betStack.length = 0
      set({ bet: game.balance >= MIN_BET ? Math.floor(game.balance) : 0 })
    }
    refresh()
  }

  const runDealer = async () => {
    set({ busy: true })
    for (let guard = 0; guard < 30; guard++) {
      await sleep(650)
      const step = game.dealerStep()
      if (step === 'drew') sound('card')
      refresh()
      if (step === 'done') break
    }
    set({ busy: false })
    onSettled()
  }

  const presentFeedback = (evaluation: Evaluation) => {
    const explanation = explain(evaluation)
    const stats = useStats.getState()
    if (evaluation.kind === 'play') {
      stats.recordDecision({
        cell: evaluation.recommendation.cell,
        chosen: evaluation.chosen,
        recommended: evaluation.recommendation.action,
        correct: evaluation.correct,
      })
    } else {
      stats.recordInsurance(evaluation.correct)
    }
    sound(evaluation.correct ? 'correct' : 'wrong')
    const quiz = shouldAskQuiz() ? makeQuiz(explanation.principle) : null
    refresh({ feedback: { evaluation, explanation, quiz } })
  }

  return {
    snap: game.snapshot(),
    bet: Math.min(saved.lastBet, startBalance),
    lastBet: saved.lastBet,
    feedback: null,
    busy: false,
    toast: null,

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
        set({ bet: 0 }) // voreingestellter Einsatz (ohne Chip-Stapel) → komplett zurücksetzen
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
      const v = Math.max(0, Math.min(amount, MAX_BET, game.balance))
      // Stapel aus Chips nachbauen, damit „Zurück“ weiter funktioniert
      let rest = v
      for (const chip of [...CHIP_VALUES].reverse()) {
        while (rest >= chip) {
          betStack.push(chip)
          rest -= chip
        }
      }
      set({ bet: v })
    },

    deal: async () => {
      const { bet, busy, snap } = get()
      if (busy || get().feedback) return
      if (snap.phase !== 'betting' && snap.phase !== 'settled') return
      if (bet < MIN_BET || bet > game.balance) return
      const settings = useSettings.getState()
      const forced = settings.dealMode !== 'realistic' ? pickLearningDeal(useStats.getState().cells, settings.dealMode) : undefined
      settledRecorded = false
      if (!game.deal(bet, forced)) return
      for (let i = 0; i < 4; i++) setTimeout(() => sound('card'), i * 160)
      refresh({ lastBet: bet, busy: true })
      persist(game.balance, bet)
      if (game.snapshot().shuffled) showToast('Der Schuh wurde neu gemischt (Cut Card erreicht).')
      await sleep(900)
      set({ busy: false })
      onSettled()
    },

    act: (action) => {
      const { busy, feedback } = get()
      if (busy || feedback) return
      const evaluation = game.act(action)
      if (!evaluation) return
      if (action === 'hit' || action === 'double' || action === 'split') sound('card')
      persist(game.balance, get().lastBet)
      presentFeedback(evaluation)
    },

    insurance: (take) => {
      const { busy, feedback } = get()
      if (busy || feedback) return
      const evaluation = game.decideInsurance(take)
      if (!evaluation) return
      persist(game.balance, get().lastBet)
      presentFeedback(evaluation)
    },

    dismissFeedback: async () => {
      const fb = get().feedback
      if (!fb) return
      // Beantwortetes/ignoriertes Quiz zählt nur, wenn beantwortet (siehe answerQuiz)
      set({ feedback: null })
      refresh()
      if (game.phase === 'dealer') await runDealer()
      else onSettled()
    },

    answerQuiz: (index) => {
      const fb = get().feedback
      if (!fb?.quiz || fb.quiz.answered !== null) return
      const correct = fb.quiz.options[index].correct
      useStats.getState().recordQuiz(fb.quiz.principle, correct)
      sound(correct ? 'correct' : 'wrong')
      set({ feedback: { ...fb, quiz: { ...fb.quiz, answered: index } } })
    },

    newBankroll: () => {
      game.setBalance(START_BALANCE)
      betStack.length = 0
      persist(START_BALANCE, get().lastBet)
      refresh({ bet: Math.min(get().lastBet, START_BALANCE) })
    },
  }
})
