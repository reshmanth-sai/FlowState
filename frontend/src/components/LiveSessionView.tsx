import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Pause,
  Play,
  Square,
  Zap,
  CheckCircle2,
  Clock,
  Shield,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { Session, InferenceRecord, SignalWindow, AdaptationDecision, LiveSessionState } from '../api';
import { EstimateQualityDrawer } from './EstimateQualityDrawer';
import { AdaptationStatusCard } from './AdaptationStatusCard';

interface LiveSessionViewProps {
  activeSession: Session | null;
  latestInference: InferenceRecord | null;
  windows: SignalWindow[];
  latestDecision?: AdaptationDecision | null;
  durationMinutes: number;
  wsStatus?: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';
  lastLiveUpdate?: Date | null;
  cadencePulse?: boolean;
  liveState?: LiveSessionState | null;
  onTriggerDemoBurst?: (elevated: boolean) => void;
  onBackToHome: () => void;
  onNavigateToSignals: () => void;
  onNavigateToEvidence: () => void;
  onEndSession: () => void;
}

export const LiveSessionView: React.FC<LiveSessionViewProps> = ({
  activeSession,
  latestInference,
  windows,
  latestDecision,
  durationMinutes,
  wsStatus = 'DISCONNECTED',
  lastLiveUpdate = null,
  cadencePulse = false,
  liveState = null,
  onTriggerDemoBurst,
  onBackToHome,
  onNavigateToSignals,
  onNavigateToEvidence,
  onEndSession,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [showQualityDrawer, setShowQualityDrawer] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [adaptationDismissed, setAdaptationDismissed] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Second-by-second timer for stale state calculation
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsSinceUpdate = lastLiveUpdate ? Math.floor((now - lastLiveUpdate.getTime()) / 1000) : null;

  // Stale state text
  let freshnessText = 'Waiting for observation…';
  let isStale = false;
  let isUnavailable = false;

  if (secondsSinceUpdate !== null) {
    if (secondsSinceUpdate < 20) {
      freshnessText = 'Live • Just updated';
    } else if (secondsSinceUpdate < 90) {
      freshnessText = `Last updated ${secondsSinceUpdate}s ago`;
      isStale = true;
    } else {
      freshnessText = 'Signal temporarily unavailable. Waiting for next observation.';
      isUnavailable = true;
    }
  }

  // Categorical mappings
  const getWorkloadState = (val?: number) => {
    if (val === undefined) return { label: 'Awaiting signal', pct: 0, index: '--', color: 'var(--text-muted)' };
    if (val < 0.35) return { label: 'Low', pct: Math.round(val * 100), index: val.toFixed(2), color: 'var(--phosphor-jade)' };
    if (val < 0.7) return { label: 'Moderate', pct: Math.round(val * 100), index: val.toFixed(2), color: 'var(--laser-violet)' };
    return { label: 'Elevated', pct: Math.round(val * 100), index: val.toFixed(2), color: 'var(--amber-alert)' };
  };

  const getFatigueState = (val?: number) => {
    if (val === undefined) return { label: 'Awaiting signal', pct: 0, index: '--', color: 'var(--text-muted)' };
    if (val < 0.4) return { label: 'Low', pct: Math.round(val * 100), index: val.toFixed(2), color: 'var(--phosphor-jade)' };
    if (val < 0.75) return { label: 'Moderate', pct: Math.round(val * 100), index: val.toFixed(2), color: 'var(--amber-alert)' };
    return { label: 'Elevated', pct: Math.round(val * 100), index: val.toFixed(2), color: '#ef4444' };
  };

  const getEngagementState = (val?: number) => {
    if (val === undefined) return { label: 'Awaiting signal', pct: 0, index: '--', color: 'var(--text-muted)' };
    if (val > 0.6) return { label: 'High', pct: Math.round(val * 100), index: val.toFixed(2), color: 'var(--phosphor-jade)' };
    if (val > 0.35) return { label: 'Moderate', pct: Math.round(val * 100), index: val.toFixed(2), color: 'var(--laser-violet)' };
    return { label: 'Low', pct: Math.round(val * 100), index: val.toFixed(2), color: 'var(--text-muted)' };
  };

  const workload = getWorkloadState(latestInference?.workload.value);
  const fatigue = getFatigueState(latestInference?.fatigue.value);
  const engagement = getEngagementState(latestInference?.engagement.value);

  // Mini sparkline points from recent windows
  const sparklinePoints = windows.slice(-16).map((w, idx) => {
    const x = (idx / Math.max(1, Math.min(15, windows.length - 1))) * 280;
    const count = w.event_counts?.keystroke || w.event_counts?.typing || 12;
    const y = 40 - Math.min(32, Math.max(8, count * 1.5));
    return `${x},${y}`;
  }).join(' ');

  // Live timeline recent ticks (bounded rolling window of last 6 observations)
  const recentTimeline = windows.slice(-6).map((win, idx) => {
    const d = new Date(win.end_time);
    const timeStr = isNaN(d.getTime())
      ? `+${(idx + 1) * 15}s`
      : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    return {
      id: win.window_id,
      label: timeStr,
      isLatest: idx === Math.min(5, windows.length - 1),
    };
  });

  const taskTitle = liveState?.context?.task || activeSession?.metadata?.task_name || activeSession?.task_id || 'Active Focus Session';
  const taskPlatform = liveState?.context?.platform || activeSession?.metadata?.platform || 'Workspace Context';
  const taskLang = liveState?.context?.language || activeSession?.metadata?.language || 'Interactive';
  const taskDiff = liveState?.context?.difficulty || activeSession?.metadata?.difficulty || 'Standard';

  const hasOfferedAdaptation =
    latestDecision &&
    latestDecision.status === 'OFFERED' &&
    latestDecision.action !== 'NO_ACTION' &&
    !adaptationDismissed;

  // Required Audit Debug Log
  console.log("[FLOWSTATE UI INFERENCE]", JSON.stringify(latestInference, null, 2));

  return (
    <div className="product-container">
      {/* Back to Home & Breadcrumb / Real-time Status Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          onClick={onBackToHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Live Closed-Loop Stage Visualization */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              background: 'var(--bay-elevated)',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <span style={{ color: cadencePulse ? 'var(--phosphor-jade)' : 'var(--text-secondary)', fontWeight: cadencePulse ? 700 : 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: cadencePulse ? 'var(--phosphor-jade)' : 'var(--text-muted)',
                  boxShadow: cadencePulse ? '0 0 8px var(--phosphor-jade)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
              Observe
            </span>
            <span>→</span>
            <span style={{ color: latestInference ? 'var(--laser-violet)' : 'var(--text-muted)', fontWeight: latestInference ? 600 : 500 }}>
              Estimate
            </span>
            <span>→</span>
            <span style={{ color: latestInference ? 'var(--phosphor-jade)' : 'var(--text-muted)', fontWeight: latestInference ? 600 : 500 }}>
              Quality Check
            </span>
            <span>→</span>
            <span style={{ color: hasOfferedAdaptation ? 'var(--amber-alert)' : 'var(--text-muted)', fontWeight: hasOfferedAdaptation ? 700 : 500 }}>
              Adapt
            </span>
          </div>

          {/* Connection Status & Cadence Pulse Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                color: wsStatus === 'CONNECTED' ? 'var(--phosphor-jade)' : 'var(--text-muted)',
                background: wsStatus === 'CONNECTED' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bay-elevated)',
                padding: '3px 10px',
                borderRadius: '12px',
                border: '1px solid var(--border-hairline)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: wsStatus === 'CONNECTED' ? '#10b981' : '#94a3b8',
                  boxShadow: cadencePulse ? '0 0 10px #10b981' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
              <span>{wsStatus === 'CONNECTED' ? 'Extension Connected' : 'Connecting Stream…'}</span>
            </span>

            {/* Freshness / Stale Indicator */}
            <span
              style={{
                fontSize: '0.72rem',
                color: isUnavailable ? 'var(--amber-alert)' : isStale ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {freshnessText}
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Adaptation Notification Banner (Subtle, non-intrusive) */}
      {hasOfferedAdaptation && (
        <div
          className="calm-panel"
          style={{
            borderLeft: '4px solid var(--amber-alert)',
            background: 'var(--bay-elevated)',
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={18} style={{ color: 'var(--amber-alert)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Flowstate adapted your workspace
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {latestDecision?.reason || 'Secondary distractions reduced based on elevated interaction cadence.'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowQualityDrawer(true)}
              style={{
                padding: '5px 12px',
                background: 'transparent',
                border: '1px solid var(--border-hairline)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Why?
            </button>
            <button
              onClick={() => setAdaptationDismissed(true)}
              style={{
                padding: '5px 12px',
                background: 'var(--laser-violet)',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Return to normal
            </button>
          </div>
        </div>
      )}

      {/* Task Context Hero */}
      <div className="calm-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Current Task Context
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', marginTop: '2px' }}>
              {taskTitle}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <span style={{ textTransform: 'capitalize' }}>{taskPlatform}</span>
              <span style={{ color: 'var(--border-hairline-bright)' }}>•</span>
              <span>{taskDiff}</span>
              <span style={{ color: 'var(--border-hairline-bright)' }}>•</span>
              <span style={{ color: 'var(--phosphor-jade)' }}>{taskLang}</span>
              <span style={{ color: 'var(--border-hairline-bright)' }}>•</span>
              <span>{durationMinutes || 18}m active</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Pitch Accelerator (Demo Cadence Burst) Button */}
            {onTriggerDemoBurst && (
              <button
                onClick={() => onTriggerDemoBurst(false)}
                title="Live Pitch Accelerator: Ingest a real 30s computer behavior batch into the production pipeline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '6px',
                  color: 'var(--laser-violet)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Zap size={13} />
                <span>Simulate 30s Burst</span>
              </button>
            )}

            <button
              onClick={() => setIsPaused(!isPaused)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'var(--bay-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={() => setShowEndModal(true)}
              data-e2e="end-session-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '6px',
                color: '#ef4444',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <Square size={12} />
              <span>End Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Rolling Activity Timeline */}
      {recentTimeline.length > 0 && (
        <div className="calm-panel" style={{ marginBottom: '1.5rem', padding: '0.85rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Session Activity Timeline
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              30s Sliding Windows (15s Step)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginTop: '0.75rem', paddingBottom: '0.25rem' }}>
            {/* Timeline track line */}
            <div style={{ position: 'absolute', top: '7px', left: '10px', right: '10px', height: '2px', background: 'var(--border-hairline)', zIndex: 1 }} />

            {recentTimeline.map((tick) => (
              <div key={tick.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, minWidth: '55px' }}>
                <div
                  style={{
                    width: tick.isLatest ? '14px' : '10px',
                    height: tick.isLatest ? '14px' : '10px',
                    borderRadius: '50%',
                    background: tick.isLatest ? 'var(--laser-violet)' : 'var(--bay-elevated)',
                    border: tick.isLatest ? '2px solid #ffffff' : '2px solid var(--border-hairline)',
                    boxShadow: tick.isLatest ? '0 0 10px var(--laser-violet)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: tick.isLatest ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: tick.isLatest ? 700 : 400,
                    marginTop: '6px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {tick.label}
                </span>
                {tick.isLatest && (
                  <span style={{ fontSize: '0.62rem', color: 'var(--laser-violet)', fontWeight: 600, marginTop: '1px' }}>
                    ↑ estimate updated
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Estimated State Composition (The 3 States) */}
      <div className="calm-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              How You're Doing
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Estimated cognitive demand based on typing cadence and pause intervals
            </div>
          </div>

          {/* Decoupled Estimate Quality */}
          <div className="estimate-quality-box">
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: latestInference
                  ? (latestInference.quality_gate === 'PASS' ? '#10b981' : latestInference.quality_gate === 'DEGRADED' ? 'var(--amber-alert)' : '#ef4444')
                  : 'var(--text-muted)',
              }}
            />
            <span>
              Estimate quality:{' '}
              <strong style={{ color: 'var(--text-main)' }}>
                {latestInference
                  ? `${latestInference.quality_gate === 'PASS' ? 'Good' : latestInference.quality_gate === 'DEGRADED' ? 'Degraded' : 'Limited'} (${Math.round((latestInference.workload?.confidence ?? 0) * 100)}%)`
                  : 'Awaiting Telemetry'}
              </strong>
            </span>
            <button onClick={() => setShowQualityDrawer(true)}>Why?</button>
          </div>
        </div>

        {/* 3 State Tiles */}
        <div className="state-composition-grid">
          {/* Workload Tile */}
          <div className="state-tile">
            <div className="state-label">
              <span>Workload</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Index: {workload.index}
              </span>
            </div>
            <div className="state-value" style={{ color: workload.color }}>
              {workload.label}
            </div>
            <div className="calm-progress-track">
              <div className="calm-progress-bar calm-progress-violet" style={{ width: `${workload.pct}%` }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {latestInference?.evidence?.find(e => e.factor.toLowerCase().includes('latency') || e.factor.toLowerCase().includes('response'))?.attribution_text || (latestInference ? 'Behavioral response latency' : 'Awaiting keystroke signals')}
            </div>
          </div>

          {/* Fatigue Tile */}
          <div className="state-tile">
            <div className="state-label">
              <span>Fatigue</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Index: {fatigue.index}
              </span>
            </div>
            <div className="state-value" style={{ color: fatigue.color }}>
              {fatigue.label}
            </div>
            <div className="calm-progress-track">
              <div className="calm-progress-bar calm-progress-emerald" style={{ width: `${fatigue.pct}%` }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {latestInference?.evidence?.find(e => e.factor.toLowerCase().includes('fatigue') || e.factor.toLowerCase().includes('time'))?.attribution_text || (latestInference ? 'Time-on-task & pause dispersion' : 'Awaiting activity data')}
            </div>
          </div>

          {/* Engagement Tile */}
          <div className="state-tile">
            <div className="state-label">
              <span>Engagement</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Index: {engagement.index}
              </span>
            </div>
            <div className="state-value" style={{ color: engagement.color }}>
              {engagement.label}
            </div>
            <div className="calm-progress-track">
              <div className="calm-progress-bar calm-progress-emerald" style={{ width: `${engagement.pct}%` }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {latestInference?.evidence?.find(e => e.factor.toLowerCase().includes('rhythm') || e.factor.toLowerCase().includes('throughput'))?.attribution_text || (latestInference ? 'Active interaction rhythm' : 'Awaiting keystroke signals')}
            </div>
          </div>
        </div>
      </div>

      {/* Observation Summary & Compact Activity Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Human Observation Summary */}
        <div className="calm-panel">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            Flowstate Observation
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.55 }}>
            {latestInference?.evidence && latestInference.evidence.length > 0
              ? latestInference.evidence.map(e => e.attribution_text).join('. ') + '.'
              : 'Interaction cadence and telemetry are monitored in real time across rolling observation windows.'}
          </p>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Factor: {latestInference?.evidence?.[0]?.factor || 'Continuous behavioral telemetry'}
            </span>
            <button
              onClick={onNavigateToEvidence}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--laser-violet)',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              View evidence trace →
            </button>
          </div>
        </div>

        {/* Compact Activity Trend Sparkline */}
        <div className="calm-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Recent Activity Trend
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Last 15m
              </span>
            </div>

            {/* Sparkline vector */}
            <div style={{ height: '48px', width: '100%', position: 'relative', marginTop: '0.5rem' }}>
              <svg width="100%" height="48" viewBox="0 0 280 48" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="var(--laser-violet)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklinePoints || '0,24 50,20 100,28 150,18 200,22 250,16 280,20'}
                />
              </svg>
            </div>
          </div>

          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)', textAlign: 'right' }}>
            <button
              onClick={onNavigateToSignals}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--laser-violet)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              View detailed signal oscilloscope →
            </button>
          </div>
        </div>
      </div>

      {/* Closed-Loop Adaptation Outcome Card */}
      <AdaptationStatusCard
        latestDecision={latestDecision}
        latestInference={latestInference}
        onOpenEvidence={onNavigateToEvidence}
      />

      {/* Progressive Disclosure: Estimate Quality Drawer */}
      <EstimateQualityDrawer
        isOpen={showQualityDrawer}
        onClose={() => setShowQualityDrawer(false)}
        latestInference={latestInference}
        onOpenEvidence={onNavigateToEvidence}
      />

      {/* Session End Confirmation Modal */}
      {showEndModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
          }}
          onClick={() => setShowEndModal(false)}
        >
          <div
            style={{
              width: '380px',
              background: 'var(--bay-bg)',
              border: '1px solid var(--border-hairline)',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              End this session?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.45 }}>
              Your session observations and evidence trace will be saved permanently to your local History.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowEndModal(false)}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '5px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEndModal(false);
                  onEndSession();
                }}
                data-e2e="confirm-end-session-button"
                style={{
                  padding: '6px 14px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '5px',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
