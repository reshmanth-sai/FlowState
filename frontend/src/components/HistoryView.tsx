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
              color: '#9ca3af',
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
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f3f4f6', letterSpacing: '-0.02em' }}>
              Session History
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '2px' }}>
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
                background: '#181b26',
                border: '1px solid #282d3d',
                borderRadius: '6px',
                color: '#f3f4f6',
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
        {/* Active LeetCode Session */}
        <div
          onClick={() => {
            if (activeSession) setSelectedSessionForReview(activeSession);
          }}
          className="calm-panel"
          style={{
            cursor: 'pointer',
            borderLeft: '3px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: '#10131d',
                border: '1px solid #1f2333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <CheckCircle size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6' }}>
                  Two Sum
                </span>
                <span className="badge-chip badge-pass">ACTIVE • 69 WINDOWS</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>LeetCode</span>
                <span style={{ color: '#374151' }}>•</span>
                <span>Easy Difficulty</span>
                <span style={{ color: '#374151' }}>•</span>
                <span>Python</span>
                <span style={{ color: '#374151' }}>•</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Observed Duration
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e5e7eb', fontFamily: 'var(--font-mono)' }}>
                17m 30s
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trajectory
              </div>
              <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 500 }}>
                Moderate → Stable
              </div>
            </div>

            <ChevronRight size={18} style={{ color: '#6b7280' }} />
          </div>
        </div>

        {/* Mock Session 2 */}
        <div
          onClick={() => {
            if (activeSession) setSelectedSessionForReview(activeSession);
          }}
          className="calm-panel"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: 0.85,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: '#10131d',
                border: '1px solid #1f2333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
              }}
            >
              <Clock size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6' }}>
                  FastAPI Engine Refactor
                </span>
                <span className="badge-chip badge-neutral">SAVED</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>GitHub</span>
                <span style={{ color: '#374151' }}>•</span>
                <span>Code Architecture</span>
                <span style={{ color: '#374151' }}>•</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Observed Duration
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e5e7eb', fontFamily: 'var(--font-mono)' }}>
                47m 15s
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trajectory
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 500 }}>
                Elevated → Focus Active
              </div>
            </div>

            <ChevronRight size={18} style={{ color: '#6b7280' }} />
          </div>
        </div>

        {/* Mock Session 3 */}
        <div
          onClick={() => {
            if (activeSession) setSelectedSessionForReview(activeSession);
          }}
          className="calm-panel"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: 0.75,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: '#10131d',
                border: '1px solid #1f2333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
              }}
            >
              <Clock size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6' }}>
                  Binary Search Trees
                </span>
                <span className="badge-chip badge-neutral">COMPLETED</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>LeetCode</span>
                <span style={{ color: '#374151' }}>•</span>
                <span>Medium Difficulty</span>
                <span style={{ color: '#374151' }}>•</span>
                <span>Yesterday</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Observed Duration
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e5e7eb', fontFamily: 'var(--font-mono)' }}>
                32m 00s
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trajectory
              </div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>
                Low → Moderate
              </div>
            </div>

            <ChevronRight size={18} style={{ color: '#6b7280' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
