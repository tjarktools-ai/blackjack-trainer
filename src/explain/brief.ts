import type { Explanation, PlayExplanation } from './explain'
import { actionName, fmtEv, pct, upLabel } from './format'

/** Kurzer, nicht unterbrechender Hinweis für den Spaß-Modus (1–2 Sätze). */
export interface Brief {
  ok: boolean
  title: string
  text: string
}

function reason(x: PlayExplanation): string {
  const up = upLabel(x.dealer.up)
  const bust = pct(x.dealer.bust)
  const { total, hitBust, row } = x.facts
  const rec = x.recommended
  switch (x.principle) {
    case 'stand-vs-weak':
      return `Dealer ${up} bustet in ${bust} – lass ihn ziehen, ein Hit würde dich in ${pct(hitBust)} selbst busten.`
    case 'hit-vs-strong':
      return `Dealer ${up} bustet nur in ${bust}, mit ${total} verliert Stehen öfter als Ziehen.`
    case 'twelve':
      return rec === 'hit'
        ? `Mit 12 bustet ein Hit nur in ${pct(hitBust)}, der Dealer ${up} bustet nur in ${bust} – zu selten zum Warten.`
        : `Dealer ${up} bustet in ${bust} – genug, um mit der 12 zu warten.`
    case 'seventeen':
      return `Ab 17 würde dich jeder Hit in ${pct(hitBust)} der Fälle busten.`
    case 'free-hit':
      return `Mit ${total} kannst du nicht busten – eine Karte kostet nichts.`
    case 'double-strong':
      return rec === 'double'
        ? `Starke Ausgangslage (${total}) gegen Dealer ${up} – hier setzt du mehr ein.`
        : `Gegen Dealer ${up} ist dein Vorteil für Double zu klein.`
    case 'soft-double':
      return `Soft ${total} kann nicht busten und Dealer ${up} bustet in ${bust} – verdoppeln.`
    case 'soft-hit':
      return `Soft ${total} reicht gegen ${up} nicht, und Ziehen kann dich nicht busten.`
    case 'soft-stand':
      return `Soft ${total} ist gegen ${up} stark genug – nicht riskieren.`
    case 'split-aces-eights':
      return row === 'A,A' ? 'Zwei Asse sind zwei starke Starthände.' : '16 ist die schlechteste Hand – zwei 8er-Hände verlieren weniger.'
    case 'never-split':
      return row === 'T,T' ? '20 gewinnt fast immer – nicht auseinandernehmen.' : row === '5,5' ? 'Zwei Fünfer sind eine 10 – spiele sie als Double-Hand.' : '8 ist zu schwach für zwei Hände.'
    case 'split-weak-dealer':
      return rec === 'split' ? `Gegen Dealer ${up} (Bust ${bust}) lohnen sich zwei Hände.` : `Gegen Dealer ${up} wären zwei schwache Hände zu riskant.`
    case 'nines':
      return rec === 'split' ? `Zwei 9er starten gegen ${up} besser als eine feste 18.` : `Die feste 18 ist gegen ${up} besser als zwei Hände.`
    case 'surrender':
      return 'Hit und Stand verlieren hier im Schnitt mehr als 50 % – Aufgeben ist billiger.'
    default:
      return x.why[0] ?? ''
  }
}

export function briefExplanation(x: Explanation): Brief {
  if (x.kind === 'insurance') {
    return {
      ok: x.correct,
      title: x.correct ? '✓ Kein Insurance – richtig' : '✗ Besser: kein Insurance',
      text: 'Insurance zahlt 2:1, bräuchte aber 33,3 % Dealer-Blackjack – es sind nur 30,9 %.',
    }
  }
  const rec = x.evRows.find((r) => r.recommended)
  const chosen = x.evRows.find((r) => r.chosen)
  const alt = x.evRows.filter((r) => !r.recommended).sort((a, b) => b.ev - a.ev)[0]
  let numbers = ''
  if (rec && x.correct && alt) numbers = ` Ø-Ergebnis: ${actionName(rec.action)} ${fmtEv(rec.ev)}, beste Alternative ${actionName(alt.action)} ${fmtEv(alt.ev)}.`
  if (rec && !x.correct && chosen) numbers = ` Ø-Ergebnis: ${actionName(rec.action)} ${fmtEv(rec.ev)} statt ${actionName(chosen.action)} ${fmtEv(chosen.ev)}.`
  const fallback = x.notes.find((n) => n.startsWith('Die Tabelle sagt')) ? ' (Double geht jetzt nicht mehr.)' : ''
  return {
    ok: x.correct,
    title: x.correct ? `✓ ${actionName(x.recommended)} – richtig${fallback}` : `✗ Besser: ${actionName(x.recommended)}${fallback} (du: ${actionName(x.chosen)})`,
    text: reason(x) + numbers,
  }
}
