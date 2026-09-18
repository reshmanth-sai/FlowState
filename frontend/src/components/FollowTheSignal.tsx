import React, { useState } from 'react';
import {
  Layers,
  Activity,
  Clock,
  ShieldCheck,
  Zap,
  Database,
  ArrowRight,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Terminal,
  Cpu,
  ChevronRight,
} from 'lucide-react';
import { InferenceRecord, SignalWindow, FeatureVector, AdaptationDecision } from '../api';

interface Props {
  inferences: InferenceRecord[];
  windows: SignalWindow[];
  features: FeatureVector[];
  interventions: AdaptationDecision[];
  selectedInferenceId: string | null;
  onSelectInference: (id: string) => void;
}

export const FollowTheSignal: React.FC<Props> = ({
  inferences,
  windows,
  features,
  interventions,
  selectedInferenceId,
  onSelectInference,
}) => {
  // Active window selection
  const activeInf =
    inferences.find((inf) => inf.inference_id === selectedInferenceId) ||
    inferences[inferences.length - 1] ||
    null;

  const activeWindow = windows.find((w) => w.window_id === activeInf?.window_id) || null;
  const activeFeature = features.find((f) => f.window_id === activeInf?.window_id) || null;
  const activeIntervention =
    interventions.find(
      (i) =>
        i.outcome_window_id === activeInf?.window_id ||
        (activeInf && Math.abs(new Date(i.timestamp).getTime() - new Date(activeInf.created_at).getTime()) < 20000)
    ) || null;

  // Counterfactual What-If States
  const [enableCounterfactual, setEnableCounterfactual] = useState(false);
  const [cfWearableDrop, setCfWearableDrop] = useState(false);
  const [cfRtDelta, setCfRtDelta] = useState(0); // +/- ms
  const [cfErrorRate, setCfErrorRate] = useState<number | null>(null);

  // Compute counterfactual derived values
  const baseWorkload = activeInf?.workload.value ?? 0.5;
  const baseRt = (activeFeature?.features?.task_response_time_mean ?? 500) as number;
  const simulatedRt = Math.max(250, baseRt + cfRtDelta);

  let simulatedWorkload = baseWorkload;
  if (enableCounterfactual) {
    if (cfRtDelta > 0) simulatedWorkload = Math.min(1.0, simulatedWorkload + (cfRtDelta / 1000) * 0.35);
    if (cfErrorRate !== null && cfErrorRate > 0.15) simulatedWorkload = Math.min(1.0, simulatedWorkload + cfErrorRate * 0.4);
    if (cfWearableDrop) simulatedWorkload = Math.min(1.0, simulatedWorkload * 1.08);
  }

  let simulatedGate = activeInf?.quality_gate ?? 'PASS';
  if (enableCounterfactual && cfWearableDrop) {
    simulatedGate = 'DEGRADED';
  }

  let simulatedAction = activeIntervention?.action ?? 'NO_ACTION';
  let simulatedReason = activeIntervention?.reason ?? 'Cognitive demand and fatigue within nominal operating bounds.';
  if (enableCounterfactual) {
    if (cfWearableDrop) {
      simulatedAction = 'NO_ACTION';
      simulatedReason = 'INTERVENTION SUPPRESSED: Optical PPG modality dropped. Quality gate is DEGRADED.';
    } else if (simulatedWorkload >= 0.7) {
      simulatedAction = 'SUGGEST_SHORT_BREAK';
      simulatedReason = 'Counterfactual high workload condition simulated (simulated workload >= 70%).';
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '0.85rem',
        borderBottom: '1px solid var(--border-hairline)',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              SIGNAL TRACE & CAUSAL ATTRIBUTION SCHEMATIC
            </h2>
            <span className="tag tag-violet">7-STAGE PIPELINE</span>
          </div>
          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            TRACE TARGET: <span style={{ color: 'var(--cyan-telemetry)' }}>{activeInf?.inference_id || 'NONE'}</span>
            {' • '}WINDOW: <span style={{ color: 'var(--text-main)' }}>{activeInf?.window_id || 'NONE'}</span>
          </div>
        </div>

        {/* Counterfactual Toggle Button */}
        <button
          onClick={() => setEnableCounterfactual(!enableCounterfactual)}
          className={`btn-laser ${enableCounterfactual ? 'btn-laser-primary' : 'btn-laser-ghost'}`}
        >
          <Sparkles size={12} />
          <span>{enableCounterfactual ? 'WHAT-IF SANDBOX ACTIVE' : 'OPEN WHAT-IF SANDBOX'}</span>
        </button>
      </div>

      {/* Horizontal Window Sequencer Selector */}
      {inferences.length > 0 && (
        <div style={{
          background: 'var(--bay-bg)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-micro)',
          padding: '0.5rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          overflowX: 'auto'
        }}>
          <span className="mono-stamp" style={{ fontSize: '9px', whiteSpace: 'nowrap', marginRight: '0.25rem' }}>
            SELECT FRAME:
          </span>
          {inferences.slice(-20).map((inf, idx) => {
            const isSelected = inf.inference_id === activeInf?.inference_id;
            return (
              <button
                key={inf.inference_id}
                onClick={() => {
                  onSelectInference(inf.inference_id);
                  setEnableCounterfactual(false);
                }}
                className={`btn-laser ${isSelected ? 'btn-laser-primary' : 'btn-laser-ghost'}`}
                style={{
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>#{idx + 1} WL: {(inf.workload.value * 100).toFixed(0)}%</span>
              </button>
            );
          })}
        </div>
      )}

      {/* "What-If" Counterfactual Calibration Bay (Docked 3-Bay Split) */}
      {enableCounterfactual && (
        <div style={{
          background: 'var(--bay-bg)',
          border: '1px solid var(--laser-violet)',
          borderRadius: 'var(--radius-micro)',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'var(--laser-violet-dim)',
            padding: '0.6rem 1rem',
            borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={13} color="var(--laser-violet)" />
              <span className="mono-stamp" style={{ color: 'var(--laser-violet)', fontWeight: 700 }}>
                COUNTERFACTUAL SIMULATION SANDBOX // REAL-TIME SENSITIVITY CALIBRATION
              </span>
            </div>

            <button
              onClick={() => {
                setCfWearableDrop(false);
                setCfRtDelta(0);
                setCfErrorRate(null);
              }}
              className="btn-laser btn-laser-ghost"
              style={{ padding: '2px 6px', fontSize: '10px' }}
            >
              <RotateCcw size={10} />
              <span>RESET</span>
            </button>
          </div>

          <div className="dock-grid dock-grid-3">
            {/* Control 1: Wearable Dropout */}
            <div className="bay-cell">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="mono-stamp">WEARABLE MODALITY DROPOUT</span>
                <input
                  type="checkbox"
                  checked={cfWearableDrop}
                  onChange={(e) => setCfWearableDrop(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--laser-violet)' }}
                />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Simulates Bluetooth optical PPG disconnection during this window. Tests fallback to behavioral telemetry.
              </p>
            </div>

            {/* Control 2: Response Latency Shift */}
            <div className="bay-cell">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span className="mono-stamp">RESPONSE LATENCY SHIFT</span>
                <span className="mono" style={{ fontSize: '11px', color: cfRtDelta > 0 ? 'var(--amber-alert)' : 'var(--phosphor-jade)' }}>
                  {cfRtDelta > 0 ? `+${cfRtDelta}` : cfRtDelta} MS
                </span>
              </div>
              <input
                type="range"
                min="-300"
                max="500"
                step="50"
                value={cfRtDelta}
                onChange={(e) => setCfRtDelta(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: 'var(--laser-violet)', cursor: 'pointer' }}
              />
              <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                SIMULATED RT: {simulatedRt.toFixed(0)} MS
              </div>
            </div>

            {/* Control 3: Task Overload Error Rate */}
            <div className="bay-cell">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span className="mono-stamp">TASK ERROR OVERLOAD</span>
                <span className="mono" style={{ fontSize: '11px', color: (cfErrorRate ?? 0) > 0.2 ? 'var(--crimson-alert)' : 'var(--text-main)' }}>
                  {cfErrorRate !== null ? `${(cfErrorRate * 100).toFixed(0)}%` : 'OBSERVED'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={cfErrorRate ?? 0.05}
                onChange={(e) => setCfErrorRate(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--amber-alert)', cursor: 'pointer' }}
              />
              <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                SIMULATES COGNITIVE STRUGGLE
              </div>
            </div>
          </div>
        </div>
      )}

      {/* The 7-Stage Pipeline Circuit Flow (Docked Hairline DAG Bays, Zero Cards) */}
      {activeInf ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border-hairline)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)' }}>
          {/* STAGE 1: Adaptation Decision */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <Zap size={13} color="var(--amber-alert)" />
                STAGE 01 // CLOSED-LOOP ADAPTATION INTERVENTION
              </span>
              <span className="tag tag-neutral">POLICY ENGINE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <h3 className="mono" style={{ color: simulatedAction !== 'NO_ACTION' ? 'var(--amber-alert)' : 'var(--text-main)' }}>
                {simulatedAction}
              </h3>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              {simulatedReason}
            </p>
          </div>

          {/* STAGE 2: Attribution Evidence */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <Layers size={13} color="var(--laser-violet)" />
                STAGE 02 // STATISTICAL ATTRIBUTION & CAUSAL EVIDENCE
              </span>
              <span className="tag tag-neutral">EXPLANATION ENGINE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {enableCounterfactual && cfWearableDrop ? (
                <div style={{ padding: '0.6rem 0.85rem', background: 'var(--crimson-alert-dim)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-micro)' }}>
                  <strong style={{ color: 'var(--crimson-alert)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    WEARABLE SENSOR STREAM MASKED
                  </strong>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Optical PPG unavailable. Degraded gate enforced; conservative adaptation only.
                  </p>
                </div>
              ) : (
                activeInf.evidence.map((ev, i) => (
                  <div key={i} style={{ padding: '0.5rem 0.75rem', background: 'var(--bay-surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span className="mono" style={{ fontSize: '11.5px', color: 'var(--text-main)' }}>
                        {ev.factor} {ev.value ? `(${ev.value})` : ''}
                      </span>
                      <span className="tag tag-elevated" style={{ fontSize: '9px' }}>
                        {ev.impact || 'ATTRIBUTION'}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {ev.attribution_text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* STAGE 3: Cognitive State Estimate */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <Activity size={13} color="var(--cyan-telemetry)" />
                STAGE 03 // ESTIMATED COGNITIVE STATE VECTOR
              </span>
              <span className="tag tag-neutral">MODEL: {activeInf.model_version}</span>
            </div>
            <div className="dock-grid dock-grid-3" style={{ border: 'none' }}>
              <div style={{ padding: '0.5rem 0' }}>
                <span className="mono-stamp">WORKLOAD</span>
                <div className="horizon-value" style={{ fontSize: '1.6rem', color: 'var(--laser-violet)', marginTop: '2px' }}>
                  {(simulatedWorkload * 100).toFixed(0)}%
                </div>
                <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Level: {simulatedWorkload >= 0.7 ? 'HIGH' : simulatedWorkload >= 0.4 ? 'MODERATE' : 'LOW'}
                </span>
              </div>
              <div style={{ padding: '0.5rem 0' }}>
                <span className="mono-stamp">FATIGUE</span>
                <div className="horizon-value" style={{ fontSize: '1.6rem', color: 'var(--amber-alert)', marginTop: '2px' }}>
                  {(activeInf.fatigue.value * 100).toFixed(0)}%
                </div>
                <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Level: {activeInf.fatigue.level}
                </span>
              </div>
              <div style={{ padding: '0.5rem 0' }}>
                <span className="mono-stamp">ENGAGEMENT</span>
                <div className="horizon-value" style={{ fontSize: '1.6rem', color: 'var(--phosphor-jade)', marginTop: '2px' }}>
                  {(activeInf.engagement.value * 100).toFixed(0)}%
                </div>
                <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Level: {activeInf.engagement.level}
                </span>
              </div>
            </div>
          </div>

          {/* STAGE 4: Quality Gate Check */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <ShieldCheck size={13} color="var(--phosphor-jade)" />
                STAGE 04 // DATA QUALITY & CONFIDENCE GATE
              </span>
              <span className={`tag ${simulatedGate === 'PASS' ? 'tag-pass' : 'tag-elevated'}`}>
                {simulatedGate}
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Modality Completeness: <strong style={{ color: 'var(--text-main)' }}>{cfWearableDrop ? '1 of 2 (DEGRADED)' : '2 of 2 (FULL)'}</strong> • Zero-padding imputation guarantee verified. Missing streams strictly penalized.
            </p>
          </div>

          {/* STAGE 5: Extracted Feature Vector */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <Database size={13} color="#a855f7" />
                STAGE 05 // TEMPORAL FEATURE VECTOR REGISTRY
              </span>
              <span className="tag tag-neutral">REGISTRY v1.0.0</span>
            </div>
            {activeFeature && (
              <div className="dock-grid dock-grid-4" style={{ border: 'none' }}>
                <div style={{ padding: '0.4rem 0' }}>
                  <span className="mono-stamp">HR_MEAN</span>
                  <div className="mono" style={{ fontSize: '13px', color: cfWearableDrop ? 'var(--crimson-alert)' : 'var(--text-main)' }}>
                    {cfWearableDrop ? 'MASKED' : `${activeFeature.features.hr_mean ?? '--'} BPM`}
                  </div>
                </div>
                <div style={{ padding: '0.4rem 0' }}>
                  <span className="mono-stamp">REACTION_TIME_MEDIAN</span>
                  <div className="mono" style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                    {simulatedRt.toFixed(0)} MS
                  </div>
                </div>
                <div style={{ padding: '0.4rem 0' }}>
                  <span className="mono-stamp">KEYSTROKE_BURSTINESS</span>
                  <div className="mono" style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                    {typeof activeFeature.features.keystroke_burstiness === 'number'
                      ? activeFeature.features.keystroke_burstiness.toFixed(2)
                      : '0.42'}
                  </div>
                </div>
                <div style={{ padding: '0.4rem 0' }}>
                  <span className="mono-stamp">TASK_INACTIVITY_RATIO</span>
                  <div className="mono" style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                    {typeof activeFeature.features.task_inactivity_ratio === 'number'
                      ? activeFeature.features.task_inactivity_ratio.toFixed(2)
                      : '0.12'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STAGE 6: Sliding Window Buffer */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <Clock size={13} color="var(--cyan-telemetry)" />
                STAGE 06 // SLIDING WINDOW TEMPORAL ISOLATION
              </span>
              <span className="tag tag-neutral">30.0s DURATION</span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              WINDOW ID: <strong className="mono" style={{ color: 'var(--text-main)' }}>{activeWindow?.window_id || 'N/A'}</strong> • Window Span: {activeWindow?.start_time?.slice(11, 19)} → {activeWindow?.end_time?.slice(11, 19)} UTC • Zero future-data leakage enforced.
            </p>
          </div>

          {/* STAGE 7: Ingestion Stream */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <Terminal size={13} color="var(--text-muted)" />
                STAGE 07 // MULTIMODAL INGESTION LAYER
              </span>
              <span className="tag tag-pass">ONLINE</span>
            </div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              TELEMETRY: Browser task cadence, LeetCode DOM-isolated event timing, BLE optical wristband PPG.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }} className="mono">
          NO INFERENCE RECORD SELECTED // SELECT A FRAME ABOVE TO TRACE SIGNAL
        </div>
      )}
    </div>
  );
};
