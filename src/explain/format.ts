import { handValue } from '../engine/hand'
import type { Action, Card, Rank, Upcard } from '../engine/types'

export const P_TEN = 4 / 13

/** 0,31 → "31 %" */
export function pct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits).replace('.', ',')} %`
}

/** EV mit Vorzeichen und deutschem Komma: +0,123 / −0,541 */
export function fmtEv(x: number): string {
  const s = Math.abs(x).toFixed(3).replace('.', ',')
  return `${x < 0 ? '−' : '+'}${s}`
}

/** EV-Differenz als „pro 100 Einsatz“ */
export function per100(x: number): string {
  const v = Math.abs(x * 100)
  return `${v.toFixed(v >= 10 ? 0 : 1).replace('.', ',')} pro 100 gesetzte Einheiten`
}

/** Wahrscheinlichkeit, mit der die nächste Karte (unendlich viele Decks) bustet. */
export function bustOnHit(total: number, soft: boolean): number {
  if (soft) return 0
  const safe = 21 - total // Karten bis zu diesem Wert sind sicher
  let p = 0
  for (let v = 1; v <= 10; v++) {
    if (v > safe) p += v === 10 ? P_TEN : 1 / 13
  }
  return Math.min(1, p)
}

export function rankLabel(r: Rank): string {
  return r === 'T' ? '10' : r
}

export function upLabel(u: Upcard): string {
  return u === 'T' ? '10' : u === 'A' ? 'Ass' : u
}

export function dealerStrength(u: Upcard): 'schwach' | 'mittel' | 'stark' {
  if (u === '2' || u === '3' || u === '4' || u === '5' || u === '6') return 'schwach'
  if (u === '7' || u === '8') return 'mittel'
  return 'stark'
}

export const ACTION_DE: Record<Action, string> = {
  hit: 'Hit (Karte ziehen)',
  stand: 'Stand (stehen)',
  double: 'Double (verdoppeln)',
  split: 'Split (teilen)',
  surrender: 'Surrender (aufgeben)',
}

export function actionName(a: Action): string {
  return a === 'hit' ? 'Hit' : a === 'stand' ? 'Stand' : a === 'double' ? 'Double' : a === 'split' ? 'Split' : 'Surrender'
}

/** „Hard 16 (10+6)“, „Soft 18 (A+7)“, „Paar 8,8“ */
export function describeHand(cards: readonly Card[]): string {
  const { total, soft } = handValue(cards)
  const faces = cards.map((c) => rankLabel(c.rank)).join('+')
  if (cards.length === 2 && cards[0].rank === cards[1].rank) {
    const r = rankLabel(cards[0].rank)
    return `Paar ${r},${r} (${total}${soft ? ' soft' : ''})`
  }
  return `${soft ? 'Soft' : 'Hard'} ${total} (${faces})`
}
