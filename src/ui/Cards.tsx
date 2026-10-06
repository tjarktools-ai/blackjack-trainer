import type { Card, Suit } from '../engine/types'
import { rankLabel } from '../explain/format'

const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }

export function CardView({ card, delay = 0, flip = false }: { card: Card; delay?: number; flip?: boolean }) {
  const red = card.suit === 'H' || card.suit === 'D'
  return (
    <div className={`card${red ? ' red' : ''}${flip ? ' flip' : ''}`} style={{ ['--delay' as string]: `${delay}ms` }}>
      <div className="corner">
        {rankLabel(card.rank)}
        <i>{SUIT_SYMBOL[card.suit]}</i>
      </div>
      <div className="pip">{SUIT_SYMBOL[card.suit]}</div>
    </div>
  )
}

export function CardBack({ delay = 0 }: { delay?: number }) {
  return <div className="card back" style={{ ['--delay' as string]: `${delay}ms` }} />
}
