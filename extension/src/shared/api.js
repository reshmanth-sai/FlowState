/**
 * Flowstate Backend API Client for Service Worker.
 * Communicates with FastAPI backend on http://localhost:8000.
 */

import { FLOWSTATE_CONFIG } from './constants.js';
import { validateTelemetryPayload } from './schemas.js';

export class FlowstateApiClient {
  constructor(baseUrl = FLOWSTATE_CONFIG.DEFAULT_API_BASE) {
    this.baseUrl = baseUrl;
  }

  async getHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/system/status`, { method: 'GET' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getSession(sessionId) {
    try {
      const res = await fetch(`${this.baseUrl}/sessions/${sessionId}`, { method: 'GET' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getActiveSessions() {
    try {
      const res = await fetch(`${this.baseUrl}/sessions?limit=20`, { method: 'GET' });
      if (!res.ok) return [];
      const sessions = await res.json();
      return sessions.filter((s) => s.status === 'RUNNING' || s.status === 'CREATED');
    } catch (err) {
      console.warn('[Flowstate API] Failed to fetch sessions:', err);
      return [];
    }
  }

  async createAndStartSession(participantKey = 'browser_extension_user', metadata = {}) {
    try {
      const createRes = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_key: participantKey,
          task_id: 'browser_exploration',
          mode: 'SIMULATED',
          metadata: { ...metadata, origin: 'chrome_extension' },
        }),
      });
      if (!createRes.ok) throw new Error(`Create session failed: ${createRes.statusText}`);
      const session = await createRes.json();

      const startRes = await fetch(`${this.baseUrl}/sessions/${session.id}/start`, {
        method: 'POST',
      });
      if (!startRes.ok) throw new Error(`Start session failed: ${startRes.statusText}`);
      return await startRes.json();
    } catch (err) {
      console.error('[Flowstate API] Error creating session:', err);
      throw err;
    }
  }

  async submitBrowserTelemetry(sessionId, payload) {
    validateTelemetryPayload(payload);
    try {
      const res = await fetch(`${this.baseUrl}/tasks/${sessionId}/browser-telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Telemetry ingestion failed with HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('[Flowstate API] Telemetry dispatch error:', err);
      throw err;
    }
  }

  async submitInterventionFeedback(interventionId, userAction) {
    try {
      const res = await fetch(`${this.baseUrl}/interventions/${interventionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_action: userAction }),
      });
      if (!res.ok) throw new Error(`Feedback failed: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn('[Flowstate API] Feedback dispatch error:', err);
      throw err;
    }
  }
}
