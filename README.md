# BJ Trainer – Blackjack Basic Strategy lernen

Mobile-first PWA: Du spielst Blackjack mit Spielgeld wie an einem echten Tisch und lernst die Basic Strategy –
**nicht nur auswendig, sondern mit Erklärung, warum jeder Zug richtig ist.**

## Funktionen

- **Spiel im Stake-Look** (dunkel + Neon-Grün): Chips setzen, Hit / Stand / Double / Split / Surrender, Insurance.
- **Realistische Regeln** (exakt passend zur Tabelle): 6 Decks, Dealer zieht auf Soft 17 (H17), Dealer-Peek,
  Blackjack 3:2, Double After Split, Late Surrender, Split bis 4 Hände, Asse nur 1 Karte.
  Schuh mit echtem Zufall (`crypto.getRandomValues`, Fisher-Yates) und Cut Card bei ca. 75 %.
- **Feedback nach jedem Zug:** richtig/falsch + Begründung – auch bei richtigen Zügen.
  - exakter **Erwartungswert (EV) aller Optionen** (Balken),
  - Erklärung aus Dealer-Bust-Wahrscheinlichkeit, deinem Bust-Risiko usw.,
  - „Warum war mein Zug schlechter?“, Merksatz, Dealer-Endverteilung,
  - optional ein **„Warum?“-Quiz** (Multiple Choice) zur Kernidee hinter dem Feld.
- **Lernbereich:** 18 Prinzipien hinter der Tabelle + die Tabelle selbst – jedes Feld antippen erklärt es.
- **Fortschritt:** „Strategie beherrscht“ in % (284 Tabellenfelder), Trefferquote, Serie, Heatmap der Tabelle,
  Problemfelder, Quiz-Verständnis, Guthabenverlauf.
- **Austeil-Modus** (umschaltbar direkt am Tisch): **Realistisch** (Karten wie am echten Tisch), **Lern-Deal**
  (bevorzugt Felder, die du noch nicht sicher kannst) und **Schwer** (nur knappe Entscheidungen, z. B. Soft 18
  gegen 2, 12 gegen 4, 16 gegen 10 – ein Feld gilt als schwer, wenn der Tabellenzug weniger als 8 % des Einsatzes
  besser ist als die beste Alternative; aktuell 83 von 284 Feldern).
- Alle Wahrscheinlichkeiten und Durchschnittsergebnisse werden als Prozent angezeigt (z. B. 33,3 %).
- **PWA:** installierbar, läuft offline, Daten bleiben lokal (Backup per Export/Import).

## Die Strategie-Tabelle

Die Tabelle aus dem Screenshot (Blackjack Apprenticeship) liegt 1:1 in `src/engine/strategyTables.ts`.
Hinweise (siehe auch Lernbereich → Surrender):

- Die Felder A,8 gegen 6 = Ds, 11 gegen Ass = D, A,7 gegen 2 = Ds sind **H17**-Felder.
- Die Surrender-Felder (16 gegen 9/10/Ass, 15 gegen 10) entsprechen der S17-Variante. In H17-Spielen wäre
  Aufgeben zusätzlich bei **15 und 17 gegen Ass** und bei **8,8 gegen Ass** rechnerisch minimal besser
  (ca. 1 % Einsatz). Die App folgt der Tabelle und weist bei diesen Feldern darauf hin.

## Wie sicher sind die Zahlen?

| Prüfung | Ergebnis |
| --- | --- |
| Exakter EV-Solver (kartenzusammensetzungsabhängig, 6 Decks, H17, DAS, LS, Peek) vs. Tabelle | **0 Abweichungen in allen 280 Feldern** |
| Simulation: 30.000.000 Runden mit perfekter Strategie gegen die echte Engine | Hausvorteil **0,562 % ± 0,041 %** (erwartet ≈ 0,5 %) |
| Unit-Tests (Strategie, Runden, Split, Insurance, Erklärungen, Lern-Deal) | siehe `npm test` |

Details: `docs/simulation-30M.txt`.

## Entwickeln

```bash
npm install
npm run dev          # Entwicklungsserver
npm test             # Tests
npm run build        # Produktions-Build (inkl. Service Worker)
npm run compute-ev   # EV-Tabelle neu berechnen (src/data/evData.generated.ts, ca. 30 s)
npm run simulate -- 2000000   # Hausvorteil mit perfekter Strategie messen
```

Technik: React 19, TypeScript, Vite, Zustand, vite-plugin-pwa, Vitest.

## Als App aufs iPhone

Seite in **Safari** öffnen → Teilen → **„Zum Home-Bildschirm“**.

## Deployment (GitHub Pages)

Der Workflow `.github/workflows/deploy.yml` baut und veröffentlicht bei jedem Push auf `main`.
In den Repository-Einstellungen unter *Pages* als Quelle **GitHub Actions** wählen.
