import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Clock,
  Sparkles,
  Database,
  ExternalLink,
} from 'lucide-react';
import { Session, InferenceRecord } from '../api';

interface HomeViewProps {
  activeSession: Session | null;
  latestInference: InferenceRecord | null;
  durationMinutes: number;
  onContinueSession: () => void;
  onStartNewSession: () => void;
  onViewSignals: () => void;
  onViewHistory: () => void;
  onViewEvidence: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  activeSession,
  latestInference,
  durationMinutes,
  onContinueSession,
  onStartNewSession,
  onViewSignals,
  onViewHistory,
  onViewEvidence,
}) => {
  // Convert 0-1 metrics to categorical states
  const getWorkloadState = (val?: number) => {
    if (val === undefined) return { label: 'Moderate', pct: 45, color: '#6366f1' };
    if (val < 0.35) return { label: 'Low', pct: Math.round(val * 100), color: '#10b981' };
    if (val < 0.7) return { label: 'Moderate', pct: Math.round(val * 100), color: '#6366f1' };
    return { label: 'Elevated', pct: Math.round(val * 100), color: '#f59e0b' };
  };

  const getFatigueState = (val?: number) => {
    if (val === undefined) return { label: 'Low', pct: 22, color: '#10b981' };
    if (val < 0.4) return { label: 'Low', pct: Math.round(val * 100), color: '#10b981' };
    if (val < 0.75) return { label: 'Moderate', pct: Math.round(val * 100), color: '#f59e0b' };
    return { label: 'Elevated', pct: Math.round(val * 100), color: '#ef4444' };
  };

  const getEngagementState = (val?: number) => {
    if (val === undefined) return { label: 'High', pct: 85, color: '#10b981' };
    if (val > 0.6) return { label: 'High', pct: Math.round(val * 100), color: '#10b981' };
    if (val > 0.35) return { label: 'Moderate', pct: Math.round(val * 100), color: '#6366f1' };
    return { label: 'Low', pct: Math.round(val * 100), color: '#9ca3af' };
  };

  const workload = getWorkloadState(latestInference?.workload.value);
  const fatigue = getFatigueState(latestInference?.fatigue.value);
  const engagement = getEngagementState(latestInference?.engagement.value);

  return (
    <div className="product-container">
      {/* Intro Editorial */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#f9fafb' }}>
          Understand your focus. Adapt your workspace.
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#9ca3af', marginTop: '0.4rem', maxWidth: '640px' }}>
          Flowstate observes typing cadence and task interaction patterns to estimate workload and
          fatigue—adapting your environment without invading your privacy.
        </p>
      </div>

      {/* Main Grid: Current Session + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.75rem', marginBottom: '2.5rem' }}>
        {/* Current Active Session Card */}
        <div className="calm-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: activeSession ? '#10b981' : '#6b7280',
                    display: 'inline-block',
                    boxShadow: activeSession ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {activeSession ? 'Current Session' : 'No Active Session'}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
                {activeSession ? `${durationMinutes || 18}m active` : 'Idle'}
              </span>
            </div>

            {activeSession ? (
              <div>
                <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f3f4f6', letterSpacing: '-0.02em' }}>
                  Two Sum
                </div>
                <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>LeetCode</span>
                  <span style={{ color: '#374151' }}>•</span>
                  <span>Easy</span>
                  <span style={{ color: '#374151' }}>•</span>
                  <span style={{ color: '#10b981' }}>Python</span>
                </div>

                {/* Cohesive State Composition */}
                <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Workload
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#e5e7eb', marginTop: '2px' }}>
                      {workload.label}
                    </div>
                    <div className="calm-progress-track">
                      <div className="calm-progress-bar calm-progress-violet" style={{ width: `${workload.pct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Fatigue
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#e5e7eb', marginTop: '2px' }}>
                      {fatigue.label}
                    </div>
                    <div className="calm-progress-track">
                      <div className="calm-progress-bar calm-progress-emerald" style={{ width: `${fatigue.pct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Engagement
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#e5e7eb', marginTop: '2px' }}>
                      {engagement.label}
                    </div>
                    <div className="calm-progress-track">
                      <div className="calm-progress-bar calm-progress-emerald" style={{ width: `${engagement.pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1.5rem 0', textAlign: 'center' }}>
                <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                  Start a Flowstate session or browse LeetCode with the Chrome Extension to begin observing interaction patterns.
                </p>
              </div>
            )}
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #161924', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Estimate quality: <strong style={{ color: '#10b981' }}>● Good</strong>
            </div>
            {activeSession ? (
              <button
                onClick={onContinueSession}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>Continue Session</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={onStartNewSession}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>Start Session</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Recent Sessions Overview */}
        <div className="calm-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Recent Sessions
              </span>
              <button
                onClick={onViewHistory}
                style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                View all →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Session item 1 */}
              <div
                onClick={onContinueSession}
                style={{
                  padding: '0.75rem 0.85rem',
                  background: '#0f1118',
                  border: '1px solid #181b26',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>
                    Two Sum
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                    LeetCode • Today
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
                    {durationMinutes || 18}m
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#10b981' }}>
                    Stable
                  </div>
                </div>
              </div>

              {/* Session item 2 */}
              <div
                onClick={onViewHistory}
                style={{
                  padding: '0.75rem 0.85rem',
                  background: '#0f1118',
                  border: '1px solid #181b26',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>
                    FastAPI Engine Refactor
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                    GitHub / Code • Today
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
                    47m
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6366f1' }}>
                    Focus mode
                  </div>
                </div>
              </div>

              {/* Session item 3 */}
              <div
                onClick={onViewHistory}
                style={{
                  padding: '0.75rem 0.85rem',
                  background: '#0f1118',
                  border: '1px solid #181b26',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>
                    Binary Search Trees
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                    LeetCode • Yesterday
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
                    32m
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                    Completed
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #161924', display: 'flex', gap: '1rem' }}>
            <button
              onClick={onViewSignals}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid #1e2230',
                borderRadius: '5px',
                color: '#9ca3af',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              Signal Oscilloscope →
            </button>
            <button
              onClick={onViewEvidence}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid #1e2230',
                borderRadius: '5px',
                color: '#9ca3af',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              Evidence Pipeline →
            </button>
          </div>
        </div>
      </div>

      {/* Privacy & Boundary Trust Card ("What Flowstate Observes") */}
      <div className="calm-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <ShieldCheck size={18} style={{ color: '#10b981' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f3f4f6' }}>
            Private by Design — What Flowstate Observes
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
              What Flowstate Observes
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#d1d5db' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Interaction timing & inter-keystroke intervals (ms)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Pause duration and typing cadence rhythm</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Editing backspace activity & task navigation bursts</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Task context metadata (Platform: LeetCode, Problem title)</span>
              </li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
              What Flowstate Never Collects
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <X size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span>Source code, page contents, or problem solution text</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <X size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span>Raw keystroke characters, passwords, or credentials</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <X size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span>Clipboard contents, form inputs, or search queries</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <X size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span>Webcam, microphone, or eye-tracking video</span>
              </li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #161924', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={13} />
            <span>Authoritative Local SQLite Storage — zero cloud sync lock-in</span>
          </div>
          <span>Non-clinical empirical proxy</span>
        </div>
      </div>
    </div>
  );
};
