import React from 'react';
import { ShieldCheck, Database, Brain, Zap, Terminal, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { SystemStatus } from '../api';

interface Props {
  systemStatus: SystemStatus | null;
  onLaunchDemo: () => void;
  onLaunchLive: () => void;
}

export const ProjectOverview: React.FC<Props> = ({ systemStatus, onLaunchDemo, onLaunchLive }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Scientific Framing Declaration */}
      <div style={{
        background: 'var(--bay-bg)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-micro)',
        padding: '0.85rem 1.25rem',
        borderLeft: '3px solid var(--laser-violet)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem'
      }}>
        <ShieldCheck size={16} color="var(--laser-violet)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-main)' }}>Strict Scientific Framing Notice:</strong> Flowstate estimates changing cognitive workload, fatigue, and engagement as <em>empirical statistical proxies</em>, not clinical or psychiatric diagnoses. Smartwatch optical PPG is never treated as clinical ECG, and consumer hardware is never claimed as EEG/fNIRS.
        </div>
      </div>

      {/* Hero Architecture Flight Deck */}
      <div style={{
        background: 'var(--bay-bg)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-micro)',
        padding: '2rem 2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '900px' }}>
          <span className="mono-stamp" style={{ color: 'var(--laser-violet)', fontSize: '10px' }}>
            CLOSED-LOOP BIOSIGNAL TELEMETRY & ADAPTATION KERNEL
          </span>
          <h1 style={{ fontSize: '2.2rem', marginTop: '0.35rem', marginBottom: '0.85rem', lineHeight: 1.15, fontWeight: 700 }}>
            Personalized, Context-Aware Cognitive Efficiency Console
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Flowstate investigates whether accessible consumer-wearable signals, computer task behavioral telemetry, and temporal context can provide actionable, explainable estimates of mental demand to drive bounded interface adaptations.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-laser btn-laser-primary" onClick={onLaunchDemo} style={{ padding: '0.6rem 1.2rem', fontSize: '12px' }}>
              <Zap size={14} />
              <span>RUN DETERMINISTIC BENCHMARK (5-PHASE)</span>
            </button>
            <button className="btn-laser btn-laser-ghost" onClick={onLaunchLive} style={{ padding: '0.6rem 1.2rem', fontSize: '12px' }}>
              <Brain size={14} />
              <span>START LIVE REVIEWER SESSION</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Bay Docked Engineering Architecture Grid */}
      <div className="dock-grid dock-grid-3">
        {/* Bay 1: Data Source Status */}
        <div className="bay-cell">
          <div className="bay-header">
            <span className="bay-title">
              <Database size={12} color="var(--cyan-telemetry)" />
              DATA SOURCE CAPABILITIES
            </span>
            <span className="tag tag-pass">READY</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ padding: '0.6rem 0.85rem', background: 'var(--bay-surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span className="mono" style={{ fontSize: '11px', color: '#fcd34d', fontWeight: 600 }}>SIMULATED PROVIDER</span>
                <span className="tag tag-elevated" style={{ fontSize: '9px' }}>READY</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Deterministic fixed-seed scenario (seed=42) passing through complete ingestion pipeline.
              </p>
            </div>

            <div style={{ padding: '0.6rem 0.85rem', background: 'var(--bay-surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--phosphor-jade)', fontWeight: 600 }}>REAL WEARABLE (BLE)</span>
                <span className="tag tag-pass" style={{ fontSize: '9px' }}>READY</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Web Bluetooth Heart Rate Service (0x180D) for optical consumer PPG monitors.
              </p>
            </div>

            <div style={{ padding: '0.6rem 0.85rem', background: 'var(--bay-surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--cyan-telemetry)', fontWeight: 600 }}>TASK TELEMETRY</span>
                <span className="tag tag-pass" style={{ fontSize: '9px' }}>ACTIVE</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Browser keystroke cadence, task completion intervals, response latencies.
              </p>
            </div>
          </div>
        </div>

        {/* Bay 2: Hardware Boundaries */}
        <div className="bay-cell">
          <div className="bay-header">
            <span className="bay-title">
              <ShieldCheck size={12} color="var(--laser-violet)" />
              HARDWARE & SENSORY BOUNDARIES
            </span>
            <span className="tag tag-violet">STANDARDS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '11.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <CheckCircle2 size={13} color="var(--phosphor-jade)" />
              <span>Consumer Optical PPG (Wristband / Ring)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <CheckCircle2 size={13} color="var(--phosphor-jade)" />
              <span>Keystroke & Task Performance Cadence</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <CheckCircle2 size={13} color="var(--phosphor-jade)" />
              <span>DOM-Isolated Context Extraction</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <XCircle size={13} color="var(--crimson-alert)" />
              <span>NO Clinical ECG or Holter Monitoring</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <XCircle size={13} color="var(--crimson-alert)" />
              <span>NO Electroencephalography (EEG / fNIRS)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <XCircle size={13} color="var(--crimson-alert)" />
              <span>NO Webcam, Microphone, or Emotion AI</span>
            </div>
          </div>
        </div>

        {/* Bay 3: Core Research Questions */}
        <div className="bay-cell">
          <div className="bay-header">
            <span className="bay-title">
              <Terminal size={12} color="var(--amber-alert)" />
              RESEARCH INVESTIGATION OBJECTIVES
            </span>
            <span className="tag tag-neutral">EMPIRICAL</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-main)' }}>1. Multimodal Value Add:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                Does pairing behavioral task telemetry with consumer PPG outperform isolated behavioral or cardiac features alone?
              </p>
            </div>

            <div style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-main)' }}>2. Temporal Causal Isolation:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                Can 30s rolling sliding windows prevent future-data leakage while tracking rapid cognitive surges?
              </p>
            </div>

            <div style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-main)' }}>3. Bounded Closed-Loop Sovereignty:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                Does user-override sovereignty and cooldown throttling prevent adaptation fatigue and preserve flow?
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
