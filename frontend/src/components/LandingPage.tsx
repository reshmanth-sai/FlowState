import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Fingerprint,
  GitBranch,
  Layers,
  Play,
  Radio,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';

interface Props {
  onLaunchConsole: (tab?: string) => void;
  onNavigate: (route: 'platform' | 'pricing' | 'docs') => void;
  activeSessionId?: string;
  activeWindowsCount?: number;
}

export const LandingPage: React.FC<Props> = ({
  onLaunchConsole,
  onNavigate,
  activeSessionId,
  activeWindowsCount = 69,
}) => {
  // Interactive Canvas State
  const [interactiveLoad, setInteractiveLoad] = useState<number>(65); // 0 - 100%
  const [selectedPillar, setSelectedPillar] = useState<number>(0);
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'extension' | 'rest'>('python');

  // Derived state from interactive slider
  const simulatedWorkload = interactiveLoad / 100;
  const simulatedFatigue = Math.min(0.95, 0.25 + (interactiveLoad / 100) * 0.65);
  const isHighStrain = interactiveLoad >= 70;
  const isModerateStrain = interactiveLoad >= 45 && interactiveLoad < 70;

  const adaptationTriggered = isHighStrain
    ? 'SUGGEST_SHORT_BREAK'
    : isModerateStrain
    ? 'PACING_ADJUSTMENT'
    : 'NO_ACTION';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem', paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <section style={{ paddingTop: '2.5rem', position: 'relative' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          {/* Announcement Pill */}
          <div
            onClick={() => onNavigate('docs')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bay-surface)',
              border: '1px solid var(--border-hairline-bright)',
              borderRadius: '20px',
              padding: '3px 12px',
              marginBottom: '1.5rem',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--phosphor-jade)' }} />
            <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
              PROTOCOL v1.0.0 RELEASED // PHASE 4 EVIDENCE ENGINE
            </span>
            <ArrowRight size={11} color="var(--text-muted)" />
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5.5vw, 4.2rem)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
              marginBottom: '1.25rem',
            }}
          >
            The Cognitive Infrastructure for Adaptive Interfaces.
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              maxWidth: '780px',
              margin: '0 auto 2rem auto',
            }}
          >
            Real-time biosignal telemetry, typing cadence dynamics, and closed-loop UI adaptation—built with 
            strict temporal sliding windows and zero DOM scraping.
          </p>

          {/* Dual CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              className="btn-laser btn-laser-primary"
              onClick={() => onLaunchConsole('monitor')}
              style={{ padding: '0.65rem 1.4rem', fontSize: '13px', gap: '0.6rem' }}
            >
              <Zap size={15} />
              <span>LAUNCH RESEARCH CONSOLE</span>
              <ArrowRight size={13} />
            </button>

            <button
              className="btn-laser btn-laser-ghost"
              onClick={() => onNavigate('docs')}
              style={{ padding: '0.65rem 1.25rem', fontSize: '13px' }}
            >
              <Terminal size={14} />
              <span>READ ARCHITECTURE DOCS</span>
            </button>
          </div>

          {/* Real-Time Telemetry Ticker Ribbon */}
          <div
            style={{
              marginTop: '2.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '1.5rem',
              background: 'var(--bay-bg)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-micro)',
              padding: '0.5rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--phosphor-jade)', boxShadow: '0 0 6px var(--phosphor-jade)' }} />
              <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-main)', fontWeight: 600 }}>
                INGESTION: 0.033 Hz ONLINE
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border-hairline)', paddingLeft: '1.25rem' }}>
              <span className="mono-stamp" style={{ fontSize: '9.5px' }}>AUDIT PROVENANCE:</span>
              <span className="mono" style={{ fontSize: '10.5px', color: 'var(--cyan-telemetry)' }}>
                SHA-256 VERIFIED
              </span>
            </div>

            {activeSessionId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border-hairline)', paddingLeft: '1.25rem' }}>
                <span className="mono-stamp" style={{ fontSize: '9.5px' }}>ACTIVE EXTENSION SESSION:</span>
                <span className="mono" style={{ fontSize: '10.5px', color: 'var(--laser-violet)', fontWeight: 600 }}>
                  {activeSessionId.slice(0, 12)} ({activeWindowsCount} WIN)
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Adaptive Canvas (Railway-Style Live Sandbox) */}
      <section style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{
          background: 'var(--bay-bg)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-micro)',
          overflow: 'hidden'
        }}>
          {/* Canvas Header Bar */}
          <div style={{
            background: 'var(--bay-surface)',
            borderBottom: '1px solid var(--border-hairline)',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={13} color="var(--laser-violet)" />
              <span className="mono-stamp" style={{ color: 'var(--laser-violet)', fontWeight: 700 }}>
                INTERACTIVE COGNITIVE SIMULATOR // TRY CLOSED-LOOP ADAPTATION LIVE
              </span>
            </div>

            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              DRAG MENTAL DEMAND SLIDER TO OBSERVE INTERFACE REACTION
            </span>
          </div>

          {/* Interactive Canvas Body */}
          <div className="dock-grid dock-grid-2" style={{ border: 'none' }}>
            {/* Left Column: Sliders & Telemetry Inputs */}
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                  <span className="mono-stamp">SYNTHETIC TASK LOAD (COGNITIVE DEMAND):</span>
                  <span className="mono" style={{ fontSize: '18px', fontWeight: 600, color: isHighStrain ? 'var(--amber-alert)' : 'var(--laser-violet)' }}>
                    {interactiveLoad}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={interactiveLoad}
                  onChange={(e) => setInteractiveLoad(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--laser-violet)', cursor: 'pointer', height: '6px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  <span>Low Demand (Relaxed)</span>
                  <span>Moderate Problem-Solving</span>
                  <span>Cognitive Overload (Peak)</span>
                </div>
              </div>

              {/* Instant State Estimates */}
              <div className="dock-grid dock-grid-3" style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)' }}>
                <div style={{ padding: '0.75rem' }}>
                  <span className="mono-stamp">WORKLOAD</span>
                  <div className="horizon-value" style={{ fontSize: '1.4rem', color: 'var(--laser-violet)', marginTop: '2px' }}>
                    {(simulatedWorkload * 100).toFixed(0)}%
                  </div>
                  <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                    {isHighStrain ? 'HIGH' : isModerateStrain ? 'MODERATE' : 'LOW'}
                  </span>
                </div>

                <div style={{ padding: '0.75rem' }}>
                  <span className="mono-stamp">FATIGUE</span>
                  <div className="horizon-value" style={{ fontSize: '1.4rem', color: 'var(--amber-alert)', marginTop: '2px' }}>
                    {(simulatedFatigue * 100).toFixed(0)}%
                  </div>
                  <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                    ACCUMULATING
                  </span>
                </div>

                <div style={{ padding: '0.75rem' }}>
                  <span className="mono-stamp">QUALITY GATE</span>
                  <div className="horizon-value" style={{ fontSize: '1.4rem', color: 'var(--phosphor-jade)', marginTop: '2px' }}>
                    PASS
                  </div>
                  <span className="mono" style={{ fontSize: '9.5px', color: 'var(--phosphor-jade)' }}>
                    VERIFIED
                  </span>
                </div>
              </div>

              {/* Fast Scenario Presets */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span className="mono-stamp" style={{ fontSize: '9.5px' }}>PRESETS:</span>
                <button onClick={() => setInteractiveLoad(25)} className="btn-laser btn-laser-ghost" style={{ padding: '2px 8px', fontSize: '10px' }}>
                  Baseline (25%)
                </button>
                <button onClick={() => setInteractiveLoad(55)} className="btn-laser btn-laser-ghost" style={{ padding: '2px 8px', fontSize: '10px' }}>
                  Sustained (55%)
                </button>
                <button onClick={() => setInteractiveLoad(88)} className="btn-laser btn-laser-ghost" style={{ padding: '2px 8px', fontSize: '10px', color: 'var(--amber-alert)' }}>
                  Overload (88%)
                </button>
              </div>
            </div>

            {/* Right Column: Dynamic Closed-Loop Interface Reaction */}
            <div style={{
              padding: '1.75rem',
              background: 'var(--bay-surface)',
              borderLeft: '1px solid var(--border-hairline)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <div>
                <span className="mono-stamp" style={{ color: 'var(--text-muted)' }}>
                  CLOSED-LOOP ADAPTATION ENGINE OUTPUT:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <h3 className="mono" style={{ fontSize: '1.25rem', color: isHighStrain ? 'var(--amber-alert)' : 'var(--text-main)' }}>
                    {adaptationTriggered}
                  </h3>
                  <span className={`tag ${isHighStrain ? 'tag-elevated' : 'tag-neutral'}`}>
                    {isHighStrain ? 'POLICY ACTIVE' : 'MONITORING'}
                  </span>
                </div>
              </div>

              {/* Dynamic Adaptation Mock Preview */}
              <div style={{
                background: isHighStrain ? 'var(--amber-alert-dim)' : 'var(--bay-bg)',
                border: isHighStrain ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-micro)',
                padding: '1rem',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Zap size={14} color={isHighStrain ? 'var(--amber-alert)' : 'var(--cyan-telemetry)'} />
                  <strong style={{ fontSize: '12px', color: isHighStrain ? '#fef3c7' : 'var(--text-main)' }}>
                    {isHighStrain ? 'Cognitive Pacing Prompt' : 'Task Flow Nominal'}
                  </strong>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {isHighStrain
                    ? 'Elevated cognitive workload (>=70%) detected across multiple 30s sliding windows. Suggesting 60s autonomic reset or difficulty reduction.'
                    : 'Attentional focus and typing cadence within steady bounds. Interface maintaining standard density without intervention.'}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => onLaunchConsole('review')}
                  className="btn-laser btn-laser-ghost"
                  style={{ fontSize: '11px' }}
                >
                  <span>INSPECT IN FULL AUDIT DOSSIER</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Architectural Pillars (Docked Hairline Bays, Zero Cards) */}
      <section style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <span className="mono-stamp" style={{ color: 'var(--laser-violet)' }}>
            CORE ENGINEERING SPECIFICATIONS
          </span>
          <h2 style={{ fontSize: '1.75rem', marginTop: '0.2rem' }}>
            Built for Extreme Data Integrity & Zero Privacy Leakage.
          </h2>
        </div>

        <div className="dock-grid dock-grid-4">
          {/* Pillar 1 */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <Cpu size={12} color="var(--laser-violet)" />
                01 // NON-INVASIVE TELEMETRY
              </span>
              <span className="tag tag-pass">ZERO-DOM</span>
            </div>
            <h4 style={{ fontSize: '13px', marginBottom: '0.4rem' }}>
              Keystroke Dynamics & Cadence
            </h4>
            <p style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
              Measures inter-keystroke interval medians, burstiness ratios, and task completion latency. Never touches page code, DOM text, clipboard, or keystroke character values.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <Radio size={12} color="var(--cyan-telemetry)" />
                02 // MULTIMODAL FUSION
              </span>
              <span className="tag tag-neutral">30s SLICES</span>
            </div>
            <h4 style={{ fontSize: '13px', marginBottom: '0.4rem' }}>
              Consumer Optical PPG & Context
            </h4>
            <p style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
              Synchronizes Web Bluetooth heart rate streams with behavioral telemetry across 30s sliding windows. Explicitly declares consumer PPG boundaries with zero ECG fabrication.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <Zap size={12} color="var(--amber-alert)" />
                03 // SOVEREIGN ADAPTATIONS
              </span>
              <span className="tag tag-pass">USER VETO</span>
            </div>
            <h4 style={{ fontSize: '13px', marginBottom: '0.4rem' }}>
              Closed-Loop Pacing Governors
            </h4>
            <p style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
              UI adaptations (box-breathing prompts, difficulty dampening, pacing adjustments) are governed by strict cooldowns. Participants maintain 100% veto sovereignty.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bay-cell">
            <div className="bay-header">
              <span className="bay-title">
                <Fingerprint size={12} color="var(--phosphor-jade)" />
                04 // AUDIT PROVENANCE
              </span>
              <span className="tag tag-pass">SHA-256</span>
            </div>
            <h4 style={{ fontSize: '13px', marginBottom: '0.4rem' }}>
              Cryptographic Session Anchoring
            </h4>
            <p style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
              Every sliding window, extracted feature, and model inference is cryptographically hashed with SHA-256, allowing researchers to export immutable, reproducible dossiers.
            </p>
          </div>
        </div>
      </section>

      {/* Developer Protocol & SDK Terminal */}
      <section style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{
          background: 'var(--bay-bg)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-micro)',
          overflow: 'hidden'
        }}>
          {/* Terminal Tabs */}
          <div style={{
            background: 'var(--bay-surface)',
            borderBottom: '1px solid var(--border-hairline)',
            padding: '0.5rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={13} color="var(--cyan-telemetry)" />
              <span className="mono-stamp" style={{ color: 'var(--text-main)' }}>
                DEVELOPER INTEGRATION // REPRODUCIBLE SCIENTIFIC API
              </span>
            </div>

            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={() => setActiveCodeTab('python')}
                className={`btn-laser ${activeCodeTab === 'python' ? 'btn-laser-primary' : 'btn-laser-ghost'}`}
                style={{ padding: '2px 8px', fontSize: '10px' }}
              >
                Python SDK
              </button>
              <button
                onClick={() => setActiveCodeTab('extension')}
                className={`btn-laser ${activeCodeTab === 'extension' ? 'btn-laser-primary' : 'btn-laser-ghost'}`}
                style={{ padding: '2px 8px', fontSize: '10px' }}
              >
                Extension Protocol
              </button>
              <button
                onClick={() => setActiveCodeTab('rest')}
                className={`btn-laser ${activeCodeTab === 'rest' ? 'btn-laser-primary' : 'btn-laser-ghost'}`}
                style={{ padding: '2px 8px', fontSize: '10px' }}
              >
                REST Endpoints
              </button>
            </div>
          </div>

          {/* Code Snippet Box */}
          <div style={{ padding: '1.25rem 1.5rem', background: '#050608' }}>
            <pre className="mono" style={{ fontSize: '12px', color: '#c7d2fe', lineHeight: 1.6, overflowX: 'auto' }}>
              {activeCodeTab === 'python' && (
`from flowstate.engine import SlidingWindowPipeline
from flowstate.inference import InterpretInferenceEngine
from flowstate.policy import AdaptationPolicy

# 1. Initialize temporal sliding window pipeline (30s window / 15s step)
pipeline = SlidingWindowPipeline(window_duration=30.0, step_size=15.0)

# 2. Ingest behavioral task telemetry and consumer optical PPG
pipeline.ingest_event(signal_type="keystroke_timing", latency_ms=142.0)
pipeline.ingest_event(signal_type="heart_rate", value=74.0, unit="bpm")

# 3. Compute deterministic state estimates & evidence attribution
engine = InterpretInferenceEngine(model_version="baseline_interpretable_v1.0.0")
inference = engine.predict_window(pipeline.get_active_window())
print(f"Workload: {inference.workload.value:.2f}, Fatigue: {inference.fatigue.value:.2f}")

# 4. Check closed-loop sovereign adaptation decision
decision = AdaptationPolicy().evaluate(inference)
print(f"Action: {decision.action} [Cooldown: {decision.cooldown_seconds}s]")`
              )}

              {activeCodeTab === 'extension' && (
`// Flowstate Chrome Extension Telemetry Contract (v1.0.0)
// Emitted to http://127.0.0.1:8000/tasks/{session_id}/browser-telemetry

{
  "context_schema_version": "1.0.0",
  "domain": "leetcode.com",
  "task_context": {
    "task_id": "palindrome-number",
    "difficulty_label": "Easy",
    "difficulty_scalar": 1.0,
    "environmental_metadata_only": true
  },
  "behavioral_telemetry": {
    "keystroke_count": 84,
    "inter_key_interval_median_ms": 158.4,
    "task_inactivity_seconds": 12.0
  }
}`
              )}

              {activeCodeTab === 'rest' && (
`# Query authoritative session timeline & all 69 sliding windows
GET http://127.0.0.1:8000/sessions/sess_7ef93235c6/timeline

# Run controlled reproducible benchmark scenario
POST http://127.0.0.1:8000/evaluation/run/peak_workload
Content-Type: application/json
{ "seed": 42 }

# Trace causal attribution DAG for any window
GET http://127.0.0.1:8000/inference/trace/inf_win_sess_7ef93235c6_1789734058`
              )}
            </pre>
          </div>
        </div>
      </section>

      {/* Pricing Overview Section */}
      <section style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="mono-stamp" style={{ color: 'var(--laser-violet)' }}>
              TRANSPARENT DEVELOPER & LAB ACCESS
            </span>
            <h2 style={{ fontSize: '1.75rem', marginTop: '0.2rem' }}>
              Simple, Predictable Infrastructure Tiers.
            </h2>
          </div>

          <button
            onClick={() => onNavigate('pricing')}
            className="btn-laser btn-laser-ghost"
          >
            <span>VIEW FULL TIER MATRIX & FAQ</span>
            <ArrowRight size={12} />
          </button>
        </div>

        <div className="dock-grid dock-grid-3">
          {/* Tier 1: Community */}
          <div className="bay-cell">
            <span className="mono-stamp">COMMUNITY / LOCAL</span>
            <div style={{ fontSize: '2rem', fontWeight: 300, fontFamily: 'var(--font-mono)', margin: '0.5rem 0' }}>
              $0 <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>FOREVER</span>
            </div>
            <p style={{ fontSize: '11.5px', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Open-source local engine for developers exploring adaptive interfaces and cognitive telemetry.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '11px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} color="var(--phosphor-jade)" />
                <span>Full Local Pipeline & SQLite Storage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} color="var(--phosphor-jade)" />
                <span>Chrome Extension Integration</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} color="var(--phosphor-jade)" />
                <span>Web Bluetooth (BLE) PPG Stream</span>
              </div>
            </div>
            <button onClick={() => onLaunchConsole()} className="btn-laser btn-laser-ghost" style={{ width: '100%', justifyContent: 'center' }}>
              LAUNCH LOCAL WORKSPACE
            </button>
          </div>

          {/* Tier 2: Research Pro */}
          <div className="bay-cell" style={{ borderTop: '2px solid var(--laser-violet)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono-stamp" style={{ color: 'var(--laser-violet)' }}>RESEARCH PRO</span>
              <span className="tag tag-violet">POPULAR</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 300, fontFamily: 'var(--font-mono)', margin: '0.5rem 0' }}>
              $49 <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ SEAT / MO</span>
            </div>
            <p style={{ fontSize: '11.5px', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Designed for HCI researchers, labs, and neuro-ergonomic study teams publishing peer-reviewed papers.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '11px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} color="var(--phosphor-jade)" />
                <span>Everything in Community</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} color="var(--phosphor-jade)" />
                <span>Cryptographic SHA-256 Dossier Exports</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} color="var(--phosphor-jade)" />
                <span>Phase 4 Evaluation Suite & Diff Matrix</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} color="var(--phosphor-jade)" />
                <span>Multi-Session Cohort Aggregation</span>
              </div>
            </div>
            <button onClick={() => onNavigate('pricing')} className="btn-laser btn-laser-primary" style={{ width: '100%', justifyContent: 'center' }}>
              START RESEARCH TRIAL
            </button>
          </div>

          {/* Tier 3: Enterprise Fleet */}
          <div className="bay-cell">
            <span className="mono-stamp">ENTERPRISE FLEET</span>
            <div style={{ fontSize: '2rem', fontWeight: 300, fontFamily: 'var(--font-mono)', margin: '0.5rem 0' }}>
              $499 <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ LAB / MO</span>
            </div>
            <p style={{ fontSize: '11.5px', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              For enterprise product teams, defense research, and high-stakes cockpit telemetry integration.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '11px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} color="var(--phosphor-jade)" />
                <span>Custom Hardware Adapters (Empatica, Polar)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} color="var(--phosphor-jade)" />
                <span>Audit Log Compliance & Self-Hosting</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} color="var(--phosphor-jade)" />
                <span>SLA & Dedicated Research Engineering Support</span>
              </div>
            </div>
            <button onClick={() => onNavigate('pricing')} className="btn-laser btn-laser-ghost" style={{ width: '100%', justifyContent: 'center' }}>
              CONTACT ENTERPRISE
            </button>
          </div>
        </div>
      </section>

      {/* Engineering Footer */}
      <footer style={{
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
        paddingTop: '2rem',
        borderTop: '1px solid var(--border-hairline)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>FLOWSTATE</span>
            <span style={{ color: 'var(--border-hairline-bright)' }}>//</span>
            <span className="mono-stamp" style={{ fontSize: '9.5px' }}>
              MULTIMODAL CONTEXT-AWARE ADAPTIVE SYSTEM
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '11px' }}>
            <button onClick={() => onNavigate('platform')} className="btn-laser btn-laser-ghost" style={{ border: 'none', padding: '0' }}>Platform</button>
            <button onClick={() => onNavigate('pricing')} className="btn-laser btn-laser-ghost" style={{ border: 'none', padding: '0' }}>Pricing</button>
            <button onClick={() => onNavigate('docs')} className="btn-laser btn-laser-ghost" style={{ border: 'none', padding: '0' }}>Documentation</button>
            <button onClick={() => onLaunchConsole()} className="btn-laser btn-laser-ghost" style={{ border: 'none', padding: '0' }}>Console</button>
          </div>
        </div>

        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: 1.5, borderTop: '1px solid var(--border-hairline)', paddingTop: '1rem' }}>
          <strong>Scientific Disclaimer:</strong> Flowstate is an empirical research platform. State estimates reflect cognitive task demand, not medical, psychiatric, or clinical diagnoses. Optical photoplethysmography is recorded via consumer BLE and is explicitly not clinical electrocardiography (ECG). All rights reserved © 2026 Flowstate Research.
        </div>
      </footer>
    </div>
  );
};
