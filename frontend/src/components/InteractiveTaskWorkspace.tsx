import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  Wind,
} from 'lucide-react';
import { api, TaskProblem, AdaptationDecision } from '../api';
import { sounds } from '../utils/audio';

interface Props {
  sessionId: string;
  activeIntervention: AdaptationDecision | null;
  onInterventionResponse: (interventionId: string, action: string) => void;
  onTelemetrySubmitted: () => void;
}

export const InteractiveTaskWorkspace: React.FC<Props> = ({
  sessionId,
  activeIntervention,
  onInterventionResponse,
  onTelemetrySubmitted,
}) => {
  const [problem, setProblem] = useState<TaskProblem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [difficulty, setDifficulty] = useState(1.5);
  const [feedbackState, setFeedbackState] = useState<'IDLE' | 'CORRECT' | 'INCORRECT'>('IDLE');
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Box Breathing cycle states: INHALE (4s), HOLD (4s), EXHALE (4s), HOLD (4s)
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathSeconds, setBreathSeconds] = useState(4);
  const [breakRecoveryTime, setBreakRecoveryTime] = useState(30);

  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [recentLatencies, setRecentLatencies] = useState<number[]>([]);
  const [presentationTime, setPresentationTime] = useState<number>(Date.now());
  const [elapsedCurrent, setElapsedCurrent] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sound effect trigger when new intervention appears
  useEffect(() => {
    if (activeIntervention && activeIntervention.status === 'OFFERED') {
      sounds.playInterventionChord();
    }
  }, [activeIntervention]);

  // Load next problem
  const loadProblem = async (diffLevel: number) => {
    try {
      const p = await api.getProblem(diffLevel);
      setProblem(p);
      setUserAnswer('');
      setFeedbackState('IDLE');
      setPresentationTime(Date.now());
      setElapsedCurrent(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error('Failed to load problem', err);
    }
  };

  useEffect(() => {
    loadProblem(difficulty);
  }, []);

  // Reaction time stopwatch
  useEffect(() => {
    if (isBreakActive) return;
    const interval = setInterval(() => {
      setElapsedCurrent(Date.now() - presentationTime);
    }, 50);
    return () => clearInterval(interval);
  }, [presentationTime, isBreakActive]);

  // Guided Breathing Animation Timer
  useEffect(() => {
    if (!isBreakActive) return;

    const interval = setInterval(() => {
      setBreathSeconds((prev) => {
        if (prev <= 1) {
          // Switch phase
          setBreathPhase((curr) => {
            if (curr === 'inhale') return 'hold';
            if (curr === 'hold') return 'exhale';
            return 'inhale';
          });
          return 4;
        }
        return prev - 1;
      });

      setBreakRecoveryTime((t) => Math.max(0, t - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isBreakActive]);

  // Handle Answer Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem || !userAnswer.trim() || isBreakActive) return;

    const numAns = parseInt(userAnswer, 10);
    const rtMs = Date.now() - presentationTime;
    const isCorrect = numAns === problem.expected_answer;

    setFeedbackState(isCorrect ? 'CORRECT' : 'INCORRECT');

    if (isCorrect) {
      sounds.playCorrectChime();
      setCompletedCount((c) => c + 1);
      if (rtMs < 2500 && difficulty < 3.8) {
        setDifficulty((d) => Math.min(4.0, d + 0.2));
      }
    } else {
      sounds.playErrorTone();
      setErrorCount((e) => e + 1);
      if (difficulty > 1.2) {
        setDifficulty((d) => Math.max(1.0, d - 0.2));
      }
    }

    setRecentLatencies((prev) => [...prev.slice(-9), rtMs]);

    // Send behavioral telemetry to backend pipeline
    try {
      await api.submitTaskTelemetry(sessionId, {
        question_id: problem.question_id,
        user_answer: numAns,
        correct_answer: problem.expected_answer,
        response_time_ms: rtMs,
        difficulty,
      });
      onTelemetrySubmitted();
    } catch (err) {
      console.error('Telemetry submit failed', err);
    }

    setTimeout(() => {
      loadProblem(difficulty);
    }, 450);
  };

  const avgLatency = recentLatencies.length > 0
    ? (recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length).toFixed(0)
    : '--';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Workspace Provenance & Controls Header */}
      <div className="provenance-header">
        <div className="provenance-item">
          <span>TASK DEFINITION:</span>
          <strong style={{ color: 'var(--text-primary)' }}>Adaptive Mental Arithmetic</strong>
        </div>
        <div className="provenance-item">
          <span>TELEMETRY STREAM:</span>
          <span className="source-badge live">COMPUTER_BEHAVIOR (Browser Interaction)</span>
        </div>
        <div className="provenance-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>DIFFICULTY: <strong style={{ color: 'var(--accent-primary)' }}>LEVEL {difficulty.toFixed(1)}</strong></span>
          <button
            onClick={() => {
              sounds.enabled = !soundEnabled;
              setSoundEnabled(!soundEnabled);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: soundEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.725rem',
            }}
            title={soundEnabled ? 'Mute chimes' : 'Enable chimes'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{soundEnabled ? 'Audio Chimes On' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Adaptive Intervention Banner if Offered */}
      {activeIntervention && activeIntervention.status === 'OFFERED' && (
        <div
          className="glass-panel adaptation-card-active"
          style={{
            padding: '1.5rem',
            border: activeIntervention.metadata?.is_conservative
              ? '1px solid #eab308'
              : '1px solid #f59e0b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={24} color={activeIntervention.metadata?.is_conservative ? '#eab308' : '#f59e0b'} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#fcd34d' }}>
                  Flowstate Adaptation Offered: {activeIntervention.action}
                </h3>
                {activeIntervention.metadata?.is_conservative && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(234, 179, 8, 0.2)',
                      color: '#fef08a',
                      border: '1px solid rgba(234, 179, 8, 0.4)',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    CONSERVATIVE ADAPTATION (DEGRADED QUALITY)
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.875rem', color: '#e2e8f0', marginTop: '0.2rem' }}>
                {activeIntervention.reason}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              onClick={() => {
                onInterventionResponse(activeIntervention.intervention_id, 'ACCEPTED');
                if (activeIntervention.action === 'SUGGEST_SHORT_BREAK') {
                  setIsBreakActive(true);
                  setBreakRecoveryTime(30);
                } else if (activeIntervention.action === 'REDUCE_DIFFICULTY') {
                  setDifficulty((d) => Math.max(1.0, d - 0.8));
                  loadProblem(Math.max(1.0, difficulty - 0.8));
                }
              }}
            >
              Accept Adaptation
            </button>
            <button
              className="btn-secondary"
              onClick={() => onInterventionResponse(activeIntervention.intervention_id, 'DISMISSED')}
            >
              Dismiss
            </button>
            <button
              className="btn-secondary"
              onClick={() => onInterventionResponse(activeIntervention.intervention_id, 'POSTPONED')}
            >
              Postpone
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Workspace: Either Breathing Pacer OR Math Challenge */}
      {isBreakActive ? (
        <div className="breathing-guide-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Wind size={20} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-cyan)' }}>
              Guided Autonomic Recovery Break
            </span>
          </div>

          {/* Animated Expanding/Contracting Breathing Circle */}
          <div className={`breathing-circle-outer ${breathPhase}`}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', color: 'white' }}>
              {breathPhase === 'inhale' ? 'Inhale' : breathPhase === 'hold' ? 'Hold' : 'Exhale'}
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-cyan)' }}>
              {breathSeconds}s
            </span>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center', maxWidth: '420px' }}>
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '0.5rem' }}>
              Paced box-breathing prompts vagal activation to alleviate acute cognitive workload.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Recovery Interval Remaining: <strong style={{ color: '#34d399' }}>{breakRecoveryTime}s</strong>
            </div>

            <button
              className="btn-primary"
              onClick={() => {
                setIsBreakActive(false);
                setPresentationTime(Date.now());
                loadProblem(difficulty);
              }}
            >
              <Play size={16} />
              Conclude Break & Resume Task
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Clock size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Response Time: <strong style={{ color: 'white', fontFamily: 'monospace' }}>{(elapsedCurrent / 1000).toFixed(2)}s</strong>
              </span>
            </div>

            {/* Arithmetic Prompt */}
            <div className="math-problem-display">
              {problem?.prompt || '...'} = ?
            </div>

            {/* Answer Input */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <input
                ref={inputRef}
                type="number"
                className="math-input-box"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="?"
                autoFocus
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1.1rem' }}>
                Submit
              </button>
            </div>

            {/* Visual Feedback Flash */}
            {feedbackState === 'CORRECT' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700 }}>
                <CheckCircle size={18} /> Correct! Telemetry ingested.
              </div>
            )}
            {feedbackState === 'INCORRECT' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 700 }}>
                <XCircle size={18} /> Incorrect. Telemetry ingested.
              </div>
            )}
            {feedbackState === 'IDLE' && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Press Enter to submit answer
              </div>
            )}
          </form>
        </div>
      )}

      {/* Live Behavioral Telemetry Strip */}
      <div className="dashboard-grid">
        <div className="glass-panel col-span-3 metric-card">
          <span className="metric-label">Completed Items</span>
          <span className="metric-value-huge">{completedCount}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Questions answered</span>
        </div>

        <div className="glass-panel col-span-3 metric-card">
          <span className="metric-label">Errors</span>
          <span className="metric-value-huge" style={{ color: errorCount > 3 ? '#f87171' : 'var(--text-primary)' }}>
            {errorCount}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Error Rate: {completedCount + errorCount > 0 ? `${((errorCount / (completedCount + errorCount)) * 100).toFixed(0)}%` : '0%'}
          </span>
        </div>

        <div className="glass-panel col-span-3 metric-card">
          <span className="metric-label">Average Latency</span>
          <div className="metric-value-row">
            <span className="metric-value-huge">{avgLatency}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ms</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 10 responses</span>
        </div>

        <div className="glass-panel col-span-3 metric-card">
          <span className="metric-label">Task Adaptation</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '0.5rem' }}>
            Level {difficulty.toFixed(1)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Auto-scales with performance
          </span>
        </div>
      </div>
    </div>
  );
};
