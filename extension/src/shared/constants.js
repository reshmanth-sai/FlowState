/**
 * Flowstate Browser Extension Constants
 * Complies with Section 2 & Section 6 of Flowstate Master Architecture.
 */

export const FLOWSTATE_CONFIG = {
  DEFAULT_API_BASE: 'http://localhost:8000',
  SOURCE_TYPE: 'COMPUTER_BEHAVIOR',
  SOURCE_DEVICE: 'Flowstate Chrome Extension',
  BATCH_INTERVAL_MS: 15000, // 15-second local aggregation window
  PAUSE_THRESHOLD_MS: 4000,  // 4s idle threshold considered a cognitive pause
  STORAGE_KEYS: {
    ACTIVE_SESSION_ID: 'flowstate_active_session_id',
    API_BASE: 'flowstate_api_base',
    MONITORING_ENABLED: 'flowstate_monitoring_enabled',
    HUD_EXPANDED: 'flowstate_hud_expanded',
  },
  MESSAGES: {
    GET_STATUS: 'FLOWSTATE_GET_STATUS',
    START_SESSION: 'FLOWSTATE_START_SESSION',
    STOP_SESSION: 'FLOWSTATE_STOP_SESSION',
    TELEMETRY_BATCH: 'FLOWSTATE_TELEMETRY_BATCH',
    INTERVENTION_RESPONSE: 'FLOWSTATE_INTERVENTION_RESPONSE',
    STATUS_UPDATE: 'FLOWSTATE_STATUS_UPDATE',
  },
  QUALITY_GATES: {
    PASS: 'PASS',
    DEGRADED: 'DEGRADED',
    INSUFFICIENT: 'INSUFFICIENT',
  },
  SUPPORTED_DOMAINS: [
    'leetcode.com',
    'github.com',
    'localhost',
    '127.0.0.1'
  ],
  CONTEXT_SCHEMA_VERSION: '1.0.0',
  OUTCOME_CATEGORIES: {
    ACCEPTED: 'ACCEPTED',
    WRONG_ANSWER: 'WRONG_ANSWER',
    TIME_LIMIT_EXCEEDED: 'TIME_LIMIT_EXCEEDED',
    RUNTIME_ERROR: 'RUNTIME_ERROR',
    UNKNOWN: 'UNKNOWN',
  },
  DIFFICULTY_MAP: {
    easy: 1.0,
    medium: 2.5,
    hard: 4.0,
  },
};

export const CONTEXT_SCHEMA_VERSION = FLOWSTATE_CONFIG.CONTEXT_SCHEMA_VERSION;
export const OUTCOME_CATEGORIES = FLOWSTATE_CONFIG.OUTCOME_CATEGORIES;
export const DIFFICULTY_MAP = FLOWSTATE_CONFIG.DIFFICULTY_MAP;

/**
 * Validates whether a hostname belongs to an authorized, supported domain.
 * Prevents accidental or unauthorized execution on arbitrary web pages.
 */
export function isSupportedDomain(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const cleanHost = hostname.toLowerCase().trim();
  return FLOWSTATE_CONFIG.SUPPORTED_DOMAINS.some((allowed) => {
    return cleanHost === allowed || cleanHost.endsWith('.' + allowed);
  });
}

