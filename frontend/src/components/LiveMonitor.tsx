import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  ArrowUpRight,
  Brain,
  Zap,
  RefreshCw,
  Layers,
  Heart,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Sliders,
  Terminal,
} from 'lucide-react';
import { InferenceRecord, SignalWindow, FeatureVector, AdaptationDecision } from '../api';

interface Props {
  latestInference: InferenceRecord | null;
  latestWindow: SignalWindow | null;
  latestFeatures: FeatureVector | null;
  activeIntervention: AdaptationDecision | null;
  onRunDemo: () => void;
  onFollowSignal: (inferenceId: string) => void;
  isRunningDemo: boolean;
  demoPhase?: string;
  allInferences?: InferenceRecord[];
  allWindows?: SignalWindow[];
  allFeatures?: FeatureVector[];
}

export const LiveMonitor: React.FC<Props> = ({
  latestInference,
  latestWindow,
  latestFeatures,
  activeIntervention,
  onRunDemo,
  onFollowSignal,
  isRunningDemo,
  demoPhase,
  allInferences = [],
  allWindows = [],
  allFeatures = [],
}) => {
  // Scrubber / Playback states
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const activeIdx =
    scrubIndex !== null
      ? Math.min(scrubIndex, Math.max(0, allInferences.length - 1))
      : allInferences.length - 1;

  const currentInf = allInferences.length > 0 && activeIdx >= 0 ? allInferences[activeIdx] : latestInference;
  const currentWin = allWindows.length > 0 && activeIdx >= 0 ? allWindows[activeIdx] : latestWindow;
  const currentFeat = allFeatures.length > 0 && activeIdx >= 0 ? allFeatures[activeIdx] : latestFeatures;

  const workloadVal = currentInf?.workload.value ?? 0.42;
  const workloadLevel = currentInf?.workload.level ?? 'MODERATE';
  const workloadConf = currentInf?.workload.confidence ?? 0.85;

  const fatigueVal = currentInf?.fatigue.value ?? 0.28;
  const fatigueLevel = currentInf?.fatigue.level ?? 'LOW';
  const fatigueConf = currentInf?.fatigue.confidence ?? 0.82;

  const engagementVal = currentInf?.engagement.value ?? 0.78;
  const engagementLevel = currentInf?.engagement.level ?? 'HIGH';
  const engagementConf = currentInf?.engagement.confidence ?? 0.88;

  const qualityGate = currentInf?.quality_gate ?? 'PASS';
  const currentHr = currentFeat?.features?.hr_mean ?? 74.0;

  // Cardiac pulse calculation
  const pulseDuration = Math.max(0.4, Math.min(1.5, 60 / Math.max(40, currentHr)));
  const isElevatedHr = currentHr > 84;
  const cardiacColor = isElevatedHr ? '#f43f5e' : currentHr > 77 ? '#f59e0b' : '#10b981';

  // Playback timer tick
  useEffect(() => {
    if (!isPlaying || allInferences.length === 0) return;

    const intervalTime = Math.max(200, 1200 / playbackSpeed);
    const interval = setInterval(() => {
      setScrubIndex((prev) => {
        const next = (prev === null ? 0 : prev) + 1;
        if (next >= allInferences.length) {
          setIsPlaying(false);
          return allInferences.length - 1;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, allInferences.length]);

  // Phase Quick Jump
  const handlePhaseJump = (fraction: number) => {
    if (allInferences.length === 0) return;
    const targetIdx = Math.min(allInferences.length - 1, Math.floor(fraction * allInferences.length));
    setScrubIndex(targetIdx);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Telemetry Flight Control Ribbon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '0.85rem',
        borderBottom: '1px solid var(--border-hairline)',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <span className="mono-stamp">TELEMETRY STREAM // ACTIVE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
              <span className="mono" style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
                {demoPhase || 'CONTINUOUS MULTIMODAL INGESTION'}
              </span>
              <span className={`tag ${qualityGate === 'PASS' ? 'tag-pass' : 'tag-elevated'}`}>
                GATE: {qualityGate}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderLeft: '1px solid var(--border-hairline)', paddingLeft: '1rem' }}>
            <span className="badge-chip badge-neutral" style={{ fontSize: '9px' }}>
              SIMULATED REF
            </span>
            <div className="mono">
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {currentHr.toFixed(1)}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '3px' }}>BPM</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn-laser btn-laser-primary"
            onClick={onRunDemo}
            disabled={isRunningDemo}
          >
            {isRunningDemo ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            <span>{isRunningDemo ? 'EXECUTING...' : 'RUN BENCHMARK DEMO'}</span>
          </button>

          {currentInf && (
            <button
              className="btn-laser btn-laser-ghost"
              onClick={() => onFollowSignal(currentInf.inference_id)}
            >
              <span>TRACE SIGNAL</span>
              <ArrowUpRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Active Adaptation Notification Banner (If triggered) */}
      {activeIntervention && (
        <div style={{
          background: 'var(--amber-alert-dim)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 'var(--radius-micro)',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Zap size={15} color="var(--amber-alert)" />
            <div>
              <span className="mono-stamp" style={{ color: 'var(--amber-alert)' }}>
                CLOSED-LOOP ADAPTATION TRIGGERED: {activeIntervention.action}
              </span>
              <p style={{ fontSize: '11.5px', color: '#fef3c7', marginTop: '2px' }}>
                {activeIntervention.reason}
              </p>
            </div>
          </div>

          <span className="tag tag-elevated">
            COOLDOWN: {activeIntervention.cooldown_seconds}s
          </span>
        </div>
      )}

      {/* Multi-Channel Cognitive State Horizon (Docked 3-Bay Split, Zero Cards) */}
      <div className="horizon-bar" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {/* Channel 1: Workload */}
        <div className="horizon-cell">
          <div className="horizon-label">
            <span>COGNITIVE WORKLOAD</span>
            <span className={`tag ${workloadLevel === 'HIGH' ? 'tag-elevated' : 'tag-violet'}`}>
              {workloadLevel}
            </span>
          </div>
          <div className="horizon-value-row">
            <span className="horizon-value" style={{ color: 'var(--laser-violet)' }}>
              {(workloadVal * 100).toFixed(0)}%
            </span>
            <span className="horizon-delta delta-neutral">INDEX [0-1]</span>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', marginTop: '0.65rem', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${workloadVal * 100}%`, background: 'var(--laser-violet)' }} />
          </div>
          <div className="horizon-sub" style={{ marginTop: '0.5rem' }}>
            Model Confidence: <strong style={{ color: 'var(--text-main)' }}>{(workloadConf * 100).toFixed(0)}%</strong>
          </div>
        </div>

        {/* Channel 2: Fatigue */}
        <div className="horizon-cell">
          <div className="horizon-label">
            <span>COGNITIVE FATIGUE</span>
            <span className={`tag ${fatigueLevel === 'ELEVATED' ? 'tag-elevated' : 'tag-neutral'}`}>
              {fatigueLevel}
            </span>
          </div>
          <div className="horizon-value-row">
            <span className="horizon-value" style={{ color: 'var(--amber-alert)' }}>
              {(fatigueVal * 100).toFixed(0)}%
            </span>
            <span className="horizon-delta delta-up">ACCUMULATION</span>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', marginTop: '0.65rem', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fatigueVal * 100}%`, background: 'var(--amber-alert)' }} />
          </div>
          <div className="horizon-sub" style={{ marginTop: '0.5rem' }}>
            Model Confidence: <strong style={{ color: 'var(--text-main)' }}>{(fatigueConf * 100).toFixed(0)}%</strong>
          </div>
        </div>

        {/* Channel 3: Engagement */}
        <div className="horizon-cell">
          <div className="horizon-label">
            <span>TASK ENGAGEMENT</span>
            <span className="tag tag-pass">{engagementLevel}</span>
          </div>
          <div className="horizon-value-row">
            <span className="horizon-value" style={{ color: 'var(--phosphor-jade)' }}>
              {(engagementVal * 100).toFixed(0)}%
            </span>
            <span className="horizon-delta delta-down">ATTENTIONAL</span>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', marginTop: '0.65rem', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${engagementVal * 100}%`, background: 'var(--phosphor-jade)' }} />
          </div>
          <div className="horizon-sub" style={{ marginTop: '0.5rem' }}>
            Model Confidence: <strong style={{ color: 'var(--text-main)' }}>{(engagementConf * 100).toFixed(0)}%</strong>
          </div>
        </div>
      </div>

      {/* Multi-Wave Oscilloscope Canvas */}
      <div className="oscilloscope-box oscilloscope-grid-bg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={12} color="var(--cyan-telemetry)" />
            <span className="mono-stamp">
              SYNCHRONIZED MULTI-CHANNEL OSCILLOSCOPE // {allInferences.length} CONTINUOUS FRAMES
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '2px', background: 'var(--laser-violet)' }} />
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>WORKLOAD</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '2px', background: 'var(--amber-alert)' }} />
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>FATIGUE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '2px', background: 'var(--phosphor-jade)' }} />
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>ENGAGEMENT</span>
            </div>
          </div>
        </div>

        {/* SVG Waveform Area */}
        <div style={{ height: '160px', width: '100%', position: 'relative' }}>
          {allInferences.length > 1 ? (
            <svg style={{ width: '100%', height: '100%', overflow: 'visible' }} viewBox="0 0 1000 160" preserveAspectRatio="none">
              {/* Horizontal Reference Lines */}
              <line x1="0" y1="40" x2="1000" y2="40" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="1000" y2="80" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="1000" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

              {/* Workload Polyline (Violet) */}
              <polyline
                fill="none"
                stroke="var(--laser-violet)"
                strokeWidth="2"
                points={allInferences
                  .map((inf, i) => `${(i / (allInferences.length - 1)) * 1000},${150 - inf.workload.value * 140}`)
                  .join(' ')}
              />

              {/* Fatigue Polyline (Amber) */}
              <polyline
                fill="none"
                stroke="var(--amber-alert)"
                strokeWidth="2"
                points={allInferences
                  .map((inf, i) => `${(i / (allInferences.length - 1)) * 1000},${150 - inf.fatigue.value * 140}`)
                  .join(' ')}
              />

              {/* Engagement Polyline (Jade) */}
              <polyline
                fill="none"
                stroke="var(--phosphor-jade)"
                strokeWidth="2"
                points={allInferences
                  .map((inf, i) => `${(i / (allInferences.length - 1)) * 1000},${150 - inf.engagement.value * 140}`)
                  .join(' ')}
              />

              {/* Scrubber Laser Needle */}
              {allInferences.length > 1 && (
                <line
                  x1={`${(activeIdx / (allInferences.length - 1)) * 1000}`}
                  y1="0"
                  x2={`${(activeIdx / (allInferences.length - 1)) * 1000}`}
                  y2="160"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              AWAITING TELEMETRY STREAMS // CLICK [RUN BENCHMARK DEMO]
            </div>
          )}
        </div>

        {/* Playback Scrubber Strip */}
        {allInferences.length > 1 && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className="btn-laser btn-laser-ghost"
                onClick={() => setIsPlaying(!isPlaying)}
                style={{ padding: '3px 8px', fontSize: '10.5px' }}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                className="btn-laser btn-laser-ghost"
                onClick={() => {
                  setScrubIndex(0);
                  setIsPlaying(true);
                }}
                style={{ padding: '3px 6px' }}
                title="Restart"
              >
                <RotateCcw size={11} />
              </button>

              <div style={{ display: 'flex', gap: '1px', background: 'var(--bay-surface)', padding: '1px', borderRadius: 'var(--radius-micro)' }}>
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    style={{
                      background: playbackSpeed === spd ? 'var(--bay-elevated)' : 'transparent',
                      color: playbackSpeed === spd ? 'var(--text-main)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-micro)',
                      padding: '2px 5px',
                      fontSize: '9.5px',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer'
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Phase Jump */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {[
                { label: '01 BASELINE', f: 0.0 },
                { label: '02 DEMAND', f: 0.25 },
                { label: '03 PEAK', f: 0.5 },
                { label: '04 ADAPT', f: 0.7 },
                { label: '05 RECOVERY', f: 0.9 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => handlePhaseJump(p.f)}
                  className="btn-laser btn-laser-ghost"
                  style={{ padding: '2px 6px', fontSize: '9.5px', fontFamily: 'var(--font-mono)' }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              FRAME: {activeIdx + 1} / {allInferences.length} (~{activeIdx * 15}s)
            </div>
          </div>
        )}
      </div>

      {/* Primary Attribution Feed */}
      {currentInf?.evidence && currentInf.evidence.length > 0 && (
        <div style={{
          background: 'var(--bay-bg)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-micro)',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Terminal size={14} color="var(--laser-violet)" />
            <div>
              <span className="mono-stamp" style={{ fontSize: '9px' }}>
                PRIMARY STATISTICAL ATTRIBUTION // FACTOR: {currentInf.evidence[0].factor}
              </span>
              <p style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '2px' }}>
                {currentInf.evidence[0].attribution_text}
              </p>
            </div>
          </div>

          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            IMPACT: <strong style={{ color: 'var(--laser-violet)' }}>{currentInf.evidence[0].impact || 'FATIGUE_FACTOR'}</strong>
          </span>
        </div>
      )}
    </div>
  );
};
