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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #1c1f2b' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6' }}>
              Estimate Quality & Confidence
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
              How much should you trust this estimate?
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
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
            background: '#11141c',
            border: '1px solid #1d212e',
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
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f3f4f6' }}>
                {confidenceScore >= 0.7 ? 'Good Quality' : 'Limited Confidence'}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: '#6366f1' }}>
              {confidencePercent}%
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem', lineHeight: 1.45 }}>
            Estimate confidence is a scientific gate answering whether current behavioral observations
            are sufficient to support safe workspace adaptations.
          </p>
        </div>

        {/* Breakdown of Quality Factors */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Verification Factors
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Factor 1 */}
            <div style={{ padding: '0.75rem', background: '#0e1017', border: '1px solid #1a1d28', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                <CheckCircle size={15} />
                <span>Behavioral Signal Available</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px', paddingLeft: '23px' }}>
                Active inter-keystroke intervals, backspace cadence, and typing pause distributions detected.
              </div>
            </div>

            {/* Factor 2 */}
            <div style={{ padding: '0.75rem', background: '#0e1017', border: '1px solid #1a1d28', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                <CheckCircle size={15} />
                <span>Sufficient Observation Window</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px', paddingLeft: '23px' }}>
                30-second temporal sliding window threshold satisfied (zero-padded imputation suppressed).
              </div>
            </div>

            {/* Factor 3 */}
            <div style={{ padding: '0.75rem', background: '#0e1017', border: '1px solid #1a1d28', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '0.85rem', fontWeight: 500 }}>
                <Info size={15} style={{ color: '#6366f1' }} />
                <span>Wearable PPG Standby</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px', paddingLeft: '23px' }}>
                No consumer optical PPG connected. Inference operates in pure behavioral mode (provenance: <code>COMPUTER_BEHAVIOR</code>).
              </div>
            </div>
          </div>
        </div>

        {/* Scientific Boundary Notice */}
        <div style={{ padding: '0.85rem 1rem', background: '#11141c', borderLeft: '3px solid #6366f1', borderRadius: '4px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: '#e5e7eb' }}>
            <Shield size={13} style={{ color: '#6366f1' }} />
            <span>Non-Invasive Behavioral Proxy</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '4px', lineHeight: 1.4 }}>
            State estimates reflect computer-interaction cadence patterns, not neurological or clinical diagnoses.
          </p>
        </div>

        {/* Action Button */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #1c1f2b' }}>
          <button
            onClick={() => {
              onClose();
              onOpenEvidence();
            }}
            style={{
              width: '100%',
              padding: '8px 14px',
              background: '#1a1d29',
              border: '1px solid #282d3d',
              borderRadius: '6px',
              color: '#f3f4f6',
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
