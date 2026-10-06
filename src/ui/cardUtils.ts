import { handValue, isTwoCard21 } from '../engine/hand'
import type { PlayerHand } from '../engine/round'
import type { Card } from '../engine/types'

export const fmtMoney = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
export const fmtSigned = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtMoney(Math.abs(n))}`

/** Text für das Total-Badge: "17", "8 / 18" bei Soft, "Bust", "Blackjack". */
export function totalLabel(cards: readonly Card[], fromSplit = false): { text: string; kind: '' | 'bust' | 'good' } {
  const { total, soft } = handValue(cards)
  if (total > 21) return { text: `${total} Bust`, kind: 'bust' }
  if (!fromSplit && isTwoCard21(cards)) return { text: 'Blackjack', kind: 'good' }
  if (soft && total < 21) return { text: `${total - 10} / ${total}`, kind: '' }
  return { text: String(total), kind: total === 21 ? 'good' : '' }
}

export function resultTag(hand: PlayerHand): { text: string; kind: 'win' | 'lose' | 'push' } | null {
  if (hand.payout === undefined || !hand.result) return null
  const net = hand.payout - hand.bet
  switch (hand.result) {
    case 'blackjack':
      return { text: `Blackjack ${fmtSigned(net)}`, kind: 'win' }
    case 'win':
      return { text: `Gewonnen ${fmtSigned(net)}`, kind: 'win' }
    case 'push':
      return { text: 'Push', kind: 'push' }
    case 'surrender':
      return { text: `Aufgegeben ${fmtSigned(net)}`, kind: 'lose' }
    default:
      return { text: `Verloren ${fmtSigned(net)}`, kind: 'lose' }
  }
}
