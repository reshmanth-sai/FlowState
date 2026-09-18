/**
 * Flowstate Background Service Worker (Manifest V3).
 * Sole owner of session lifecycle, discovery, and backend communication.
 */

import { FLOWSTATE_CONFIG, isSupportedDomain } from '../shared/constants.js';
import { FlowstateApiClient } from '../shared/api.js';

const apiClient = new FlowstateApiClient();

let activeSessionId = null;
let isMonitoring = true;
let lastBackendError = null;

// Initialize session state from storage
chrome.storage.local.get([FLOWSTATE_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_ID], (res) => {
  if (res[FLOWSTATE_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_ID]) {
    activeSessionId = res[FLOWSTATE_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_ID];
    console.log('[Flowstate Worker] Restored active session:', activeSessionId);
  } else {
    // Attempt discovery of any running Flowstate session
    discoverActiveSession();
  }
});

async function discoverActiveSession() {
  try {
    const sessions = await apiClient.getActiveSessions();
    const running = sessions.find((s) => s.status === 'RUNNING');
    if (running) {
      activeSessionId = running.id;
      chrome.storage.local.set({ [FLOWSTATE_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_ID]: activeSessionId });
      console.log('[Flowstate Worker] Discovered running session:', activeSessionId);
      broadcastStatus();
      return activeSessionId;
    }
  } catch (err) {
    lastBackendError = err.message;
    console.warn('[Flowstate Worker] Discovery check failed:', err.message);
  }
  return null;
}

async function ensureSession(autoCreate = false) {
  if (activeSessionId) {
    const s = await apiClient.getSession(activeSessionId);
    if (s && s.status === 'RUNNING') {
      return activeSessionId;
    }
    // Stale or stopped session
    activeSessionId = null;
    chrome.storage.local.remove([FLOWSTATE_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_ID]);
    broadcastStatus();
  }
  const discovered = await discoverActiveSession();
  if (discovered) return discovered;

  if (autoCreate) {
    try {
      const health = await apiClient.getHealth();
      if (health) {
        const newSession = await apiClient.createAndStartSession('browser_study_participant', {
          source: 'chrome_extension',
        });
        activeSessionId = newSession.id;
        chrome.storage.local.set({ [FLOWSTATE_CONFIG.STORAGE_KEYS.ACTIVE_SESSION_ID]: activeSessionId });
        console.log('[Flowstate Worker] Created new dedicated extension session:', activeSessionId);
        broadcastStatus();
        return activeSessionId;
      }
    } catch (err) {
      lastBackendError = err.message;
      console.warn('[Flowstate Worker] Backend unavailable for auto-session:', err.message);
    }
  }
  return null;
}

function broadcastStatus(tabId = null) {
  const payload = {
    type: FLOWSTATE_CONFIG.MESSAGES.STATUS_UPDATE,
    sessionId: activeSessionId,
    isMonitoring: isMonitoring && !!activeSessionId,
    lastError: lastBackendError,
  };

  if (tabId) {
    chrome.tabs.sendMessage(tabId, payload).catch(() => {});
  } else {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.sendMessage(tab.id, payload).catch(() => {});
      }
    });
  }
}

// Runtime message listener for content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case FLOWSTATE_CONFIG.MESSAGES.GET_STATUS:
      ensureSession(false).then((sid) => {
        sendResponse({
          sessionId: sid,
          isMonitoring: isMonitoring && !!sid,
          lastError: lastBackendError,
        });
      });
      return true; // Async response

    case 'START_EXTENSION_SESSION':
      ensureSession(true).then((sid) => {
        sendResponse({
          sessionId: sid,
          isMonitoring: isMonitoring && !!sid,
          lastError: lastBackendError,
        });
      });
      return true;

    case FLOWSTATE_CONFIG.MESSAGES.TELEMETRY_BATCH:
      // Privacy Guard: Enforce domain allowlist on sender tab
      if (sender && sender.url) {
        try {
          const senderHost = new URL(sender.url).hostname;
          if (!isSupportedDomain(senderHost)) {
            console.warn('[Flowstate Worker] Rejected telemetry from unauthorized domain:', senderHost);
            sendResponse({
              status: 'REJECTED_UNSUPPORTED_ORIGIN',
              message: `Telemetry collection unauthorized on ${senderHost}`,
            });
            return false;
          }
        } catch (e) {
          sendResponse({ status: 'REJECTED_INVALID_ORIGIN', message: 'Invalid sender origin' });
          return false;
        }
      }

      handleTelemetryBatch(message.payload)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ status: 'ERROR', message: err.message }));
      return true; // Async response

    case FLOWSTATE_CONFIG.MESSAGES.INTERVENTION_RESPONSE:
      apiClient.submitInterventionFeedback(message.interventionId, message.action)
        .then((res) => sendResponse({ status: 'OK', feedback: res }))
        .catch((err) => sendResponse({ status: 'ERROR', message: err.message }));
      return true;

    default:
      break;
  }
});

async function handleTelemetryBatch(payload) {
  const sessionId = await ensureSession();
  if (!sessionId) {
    return {
      status: 'BUFFERED_OFFLINE',
      message: 'No active Flowstate session or backend offline',
    };
  }

  try {
    const result = await apiClient.submitBrowserTelemetry(sessionId, payload);
    lastBackendError = null;
    return {
      status: 'SUCCESS',
      sessionId: sessionId,
      liveUpdate: result.live_update,
      latestInference: result.latest_inference,
      activeIntervention: result.active_intervention,
    };
  } catch (err) {
    lastBackendError = err.message;
    return {
      status: 'DISPATCH_ERROR',
      message: err.message,
    };
  }
}
