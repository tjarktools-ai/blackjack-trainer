import { DEALER_STATS, EV_DATA, type EvEntry } from '../data/evData.generated'
import type { Evaluation, InsuranceEvaluation, PlayEvaluation } from '../engine/round'
import type { Recommendation } from '../engine/strategy'
import type { Action, CellRef, Upcard } from '../engine/types'
import {
  actionName,
  bustOnHit,
  describeHand,
  dealerStrength,
  fmtEv,
  pct,
  per100,
  upLabel,
} from './format'
import type { PrincipleId } from './principles'

export interface EvRow {
  action: Action
  ev: number
  /** Vom Chart empfohlen */
  recommended: boolean
  /** Vom Spieler gewählt */
  chosen: boolean
}

export interface DealerInfo {
  up: Upcard
  bust: number
  /** Endwahrscheinlichkeiten 17, 18, 19, 20, 21 (ohne Bust) */
  totals: number[]
  strength: 'schwach' | 'mittel' | 'stark'
}

export interface PlayExplanation {
  kind: 'play'
  correct: boolean
  headline: string
  situation: string
  chosen: Action
  recommended: Action
  tableCode: string
  tableCodeText: string
  tableCell: string
  cell: CellRef
  evRows: EvRow[]
  why: string[]
  whyNot?: string
  notes: string[]
  principle: PrincipleId
  secondary: PrincipleId[]
  dealer: DealerInfo
  /** Kennzahlen der Hand (für Kurz-Hinweise). */
  facts: { total: number; soft: boolean; hitBust: number; row: string }
}

export interface InsuranceExplanation {
  kind: 'insurance'
  correct: boolean
  headline: string
  situation: string
  why: string[]
  notes: string[]
  principle: PrincipleId
  secondary: PrincipleId[]
  dealer: DealerInfo
  evRows: EvRow[]
}

export type Explanation = PlayExplanation | InsuranceExplanation

const CODE_TEXT: Record<string, string> = {
  Y: 'Splitten',
  'Y/N': 'Splitten (Double After Split ist erlaubt)',
  N: 'Nicht splitten',
  H: 'Hit',
  S: 'Stand',
  D: 'Double, sonst Hit',
  Ds: 'Double, sonst Stand',
  SUR: 'Surrender',
}

export function dealerInfo(up: Upcard): DealerInfo {
  const s = DEALER_STATS[up]
  return { up, bust: s.bust, totals: s.totals, strength: dealerStrength(up) }
}

/** Schlüssel in EV_DATA zur Entscheidungssituation. */
function evKey(cell: CellRef, total: number, soft: boolean): string | null {
  if (cell.category === 'pair' || cell.category === 'soft') return `${cell.category}|${cell.row}|${cell.dealer}`
  if (soft) return null
  if (total >= 21 || total < 5) return null
  const t = Math.min(20, Math.max(8, total))
  return `hard|${t}|${cell.dealer}`
}

function cellLabel(cell: CellRef): string {
  const up = upLabel(cell.dealer)
  switch (cell.category) {
    case 'pair':
      return `Pair Splitting · ${cell.row} gegen ${up}`
    case 'soft':
      return `Soft Totals · ${cell.row} gegen ${up}`
    case 'surrender':
      return `Late Surrender · ${cell.row} gegen ${up}`
    default:
      return `Hard Totals · ${cell.row === '17' ? '17+' : cell.row === '8' ? '≤ 8' : cell.row} gegen ${up}`
  }
}

// ---------------------------------------------------------------------------

interface Ctx {
  rec: Recommendation
  ideal: Action
  up: Upcard
  total: number
  soft: boolean
  ev?: EvEntry
  stats: DealerInfo
  hitBust: number
  cell: CellRef
}

const evOf = (c: Ctx, a: Action): number | undefined => c.ev?.[a]

function evPair(c: Ctx, a: Action, b: Action): string {
  const x = evOf(c, a)
  const y = evOf(c, b)
  return x !== undefined && y !== undefined ? `${actionName(a)} ${fmtEv(x)} gegen ${actionName(b)} ${fmtEv(y)}` : ''
}

export function explainPlay(e: PlayEvaluation): PlayExplanation {
  const rec = e.recommendation
  const up = e.dealerUp
  const stats = dealerInfo(up)
  const key = evKey(rec.cell, rec.total, rec.soft)
  const ev = key ? EV_DATA[key] : undefined
  const ideal: Action = rec.fallback ? 'double' : rec.action
  const ctx: Ctx = {
    rec,
    ideal,
    up,
    total: rec.total,
    soft: rec.soft,
    ev,
    stats,
    hitBust: bustOnHit(rec.total, rec.soft),
    cell: rec.cell,
  }

  const notes: string[] = []
  const secondary: PrincipleId[] = []
  let principle: PrincipleId
  let why: string[]

  switch (rec.cell.category) {
    case 'pair':
      ;({ why, principle } = whyPair(ctx))
      break
    case 'soft':
      ;({ why, principle } = whySoft(ctx))
      break
    case 'surrender':
      ;({ why, principle } = whySurrender(ctx))
      break
    default:
      ;({ why, principle } = whyHard(ctx))
  }

  // --- EV-Tabelle (nur, was wirklich möglich war) ---
  const evRows: EvRow[] = []
  if (ev) {
    const order: Action[] = ['stand', 'hit', 'double', 'split', 'surrender']
    for (const a of order) {
      if (a === 'double' && !e.availability.canDouble) continue
      if (a === 'split' && !e.availability.canSplit) continue
      if (a === 'surrender' && !e.availability.canSurrender) continue
      const value = a === 'surrender' ? -0.5 : ev[a]
      if (value === undefined) continue
      evRows.push({ action: a, ev: value, recommended: a === rec.action, chosen: a === e.chosen })
    }
  }

  // --- Fallback D/Ds ---
  if (rec.fallback) {
    secondary.push('fallback-double')
    const fb = ev?.[rec.action]
    notes.push(
      `Die Tabelle sagt „${rec.code}“ (${CODE_TEXT[rec.code]}). Double geht aber nur mit den ersten zwei Karten – deshalb ${rec.action === 'hit' ? 'ziehst du' : 'bleibst du stehen'}${fb !== undefined ? ` (${actionName(rec.action)} ${fmtEv(fb)})` : ''}.`,
    )
  }

  // --- Hinweis, wenn ein anderer Zug rechnerisch knapp besser wäre als die Tabelle ---
  const chartRow = evRows.find((r) => r.recommended)
  const bestRow = evRows.reduce<EvRow | undefined>((b, r) => (b === undefined || r.ev > b.ev ? r : b), undefined)
  if (chartRow && bestRow && bestRow.action !== chartRow.action && bestRow.ev - chartRow.ev > 0.0005) {
    notes.push(
      `Rechnerisch wäre ${actionName(bestRow.action)} hier minimal besser (${fmtEv(bestRow.ev)} statt ${fmtEv(chartRow.ev)} – Unterschied nur ${per100(bestRow.ev - chartRow.ev)}). Deine Strategie-Tabelle sieht ${actionName(chartRow.action)} vor; danach richtest du dich in dieser App.`,
    )
  }

  const correct = e.correct
  const headline = correct
    ? `Richtig – ${actionName(rec.action)}!`
    : `Nicht optimal – die Tabelle sagt: ${actionName(rec.action)}`

  return {
    kind: 'play',
    correct,
    headline,
    situation: `${describeHand(e.cards)} gegen Dealer ${upLabel(up)} (${stats.strength})`,
    chosen: e.chosen,
    recommended: rec.action,
    tableCode: rec.code,
    tableCodeText: CODE_TEXT[rec.code] ?? rec.code,
    tableCell: cellLabel(rec.cell),
    cell: rec.cell,
    evRows,
    why,
    whyNot: correct ? undefined : whyNot(e, ctx),
    notes,
    principle,
    secondary,
    dealer: stats,
    facts: { total: rec.total, soft: rec.soft, hitBust: ctx.hitBust, row: rec.cell.row },
  }
}

// ---------------------------------------------------------------------------
// Begründungen nach Kategorie

function whyHard(c: Ctx): { why: string[]; principle: PrincipleId } {
  const { total, up, stats, hitBust, ideal } = c
  const bust = pct(stats.bust)
  const strength = stats.strength
  const why: string[] = []

  if (c.cell.row === '17') {
    why.push(
      `Mit Hard ${total} hast du schon eine solide Hand. Jede Karte ab der 5 bustet dich – ein Hit würde dich in ${pct(hitBust)} der Fälle sofort aus dem Spiel nehmen.`,
    )
    const cmp = evPair(c, 'stand', 'hit')
    if (cmp) why.push(`In Zahlen (Durchschnitt pro gesetzter Einheit): ${cmp}.`)
    return { why, principle: 'seventeen' }
  }

  if (c.cell.row === '8') {
    why.push(
      `Mit Hard ${total <= 8 ? total : 8} oder weniger kann dich keine einzelne Karte busten (höchstens 18). Eine Karte kostet dich nichts und verbessert die Hand fast immer.`,
    )
    const cmp = evPair(c, 'hit', 'stand')
    if (cmp) why.push(`In Zahlen: ${cmp}.`)
    return { why, principle: 'free-hit' }
  }

  if (ideal === 'double') {
    const winTotal = total + 10
    why.push(
      `Mit Hard ${total} ist die nächste Karte in ${pct(4 / 13)} eine 10 und macht daraus ${winTotal}. Du startest in einer starken Position.`,
    )
    why.push(
      `Der Dealer zeigt ${upLabel(up)} (${strength}, er bustet in ${bust} der Fälle). Als Favorit setzt du mehr Geld ein: ${evPair(c, 'double', 'hit') || 'Double ist am besten'}.`,
    )
    if (total === 11 && up === 'A') {
      why.push('Gegen das Ass ist der Vorteil am kleinsten – Double ist nur wegen der H17-Regel (Dealer zieht auf Soft 17) knapp besser als Hit.')
    }
    return { why, principle: 'double-strong' }
  }

  if (total >= 9 && total <= 11 && ideal === 'hit') {
    // Double wäre naheliegend, ist aber hier schlechter
    const cmp = evPair(c, 'hit', 'double')
    if (total === 10) {
      why.push(
        `Mit Hard 10 hättest du gute Chancen – aber gegen ${upLabel(up)} hat der Dealer sehr viele starke Hände (nur ${bust} Bust, ${pct(stats.totals[3] + stats.totals[4])} 20 oder 21). Das doppelte Risiko lohnt sich nicht.`,
      )
    } else {
      why.push(
        `Mit Hard ${total} wäre Double nur gegen schwache Dealer-Karten (3–6) profitabel. Gegen ${upLabel(up)} (${strength}, Bust ${bust}) ist dein Vorteil zu klein für den doppelten Einsatz.`,
      )
    }
    if (cmp) why.push(`In Zahlen: ${cmp} – ein normaler Hit ist besser.`)
    return { why, principle: 'double-strong' }
  }

  if (total === 12) {
    if (ideal === 'hit' && (up === '2' || up === '3')) {
      why.push(
        `Mit Hard 12 bustet ein Hit nur bei einer 10 – ${pct(hitBust)}. Das ist das niedrigste Bust-Risiko aller Stiff-Hände.`,
      )
      why.push(
        `Gegen ${up} bustet der Dealer aber nur in ${bust} der Fälle – zu selten, um mit der 12 zu stehen (${evPair(c, 'hit', 'stand')}). Ab der Dealer-4 (Bust ≈ ${pct(DEALER_STATS['4'].bust)}) lohnt sich Stehen.`,
      )
      return { why, principle: 'twelve' }
    }
    if (ideal === 'stand') {
      why.push(
        `Der Dealer zeigt ${up} und bustet in ${bust} der Fälle – ab einer 4 ist das genug, um mit der 12 zu stehen. Ein Hit würde dich in ${pct(hitBust)} selbst busten.`,
      )
      why.push(`Gegen 2 und 3 (Bust ${pct(DEALER_STATS['2'].bust)} / ${pct(DEALER_STATS['3'].bust)}) ist es noch zu wenig. In Zahlen hier: ${evPair(c, 'stand', 'hit')}.`)
      return { why, principle: 'twelve' }
    }
  }

  if (ideal === 'stand') {
    why.push(
      `Der Dealer zeigt ${upLabel(up)}: Er hat nur 12–16, wenn die verdeckte Karte eine 10 ist, und muss ziehen. Dabei bustet er in ${bust} der Fälle.`,
    )
    why.push(
      `Du hast Hard ${total}. Ein Hit würde dich in ${pct(hitBust)} sofort busten – du riskierst etwas, was der Dealer für dich erledigt. Lass ihn den Fehler machen.`,
    )
    const cmp = evPair(c, 'stand', 'hit')
    if (cmp) why.push(`In Zahlen: ${cmp}.`)
    return { why, principle: 'stand-vs-weak' }
  }

  // Hit gegen starke/mittlere Dealer-Karten
  why.push(
    `Der Dealer zeigt ${upLabel(up)} (${strength}): Er kommt in ${pct(1 - stats.bust)} der Fälle auf 17–21 und bustet nur in ${bust}.`,
  )
  why.push(
    `Mit Hard ${total} gewinnst du beim Stehen fast nur, wenn der Dealer busted – das ist zu selten (${evPair(c, 'stand', 'hit')}). Ziehen bustet dich zwar in ${pct(hitBust)}, gibt dir aber die Chance auf 17–21.`,
  )
  why.push('Beide Optionen verlieren hier im Schnitt Geld. Du wählst den kleineren Verlust.')
  return { why, principle: 'hit-vs-strong' }
}

function whySoft(c: Ctx): { why: string[]; principle: PrincipleId } {
  const { total, up, stats, ideal } = c
  const bust = pct(stats.bust)
  const why: string[] = []
  const name = `Soft ${total}`

  if (ideal === 'double') {
    why.push(`Mit ${name} kann dich die nächste Karte nicht busten – das Ass wird bei Bedarf zur 1. Im schlimmsten Fall wird die Hand schwächer, aber du bist nie sofort raus.`)
    why.push(
      `Der Dealer zeigt ${upLabel(up)} (${stats.strength}, Bust ${bust}). Das ist der richtige Moment, mehr Geld einzusetzen: ${evPair(c, 'double', 'hit')}${c.rec.code === 'Ds' ? ` und Stand ${fmtEv(evOf(c, 'stand') ?? 0)}` : ''}.`,
    )
    if (c.rec.code === 'Ds') {
      why.push(`Stand wäre mit ${name} auch gut – Double ist aber noch besser. Ist Double nicht möglich, bleibst du bei Stand.`)
    }
    return { why, principle: 'soft-double' }
  }

  if (ideal === 'stand') {
    if (total >= 19) {
      why.push(`${name} ist eine Spitzenhand. Eine weitere Karte würde sie fast immer verschlechtern: ${evPair(c, 'stand', 'hit')}.`)
    } else {
      why.push(
        `Soft 18 schlägt die Dealer-17 und ist gegen ${upLabel(up)} gut genug: Der Dealer endet oft auf 17 oder 18 (${pct(stats.totals[0])} / ${pct(stats.totals[1])}).`,
      )
      why.push(`Mit einem Hit würdest du die Hand eher verschlechtern: ${evPair(c, 'stand', 'hit')}.`)
    }
    return { why, principle: 'soft-stand' }
  }

  // hit
  if (total === 18) {
    why.push(
      `Soft 18 fühlt sich gut an, ist aber gegen ${upLabel(up)} zu schwach: Der Dealer kommt häufig auf 19, 20 oder 21 (${pct(stats.totals[2] + stats.totals[3] + stats.totals[4])}) – deine 18 verliert dann.`,
    )
    why.push(`Du kannst mit einer Karte nicht busten (das Ass wird zur 1) – der Hit ist deshalb weniger riskant, als er klingt: ${evPair(c, 'hit', 'stand')}.`)
    return { why, principle: 'soft-hit' }
  }
  why.push(`${name} ist eine schwache Hand (17 oder weniger). Eine Karte kann dich nicht busten und verbessert die Hand meistens – also ziehst du.`)
  const cmp = evPair(c, 'hit', 'double')
  why.push(
    `Verdoppeln lohnt sich nur gegen sehr schwache Dealer-Karten. Gegen ${upLabel(up)} (Bust ${bust}) ist ein normaler Hit besser${cmp ? `: ${cmp}` : ''}.`,
  )
  return { why, principle: 'soft-hit' }
}

function whySurrender(c: Ctx): { why: string[]; principle: PrincipleId } {
  const { total, up } = c
  const why: string[] = []
  const stand = evOf(c, 'stand')
  const hit = evOf(c, 'hit')
  why.push(
    `Mit Hard ${total} gegen ${upLabel(up)} verliert jede Spielweise im Schnitt mehr als die Hälfte des Einsatzes: ${stand !== undefined && hit !== undefined ? `Stand ${fmtEv(stand)}, Hit ${fmtEv(hit)}` : 'Stand und Hit liegen unter −50 %'}.`,
  )
  why.push('Aufgeben (Late Surrender) kostet dich sicher −50 % (halber Einsatz). Das ist hier besser als jede Alternative.')
  why.push('Nach deiner Tabelle gilt das nur für 16 gegen 9, 10 und Ass sowie 15 gegen 10 – bei allen anderen Händen spielst du besser weiter, als aufzugeben.')
  return { why, principle: 'surrender' }
}

const PAIR_REASON: Record<string, (c: Ctx, split: boolean) => string> = {
  'A,A': () =>
    'Als Hand (Soft 12) sind zwei Asse schwach – aber ein einzelnes Ass ist der beste Starter, den es gibt: Mit jeder 10 (30,8 %) wird daraus 21. Du machst aus einer schlechten Hand zwei starke. Gesplittete Asse bekommen nur je eine Karte; 21 zählt dann nicht als Blackjack – trotzdem ist Split gegen jede Karte am besten.',
  '8,8': (c) =>
    `16 ist die schlechteste Hand im Blackjack. Zwei Hände, die mit einer 8 starten, sind deutlich besser – mit einer 3 oder 2 werden daraus 11 bzw. 10 und du kannst verdoppeln.${c.stats.strength === 'stark' ? ` Selbst gegen ${upLabel(c.up)} verlierst du mit Split weniger als mit Hit oder Stand.` : ' Gegen schwache Dealer-Karten profitierst du außerdem doppelt vom Dealer-Bust.'}`,
  'T,T': () =>
    'Hard 20 ist die zweitbeste Hand und schlägt fast alles. Beim Split gibst du eine fast sichere Gewinnerhand her und tauschst sie gegen zwei Hände mit einer 10, die im Schnitt schlechter als 20 sind. Selbst gegen eine 6 ist Stehen besser.',
  '5,5': (c) =>
    `Zwei Fünfer ergeben Hard 10 – eine der besten Double-Hände. Als zwei einzelne 5er wären es zwei schwache Starter. Spiele sie wie eine 10: ${c.rec.action === 'double' ? `Gegen ${upLabel(c.up)} ist Double richtig.` : `Gegen ${upLabel(c.up)} ist die 10 nur ein Hit (zu viele starke Dealer-Hände).`}`,
  '4,4': (c, split) =>
    split
      ? `Gegen ${upLabel(c.up)} bustet der Dealer am häufigsten (${pct(c.stats.bust)}). Weil du nach dem Split verdoppeln darfst (Double After Split), lohnen sich zwei Hände mit einer 4 knapp.`
      : `Hard 8 ist zwar schwach, aber zwei Hände mit einer 4 sind nicht besser: Du kannst mit Hit nicht busten und holst dir kostenlos eine Karte. Nur gegen 5 und 6 lohnt sich der Split (mit Double After Split).`,
  '9,9': (c, split) => {
    if (split) {
      if (c.up === '8') {
        return `Gegen die 8 endet der Dealer oft genau auf 18 (${pct(c.stats.totals[1])}) – deine feste 18 bringt dann nur einen Push. Zwei Hände, die mit einer 9 starten, werden mit einer 10 (30,8 %) zur 19 und schlagen die 18.`
      }
      if (c.up === '9') {
        return `Gegen die 9 endet der Dealer oft auf 19 (${pct(c.stats.totals[2])}) – deine feste 18 verliert dann. Zwei Hände, die mit einer 9 starten, haben je mit einer 10 (30,8 %) die Chance auf eine 19 und mit einem Ass auf eine Soft 20.`
      }
      return `Gegen ${upLabel(c.up)} (Bust ${pct(c.stats.bust)}) holst du mit zwei Händen, die mit einer 9 starten, mehr heraus als mit einer festen 18 – du nutzt den Dealer-Bust doppelt.`
    }
    return c.up === '7'
      ? `Gegen die 7 endet der Dealer am häufigsten mit genau 17 (${pct(c.stats.totals[0])}) – deine 18 schlägt ihn bereits. Zwei Hände mit einer 9 würden das nur verwässern.`
      : `Gegen ${upLabel(c.up)} ist der Dealer zu stark für zwei Hände, die mit einer 9 starten. Die feste 18 ist besser.`
  },
  '7,7': (c, split) =>
    split
      ? `Hard 14 ist schwach. Gegen ${upLabel(c.up)} (${c.stats.strength}, Bust ${pct(c.stats.bust)}) lohnt sich der Split: Zwei Hände, die mit einer 7 starten, nutzen den Dealer-Bust besser als eine 14.`
      : `Gegen ${upLabel(c.up)} (${c.stats.strength}) ist der Dealer zu stark: Zwei Hände mit einer 7 würden beide häufig verlieren. Eine Hand zu spielen und zu ziehen kostet weniger.`,
  '6,6': (c, split) =>
    split
      ? `Hard 12 ist schwach. Gegen ${upLabel(c.up)} (Bust ${pct(c.stats.bust)}) machst du daraus lieber zwei Hände mit einer 6${c.up === '2' ? ' – gegen die 2 nur, weil Double After Split erlaubt ist' : ''}.`
      : `Gegen ${upLabel(c.up)} ist der Dealer zu stark für zwei Hände mit einer 6. Ziehen mit der 12 ist besser.`,
  '3,3': (c, split) => smallPair(c, split, 6),
  '2,2': (c, split) => smallPair(c, split, 4),
}

function smallPair(c: Ctx, split: boolean, total: number): string {
  if (split) {
    return `Eine ${total} ist eine winzige Hand. Gegen ${upLabel(c.up)} (${c.stats.strength}, Bust ${pct(c.stats.bust)}) startest du lieber zwei Hände und baust aus kleinen Karten auf${c.up === '2' || c.up === '3' ? ' – gegen 2 und 3 nur, weil Double After Split erlaubt ist' : ''}.`
  }
  return `Gegen ${upLabel(c.up)} (${c.stats.strength}) ist der Dealer zu stark für zwei Hände mit so kleinen Karten. Eine Hand ziehen kostet weniger.`
}

function whyPair(c: Ctx): { why: string[]; principle: PrincipleId } {
  const row = c.cell.row
  const split = c.rec.action === 'split'
  const why: string[] = []
  const reason = PAIR_REASON[row]?.(c, split)
  if (reason) why.push(reason)

  const e = c.ev
  if (e && e.split !== undefined) {
    const alts = (['stand', 'hit', 'double'] as const).filter((a) => e[a] !== undefined)
    const best = alts.reduce((b, a) => (e[a]! > e[b]! ? a : b), alts[0])
    if (split) {
      why.push(`In Zahlen: Split ${fmtEv(e.split)} – besser als die beste Alternative (${actionName(best)} ${fmtEv(e[best]!)}).`)
    } else {
      const chosen = c.rec.action
      why.push(
        `In Zahlen: Split würde ${fmtEv(e.split)} bringen – ${actionName(chosen)} ist mit ${fmtEv(e[chosen] ?? e[best]!)} besser.`,
      )
    }
  }

  let principle: PrincipleId
  if (row === 'A,A' || row === '8,8') principle = 'split-aces-eights'
  else if (row === 'T,T' || row === '5,5' || (row === '4,4' && !split)) principle = 'never-split'
  else if (row === '9,9') principle = 'nines'
  else principle = 'split-weak-dealer'
  return { why, principle }
}

// ---------------------------------------------------------------------------
// Warum der gewählte Zug schlechter war

function whyNot(e: PlayEvaluation, c: Ctx): string {
  const chosen = e.chosen
  const rec = e.recommendation.action
  const cEv = chosen === 'surrender' ? -0.5 : c.ev?.[chosen]
  const rEv = rec === 'surrender' ? -0.5 : c.ev?.[rec]
  const parts: string[] = []

  if (cEv !== undefined && rEv !== undefined && cEv > rEv + 0.0005) {
    // Rechnerisch (minimal) besser als die Tabelle – die Tabelle bleibt aber maßgeblich.
    return `${actionName(chosen)} bringt rechnerisch ${fmtEv(cEv)}, ${actionName(rec)} laut Tabelle ${fmtEv(rEv)} – der Unterschied ist winzig (${per100(cEv - rEv)}). Deine Strategie-Tabelle sieht trotzdem ${actionName(rec)} vor, deshalb zählt es als Abweichung.`
  }

  if (cEv !== undefined && rEv !== undefined) {
    parts.push(
      `${actionName(chosen)} bringt im Schnitt ${fmtEv(cEv)}, ${actionName(rec)} dagegen ${fmtEv(rEv)}. Über viele Hände kostet dich der falsche Zug ${per100(rEv - cEv)}.`,
    )
    if (rEv - cEv < 0.01) parts.push('Der Unterschied ist hier winzig – ein Grenzfall. Trotzdem lohnt es sich, die Tabelle exakt zu lernen, weil sich solche Kleinigkeiten über viele Hände summieren.')
  }

  switch (chosen) {
    case 'hit':
      if (!c.soft && c.hitBust >= 0.3) parts.push(`Beim Hit bustest du hier in ${pct(c.hitBust)} sofort.`)
      else if (c.soft) parts.push('Mit dieser Soft Hand riskierst du zwar keinen Bust, verschenkst aber eine bessere Option.')
      break
    case 'stand':
      if (c.total < 17 && !c.soft)
        parts.push(`Mit ${c.total} gewinnst du beim Stehen nur, wenn der Dealer busted – bei ${upLabel(c.up)} passiert das in ${pct(c.stats.bust)} der Fälle.`)
      break
    case 'double':
      parts.push('Double verdoppelt Gewinn UND Verlust. Das lohnt sich nur, wenn dein Vorteil groß genug ist – hier ist er es nicht.')
      break
    case 'split':
      parts.push('Zwei Hände gleichzeitig zu spielen verdoppelt dein Risiko. Gegen diese Dealer-Karte bringt das weniger als eine Hand zu spielen.')
      break
    case 'surrender':
      parts.push('Aufgeben wirft sicher die Hälfte des Einsatzes weg. Hier ist die Hand besser spielbar als −50 %.')
      break
  }
  if (rec === 'surrender') parts.push('Hit und Stand liegen hier beide unter −50 % – deshalb ist Aufgeben die billigste Lösung.')
  if (rec === 'split' && chosen !== 'split') parts.push('Gerade bei diesem Paar ist die Hand als Ganzes schwächer als zwei einzelne Starter.')
  return parts.join(' ')
}

// ---------------------------------------------------------------------------
// Insurance / Even Money

export function explainInsurance(e: InsuranceEvaluation): InsuranceExplanation {
  const stats = dealerInfo('A')
  const pBj = DEALER_STATS['A'].blackjack
  const why: string[] = []
  const notes: string[] = []
  const evInsurance = 3 * pBj - 1

  if (e.evenMoney) {
    why.push(
      'Even Money ist dieselbe Wette wie Insurance: Du tauschst deinen Blackjack (3:2) gegen sichere 1:1, wenn der Dealer ein Ass zeigt.',
    )
    why.push(
      `Lehnst du ab, bekommst du in ${pct(1 - pBj, 1)} der Fälle 3:2 (= 150 % Gewinn) und in ${pct(pBj, 1)} einen Push (= 0 % Gewinn). Im Schnitt ergibt das ${pct((1 - pBj) * 1.5, 1)} Gewinn auf deinen Einsatz – Even Money garantiert nur 100 %. Ablehnen ist besser.`,
    )
  } else {
    why.push('Insurance ist eine Nebenwette über den halben Einsatz, dass die verdeckte Karte eine 10 ist (Dealer-Blackjack). Sie zahlt 2:1.')
    why.push(
      `Fair wäre das bei einer Chance von 1/3 (33,3 %). Im 6-Deck-Schuh sind aber nur 96 von 311 unbekannten Karten Zehnerwerte – das sind ${pct(pBj, 1)}.`,
    )
    why.push(`Die Wette verliert deshalb im Schnitt ${pct(-evInsurance, 1)} ihres Einsatzes. Mal geht sie auf, langfristig bleibt immer ein Minus.`)
  }
  if (!e.correct) notes.push('Auch wenn der Dealer tatsächlich Blackjack hat: Entscheidend ist der Durchschnitt über viele Hände, nicht dieses eine Ergebnis.')

  return {
    kind: 'insurance',
    correct: e.correct,
    headline: e.correct ? 'Richtig – kein Insurance!' : 'Nicht optimal – nie Insurance',
    situation: `${describeHand(e.cards)} gegen Dealer Ass${e.evenMoney ? ' (du hast Blackjack: „Even Money“ wird angeboten)' : ''}`,
    why,
    notes,
    principle: 'insurance',
    secondary: [],
    dealer: stats,
    evRows: [],
  }
}

export function explain(e: Evaluation): Explanation {
  return e.kind === 'play' ? explainPlay(e) : explainInsurance(e)
}
