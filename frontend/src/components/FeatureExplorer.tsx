import React from 'react';
import { Database, Check, X, ShieldAlert } from 'lucide-react';
import { FeatureVector } from '../api';

interface Props {
  features: FeatureVector[];
}

export const FeatureExplorer: React.FC<Props> = ({ features }) => {
  const latest = features[features.length - 1] || null;

  const featureMetadata = [
    { name: 'hr_mean', group: 'Wearable', unit: 'bpm', desc: 'Mean heart rate across sliding window' },
    { name: 'hr_std', group: 'Wearable', unit: 'bpm', desc: 'Heart rate fluctuation / dispersion' },
    { name: 'hr_slope', group: 'Wearable', unit: 'bpm/s', desc: 'Linear trend slope over window' },
    { name: 'hr_baseline_delta', group: 'Personalization', unit: 'bpm', desc: 'Delta from participant resting baseline' },
    { name: 'task_response_time_mean', group: 'Behavioural', unit: 'ms', desc: 'Average decision latency for items' },
    { name: 'task_response_time_std', group: 'Behavioural', unit: 'ms', desc: 'Reaction time variability' },
    { name: 'task_error_rate', group: 'Behavioural', unit: 'ratio', desc: 'Ratio of incorrect submissions' },
    { name: 'task_completion_count', group: 'Behavioural', unit: 'count', desc: 'Total items answered in window' },
    { name: 'time_on_task_seconds', group: 'Temporal', unit: 'sec', desc: 'Elapsed active session time' },
    { name: 'task_difficulty_mean', group: 'Context', unit: 'level', desc: 'Mean difficulty index of presented tasks' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Availability Mask Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Modality Availability Mask (Zero-Padding Prohibited)</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Schema Version: v1.0.0</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {latest ? (
            Object.entries(latest.availability_mask).map(([mod, isAvail]) => (
              <div
                key={mod}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  background: isAvail ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: isAvail ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: isAvail ? '#34d399' : '#f87171',
                }}
              >
                {isAvail ? <Check size={14} /> : <X size={14} />}
                <span>{mod.toUpperCase()}: {isAvail ? 'AVAILABLE' : 'MASKED'}</span>
              </div>
            ))
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Awaiting window computation...</span>
          )}
        </div>
      </div>

      {/* Feature Registry Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Extracted Feature Registry</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Feature Name</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Group</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Current Value</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Unit</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {featureMetadata.map((meta) => {
              const val = latest?.features[meta.name];
              return (
                <tr key={meta.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-accent)' }}>
                    {meta.name}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                      {meta.group}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: val !== null && val !== undefined ? 'white' : 'var(--text-muted)' }}>
                    {val !== null && val !== undefined ? String(val) : 'N/A (Masked)'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{meta.unit}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{meta.desc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
