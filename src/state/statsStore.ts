import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { CELL_KEYS } from '../engine/cells'
import { cellKey, type Action, type CellRef } from '../engine/types'
import type { PrincipleId } from '../explain/principles'
import { safeStorage } from './storage'

export interface CellStat {
  attempts: number
  correct: number
  /** Die letzten bis zu 5 Ergebnisse: '1' = richtig, '0' = falsch (neueste zuletzt). */
  recent: string
  last: number
}

export type CellStatus = 'unseen' | 'learning' | 'weak' | 'mastered'

/** Gemeistert = mindestens 3 Versuche und die letzten 3 richtig. Schwach = in den letzten 3 ein Fehler. */
export function cellStatus(s?: CellStat): CellStatus {
  if (!s || s.attempts === 0) return 'unseen'
  if (s.recent.slice(-3).includes('0')) return 'weak'
  if (s.attempts >= 3 && s.recent.endsWith('111')) return 'mastered'
  return 'learning'
}

export interface DecisionLog {
  t: number
  key: string
  chosen: Action | 'insurance' | 'decline'
  recommended: Action | 'decline'
  correct: boolean
}

interface PrincipleStat {
  asked: number
  correct: number
}

export interface StatsData {
  cells: Record<string, CellStat>
  log: DecisionLog[]
  decisions: number
  correct: number
  streak: number
  bestStreak: number
  insurance: { offered: number; correct: number }
  rounds: number
  netTotal: number
  /** Guthaben nach jeder Runde (letzte 300) */
  balanceHistory: number[]
  quiz: { asked: number; correct: number; byPrinciple: Partial<Record<PrincipleId, PrincipleStat>> }
  since: number
}

const empty = (): StatsData => ({
  cells: {},
  log: [],
  decisions: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  insurance: { offered: 0, correct: 0 },
  rounds: 0,
  netTotal: 0,
  balanceHistory: [],
  quiz: { asked: 0, correct: 0, byPrinciple: {} },
  since: Date.now(),
})

interface StatsState extends StatsData {
  recordDecision: (d: { cell: CellRef; chosen: Action; recommended: Action; correct: boolean }) => void
  recordInsurance: (correct: boolean) => void
  recordRound: (net: number, balance: number) => void
  recordQuiz: (principle: PrincipleId, correct: boolean) => void
  reset: () => void
  exportJson: () => string
  importJson: (json: string) => boolean
}

export const useStats = create<StatsState>()(
  persist(
    (set, get) => ({
      ...empty(),

      recordDecision: ({ cell, chosen, recommended, correct }) =>
        set((s) => {
          const key = cellKey(cell)
          const prev = s.cells[key] ?? { attempts: 0, correct: 0, recent: '', last: 0 }
          const next: CellStat = {
            attempts: prev.attempts + 1,
            correct: prev.correct + (correct ? 1 : 0),
            recent: (prev.recent + (correct ? '1' : '0')).slice(-5),
            last: Date.now(),
          }
          const streak = correct ? s.streak + 1 : 0
          const log = [...s.log, { t: Date.now(), key, chosen, recommended, correct }].slice(-400)
          return {
            cells: { ...s.cells, [key]: next },
            log,
            decisions: s.decisions + 1,
            correct: s.correct + (correct ? 1 : 0),
            streak,
            bestStreak: Math.max(s.bestStreak, streak),
          }
        }),

      recordInsurance: (correct) =>
        set((s) => {
          const streak = correct ? s.streak + 1 : 0
          return {
            insurance: { offered: s.insurance.offered + 1, correct: s.insurance.correct + (correct ? 1 : 0) },
            decisions: s.decisions + 1,
            correct: s.correct + (correct ? 1 : 0),
            streak,
            bestStreak: Math.max(s.bestStreak, streak),
            log: [
              ...s.log,
              {
                t: Date.now(),
                key: 'insurance',
                chosen: (correct ? 'decline' : 'insurance') as DecisionLog['chosen'],
                recommended: 'decline' as const,
                correct,
              },
            ].slice(-400),
          }
        }),

      recordRound: (net, balance) =>
        set((s) => ({
          rounds: s.rounds + 1,
          netTotal: s.netTotal + net,
          balanceHistory: [...s.balanceHistory, balance].slice(-300),
        })),

      recordQuiz: (principle, correct) =>
        set((s) => {
          const prev = s.quiz.byPrinciple[principle] ?? { asked: 0, correct: 0 }
          return {
            quiz: {
              asked: s.quiz.asked + 1,
              correct: s.quiz.correct + (correct ? 1 : 0),
              byPrinciple: {
                ...s.quiz.byPrinciple,
                [principle]: { asked: prev.asked + 1, correct: prev.correct + (correct ? 1 : 0) },
              },
            },
          }
        }),

      reset: () => set({ ...empty() }),

      exportJson: () => {
        const { cells, log, decisions, correct, streak, bestStreak, insurance, rounds, netTotal, balanceHistory, quiz, since } = get()
        return JSON.stringify({ app: 'bj-trainer', version: 1, data: { cells, log, decisions, correct, streak, bestStreak, insurance, rounds, netTotal, balanceHistory, quiz, since } })
      },

      importJson: (json) => {
        try {
          const parsed = JSON.parse(json) as { app?: string; data?: StatsData }
          if (parsed.app !== 'bj-trainer' || !parsed.data || typeof parsed.data.decisions !== 'number') return false
          set({ ...empty(), ...parsed.data })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'bj-trainer-stats-v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        cells: s.cells,
        log: s.log,
        decisions: s.decisions,
        correct: s.correct,
        streak: s.streak,
        bestStreak: s.bestStreak,
        insurance: s.insurance,
        rounds: s.rounds,
        netTotal: s.netTotal,
        balanceHistory: s.balanceHistory,
        quiz: s.quiz,
        since: s.since,
      }),
    },
  ),
)

// ---------------------------------------------------------------------------
// Auswertungen

export interface Progress {
  /** Anteil der gemeisterten Tabellenfelder (0–1) */
  mastery: number
  masteredCount: number
  totalCells: number
  seenCount: number
  weakCount: number
  /** Trefferquote der letzten 100 Entscheidungen */
  recentAccuracy: number | null
  accuracy: number | null
}

export function computeProgress(s: StatsData, cellKeys: string[] = [...CELL_KEYS]): Progress {
  let mastered = 0
  let seen = 0
  let weak = 0
  for (const key of cellKeys) {
    const st = cellStatus(s.cells[key])
    if (st !== 'unseen') seen++
    if (st === 'mastered') mastered++
    if (st === 'weak') weak++
  }
  const recent = s.log.slice(-100)
  return {
    mastery: cellKeys.length ? mastered / cellKeys.length : 0,
    masteredCount: mastered,
    totalCells: cellKeys.length,
    seenCount: seen,
    weakCount: weak,
    recentAccuracy: recent.length ? recent.filter((d) => d.correct).length / recent.length : null,
    accuracy: s.decisions ? s.correct / s.decisions : null,
  }
}
