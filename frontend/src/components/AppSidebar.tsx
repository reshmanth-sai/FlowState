import React, { useState } from 'react';
import {
  Home,
  Activity,
  History,
  LineChart,
  Settings,
  ShieldCheck,
  FlaskConical,
  Play,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Session } from '../api';

export type ProductView =
  | 'home'
  | 'live'
  | 'history'
  | 'signals'
  | 'settings'
  | 'evidence'
  | 'evaluation'
  | 'demo'
  | 'platform';

interface AppSidebarProps {
  currentView: ProductView;
  onSelectView: (view: ProductView) => void;
  activeSession: Session | null;
  durationMinutes: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  onSelectView,
  activeSession,
  durationMinutes,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(
    ['evidence', 'evaluation', 'demo'].includes(currentView)
  );

  return (
    <aside className="product-sidebar">
      <div>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">◒</div>
          <div>
            <div className="sidebar-brand-title">FLOWSTATE</div>
            <div className="sidebar-brand-subtitle">Adaptive Workspace</div>
          </div>
        </div>

        {/* Primary Product Navigation */}
        <div className="sidebar-nav-group">
          <button
            className={`sidebar-nav-btn ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => onSelectView('home')}
          >
            <Home size={15} />
            <span>Home</span>
          </button>

          <button
            className={`sidebar-nav-btn ${currentView === 'live' ? 'active' : ''}`}
            onClick={() => onSelectView('live')}
          >
            <Activity size={15} />
            <span>Live Session</span>
          </button>

          <button
            className={`sidebar-nav-btn ${currentView === 'history' ? 'active' : ''}`}
            onClick={() => onSelectView('history')}
          >
            <History size={15} />
            <span>History</span>
          </button>

          <button
            className={`sidebar-nav-btn ${currentView === 'signals' ? 'active' : ''}`}
            onClick={() => onSelectView('signals')}
          >
            <LineChart size={15} />
            <span>Signals</span>
          </button>
        </div>

        {/* Advanced Research & Verification Accordion */}
        <div style={{ marginTop: '1.25rem' }}>
          <div
            className="sidebar-section-label"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => setAdvancedOpen(!advancedOpen)}
          >
            <span>Advanced</span>
            {advancedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </div>

          {advancedOpen && (
            <div className="sidebar-nav-group" style={{ paddingLeft: '0.25rem' }}>
              <button
                className={`sidebar-nav-btn ${currentView === 'evidence' ? 'active' : ''}`}
                onClick={() => onSelectView('evidence')}
              >
                <ShieldCheck size={14} />
                <span>Evidence Trace</span>
              </button>

              <button
                className={`sidebar-nav-btn ${currentView === 'evaluation' ? 'active' : ''}`}
                onClick={() => onSelectView('evaluation')}
              >
                <FlaskConical size={14} />
                <span>Evaluation Lab</span>
              </button>

              <button
                className={`sidebar-nav-btn ${currentView === 'demo' ? 'active' : ''}`}
                onClick={() => onSelectView('demo')}
              >
                <Play size={14} />
                <span>Adaptive Loop Demo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer & Live Session Pill */}
      <div className="sidebar-footer">
        <button
          className={`sidebar-nav-btn ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onSelectView('settings')}
        >
          <Settings size={15} />
          <span>Settings & Privacy</span>
        </button>

        <button
          className="sidebar-nav-btn"
          onClick={() => onSelectView('platform')}
          style={{ fontSize: '0.78rem', color: '#6b7280' }}
        >
          <ExternalLink size={13} />
          <span>Product Website</span>
        </button>

        {activeSession && (
          <div className="sidebar-session-pill">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: '#9ca3af', fontWeight: 500 }}>
                {activeSession.mode === 'SIMULATED' ? 'Simulated' : 'Active'}
              </span>
            </div>
            <span style={{ color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
              {durationMinutes > 0 ? `${durationMinutes}m` : 'Live'}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
