import React, { useState } from 'react';
import {
  ShieldCheck,
  Database,
  Sliders,
  Bluetooth,
  Download,
  Trash2,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [cooldownSeconds, setCooldownSeconds] = useState(180);
  const [adaptationSensitivity, setAdaptationSensitivity] = useState<'conservative' | 'balanced' | 'responsive'>('conservative');
  const [autoFocusMode, setAutoFocusMode] = useState(true);

  return (
    <div className="product-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f3f4f6', letterSpacing: '-0.02em' }}>
          Settings & Privacy
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '2px' }}>
          Configure signal sources, privacy boundaries, and sovereign adaptation parameters.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Section 1: Signal Sources */}
        <div className="calm-panel">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6', marginBottom: '1rem' }}>
            Connected Signal Sources
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Browser Extension Source */}
            <div style={{ padding: '1rem', background: '#0e1017', border: '1px solid #1a1d28', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f3f4f6' }}>
                    Flowstate Chrome Extension
                  </span>
                  <span className="badge-chip badge-pass">CONNECTED</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '3px' }}>
                  Captures typing interval dynamics, pause distributions, and problem metadata on supported domains.
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
                v1.0.0 (Port 8000)
              </span>
            </div>

            {/* Wearable BLE Source */}
            <div style={{ padding: '1rem', background: '#0e1017', border: '1px solid #1a1d28', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f3f4f6' }}>
                    Consumer Optical PPG (Web Bluetooth)
                  </span>
                  <span className="badge-chip badge-neutral">STANDBY</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '3px' }}>
                  Connect any standard Bluetooth LE heart rate peripheral (Polar H10, Garmin, Apple Watch companion).
                </p>
              </div>
              <button
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid #232738',
                  borderRadius: '5px',
                  color: '#e5e7eb',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Bluetooth size={13} />
                <span>Pair Bluetooth</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Privacy Boundaries */}
        <div className="calm-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6' }}>
              Data Storage & Privacy Boundaries
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '1rem', background: '#0e1017', border: '1px solid #1a1d28', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#10b981', marginBottom: '0.5rem' }}>
                Guaranteed Local Storage
              </div>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.45 }}>
                All temporal sliding windows, feature extractions, and model inferences are stored in a
                local SQLite file on your workstation. No cloud upload, no tracking pixels.
              </p>
            </div>

            <div style={{ padding: '1rem', background: '#0e1017', border: '1px solid #1a1d28', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem' }}>
                Strict Privacy Fence
              </div>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.45 }}>
                Flowstate is architecturally prohibited from capturing code solutions, keystroke characters,
                page DOM text, clipboard contents, webcam, or microphone.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #181b26' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid #232738',
                borderRadius: '5px',
                color: '#d1d5db',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <Download size={13} />
              <span>Export Full Audit Dossier (JSON)</span>
            </button>
          </div>
        </div>

        {/* Section 3: Adaptation Policy Parameters */}
        <div className="calm-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Sliders size={18} style={{ color: '#6366f1' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6' }}>
              Sovereign Adaptation Policy
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <span style={{ color: '#e5e7eb', fontWeight: 500 }}>Adaptation Threshold Policy</span>
                <span style={{ color: '#6366f1', textTransform: 'capitalize' }}>{adaptationSensitivity}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '6px' }}>
                {(['conservative', 'balanced', 'responsive'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAdaptationSensitivity(mode)}
                    style={{
                      padding: '5px 12px',
                      background: adaptationSensitivity === mode ? '#6366f1' : '#0e1017',
                      border: `1px solid ${adaptationSensitivity === mode ? '#6366f1' : '#1e2230'}`,
                      borderRadius: '5px',
                      color: adaptationSensitivity === mode ? '#ffffff' : '#9ca3af',
                      fontSize: '0.78rem',
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                Conservative policy requires high confidence (&gt;0.70) and sustained fatigue before recommending pacing adjustments.
              </p>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid #181b26', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#e5e7eb', fontWeight: 500 }}>
                  Adaptation Cooldown Guard
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                  Prevents rapid oscillation or distracting repeated prompts
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#f3f4f6' }}>
                180 seconds
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
