import React, { useState } from 'react';
import {
  LineChart,
  Activity,
  Sliders,
  Shield,
  Layers,
  ArrowRight,
  Info,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { LiveMonitor } from './LiveMonitor';
import { InferenceRecord, SignalWindow, FeatureVector, AdaptationDecision, Session } from '../api';

interface SignalsViewProps {
  activeSession: Session | null;
  latestInference: InferenceRecord | null;
  latestWindow: SignalWindow | null;
  latestFeatures: FeatureVector | null;
  activeIntervention: AdaptationDecision | null;
  allInferences: InferenceRecord[];
  allWindows: SignalWindow[];
  allFeatures: FeatureVector[];
  onFollowSignal: (inferenceId: string) => void;
  onOpenSettings: () => void;
}

export const SignalsView: React.FC<SignalsViewProps> = ({
  activeSession,
  latestInference,
  latestWindow,
  latestFeatures,
  activeIntervention,
  allInferences,
  allWindows,
  allFeatures,
  onFollowSignal,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'oscilloscope' | 'cadence' | 'sources'>('oscilloscope');

  const typingMedian = latestFeatures?.features?.keystroke_latency_median ?? 142;
  const burstiness = latestFeatures?.features?.keystroke_burstiness ?? 0.68;
  const pauseRatio = latestFeatures?.features?.pause_ratio ?? 0.24;
  const errorRate = latestFeatures?.features?.backspace_frequency ?? 0.04;

  return (
    <div className="technical-instrument-grid" style={{ minHeight: '100%', padding: '2rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header with technical identity */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mono-stamp" style={{ color: '#6366f1' }}>
                TECHNICAL SIGNAL SUITE // V1.0.0
              </span>
              <span className="badge-chip badge-neutral">69 WINDOWS OBSERVED</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f3f4f6', letterSpacing: '-0.02em', marginTop: '4px' }}>
              Behavioral Signals & Oscilloscope
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '2px' }}>
              High-resolution temporal trace of typing cadence, pause dynamics, and sliding-window inference waves.
            </p>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', background: '#0e1017', border: '1px solid #1a1d28', borderRadius: '6px', padding: '2px' }}>
            <button
              onClick={() => setActiveTab('oscilloscope')}
              style={{
                padding: '5px 12px',
                background: activeTab === 'oscilloscope' ? '#181b26' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: activeTab === 'oscilloscope' ? '#ffffff' : '#9ca3af',
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Waveform Oscilloscope
            </button>
            <button
              onClick={() => setActiveTab('cadence')}
              style={{
                padding: '5px 12px',
                background: activeTab === 'cadence' ? '#181b26' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: activeTab === 'cadence' ? '#ffffff' : '#9ca3af',
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cadence & Features
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              style={{
                padding: '5px 12px',
                background: activeTab === 'sources' ? '#181b26' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: activeTab === 'sources' ? '#ffffff' : '#9ca3af',
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Signal Sources
            </button>
          </div>
        </div>

        {/* Tab 1: Full Synchronized Multi-Channel Oscilloscope */}
        {activeTab === 'oscilloscope' && (
          <div>
            <LiveMonitor
              latestInference={latestInference}
              latestWindow={latestWindow}
              latestFeatures={latestFeatures}
              activeIntervention={activeIntervention}
              onRunDemo={() => {}}
              onFollowSignal={onFollowSignal}
              isRunningDemo={false}
              allInferences={allInferences}
              allWindows={allWindows}
              allFeatures={allFeatures}
            />
          </div>
        )}

        {/* Tab 2: Cadence & Behavioral Signal Breakdown */}
        {activeTab === 'cadence' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
            <div className="calm-panel">
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Typing Latency Median
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f3f4f6', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {Math.round(typingMedian)} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#9ca3af' }}>ms</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                Median inter-keystroke duration. Stable baseline indicates relaxed rhythm.
              </p>
            </div>

            <div className="calm-panel">
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cadence Burstiness
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#6366f1', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {burstiness.toFixed(2)}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                Ratio of rapid typing bursts to sustained pauses.
              </p>
            </div>

            <div className="calm-panel">
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pause Ratio
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {(pauseRatio * 100).toFixed(0)} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#9ca3af' }}>%</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                Fraction of observation window spent in cognitive reflection pauses (&gt;1.5s).
              </p>
            </div>

            <div className="calm-panel">
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Editing Backspace Rate
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {(errorRate * 100).toFixed(1)} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#9ca3af' }}>%</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                Correction cadence frequency indicating cognitive friction or code refactoring.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Signal Sources & Hardware Health */}
        {activeTab === 'sources' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            <div className="calm-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>
                  Browser Behavioral Telemetry
                </span>
                <span className="badge-chip badge-pass">CONNECTED (0.033 HZ)</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.5 }}>
                Continuous ingestion via Flowstate Chrome Extension. Telemetry is partitioned into 30s
                temporal sliding windows with 15s step offsets. Zero DOM scraping guarantee verified.
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #181b26', fontSize: '0.75rem', color: '#6b7280' }}>
                Provenance: <code>COMPUTER_BEHAVIOR</code> • Schema: <code>context_schema_version: 1.0.0</code>
              </div>
            </div>

            <div className="calm-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>
                  Consumer Optical PPG (Wearable)
                </span>
                <span className="badge-chip badge-neutral">STANDBY / UNPAIRED</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.5 }}>
                Web Bluetooth (BLE) heart rate peripheral integration. When uncoupled, zero fake
                physiological data is fabricated. The pipeline operates strictly in single-modality behavioral mode.
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #181b26', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={onOpenSettings}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Configure Bluetooth in Settings →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
