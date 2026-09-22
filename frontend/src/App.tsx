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
  createLiveWebSocket,
  LiveSessionState,
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
        const savedSession = list.find((s) => s.id === savedId && s.status === 'RUNNING') || list.find((s) => s.id === savedId);

        // Find the latest active running session if any
        const latestRunningSession = list.find((s) => s.status === 'RUNNING');
        const targetSession = savedSession || latestRunningSession || list[0];

        if (targetSession) {
          setActiveSession(targetSession);
          localStorage.setItem('flowstate_selected_session', targetSession.id);
          window.postMessage({ type: 'FLOWSTATE_SET_ACTIVE_SESSION', sessionId: targetSession.id }, '*');
        } else {
          const sess = await api.createSession('browser_study_participant', 'SIMULATED');
          const started = await api.startSession(sess.id);
          setActiveSession(started);
          localStorage.setItem('flowstate_selected_session', started.id);
          setAvailableSessions([started]);
          window.postMessage({ type: 'FLOWSTATE_SET_ACTIVE_SESSION', sessionId: started.id }, '*');
        }
      } catch (err) {
        console.error('Failed to initialize app', err);
      }
    };
    initApp();
  }, []);

  // Broadcast active session updates to any injected extension scripts
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('flowstate_selected_session', activeSession.id);
      window.postMessage({ type: 'FLOWSTATE_SET_ACTIVE_SESSION', sessionId: activeSession.id }, '*');
    }
  }, [activeSession?.id]);

  // Live Streaming & Telemetry state
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('DISCONNECTED');
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  const [cadencePulse, setCadencePulse] = useState(false);
  const [currentLiveState, setCurrentLiveState] = useState<LiveSessionState | null>(null);

  // Poll timeline periodically for active session (dual-transport fallback)
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

  // Real-time WebSocket connection to backend live stream
  useEffect(() => {
    if (!activeSession) return;
    let pulseTimer: any = null;

    const cleanupWs = createLiveWebSocket(
      activeSession.id,
      (data) => {
        if (data.type === 'LIVE_SESSION_INIT' || data.type === 'LIVE_SESSION_UPDATE') {
          // Required Audit Debug Log
          console.log("[FLOWSTATE WS RAW]", JSON.stringify(data, null, 2));

          // Session Boundary Guard: ignore mismatched session events
          if (data.session_id && data.session_id !== activeSession.id) {
            return;
          }

          setCurrentLiveState(data);
          setLastLiveUpdate(new Date());

          // Trigger cadence pulse
          setCadencePulse(true);
          clearTimeout(pulseTimer);
          pulseTimer = setTimeout(() => setCadencePulse(false), 1200);

          if (data.latest_inference) {
            setInferences((prev) => {
              const idx = prev.findIndex((i) => i.inference_id === data.latest_inference.inference_id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = data.latest_inference;
                return copy;
              }
              return [...prev, data.latest_inference];
            });
          }
          if (data.latest_window) {
            setWindows((prev) => {
              const idx = prev.findIndex((w) => w.window_id === data.latest_window.window_id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = data.latest_window;
                return copy;
              }
              return [...prev, data.latest_window];
            });
          }
          if (data.latest_features) {
            setFeatures((prev) => {
              const idx = prev.findIndex((f) => f.window_id === data.latest_features.window_id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = data.latest_features;
                return copy;
              }
              return [...prev, data.latest_features];
            });
          }
          if (data.latest_decision && data.latest_decision.action !== 'NO_ACTION') {
            setInterventions((prev) => {
              const idx = prev.findIndex((d) => d.intervention_id === data.latest_decision.intervention_id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = data.latest_decision;
                return copy;
              }
              return [...prev, data.latest_decision];
            });
          }
        }
      },
      (status) => {
        setWsStatus(status);
      }
    );

    return () => {
      cleanupWs();
      clearTimeout(pulseTimer);
    };
  }, [activeSession]);

  // Log React state whenever currentLiveState updates
  useEffect(() => {
    if (currentLiveState) {
      console.log("[FLOWSTATE STATE]", JSON.stringify(currentLiveState, null, 2));
    }
  }, [currentLiveState]);

  useEffect(() => {
    if (!activeSession) return;
    refreshTimeline();
    // Dual transport: If WebSocket is connected, relax polling to 30s; if disconnected, poll every 5s
    const pollInterval = wsStatus === 'CONNECTED' ? 30000 : 5000;
    const interval = setInterval(refreshTimeline, pollInterval);
    return () => clearInterval(interval);
  }, [activeSession, wsStatus]);

  // Authoritative live derivation: Prefer latest real-time WebSocket state, fallback to timeline array
  const latestInference = currentLiveState?.latest_inference || (inferences.length > 0 ? inferences[inferences.length - 1] : null);
  const latestWindow = currentLiveState?.latest_window || (windows.length > 0 ? windows[windows.length - 1] : null);
  const latestFeatures = currentLiveState?.latest_features || (features.length > 0 ? features[features.length - 1] : null);
  const latestDecision = currentLiveState?.latest_decision || (interventions.length > 0 ? interventions[interventions.length - 1] : null);

  const handleStartNewSession = async () => {
    try {
      // 1. If an existing session is RUNNING, stop it
      if (activeSession && activeSession.status === 'RUNNING') {
        try {
          await api.stopSession(activeSession.id);
        } catch (e) {
          console.warn('Could not cleanly stop previous active session:', e);
        }
      }
      // Stop any other running sessions to guarantee ONLY ONE running session
      try {
        const existing = await api.getSessions(20);
        for (const s of existing) {
          if (s.status === 'RUNNING') {
            try {
              await api.stopSession(s.id);
            } catch (err) {
              console.warn(`Could not stop running session ${s.id}:`, err);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to query sessions to stop running ones:', e);
      }

      // 2. Create fresh session
      const sess = await api.createSession('browser_study_participant', 'SIMULATED');
      // 3. Start it
      const started = await api.startSession(sess.id);
      // 4. Set it as activeSession and update localStorage
      setActiveSession(started);
      localStorage.setItem('flowstate_selected_session', started.id);
      // 5. Relay FLOWSTATE_SET_ACTIVE_SESSION
      window.postMessage({ type: 'FLOWSTATE_SET_ACTIVE_SESSION', sessionId: started.id }, '*');
      // Clear previous timeline and inferences for clean slate
      setWindows([]);
      setFeatures([]);
      setInferences([]);
      setInterventions([]);
      setCurrentLiveState(null);
      // 6. Refresh session list
      await fetchSessions();
    } catch (err) {
      console.error('Failed to start new session', err);
    }
  };

  const handleEndSession = async () => {
    if (activeSession && activeSession.status === 'RUNNING') {
      try {
        const stopped = await api.stopSession(activeSession.id);
        setActiveSession(stopped);
        localStorage.removeItem('flowstate_selected_session');
        window.postMessage({ type: 'FLOWSTATE_SET_ACTIVE_SESSION', sessionId: null }, '*');
        await fetchSessions();
      } catch (err) {
        console.error('Failed to stop session', err);
      }
    }
    try {
      const existing = await api.getSessions(20);
      for (const s of existing) {
        if (s.status === 'RUNNING') {
          await api.stopSession(s.id).catch(() => {});
        }
      }
    } catch (e) {}
    navigateTo('history');
  };

  // Calculate duration from active session start time or aggregated windows
  const durationMinutes = windows.length > 0
    ? Math.max(1, Math.round((windows.length * 15) / 60))
    : (activeSession?.started_at
        ? Math.max(0, Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 60000))
        : 0);

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
    <div className="product-app-layout product-app-shell">
      {/* Universal Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(view) => navigateTo(view as ProductView)}
        onToggleFocus={() => setFocusMode((prev) => !prev)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Global Focus Mode Overlay */}
      <FocusModeOverlay
        isActive={focusMode}
        onExit={() => setFocusMode(false)}
        taskTitle={currentLiveState?.context?.task || activeSession?.metadata?.task_name || activeSession?.task_id || 'Active Focus Session'}
        durationMinutes={durationMinutes}
      />

      {/* Persistent Left Navigation Sidebar */}
      <AppSidebar
        currentView={currentView}
        onSelectView={navigateTo}
        activeSession={activeSession}
        durationMinutes={durationMinutes}
      />

      {/* Main Execution Bay */}
      <div className="product-main-bay" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', minWidth: 0 }}>
        {/* Top Product Header */}
        <AppHeader
          activeSession={activeSession}
          durationMinutes={durationMinutes}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode((prev) => !prev)}
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
              onStartNewSession={handleStartNewSession}
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
              wsStatus={wsStatus}
              lastLiveUpdate={lastLiveUpdate}
              cadencePulse={cadencePulse}
              liveState={currentLiveState}
              onTriggerDemoBurst={(elevated) => {
                if (activeSession) {
                  api.simulateLiveBurst(activeSession.id, elevated);
                }
              }}
              onBackToHome={() => navigateTo('home')}
              onNavigateToSignals={() => navigateTo('signals')}
              onNavigateToEvidence={() => navigateTo('evidence')}
              onEndSession={handleEndSession}
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
        taskTitle={currentLiveState?.context?.task || activeSession?.metadata?.task_name || activeSession?.task_id || 'Active Focus Session'}
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
