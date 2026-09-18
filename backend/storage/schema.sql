-- PostgreSQL and SQLite compatible DDL schema for Flowstate

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    participant_key VARCHAR(64) NOT NULL,
    task_id VARCHAR(64) NOT NULL,
    mode VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    baseline_id VARCHAR(64),
    metadata_json TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_participant ON sessions(participant_key);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

CREATE TABLE IF NOT EXISTS canonical_events (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    source_type VARCHAR(32) NOT NULL,
    source_device VARCHAR(128),
    signal_type VARCHAR(32) NOT NULL,
    value_numeric REAL,
    value_json TEXT,
    unit VARCHAR(32) NOT NULL,
    quality REAL NOT NULL,
    metadata_json TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_session_time ON canonical_events(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_signal ON canonical_events(session_id, signal_type);

CREATE TABLE IF NOT EXISTS signal_windows (
    window_id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_seconds REAL NOT NULL,
    completeness REAL NOT NULL,
    quality_summary_json TEXT,
    event_counts_json TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_windows_session ON signal_windows(session_id, start_time);

CREATE TABLE IF NOT EXISTS feature_vectors (
    window_id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    feature_version VARCHAR(32) NOT NULL,
    features_json TEXT NOT NULL,
    availability_mask_json TEXT NOT NULL,
    quality_summary_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (window_id) REFERENCES signal_windows(window_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_features_session ON feature_vectors(session_id);

CREATE TABLE IF NOT EXISTS inferences (
    inference_id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    window_id VARCHAR(64) NOT NULL,
    workload_val REAL NOT NULL,
    workload_conf REAL NOT NULL,
    workload_level VARCHAR(16) NOT NULL,
    fatigue_val REAL NOT NULL,
    fatigue_conf REAL NOT NULL,
    fatigue_level VARCHAR(16) NOT NULL,
    engagement_val REAL NOT NULL,
    engagement_conf REAL NOT NULL,
    engagement_level VARCHAR(16) NOT NULL,
    quality_gate VARCHAR(32) NOT NULL,
    evidence_json TEXT,
    model_version VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (window_id) REFERENCES signal_windows(window_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inferences_session ON inferences(session_id, created_at);

CREATE TABLE IF NOT EXISTS adaptations (
    intervention_id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    action VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    trigger_state VARCHAR(32),
    trigger_estimate REAL,
    confidence_requirement REAL NOT NULL,
    cooldown_seconds INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL,
    outcome_window_id VARCHAR(64),
    metadata_json TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_adaptations_session ON adaptations(session_id, timestamp);

CREATE TABLE IF NOT EXISTS intervention_feedback (
    id VARCHAR(64) PRIMARY KEY,
    intervention_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    user_action VARCHAR(32) NOT NULL,
    user_notes TEXT,
    post_state_change_json TEXT,
    FOREIGN KEY (intervention_id) REFERENCES adaptations(intervention_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedback_intervention ON intervention_feedback(intervention_id);

CREATE TABLE IF NOT EXISTS baselines (
    baseline_id VARCHAR(64) PRIMARY KEY,
    participant_key VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    window_count INTEGER NOT NULL,
    hr_mean REAL NOT NULL,
    hr_std REAL NOT NULL,
    response_time_mean REAL NOT NULL,
    response_time_std REAL NOT NULL,
    status VARCHAR(32) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_baselines_participant ON baselines(participant_key);

CREATE TABLE IF NOT EXISTS experiments (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    dataset_id VARCHAR(64),
    model_version VARCHAR(64) NOT NULL,
    feature_version VARCHAR(32) NOT NULL,
    modality_configuration VARCHAR(32) NOT NULL,
    metrics_json TEXT NOT NULL,
    validation_status VARCHAR(64) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_runs (
    evaluation_run_id VARCHAR(64) PRIMARY KEY,
    scenario_id VARCHAR(64) NOT NULL,
    scenario_version VARCHAR(32) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    feature_version VARCHAR(32) NOT NULL,
    model_version VARCHAR(64) NOT NULL,
    context_schema_version VARCHAR(32) NOT NULL,
    evaluation_schema_version VARCHAR(32) NOT NULL,
    observations_json TEXT NOT NULL,
    estimates_json TEXT NOT NULL,
    quality_json TEXT NOT NULL,
    adaptation_json TEXT NOT NULL,
    context_json TEXT NOT NULL,
    evidence_json TEXT,
    result_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eval_scenario ON evaluation_runs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_eval_created ON evaluation_runs(created_at);

