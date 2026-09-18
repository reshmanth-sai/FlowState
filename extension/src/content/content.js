/**
 * Flowstate Content Script Orchestrator.
 * Connects TelemetryCollector, ContextManager, and FlowstateHud.
 */

import { FLOWSTATE_CONFIG, isSupportedDomain } from '../shared/constants.js';
import { TelemetryCollector } from './telemetry.js';
import { ContextManager } from './context.js';
import { FlowstateHud } from './hud.js';

(function initFlowstateContent() {
  const hostname = window.location ? window.location.hostname : '';
  
  // Strict Domain Allowlist: Never run or inject HUD on unsupported sites
  if (!isSupportedDomain(hostname)) {
    console.log('[Flowstate] Unsupported domain, content script execution aborted:', hostname);
    return;
  }

  console.log('[Flowstate] Injected into supported domain:', hostname);

  let activeSessionId = null;
  let isMonitoring = false;

  // Initialize HUD only on authorized, supported domain
  const hud = new FlowstateHud({
    onInterventionResponse: (interventionId, userAction) => {
      chrome.runtime.sendMessage({
        type: FLOWSTATE_CONFIG.MESSAGES.INTERVENTION_RESPONSE,
        interventionId,
        action: userAction,
      });
    },
  });

  const contextManager = new ContextManager({
    onTaskTransition: (freshContext, oldUrl, newUrl) => {
      console.log('[Flowstate Content] SPA Task Transition detected:', oldUrl, '->', newUrl);
      hud.setContext(freshContext);
      telemetryCollector.reset(); // Reset window so Problem A metrics never leak into Problem B
    },
  });

  const telemetryCollector = new TelemetryCollector({
    pauseThresholdMs: FLOWSTATE_CONFIG.PAUSE_THRESHOLD_MS,
    isMonitoring: false, // Default to idle until session is confirmed
  });

  // Prime HUD with initial page context
  hud.setContext(contextManager.getActiveContext());

  // Attach passive telemetry listeners (collector will drop events while isMonitoring is false)
  telemetryCollector.attach();

  // Query service worker for current session state
  chrome.runtime.sendMessage({ type: FLOWSTATE_CONFIG.MESSAGES.GET_STATUS }, (res) => {
    if (res && res.sessionId) {
      activeSessionId = res.sessionId;
      isMonitoring = !!res.isMonitoring;
      hud.setSession(activeSessionId);
      hud.setMonitoring(isMonitoring);
      telemetryCollector.setMonitoring(isMonitoring);
    } else {
      isMonitoring = false;
      hud.setMonitoring(false);
      telemetryCollector.setMonitoring(false);
    }
  });

  // Listen for broadcast updates from worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === FLOWSTATE_CONFIG.MESSAGES.STATUS_UPDATE) {
      activeSessionId = message.sessionId;
      isMonitoring = !!(message.isMonitoring && activeSessionId);
      hud.setSession(activeSessionId);
      hud.setMonitoring(isMonitoring);
      telemetryCollector.setMonitoring(isMonitoring);
    }
  });

  // Periodic Telemetry Harvest & Dispatch (every 15s)
  setInterval(async () => {
    // Dormant Idle Invariant: Never harvest or transmit when monitoring is inactive
    if (!activeSessionId || !isMonitoring) {
      return;
    }

    const context = contextManager.getActiveContext();
    hud.setContext(context);
    const telemetryBatch = telemetryCollector.harvest(context);
    if (!telemetryBatch) {
      return;
    }

    // Send aggregate batch to background worker
    try {
      chrome.runtime.sendMessage(
        {
          type: FLOWSTATE_CONFIG.MESSAGES.TELEMETRY_BATCH,
          payload: telemetryBatch,
        },
        (response) => {
          if (response && response.status === 'SUCCESS') {
            if (response.sessionId && response.sessionId !== activeSessionId) {
              activeSessionId = response.sessionId;
              hud.setSession(activeSessionId);
            }
            isMonitoring = true;
            hud.setMonitoring(true);
            telemetryCollector.setMonitoring(true);

            // Update HUD with authoritative backend results
            if (response.latestInference) {
              hud.updateState(response.latestInference, response.activeIntervention);
            }
          } else if (response && response.status === 'BUFFERED_OFFLINE') {
            isMonitoring = false;
            hud.setMonitoring(false);
            telemetryCollector.setMonitoring(false);
          }
        }
      );
    } catch (err) {
      console.warn('[Flowstate Content] Dispatch error:', err);
    }
  }, FLOWSTATE_CONFIG.BATCH_INTERVAL_MS);
})();
