/**
 * Realismus-Check: spielt die Basic Strategy 1:1 gegen die echte Spiel-Engine
 * und misst den Hausvorteil. Bei diesen Regeln (6 Decks, H17, DAS, Late Surrender
 * laut Tabelle, 3:2) liegt der Hausvorteil bei ca. 0,4–0,6 %.
 *
 * Aufruf:  npm run simulate -- 2000000
 */
import { Game } from '../src/engine/round'

const rounds = Number(process.argv[2] ?? 1_000_000)
const game = new Game(1e12)
let sum = 0
let sumSq = 0
const t0 = Date.now()
let blackjacks = 0
let wrong = 0

for (let i = 0; i < rounds; i++) {
  game.deal(1)
  if (game.phase === 'insurance') game.decideInsurance(false) // Basic Strategy: nie Insurance / Even Money
  while (game.phase === 'player') {
    const rec = game.currentRecommendation()!
    const ev = game.act(rec.action)!
    if (!ev.correct) wrong++
  }
  while (game.phase === 'dealer') game.dealerStep()
  if (game.hands[0]?.result === 'blackjack') blackjacks++
  sum += game.net
  sumSq += game.net * game.net
  if ((i + 1) % 500_000 === 0) console.log(`${i + 1} Runden …`)
}

const mean = sum / rounds
const sd = Math.sqrt(sumSq / rounds - mean * mean)
const se = sd / Math.sqrt(rounds)
console.log(`\nRunden: ${rounds.toLocaleString('de-DE')} in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
console.log(`Hausvorteil: ${(-mean * 100).toFixed(3)} %  (± ${(se * 100 * 1.96).toFixed(3)} %, 95 %-Intervall)`)
console.log(`Blackjack-Rate: ${((blackjacks / rounds) * 100).toFixed(2)} %  (gezählt nur, wenn der Dealer keinen Blackjack hat; Gesamtrate ≈ 4,75 %, Rest = Push)`)
console.log(`Abweichungen vom empfohlenen Zug: ${wrong} (muss 0 sein)`)
