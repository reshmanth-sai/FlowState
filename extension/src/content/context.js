/**
 * Modular Webpage Context Intelligence System (Flowstate Phase 3B).
 * Hierarchy:
 *   BaseContextAdapter
 *     ├── GenericContextAdapter (Baseline fallback)
 *     ├── LeetCodeAdapter (Problem difficulty, language, runs, outcomes)
 *     └── GitHubAdapter (Code review & repository navigation stub)
 */

import { FLOWSTATE_CONFIG } from '../shared/constants.js';

/**
 * Sanitizes page titles by stripping query parameters, URL fragments,
 * and full URLs to prevent accidental transmission of tokens or sensitive identifiers.
 */
export function sanitizeTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return 'Web Interaction';
  let sanitized = rawTitle
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/\?[^\s]+/g, '')
    .replace(/#[^\s]+/g, '')
    .trim();
  return sanitized.slice(0, 100) || 'Web Interaction';
}

/**
 * Abstract Base Context Adapter defining the versioned context contract.
 */
export class BaseContextAdapter {
  constructor(platformName = 'generic') {
    this.platformName = platformName;
    this.taskStartTime = Date.now();
    this.codeRunCount = 0;
    this.submissionCount = 0;
    this.failureCount = 0;
    this.lastOutcome = null;
  }

  isMatching() {
    return false;
  }

  resetTaskContext() {
    this.taskStartTime = Date.now();
    this.codeRunCount = 0;
    this.submissionCount = 0;
    this.failureCount = 0;
    this.lastOutcome = null;
  }

  recordCodeRun() {
    this.codeRunCount++;
  }

  recordSubmission(outcome = null) {
    this.submissionCount++;
    if (outcome) {
      this.lastOutcome = outcome;
      if (outcome !== FLOWSTATE_CONFIG.OUTCOME_CATEGORIES.ACCEPTED) {
        this.failureCount++;
      }
    }
  }

  recordOutcome(outcome) {
    this.lastOutcome = outcome;
    if (outcome && outcome !== FLOWSTATE_CONFIG.OUTCOME_CATEGORIES.ACCEPTED) {
      this.failureCount++;
    }
  }

  recordFailure() {
    this.failureCount++;
  }

  getContext() {
    throw new Error('getContext() must be implemented by subclass');
  }
}

/**
 * Generic Context Adapter: Safe fallback for arbitrary supported pages.
 * Invariant: Never scrapes arbitrary text, HTML, DOM nodes, or query parameters.
 */
export class GenericContextAdapter extends BaseContextAdapter {
  constructor() {
    super('generic');
  }

  isMatching() {
    return true; // Always matches supported pages as fallback
  }

  getContext() {
    const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
    const rawTitle = typeof document !== 'undefined' ? document.title : '';
    const pageTitle = sanitizeTitle(rawTitle);
    const activeSeconds = Math.max(0, Math.round((Date.now() - this.taskStartTime) / 1000));

    const contextObj = {
      context_schema_version: FLOWSTATE_CONFIG.CONTEXT_SCHEMA_VERSION,
      platform: this.platformName,
      task: {
        type: 'web_interaction',
        difficulty: null,
        difficulty_scalar: 1.0,
        title: pageTitle,
        language: null,
      },
      activity: {
        active_time_seconds: activeSeconds,
        submission_count: this.submissionCount,
        code_run_count: this.codeRunCount,
        failure_count: this.failureCount,
        last_outcome: this.lastOutcome,
      },
    };

    return {
      ...contextObj,
      // Legacy flat fields for backward compatibility
      platform: this.platformName,
      hostname: hostname,
      page_title: pageTitle,
      difficulty: 1.0,
      metadata: {
        adapter: 'GenericContextAdapter',
      },
      context: contextObj,
    };
  }
}

/**
 * LeetCode Adapter: Robust, modular context extraction for LeetCode problem solving.
 * Observes task attributes (difficulty, title, language, runs, outcomes) without reading code.
 */
export class LeetCodeAdapter extends BaseContextAdapter {
  constructor() {
    super('leetcode');
    this._attachDomListeners();
  }

  isMatching() {
    if (typeof window === 'undefined' || !window.location) return false;
    return window.location.hostname.includes('leetcode.com');
  }

  _attachDomListeners() {
    if (typeof document === 'undefined') return;
    try {
      // Passive listener on button clicks to track run/submit attempts without reading editor code
      document.addEventListener(
        'click',
        (event) => {
          const target = event.target;
          if (!target) return;
          const text = (target.textContent || '').trim().toLowerCase();
          const btn = target.closest('button');
          const btnText = btn ? (btn.textContent || '').trim().toLowerCase() : text;

          if (btnText.includes('run') || (btn && btn.getAttribute('data-e2e-locator') === 'console-run-button')) {
            this.recordCodeRun();
          } else if (btnText.includes('submit') || (btn && btn.getAttribute('data-e2e-locator') === 'console-submit-button')) {
            this.recordSubmission();
          }
        },
        { passive: true, capture: true }
      );
    } catch (e) {
      // Graceful fallback if event listener fails
    }
  }

  _extractDifficulty() {
    if (typeof document === 'undefined') return { text: null, scalar: null };
    try {
      // Common LeetCode difficulty badge selectors
      const diffEl = document.querySelector(
        '[class*="difficulty"], [class*="text-olive"], [class*="text-yellow"], [class*="text-pink"], [data-degree]'
      );
      if (!diffEl) return { text: null, scalar: null };

      const text = (diffEl.textContent || '').trim().toLowerCase();
      if (text.includes('easy')) {
        return { text: 'easy', scalar: FLOWSTATE_CONFIG.DIFFICULTY_MAP.easy };
      }
      if (text.includes('medium')) {
        return { text: 'medium', scalar: FLOWSTATE_CONFIG.DIFFICULTY_MAP.medium };
      }
      if (text.includes('hard')) {
        return { text: 'hard', scalar: FLOWSTATE_CONFIG.DIFFICULTY_MAP.hard };
      }
    } catch {
      // Fallback
    }
    return { text: null, scalar: null };
  }

  _extractTitle() {
    if (typeof document === 'undefined') return 'LeetCode Problem';
    try {
      // First preference: In-page question title element (e.g. "15. 3Sum")
      const titleEl = document.querySelector('[data-cy="question-title"], .text-title-large, div[class*="title__"]');
      if (titleEl && titleEl.textContent) {
        const text = titleEl.textContent.trim();
        if (text) return sanitizeTitle(text);
      }

      // Fallback: document.title without brand suffix
      const docTitle = document.title || '';
      if (docTitle.includes('LeetCode')) {
        const titleMatch = docTitle.split('-')[0].split('–')[0].trim();
        if (titleMatch) return sanitizeTitle(titleMatch);
      }
    } catch {
      // Fallback
    }
    return 'LeetCode Problem';
  }

  _extractLanguage() {
    if (typeof document === 'undefined') return null;
    try {
      const langBtn = document.querySelector(
        '[id*="lang"], [class*="lang-btn"], button[aria-haspopup="listbox"], button[id*="headlessui-listbox-button"]'
      );
      if (langBtn) {
        const langText = (langBtn.textContent || '').trim().toLowerCase().slice(0, 20);
        if (langText && !langText.includes('\n')) {
          return langText;
        }
      }
    } catch {
      // Fallback
    }
    return null;
  }

  _extractLatestOutcome() {
    if (typeof document === 'undefined') return this.lastOutcome;
    try {
      // Check for outcome modal/badge without reading code
      const resultEl = document.querySelector(
        '[data-e2e-locator="submission-result"], [class*="result-status"], .text-green-s, .text-red-s'
      );
      if (resultEl) {
        const text = (resultEl.textContent || '').trim().toUpperCase();
        if (text.includes('ACCEPTED')) return FLOWSTATE_CONFIG.OUTCOME_CATEGORIES.ACCEPTED;
        if (text.includes('WRONG ANSWER')) return FLOWSTATE_CONFIG.OUTCOME_CATEGORIES.WRONG_ANSWER;
        if (text.includes('TIME LIMIT')) return FLOWSTATE_CONFIG.OUTCOME_CATEGORIES.TIME_LIMIT_EXCEEDED;
        if (text.includes('RUNTIME ERROR')) return FLOWSTATE_CONFIG.OUTCOME_CATEGORIES.RUNTIME_ERROR;
      }
    } catch {
      // Fallback
    }
    return this.lastOutcome;
  }

  getContext() {
    try {
      const { text: diffText, scalar: diffScalar } = this._extractDifficulty();
      const problemTitle = this._extractTitle();
      const language = this._extractLanguage();
      const outcome = this._extractLatestOutcome();
      if (outcome && outcome !== this.lastOutcome) {
        this.recordOutcome(outcome);
      }

      const activeSeconds = Math.max(0, Math.round((Date.now() - this.taskStartTime) / 1000));

      const contextObj = {
        context_schema_version: FLOWSTATE_CONFIG.CONTEXT_SCHEMA_VERSION,
        platform: this.platformName,
        task: {
          type: 'coding_problem',
          difficulty: diffText,
          difficulty_scalar: diffScalar, // Null if unobservable, 1.0/2.5/4.0 if present
          title: problemTitle,
          language: language,
        },
        activity: {
          active_time_seconds: activeSeconds,
          submission_count: this.submissionCount,
          code_run_count: this.codeRunCount,
          failure_count: this.failureCount,
          last_outcome: this.lastOutcome,
        },
      };

      return {
        ...contextObj,
        // Legacy flat fields for backward compatibility
        platform: this.platformName,
        hostname: typeof window !== 'undefined' && window.location ? window.location.hostname : 'leetcode.com',
        page_title: problemTitle,
        difficulty: diffScalar !== null ? diffScalar : 1.0,
        metadata: {
          adapter: 'LeetCodeAdapter',
          difficulty_context: diffText,
          language: language,
        },
        context: contextObj,
      };
    } catch (err) {
      console.warn('[Flowstate LeetCodeAdapter] Parsing error, degrading to generic fallback:', err);
      return new GenericContextAdapter().getContext();
    }
  }
}

/**
 * GitHub Adapter Stub: Reserved for future platform context intelligence.
 */
export class GitHubAdapter extends BaseContextAdapter {
  constructor() {
    super('github');
  }

  isMatching() {
    if (typeof window === 'undefined' || !window.location) return false;
    return window.location.hostname.includes('github.com');
  }

  getContext() {
    const rawTitle = typeof document !== 'undefined' ? document.title : '';
    const pageTitle = sanitizeTitle(rawTitle);
    const activeSeconds = Math.max(0, Math.round((Date.now() - this.taskStartTime) / 1000));

    const contextObj = {
      context_schema_version: FLOWSTATE_CONFIG.CONTEXT_SCHEMA_VERSION,
      platform: this.platformName,
      task: {
        type: 'code_collaboration',
        difficulty: null,
        difficulty_scalar: 1.0,
        title: pageTitle,
        language: null,
      },
      activity: {
        active_time_seconds: activeSeconds,
        submission_count: 0,
        code_run_count: 0,
        failure_count: 0,
        last_outcome: null,
      },
    };

    return {
      ...contextObj,
      platform: this.platformName,
      hostname: typeof window !== 'undefined' && window.location ? window.location.hostname : 'github.com',
      page_title: pageTitle,
      difficulty: 1.0,
      metadata: {
        adapter: 'GitHubAdapter',
      },
      context: contextObj,
    };
  }
}

/**
 * Context Manager: Orchestrates modular adapters and handles SPA task navigation lifecycle.
 */
export class ContextManager {
  constructor(options = {}) {
    this.adapters = [
      new LeetCodeAdapter(),
      new GitHubAdapter(),
      new GenericContextAdapter(), // Always last fallback
    ];
    this.currentUrl = typeof window !== 'undefined' && window.location ? window.location.href : '';
    this.onTaskTransition = options.onTaskTransition || null;
    this._setupSpaNavigationObserver();
  }

  _setupSpaNavigationObserver() {
    if (typeof window === 'undefined') return;

    // 1. History API & window popstate
    const handleNav = () => {
      const newUrl = window.location.href;
      if (newUrl !== this.currentUrl) {
        this.handleTaskTransition(this.currentUrl, newUrl);
      }
    };

    window.addEventListener('popstate', handleNav, { passive: true });
    window.addEventListener('hashchange', handleNav, { passive: true });

    // 2. Observer on title mutations for client-side routing changes
    if (typeof MutationObserver !== 'undefined' && document.querySelector('title')) {
      const titleObserver = new MutationObserver(() => {
        handleNav();
      });
      titleObserver.observe(document.querySelector('title'), { subtree: true, characterData: true, childList: true });
    }
  }

  handleTaskTransition(oldUrl, newUrl) {
    this.currentUrl = newUrl;
    // Reset task context across all adapters to prevent cross-task leakage
    for (const adapter of this.adapters) {
      adapter.resetTaskContext();
    }
    const freshContext = this.getActiveContext();
    if (this.onTaskTransition) {
      this.onTaskTransition(freshContext, oldUrl, newUrl);
    }
  }

  getActiveContext() {
    // Check if URL changed since last query
    if (typeof window !== 'undefined' && window.location && window.location.href !== this.currentUrl) {
      this.handleTaskTransition(this.currentUrl, window.location.href);
    }

    for (const adapter of this.adapters) {
      if (adapter.isMatching()) {
        return adapter.getContext();
      }
    }
    return new GenericContextAdapter().getContext();
  }

  getActiveAdapter() {
    for (const adapter of this.adapters) {
      if (adapter.isMatching()) {
        return adapter;
      }
    }
    return this.adapters[this.adapters.length - 1];
  }
}
