/**
 * Privacy-Preserving Behavioral Telemetry Collector.
 * Computes strictly mathematical and temporal aggregates locally.
 * Invariant: Never captures or stores character values, words, code, or DOM text.
 */

export class TelemetryCollector {
  constructor(options = {}) {
    this.pauseThresholdMs = options.pauseThresholdMs || 4000;
    this.isMonitoring = options.isMonitoring !== undefined ? Boolean(options.isMonitoring) : false;
    this.reset();
    this._isAttached = false;
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onScroll = this._handleScroll.bind(this);
    this._onVisibilityChange = this._handleVisibilityChange.bind(this);
  }

  setMonitoring(enabled) {
    const wasMonitoring = this.isMonitoring;
    this.isMonitoring = Boolean(enabled);
    if (!this.isMonitoring && wasMonitoring) {
      this.reset();
    }
  }

  reset(preserveInteractionTime = false) {
    this.windowStartTime = Date.now();
    if (!preserveInteractionTime) {
      this.lastInteractionTime = null;
    }
    this.keyIntervals = [];
    this.backspaceCount = 0;
    this.deleteCount = 0;
    this.pauseCount = 0;
    this.totalPauseDurationMs = 0;
    this.longestPauseDurationMs = 0;
    this.scrollEvents = 0;
    this.visibilityTransitions = 0;
    this.lastVisibilityChangeTime = Date.now();
    this.hiddenDurationMs = 0;
    this.codeRunCount = 0;
    this.lastErrorOutcome = false;
  }

  attach() {
    if (this._isAttached || typeof window === 'undefined') return;
    window.addEventListener('keydown', this._onKeyDown, { passive: true, capture: true });
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this._onKeyDown, { passive: true, capture: true });
    }
    window.addEventListener('scroll', this._onScroll, { passive: true });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._onVisibilityChange, { passive: true });
    }
    this._isAttached = true;
  }

  detach() {
    if (!this._isAttached || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this._onKeyDown, { capture: true });
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._onKeyDown, { capture: true });
    }
    window.removeEventListener('scroll', this._onScroll);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
    this._isAttached = false;
  }

  recordPause(durationMs) {
    if (!this.isMonitoring) return;
    this.pauseCount++;
    this.totalPauseDurationMs += durationMs;
    if (durationMs > this.longestPauseDurationMs) {
      this.longestPauseDurationMs = durationMs;
    }
  }

  _isSensitiveElement(element) {
    if (!element) return false;
    if (element.tagName === 'INPUT' && element.type === 'password') return true;
    if (element.getAttribute && element.getAttribute('data-private') === 'true') return true;
    return false;
  }

  _handleKeyDown(event) {
    // 0. Drop keystroke telemetry if monitoring is idle/inactive
    if (!this.isMonitoring) {
      return;
    }

    if (event._fsHandled) {
      return;
    }
    try {
      event._fsHandled = true;
    } catch (e) {}

    // 1. Shield sensitive password or private fields completely
    if (this._isSensitiveElement(event.target)) {
      return;
    }

    const now = Date.now();

    // 1. Check for pause/freeze before this keypress
    if (this.lastInteractionTime !== null) {
      const delta = now - this.lastInteractionTime;
      if (delta >= this.pauseThresholdMs) {
        this.recordPause(delta);
      } else if (delta >= 10 && delta <= 3000) {
        // Natural inter-key interval between 10ms and 3000ms
        this.keyIntervals.push(delta);
      }
    }

    // 2. Count editing keys without capturing character data
    if (event.key === 'Backspace') {
      this.backspaceCount++;
    } else if (event.key === 'Delete') {
      this.deleteCount++;
    }

    this.lastInteractionTime = now;
  }

  _handleScroll() {
    if (!this.isMonitoring) return;
    this.scrollEvents++;
    this.lastInteractionTime = Date.now();
  }

  _handleVisibilityChange() {
    if (!this.isMonitoring) return;
    const now = Date.now();
    this.visibilityTransitions++;
    if (document.hidden) {
      this.lastVisibilityChangeTime = now;
    } else {
      const hiddenDelta = now - this.lastVisibilityChangeTime;
      this.hiddenDurationMs += Math.max(0, hiddenDelta);
      this.lastVisibilityChangeTime = now;
    }
  }

  recordCodeRun(isError = false) {
    if (!this.isMonitoring) return;
    this.codeRunCount++;
    if (isError) {
      this.lastErrorOutcome = true;
    }
  }

  harvest(activeContext = {}) {
    if (!this.isMonitoring) {
      return null;
    }
    const now = Date.now();
    const totalActiveWindowSeconds = Math.max(1.0, (now - this.windowStartTime) / 1000.0);

    // Check for ongoing trailing pause prior to harvest (within active session window)
    if (this.lastInteractionTime !== null) {
      const delta = now - this.lastInteractionTime;
      if (delta >= this.pauseThresholdMs && delta < 300000) {
        this.recordPause(delta);
        this.lastInteractionTime = now;
      }
    }

    // Compute inter-key interval stats
    let meanInterval = null;
    let stdInterval = null;

    if (this.keyIntervals.length > 0) {
      const sum = this.keyIntervals.reduce((acc, v) => acc + v, 0);
      meanInterval = Math.round(sum / this.keyIntervals.length);

      if (this.keyIntervals.length > 1) {
        const variance = this.keyIntervals.reduce((acc, v) => acc + Math.pow(v - meanInterval, 2), 0) / (this.keyIntervals.length - 1);
        stdInterval = Math.round(Math.sqrt(variance));
      } else {
        stdInterval = 0;
      }
    }

    // Synchronize activity with context if available
    const contextActivity = activeContext.activity || (activeContext.context && activeContext.context.activity) || {};
    const effectiveCodeRuns = Math.max(this.codeRunCount, contextActivity.code_run_count || 0);

    // Estimate error rate from backspace ratio or code run errors
    let errorRate = 0.0;
    const totalKeys = this.keyIntervals.length + this.backspaceCount + this.deleteCount;
    if (totalKeys > 10) {
      const backspaceRatio = (this.backspaceCount + this.deleteCount) / totalKeys;
      errorRate = Math.min(1.0, Math.round(backspaceRatio * 1.5 * 100) / 100);
    }
    const lastOutcome = contextActivity.last_outcome;
    if (this.lastErrorOutcome || lastOutcome === 'WRONG_ANSWER' || lastOutcome === 'RUNTIME_ERROR' || lastOutcome === 'TIME_LIMIT_EXCEEDED') {
      errorRate = Math.max(errorRate, 0.4);
    }

    const behavior = {
      typing_interval_mean_ms: meanInterval,
      typing_interval_std_ms: stdInterval,
      backspace_count: this.backspaceCount,
      delete_count: this.deleteCount,
      pause_count: this.pauseCount,
      pause_duration_seconds: Math.round((this.totalPauseDurationMs / 1000.0) * 10) / 10,
      active_time_seconds: Math.round(totalActiveWindowSeconds),
      code_run_count: effectiveCodeRuns,
      error_rate: errorRate,
      scroll_count: this.scrollEvents,
      visibility_changes: this.visibilityTransitions,
      hidden_time_seconds: Math.round((this.hiddenDurationMs / 1000.0) * 10) / 10,
      longest_pause_seconds: Math.round((this.longestPauseDurationMs / 1000.0) * 10) / 10,
    };

    const context = activeContext.context || (activeContext.context_schema_version ? activeContext : {
      context_schema_version: '1.0.0',
      platform: activeContext.platform || 'generic',
      task: {
        type: 'web_interaction',
        difficulty: null,
        difficulty_scalar: activeContext.difficulty !== undefined ? activeContext.difficulty : 1.0,
        title: activeContext.page_title || 'Browser Session',
        language: null,
      },
      activity: {
        active_time_seconds: Math.round(totalActiveWindowSeconds),
        submission_count: 0,
        code_run_count: effectiveCodeRuns,
        failure_count: 0,
        last_outcome: null,
      },
    });

    if (context && context.activity) {
      context.activity.code_run_count = effectiveCodeRuns;
    }

    const payload = {
      source_type: 'COMPUTER_BEHAVIOR',
      behavior,
      context,
      // Legacy flat fields for backward compatibility with existing backend endpoints
      platform: activeContext.platform || 'generic',
      page_title: activeContext.page_title || (typeof document !== 'undefined' ? document.title : 'Browser Session'),
      difficulty: activeContext.difficulty !== undefined ? activeContext.difficulty : 1.0,
      typing_interval_mean_ms: meanInterval,
      typing_interval_std_ms: stdInterval,
      backspace_count: this.backspaceCount,
      delete_count: this.deleteCount,
      pause_count: this.pauseCount,
      pause_duration_seconds: Math.round((this.totalPauseDurationMs / 1000.0) * 10) / 10,
      active_time_seconds: Math.round(totalActiveWindowSeconds),
      code_run_count: effectiveCodeRuns,
      error_rate: errorRate,
      metadata: {
        longest_pause_seconds: Math.round((this.longestPauseDurationMs / 1000.0) * 10) / 10,
        scroll_count: this.scrollEvents,
        visibility_changes: this.visibilityTransitions,
        hidden_time_seconds: Math.round((this.hiddenDurationMs / 1000.0) * 10) / 10,
        ...activeContext.metadata,
      }
    };

    // Reset accumulators for next interval while preserving continuous interaction timestamp
    this.reset(true);
    return payload;
  }
}
