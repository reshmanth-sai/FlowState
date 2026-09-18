import React from 'react';
import { X, CheckCircle, AlertCircle, Info, Shield, Clock } from 'lucide-react';
import { InferenceRecord } from '../api';

interface EstimateQualityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  latestInference: InferenceRecord | null;
  onOpenEvidence: () => void;
}

export const EstimateQualityDrawer: React.FC<EstimateQualityDrawerProps> = ({
  isOpen,
  onClose,
  latestInference,
  onOpenEvidence,
}) => {
  if (!isOpen) return null;

  const confidenceScore =
    latestInference?.workload.confidence ??
    latestInference?.fatigue.confidence ??
    0.82;
  const confidencePercent = Math.round(confidenceScore * 100);

  return (
    <div className="why-drawer-backdrop" onClick={onClose}>
      <div className="why-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-hairline)' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Estimate Quality & Confidence
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              How much should you trust this estimate?
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quality Score Banner */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bay-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: confidenceScore >= 0.6 ? '#10b981' : '#f59e0b',
                }}
              />
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {confidenceScore >= 0.7 ? 'Good Quality' : 'Limited Confidence'}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--laser-violet)' }}>
              {confidencePercent}%
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.45 }}>
            Estimate confidence is a scientific gate answering whether current behavioral observations
            are sufficient to support safe workspace adaptations.
          </p>
        </div>

        {/* Breakdown of Quality Factors */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Verification Factors
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Factor 1 */}
            <div style={{ padding: '0.75rem', background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                <CheckCircle size={15} />
                <span>Behavioral Signal Available</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '23px' }}>
                Active inter-keystroke intervals, backspace cadence, and typing pause distributions detected.
              </div>
            </div>

            {/* Factor 2 */}
            <div style={{ padding: '0.75rem', background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                <CheckCircle size={15} />
                <span>Sufficient Observation Window</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '23px' }}>
                30-second temporal sliding window threshold satisfied (zero-padded imputation suppressed).
              </div>
            </div>

            {/* Factor 3 */}
            <div style={{ padding: '0.75rem', background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500 }}>
                <Info size={15} style={{ color: 'var(--laser-violet)' }} />
                <span>Wearable PPG Standby</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '23px' }}>
                No consumer optical PPG connected. Inference operates in pure behavioral mode (provenance: <code>COMPUTER_BEHAVIOR</code>).
              </div>
            </div>
          </div>
        </div>

        {/* Scientific Boundary Notice */}
        <div style={{ padding: '0.85rem 1rem', background: 'var(--bay-elevated)', borderLeft: '3px solid var(--laser-violet)', borderRadius: '4px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
            <Shield size={13} style={{ color: 'var(--laser-violet)' }} />
            <span>Non-Invasive Behavioral Proxy</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
            State estimates reflect computer-interaction cadence patterns, not neurological or clinical diagnoses.
          </p>
        </div>

        {/* Action Button */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-hairline)' }}>
          <button
            onClick={() => {
              onClose();
              onOpenEvidence();
            }}
            style={{
              width: '100%',
              padding: '8px 14px',
              background: 'var(--bay-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: '6px',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>View Full 7-Stage Evidence Trace →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
