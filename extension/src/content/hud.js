/**
 * Flowstate Minimal Ambient Floating HUD
 * Encapsulated inside an isolated ShadowRoot to prevent CSS collisions on host sites.
 * Supports 6 ambient states: CONNECTED, GATHERING, ESTIMATE AVAILABLE, LIMITED QUALITY, PAUSED, DISCONNECTED.
 */

export class FlowstateHud {
  constructor(options = {}) {
    this.onInterventionResponse = options.onInterventionResponse || (() => {});
    this.onToggleSession = options.onToggleSession || (() => {});
    this.isExpanded = false;
    this.isMonitoring = false;
    this.isPaused = false;
    this.isGathering = false;
    this.currentInference = null;
    this.activeIntervention = null;
    this.isBreakActive = false;
    this.breakCountdown = 30;
    this.breathPhase = 'inhale';
    this.sessionId = null;
    this.currentContext = null;
    this.explicitState = null;

    this._mount();
  }

  _mount() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('flowstate-hud-host')) return;

    this.host = document.createElement('div');
    this.host.id = 'flowstate-hud-host';
    document.body.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'open' });
    this._injectStyles();
    this._render();
  }

  _injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #f1f5f9;
        z-index: 2147483647;
        position: fixed;
        bottom: 18px;
        right: 18px;
        pointer-events: auto;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      .fs-hud-container {
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(129, 140, 248, 0.12);
        overflow: hidden;
        user-select: none;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }
      
      /* Minimal Collapsed Pill */
      .fs-hud-pill {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 13px;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .fs-hud-pill:hover {
        background: rgba(255, 255, 255, 0.06);
      }
      
      .fs-pulse-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
        transition: all 0.2s ease;
      }
      .fs-pulse-dot.idle, .fs-pulse-dot.disconnected {
        background: #64748b;
        box-shadow: none;
      }
      .fs-pulse-dot.gathering {
        background: #06b6d4;
        box-shadow: 0 0 8px #06b6d4;
        animation: fs-pulse-glow 1.5s infinite;
      }
      .fs-pulse-dot.limited, .fs-pulse-dot.alert {
        background: #f59e0b;
        box-shadow: 0 0 10px #f59e0b;
      }
      .fs-pulse-dot.paused {
        background: #94a3b8;
        box-shadow: 0 0 6px #94a3b8;
      }
      
      @keyframes fs-pulse-glow {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.85); }
      }
      
      .fs-pill-brand {
        font-weight: 800;
        font-size: 10.5px;
        letter-spacing: 0.08em;
        color: #818cf8;
      }
      .fs-pill-status {
        font-size: 10.5px;
        color: #94a3b8;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      
      /* Expanded Card */
      .fs-hud-card {
        width: 285px;
        padding: 13px;
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .fs-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 7px;
      }
      .fs-card-title {
        font-weight: 700;
        font-size: 11.5px;
        color: #f8fafc;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .fs-btn-icon {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 13px;
        padding: 2px 5px;
        border-radius: 4px;
        transition: all 0.15s;
      }
      .fs-btn-icon:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }
      
      /* Task Context */
      .fs-task-context-box {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 7px;
        padding: 7px 9px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .fs-task-platform, .fs-context-platform {
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #818cf8;
        text-transform: uppercase;
      }
      .fs-context-meta {
        font-size: 10.5px;
        color: #cbd5e1;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .fs-diff-tag {
        font-size: 9px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 3px;
        text-transform: capitalize;
      }
      .fs-diff-tag.easy { background: rgba(16, 185, 129, 0.2); color: #34d399; }
      .fs-diff-tag.medium { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
      .fs-diff-tag.hard { background: rgba(239, 68, 68, 0.2); color: #f87171; }
      
      /* Metrics */
      .fs-metrics-grid {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .fs-metric-row {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .fs-metric-labels {
        display: flex;
        justify-content: space-between;
        font-size: 10.5px;
        color: #cbd5e1;
      }
      .fs-metric-track {
        height: 5px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        overflow: hidden;
      }
      .fs-metric-bar {
        height: 100%;
        border-radius: 3px;
        transition: width 0.4s ease;
      }
      
      /* Footer */
      .fs-hud-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9.5px;
        color: #64748b;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 7px;
      }
      .fs-gate-badge {
        font-weight: 700;
        padding: 1.5px 5px;
        border-radius: 3px;
        font-size: 9px;
      }
      .fs-gate-badge.PASS { background: rgba(16, 185, 129, 0.2); color: #34d399; }
      .fs-gate-badge.DEGRADED { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
      .fs-gate-badge.INSUFFICIENT { background: rgba(239, 68, 68, 0.2); color: #f87171; }
      
      /* Adaptation / Intervention Alert */
      .fs-intervention-alert {
        background: rgba(245, 158, 11, 0.12);
        border: 1px solid rgba(245, 158, 11, 0.4);
        border-radius: 7px;
        padding: 9px;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .fs-intervention-title {
        font-size: 10.5px;
        font-weight: 800;
        color: #fcd34d;
      }
      .fs-intervention-reason {
        font-size: 10px;
        color: #e2e8f0;
        line-height: 1.35;
      }
      .fs-btn-row {
        display: flex;
        gap: 5px;
        margin-top: 3px;
      }
      .fs-btn {
        flex: 1;
        padding: 5px 8px;
        font-size: 9.5px;
        font-weight: 700;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .fs-btn:hover { opacity: 0.9; }
      .fs-btn.primary { background: #f59e0b; color: #0f172a; }
      .fs-btn.secondary { background: rgba(255, 255, 255, 0.1); color: #f1f5f9; }
      
      .fs-breath-guide {
        background: rgba(6, 182, 212, 0.15);
        border: 1px solid #06b6d4;
        border-radius: 7px;
        padding: 10px;
        text-align: center;
      }
    `;
    this.shadow.appendChild(style);
  }

  setSession(sessionId) {
    this.sessionId = sessionId;
    this._render();
  }

  setContext(context) {
    this.currentContext = context;
    this._render();
  }

  setMonitoring(isMonitoring) {
    this.isMonitoring = isMonitoring;
    this._render();
  }

  setGathering(isGathering) {
    this.isGathering = isGathering;
    this._render();
  }

  setPaused(isPaused) {
    this.isPaused = isPaused;
    this._render();
  }

  setStatus(statusName) {
    this.explicitState = statusName;
    this._render();
  }

  updateState(inference, activeIntervention) {
    this.currentInference = inference;
    if (activeIntervention && (activeIntervention.status === 'OFFERED' || activeIntervention.status === 'APPLIED')) {
      this.activeIntervention = activeIntervention;
    } else if (!activeIntervention) {
      this.activeIntervention = null;
    }
    this._render();
  }

  /**
   * Determine one of the 6 canonical ambient states:
   * 1. DISCONNECTED
   * 2. PAUSED
   * 3. LIMITED QUALITY
   * 4. GATHERING
   * 5. ESTIMATE AVAILABLE
   * 6. CONNECTED
   */
  _getCurrentAmbientState() {
    if (this.explicitState) return this.explicitState;
    if (!this.sessionId || !this.isMonitoring) {
      return 'DISCONNECTED';
    }
    if (this.isPaused) {
      return 'PAUSED';
    }
    if (this.activeIntervention && this.activeIntervention.status === 'OFFERED') {
      return 'ADAPTATION OFFERED';
    }
    if (this.currentInference) {
      if (this.currentInference.quality_gate === 'DEGRADED' || this.currentInference.quality_gate === 'INSUFFICIENT') {
        return 'LIMITED QUALITY';
      }
      return 'ESTIMATE AVAILABLE';
    }
    if (this.isGathering) {
      return 'GATHERING';
    }
    return 'CONNECTED';
  }

  _render() {
    let container = this.shadow.querySelector('.fs-hud-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'fs-hud-container';
      this.shadow.appendChild(container);
    }

    const state = this._getCurrentAmbientState();

    if (!this.isExpanded) {
      // Collapsed Pill View
      let dotClass = '';
      if (state === 'DISCONNECTED') dotClass = 'disconnected';
      else if (state === 'PAUSED') dotClass = 'paused';
      else if (state === 'LIMITED QUALITY' || state === 'ADAPTATION OFFERED') dotClass = 'alert';
      else if (state === 'GATHERING') dotClass = 'gathering';
      else dotClass = '';

      container.innerHTML = `
        <div class="fs-hud-pill">
          <div class="fs-pulse-dot ${dotClass}"></div>
          <span class="fs-pill-brand">FLOWSTATE</span>
          <span class="fs-pill-status">${state}</span>
        </div>
      `;

      container.querySelector('.fs-hud-pill').onclick = () => {
        this.isExpanded = true;
        this._render();
      };
    } else {
      // Expanded Card View
      const inf = this.currentInference;
      const wlVal = inf ? Math.round(inf.workload.value * 100) : 45;
      const ftVal = inf ? Math.round(inf.fatigue.value * 100) : 30;
      const egVal = inf ? Math.round(inf.engagement.value * 100) : 75;
      const gate = inf ? inf.quality_gate : 'PASS';

      let alertHtml = '';
      if (this.isBreakActive) {
        alertHtml = `
          <div class="fs-breath-guide">
            <div style="font-weight: 700; color: #67e8f9; font-size: 11px;">RECOVERY PAUSE</div>
            <div style="font-size: 17px; font-weight: 800; margin: 4px 0; color: white;">${this.breakCountdown}s</div>
            <div style="font-size: 9.5px; color: #cbd5e1;">Box Breathing: Inhale 4s • Hold 4s • Exhale 4s</div>
          </div>
        `;
      } else if (this.activeIntervention) {
        const isApplied = this.activeIntervention.status === 'APPLIED';
        alertHtml = `
          <div class="fs-intervention-alert">
            <div class="fs-intervention-title">⚠️ ${this.activeIntervention.action}</div>
            <div class="fs-intervention-reason">${this.activeIntervention.reason}</div>
            <div class="fs-btn-row">
              <button class="fs-btn primary" id="fs-accept-btn">${isApplied ? 'Return to normal' : 'Accept'}</button>
              <button class="fs-btn secondary" id="fs-dismiss-btn">Dismiss</button>
            </div>
          </div>
        `;
      }

      // Task Context Box
      let contextHtml = '';
      if (this.currentContext) {
        const ctx = this.currentContext.context || this.currentContext;
        const platform = (ctx.platform || 'Browser').toUpperCase();
        const taskObj = ctx.task || {};
        const title = taskObj.title || ctx.page_title || 'Active Task';
        const diffText = taskObj.difficulty || (ctx.metadata ? ctx.metadata.difficulty_context : null);
        const diffScalar = taskObj.difficulty_scalar !== undefined ? taskObj.difficulty_scalar : ctx.difficulty;
        const lang = taskObj.language || (ctx.metadata ? ctx.metadata.language : null);

        let diffBadge = '';
        if (diffText) {
          diffBadge = `<span class="fs-diff-tag ${diffText}">${diffText} (${diffScalar || 1.0})</span>`;
        }

        contextHtml = `
          <div class="fs-task-context-box">
            <div class="fs-task-platform fs-context-platform">${platform}</div>
            <div class="fs-context-meta">
              <span style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 155px;">${title}</span>
              ${diffBadge}
              ${lang ? `<span style="color: #94a3b8; font-size: 9.5px;">${lang}</span>` : ''}
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="fs-hud-card">
          <div class="fs-card-header">
            <span class="fs-card-title">⚡ Flowstate Live Monitor</span>
            <button class="fs-btn-icon" id="fs-collapse-btn">✕</button>
          </div>

          ${contextHtml}
          ${alertHtml}

          <div class="fs-metrics-grid">
            <div class="fs-metric-row">
              <div class="fs-metric-labels">
                <span>Estimated Workload</span>
                <strong>${wlVal}%</strong>
              </div>
              <div class="fs-metric-track">
                <div class="fs-metric-bar" style="width: ${wlVal}%; background: linear-gradient(90deg, #6366f1, #f43f5e);"></div>
              </div>
            </div>

            <div class="fs-metric-row">
              <div class="fs-metric-labels">
                <span>Estimated Fatigue</span>
                <strong>${ftVal}%</strong>
              </div>
              <div class="fs-metric-track">
                <div class="fs-metric-bar" style="width: ${ftVal}%; background: linear-gradient(90deg, #3b82f6, #f59e0b);"></div>
              </div>
            </div>

            <div class="fs-metric-row">
              <div class="fs-metric-labels">
                <span>Estimated Engagement</span>
                <strong>${egVal}%</strong>
              </div>
              <div class="fs-metric-track">
                <div class="fs-metric-bar" style="width: ${egVal}%; background: linear-gradient(90deg, #6366f1, #10b981);"></div>
              </div>
            </div>
          </div>

          <div class="fs-hud-footer">
            <span>Session: ${this.sessionId ? this.sessionId.slice(0, 10) : 'None'}</span>
            <span class="fs-gate-badge ${gate}">GATE: ${gate}</span>
          </div>
        </div>
      `;

      // Event handlers
      container.querySelector('#fs-collapse-btn').onclick = () => {
        this.isExpanded = false;
        this._render();
      };

      const acceptBtn = container.querySelector('#fs-accept-btn');
      if (acceptBtn) {
        acceptBtn.onclick = () => {
          if (!this.activeIntervention) return;
          const action = this.activeIntervention.action;
          const id = this.activeIntervention.intervention_id;
          const isApplied = this.activeIntervention.status === 'APPLIED';
          
          if (isApplied) {
            // Return to normal
            this.onInterventionResponse(id, 'RESET');
            this.activeIntervention = null;
            this._render();
          } else {
            this.onInterventionResponse(id, 'ACCEPTED');
            if (action === 'SUGGEST_SHORT_BREAK') {
              this._startBreakCountdown(30);
            } else {
              this.activeIntervention = null;
              this._render();
            }
          }
        };
      }

      const dismissBtn = container.querySelector('#fs-dismiss-btn');
      if (dismissBtn) {
        dismissBtn.onclick = () => {
          if (!this.activeIntervention) return;
          const id = this.activeIntervention.intervention_id;
          this.onInterventionResponse(id, 'DISMISSED');
          this.activeIntervention = null;
          this._render();
        };
      }
    }
  }

  _startBreakCountdown(duration = 30) {
    this.isBreakActive = true;
    this.breakCountdown = duration;
    this.activeIntervention = null;
    this._render();

    const timer = setInterval(() => {
      this.breakCountdown--;
      if (this.breakCountdown <= 0) {
        clearInterval(timer);
        this.isBreakActive = false;
        this._render();
      } else {
        this._render();
      }
    }, 1000);
  }
}
