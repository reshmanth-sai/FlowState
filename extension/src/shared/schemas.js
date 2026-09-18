/**
 * Payload Schemas and Privacy Validators for Flowstate Extension.
 */

export function validateTelemetryPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be a non-null object');
  }

  // Strict Privacy Invariants: No raw characters, no key names, no text content
  const forbiddenKeys = [
    'key', 'char', 'character', 'text', 'input', 'code', 
    'password', 'token', 'clipboard', 'dom', 'html', 'raw_keys', 'editor_content'
  ];

  function checkForbidden(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      if (forbiddenKeys.includes(k.toLowerCase())) {
        throw new Error(`Privacy Violation: Forbidden field '${path ? path + '.' : ''}${k}' detected in telemetry payload`);
      }
      if (typeof obj[k] === 'object' && obj[k] !== null) {
        checkForbidden(obj[k], path ? `${path}.${k}` : k);
      }
    }
  }

  checkForbidden(payload);

  // Ensure mathematical aggregates are valid numbers if present
  if (payload.typing_interval_mean_ms !== null && payload.typing_interval_mean_ms !== undefined) {
    if (typeof payload.typing_interval_mean_ms !== 'number' || isNaN(payload.typing_interval_mean_ms)) {
      throw new Error('Invalid typing_interval_mean_ms: must be a valid number or null');
    }
  }

  // Validate context object if present
  if (payload.context) {
    if (typeof payload.context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }
    if (payload.context.context_schema_version && payload.context.context_schema_version !== '1.0.0') {
      throw new Error(`Unsupported context schema version: ${payload.context.context_schema_version}`);
    }
    if (payload.context.platform && typeof payload.context.platform !== 'string') {
      throw new Error('Invalid context platform: must be a string');
    }
  }

  return true;
}
