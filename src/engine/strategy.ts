import { handValue, isPair, strategicRank } from './hand'
import {
  colIndex,
  HARD_TABLE,
  PAIR_TABLE,
  SOFT_TABLE,
  SURRENDER_TABLE,
  type HardRow,
  type PairRow,
  type SoftRow,
  type SurrenderRow,
} from './strategyTables'
import type { Action, Card, CellRef, Upcard } from './types'

/** Was in der Situation tatsächlich möglich ist. */
export interface Availability {
  canDouble: boolean
  canSplit: boolean
  canSurrender: boolean
}

export interface Recommendation {
  /** Der Zug, der jetzt zu spielen ist (berücksichtigt, was erlaubt ist). */
  action: Action
  /** Das Feld der Tabelle, das die Entscheidung bestimmt. */
  cell: CellRef
  /**
   * Bei Paaren mit „N“: das Hard-/Soft-Feld, nach dem die Hand stattdessen gespielt wird
   * (z. B. 5,5 → Hard 10). Für die Erklärung.
   */
  via?: CellRef
  /** Code wie in der Tabelle: Y, N, Y/N, H, S, D, Ds, SUR */
  code: string
  /**
   * true, wenn die Tabelle „Double“ vorsieht (D/Ds), Double aber nicht erlaubt ist
   * und deshalb auf Hit (D) bzw. Stand (Ds) zurückgefallen wird.
   */
  fallback: boolean
  /** Gesamtwert der Hand (für Anzeige/Erklärung). */
  total: number
  soft: boolean
}

function hardRowFor(total: number): HardRow {
  if (total >= 17) return '17'
  if (total <= 8) return '8'
  return String(total) as HardRow
}

/**
 * Liefert den Basic-Strategy-Zug für eine Hand.
 * Reihenfolge wie am Tisch: Split-Tabelle → Surrender-Tabelle → Soft-Tabelle → Hard-Tabelle.
 */
export function recommend(cards: readonly Card[], dealer: Upcard, avail: Availability): Recommendation {
  const { total, soft } = handValue(cards)
  const col = colIndex(dealer)

  // 1) Pairs
  if (isPair(cards) && avail.canSplit) {
    const r = strategicRank(cards[0].rank)
    const rowName = `${r},${r}` as PairRow
    const code = PAIR_TABLE[rowName][col]
    if (code === 'Y' || code === 'Y/N') {
      // Double After Split ist immer erlaubt → Y/N bedeutet hier „splitten“.
      return {
        action: 'split',
        cell: { category: 'pair', row: rowName, dealer },
        code,
        fallback: false,
        total,
        soft,
      }
    }
    // 'N' → Hand wie eine normale Hard-/Soft-Hand behandeln (z. B. 5,5 = Hard 10, 9,9 gegen 7 = Hard 18)
    // — aber der Pair-Eintrag bleibt das „Entscheidungsfeld“ für das Tracking.
    const rest = recommendNonPair(cards, dealer, avail, total, soft, col)
    return { ...rest, cell: { category: 'pair', row: rowName, dealer }, via: rest.cell, code: 'N' }
  }

  return recommendNonPair(cards, dealer, avail, total, soft, col)
}

function recommendNonPair(
  cards: readonly Card[],
  dealer: Upcard,
  avail: Availability,
  total: number,
  soft: boolean,
  col: number,
): Recommendation {
  // 2) Late Surrender (nur harte 15/16, erste Entscheidung, nicht nach Split)
  if (avail.canSurrender && !soft && cards.length === 2 && (total === 16 || total === 15 || total === 14)) {
    const surRow = String(total) as SurrenderRow
    if (SURRENDER_TABLE[surRow][col] === 'SUR') {
      return {
        action: 'surrender',
        cell: { category: 'surrender', row: surRow, dealer },
        code: 'SUR',
        fallback: false,
        total,
        soft,
      }
    }
  }

  // 3) Soft totals (Ass als 11): Soft 13 … Soft 20; Soft 21 = Stand
  if (soft) {
    if (total <= 12) {
      // Soft 12 = A,A, wenn Split nicht möglich ist (Hand-Limit/Guthaben): hitten.
      return { action: 'hit', cell: { category: 'pair', row: 'A,A', dealer }, code: 'N', fallback: false, total, soft }
    }
    if (total >= 21) {
      return {
        action: 'stand',
        cell: { category: 'soft', row: 'A,9', dealer },
        code: 'S',
        fallback: false,
        total,
        soft,
      }
    }
    const rowName = `A,${total - 11}` as SoftRow
    const code = SOFT_TABLE[rowName][col]
    return fromCode(code, avail, { category: 'soft', row: rowName, dealer }, total, soft)
  }

  // 4) Hard totals
  const rowName = hardRowFor(total)
  const code = HARD_TABLE[rowName][col]
  return fromCode(code, avail, { category: 'hard', row: rowName, dealer }, total, soft)
}

function fromCode(
  code: 'H' | 'S' | 'D' | 'Ds',
  avail: Availability,
  cell: CellRef,
  total: number,
  soft: boolean,
): Recommendation {
  switch (code) {
    case 'H':
      return { action: 'hit', cell, code, fallback: false, total, soft }
    case 'S':
      return { action: 'stand', cell, code, fallback: false, total, soft }
    case 'D':
      return avail.canDouble
        ? { action: 'double', cell, code, fallback: false, total, soft }
        : { action: 'hit', cell, code, fallback: true, total, soft }
    case 'Ds':
      return avail.canDouble
        ? { action: 'double', cell, code, fallback: false, total, soft }
        : { action: 'stand', cell, code, fallback: true, total, soft }
  }
}
