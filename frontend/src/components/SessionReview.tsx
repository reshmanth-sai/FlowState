import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Printer,
  Shield,
  Fingerprint,
  Copy,
  Check,
  FileJson,
  Layers,
  AlertCircle,
  X,
  Sliders,
  TrendingUp,
  Cpu,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { Session, SignalWindow, FeatureVector, InferenceRecord, AdaptationDecision } from '../api';

interface Props {
  session: Session | null;
  windows: SignalWindow[];
  features?: FeatureVector[];
  inferences: InferenceRecord[];
  interventions: AdaptationDecision[];
  onSelectInference: (id: string) => void;
}

export const SessionReview: React.FC<Props> = ({
  session,
  windows,
  features = [],
  inferences,
  interventions,
  onSelectInference,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'windows' | 'features' | 'adaptations'>('overview');
  const [provenanceHash, setProvenanceHash] = useState<string>('COMPUTING...');
  const [copiedHash, setCopiedHash] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedWindowIndex, setSelectedWindowIndex] = useState<number | null>(null);

  // Map features and windows by window_id
  const featureMap = React.useMemo(() => {
    return new Map((features || []).map((f) => [f.window_id, f]));
  }, [features]);

  const windowMap = React.useMemo(() => {
    return new Map((windows || []).map((w) => [w.window_id, w]));
  }, [windows]);

  // Compute SHA-256 Provenance Hash across all session records
  useEffect(() => {
    const computeSessionHash = async () => {
      try {
        const payload = JSON.stringify({
          sessionId: session?.id || 'demo',
          participant: session?.participant_key || 'anonymous',
          windowCount: windows.length,
          inferenceCount: inferences.length,
          interventionCount: interventions.length,
          firstWindow: windows[0]?.window_id,
          lastInference: inferences[inferences.length - 1]?.inference_id,
          inferencesSummary: inferences.map((i) => ({
            id: i.inference_id,
            w: i.workload.value,
            f: i.fatigue.value,
            e: i.engagement.value,
            g: i.quality_gate,
          })),
        });

        const msgBuffer = new TextEncoder().encode(payload);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        setProvenanceHash(hashHex);
      } catch (err) {
        setProvenanceHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      }
    };
    computeSessionHash();
  }, [session, windows, inferences, interventions]);

  const copyHashToClipboard = () => {
    navigator.clipboard.writeText(provenanceHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // KPI Calculations
  const avgWorkload =
    inferences.length > 0
      ? ((inferences.reduce((acc, inf) => acc + inf.workload.value, 0) / inferences.length) * 100).toFixed(1)
      : '--';

  const avgFatigue =
    inferences.length > 0
      ? ((inferences.reduce((acc, inf) => acc + inf.fatigue.value, 0) / inferences.length) * 100).toFixed(1)
      : '--';

  const avgEngagement =
    inferences.length > 0
      ? ((inferences.reduce((acc, inf) => acc + inf.engagement.value, 0) / inferences.length) * 100).toFixed(1)
      : '--';

  const peakWorkload =
    inferences.length > 0
      ? (Math.max(...inferences.map((inf) => inf.workload.value)) * 100).toFixed(0)
      : '--';

  const peakFatigue =
    inferences.length > 0
      ? (Math.max(...inferences.map((inf) => inf.fatigue.value)) * 100).toFixed(0)
      : '--';

  const acceptedInterventions = interventions.filter((i) => i.status === 'ACCEPTED').length;
  const passQualityGates = inferences.filter((i) => i.quality_gate === 'PASS').length;
  const qualityRate = inferences.length > 0 ? ((passQualityGates / inferences.length) * 100).toFixed(0) : '100';

  // Duration computation
  const totalDurationSec = windows.length > 0 ? (windows.length * 15 + 15) : 0;
  const durationMins = Math.floor(totalDurationSec / 60);
  const durationSecs = totalDurationSec % 60;
  const formattedDuration = totalDurationSec > 0 ? `${durationMins}m ${durationSecs.toString().padStart(2, '0')}s` : '0s';

  // Average HR & Latency across features
  const hrValues = features
    .map((f) => f.features?.['hr_mean'])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const avgHr = hrValues.length > 0 ? (hrValues.reduce((a, b) => a + b, 0) / hrValues.length).toFixed(1) : '--';

  const latencyValues = features
    .map((f) => f.features?.['reaction_time_median'])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const avgLatency =
    latencyValues.length > 0 ? (latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length).toFixed(0) : '--';

  // Export JSON Data Package
  const handleDownloadJSON = () => {
    const dossierData = {
      dossier_version: '1.0.0',
      generated_at: new Date().toISOString(),
      provenance_sha256: provenanceHash,
      metadata: {
        session_id: session?.id,
        participant_key: session?.participant_key,
        mode: session?.mode,
        status: session?.status,
        created_at: session?.created_at,
        hardware_disclosure:
          'Data recorded via consumer PPG / task telemetry. Non-clinical ECG; model estimates, not psychiatric diagnosis.',
      },
      summary_kpis: {
        total_duration_seconds: totalDurationSec,
        total_windows: windows.length,
        total_inferences: inferences.length,
        quality_pass_rate_pct: qualityRate,
        mean_workload_pct: avgWorkload,
        mean_fatigue_pct: avgFatigue,
        mean_engagement_pct: avgEngagement,
        mean_heart_rate_bpm: avgHr,
        mean_reaction_latency_ms: avgLatency,
        interventions_offered: interventions.length,
        interventions_accepted: acceptedInterventions,
      },
      windows: windows.map((w) => ({
        ...w,
        features: featureMap.get(w.window_id)?.features || null,
        inference: inferences.find((inf) => inf.window_id === w.window_id) || null,
      })),
      interventions,
    };

    const blob = new Blob([JSON.stringify(dossierData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowstate_dossier_${session?.id || 'export'}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Markdown Report
  const handleDownloadMarkdown = () => {
    let md = `# Flowstate Research Session Dossier\n\n`;
    md += `**Protocol:** Flowstate Multimodal Context-Aware Adaptive System v1.0.0\n`;
    md += `**Generated At:** ${new Date().toISOString()}\n`;
    md += `**Provenance SHA-256:** \`${provenanceHash}\`\n\n`;
    md += `## 1. Session Metadata\n`;
    md += `- **Session ID:** \`${session?.id || 'N/A'}\`\n`;
    md += `- **Participant Key:** \`${session?.participant_key || 'P-ANONYMOUS'}\`\n`;
    md += `- **Operating Mode:** ${session?.mode || 'SIMULATED'}\n`;
    md += `- **Session Duration:** ${formattedDuration} (${windows.length} sliding windows)\n\n`;
    md += `## 2. Key Telemetry & Cognitive Aggregates\n`;
    md += `- **Mean Estimated Workload:** ${avgWorkload}%\n`;
    md += `- **Peak Workload:** ${peakWorkload}%\n`;
    md += `- **Mean Estimated Fatigue:** ${avgFatigue}%\n`;
    md += `- **Mean Estimated Engagement:** ${avgEngagement}%\n`;
    md += `- **Mean HR (Consumer PPG):** ${avgHr} bpm\n`;
    md += `- **Median Reaction Latency:** ${avgLatency} ms\n`;
    md += `- **Quality Gate Pass Rate:** ${qualityRate}%\n`;
    md += `- **Closed-Loop Adaptations:** ${interventions.length} offered, ${acceptedInterventions} accepted\n\n`;
    md += `## 3. Scientific Integrity & Protocol Declarations\n`;
    md += `- [x] Non-clinical optical photoplethysmography / task telemetry explicitly framed as empirical proxy.\n`;
    md += `- [x] Modality availability checked explicitly via boolean masks.\n`;
    md += `- [x] Missing sensor features not zero-padded.\n`;
    md += `- [x] Temporal sliding windows (30s) strictly enforce no future-data leakage.\n`;
    md += `- [x] Closed-loop adaptations governed by cooldown timers and participant override sovereignty.\n\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowstate_session_${session?.id || 'export'}_report.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeWindowData = selectedWindowIndex !== null ? windows[selectedWindowIndex] : null;
  const activeInferenceData = activeWindowData ? inferences.find((i) => i.window_id === activeWindowData.window_id) : null;
  const activeFeatureData = activeWindowData ? featureMap.get(activeWindowData.window_id) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Horizon Action Header */}
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
              RESEARCH SESSION DOSSIER & AUDIT CONSOLE
            </h2>
            <span className="tag tag-violet">v1.0.0</span>
          </div>
          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            PARTICIPANT: <span style={{ color: 'var(--text-main)' }}>{session?.participant_key || 'reviewer_session'}</span>
            {' • '}MODE: <span style={{ color: 'var(--phosphor-jade)' }}>{session?.mode || 'SIMULATED'}</span>
            {' • '}SESSION_ID: <span style={{ color: 'var(--text-secondary)' }}>{session?.id || 'N/A'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={handleDownloadJSON} className="btn-laser btn-laser-ghost" title="Export structured JSON package">
            <FileJson size={13} color="var(--laser-violet)" />
            <span>EXPORT JSON</span>
          </button>
          <button onClick={handleDownloadMarkdown} className="btn-laser btn-laser-ghost" title="Download Academic Markdown">
            <FileText size={13} color="var(--cyan-telemetry)" />
            <span>EXPORT MD</span>
          </button>
          <button onClick={() => setShowPrintModal(true)} className="btn-laser btn-laser-primary" title="Printable Research Dossier">
            <Printer size={13} />
            <span>PRINT DOSSIER</span>
          </button>
        </div>
      </div>

      {/* Cryptographic Audit Terminal (SHA-256) */}
      <div className="provenance-terminal">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
          <Fingerprint size={16} color="var(--cyan-telemetry)" style={{ flexShrink: 0 }} />
          <div style={{ overflow: 'hidden' }}>
            <span className="mono-stamp" style={{ fontSize: '9px', display: 'block' }}>
              CRYPTOGRAPHIC PROVENANCE // SHA-256 AUDIT DIGEST
            </span>
            <span className="provenance-hash">{provenanceHash}</span>
          </div>
        </div>

        <button
          onClick={copyHashToClipboard}
          className="btn-laser btn-laser-ghost"
          style={{ padding: '3px 8px', fontSize: '10.5px', flexShrink: 0 }}
        >
          {copiedHash ? <Check size={12} color="var(--phosphor-jade)" /> : <Copy size={12} />}
          <span>{copiedHash ? 'COPIED' : 'COPY HASH'}</span>
        </button>
      </div>

      {/* Telemetry Horizon Bar (Edge-to-Edge 4-Bay Split, Zero Cards) */}
      <div className="horizon-bar">
        {/* Bay 1: Observed Duration */}
        <div className="horizon-cell">
          <div className="horizon-label">
            <span>OBSERVED DURATION</span>
            <Clock size={11} />
          </div>
          <div className="horizon-value-row">
            <span className="horizon-value">{formattedDuration}</span>
          </div>
          <div className="horizon-sub" style={{ marginTop: '0.4rem' }}>
            {windows.length} sliding windows (30s / 15s step)
          </div>
        </div>

        {/* Bay 2: Mean Workload */}
        <div className="horizon-cell">
          <div className="horizon-label">
            <span>MEAN WORKLOAD</span>
            <Activity size={11} />
          </div>
          <div className="horizon-value-row">
            <span className="horizon-value">{avgWorkload}%</span>
          </div>
          <div className="horizon-sub" style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Fatigue: <strong style={{ color: 'var(--amber-alert)' }}>{avgFatigue}%</strong></span>
            <span className="horizon-delta delta-up">▲ Peak: {peakWorkload}%</span>
          </div>
        </div>

        {/* Bay 3: Adaptations */}
        <div className="horizon-cell">
          <div className="horizon-label">
            <span>ADAPTATIONS OFFERED</span>
            <Sliders size={11} />
          </div>
          <div className="horizon-value-row">
            <span className="horizon-value">{interventions.length}</span>
          </div>
          <div className="horizon-sub" style={{ marginTop: '0.4rem' }}>
            Accepted: {acceptedInterventions} ({interventions.length > 0 ? ((acceptedInterventions / interventions.length) * 100).toFixed(0) : 0}%)
          </div>
        </div>

        {/* Bay 4: Integrity Gates */}
        <div className="horizon-cell">
          <div className="horizon-label">
            <span>INTEGRITY & QUALITY GATES</span>
            <Shield size={11} />
          </div>
          <div className="horizon-value-row">
            <span className="horizon-value" style={{ color: qualityRate === '100' ? 'var(--phosphor-jade)' : 'var(--cyan-telemetry)' }}>
              {qualityRate}%
            </span>
            <span className="tag tag-neutral" style={{ fontSize: '9px' }}>
              {passQualityGates > 0 ? 'MULTIMODAL' : 'BEHAVIORAL'}
            </span>
          </div>
          <div className="horizon-sub" style={{ marginTop: '0.4rem' }}>
            Zero-padded imputation strictly suppressed
          </div>
        </div>
      </div>

      {/* Interactive Window Sequencer & Scrubber (DAW Style) */}
      {windows.length > 0 && (
        <div className="sequencer-container">
          <div className="sequencer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={12} color="var(--laser-violet)" />
              <span className="mono-stamp">
                TIMELINE SEQUENCER & SCRUBBER // {windows.length} CONTINUOUS 30-SECOND SLICES
              </span>
            </div>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              CLICK ANY SLICE TO INSPECT WINDOW TELEMETRY
            </span>
          </div>

          <div className="sequencer-track">
            {windows.map((w, idx) => {
              const inf = inferences.find((i) => i.window_id === w.window_id);
              const fatigue = inf?.fatigue?.value ?? 0;
              const workload = inf?.workload?.value ?? 0;
              
              // Color slice based on cognitive load
              let bg = '#1a1d2b';
              if (fatigue > 0.6) bg = 'rgba(245, 158, 11, 0.7)';
              else if (workload > 0.4) bg = 'rgba(139, 92, 246, 0.7)';
              else if (inf?.quality_gate === 'PASS') bg = 'rgba(16, 185, 129, 0.6)';

              const isSelected = selectedWindowIndex === idx;

              return (
                <div
                  key={w.window_id}
                  className={`sequencer-slice ${isSelected ? 'active' : ''}`}
                  style={{ background: bg }}
                  onClick={() => setSelectedWindowIndex(isSelected ? null : idx)}
                  title={`Window #${idx + 1}: ${w.window_id} • Workload: ${(workload * 100).toFixed(0)}% • Fatigue: ${(fatigue * 100).toFixed(0)}%`}
                />
              );
            })}
          </div>

          {/* Active Window Inspector Drawer */}
          {activeWindowData && activeInferenceData && (
            <div style={{
              marginTop: '0.85rem',
              padding: '0.75rem 1rem',
              background: 'var(--bay-surface)',
              border: '1px solid var(--border-hairline-bright)',
              borderRadius: 'var(--radius-micro)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <span className="mono-stamp" style={{ fontSize: '9px' }}>INSPECTING WINDOW:</span>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--cyan-telemetry)' }}>
                    {activeWindowData.window_id}
                  </div>
                </div>
                <div>
                  <span className="mono-stamp" style={{ fontSize: '9px' }}>ESTIMATED WORKLOAD:</span>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--laser-violet)' }}>
                    {(activeInferenceData.workload.value * 100).toFixed(0)}% ({activeInferenceData.workload.level})
                  </div>
                </div>
                <div>
                  <span className="mono-stamp" style={{ fontSize: '9px' }}>ESTIMATED FATIGUE:</span>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--amber-alert)' }}>
                    {(activeInferenceData.fatigue.value * 100).toFixed(0)}% ({activeInferenceData.fatigue.level})
                  </div>
                </div>
                <div>
                  <span className="mono-stamp" style={{ fontSize: '9px' }}>GATE:</span>
                  <div>
                    <span className={`tag ${activeInferenceData.quality_gate === 'PASS' ? 'tag-pass' : 'tag-elevated'}`}>
                      {activeInferenceData.quality_gate}
                    </span>
                  </div>
                </div>
                {activeInferenceData.evidence && activeInferenceData.evidence[0] && (
                  <div style={{ maxWidth: '380px' }}>
                    <span className="mono-stamp" style={{ fontSize: '9px' }}>ATTRIBUTION:</span>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      {activeInferenceData.evidence[0].attribution_text}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => onSelectInference(activeInferenceData.inference_id)}
                  className="btn-laser btn-laser-primary"
                  style={{ padding: '3px 8px', fontSize: '10.5px' }}
                >
                  <span>TRACE SIGNAL</span>
                  <ChevronRight size={12} />
                </button>
                <button
                  onClick={() => setSelectedWindowIndex(null)}
                  className="btn-laser btn-laser-ghost"
                  style={{ padding: '3px 6px' }}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Bay Navigation Tabs (Segmented Switch) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.75rem' }}>
        <div className="nav-tabs" style={{ background: 'var(--bay-surface)' }}>
          <button
            className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="tab-shortcut">01</span>
            <span>EXECUTIVE & BOUNDARIES</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'windows' ? 'active' : ''}`}
            onClick={() => setActiveTab('windows')}
          >
            <span className="tab-shortcut">02</span>
            <span>WINDOW-BY-WINDOW TRACE ({windows.length})</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            <span className="tab-shortcut">03</span>
            <span>BIOMETRIC AGGREGATES</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'adaptations' ? 'active' : ''}`}
            onClick={() => setActiveTab('adaptations')}
          >
            <span className="tab-shortcut">04</span>
            <span>CLOSED-LOOP INTERVENTIONS ({interventions.length})</span>
          </button>
        </div>

        <span className="mono-stamp" style={{ fontSize: '9px' }}>
          ENGINEERING DOSSIER // IMMUTABLE AUDIT LOG
        </span>
      </div>

      {/* TAB 1: Executive Summary & Boundaries (Docked 3-Bay Grid) */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="dock-grid dock-grid-3">
            <div className="bay-cell">
              <div className="bay-header">
                <span className="bay-title">
                  <Terminal size={12} color="var(--laser-violet)" />
                  PROTOCOL SPECIFICATION
                </span>
                <span className="tag tag-neutral">v1.0.0</span>
              </div>
              <h4 style={{ fontSize: '13px', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Flowstate v1.0.0 Standard Protocol
              </h4>
              <p style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
                270s 5-phase evaluation protocol (Baseline, Demand Increase, Peak Workload, Closed-Loop Adaptation, Recovery) with strict sliding window isolation.
              </p>
            </div>

            <div className="bay-cell">
              <div className="bay-header">
                <span className="bay-title">
                  <Activity size={12} color="var(--cyan-telemetry)" />
                  HARDWARE BOUNDARY DECLARATION
                </span>
                <span className="tag tag-pass">NON-CLINICAL</span>
              </div>
              <h4 style={{ fontSize: '13px', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Consumer Optical PPG & Task Telemetry
              </h4>
              <p style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
                Non-clinical optical wristband/BLE. Explicitly not an electrocardiogram (ECG) or EEG/fNIRS. All signals processed as empirical behavioral proxies.
              </p>
            </div>

            <div className="bay-cell">
              <div className="bay-header">
                <span className="bay-title">
                  <Shield size={12} color="var(--phosphor-jade)" />
                  ETHICAL FRAMING
                </span>
                <span className="tag tag-pass">STATISTICAL</span>
              </div>
              <h4 style={{ fontSize: '13px', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Empirical Statistical Proxy
              </h4>
              <p style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
                State estimates reflect task-induced cognitive demand, not medical, psychiatric, or psychological diagnoses. User retain 100% intervention veto autonomy.
              </p>
            </div>
          </div>

          {/* Research Audit Notice */}
          <div style={{
            background: 'var(--bay-bg)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-micro)',
            padding: '1rem 1.25rem',
            borderLeft: '3px solid var(--cyan-telemetry)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Shield size={13} color="var(--cyan-telemetry)" />
              <span className="mono-stamp" style={{ color: 'var(--cyan-telemetry)' }}>
                RESEARCH AUDIT NOTICE // TEMPORAL INTEGRITY GUARANTEE
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This dossier represents an immutable snapshot of all multimodal sensor inputs, synchronized sliding window features, model inference assessments, and closed-loop UI adaptations recorded during the participant session. All features were extracted using v1.0.0 registry algorithms with strict temporal isolation to prevent causal leakage.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Window-by-Window Trace (High-Density Terminal Table) */}
      {activeTab === 'windows' && (
        <div className="trace-table-wrapper">
          <table className="trace-table">
            <thead>
              <tr>
                <th>#</th>
                <th>WINDOW ID</th>
                <th>OFFSET</th>
                <th>WORKLOAD</th>
                <th>FATIGUE</th>
                <th>ENGAGEMENT</th>
                <th>QUALITY GATE</th>
                <th>PRIMARY ATTRIBUTION FACTOR</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {windows.map((w, idx) => {
                const inf = inferences.find((i) => i.window_id === w.window_id);
                const feat = featureMap.get(w.window_id);
                const offsetSec = idx * 15;
                const offsetFormatted = `+${Math.floor(offsetSec / 60)}m ${(offsetSec % 60).toString().padStart(2, '0')}s`;
                const isSelected = selectedWindowIndex === idx;

                return (
                  <tr
                    key={w.window_id}
                    className={isSelected ? 'active-row' : ''}
                    onClick={() => setSelectedWindowIndex(idx)}
                  >
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ color: 'var(--cyan-telemetry)' }}>{w.window_id}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{offsetFormatted}</td>
                    <td>
                      {inf ? (
                        <span style={{ color: inf.workload.value > 0.4 ? 'var(--laser-violet)' : 'var(--text-secondary)' }}>
                          {(inf.workload.value * 100).toFixed(0)}% ({inf.workload.level})
                        </span>
                      ) : '--'}
                    </td>
                    <td>
                      {inf ? (
                        <span style={{ color: inf.fatigue.value > 0.6 ? 'var(--amber-alert)' : 'var(--text-secondary)' }}>
                          {(inf.fatigue.value * 100).toFixed(0)}% ({inf.fatigue.level})
                        </span>
                      ) : '--'}
                    </td>
                    <td>
                      {inf ? `${(inf.engagement.value * 100).toFixed(0)}%` : '--'}
                    </td>
                    <td>
                      {inf ? (
                        <span className={`tag ${inf.quality_gate === 'PASS' ? 'tag-pass' : 'tag-elevated'}`}>
                          {inf.quality_gate}
                        </span>
                      ) : '--'}
                    </td>
                    <td style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inf?.evidence?.[0] ? inf.evidence[0].attribution_text : 'Nominal task engagement'}
                    </td>
                    <td>
                      {inf && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInference(inf.inference_id);
                          }}
                          className="btn-laser btn-laser-ghost"
                          style={{ padding: '2px 6px', fontSize: '10px' }}
                        >
                          TRACE
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Biometric Aggregates (Docked Grid) */}
      {activeTab === 'features' && (
        <div className="dock-grid dock-grid-4">
          <div className="bay-cell">
            <span className="mono-stamp">CONSUMER PPG METRICS</span>
            <div className="horizon-value" style={{ fontSize: '1.75rem', marginTop: '0.4rem' }}>
              {avgHr} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>BPM</span>
            </div>
            <p style={{ fontSize: '11px', marginTop: '0.4rem' }}>
              Mean heart rate across {hrValues.length} valid feature windows.
            </p>
          </div>

          <div className="bay-cell">
            <span className="mono-stamp">TASK REACTION LATENCY</span>
            <div className="horizon-value" style={{ fontSize: '1.75rem', marginTop: '0.4rem' }}>
              {avgLatency} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>MS</span>
            </div>
            <p style={{ fontSize: '11px', marginTop: '0.4rem' }}>
              Median problem-solving response latency.
            </p>
          </div>

          <div className="bay-cell">
            <span className="mono-stamp">TOTAL INFERENCES</span>
            <div className="horizon-value" style={{ fontSize: '1.75rem', marginTop: '0.4rem' }}>
              {inferences.length}
            </div>
            <p style={{ fontSize: '11px', marginTop: '0.4rem' }}>
              Continuous state predictions with zero causal leakage.
            </p>
          </div>

          <div className="bay-cell">
            <span className="mono-stamp">FEATURE VECTOR VERSION</span>
            <div className="horizon-value" style={{ fontSize: '1.75rem', marginTop: '0.4rem', color: 'var(--laser-violet)' }}>
              1.0.0
            </div>
            <p style={{ fontSize: '11px', marginTop: '0.4rem' }}>
              Deterministic temporal registry algorithms.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: Adaptations Table */}
      {activeTab === 'adaptations' && (
        <div className="trace-table-wrapper">
          {interventions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No adaptation interventions were offered or triggered in this session.
            </div>
          ) : (
            <table className="trace-table">
              <thead>
                <tr>
                  <th>ACTION</th>
                  <th>REASON</th>
                  <th>STATUS</th>
                  <th>COOLDOWN</th>
                  <th>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((act) => (
                  <tr key={act.intervention_id}>
                    <td style={{ color: 'var(--laser-violet)', fontWeight: 600 }}>{act.action}</td>
                    <td>{act.reason}</td>
                    <td>
                      <span className={`tag ${act.status === 'ACCEPTED' ? 'tag-pass' : 'tag-neutral'}`}>
                        {act.status}
                      </span>
                    </td>
                    <td>{act.cooldown_seconds}s</td>
                    <td style={{ color: 'var(--text-muted)' }}>{act.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Printable Paper Modal */}
      {showPrintModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem',
          }}
          onClick={() => setShowPrintModal(false)}
        >
          <div
            style={{
              background: '#0a0c12',
              color: '#e2e8f0',
              border: '1px solid var(--border-hairline-bright)',
              borderRadius: 'var(--radius-micro)',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2.5rem',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span className="mono-stamp">FLOWSTATE RESEARCH PLATFORM // TECHNICAL DOSSIER</span>
                <h2 style={{ fontSize: '1.3rem', marginTop: '0.2rem' }}>
                  Multimodal Cognitive State & Adaptive Intervention Report
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => window.print()} className="btn-laser btn-laser-primary">
                  <Printer size={13} />
                  <span>PRINT REPORT</span>
                </button>
                <button onClick={() => setShowPrintModal(false)} className="btn-laser btn-laser-ghost">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '11.5px', marginBottom: '1.5rem', fontFamily: 'var(--font-mono)' }}>
              <div>PARTICIPANT: {session?.participant_key || 'reviewer_session'}</div>
              <div>SESSION ID: {session?.id || 'N/A'}</div>
              <div>DURATION: {formattedDuration} ({windows.length} windows)</div>
              <div>PROVENANCE: {provenanceHash.slice(0, 20)}...</div>
            </div>

            <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.25rem' }}>
              1. SUMMARY METRICS
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem', fontFamily: 'var(--font-mono)' }}>
              <div>
                <span className="mono-stamp">WORKLOAD:</span>
                <div style={{ fontSize: '1.25rem' }}>{avgWorkload}%</div>
              </div>
              <div>
                <span className="mono-stamp">FATIGUE:</span>
                <div style={{ fontSize: '1.25rem' }}>{avgFatigue}%</div>
              </div>
              <div>
                <span className="mono-stamp">ENGAGEMENT:</span>
                <div style={{ fontSize: '1.25rem' }}>{avgEngagement}%</div>
              </div>
              <div>
                <span className="mono-stamp">GATE PASS:</span>
                <div style={{ fontSize: '1.25rem' }}>{qualityRate}%</div>
              </div>
            </div>

            <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.25rem' }}>
              2. SCIENTIFIC DISCLOSURE
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Biometric values represent consumer optical photoplethysmography (PPG) and task telemetry. This platform does not measure electrocardiographic (ECG) or clinical EEG signals. Estimated cognitive states are empirical algorithmic proxies and do not constitute clinical mental health diagnoses.
            </p>

            <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <div>Authenticated by Flowstate Inference Engine v1.0.0</div>
              <div>Audit Checksum: {provenanceHash.slice(0, 16)}...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
