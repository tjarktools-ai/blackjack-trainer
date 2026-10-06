import { useState } from 'react'
import { useGame, type Feedback } from '../state/gameStore'
import { rankLabel } from '../explain/format'
import { ExplanationBody } from './Explainer'

const SUIT: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }

function SheetContent({ feedback }: { feedback: Feedback }) {
  const dismiss = useGame((s) => s.dismissFeedback)
  const answerQuiz = useGame((s) => s.answerQuiz)
  const [collapsed, setCollapsed] = useState(false)

  const { explanation: x, quiz, evaluation } = feedback
  const waitingForQuiz = quiz && quiz.answered === null
  const drawn = evaluation.kind === 'play' ? evaluation.drawn : undefined
  const after = evaluation.kind === 'play' ? evaluation.totalAfter : undefined

  return (
    <div className="sheet-backdrop top-peek" role="dialog" aria-modal="true" aria-label="Bewertung deines Zugs">
      <div className={`sheet ${x.correct ? 'ok' : 'bad'}${collapsed ? ' collapsed' : ''}`}>
        <button className="sheet-handle" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? 'Erklärung zeigen ▴' : 'Tisch ansehen ▾'}
        </button>
        <div className="sheet-scroll">
          {drawn && (
            <div className="pill-row">
              <span className="pill">
                Gezogen: {rankLabel(drawn.rank)}
                {SUIT[drawn.suit]}
                {after !== undefined ? (after > 21 ? ` · Bust (${after})` : ` · neue Summe ${after}`) : ''}
              </span>
            </div>
          )}

          <ExplanationBody x={x} />

          {quiz && (
            <div className="block">
              <h3>Verständnis-Check</h3>
              <div className="quiz">
                <div className="quiz-q">{quiz.question}</div>
                {quiz.options.map((o, i) => {
                  const state = quiz.answered === null ? '' : o.correct ? 'right' : quiz.answered === i ? 'wrong' : ''
                  return (
                    <button key={i} className={`quiz-opt ${state}`} onClick={() => answerQuiz(i)} disabled={quiz.answered !== null}>
                      {o.text}
                    </button>
                  )
                })}
                {quiz.answered !== null && (
                  <p className="caption">
                    {quiz.options[quiz.answered].correct ? 'Genau – das ist der Grund.' : 'Nicht ganz – die grün markierte Antwort ist der eigentliche Grund.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="sheet-foot">
          <button className="btn primary" onClick={() => void dismiss()}>
            {waitingForQuiz ? 'Quiz überspringen & weiter' : 'Weiter'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function FeedbackSheet() {
  const feedback = useGame((s) => s.feedback)
  if (!feedback) return null
  // key: pro Zug neuer Zustand (eingeklappt/ausgeklappt, Scroll-Position)
  return <SheetContent key={feedback.evaluation.cards.map((c) => c.id).join('-') + feedback.explanation.headline} feedback={feedback} />
}
