import type { Upcard } from './types'

/**
 * Basic-Strategy-Tabelle – 1:1 vom Screenshot (Blackjack Apprenticeship).
 * Spalten: Dealer-Upcard 2 3 4 5 6 7 8 9 10 A
 *
 * Pairs:     Y = splitten · Y/N = splitten, wenn Double After Split erlaubt ist (hier: ja) · N = nicht splitten
 * Soft:      H = Hit · S = Stand · D = Double, sonst Hit · Ds = Double, sonst Stand
 * Hard:      H = Hit · S = Stand · D = Double, sonst Hit
 * Surrender: SUR = aufgeben (Late Surrender)
 */
export const DEALER_COLS: readonly Upcard[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A']

export type PairCode = 'Y' | 'Y/N' | 'N'
export type SoftCode = 'H' | 'S' | 'D' | 'Ds'
export type HardCode = 'H' | 'S' | 'D'
export type SurrenderCode = 'SUR' | '-'

type Row<C extends string> = readonly C[]

function row<C extends string>(spec: string): Row<C> {
  const cells = spec.trim().split(/\s+/) as C[]
  if (cells.length !== DEALER_COLS.length) throw new Error(`Tabellenzeile hat ${cells.length} Zellen: "${spec}"`)
  return cells
}

export const PAIR_ROWS = ['A,A', 'T,T', '9,9', '8,8', '7,7', '6,6', '5,5', '4,4', '3,3', '2,2'] as const
export type PairRow = (typeof PAIR_ROWS)[number]

export const PAIR_TABLE: Record<PairRow, Row<PairCode>> = {
  'A,A': row('Y Y Y Y Y Y Y Y Y Y'),
  'T,T': row('N N N N N N N N N N'),
  '9,9': row('Y Y Y Y Y N Y Y N N'),
  '8,8': row('Y Y Y Y Y Y Y Y Y Y'),
  '7,7': row('Y Y Y Y Y Y N N N N'),
  '6,6': row('Y/N Y Y Y Y N N N N N'),
  '5,5': row('N N N N N N N N N N'),
  '4,4': row('N N N Y/N Y/N N N N N N'),
  '3,3': row('Y/N Y/N Y Y Y Y N N N N'),
  '2,2': row('Y/N Y/N Y Y Y Y N N N N'),
}

/** Soft-Zeilen nach Ass-Partner: "A,9" = Soft 20 … "A,2" = Soft 13. */
export const SOFT_ROWS = ['A,9', 'A,8', 'A,7', 'A,6', 'A,5', 'A,4', 'A,3', 'A,2'] as const
export type SoftRow = (typeof SOFT_ROWS)[number]

export const SOFT_TABLE: Record<SoftRow, Row<SoftCode>> = {
  'A,9': row('S S S S S S S S S S'),
  'A,8': row('S S S S Ds S S S S S'),
  'A,7': row('Ds Ds Ds Ds Ds S S H H H'),
  'A,6': row('H D D D D H H H H H'),
  'A,5': row('H H D D D H H H H H'),
  'A,4': row('H H D D D H H H H H'),
  'A,3': row('H H H D D H H H H H'),
  'A,2': row('H H H D D H H H H H'),
}

/** Hard-Zeilen: "17" gilt für 17 und höher, "8" für 8 und niedriger. */
export const HARD_ROWS = ['17', '16', '15', '14', '13', '12', '11', '10', '9', '8'] as const
export type HardRow = (typeof HARD_ROWS)[number]

export const HARD_TABLE: Record<HardRow, Row<HardCode>> = {
  '17': row('S S S S S S S S S S'),
  '16': row('S S S S S H H H H H'),
  '15': row('S S S S S H H H H H'),
  '14': row('S S S S S H H H H H'),
  '13': row('S S S S S H H H H H'),
  '12': row('H H S S S H H H H H'),
  '11': row('D D D D D D D D D D'),
  '10': row('D D D D D D D D H H'),
  '9': row('H D D D D H H H H H'),
  '8': row('H H H H H H H H H H'),
}

export const SURRENDER_ROWS = ['16', '15', '14'] as const
export type SurrenderRow = (typeof SURRENDER_ROWS)[number]

export const SURRENDER_TABLE: Record<SurrenderRow, Row<SurrenderCode>> = {
  '16': row('- - - - - - - SUR SUR SUR'),
  '15': row('- - - - - - - - SUR -'),
  '14': row('- - - - - - - - - -'),
}

export function colIndex(dealer: Upcard): number {
  return DEALER_COLS.indexOf(dealer)
}
