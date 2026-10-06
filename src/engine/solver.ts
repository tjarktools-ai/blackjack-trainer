/**
 * Exakter Erwartungswert-Solver (EV) für Blackjack mit endlichem Schuh.
 *
 * NUR für den Offline-Build der Erklärdaten (scripts/compute-ev.ts) und für Tests –
 * wird nicht in die App gebündelt. Die App zeigt die hier berechneten Zahlen.
 *
 * Modell: kartenzusammensetzungsabhängig (die bekannten Karten werden aus dem
 * 6-Deck-Schuh entfernt), H17, Dealer-Peek (Zahlen gelten, wenn der Dealer KEINEN
 * Blackjack hat – nur dann trifft man Entscheidungen), DAS, Late Surrender = −0,5,
 * Split bis 4 Hände, Asse: eine Karte, kein Resplit. EV in Einheiten des Grund-Einsatzes.
 *
 * Kartenwerte: Index 0 = Ass (1) … Index 8 = Neun, Index 9 = Zehnerwerte (T/J/Q/K).
 */
import { RULES } from './rules'

export type Counts = number[]

export function freshCounts(): Counts {
  const per = RULES.decks * 4
  return [per, per, per, per, per, per, per, per, per, per * 4]
}

const sumCounts = (c: Counts) => c.reduce((a, b) => a + b, 0)

/** Verteilung des Dealer-Endergebnisses: [17, 18, 19, 20, 21, Bust] */
export type DealerDist = [number, number, number, number, number, number]

export class Solver {
  private dealerCache = new Map<string, DealerDist>()
  private playCache = new Map<string, number>()
  private up = 0

  /** Cache leeren (zwischen Upcards sinnvoll, um Speicher zu sparen). */
  reset(): void {
    this.dealerCache.clear()
    this.playCache.clear()
  }

  // ---------- Dealer ----------

  /**
   * Dealer-Endverteilung bei Upcard `up` (1 = Ass … 10) mit Restschuh `counts`
   * (ohne Upcard und ohne Spielerkarten). Bedingt auf „kein Blackjack“ (Peek bei A/10).
   */
  dealerDist(counts: Counts, up: number): DealerDist {
    return this.dealerPlay(counts, up, up === 1, up === 1 || up === 10, true)
  }

  private dealerPlay(counts: Counts, sum: number, hasAce: boolean, peekOnFirst: boolean, first: boolean): DealerDist {
    if (sum > 21) return [0, 0, 0, 0, 0, 1]
    const total = hasAce && sum + 10 <= 21 ? sum + 10 : sum
    const soft = total !== sum
    const stands = total >= 18 || (total === 17 && (!soft || !RULES.dealerHitsSoft17))
    if (stands) {
      const d: DealerDist = [0, 0, 0, 0, 0, 0]
      d[total - 17] = 1
      return d
    }
    const key = counts.join(',') + '|' + sum + (hasAce ? 'a' : '') + (first ? 'F' + (peekOnFirst ? 'p' : '') : '')
    const hit = this.dealerCache.get(key)
    if (hit) return hit

    // Beim ersten Zug (Hole Card) bei Peek: Karte, die Blackjack ergäbe, ist ausgeschlossen.
    let excluded = -1
    if (first && peekOnFirst) excluded = sum === 1 ? 9 : 0 // Ass-Upcard → keine 10; Zehner-Upcard → kein Ass
    let n = 0
    for (let i = 0; i < 10; i++) if (i !== excluded) n += counts[i]

    const out: DealerDist = [0, 0, 0, 0, 0, 0]
    for (let i = 0; i < 10; i++) {
      if (i === excluded || counts[i] === 0) continue
      const p = counts[i] / n
      counts[i]--
      const sub = this.dealerPlay(counts, sum + i + 1, hasAce || i === 0, false, false)
      counts[i]++
      for (let k = 0; k < 6; k++) out[k] += p * sub[k]
    }
    this.dealerCache.set(key, out)
    return out
  }

  // ---------- Spieler ----------

  evStand(total: number, counts: Counts): number {
    const d = this.dealerDist(counts, this.up)
    let ev = d[5]
    for (let k = 0; k < 5; k++) {
      const dealerTotal = 17 + k
      if (total > dealerTotal) ev += d[k]
      else if (total < dealerTotal) ev -= d[k]
    }
    return ev
  }

  /** Bester Folgewert nach einer Karte: weiterspielen (Stand oder Hit) – ohne Double. */
  private playOn(sum: number, hasAce: boolean, counts: Counts): number {
    if (sum > 21) return -1
    const total = hasAce && sum + 10 <= 21 ? sum + 10 : sum
    const key = this.up + '|' + counts.join(',') + '|' + sum + (hasAce ? 'a' : '')
    const cached = this.playCache.get(key)
    if (cached !== undefined) return cached
    const stand = this.evStand(total, counts)
    const best = total === 21 ? stand : Math.max(stand, this.evHit(sum, hasAce, counts))
    this.playCache.set(key, best)
    return best
  }

  evHit(sum: number, hasAce: boolean, counts: Counts): number {
    const n = sumCounts(counts)
    let ev = 0
    for (let i = 0; i < 10; i++) {
      if (counts[i] === 0) continue
      const p = counts[i] / n
      counts[i]--
      ev += p * this.playOn(sum + i + 1, hasAce || i === 0, counts)
      counts[i]++
    }
    return ev
  }

  /** Double: genau eine Karte, doppelter Einsatz → EV in Einheiten des Grund-Einsatzes. */
  evDouble(sum: number, hasAce: boolean, counts: Counts): number {
    const n = sumCounts(counts)
    let ev = 0
    for (let i = 0; i < 10; i++) {
      if (counts[i] === 0) continue
      const p = counts[i] / n
      counts[i]--
      const s = sum + i + 1
      const a = hasAce || i === 0
      const value = s > 21 ? -1 : this.evStand(a && s + 10 <= 21 ? s + 10 : s, counts)
      counts[i]++
      ev += p * value
    }
    return 2 * ev
  }

  /** EV einer Split-Aktion für ein Paar mit Kartenwert `r` (1 = Asse, 10 = alle Zehner). */
  evSplit(r: number, counts: Counts): number {
    const maxHands = RULES.maxHands
    const hasAce = r === 1
    const T = (hands: number): number => {
      const n = sumCounts(counts)
      let ev = 0
      for (let i = 0; i < 10; i++) {
        if (counts[i] === 0) continue
        const p = counts[i] / n
        counts[i]--
        const v = i + 1
        const sum = r + v
        const a = hasAce || v === 1
        const total = a && sum + 10 <= 21 ? sum + 10 : sum
        let value: number
        if (hasAce) {
          // Gesplittete Asse: nur eine Karte, kein Resplit
          value = this.evStand(total, counts)
        } else {
          const stand = this.evStand(total, counts)
          const hit = total === 21 ? stand : this.evHit(sum, a, counts)
          const dbl = RULES.doubleAfterSplit ? this.evDouble(sum, a, counts) : -Infinity
          value = Math.max(stand, hit, dbl)
          if (v === r && hands < maxHands) value = Math.max(value, 2 * T(hands + 1))
        }
        counts[i]++
        ev += p * value
      }
      return ev
    }
    return 2 * T(2)
  }

  // ---------- Komplette Hand-Auswertung ----------

  /**
   * EV aller Aktionen für eine Starthand (Kartenwerte 1–10) gegen die Upcard `up`.
   * `isPair`: zusätzlich Split-EV berechnen.
   */
  evaluateHand(cardVals: number[], up: number, isPair: boolean): { stand: number; hit: number; double: number; split?: number; surrender: number } {
    this.up = up
    const counts = freshCounts()
    counts[up - 1]--
    let sum = 0
    let hasAce = false
    for (const v of cardVals) {
      counts[v - 1]--
      sum += v
      if (v === 1) hasAce = true
    }
    const total = hasAce && sum + 10 <= 21 ? sum + 10 : sum
    const stand = this.evStand(total, counts)
    const hit = total >= 21 ? stand : this.evHit(sum, hasAce, counts)
    const dbl = this.evDouble(sum, hasAce, counts)
    const out: { stand: number; hit: number; double: number; split?: number; surrender: number } = {
      stand,
      hit,
      double: dbl,
      surrender: -0.5,
    }
    if (isPair) out.split = this.evSplit(cardVals[0], counts)
    return out
  }

  /** Dealer-Endverteilung für eine frische Schuh-Situation (nur Upcard bekannt). */
  dealerOutcome(up: number): { dist: DealerDist; blackjack: number } {
    const counts = freshCounts()
    counts[up - 1]--
    const n = sumCounts(counts)
    const blackjack = up === 1 ? counts[9] / n : up === 10 ? counts[0] / n : 0
    return { dist: this.dealerDist(counts, up), blackjack }
  }
}
