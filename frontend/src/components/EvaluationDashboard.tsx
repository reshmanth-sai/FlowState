import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Cpu,
  Layers,
  Play,
  RotateCcw,
  Shield,
  Sliders,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  api,
  EvaluationScenario,
  EvaluationRunRecord,
  ScenarioComparison,
} from '../api';

export const EvaluationDashboard: React.FC = () => {
  const [scenarios, setScenarios] = useState<EvaluationScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('steady_baseline');
  const [activeRun, setActiveRun] = useState<EvaluationRunRecord | null>(null);
  const [baselineRun, setBaselineRun] = useState<EvaluationRunRecord | null>(null);
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [recentRuns, setRecentRuns] = useState<EvaluationRunRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load scenarios and existing runs on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const scList = await api.getEvaluationScenarios();
        setScenarios(scList);

        const runs = await api.getEvaluationRuns(15);
        setRecentRuns(runs);

        // If existing runs, select latest
        if (runs.length > 0) {
          const latest = runs[0];
          setActiveRun(latest);
          setSelectedScenarioId(latest.scenario_id);

          // Find baseline if available
          const base = runs.find((r) => r.scenario_id === 'steady_baseline');
          if (base) {
            setBaselineRun(base);
            if (latest.scenario_id !== 'steady_baseline') {
              const comp = await api.compareEvaluationRun(latest.evaluation_run_id, base.evaluation_run_id);
              setComparison(comp);
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to load evaluation data', err);
        setError(err.message || 'Failed to initialize evaluation lab');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Handler: Run controlled scenario
  const handleExecuteScenario = async (scenarioId: string) => {
    try {
      setLoading(true);
      setError(null);
      const run = await api.runEvaluation(scenarioId, 42);
      setActiveRun(run);

      // Refresh runs list
      const updatedRuns = await api.getEvaluationRuns(15);
      setRecentRuns(updatedRuns);

      // Check baseline
      let base = baselineRun;
      if (scenarioId === 'steady_baseline') {
        base = run;
        setBaselineRun(run);
        setComparison(null);
      } else {
        if (!base) {
          base = updatedRuns.find((r) => r.scenario_id === 'steady_baseline') || null;
        }
        if (base) {
          setBaselineRun(base);
          const comp = await api.compareEvaluationRun(run.evaluation_run_id, base.evaluation_run_id);
          setComparison(comp);
        } else {
          // Trigger baseline run on demand
          const autoBase = await api.runEvaluation('steady_baseline', 42);
          setBaselineRun(autoBase);
          const comp = await api.compareEvaluationRun(run.evaluation_run_id, autoBase.evaluation_run_id);
          setComparison(comp);
        }
      }
    } catch (err: any) {
      console.error('Error running scenario', err);
      setError(err.message || 'Scenario execution failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedScenario = scenarios.find((s) => s.scenario_id === selectedScenarioId) || scenarios[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Top Banner & Scientific Disclaimer */}
      <div className="surface-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Controlled Evaluation & Evidence Layer
              </h2>
              <span className="badge-chip badge-primary" style={{ fontSize: '0.7rem' }}>
                Phase 4 • v1.0.0
              </span>
              <span className="badge-chip badge-neutral" style={{ fontSize: '0.7rem' }}>
                Deterministic Pipeline Replay
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '850px', lineHeight: 1.4 }}>
              Empirical verification demonstrating how Flowstate's existing feature extraction, cognitive state estimators,
              and adaptation policy respond to controlled behavioral variations without altering production models or thresholds.
            </p>
          </div>

          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              maxWidth: '420px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <AlertCircle size={14} color="#f87171" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', letterSpacing: '0.02em' }}>
                SCIENTIFIC BOUNDARY DISCLAIMER
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#fca5a5', lineHeight: 1.35 }}>
              Evaluation results describe production-pipeline responses to controlled synthetic behavioral inputs. They do not establish human cognitive-state ground truth, clinical validity, or causal relationships.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '0.825rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Scenario Selection Grid */}
      <div className="surface-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={16} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Select Controlled Behavioral Condition
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Authoritative Production Pipeline Replay
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {scenarios.map((sc) => {
            const isSelected = sc.scenario_id === selectedScenarioId;
            return (
              <button
                key={sc.scenario_id}
                onClick={() => setSelectedScenarioId(sc.scenario_id)}
                style={{
                  textAlign: 'left',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {sc.name.split(':')[0]}
                  </span>
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                    {sc.duration_seconds}s
                  </span>
                </div>
                <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sc.name.split(':')[1]?.trim() || sc.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  {sc.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Scenario Action Bar */}
        {selectedScenario && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedScenario.name}
                </span>
                <span className="badge-chip badge-neutral" style={{ fontSize: '0.675rem' }}>
                  Seed: 42 (Fixed Determinism)
                </span>
                <span className="badge-chip badge-neutral" style={{ fontSize: '0.675rem' }}>
                  Input Provenance: SIMULATED
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <strong>Controlled Behavioral Pattern:</strong> {selectedScenario.expected_observation}
              </div>
            </div>

            <button
              onClick={() => handleExecuteScenario(selectedScenario.scenario_id)}
              disabled={loading}
              style={{
                background: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.55rem 1.25rem',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Play size={14} />
              {loading ? 'Replaying Pipeline...' : 'Run Controlled Evaluation'}
            </button>
          </div>
        )}
      </div>

      {/* Main Evidence Trace Chain (The Core Reviewer Demo) */}
      {activeRun && (
        <div className="surface-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--accent-primary)" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Authoritative Evidence Trace Chain
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Run ID: <code style={{ color: 'var(--text-primary)' }}>{activeRun.evaluation_run_id}</code>
              </span>
              <span className="badge-chip badge-neutral" style={{ fontSize: '0.675rem' }}>
                Pipeline Pass
              </span>
            </div>
          </div>

          {/* Stepper Flow */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Step 1: Scenario */}
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                1. Scenario
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                {activeRun.scenario_id}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Duration: {activeRun.observations.time_on_task_seconds}s
              </div>
            </div>

            {/* Step 2: Task Context (Isolated) */}
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                2. Task Context
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                {activeRun.context.platform || 'LeetCode'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#93c5fd' }}>
                Difficulty: {activeRun.context.difficulty_scalar ?? 1.0} (Metadata only)
              </div>
            </div>

            {/* Step 3: Observed Behavior */}
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                3. Observed Behavior
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                {activeRun.observations.typing_interval_mean_ms} ms mean
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Synthetic Controlled Telemetry ({activeRun.observations.pause_count} pauses)
              </div>
            </div>

            {/* Step 4: Features */}
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                4. Extracted Features
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                v{activeRun.feature_version}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Modality: [task_behaviour]
              </div>
            </div>

            {/* Step 5: Estimated State */}
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                5. Model Estimate
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                FT: {(activeRun.estimates.fatigue.value * 100).toFixed(0)}% • WL: {(activeRun.estimates.workload.value * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                EG: {(activeRun.estimates.engagement.value * 100).toFixed(0)}%
              </div>
            </div>

            {/* Step 6: Quality Gate */}
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                6. Quality Gate
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                <span
                  className={`badge-chip ${
                    activeRun.quality.gate === 'PASS'
                      ? 'badge-success'
                      : activeRun.quality.gate === 'DEGRADED'
                      ? 'badge-warning'
                      : 'badge-danger'
                  }`}
                  style={{ fontSize: '0.7rem' }}
                >
                  {activeRun.quality.gate}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeRun.quality.confidence}
                </span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                Single-modality behavior
              </div>
            </div>

            {/* Step 7: Adaptation */}
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                7. Adaptation
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: activeRun.adaptation.triggered ? '#fbbf24' : 'var(--text-primary)', marginBottom: '0.2rem' }}>
                {activeRun.adaptation.action}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {activeRun.adaptation.triggered ? 'Triggered' : 'Nominal bounds'}
              </div>
            </div>
          </div>

          {/* Detailed Observations & Estimates Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {/* Observed Signals Table */}
            <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Controlled Behavioral Signals (Simulated Input)
              </div>
              <table style={{ width: '100%', fontSize: '0.775rem', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>Typing Interval Mean</td>
                    <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600 }}>{activeRun.observations.typing_interval_mean_ms} ms</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>Typing Interval Std</td>
                    <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600 }}>{activeRun.observations.typing_interval_std_ms} ms</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>Pause Count / Duration</td>
                    <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600 }}>
                      {activeRun.observations.pause_count} count ({activeRun.observations.pause_duration_total_seconds} s)
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>Observed Error Rate</td>
                    <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600 }}>
                      {(activeRun.observations.error_rate * 100).toFixed(1)}% (Backspaces: {activeRun.observations.backspace_count})
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>Active Interaction Duration</td>
                    <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600 }}>{activeRun.observations.active_time_seconds} s</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>Elapsed Time-on-Task</td>
                    <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 600 }}>{activeRun.observations.time_on_task_seconds} s</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Model Estimated States Grid */}
            <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Production-Generated Model Response (Production Pipeline Output)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Workload */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Estimated Workload</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {(activeRun.estimates.workload.value * 100).toFixed(0)}% • {activeRun.estimates.workload.level}
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${activeRun.estimates.workload.value * 100}%`,
                        background: activeRun.estimates.workload.value >= 0.7 ? '#ef4444' : '#3b82f6',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Fatigue */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Estimated Fatigue</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {(activeRun.estimates.fatigue.value * 100).toFixed(0)}% • {activeRun.estimates.fatigue.level}
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${activeRun.estimates.fatigue.value * 100}%`,
                        background: activeRun.estimates.fatigue.value >= 0.65 ? '#f59e0b' : '#10b981',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Engagement */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Estimated Engagement</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {(activeRun.estimates.engagement.value * 100).toFixed(0)}% • {activeRun.estimates.engagement.level}
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${activeRun.estimates.engagement.value * 100}%`,
                        background: '#8b5cf6',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <strong>Adaptation Action:</strong> {activeRun.adaptation.reason}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Descriptive Baseline Comparison Panel */}
      {comparison && (
        <div className="surface-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <RotateCcw size={16} color="#34d399" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Descriptive Scenario-to-Baseline Comparison
            </h3>
          </div>

          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.85rem',
              color: '#d1fae5',
              lineHeight: 1.45,
              marginBottom: '1rem',
            }}
          >
            {comparison.descriptive_narrative}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Observed Pause Delta</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: comparison.observations_delta.pause_duration_total_seconds > 0 ? '#fbbf24' : 'var(--text-primary)' }}>
                {comparison.observations_delta.pause_duration_total_seconds >= 0 ? '+' : ''}{comparison.observations_delta.pause_duration_total_seconds || 0}s
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Observed Error Rate Delta</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: comparison.observations_delta.error_rate > 0 ? '#f87171' : 'var(--text-primary)' }}>
                {comparison.observations_delta.error_rate >= 0 ? '+' : ''}{((comparison.observations_delta.error_rate || 0) * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Estimated Fatigue Delta</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: comparison.estimates_delta.fatigue > 0 ? '#fbbf24' : 'var(--text-primary)' }}>
                {comparison.estimates_delta.fatigue >= 0 ? '+' : ''}{((comparison.estimates_delta.fatigue || 0) * 100).toFixed(0)}%
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Estimated Workload Delta</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: comparison.estimates_delta.workload > 0 ? '#60a5fa' : 'var(--text-primary)' }}>
                {comparison.estimates_delta.workload >= 0 ? '+' : ''}{((comparison.estimates_delta.workload || 0) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Evaluation Runs Log */}
      <div className="surface-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="var(--text-muted)" />
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Reproducible Evaluation Run History
            </h3>
          </div>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
            Total Recorded Runs: {recentRuns.length}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.775rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.5rem' }}>Run ID</th>
                <th style={{ padding: '0.5rem' }}>Scenario</th>
                <th style={{ padding: '0.5rem' }}>Est. Workload</th>
                <th style={{ padding: '0.5rem' }}>Est. Fatigue</th>
                <th style={{ padding: '0.5rem' }}>Est. Engagement</th>
                <th style={{ padding: '0.5rem' }}>Gate</th>
                <th style={{ padding: '0.5rem' }}>Action</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((r) => (
                <tr key={r.evaluation_run_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <code style={{ fontSize: '0.7rem' }}>{r.evaluation_run_id.slice(0, 16)}...</code>
                  </td>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>{r.scenario_id}</td>
                  <td style={{ padding: '0.5rem' }}>{(r.estimates.workload.value * 100).toFixed(0)}% ({r.estimates.workload.level})</td>
                  <td style={{ padding: '0.5rem' }}>{(r.estimates.fatigue.value * 100).toFixed(0)}% ({r.estimates.fatigue.level})</td>
                  <td style={{ padding: '0.5rem' }}>{(r.estimates.engagement.value * 100).toFixed(0)}% ({r.estimates.engagement.level})</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span className={`badge-chip ${r.quality.gate === 'PASS' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                      {r.quality.gate}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', color: r.adaptation.triggered ? '#fbbf24' : 'var(--text-muted)' }}>
                    {r.adaptation.action}
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    <button
                      onClick={async () => {
                        setActiveRun(r);
                        setSelectedScenarioId(r.scenario_id);
                        if (baselineRun && r.scenario_id !== 'steady_baseline') {
                          const comp = await api.compareEvaluationRun(r.evaluation_run_id, baselineRun.evaluation_run_id);
                          setComparison(comp);
                        } else {
                          setComparison(null);
                        }
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      Inspect Trace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
