import type { CellRef } from '../engine/types'

/**
 * Die Kernideen hinter der Basic Strategy. Jedes Feld der Tabelle verweist auf eines
 * dieser Prinzipien – so lernt man das WARUM statt Zahlen auswendig.
 */
export type PrincipleId =
  | 'dealer-upcard'
  | 'stand-vs-weak'
  | 'hit-vs-strong'
  | 'twelve'
  | 'seventeen'
  | 'free-hit'
  | 'double-strong'
  | 'soft-double'
  | 'soft-hit'
  | 'soft-stand'
  | 'split-aces-eights'
  | 'never-split'
  | 'split-weak-dealer'
  | 'nines'
  | 'surrender'
  | 'insurance'
  | 'fallback-double'
  | 'decision-vs-result'

export interface QuizDef {
  question: string
  right: string
  wrong: [string, string]
}

export interface Principle {
  id: PrincipleId
  title: string
  /** Merksatz (1–2 Sätze) */
  rule: string
  /** Ausführliche Erklärung für den Lernbereich */
  body: string[]
  quiz: QuizDef
  /** Beispiel-Felder für den Lernbereich */
  examples: CellRef[]
}

const cell = (category: CellRef['category'], row: string, dealer: CellRef['dealer']): CellRef => ({ category, row, dealer })

export const PRINCIPLES: Record<PrincipleId, Principle> = {
  'dealer-upcard': {
    id: 'dealer-upcard',
    title: 'Die Dealer-Karte entscheidet alles',
    rule: 'Dealer-Karten 2–6 sind schwach (er bustet oft), 7 bis Ass sind stark. Deine Hand spielst du immer gegen diese eine Karte.',
    body: [
      'Der Dealer hat keine Wahl: Er muss ziehen, bis er mindestens 17 hat (hier zieht er sogar auf Soft 17). Genau das macht ihn angreifbar.',
      'Zeigt er eine 2 bis 6, steht er – wenn man die verdeckte Karte als Zehner annimmt (die häufigste Karte) – auf 12 bis 16. Er MUSS ziehen und bustet dabei in 36–44 % der Fälle.',
      'Zeigt er 7, 8, 9, 10 oder Ass, hat er schon fast fertig oder liegt weit vorn. Dann bustet er nur noch in 20–26 % der Fälle.',
      'Fast jede Entscheidung der Tabelle folgt aus dieser einen Frage: Wie wahrscheinlich ist es, dass der Dealer busted?',
    ],
    quiz: {
      question: 'Warum gilt die Dealer-6 als „schwach“?',
      right: 'Mit einer 6 kommt der Dealer oft auf 12–16, muss ziehen und bustet dabei besonders häufig.',
      wrong: [
        'Weil 6 eine kleine Karte ist und der Dealer damit nie 21 erreichen kann.',
        'Weil der Dealer bei einer 6 immer eine zweite Karte ziehen muss, egal wie hoch.',
      ],
    },
    examples: [cell('hard', '13', '6'), cell('hard', '16', '7')],
  },
  'stand-vs-weak': {
    id: 'stand-vs-weak',
    title: 'Gegen schwache Karten stehen (Hard 13–16 gegen 2–6)',
    rule: 'Hast du 13–16 und der Dealer zeigt 2–6: Stand. Du musst nichts riskieren – der Dealer muss ziehen und bustet oft.',
    body: [
      'Mit Hard 13–16 bist du in einer schlechten Hand. Ziehst du, bustest du oft selbst (rund 38 % bei 13, 46 % bei 14, 54 % bei 15 und 62 % bei 16).',
      'Gegen eine schwache Dealer-Karte musst du das nicht tun: Der Dealer steht unter Zugzwang und bustet in rund 36–44 % der Fälle. Du gewinnst, indem du einfach nichts tust.',
      'Faustregel: „Lass den Dealer den Fehler machen.“ Der Dealer-Bust ist dein Gewinn.',
    ],
    quiz: {
      question: 'Warum stehst du mit Hard 15 gegen eine Dealer-5?',
      right: 'Weil der Dealer häufig busted und ein Hit mich mit hoher Wahrscheinlichkeit selbst busten würde.',
      wrong: [
        'Weil ich mit 15 gegen eine 5 normalerweise gewinne, egal was der Dealer zieht.',
        'Weil der Dealer bei einer 5 immer busted.',
      ],
    },
    examples: [cell('hard', '16', '6'), cell('hard', '13', '2'), cell('hard', '12', '5')],
  },
  'hit-vs-strong': {
    id: 'hit-vs-strong',
    title: 'Gegen starke Karten ziehen (Hard 12–16 gegen 7–Ass)',
    rule: 'Gegen 7 bis Ass verlierst du mit 12–16 beim Stehen meistens. Hit bustet oft, verliert aber im Schnitt weniger als Stehen.',
    body: [
      'Gegen 7, 8, 9, 10 oder Ass kommt der Dealer sehr oft auf 17 oder mehr. Mit 12–16 gewinnst du beim Stehen nur, wenn er busted – und das passiert hier nur in 20–26 % der Fälle.',
      'Ziehst du, bustest du zwar häufig, aber du bekommst auch die Chance auf eine konkurrenzfähige Hand (17–21). Im Durchschnitt verlierst du dadurch weniger Geld als durch Stehen.',
      'Wichtig: Beide Optionen sind negativ. Es geht nicht darum zu gewinnen, sondern den Verlust klein zu halten.',
    ],
    quiz: {
      question: 'Warum ziehst du mit Hard 14 gegen eine Dealer-10, obwohl du dabei oft bustest?',
      right: 'Weil Stehen noch häufiger verliert – Hit kostet im Durchschnitt weniger.',
      wrong: [
        'Weil ich mit Hit mit 14 fast nie busten kann.',
        'Weil der Dealer mit einer 10 meistens bustet.',
      ],
    },
    examples: [cell('hard', '16', '7'), cell('hard', '14', 'T'), cell('hard', '12', '7')],
  },
  twelve: {
    id: 'twelve',
    title: 'Die 12 ist der Grenzfall',
    rule: 'Hard 12: Hit gegen 2 und 3, Stand gegen 4–6, Hit gegen 7–Ass.',
    body: [
      'Mit 12 bustet ein Hit nur bei einer 10 (rund 31 %) – das ist das geringste Bust-Risiko aller Stiff-Hände. Deshalb ist die 12 die einzige, bei der man gegen eine schwache Karte noch zieht.',
      'Gegen 2 und 3 bustet der Dealer „nur“ in rund 36–38 % der Fälle. Das reicht nicht aus, um mit der 12 zu stehen.',
      'Ab einer Dealer-4 (und 5, 6) steigt der Dealer-Bust auf 40–44 % – jetzt ist Stehen besser.',
    ],
    quiz: {
      question: 'Warum ziehst du mit Hard 12 gegen eine Dealer-3, stehst aber gegen eine 4?',
      right: 'Gegen die 3 bustet der Dealer noch zu selten, ab der 4 lohnt sich das Warten auf seinen Bust.',
      wrong: [
        'Weil man bei 12 gegen eine 3 nicht bustet kann.',
        'Weil der Dealer gegen eine 4 nie 17 erreicht.',
      ],
    },
    examples: [cell('hard', '12', '2'), cell('hard', '12', '3'), cell('hard', '12', '4')],
  },
  seventeen: {
    id: 'seventeen',
    title: 'Ab 17: stehen',
    rule: 'Mit Hard 17 oder mehr bleibst du stehen. Fast jede Karte würde dich busten oder die Hand kaum verbessern.',
    body: [
      'Mit 17 bustet jede Karte ab der 5 – nur Ass, 2, 3 und 4 sind sicher. Ein Hit würde dich in rund 69 % der Fälle sofort busten.',
      'Selbst die beste Karte (eine 4) bringt dich nur auf 21 – das passiert selten, die Busts sind viel häufiger.',
    ],
    quiz: {
      question: 'Warum stehst du mit Hard 17 immer?',
      right: 'Ein Hit würde dich sehr oft busten und selten wirklich verbessern.',
      wrong: [
        'Weil der Dealer mit 17 immer busted.',
        'Weil 17 die höchste Hand ist, die man haben kann.',
      ],
    },
    examples: [cell('hard', '17', 'A'), cell('hard', '17', '7')],
  },
  'free-hit': {
    id: 'free-hit',
    title: 'Bis 8: immer ziehen',
    rule: 'Mit Hard 8 oder weniger kann dich keine Karte busten – also zieh, du hast nichts zu verlieren.',
    body: [
      'Mit einer Hand von 8 oder weniger erreichst du mit einer Karte höchstens 18. Ein Bust ist unmöglich.',
      'Eine zusätzliche Karte kostet dich nichts und verbessert die Hand fast immer. Stehen wäre mit 8 nahezu aussichtslos.',
    ],
    quiz: {
      question: 'Warum ziehst du mit Hard 8 immer?',
      right: 'Weil keine einzelne Karte mich busten kann – ziehen kostet nichts.',
      wrong: [
        'Weil der Dealer mit 8 meistens busted.',
        'Weil 8 eine Glückszahl für Splits ist.',
      ],
    },
    examples: [cell('hard', '8', '6'), cell('hard', '8', '2')],
  },
  'double-strong': {
    id: 'double-strong',
    title: 'Verdoppeln, wenn du der Favorit bist (Hard 9–11)',
    rule: 'Double mit 11, 10 und 9, wenn der Dealer nicht zu stark ist: Die nächste Karte (oft eine 10) macht dich zum Favoriten – dann setzt du mehr ein.',
    body: [
      'Mit Hard 11 ist die nächste Karte in rund 31 % eine 10 → 21. Mit 10 landet jede 10 auf 20, mit 9 auf 19. Das sind sehr starke Hände.',
      'Weil du in diesen Situationen im Schnitt vorn liegst, verdoppelst du den Einsatz: Du holst mehr Geld aus einer guten Ausgangslage.',
      'Die Grenzen: Gegen starke Dealer-Karten (10, Ass bei 10; 7–A bei 9) und die 2 bei 9 ist dein Vorteil zu klein – dort ist ein normaler Hit besser, weil das doppelte Risiko nicht belohnt wird.',
      'Hinweis: Gegen das Ass doppelst du die 11 nur, weil der Dealer hier auf Soft 17 zieht (H17). Das schwächt ihn leicht.',
    ],
    quiz: {
      question: 'Warum verdoppelst du Hard 11 gegen eine Dealer-6?',
      right: 'Weil ich mit einer guten Ausgangslage mehr Geld einsetzen will, wenn ich der Favorit bin.',
      wrong: [
        'Weil man bei 11 nie busten kann und deshalb immer doppeln muss.',
        'Weil der Dealer mit einer 6 immer busted.',
      ],
    },
    examples: [cell('hard', '11', '6'), cell('hard', '10', '9'), cell('hard', '10', 'T'), cell('hard', '9', '2')],
  },
  'soft-double': {
    id: 'soft-double',
    title: 'Soft Hands gegen schwache Dealer verdoppeln',
    rule: 'Mit einem Ass als 11 kannst du nicht busten. Gegen schwache Dealer-Karten verdoppelst du – du hast kein Risiko, aber viel Potenzial.',
    body: [
      'Eine Soft Hand enthält ein Ass, das als 11 zählt. Kommt eine hohe Karte, wird das Ass zur 1 – du bustest nie mit einer einzigen Karte.',
      'Deshalb kannst du gegen schwache Dealer-Karten (vor allem 4–6) mutiger spielen: Die zusätzliche Karte nimmt dich nie sofort aus dem Spiel.',
      '„Ds“ bedeutet: Double, aber wenn Double nicht möglich ist, bleib bei Stand – weil Soft 18/19 schon gut genug zum Stehen ist.',
    ],
    quiz: {
      question: 'Warum verdoppelst du A,6 (Soft 17) gegen eine Dealer-5?',
      right: 'Weil ich mit einer Karte nicht busten kann und der Dealer schwach ist – ich setze mehr ein.',
      wrong: [
        'Weil Soft 17 gegen eine 5 die beste Hand am Tisch ist.',
        'Weil man mit Ass immer doppeln muss.',
      ],
    },
    examples: [cell('soft', 'A,6', '5'), cell('soft', 'A,7', '4'), cell('soft', 'A,8', '6')],
  },
  'soft-hit': {
    id: 'soft-hit',
    title: 'Soft Hands: lieber ziehen als stehen',
    rule: 'Soft 17 oder weniger ist schwach – ziehen ist ohne Bust-Risiko. Auch Soft 18 reicht gegen 9, 10 und Ass nicht.',
    body: [
      'Soft 13 bis 17 sind schwache Hände. Weil du mit einer Karte nicht busten kannst, riskierst du wenig – eine weitere Karte kann die Hand aber deutlich verbessern.',
      'Soft 18 (A,7) fühlt sich gut an, ist aber gegen eine 9, 10 oder ein Ass zu schwach: Der Dealer kommt häufig auf 19, 20 oder 21. Mit einem Hit hast du die Chance, selbst auf 19–21 zu kommen – ohne Bust-Risiko.',
      'Gegen schwache Dealer-Karten (4–6) statt Hit zu spielen wäre noch besser: Double (siehe Soft-Double).',
    ],
    quiz: {
      question: 'Warum ziehst du mit A,7 (Soft 18) gegen eine Dealer-10?',
      right: 'Weil 18 gegen eine 10 meistens verliert und ich beim Ziehen nicht busten kann.',
      wrong: [
        'Weil 18 gegen eine 10 sicher gewinnt.',
        'Weil man mit Ass immer ziehen muss.',
      ],
    },
    examples: [cell('soft', 'A,7', 'T'), cell('soft', 'A,6', '2'), cell('soft', 'A,2', '7')],
  },
  'soft-stand': {
    id: 'soft-stand',
    title: 'Soft 19/20 (und Soft 18 gegen 7/8): stehen',
    rule: 'Soft 19 und Soft 20 sind starke Hände – stehen. Soft 18 steht gegen 7 und 8, weil der Dealer dort oft nur 17/18 erreicht.',
    body: [
      'Mit Soft 19 oder 20 hast du bereits eine Spitzenhand. Eine weitere Karte würde sie fast immer verschlechtern.',
      'Soft 18 schlägt die Dealer-17 und ist gegen 7 und 8 (wo der Dealer oft 17 oder 18 macht) gut genug zum Stehen.',
    ],
    quiz: {
      question: 'Warum stehst du mit A,9 (Soft 20)?',
      right: 'Weil 20 eine sehr starke Hand ist und eine Karte sie fast immer schlechter macht.',
      wrong: [
        'Weil man mit Soft-Händen nie ziehen darf.',
        'Weil der Dealer mit Soft 20 automatisch verliert.',
      ],
    },
    examples: [cell('soft', 'A,9', 'T'), cell('soft', 'A,8', '2'), cell('soft', 'A,7', '7')],
  },
  'split-aces-eights': {
    id: 'split-aces-eights',
    title: 'Asse und Achter immer splitten',
    rule: 'A,A und 8,8 splittest du immer – gegen jede Dealer-Karte.',
    body: [
      'Zwei Asse sind als Hand (Soft 12) schwach, aber ein einzelnes Ass ist der beste Starter, den es gibt. Aus einer schlechten Hand machst du zwei sehr gute.',
      '16 (8,8) ist die schlechteste Hand im Blackjack. Mit zwei einzelnen 8ern startest du zwei Hände mit 8 – deutlich besser als eine 16. Selbst gegen eine 10 oder ein Ass verlierst du so weniger als mit Hit oder Stand.',
    ],
    quiz: {
      question: 'Warum splittest du 8,8 sogar gegen eine Dealer-10?',
      right: 'Weil 16 eine sehr schlechte Hand ist und zwei Hände mit 8 im Schnitt weniger verlieren.',
      wrong: [
        'Weil man mit 8,8 gegen eine 10 sicher gewinnt.',
        'Weil der Dealer gegen eine 10 immer busted.',
      ],
    },
    examples: [cell('pair', 'A,A', 'A'), cell('pair', '8,8', 'T'), cell('pair', '8,8', '9')],
  },
  'never-split': {
    id: 'never-split',
    title: 'Nie splitten: Zehner, Fünfer (und Vierer)',
    rule: 'T,T (20) bleibst du stehen, 5,5 (=10) spielst du als Hard 10, 4,4 (=8) ziehst du meistens.',
    body: [
      'Zehner: 20 ist die zweitbeste Hand. Splitten tauscht eine fast sichere Gewinnerhand gegen zwei Hände ein, die im Schnitt schlechter sind.',
      'Fünfer: Zwei Fünfen sind zusammen 10 – eine der besten Double-Hände. Als zwei einzelne 5er wären es zwei schwache Starter.',
      'Vierer: 8 ist zu schwach, um zwei Hände daraus zu machen. Nur gegen 5 und 6 (wenn der Dealer besonders oft busted und Double nach Split erlaubt ist) lohnt sich der Split.',
    ],
    quiz: {
      question: 'Warum splittest du 5,5 nie?',
      right: 'Weil 5,5 zusammen 10 ergibt – eine der stärksten Double-Hände.',
      wrong: [
        'Weil Fünfer als Paar verboten sind.',
        'Weil zwei Fünfer immer gegen den Dealer verlieren.',
      ],
    },
    examples: [cell('pair', 'T,T', '6'), cell('pair', '5,5', '9'), cell('pair', '4,4', '6')],
  },
  'split-weak-dealer': {
    id: 'split-weak-dealer',
    title: 'Kleine Paare gegen schwache Dealer splitten',
    rule: '2,2 / 3,3 / 6,6 / 7,7: Gegen schwache Dealer-Karten splitten, gegen starke ziehen.',
    body: [
      'Kleine Paare ergeben zusammen eine schwache Hand (4–6, 12, 14), die du nicht gern spielst. Gegen eine schwache Dealer-Karte lohnt es sich, daraus zwei Hände zu machen und doppelt vom Dealer-Bust zu profitieren.',
      'Gegen starke Dealer-Karten würdest du zwei schwache Hände gleichzeitig verlieren – dann ist es besser, eine Hand zu spielen und zu ziehen.',
      'Double After Split (hier immer erlaubt) macht Splits gegen 2 und 3 für 2,2 / 3,3 / 6,6 gerade noch attraktiv („Y/N“-Felder).',
    ],
    quiz: {
      question: 'Warum splittest du 7,7 gegen eine Dealer-6, nicht aber gegen eine 8?',
      right: 'Gegen die 6 bustet der Dealer oft, gegen die 8 ist er zu stark für zwei schwache Hände.',
      wrong: [
        'Weil 7,7 gegen eine 6 zusammen 21 ergibt.',
        'Weil der Dealer gegen eine 8 immer ein Ass hat.',
      ],
    },
    examples: [cell('pair', '7,7', '6'), cell('pair', '6,6', '4'), cell('pair', '3,3', '7')],
  },
  nines: {
    id: 'nines',
    title: 'Neunen: splitten – außer gegen 7, 10 und Ass',
    rule: '9,9 splittest du gegen 2–6, 8 und 9. Gegen 7, 10 und Ass bleibst du mit 18 stehen.',
    body: [
      'Die 18 ist eine gute Hand – du splittest sie nur, wenn du daraus im Schnitt mehr herausholst.',
      'Gegen 7 lohnt sich das nicht: Der Dealer endet dort am häufigsten mit genau 17 – deine 18 schlägt ihn bereits.',
      'Gegen 10 und Ass ist der Dealer zu stark: zwei Hände, die mit einer 9 starten, verlieren zu oft. Die 18 behältst du.',
      'Gegen 8 und 9 ist der Dealer dagegen stark genug, dass deine 18 unter Druck steht – zwei Hände, die mit 9 starten, sind dort besser als eine feste 18.',
    ],
    quiz: {
      question: 'Warum splittest du 9,9 gegen eine Dealer-6, bleibst aber gegen eine 7 stehen?',
      right: 'Gegen die 7 endet der Dealer oft auf 17 – meine 18 gewinnt bereits. Gegen die 6 hole ich mit zwei Händen mehr heraus.',
      wrong: [
        'Weil man gegen eine 7 nie splitten darf.',
        'Weil 9,9 gegen eine 7 sicher verliert.',
      ],
    },
    examples: [cell('pair', '9,9', '6'), cell('pair', '9,9', '7'), cell('pair', '9,9', 'T')],
  },
  surrender: {
    id: 'surrender',
    title: 'Aufgeben (Late Surrender)',
    rule: 'Aufgeben kostet sicher 50 %. Du gibst nur auf, wenn jede andere Spielweise im Schnitt mehr als 50 % kostet: 16 gegen 9, 10, Ass und 15 gegen 10.',
    body: [
      'Surrender gibt dir den halben Einsatz zurück: Das Ergebnis ist immer genau −0,5.',
      'Das lohnt sich nur, wenn Hit und Stand beide schlechter als −0,5 sind. Das ist bei Hard 16 gegen 9, 10 und Ass sowie Hard 15 gegen 10 der Fall.',
      'Transparenz: In H17-Spielen wäre Aufgeben zusätzlich bei Hard 15 und 17 gegen Ass sowie bei 8,8 gegen Ass rechnerisch minimal besser (rund 1 %). Deine Tabelle lässt das weg – die App folgt der Tabelle und weist bei diesen Feldern darauf hin.',
      'Late Surrender geht nur als allererste Entscheidung (nach dem Dealer-Peek, vor jedem Hit oder Double) – nach einer Karte oder einem Split nicht mehr.',
    ],
    quiz: {
      question: 'Warum gibst du mit 16 gegen eine Dealer-10 auf?',
      right: 'Weil Hit und Stand im Schnitt mehr als die Hälfte des Einsatzes verlieren – Aufgeben ist günstiger.',
      wrong: [
        'Weil man mit 16 gegen eine 10 immer verliert.',
        'Weil der Dealer gegen eine 10 Blackjack hat.',
      ],
    },
    examples: [cell('surrender', '16', 'T'), cell('surrender', '16', '9'), cell('surrender', '15', 'T')],
  },
  insurance: {
    id: 'insurance',
    title: 'Insurance und Even Money: nie',
    rule: 'Insurance zahlt 2:1, lohnt sich aber nur, wenn der Dealer in mehr als einem Drittel der Fälle Blackjack hat. Es sind nur rund 31 %.',
    body: [
      'Insurance ist eine Nebenwette, dass die verdeckte Karte eine 10 ist (Dealer-Blackjack). Sie zahlt 2:1.',
      'Fair wäre das bei einer Chance von 1/3 (33,3 %). Im 6-Deck-Schuh sind aber nur 96 von 311 unbekannten Karten Zehnerwerte: rund 30,9 %. Die Wette verliert im Schnitt 7,4 % ihres Einsatzes.',
      'Even Money (Insurance, wenn du selbst Blackjack hast) ist dieselbe Wette: Du tauschst die 3:2 gegen sichere 1:1. In rund 69 % der Fälle bekommst du 3:2 – das ist mehr wert als die sichere 1:1.',
    ],
    quiz: {
      question: 'Warum nimmst du keine Insurance, auch nicht mit starker Hand?',
      right: 'Weil die Chance auf einen Dealer-Blackjack (≈ 31 %) kleiner ist als die 33,3 %, die für 2:1 nötig wären.',
      wrong: [
        'Weil man Insurance nur mit einem Blackjack nehmen darf.',
        'Weil der Dealer mit einem Ass nie einen Blackjack hat.',
      ],
    },
    examples: [],
  },
  'fallback-double': {
    id: 'fallback-double',
    title: 'D und Ds, wenn Double nicht möglich ist',
    rule: 'D = Double, sonst Hit. Ds = Double, sonst Stand. Double gibt es nur mit den ersten zwei Karten (und genug Guthaben).',
    body: [
      'Die Tabelle gibt zuerst den besten Zug an. Ist Double (z. B. nach einem Hit) nicht erlaubt, nimmst du den zweitbesten.',
      'Bei D (Hard 9–11, Soft 13–18) ist das Hit, bei Ds (Soft 18/19) Stand.',
    ],
    quiz: {
      question: 'Was bedeutet „Ds“ in der Tabelle?',
      right: 'Double, wenn erlaubt – sonst Stand.',
      wrong: ['Double und danach Stand.', 'Double, wenn erlaubt – sonst Split.'],
    },
    examples: [cell('soft', 'A,7', '2'), cell('soft', 'A,8', '6')],
  },
  'decision-vs-result': {
    id: 'decision-vs-result',
    title: 'Entscheidung ≠ Ergebnis',
    rule: 'Eine Entscheidung ist richtig, wenn sie im Schnitt (über viele Hände) am besten ist – nicht, wenn die nächste Karte passt.',
    body: [
      'Auch der beste Zug verliert oft. 16 gegen 10 aufzugeben ist immer richtig – selbst wenn du mit Hit zufällig eine 5 gezogen hättest.',
      'Die App bewertet deshalb die Entscheidung und nicht das Ergebnis. Nur so trainierst du, was langfristig zählt.',
    ],
    quiz: {
      question: 'Du ziehst mit 16 gegen eine 10 und ziehst zufällig eine 5 (= 21). War der Hit richtig?',
      right: 'Nein. Im Schnitt ist Aufgeben besser; dass die Karte gepasst hat, war Glück.',
      wrong: ['Ja, denn ich habe gewonnen.', 'Ja, weil man mit 16 immer ziehen muss.'],
    },
    examples: [],
  },
}

export const PRINCIPLE_ORDER: PrincipleId[] = [
  'dealer-upcard',
  'stand-vs-weak',
  'hit-vs-strong',
  'twelve',
  'seventeen',
  'free-hit',
  'double-strong',
  'soft-double',
  'soft-hit',
  'soft-stand',
  'split-aces-eights',
  'never-split',
  'split-weak-dealer',
  'nines',
  'surrender',
  'insurance',
  'fallback-double',
  'decision-vs-result',
]
