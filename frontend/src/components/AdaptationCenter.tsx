import React from 'react';
import { Zap, Clock, CheckCircle, XCircle, PauseCircle } from 'lucide-react';
import { AdaptationDecision } from '../api';

interface Props {
  interventions: AdaptationDecision[];
  onRespond: (id: string, action: string) => void;
}

export const AdaptationCenter: React.FC<Props> = ({ interventions, onRespond }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="provenance-header">
        <div className="provenance-item">
          <span>MODULE:</span>
          <strong style={{ color: 'var(--text-primary)' }}>Closed-Loop Adaptation Engine</strong>
        </div>
        <div className="provenance-item">
          <span>POLICY:</span>
          <span>Confidence-Gated Hysteresis & Cooldown</span>
        </div>
        <div className="provenance-item">
          <span>ACTIONS:</span>
          <span>Bounded Task Interventions Only</span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>Intervention History & Status</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Every adaptation decision records its triggering cognitive state, confidence gate verification, and explicit user response.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {interventions.length > 0 ? (
            interventions.map((item) => (
              <div
                key={item.intervention_id}
                style={{
                  padding: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={18} color="var(--accent-amber)" />
                    <strong style={{ fontSize: '1rem', color: '#fcd34d' }}>{item.action}</strong>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', fontWeight: 700 }}>
                    {item.status}
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {item.reason}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Trigger: {item.trigger_state} ({item.trigger_estimate}) • Cooldown: {item.cooldown_seconds}s</span>
                  {item.status === 'OFFERED' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => onRespond(item.intervention_id, 'ACCEPTED')}
                      >
                        Accept
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => onRespond(item.intervention_id, 'DISMISSED')}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No interventions recorded yet. Run the demo scenario or submit high-latency task responses to trigger adaptation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
