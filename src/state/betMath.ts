import { MAX_BET, MIN_BET } from '../engine/rules'

/** Einsatz verdoppeln – höchstens bis Tischlimit bzw. zum Restguthaben. */
export function doubledBet(bet: number, balance: number): number {
  return Math.min(bet * 2, MAX_BET, Math.floor(balance))
}

/** Einsatz halbieren (abgerundet) – nie unter den Mindesteinsatz. */
export function halvedBet(bet: number): number {
  if (bet <= MIN_BET) return bet
  return Math.max(MIN_BET, Math.floor(bet / 2))
}

export function canDoubleBet(bet: number, balance: number): boolean {
  return bet > 0 && doubledBet(bet, balance) > bet
}

export function canHalveBet(bet: number): boolean {
  return halvedBet(bet) < bet
}
