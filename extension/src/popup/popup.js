import { FLOWSTATE_CONFIG } from '../shared/constants.js';

const API_BASE = FLOWSTATE_CONFIG.DEFAULT_API_BASE;

document.addEventListener('DOMContentLoaded', async () => {
  const badgeEl = document.getElementById('fs-connection-badge');
  const sessionEl = document.getElementById('fs-session-id');
  const taskEl = document.getElementById('fs-task-name');
  const monitorStatusEl = document.getElementById('fs-monitoring-status');
  const wlValEl = document.getElementById('fs-workload-val');
  const wlBarEl = document.getElementById('fs-workload-bar');
  const ftValEl = document.getElementById('fs-fatigue-val');
  const ftBarEl = document.getElementById('fs-fatigue-bar');
  const toggleBtn = document.getElementById('fs-btn-toggle-monitor');

  let activeSessionId = null;
  let isMonitoring = true;

  // 1. Check Backend Health
  try {
    const res = await fetch(`${API_BASE}/system/status`);
    if (res.ok) {
      badgeEl.textContent = 'ONLINE';
      badgeEl.className = 'fs-badge operational';
    } else {
      badgeEl.textContent = 'ERROR';
      badgeEl.className = 'fs-badge disconnected';
    }
  } catch (e) {
    badgeEl.textContent = 'OFFLINE';
    badgeEl.className = 'fs-badge disconnected';
  }

  // 2. Query Background Worker for Active Session
  chrome.runtime.sendMessage({ type: FLOWSTATE_CONFIG.MESSAGES.GET_STATUS }, async (status) => {
    if (status && status.sessionId) {
      activeSessionId = status.sessionId;
      isMonitoring = !!status.isMonitoring;
      sessionEl.textContent = activeSessionId.slice(0, 14) + '...';
      monitorStatusEl.textContent = isMonitoring ? 'Active' : 'Paused';
      monitorStatusEl.style.color = isMonitoring ? '#10b981' : '#f59e0b';
      toggleBtn.textContent = isMonitoring ? 'Pause Monitoring' : 'Resume Monitoring';

      // 3. Fetch latest live state for gauges
      try {
        const liveRes = await fetch(`${API_BASE}/tasks/${activeSessionId}/live-state`);
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (liveData.context && liveData.context.task) {
            taskEl.textContent = liveData.context.task;
          }
          if (liveData.estimate) {
            const wl = Math.round(liveData.estimate.workload_value * 100);
            const ft = Math.round(liveData.estimate.fatigue_value * 100);
            wlValEl.textContent = `${wl}%`;
            wlBarEl.style.width = `${wl}%`;
            ftValEl.textContent = `${ft}%`;
            ftBarEl.style.width = `${ft}%`;
          }
        }
      } catch (e) {
        console.warn('Live state fetch failed:', e);
      }
    } else {
      sessionEl.textContent = 'No running session';
      taskEl.textContent = 'Awaiting web app';
      monitorStatusEl.textContent = 'Idle';
      monitorStatusEl.style.color = '#94a3b8';
      toggleBtn.disabled = true;
    }
  });

  // 4. Toggle Monitoring Button
  toggleBtn.addEventListener('click', () => {
    if (!activeSessionId) return;
    isMonitoring = !isMonitoring;
    chrome.runtime.sendMessage({
      type: isMonitoring ? FLOWSTATE_CONFIG.MESSAGES.START_SESSION : FLOWSTATE_CONFIG.MESSAGES.STOP_SESSION,
    }, () => {
      monitorStatusEl.textContent = isMonitoring ? 'Active' : 'Paused';
      monitorStatusEl.style.color = isMonitoring ? '#10b981' : '#f59e0b';
      toggleBtn.textContent = isMonitoring ? 'Pause Monitoring' : 'Resume Monitoring';
    });
  });
});
