import React, { useState } from 'react';
import {
  ArrowLeft,
  Pause,
  Play,
  Square,
  HelpCircle,
  ExternalLink,
  Shield,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Session, InferenceRecord, SignalWindow, AdaptationDecision } from '../api';
import { EstimateQualityDrawer } from './EstimateQualityDrawer';
import { AdaptationStatusCard } from './AdaptationStatusCard';

interface LiveSessionViewProps {
  activeSession: Session | null;
  latestInference: InferenceRecord | null;
  windows: SignalWindow[];
  latestDecision?: AdaptationDecision | null;
  durationMinutes: number;
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
  onBackToHome,
  onNavigateToSignals,
  onNavigateToEvidence,
  onEndSession,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [showQualityDrawer, setShowQualityDrawer] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  // Categorical mappings
  const getWorkloadState = (val?: number) => {
    if (val === undefined) return { label: 'Moderate', pct: 54, index: '0.54', color: '#6366f1' };
    if (val < 0.35) return { label: 'Low', pct: Math.round(val * 100), index: val.toFixed(2), color: '#10b981' };
    if (val < 0.7) return { label: 'Moderate', pct: Math.round(val * 100), index: val.toFixed(2), color: '#6366f1' };
    return { label: 'Elevated', pct: Math.round(val * 100), index: val.toFixed(2), color: '#f59e0b' };
  };

  const getFatigueState = (val?: number) => {
    if (val === undefined) return { label: 'Low', pct: 24, index: '0.24', color: '#10b981' };
    if (val < 0.4) return { label: 'Low', pct: Math.round(val * 100), index: val.toFixed(2), color: '#10b981' };
    if (val < 0.75) return { label: 'Moderate', pct: Math.round(val * 100), index: val.toFixed(2), color: '#f59e0b' };
    return { label: 'Elevated', pct: Math.round(val * 100), index: val.toFixed(2), color: '#ef4444' };
  };

  const getEngagementState = (val?: number) => {
    if (val === undefined) return { label: 'High', pct: 88, index: '0.88', color: '#10b981' };
    if (val > 0.6) return { label: 'High', pct: Math.round(val * 100), index: val.toFixed(2), color: '#10b981' };
    if (val > 0.35) return { label: 'Moderate', pct: Math.round(val * 100), index: val.toFixed(2), color: '#6366f1' };
    return { label: 'Low', pct: Math.round(val * 100), index: val.toFixed(2), color: '#9ca3af' };
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

  return (
    <div className="product-container">
      {/* Back to Home & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <button
          onClick={onBackToHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Signal Source:</span>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.08)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            ● Browser Telemetry
          </span>
        </div>
      </div>

      {/* Task Context Hero */}
      <div className="calm-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Current Task Context
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.02em', marginTop: '2px' }}>
              Two Sum
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>
              <span>LeetCode</span>
              <span style={{ color: '#374151' }}>•</span>
              <span>Easy Difficulty</span>
              <span style={{ color: '#374151' }}>•</span>
              <span style={{ color: '#10b981' }}>Python</span>
              <span style={{ color: '#374151' }}>•</span>
              <span>{durationMinutes || 18}m active</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setIsPaused(!isPaused)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid #1e2230',
                borderRadius: '6px',
                color: '#d1d5db',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={() => setShowEndModal(true)}
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

      {/* Primary Estimated State Composition (The 3 States) */}
      <div className="calm-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              How You're Doing
            </div>
            <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '1px' }}>
              Estimated cognitive demand based on typing cadence and pause intervals
            </div>
          </div>

          {/* Decoupled Estimate Quality */}
          <div className="estimate-quality-box">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            <span>Estimate quality: <strong style={{ color: '#e5e7eb' }}>Good (82%)</strong></span>
            <button onClick={() => setShowQualityDrawer(true)}>Why?</button>
          </div>
        </div>

        {/* 3 State Tiles */}
        <div className="state-composition-grid">
          {/* Workload Tile */}
          <div className="state-tile">
            <div className="state-label">
              <span>Workload</span>
              <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
                Index: {workload.index}
              </span>
            </div>
            <div className="state-value" style={{ color: workload.color }}>
              {workload.label}
            </div>
            <div className="calm-progress-track">
              <div className="calm-progress-bar calm-progress-violet" style={{ width: `${workload.pct}%` }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
              ↑ slightly higher than session start
            </div>
          </div>

          {/* Fatigue Tile */}
          <div className="state-tile">
            <div className="state-label">
              <span>Fatigue</span>
              <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
                Index: {fatigue.index}
              </span>
            </div>
            <div className="state-value" style={{ color: fatigue.color }}>
              {fatigue.label}
            </div>
            <div className="calm-progress-track">
              <div className="calm-progress-bar calm-progress-emerald" style={{ width: `${fatigue.pct}%` }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
              → steady baseline level
            </div>
          </div>

          {/* Engagement Tile */}
          <div className="state-tile">
            <div className="state-label">
              <span>Engagement</span>
              <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
                Index: {engagement.index}
              </span>
            </div>
            <div className="state-value" style={{ color: engagement.color }}>
              {engagement.label}
            </div>
            <div className="calm-progress-track">
              <div className="calm-progress-bar calm-progress-emerald" style={{ width: `${engagement.pct}%` }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
              ● consistent typing flow
            </div>
          </div>
        </div>
      </div>

      {/* Observation Summary & Compact Activity Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Human Observation Summary */}
        <div className="calm-panel">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            Flowstate Observation
          </div>
          <p style={{ fontSize: '0.95rem', color: '#e5e7eb', lineHeight: 1.55 }}>
            Your interaction pattern has remained relatively stable throughout this window. Attentional
            focus and typing cadence are well within normal operating bounds.
          </p>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #161924', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Factor: Sustained interaction rhythm
            </span>
            <button
              onClick={onNavigateToEvidence}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6366f1',
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
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Recent Activity Trend
              </span>
              <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
                Last 15m
              </span>
            </div>

            {/* Sparkline vector */}
            <div style={{ height: '48px', width: '100%', position: 'relative', marginTop: '0.5rem' }}>
              <svg width="100%" height="48" viewBox="0 0 280 48" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklinePoints || '0,24 50,20 100,28 150,18 200,22 250,16 280,20'}
                />
              </svg>
            </div>
          </div>

          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #161924', textAlign: 'right' }}>
            <button
              onClick={onNavigateToSignals}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6366f1',
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
            background: 'rgba(0, 0, 0, 0.7)',
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
              background: '#0e1017',
              border: '1px solid #1f2333',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f3f4f6' }}>
              End this session?
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.5rem', lineHeight: 1.45 }}>
              Your session observations and evidence trace will be saved permanently to your local History.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowEndModal(false)}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid #232738',
                  borderRadius: '5px',
                  color: '#9ca3af',
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
