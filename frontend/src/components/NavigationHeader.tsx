import React from 'react';
import { Activity, Radio, Sparkles, Terminal, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { Session } from '../api';

interface Props {
  currentRoute: 'platform' | 'console' | 'pricing' | 'docs';
  setCurrentRoute: (route: 'platform' | 'console' | 'pricing' | 'docs') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeSession: Session | null;
  mode: 'DEMO' | 'LIVE';
  setMode: (mode: 'DEMO' | 'LIVE') => void;
  availableSessions?: Session[];
  onSelectSession?: (session: Session) => void;
  onRefreshSessions?: () => void;
  windowsCount?: number;
}

export const NavigationHeader: React.FC<Props> = ({
  currentRoute,
  setCurrentRoute,
  activeTab,
  setActiveTab,
  activeSession,
  mode,
  setMode,
  availableSessions = [],
  onSelectSession,
  onRefreshSessions,
  windowsCount = 0,
}) => {
  const consoleTabs = [
    { id: 'overview', index: '01', label: 'Overview' },
    { id: 'monitor', index: '02', label: 'Live Monitor' },
    { id: 'review', index: '03', label: 'Session Review' },
    { id: 'follow-signal', index: '04', label: 'Signal Trace' },
    { id: 'evaluation', index: '05', label: 'Evidence & Eval' },
    { id: 'task', index: '06', label: 'Task Workspace' },
    { id: 'signals', index: '07', label: 'Signals' },
    { id: 'features', index: '08', label: 'Features' },
    { id: 'adaptation', index: '09', label: 'Adaptation' },
    { id: 'research', index: '10', label: 'Research Lab' },
    { id: 'status', index: '11', label: 'System' },
  ];

  return (
    <header className="app-header">
      {/* CASE 1: PUBLIC SAAS PLATFORM HEADER */}
      {currentRoute !== 'console' ? (
        <>
          <div className="brand-section">
            <div
              className="brand-beacon"
              title="Flowstate Research Kernel: Online"
              onClick={() => setCurrentRoute('platform')}
              style={{ cursor: 'pointer' }}
            />
            
            <div
              className="brand-mark"
              onClick={() => setCurrentRoute('platform')}
              style={{ cursor: 'pointer' }}
            >
              <span>FLOWSTATE</span>
              <span className="brand-divider">//</span>
              <span className="brand-tag">v1.0.0</span>
            </div>

            {/* Public SaaS Nav Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '1.5rem' }}>
              <button
                onClick={() => setCurrentRoute('platform')}
                className={`nav-tab-btn ${currentRoute === 'platform' ? 'active' : ''}`}
              >
                Platform
              </button>
              <button
                onClick={() => setCurrentRoute('pricing')}
                className={`nav-tab-btn ${currentRoute === 'pricing' ? 'active' : ''}`}
              >
                Pricing
              </button>
              <button
                onClick={() => setCurrentRoute('docs')}
                className={`nav-tab-btn ${currentRoute === 'docs' ? 'active' : ''}`}
              >
                Docs & API
              </button>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="tactical-controls">
            {activeSession && (
              <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                SESSION: <strong style={{ color: 'var(--cyan-telemetry)' }}>{activeSession.id.slice(0, 10)}</strong>
                {windowsCount > 0 ? ` (${windowsCount} WIN)` : ''}
              </span>
            )}

            <button
              onClick={() => setCurrentRoute('console')}
              className="btn-laser btn-laser-primary"
              style={{ padding: '4px 12px', fontSize: '11.5px', gap: '0.4rem' }}
            >
              <span>LAUNCH CONSOLE</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </>
      ) : (
        /* CASE 2: CONSOLE FLIGHT DECK HEADER */
        <>
          <div className="brand-section">
            <button
              onClick={() => setCurrentRoute('platform')}
              className="btn-laser btn-laser-ghost"
              style={{ padding: '2px 7px', fontSize: '10px', gap: '4px', marginRight: '0.4rem' }}
              title="Return to public platform website"
            >
              <ArrowLeft size={10} />
              <span>PLATFORM</span>
            </button>

            <div className="brand-beacon" title="Flowstate Research Kernel: Ingestion Active" />
            
            <div className="brand-mark">
              <span>FLOWSTATE</span>
              <span className="brand-divider">//</span>
              <span className="brand-tag">CONSOLE</span>
            </div>

            {/* Tactical Segmented Mode Switcher */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bay-surface)',
              border: '1px solid var(--border-hairline-bright)',
              borderRadius: 'var(--radius-micro)',
              padding: '1px',
              marginLeft: '0.4rem'
            }}>
              <button
                onClick={() => setMode('DEMO')}
                style={{
                  background: mode === 'DEMO' ? 'var(--bay-elevated)' : 'transparent',
                  color: mode === 'DEMO' ? '#fcd34d' : 'var(--text-muted)',
                  border: mode === 'DEMO' ? '1px solid var(--border-hairline-bright)' : 'none',
                  borderRadius: 'var(--radius-micro)',
                  padding: '2px 7px',
                  fontSize: '9.5px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Sparkles size={9} />
                DEMO
              </button>
              <button
                onClick={() => setMode('LIVE')}
                style={{
                  background: mode === 'LIVE' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: mode === 'LIVE' ? 'var(--phosphor-jade)' : 'var(--text-muted)',
                  border: mode === 'LIVE' ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                  borderRadius: 'var(--radius-micro)',
                  padding: '2px 7px',
                  fontSize: '9.5px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Radio size={9} />
                LIVE
              </button>
            </div>
          </div>

          {/* Center: Monolithic Segmented Console Navigation Tabs */}
          <nav className="nav-tabs" style={{ overflowX: 'auto', maxWidth: '58vw' }}>
            {consoleTabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-shortcut">{tab.index}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Right: Telemetry Session Selector & Tactical Diagnostics */}
          <div className="tactical-controls">
            {/* BLE Ingest Button */}
            <button
              onClick={async () => {
                try {
                  const { bleHeartRate } = await import('../utils/bluetooth');
                  if (bleHeartRate.isConnected) {
                    bleHeartRate.disconnect();
                    alert('Bluetooth sensor disconnected.');
                  } else {
                    await bleHeartRate.connect(async (data) => {
                      if (activeSession) {
                        try {
                          await fetch(`http://localhost:8000/data/events`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              events: [
                                {
                                  id: `evt_ble_${Date.now()}`,
                                  session_id: activeSession.id,
                                  timestamp: new Date().toISOString(),
                                  source_type: 'REAL_WEARABLE',
                                  source_device: bleHeartRate.deviceName,
                                  signal_type: 'heart_rate',
                                  value: data.heartRate,
                                  unit: 'bpm',
                                  quality: 1.0,
                                  metadata: { bluetooth: true },
                                },
                              ],
                            }),
                          });
                        } catch (e) {
                          console.error('BLE ingest error', e);
                        }
                      }
                    });
                    alert(`Paired: ${bleHeartRate.deviceName} streaming live heart rate.`);
                  }
                } catch (err: any) {
                  alert(err.message || 'Web Bluetooth pairing failed.');
                }
              }}
              className="btn-laser btn-laser-ghost"
              style={{ padding: '2px 7px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}
              title="Pair Bluetooth Low Energy heart rate monitor"
            >
              <Activity size={10} />
              <span>BLE</span>
            </button>

            {/* Live Session Selector */}
            {availableSessions && availableSessions.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span className="mono-stamp" style={{ fontSize: '8.5px' }}>SESS:</span>
                <select
                  id="session-selector-dropdown"
                  value={activeSession?.id || ''}
                  onChange={(e) => {
                    const selected = availableSessions.find((s) => s.id === e.target.value);
                    if (selected && onSelectSession) {
                      onSelectSession(selected);
                    }
                  }}
                  onFocus={() => {
                    if (onRefreshSessions) onRefreshSessions();
                  }}
                  className="select-laser"
                  style={{ maxWidth: '160px' }}
                >
                  {availableSessions.map((sess) => (
                    <option key={sess.id} value={sess.id} style={{ background: '#0a0b10', color: '#f4f4f7' }}>
                      {sess.id.slice(0, 12)} {sess.id === 'sess_7ef93235c6' ? '⭐ [LeetCode]' : `[${sess.mode}]`}
                    </option>
                  ))}
                </select>
              </div>
            ) : activeSession ? (
              <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {activeSession.id.slice(0, 12)}
              </span>
            ) : null}

            <span className="tag tag-pass" style={{ fontSize: '9px', letterSpacing: '0.04em' }}>
              ONLINE
            </span>
          </div>
        </>
      )}
    </header>
  );
};
