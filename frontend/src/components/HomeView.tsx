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
  Plus,
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
    if (val === undefined) return { label: 'Awaiting signal', pct: 0, color: 'var(--text-muted)' };
    if (val < 0.35) return { label: 'Low', pct: Math.round(val * 100), color: '#10b981' };
    if (val < 0.7) return { label: 'Moderate', pct: Math.round(val * 100), color: '#6366f1' };
    return { label: 'Elevated', pct: Math.round(val * 100), color: '#f59e0b' };
  };

  const getFatigueState = (val?: number) => {
    if (val === undefined) return { label: 'Awaiting signal', pct: 0, color: 'var(--text-muted)' };
    if (val < 0.4) return { label: 'Low', pct: Math.round(val * 100), color: '#10b981' };
    if (val < 0.75) return { label: 'Moderate', pct: Math.round(val * 100), color: '#f59e0b' };
    return { label: 'Elevated', pct: Math.round(val * 100), color: '#ef4444' };
  };

  const getEngagementState = (val?: number) => {
    if (val === undefined) return { label: 'Awaiting signal', pct: 0, color: 'var(--text-muted)' };
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
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
          Understand your focus. Adapt your workspace.
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '0.4rem', maxWidth: '640px' }}>
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
                    background: activeSession && activeSession.status === 'RUNNING' ? '#10b981' : 'var(--text-muted)',
                    display: 'inline-block',
                    boxShadow: activeSession && activeSession.status === 'RUNNING' ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {activeSession && activeSession.status === 'RUNNING' ? 'Current Session' : 'No Active Session'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {activeSession && activeSession.status === 'RUNNING' ? `${durationMinutes ?? 0}m active` : 'Idle'}
                </span>
                <button
                  onClick={onStartNewSession}
                  data-e2e="header-start-new-session-button"
                  title="Start a fresh FlowState session"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 9px',
                    background: 'var(--bay-elevated)',
                    color: 'var(--laser-violet)',
                    border: '1px solid var(--laser-violet)',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={12} />
                  <span>+ New Session</span>
                </button>
              </div>
            </div>

            {activeSession ? (
              <div>
                <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  {activeSession.metadata?.task_name || activeSession.task_id || 'Active Focus Session'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ textTransform: 'capitalize' }}>{activeSession.metadata?.platform || 'Browser Context'}</span>
                  <span style={{ color: 'var(--border-hairline-bright)' }}>•</span>
                  <span>{activeSession.metadata?.difficulty || 'Standard Task'}</span>
                  <span style={{ color: 'var(--border-hairline-bright)' }}>•</span>
                  <span style={{ color: '#10b981' }}>{activeSession.metadata?.language || 'Interaction'}</span>
                </div>

                {/* Cohesive State Composition */}
                <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Workload
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                      {workload.label}
                    </div>
                    <div className="calm-progress-track">
                      <div className="calm-progress-bar calm-progress-violet" style={{ width: `${workload.pct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Fatigue
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                      {fatigue.label}
                    </div>
                    <div className="calm-progress-track">
                      <div className="calm-progress-bar calm-progress-emerald" style={{ width: `${fatigue.pct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Engagement
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
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
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  No session currently running. Start a fresh session to begin recording telemetry.
                </p>
                <button
                  onClick={onStartNewSession}
                  data-e2e="empty-start-new-session-button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    background: 'var(--laser-violet)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} />
                  <span>+ New Session</span>
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Confidence:{' '}
              <strong style={{ color: 'var(--text-main)' }}>
                {latestInference
                  ? `${Math.round((latestInference.workload?.confidence ?? 0) * 100)}% (${latestInference.quality_gate === 'PASS' ? 'Good' : latestInference.quality_gate === 'DEGRADED' ? 'Degraded' : 'Limited'})`
                  : 'Awaiting Telemetry'}
              </strong>{' '}
              • Behavioral Proxy
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={onStartNewSession}
                data-e2e="start-new-session-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  background: 'var(--bay-elevated)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                <span>+ New Session</span>
              </button>
              <button
                onClick={onContinueSession}
                data-e2e="open-live-session-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  background: 'var(--laser-violet)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>Open Live Session</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Recent Sessions List */}
        <div className="calm-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Recent Focus Blocks
              </h3>
              <button
                onClick={onViewHistory}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--laser-violet)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
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
                  background: 'var(--bay-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Two Sum
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    LeetCode • Today
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
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
                  background: 'var(--bay-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    FastAPI Engine Refactor
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    GitHub / Code • Today
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    47m
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--laser-violet)' }}>
                    Focus mode
                  </div>
                </div>
              </div>

              {/* Session item 3 */}
              <div
                onClick={onViewHistory}
                style={{
                  padding: '0.75rem 0.85rem',
                  background: 'var(--bay-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Binary Search Trees
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    LeetCode • Yesterday
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    32m
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Completed
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-hairline)', display: 'flex', gap: '1rem' }}>
            <button
              onClick={onViewSignals}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: 'var(--bay-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '5px',
                color: 'var(--text-secondary)',
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
                background: 'var(--bay-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '5px',
                color: 'var(--text-secondary)',
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
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Private by Design — What Flowstate Observes
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
              What Flowstate Observes
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
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

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
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
