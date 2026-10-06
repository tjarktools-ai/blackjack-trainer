import { handValue, isPair, isTwoCard21, upcardOf } from './hand'
import { RULES } from './rules'
import { Shoe } from './shoe'
import { recommend, type Availability, type Recommendation } from './strategy'
import type { Action, Card, Rank, Upcard } from './types'

export type Phase = 'betting' | 'insurance' | 'player' | 'dealer' | 'settled'
export type HandStatus = 'pending' | 'playing' | 'stood' | 'bust' | 'surrendered' | 'blackjack'
export type HandResult = 'win' | 'lose' | 'push' | 'blackjack' | 'surrender'

export interface PlayerHand {
  id: number
  cards: Card[]
  bet: number
  doubled: boolean
  fromSplit: boolean
  splitAce: boolean
  status: HandStatus
  result?: HandResult
  /** Ausgezahlter Betrag (inkl. Einsatz) – erst nach der Abrechnung gesetzt. */
  payout?: number
}

export interface PlayEvaluation {
  kind: 'play'
  chosen: Action
  recommendation: Recommendation
  correct: boolean
  /** Hand VOR dem Zug. */
  cards: Card[]
  dealerUp: Upcard
  dealerCard: Card
  availability: Availability
  handIndex: number
  handCount: number
  /** Karte, die durch den Zug gezogen wurde (Hit, Double, Split) – für die Anzeige im Feedback. */
  drawn?: Card
  /** Summe der Hand nach dem Zug (bei Split: der ersten Hand). */
  totalAfter?: number
}

export interface InsuranceEvaluation {
  kind: 'insurance'
  /** true = Insurance bzw. Even Money genommen */
  took: boolean
  evenMoney: boolean
  correct: boolean
  cards: Card[]
  dealerCard: Card
}

export type Evaluation = PlayEvaluation | InsuranceEvaluation

export interface RoundSnapshot {
  phase: Phase
  dealer: Card[]
  holeHidden: boolean
  hands: PlayerHand[]
  active: number
  insuranceBet: number
  insuranceOffered: boolean
  playerHasBlackjack: boolean
  /** Aktuell erlaubte Züge (leer außerhalb der Spielerphase). */
  actions: Action[]
  canTakeInsurance: boolean
  balance: number
  /** Nettoergebnis der letzten abgerechneten Runde (inkl. Insurance). */
  net: number
  roundsPlayed: number
  shuffled: boolean
  shoe: { remaining: number; total: number; dealtFraction: number }
}

/** Gezielte Starthand für den optionalen Lern-Deal (Ränge/Gruppen von Rängen). */
export interface ForcedDeal {
  player: [readonly Rank[], readonly Rank[]]
  dealerUp: readonly Rank[]
}

export class Game {
  readonly shoe: Shoe
  balance: number
  phase: Phase = 'betting'
  dealer: Card[] = []
  holeHidden = true
  hands: PlayerHand[] = []
  active = 0
  insuranceBet = 0
  insuranceOffered = false
  baseBet = 0
  net = 0
  roundsPlayed = 0
  shuffled = false
  private nextHandId = 1
  private roundStartBalance = 0

  constructor(balance: number, shoe: Shoe = new Shoe()) {
    this.balance = balance
    this.shoe = shoe
  }

  // ---------- Zustand für die UI ----------

  snapshot(): RoundSnapshot {
    return {
      phase: this.phase,
      dealer: [...this.dealer],
      holeHidden: this.holeHidden,
      hands: this.hands.map((h) => ({ ...h, cards: [...h.cards] })),
      active: this.active,
      insuranceBet: this.insuranceBet,
      insuranceOffered: this.insuranceOffered,
      playerHasBlackjack: this.hands.length === 1 && this.hands[0].status === 'blackjack',
      actions: this.availableActions(),
      canTakeInsurance: this.canTakeInsurance,
      balance: this.balance,
      net: this.net,
      roundsPlayed: this.roundsPlayed,
      shuffled: this.shuffled,
      shoe: { remaining: this.shoe.remaining, total: this.shoe.total, dealtFraction: this.shoe.dealtFraction },
    }
  }

  get dealerUp(): Card {
    return this.dealer[0]
  }

  get currentHand(): PlayerHand | undefined {
    return this.phase === 'player' ? this.hands[this.active] : undefined
  }

  // ---------- Runde starten ----------

  setBalance(balance: number): void {
    this.balance = balance
  }

  /** Neue Runde mit Einsatz. Gibt false zurück, wenn der Einsatz nicht möglich ist. */
  deal(bet: number, forced?: ForcedDeal): boolean {
    if (this.phase !== 'betting' && this.phase !== 'settled') return false
    if (bet <= 0 || bet > this.balance) return false

    this.shuffled = false
    // Cut Card erreicht – oder (nur Übungsmodi) die gewünschten Karten sind im Rest des Schuhs aufgebraucht.
    if (this.shoe.needsShuffle || (forced && !this.shoe.canSupply([...forced.player, forced.dealerUp]))) {
      this.shoe.reshuffle()
      this.shuffled = true
    }

    this.balance -= bet
    this.roundStartBalance = this.balance + bet
    this.baseBet = bet
    this.net = 0
    this.insuranceBet = 0
    this.insuranceOffered = false
    this.holeHidden = true
    this.dealer = []
    this.active = 0

    const draw = (ranks?: readonly Rank[]): Card => (ranks ? (this.shoe.takeRank(ranks) ?? this.shoe.draw()) : this.shoe.draw())
    const p1 = draw(forced?.player[0])
    const d1 = draw(forced?.dealerUp)
    const p2 = draw(forced?.player[1])
    const d2 = this.shoe.draw()
    this.dealer = [d1, d2]
    const hand: PlayerHand = {
      id: this.nextHandId++,
      cards: [p1, p2],
      bet,
      doubled: false,
      fromSplit: false,
      splitAce: false,
      status: 'playing',
    }
    this.hands = [hand]

    if (isTwoCard21(hand.cards)) hand.status = 'blackjack'

    if (d1.rank === 'A') {
      // Insurance / Even Money wird angeboten, bevor der Dealer nachsieht.
      this.phase = 'insurance'
      this.insuranceOffered = true
    } else {
      this.resolvePeek()
    }
    return true
  }

  // ---------- Insurance / Even Money ----------

  get canTakeInsurance(): boolean {
    return this.phase === 'insurance' && this.balance >= this.baseBet / 2
  }

  /** Entscheidung zu Insurance (bzw. Even Money bei eigenem Blackjack). */
  decideInsurance(take: boolean): InsuranceEvaluation | null {
    if (this.phase !== 'insurance') return null
    const hand = this.hands[0]
    const evenMoney = hand.status === 'blackjack'
    const evaluation: InsuranceEvaluation = {
      kind: 'insurance',
      took: take,
      evenMoney,
      correct: !take,
      cards: [...hand.cards],
      dealerCard: this.dealer[0],
    }
    if (take) {
      if (evenMoney) {
        // Even Money = sofort 1:1 auf den Blackjack, egal was der Dealer hat.
        this.holeHidden = false
        hand.result = 'win'
        hand.payout = hand.bet * 2
        this.balance += hand.payout
        this.finishRound()
        return evaluation
      }
      const cost = this.baseBet / 2
      if (this.balance < cost) return evaluation
      this.balance -= cost
      this.insuranceBet = cost
    }
    this.insuranceOffered = false
    this.resolvePeek()
    return evaluation
  }

  /** Dealer sieht nach (bei Ass oder Zehner). Entscheidet, ob die Runde sofort endet. */
  private resolvePeek(): void {
    const up = this.dealer[0]
    const hand = this.hands[0]
    const peeks = up.rank === 'A' || upcardOf(up) === 'T'
    if (peeks && isTwoCard21(this.dealer)) {
      // Dealer-Blackjack
      this.holeHidden = false
      if (this.insuranceBet > 0) this.balance += this.insuranceBet * (1 + RULES.insurancePayout)
      if (hand.status === 'blackjack') {
        hand.result = 'push'
        hand.payout = hand.bet
      } else {
        hand.result = 'lose'
        hand.payout = 0
      }
      this.balance += hand.payout
      this.finishRound()
      return
    }
    if (hand.status === 'blackjack') {
      this.holeHidden = false
      hand.result = 'blackjack'
      hand.payout = hand.bet * (1 + RULES.blackjackPayout)
      this.balance += hand.payout
      this.finishRound()
      return
    }
    this.phase = 'player'
  }

  // ---------- Spielerzüge ----------

  availability(): Availability {
    const hand = this.hands[this.active]
    if (this.phase !== 'player' || !hand) return { canDouble: false, canSplit: false, canSurrender: false }
    const twoCards = hand.cards.length === 2
    return {
      canDouble: twoCards && this.balance >= hand.bet && !hand.splitAce,
      canSplit: twoCards && isPair(hand.cards) && this.hands.length < RULES.maxHands && this.balance >= hand.bet && !hand.splitAce,
      canSurrender: RULES.lateSurrender && this.hands.length === 1 && !hand.fromSplit && twoCards,
    }
  }

  availableActions(): Action[] {
    if (this.phase !== 'player') return []
    const a = this.availability()
    const out: Action[] = ['hit', 'stand']
    if (a.canDouble) out.push('double')
    if (a.canSplit) out.push('split')
    if (a.canSurrender) out.push('surrender')
    return out
  }

  /** Was die Basic Strategy für die aktuelle Hand empfiehlt (ohne etwas zu ändern). */
  currentRecommendation(): Recommendation | null {
    const hand = this.currentHand
    if (!hand) return null
    return recommend(hand.cards, upcardOf(this.dealer[0]), this.availability())
  }

  /** Führt einen Zug aus und liefert die Bewertung (Entscheidung wird VOR dem Zug ausgewertet). */
  act(action: Action): PlayEvaluation | null {
    const hand = this.currentHand
    if (!hand || !this.availableActions().includes(action)) return null

    const availability = this.availability()
    const recommendation = recommend(hand.cards, upcardOf(this.dealer[0]), availability)
    const evaluation: PlayEvaluation = {
      kind: 'play',
      chosen: action,
      recommendation,
      correct: recommendation.action === action,
      cards: [...hand.cards],
      dealerUp: upcardOf(this.dealer[0]),
      dealerCard: this.dealer[0],
      availability,
      handIndex: this.active,
      handCount: this.hands.length,
    }

    switch (action) {
      case 'hit': {
        hand.cards.push(this.shoe.draw())
        const t = handValue(hand.cards).total
        if (t > 21) hand.status = 'bust'
        else if (t === 21) hand.status = 'stood'
        break
      }
      case 'stand':
        hand.status = 'stood'
        break
      case 'double': {
        this.balance -= hand.bet
        hand.bet *= 2
        hand.doubled = true
        hand.cards.push(this.shoe.draw())
        hand.status = handValue(hand.cards).total > 21 ? 'bust' : 'stood'
        break
      }
      case 'surrender':
        hand.status = 'surrendered'
        hand.result = 'surrender'
        break
      case 'split': {
        this.balance -= hand.bet
        const [first, second] = hand.cards
        const aces = first.rank === 'A'
        hand.cards = [first]
        hand.fromSplit = true
        hand.splitAce = aces
        const sibling: PlayerHand = {
          id: this.nextHandId++,
          cards: [second],
          bet: hand.bet,
          doubled: false,
          fromSplit: true,
          splitAce: aces,
          status: 'pending',
        }
        this.hands.splice(this.active + 1, 0, sibling)
        hand.cards.push(this.shoe.draw())
        hand.status = 'playing'
        break
      }
    }
    if (action === 'hit' || action === 'double' || action === 'split') {
      const played = this.hands[evaluation.handIndex]
      evaluation.drawn = played.cards[played.cards.length - 1]
      evaluation.totalAfter = handValue(played.cards).total
    }
    this.afterAction()
    return evaluation
  }

  /** Nach einem Zug: Hände durchlaufen, bis eine Entscheidung nötig ist – sonst Dealer. */
  private afterAction(): void {
    for (;;) {
      const hand = this.hands[this.active]
      if (hand.status === 'pending') {
        hand.cards.push(this.shoe.draw())
        hand.status = 'playing'
      }
      if (hand.status === 'playing') {
        const t = handValue(hand.cards).total
        if (hand.splitAce || t >= 21) hand.status = 'stood'
      }
      if (hand.status === 'playing') {
        this.phase = 'player'
        return
      }
      if (this.active < this.hands.length - 1) {
        this.active++
        continue
      }
      this.phase = 'dealer'
      return
    }
  }

  // ---------- Dealer ----------

  /**
   * Ein Dealer-Schritt. 'revealed' = Hole Card aufgedeckt, 'drew' = Karte gezogen,
   * 'done' = Dealer fertig und Runde abgerechnet.
   */
  dealerStep(): 'revealed' | 'drew' | 'done' {
    if (this.phase !== 'dealer') return 'done'
    if (this.holeHidden) {
      this.holeHidden = false
      return 'revealed'
    }
    const live = this.hands.some((h) => h.status === 'stood')
    if (live && this.dealerMustDraw()) {
      this.dealer.push(this.shoe.draw())
      return 'drew'
    }
    this.settle()
    return 'done'
  }

  private dealerMustDraw(): boolean {
    const { total, soft } = handValue(this.dealer)
    if (total < 17) return true
    return total === 17 && soft && RULES.dealerHitsSoft17
  }

  // ---------- Abrechnung ----------

  private settle(): void {
    const dealerTotal = handValue(this.dealer).total
    const dealerBust = dealerTotal > 21
    for (const hand of this.hands) {
      if (hand.result === 'surrender') {
        hand.payout = hand.bet / 2
      } else if (hand.status === 'bust') {
        hand.result = 'lose'
        hand.payout = 0
      } else {
        const t = handValue(hand.cards).total
        if (dealerBust || t > dealerTotal) {
          hand.result = 'win'
          hand.payout = hand.bet * 2
        } else if (t === dealerTotal) {
          hand.result = 'push'
          hand.payout = hand.bet
        } else {
          hand.result = 'lose'
          hand.payout = 0
        }
      }
      this.balance += hand.payout ?? 0
    }
    this.finishRound()
  }

  private finishRound(): void {
    this.phase = 'settled'
    this.holeHidden = false
    this.roundsPlayed++
    this.net = this.balance - this.roundStartBalance
  }

  /** Zurück zum Setzen. */
  newRound(): void {
    this.phase = 'betting'
    this.dealer = []
    this.hands = []
    this.active = 0
    this.insuranceBet = 0
    this.insuranceOffered = false
  }
}
