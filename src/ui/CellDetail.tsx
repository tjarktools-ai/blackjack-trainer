import { useMemo } from 'react'
import { cellKey, type CellRef } from '../engine/types'
import { explainCell } from '../explain/cellExplain'
import { cellStatus, useStats } from '../state/statsStore'
import { ExplanationBody } from './Explainer'

const STATUS_TEXT = {
  unseen: 'noch nicht gesehen',
  learning: 'wird gelernt',
  weak: 'schwach – hier machst du noch Fehler',
  mastered: 'gemeistert',
} as const

/** Erklärung für ein einzelnes Tabellenfeld (aus Tabelle oder Heatmap geöffnet). */
export function CellDetail({ cell, onClose }: { cell: CellRef; onClose: () => void }) {
  const x = useMemo(() => explainCell(cell), [cell])
  const stat = useStats((s) => s.cells[cellKey(cell)])
  const status = cellStatus(stat)
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Feld erklärt" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '86dvh' }}>
        <div className="sheet-scroll">
          <div className="verdict">
            <div className="icon" style={{ fontSize: 16 }}>
              {x.tableCode}
            </div>
            <div>
              <h2>{x.tableCell}</h2>
              <p>
                Richtig: <strong style={{ color: 'var(--text)' }}>{x.tableCodeText}</strong>
              </p>
            </div>
          </div>
          <div className="pill-row">
            <span className="pill">Status: {STATUS_TEXT[status]}</span>
            {stat && (
              <span className="pill">
                {stat.correct} von {stat.attempts} richtig
              </span>
            )}
          </div>
          <ExplanationBody x={x} showVerdict={false} />
        </div>
        <div className="sheet-foot">
          <button className="btn primary" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}
