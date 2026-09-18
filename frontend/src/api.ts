/**
 * Flowstate API Client
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export interface Session {
  id: string;
  participant_key: string;
  task_id: string;
  mode: 'SIMULATED' | 'IMPORTED' | 'REAL_WEARABLE';
  status: 'CREATED' | 'RUNNING' | 'PAUSED' | 'STOPPED';
  started_at?: string;
  ended_at?: string;
  baseline_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface StateEstimate {
  value: number;
  confidence: number;
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'ELEVATED' | 'REDUCED';
}

export interface InferenceRecord {
  inference_id: string;
  session_id: string;
  window_id: string;
  workload: StateEstimate;
  fatigue: StateEstimate;
  engagement: StateEstimate;
  quality_gate: 'PASS' | 'DEGRADED' | 'INSUFFICIENT';
  evidence: Array<{
    factor: string;
    value?: string;
    direction?: string;
    impact?: string;
    attribution_text: string;
  }>;
  model_version: string;
  created_at: string;
}

export interface SignalWindow {
  window_id: string;
  session_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  completeness: number;
  quality_summary: Record<string, number>;
  event_counts: Record<string, number>;
}

export interface FeatureVector {
  window_id: string;
  session_id: string;
  feature_version: string;
  features: Record<string, number | null>;
  availability_mask: Record<string, boolean>;
  quality_summary: Record<string, number>;
  created_at: string;
}

export interface AdaptationDecision {
  intervention_id: string;
  session_id: string;
  timestamp: string;
  action: 'NO_ACTION' | 'SUGGEST_SHORT_BREAK' | 'REDUCE_DIFFICULTY' | 'PACING_ADJUSTMENT' | 'ATTENTION_PROMPT';
  reason: string;
  trigger_state?: string;
  trigger_estimate?: number;
  confidence_requirement: number;
  cooldown_seconds: number;
  status: 'OFFERED' | 'ACCEPTED' | 'DISMISSED' | 'POSTPONED' | 'EXPIRED';
  outcome_window_id?: string;
  metadata: Record<string, any>;
}

export interface TaskProblem {
  question_id: string;
  prompt: string;
  expected_answer: number;
  difficulty: number;
}

export interface SystemStatus {
  status: string;
  system_name: string;
  version: string;
  storage: { engine: string; connected: boolean; path: string };
  hardware_boundary: {
    declared_boundary: string;
    clinical_ecg: boolean;
    eeg_fnirs: boolean;
    supported_wearable_signals: string[];
  };
  data_source_status: {
    simulated: string;
    imported: string;
    real_wearable: string;
  };
  active_sessions_count: number;
  recent_sessions_count: number;
}

export const api = {
  async getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/system/status`);
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  async createSession(participantKey: string = 'reviewer_participant', mode: string = 'SIMULATED'): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_key: participantKey,
        task_id: 'adaptive_arithmetic',
        mode,
      }),
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  async getSessions(limit: number = 50): Promise<Session[]> {
    const res = await fetch(`${API_BASE}/sessions?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async startSession(sessionId: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start session');
    return res.json();
  },

  async stopSession(sessionId: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop session');
    return res.json();
  },

  async runDemo(sessionId: string, seed: number = 42, durationSeconds: number = 270): Promise<any> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/demo/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed, duration_seconds: durationSeconds }),
    });
    if (!res.ok) throw new Error('Failed to run demo scenario');
    return res.json();
  },

  async getSessionTimeline(sessionId: string): Promise<{
    session: Session;
    windows: SignalWindow[];
    features: FeatureVector[];
    inferences: InferenceRecord[];
    interventions: AdaptationDecision[];
    feedback: any[];
  }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/timeline`);
    if (!res.ok) throw new Error('Failed to fetch session timeline');
    return res.json();
  },

  async getFollowTheSignalTrace(inferenceId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/inference/trace/${inferenceId}`);
    if (!res.ok) throw new Error('Failed to trace signal');
    return res.json();
  },

  async getProblem(difficulty: number = 1.0): Promise<TaskProblem> {
    const res = await fetch(`${API_BASE}/tasks/problem?difficulty=${difficulty}`);
    if (!res.ok) throw new Error('Failed to generate problem');
    return res.json();
  },

  async submitTaskTelemetry(sessionId: string, data: {
    question_id: string;
    user_answer: number;
    correct_answer: number;
    response_time_ms: number;
    difficulty: number;
    is_live_user?: boolean;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/tasks/${sessionId}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, is_live_user: true }),
    });
    if (!res.ok) throw new Error('Failed to submit telemetry');
    return res.json();
  },

  async recordInterventionFeedback(interventionId: string, action: string, notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/interventions/${interventionId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_action: action, user_notes: notes }),
    });
    if (!res.ok) throw new Error('Failed to record feedback');
    return res.json();
  },

  async runResearchEvaluation(name: string, modality: string): Promise<any> {
    const res = await fetch(`${API_BASE}/research/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, modality_configuration: modality }),
    });
    if (!res.ok) throw new Error('Failed to run research evaluation');
    return res.json();
  },

  async getExperiments(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/research/experiments`);
    if (!res.ok) throw new Error('Failed to fetch experiments');
    return res.json();
  },

  async getRawEvents(sessionId: string, signalType?: string): Promise<any[]> {
    const url = signalType 
      ? `${API_BASE}/data/events/${sessionId}?signal_type=${signalType}` 
      : `${API_BASE}/data/events/${sessionId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch raw events');
    return res.json();
  },

  // Phase 4: Controlled Evaluation & Evidence Layer
  async getEvaluationScenarios(): Promise<EvaluationScenario[]> {
    const res = await fetch(`${API_BASE}/evaluation/scenarios`);
    if (!res.ok) throw new Error('Failed to fetch evaluation scenarios');
    return res.json();
  },

  async runEvaluation(scenarioId: string, seed: number = 42): Promise<EvaluationRunRecord> {
    const res = await fetch(`${API_BASE}/evaluation/run/${scenarioId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed }),
    });
    if (!res.ok) throw new Error(`Failed to run evaluation scenario ${scenarioId}`);
    return res.json();
  },

  async getEvaluationRuns(limit: number = 50): Promise<EvaluationRunRecord[]> {
    const res = await fetch(`${API_BASE}/evaluation/runs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch evaluation runs');
    return res.json();
  },

  async getEvaluationRun(runId: string): Promise<EvaluationRunRecord> {
    const res = await fetch(`${API_BASE}/evaluation/runs/${runId}`);
    if (!res.ok) throw new Error(`Failed to fetch evaluation run ${runId}`);
    return res.json();
  },

  async compareEvaluationRun(runId: string, baselineId?: string): Promise<ScenarioComparison> {
    const url = baselineId
      ? `${API_BASE}/evaluation/compare/${runId}?baseline_id=${baselineId}`
      : `${API_BASE}/evaluation/compare/${runId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to compare evaluation run ${runId}`);
    return res.json();
  },
};

export interface EvaluationScenario {
  scenario_id: string;
  scenario_version: string;
  category: string;
  name: string;
  description: string;
  expected_observation: string;
  duration_seconds: number;
  target_context: Record<string, any>;
  telemetry_profile: Record<string, any>;
}

export interface EvaluationRunRecord {
  evaluation_run_id: string;
  scenario_id: string;
  scenario_version: string;
  session_id: string;
  started_at: string;
  completed_at: string;
  feature_version: string;
  model_version: string;
  context_schema_version: string;
  evaluation_schema_version: string;
  observations: {
    typing_interval_mean_ms: number;
    typing_interval_std_ms: number;
    pause_count: number;
    pause_duration_total_seconds: number;
    error_rate: number;
    backspace_count: number;
    delete_count: number;
    active_time_seconds: number;
    completion_count: number;
    time_on_task_seconds: number;
  };
  estimates: {
    workload: StateEstimate;
    fatigue: StateEstimate;
    engagement: StateEstimate;
  };
  quality: {
    gate: 'PASS' | 'DEGRADED' | 'INSUFFICIENT';
    confidence: number;
    modalities: string[];
  };
  adaptation: {
    action: string;
    triggered: boolean;
    reason: string;
    cooldown_seconds: number;
  };
  context: {
    platform?: string;
    task_id?: string;
    difficulty_label?: string;
    difficulty_scalar?: number;
    environmental_metadata_only?: boolean;
  };
  evidence: Array<{
    factor: string;
    value?: string;
    direction?: string;
    impact?: string;
    attribution_text: string;
  }>;
  reproducibility: {
    evaluation_schema_version: string;
    scenario_version: string;
    context_schema_version: string;
    feature_version: string;
    model_version: string;
    seed: number;
    provenance: string;
  };
  created_at: string;
}

export interface ScenarioComparison {
  comparison_id: string;
  evaluation_run_id: string;
  baseline_run_id: string;
  scenario_id: string;
  observations_delta: Record<string, number>;
  estimates_delta: Record<string, number>;
  quality_transition: {
    baseline_gate: string;
    scenario_gate: string;
    baseline_confidence: number;
    scenario_confidence: number;
  };
  adaptation_summary: {
    baseline_action: string;
    scenario_action: string;
    scenario_triggered: boolean;
    scenario_reason: string;
  };
  descriptive_narrative: string;
  scientific_disclaimer: string;
  created_at: string;
}

