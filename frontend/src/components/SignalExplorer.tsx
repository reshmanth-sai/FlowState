import React from 'react';
import { Activity, Clock, BarChart3 } from 'lucide-react';
import { FeatureVector, SignalWindow } from '../api';

interface Props {
  windows: SignalWindow[];
  features: FeatureVector[];
}

export const SignalExplorer: React.FC<Props> = ({ windows, features }) => {
  // Extract points for SVG charting
  const hrPoints = features
    .map((f, i) => ({ x: i, y: f.features.hr_mean ?? 72 }))
    .filter((p) => p.y !== null);

  const rtPoints = features
    .map((f, i) => ({ x: i, y: f.features.task_response_time_mean ?? 450 }))
    .filter((p) => p.y !== null);

  const maxHr = Math.max(100, ...hrPoints.map((p) => p.y));
  const minHr = Math.min(60, ...hrPoints.map((p) => p.y));

  const maxRt = Math.max(900, ...rtPoints.map((p) => p.y));
  const minRt = Math.min(300, ...rtPoints.map((p) => p.y));

  const renderSparkline = (points: { x: number; y: number }[], minY: number, maxY: number, strokeColor: string) => {
    if (points.length < 2) return null;
    const width = 600;
    const height = 120;
    const padding = 15;

    const pathData = points
      .map((p, idx) => {
        const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((p.y - minY) / (maxY - minY)) * (height - 2 * padding);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '120px', overflow: 'visible' }}>
        <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        {points.map((p, idx) => {
          const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
          const y = height - padding - ((p.y - minY) / (maxY - minY)) * (height - 2 * padding);
          return <circle key={idx} cx={x} cy={y} r="4" fill={strokeColor} />;
        })}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Chart 1: PPG Heart Rate Stream */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="provenance-header">
          <div className="provenance-item">
            <span>STREAM:</span>
            <strong style={{ color: 'var(--text-primary)' }}>Heart Rate (PPG-derived rate)</strong>
          </div>
          <div className="provenance-item">
            <span>SOURCE:</span>
            <span className="source-badge simulated">SIMULATED SENSOR</span>
          </div>
          <div className="provenance-item">
            <span>QUALITY:</span>
            <span>98.0%</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Continuous Heart Rate Trajectory</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Arithmetic mean per 30-second synchronized sliding window
            </p>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
            {hrPoints.length > 0 ? `${hrPoints[hrPoints.length - 1].y.toFixed(1)} bpm` : '--'}
          </div>
        </div>

        {hrPoints.length > 1 ? (
          renderSparkline(hrPoints, minHr, maxHr, '#f43f5e')
        ) : (
          <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Awaiting window records... Run the demo scenario to generate stream telemetry.
          </div>
        )}
      </div>

      {/* Chart 2: Task Response Latency */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="provenance-header">
          <div className="provenance-item">
            <span>STREAM:</span>
            <strong style={{ color: 'var(--text-primary)' }}>Task Response Latency</strong>
          </div>
          <div className="provenance-item">
            <span>SOURCE:</span>
            <span className="source-badge live">BEHAVIORAL TELEMETRY</span>
          </div>
          <div className="provenance-item">
            <span>UNIT:</span>
            <span>Milliseconds (ms)</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Reaction Time Dispersion</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Mean decision time for arithmetic items submitted per window
            </p>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {rtPoints.length > 0 ? `${rtPoints[rtPoints.length - 1].y.toFixed(0)} ms` : '--'}
          </div>
        </div>

        {rtPoints.length > 1 ? (
          renderSparkline(rtPoints, minRt, maxRt, '#06b6d4')
        ) : (
          <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Awaiting task submissions... Submit answers or run demo to visualize response latency.
          </div>
        )}
      </div>
    </div>
  );
};
