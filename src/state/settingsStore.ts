import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeStorage } from './storage'

export type QuizFrequency = 'off' | 'sometimes' | 'always'

/**
 * Wie Hände ausgeteilt werden:
 * - realistic: ganz normal aus dem gemischten Schuh
 * - learn: bevorzugt Felder, die du noch nicht sicher kannst
 * - hard: nur schwierige Felder (knappe Entscheidungen) – bewusst nicht realistisch
 */
export type DealMode = 'realistic' | 'learn' | 'hard'

interface SettingsState {
  sound: boolean
  dealMode: DealMode
  quiz: QuizFrequency
  set: <K extends keyof Omit<SettingsState, 'set'>>(key: K, value: SettingsState[K]) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      dealMode: 'realistic',
      quiz: 'sometimes',
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    {
      name: 'bj-trainer-settings-v1',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      // v1 kannte nur den Schalter „learnDeal“ (an/aus)
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<SettingsState> & { learnDeal?: boolean }
        if (version < 2) {
          const { learnDeal, ...rest } = old
          return { ...rest, dealMode: learnDeal ? 'learn' : 'realistic' } as SettingsState
        }
        return old as SettingsState
      },
    },
  ),
)
