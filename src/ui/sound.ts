/** Kleine synthetische Sounds (kein Download nötig, funktioniert offline). Erst nach einer Nutzer-Geste hörbar. */
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, c: AudioContext): void {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, c.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  osc.connect(g).connect(c.destination)
  osc.start(c.currentTime + start)
  osc.stop(c.currentTime + start + dur + 0.02)
}

export type SoundName = 'chip' | 'card' | 'correct' | 'wrong' | 'win' | 'lose'

export function play(name: SoundName, enabled: boolean): void {
  if (!enabled) return
  const c = audio()
  if (!c) return
  switch (name) {
    case 'chip':
      tone(1200, 0, 0.05, 'square', 0.04, c)
      tone(800, 0.03, 0.06, 'square', 0.03, c)
      break
    case 'card':
      tone(300, 0, 0.06, 'triangle', 0.05, c)
      break
    case 'correct':
      tone(660, 0, 0.12, 'sine', 0.12, c)
      tone(880, 0.1, 0.18, 'sine', 0.12, c)
      break
    case 'wrong':
      tone(220, 0, 0.2, 'sawtooth', 0.07, c)
      tone(165, 0.12, 0.25, 'sawtooth', 0.07, c)
      break
    case 'win':
      tone(523, 0, 0.12, 'sine', 0.1, c)
      tone(659, 0.1, 0.12, 'sine', 0.1, c)
      tone(784, 0.2, 0.25, 'sine', 0.1, c)
      break
    case 'lose':
      tone(262, 0, 0.25, 'triangle', 0.08, c)
      break
  }
}
