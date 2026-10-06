/**
 * Entwickler-Werkzeug: gibt Beispiel-Erklärungen aus, um die Texte zu prüfen.
 * Aufruf:  npx tsx scripts/preview-explanations.ts
 */
import { cards } from '../src/engine/__tests__/helpers'
import type { PlayEvaluation } from '../src/engine/round'
import { recommend } from '../src/engine/strategy'
import type { Action, Rank, Upcard } from '../src/engine/types'
import { explainPlay } from '../src/explain/explain'

const avail = { canDouble: true, canSplit: true, canSurrender: true }

function show(ranks: Rank[], up: Upcard, chosen: Action) {
  const hand = cards(...ranks)
  const rec = recommend(hand, up, avail)
  const ev: PlayEvaluation = {
    kind: 'play',
    chosen,
    recommendation: rec,
    correct: rec.action === chosen,
    cards: hand,
    dealerUp: up,
    dealerCard: hand[0],
    availability: avail,
    handIndex: 0,
    handCount: 1,
  }
  const x = explainPlay(ev)
  console.log(`\n=== ${x.situation} | gewählt: ${chosen} | ${x.headline}`)
  console.log(`Feld: ${x.tableCell} [${x.tableCode}]  Prinzip: ${x.principle}`)
  console.log('EV: ' + x.evRows.map((r) => `${r.action} ${r.ev.toFixed(3)}${r.recommended ? '*' : ''}`).join(' · '))
  x.why.forEach((w) => console.log(' - ' + w))
  if (x.whyNot) console.log(' ✗ ' + x.whyNot)
  x.notes.forEach((w) => console.log(' ℹ ' + w))
}

show(['T', '6'], 'T', 'hit')
show(['T', '2'], '3', 'stand')
show(['9', '9'], '8', 'stand')
show(['9', '9'], '7', 'split')
show(['A', '7'], '9', 'stand')
show(['6', '5'], 'A', 'hit')
show(['8', '8'], 'A', 'surrender')
show(['5', '5'], '6', 'split')
show(['T', '5'], 'A', 'surrender')
show(['A', '2'], '5', 'hit')
