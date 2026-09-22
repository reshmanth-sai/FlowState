import React, { useState } from 'react';
import {
  Clock,
  ChevronRight,
  Calendar,
  CheckCircle,
  FileText,
  Download,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { Session, InferenceRecord, SignalWindow, FeatureVector, AdaptationDecision } from '../api';
import { SessionReview } from './SessionReview';

interface HistoryViewProps {
  sessions: Session[];
  activeSession: Session | null;
  windows?: SignalWindow[];
  features?: FeatureVector[];
  inferences?: InferenceRecord[];
  interventions?: AdaptationDecision[];
  onSelectSession: (session: Session) => void;
  onInspectEvidence: (id?: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  activeSession,
  windows = [],
  features = [],
  inferences = [],
  interventions = [],
  onSelectSession,
  onInspectEvidence,
}) => {
  const [selectedSessionForReview, setSelectedSessionForReview] = useState<Session | null>(null);

  if (selectedSessionForReview) {
    return (
      <div style={{ padding: '1rem 0' }}>
        <div style={{ padding: '0 2rem 1rem', maxWidth: '1280px', margin: '0 auto' }}>
          <button
            onClick={() => setSelectedSessionForReview(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}
          >
            ← Back to All Sessions
          </button>
        </div>
        <SessionReview
          session={selectedSessionForReview}
          windows={windows}
          features={features}
          inferences={inferences}
          interventions={interventions}
          onSelectInference={(id) => onInspectEvidence(id)}
        />
      </div>
    );
  }

  return (
    <div className="product-container">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Session History
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Chronological log of observed tasks, interaction patterns, and workspace adaptation outcomes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => {
                if (activeSession) setSelectedSessionForReview(activeSession);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: 'var(--bay-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <FileText size={13} />
              <span>Full Audit Dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Session Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sessions.length === 0 ? (
          <div className="calm-panel" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No sessions found in storage.</p>
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = activeSession?.id === s.id;
            const isRunning = s.status === 'RUNNING';
            const dateStr = s.started_at
              ? new Date(s.started_at).toLocaleString()
              : s.created_at
              ? new Date(s.created_at).toLocaleString()
              : 'Unknown time';

            return (
              <div
                key={s.id}
                onClick={() => {
                  onSelectSession(s);
                  setSelectedSessionForReview(s);
                }}
                className="calm-panel"
                style={{
                  cursor: 'pointer',
                  borderLeft: isActive
                    ? '4px solid #10b981'
                    : isRunning
                    ? '4px solid var(--laser-violet)'
                    : '4px solid var(--border-hairline)',
                  background: isActive ? 'var(--bay-elevated)' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      background: 'var(--bay-elevated)',
                      border: '1px solid var(--border-hairline)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isRunning ? 'var(--phosphor-jade)' : 'var(--text-muted)',
                    }}
                  >
                    {isRunning ? <CheckCircle size={20} /> : <Clock size={20} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        {s.id}
                      </span>
                      {isActive && <span className="badge-chip badge-pass">ACTIVE IN UI</span>}
                      <span className={`badge-chip ${isRunning ? 'badge-pass' : 'badge-neutral'}`}>
                        {s.status}
                      </span>
                      <span className="badge-chip badge-neutral">{s.mode}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Participant: {s.participant_key}</span>
                      <span style={{ color: 'var(--border-hairline-bright)' }}>•</span>
                      <span>Task: {s.task_id}</span>
                      <span style={{ color: 'var(--border-hairline-bright)' }}>•</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSession(s);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '5px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--border-hairline)',
                      background: isActive ? 'var(--phosphor-jade)' : 'var(--bay-elevated)',
                      color: isActive ? '#0a0c10' : 'var(--text-main)',
                    }}
                  >
                    {isActive ? 'Active' : 'Select'}
                  </button>
                  <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
