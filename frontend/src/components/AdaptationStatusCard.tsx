import React, { useState } from 'react';
import { Sparkles, Check, RotateCcw, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { AdaptationDecision, InferenceRecord } from '../api';

interface AdaptationStatusCardProps {
  latestDecision?: AdaptationDecision | null;
  latestInference?: InferenceRecord | null;
  onOpenEvidence: () => void;
  onUndoAdaptation?: () => void;
}

export const AdaptationStatusCard: React.FC<AdaptationStatusCardProps> = ({
  latestDecision,
  latestInference,
  onOpenEvidence,
  onUndoAdaptation,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [undone, setUndone] = useState(false);

  // Check if an active adaptation decision was made
  const hasActiveAdaptation =
    !undone &&
    latestDecision &&
    latestDecision.action !== 'NO_ACTION';

  return (
    <div className="calm-panel" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: hasActiveAdaptation ? '#f59e0b' : '#10b981',
            }}
          />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Flowstate Workspace Response
          </span>
        </div>

        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6b7280',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <span>Adaptation History</span>
          {historyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {hasActiveAdaptation ? (
        <div
          style={{
            padding: '1rem',
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--amber-alert)' }}>
              {latestDecision.action === 'PACING_ADJUSTMENT'
                ? 'Pacing Adjustment Active'
                : 'Focus Mode Active'}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Interaction cadence and sustained duration indicated elevated fatigue. Interface visual
              density conservatively reduced.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setUndone(true);
                if (onUndoAdaptation) onUndoAdaptation();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                background: 'var(--bay-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '5px',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} />
              <span>Undo</span>
            </button>
            <button
              onClick={onOpenEvidence}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--laser-violet)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Why?
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '1rem',
            background: 'var(--bay-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Workspace Unchanged
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Current behavioral signals do not indicate a need for adaptation. Flowstate leaves your
              workspace completely undisturbed.
            </p>
          </div>

          <button
            onClick={onOpenEvidence}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--laser-violet)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>View evidence →</span>
          </button>
        </div>
      )}

      {/* Expandable Adaptation History Log */}
      {historyOpen && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #161823' }}>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Recent Decision Log
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', padding: '4px 0' }}>
              <span>18:42 — Workspace unchanged (Signals nominal)</span>
              <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>Confidence: 0.82</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', padding: '4px 0' }}>
              <span>18:38 — Workspace unchanged (Signals nominal)</span>
              <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>Confidence: 0.80</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', padding: '4px 0' }}>
              <span>18:32 — Session initialized (Baseline calibration)</span>
              <span style={{ color: '#6366f1', fontFamily: 'var(--font-mono)' }}>Confidence: 0.75</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
