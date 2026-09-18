import React, { useState } from 'react';
import {
  Terminal,
  BookOpen,
  Code,
  Shield,
  Layers,
  Cpu,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface Props {
  onLaunchConsole: () => void;
  onNavigate: (route: 'platform' | 'pricing' | 'docs') => void;
}

export const DocsPage: React.FC<Props> = ({ onLaunchConsole, onNavigate }) => {
  const [activeSection, setActiveSection] = useState<'quickstart' | 'extension' | 'pipeline' | 'api'>('quickstart');
  const [copiedCmd, setCopiedCmd] = useState(false);

  const copyCode = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border-hairline)', paddingBottom: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <BookOpen size={16} color="var(--laser-violet)" />
          <span className="mono-stamp" style={{ color: 'var(--laser-violet)' }}>
            FLOWSTATE DEVELOPER MANUAL // v1.0.0
          </span>
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
          Documentation & API Reference
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
          Architecture blueprints, data contracts, and integration guides for the Flowstate multimodal cognitive platform.
        </p>
      </div>

      {/* 2-Column Split: Docs Nav + Content Bay */}
      <div className="dock-grid dock-grid-split" style={{ alignItems: 'start' }}>
        {/* Left Nav Menu */}
        <div className="bay-cell" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.75rem' }}>
          <span className="mono-stamp" style={{ padding: '0.4rem 0.6rem', fontSize: '9px' }}>
            TABLE OF CONTENTS
          </span>

          {[
            { id: 'quickstart', label: '1. Quickstart & Local Setup' },
            { id: 'extension', label: '2. Chrome Extension Contract' },
            { id: 'pipeline', label: '3. Sliding Window Architecture' },
            { id: 'api', label: '4. REST API Endpoint Reference' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              style={{
                textAlign: 'left',
                background: activeSection === item.id ? 'var(--bay-elevated)' : 'transparent',
                color: activeSection === item.id ? 'var(--text-main)' : 'var(--text-secondary)',
                border: activeSection === item.id ? '1px solid var(--border-hairline-bright)' : 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-micro)',
                fontSize: '11.5px',
                fontFamily: 'var(--font-sans)',
                fontWeight: activeSection === item.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.12s ease'
              }}
            >
              {item.label}
            </button>
          ))}

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-hairline)' }}>
            <button
              onClick={onLaunchConsole}
              className="btn-laser btn-laser-primary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '11px' }}
            >
              <span>OPEN ACTIVE CONSOLE</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>

        {/* Right Content Bay */}
        <div className="bay-cell" style={{ padding: '1.75rem 2rem' }}>
          {/* SECTION 1: QUICKSTART */}
          {activeSection === 'quickstart' && (
            <div>
              <span className="mono-stamp" style={{ color: 'var(--laser-violet)' }}>SECTION 01</span>
              <h2 style={{ fontSize: '1.5rem', marginTop: '0.2rem', marginBottom: '1rem' }}>
                Quickstart & Local Environment Setup
              </h2>
              <p style={{ fontSize: '12.5px', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Flowstate is designed to run completely offline on your workstation. The backend is a lightweight FastAPI ASGI daemon backed by an authoritative SQLite engine, while the frontend is a zero-dependency Vite console.
              </p>

              <h4 style={{ fontSize: '13px', marginBottom: '0.5rem' }}>1. Start Backend Daemon</h4>
              <div style={{ background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <code className="mono" style={{ fontSize: '11.5px', color: 'var(--cyan-telemetry)' }}>
                  source .venv/bin/activate && uvicorn backend.main:app --host 127.0.0.1 --port 8000
                </code>
                <button onClick={() => copyCode('source .venv/bin/activate && uvicorn backend.main:app --host 127.0.0.1 --port 8000')} className="btn-laser btn-laser-ghost" style={{ padding: '2px 6px' }}>
                  {copiedCmd ? <Check size={12} color="var(--phosphor-jade)" /> : <Copy size={12} />}
                </button>
              </div>

              <h4 style={{ fontSize: '13px', marginBottom: '0.5rem' }}>2. Launch Frontend Dev Server</h4>
              <div style={{ background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <code className="mono" style={{ fontSize: '11.5px', color: 'var(--cyan-telemetry)' }}>
                  npm --prefix frontend run dev
                </code>
                <button onClick={() => copyCode('npm --prefix frontend run dev')} className="btn-laser btn-laser-ghost" style={{ padding: '2px 6px' }}>
                  <Copy size={12} />
                </button>
              </div>

              <h4 style={{ fontSize: '13px', marginBottom: '0.5rem' }}>3. Load Chrome Extension</h4>
              <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Open <code>chrome://extensions</code> in Google Chrome, enable <strong>Developer Mode</strong> in the top right, click <strong>Load unpacked</strong>, and select the <code>/FlowState/extension</code> directory.
              </p>
            </div>
          )}

          {/* SECTION 2: EXTENSION */}
          {activeSection === 'extension' && (
            <div>
              <span className="mono-stamp" style={{ color: 'var(--cyan-telemetry)' }}>SECTION 02</span>
              <h2 style={{ fontSize: '1.5rem', marginTop: '0.2rem', marginBottom: '1rem' }}>
                Chrome Extension Contract (Zero-DOM-Scraping)
              </h2>
              <p style={{ fontSize: '12.5px', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                The Flowstate Chrome Extension strictly adheres to privacy-by-design. It never accesses DOM inner text, code editors, clipboard, microphone, or camera. It only measures event timing intervals across supported platforms (LeetCode, GitHub).
              </p>

              <div style={{ background: '#050608', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)', padding: '1rem', overflowX: 'auto', marginBottom: '1.5rem' }}>
                <pre className="mono" style={{ fontSize: '11px', color: '#c7d2fe', lineHeight: 1.5 }}>
{`// POST http://127.0.0.1:8000/tasks/{session_id}/browser-telemetry
{
  "context_schema_version": "1.0.0",
  "domain": "leetcode.com",
  "task_context": {
    "task_id": "palindrome-number",
    "difficulty_label": "Easy",
    "difficulty_scalar": 1.0,
    "environmental_metadata_only": true
  },
  "behavioral_telemetry": {
    "keystroke_count": 48,
    "inter_key_interval_median_ms": 162.0,
    "task_inactivity_seconds": 4.5
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {/* SECTION 3: PIPELINE */}
          {activeSection === 'pipeline' && (
            <div>
              <span className="mono-stamp" style={{ color: 'var(--phosphor-jade)' }}>SECTION 03</span>
              <h2 style={{ fontSize: '1.5rem', marginTop: '0.2rem', marginBottom: '1rem' }}>
                Sliding Window Temporal Isolation
              </h2>
              <p style={{ fontSize: '12.5px', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                All sensor streams (keystrokes, task responses, optical PPG) are segmented into continuous <strong>30.0-second sliding windows with a 15.0-second step size</strong>.
              </p>

              <div className="dock-grid dock-grid-2" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem' }}>
                  <span className="mono-stamp">WINDOW PROPERTIES</span>
                  <div className="mono" style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-main)' }}>
                    Duration: 30.0s • Step: 15.0s
                  </div>
                  <p style={{ fontSize: '11px', marginTop: '4px' }}>
                    Guarantees rapid response to cognitive surges while maintaining statistical power.
                  </p>
                </div>
                <div style={{ padding: '0.75rem' }}>
                  <span className="mono-stamp">ZERO FUTURE LEAKAGE</span>
                  <div className="mono" style={{ fontSize: '13px', marginTop: '4px', color: 'var(--phosphor-jade)' }}>
                    Causal Time Gating Enforced
                  </div>
                  <p style={{ fontSize: '11px', marginTop: '4px' }}>
                    Feature extraction algorithms strictly access timestamps within <code>[t - 30s, t]</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: REST API */}
          {activeSection === 'api' && (
            <div>
              <span className="mono-stamp" style={{ color: 'var(--amber-alert)' }}>SECTION 04</span>
              <h2 style={{ fontSize: '1.5rem', marginTop: '0.2rem', marginBottom: '1rem' }}>
                REST API Endpoint Reference
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className="tag tag-pass" style={{ fontSize: '9px' }}>GET</span>
                    <code className="mono" style={{ fontSize: '12px', color: 'var(--text-main)' }}>/sessions?limit=50</code>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Returns recent active and completed sessions in the SQLite database.
                  </p>
                </div>

                <div style={{ background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className="tag tag-pass" style={{ fontSize: '9px' }}>GET</span>
                    <code className="mono" style={{ fontSize: '12px', color: 'var(--text-main)' }}>/sessions/{'{session_id}'}/timeline</code>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Returns authoritative timeline containing windows, feature vectors, inferences, and adaptations.
                  </p>
                </div>

                <div style={{ background: 'var(--bay-elevated)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className="tag tag-violet" style={{ fontSize: '9px' }}>POST</span>
                    <code className="mono" style={{ fontSize: '12px', color: 'var(--text-main)' }}>/evaluation/run/{'{scenario_id}'}</code>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Executes deterministic evaluation scenario through the complete production pipeline.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
