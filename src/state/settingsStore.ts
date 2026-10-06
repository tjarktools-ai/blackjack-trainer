import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeStorage } from './storage'

export type QuizFrequency = 'off' | 'sometimes' | 'always'

interface SettingsState {
  sound: boolean
  /** Optionaler Lern-Deal: verteilt gezielt Hände aus Feldern, die du noch nicht sicher kannst. */
  learnDeal: boolean
  quiz: QuizFrequency
  set: <K extends keyof Omit<SettingsState, 'set'>>(key: K, value: SettingsState[K]) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      learnDeal: false,
      quiz: 'sometimes',
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    { name: 'bj-trainer-settings-v1', storage: createJSONStorage(() => safeStorage) },
  ),
)
