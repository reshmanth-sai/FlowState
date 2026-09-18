import React, { useState, useEffect } from 'react';
import { AppSidebar, ProductView } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';
import { HomeView } from './components/HomeView';
import { LiveSessionView } from './components/LiveSessionView';
import { HistoryView } from './components/HistoryView';
import { SignalsView } from './components/SignalsView';
import { SettingsView } from './components/SettingsView';
import { FollowTheSignal } from './components/FollowTheSignal';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { InteractiveTaskWorkspace } from './components/InteractiveTaskWorkspace';
import { FocusModeOverlay } from './components/FocusModeOverlay';
import { CommandPalette } from './components/CommandPalette';
import { LandingPage } from './components/LandingPage';
import { PricingPage } from './components/PricingPage';
import { DocsPage } from './components/DocsPage';
import {
  api,
  Session,
  InferenceRecord,
  SignalWindow,
  FeatureVector,
  AdaptationDecision,
  SystemStatus,
} from './api';

export const App: React.FC = () => {
  // Primary Product Route: defaults to calm 'home'
  const [currentView, setCurrentView] = useState<ProductView>('home');
  const [mode, setMode] = useState<'DEMO' | 'LIVE'>('LIVE');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  // Session timeline data
  const [windows, setWindows] = useState<SignalWindow[]>([]);
  const [features, setFeatures] = useState<FeatureVector[]>([]);
  const [inferences, setInferences] = useState<InferenceRecord[]>([]);
  const [interventions, setInterventions] = useState<AdaptationDecision[]>([]);
  const [selectedInferenceId, setSelectedInferenceId] = useState<string | null>(null);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);

  // Focus mode & Command palette states
  const [focusMode, setFocusMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Theme state: persisted in localStorage with system preference fallback
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('flowstate_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('flowstate_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // URL Hash synchronization
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') as ProductView;
      const validViews: ProductView[] = [
        'home',
        'live',
        'history',
        'signals',
        'settings',
        'evidence',
        'evaluation',
        'demo',
        'platform',
      ];
      if (validViews.includes(hash)) {
        setCurrentView(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (view: ProductView) => {
    setCurrentView(view);
    window.location.hash = `#${view}`;
  };

  // Keyboard shortcuts: ⌘K for command palette, ⌘ Shift F for focus mode, Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'F' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setFocusMode((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (focusMode) setFocusMode(false);
        if (commandPaletteOpen) setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, commandPaletteOpen]);

  // Fetch sessions from API
  const fetchSessions = async (): Promise<Session[]> => {
    try {
      const list = await api.getSessions(50);
      setAvailableSessions(list);
      return list;
    } catch (err) {
      console.error('Failed to fetch sessions', err);
      return [];
    }
  };

  // Initial initialization
  useEffect(() => {
    const initApp = async () => {
      try {
        const sys = await api.getSystemStatus();
        setSystemStatus(sys);

        const list = await fetchSessions();
        const savedId = localStorage.getItem('flowstate_selected_session');
        const savedSession = list.find((s) => s.id === savedId);

        if (savedSession) {
          setActiveSession(savedSession);
        } else if (list.length > 0) {
          // Default to the recorded LeetCode session if present
          const targetSession = list.find((s) => s.id === 'sess_7ef93235c6') || list[0];
          setActiveSession(targetSession);
        } else {
          const sess = await api.createSession('reviewer_session', 'SIMULATED');
          await api.startSession(sess.id);
          setActiveSession(sess);
          setAvailableSessions([sess]);
        }
      } catch (err) {
        console.error('Failed to initialize app', err);
      }
    };
    initApp();
  }, []);

  // Poll timeline periodically for active session
  const refreshTimeline = async () => {
    if (!activeSession) return;
    try {
      const data = await api.getSessionTimeline(activeSession.id);
      setWindows(data.windows || []);
      setFeatures(data.features || []);
      setInferences(data.inferences || []);
      setInterventions(data.interventions || []);
    } catch (err) {
      console.error('Failed to refresh timeline', err);
    }
  };

  useEffect(() => {
    if (!activeSession) return;
    refreshTimeline();
    const interval = setInterval(refreshTimeline, 5000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const latestInference = inferences.length > 0 ? inferences[inferences.length - 1] : null;
  const latestWindow = windows.length > 0 ? windows[windows.length - 1] : null;
  const latestFeatures = features.length > 0 ? features[features.length - 1] : null;
  const latestDecision = interventions.length > 0 ? interventions[interventions.length - 1] : null;

  // Approximate duration from windows (each window step is 15s)
  const durationMinutes = windows.length > 0 ? Math.max(1, Math.round((windows.length * 15) / 60)) : 18;

  // Render Public Website if selected
  if (currentView === 'platform') {
    return (
      <div>
        <LandingPage
          onLaunchConsole={() => navigateTo('home')}
          onNavigate={(route) => navigateTo(route as ProductView)}
          activeSessionId={activeSession?.id}
          activeWindowsCount={windows.length}
        />
      </div>
    );
  }

  return (
    <div className="product-app-layout">
      {/* 1. Persistent Minimal Sidebar */}
      <AppSidebar
        currentView={currentView}
        onSelectView={navigateTo}
        activeSession={activeSession}
        durationMinutes={durationMinutes}
      />

      {/* 2. Main Viewport */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--canvas-bg)' }}>
        {/* Calm App Header */}
        <AppHeader
          activeSession={activeSession}
          durationMinutes={durationMinutes}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode(!focusMode)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          mode={mode}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Scrollable View Area */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {/* HOME VIEW */}
          {currentView === 'home' && (
            <HomeView
              activeSession={activeSession}
              latestInference={latestInference}
              durationMinutes={durationMinutes}
              onContinueSession={() => navigateTo('live')}
              onStartNewSession={() => navigateTo('live')}
              onViewSignals={() => navigateTo('signals')}
              onViewHistory={() => navigateTo('history')}
              onViewEvidence={() => navigateTo('evidence')}
            />
          )}

          {/* LIVE SESSION VIEW */}
          {currentView === 'live' && (
            <LiveSessionView
              activeSession={activeSession}
              latestInference={latestInference}
              windows={windows}
              latestDecision={latestDecision}
              durationMinutes={durationMinutes}
              onBackToHome={() => navigateTo('home')}
              onNavigateToSignals={() => navigateTo('signals')}
              onNavigateToEvidence={() => navigateTo('evidence')}
              onEndSession={() => navigateTo('history')}
            />
          )}

          {/* HISTORY VIEW */}
          {currentView === 'history' && (
            <HistoryView
              sessions={availableSessions}
              activeSession={activeSession}
              windows={windows}
              features={features}
              inferences={inferences}
              interventions={interventions}
              onSelectSession={(sess) => {
                setActiveSession(sess);
                localStorage.setItem('flowstate_selected_session', sess.id);
              }}
              onInspectEvidence={(id) => {
                if (id) setSelectedInferenceId(id);
                navigateTo('evidence');
              }}
            />
          )}

          {/* SIGNALS & OSCILLOSCOPE VIEW */}
          {currentView === 'signals' && (
            <SignalsView
              activeSession={activeSession}
              latestInference={latestInference}
              latestWindow={latestWindow}
              latestFeatures={latestFeatures}
              activeIntervention={latestDecision}
              allInferences={inferences}
              allWindows={windows}
              allFeatures={features}
              onFollowSignal={(id) => {
                setSelectedInferenceId(id);
                navigateTo('evidence');
              }}
              onOpenSettings={() => navigateTo('settings')}
            />
          )}

          {/* SETTINGS & PRIVACY VIEW */}
          {currentView === 'settings' && (
            <SettingsView
              theme={theme}
              onSetTheme={(t) => setTheme(t)}
            />
          )}

          {/* ADVANCED: 7-STAGE EVIDENCE TRACE */}
          {currentView === 'evidence' && (
            <div style={{ padding: '2rem' }}>
              <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f3f4f6' }}>
                      7-Stage Evidence Trace DAG
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '2px' }}>
                      Cryptographic SHA-256 session integrity and deterministic feature attribution.
                    </p>
                  </div>
                  <button
                    onClick={() => navigateTo('live')}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid #232738',
                      borderRadius: '5px',
                      color: '#9ca3af',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    ← Back to Live Session
                  </button>
                </div>
                <FollowTheSignal
                  inferences={inferences}
                  windows={windows}
                  features={features}
                  interventions={interventions}
                  selectedInferenceId={selectedInferenceId}
                  onSelectInference={(id) => setSelectedInferenceId(id)}
                />
              </div>
            </div>
          )}

          {/* ADVANCED: EVALUATION DASHBOARD */}
          {currentView === 'evaluation' && (
            <div style={{ padding: '2rem' }}>
              <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f3f4f6' }}>
                      Controlled Pipeline Evaluation Lab
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '2px' }}>
                      Reproducible verification benchmarks across 5 controlled behavioral scenarios.
                    </p>
                  </div>
                  <button
                    onClick={() => navigateTo('home')}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid #232738',
                      borderRadius: '5px',
                      color: '#9ca3af',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    ← Back to Home
                  </button>
                </div>
                <EvaluationDashboard />
              </div>
            </div>
          )}

          {/* ADVANCED: DEMO MODE (ADAPTIVE LOOP) */}
          {currentView === 'demo' && activeSession && (
            <div style={{ padding: '2rem' }}>
              <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f3f4f6' }}>
                      Closed-Loop Adaptive Demonstration
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '2px' }}>
                      Observe the complete behavioral change → inference → confidence gate → adaptation cycle.
                    </p>
                  </div>
                  <button
                    onClick={() => navigateTo('live')}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid #232738',
                      borderRadius: '5px',
                      color: '#9ca3af',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    ← Back to Live Session
                  </button>
                </div>
                <InteractiveTaskWorkspace
                  sessionId={activeSession.id}
                  activeIntervention={latestDecision}
                  onInterventionResponse={() => refreshTimeline()}
                  onTelemetrySubmitted={refreshTimeline}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Ambient Focus Mode Overlay */}
      <FocusModeOverlay
        isActive={focusMode}
        onExit={() => setFocusMode(false)}
        taskTitle="Two Sum"
        durationMinutes={durationMinutes}
      />

      {/* 4. Quick Command Palette (⌘K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(view) => navigateTo(view as ProductView)}
        onToggleFocus={() => setFocusMode(!focusMode)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
};

export default App;
