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
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

interface SettingsViewProps {
  theme?: 'light' | 'dark';
  onSetTheme?: (theme: 'light' | 'dark') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme = 'dark',
  onSetTheme,
}) => {
  const [cooldownSeconds, setCooldownSeconds] = useState(180);
  const [adaptationSensitivity, setAdaptationSensitivity] = useState<'conservative' | 'balanced' | 'responsive'>('conservative');
  const [autoFocusMode, setAutoFocusMode] = useState(true);

  return (
    <div className="product-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Settings & Privacy
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Configure visual appearance, signal sources, privacy boundaries, and sovereign adaptation parameters.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Section 0: Appearance & Theme */}
        <div className="calm-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            {theme === 'dark' ? <Moon size={18} style={{ color: 'var(--laser-violet)' }} /> : <Sun size={18} style={{ color: 'var(--amber-alert)' }} />}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Appearance & Theme
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)' }}>
                Interface Theme
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Select between Obsidian Night or Calm Alabaster day theme.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => onSetTheme && onSetTheme('dark')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: theme === 'dark' ? 'var(--laser-violet)' : 'var(--bay-elevated)',
                  border: `1px solid ${theme === 'dark' ? 'var(--laser-violet)' : 'var(--border-hairline)'}`,
                  borderRadius: '6px',
                  color: theme === 'dark' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Moon size={13} />
                <span>Dark Mode</span>
              </button>

              <button
                onClick={() => onSetTheme && onSetTheme('light')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: theme === 'light' ? 'var(--laser-violet)' : 'var(--bay-elevated)',
                  border: `1px solid ${theme === 'light' ? 'var(--laser-violet)' : 'var(--border-hairline)'}`,
                  borderRadius: '6px',
                  color: theme === 'light' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Sun size={13} />
                <span>Light Mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 1: Signal Sources */}
        <div className="calm-panel">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Connected Signal Sources
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Browser Extension Source */}
            <div style={{ padding: '1rem', background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Flowstate Chrome Extension
                  </span>
                  <span className="badge-chip badge-pass">CONNECTED</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Captures typing interval dynamics, pause distributions, and problem metadata on supported domains.
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                v1.0.0 (Port 8000)
              </span>
            </div>

            {/* Wearable BLE Source */}
            <div style={{ padding: '1rem', background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Consumer Optical PPG (Web Bluetooth)
                  </span>
                  <span className="badge-chip badge-neutral">STANDBY</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Connect any standard Bluetooth LE heart rate peripheral (Polar H10, Garmin, Apple Watch companion).
                </p>
              </div>
              <button
                style={{
                  padding: '6px 12px',
                  background: 'var(--bay-hover)',
                  border: '1px solid var(--border-hairline-bright)',
                  borderRadius: '5px',
                  color: 'var(--text-main)',
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
            <ShieldCheck size={18} style={{ color: 'var(--phosphor-jade)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Data Storage & Privacy Boundaries
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--phosphor-jade)', marginBottom: '0.5rem' }}>
                Guaranteed Local Storage
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                All temporal sliding windows, feature extractions, and model inferences are stored in a
                local SQLite file on your workstation. No cloud upload, no tracking pixels.
              </p>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--crimson-alert)', marginBottom: '0.5rem' }}>
                Strict Privacy Fence
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Flowstate is architecturally prohibited from capturing code solutions, keystroke characters,
                page DOM text, clipboard contents, webcam, or microphone.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-hairline)' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: 'var(--bay-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '5px',
                color: 'var(--text-main)',
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
            <Sliders size={18} style={{ color: 'var(--laser-violet)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Sovereign Adaptation Policy
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Adaptation Threshold Policy</span>
                <span style={{ color: 'var(--laser-violet)', textTransform: 'capitalize' }}>{adaptationSensitivity}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '6px' }}>
                {(['conservative', 'balanced', 'responsive'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAdaptationSensitivity(mode)}
                    style={{
                      padding: '5px 12px',
                      background: adaptationSensitivity === mode ? 'var(--laser-violet)' : 'var(--bay-elevated)',
                      border: `1px solid ${adaptationSensitivity === mode ? 'var(--laser-violet)' : 'var(--border-hairline)'}`,
                      borderRadius: '5px',
                      color: adaptationSensitivity === mode ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Conservative policy requires high confidence (&gt;0.70) and sustained fatigue before recommending pacing adjustments.
              </p>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  Adaptation Cooldown Guard
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Prevents rapid oscillation or distracting repeated prompts
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                180 seconds
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
