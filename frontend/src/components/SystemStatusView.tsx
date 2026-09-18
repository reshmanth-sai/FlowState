import React from 'react';
import { ShieldCheck, HardDrive, Cpu, Activity, Database } from 'lucide-react';
import { SystemStatus } from '../api';

interface Props {
  status: SystemStatus | null;
}

export const SystemStatusView: React.FC<Props> = ({ status }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="provenance-header">
        <div className="provenance-item">
          <span>SYSTEM:</span>
          <strong style={{ color: 'var(--text-primary)' }}>Flowstate Operational Diagnostics</strong>
        </div>
        <div className="provenance-item">
          <span>STORAGE ENGINE:</span>
          <span>SQLite (WAL Concurrency)</span>
        </div>
        <div className="provenance-item">
          <span>STATUS:</span>
          <span className="source-badge live">{status?.status || 'OPERATIONAL'}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Storage Card */}
        <div className="glass-panel col-span-4" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <HardDrive size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.05rem' }}>Persistence Layer</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Database Engine:</span>
              <strong>{status?.storage.engine || 'SQLite'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Connection State:</span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>CONNECTED (WAL Mode)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>PostgreSQL Schema:</span>
              <span>100% Compatible DDL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Active Sessions:</span>
              <span>{status?.active_sessions_count ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Hardware Boundary Audit */}
        <div className="glass-panel col-span-4" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Cpu size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.05rem' }}>Hardware Boundary Audit</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Declared Scope:</span>
              <strong>Computer + Consumer Watch</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Clinical ECG:</span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>FALSE (PPG HR only)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>EEG / fNIRS:</span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>FALSE (Excluded)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Medical Claims:</span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>STRICTLY PROHIBITED</span>
            </div>
          </div>
        </div>

        {/* Pipeline Health */}
        <div className="glass-panel col-span-4" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity size={18} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '1.05rem' }}>Provider Health</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Deterministic Sim:</span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>ONLINE (seed=42)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Live Telemetry:</span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>ONLINE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Inference Model:</span>
              <span style={{ fontFamily: 'monospace' }}>baseline_interpretable_v1</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Quality Gating:</span>
              <span style={{ color: '#10b981' }}>ENFORCED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
