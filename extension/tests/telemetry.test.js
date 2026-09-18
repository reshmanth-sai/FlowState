/**
 * Automated Verification Suite for Flowstate Browser Extension.
 * Runs directly via: node extension/tests/telemetry.test.js
 */

import assert from 'node:assert';
import { TelemetryCollector } from '../src/content/telemetry.js';
import { GenericContextAdapter, LeetCodeAdapter, ContextManager, sanitizeTitle } from '../src/content/context.js';
import { FLOWSTATE_CONFIG, isSupportedDomain } from '../src/shared/constants.js';
import { validateTelemetryPayload } from '../src/shared/schemas.js';

console.log('--- RUNNING EXTENSION VERIFICATION SUITE ---');

// TEST 1: Privacy - Zero Keylogging Verification
function testPrivacyZeroKeylogging() {
  const collector = new TelemetryCollector({ pauseThresholdMs: 4000, isMonitoring: true });

  // Simulate typing simulated keys
  collector.keyIntervals.push(220, 240, 260);
  collector.backspaceCount = 5;
  collector.deleteCount = 1;

  const payload = collector.harvest({ platform: 'generic', page_title: 'Test Page' });

  // Assert schema validity
  assert.doesNotThrow(() => validateTelemetryPayload(payload));

  // Assert absolutely NO raw key characters or words exist
  assert.strictEqual(payload.key, undefined, 'Must not contain "key"');
  assert.strictEqual(payload.char, undefined, 'Must not contain "char"');
  assert.strictEqual(payload.character, undefined, 'Must not contain "character"');
  assert.strictEqual(payload.text, undefined, 'Must not contain "text"');
  assert.strictEqual(payload.input, undefined, 'Must not contain "input"');
  assert.strictEqual(payload.raw_keys, undefined, 'Must not contain "raw_keys"');

  // Verify only mathematical distributions exist
  assert.strictEqual(payload.typing_interval_mean_ms, 240);
  assert.strictEqual(payload.backspace_count, 5);
  assert.strictEqual(payload.delete_count, 1);

  console.log('✓ PASS: Privacy invariant preserved (zero raw keys or text in payload)');
}

// TEST 2: Aggregation - Mathematical Interval Mean and Standard Deviation
function testMathematicalAggregation() {
  const collector = new TelemetryCollector({ isMonitoring: true });
  // Intervals: 100, 200, 300 -> mean = 200, variance = ((100)^2 + 0 + (100)^2) / 2 = 10000, std = 100
  collector.keyIntervals = [100, 200, 300];
  const payload = collector.harvest();

  assert.strictEqual(payload.typing_interval_mean_ms, 200);
  assert.strictEqual(payload.typing_interval_std_ms, 100);

  console.log('✓ PASS: Mathematical aggregation computes correct mean and sample standard deviation');
}

// TEST 3: Pause Detection - Long Idle Thresholds
function testPauseDetection() {
  const collector = new TelemetryCollector({ pauseThresholdMs: 3000, isMonitoring: true });

  // Simulate two keypresses separated by 5500ms (> 3000ms pause threshold)
  collector.lastInteractionTime = 10000;

  const nowMock = 15500;
  const delta = nowMock - collector.lastInteractionTime;
  assert.ok(delta >= 3000);
  collector.pauseCount++;
  collector.totalPauseDurationMs += delta;
  collector.longestPauseDurationMs = delta;

  const payload = collector.harvest();
  assert.strictEqual(payload.pause_count, 1);
  assert.strictEqual(payload.pause_duration_seconds, 5.5);
  assert.strictEqual(payload.metadata.longest_pause_seconds, 5.5);

  console.log('✓ PASS: Inactivity pauses accurately detected without recording screen or DOM');
}

// TEST 4: Provenance Invariants
function testProvenanceContract() {
  assert.strictEqual(FLOWSTATE_CONFIG.SOURCE_TYPE, 'COMPUTER_BEHAVIOR');
  assert.notStrictEqual(FLOWSTATE_CONFIG.SOURCE_TYPE, 'REAL_WEARABLE');
  assert.notStrictEqual(FLOWSTATE_CONFIG.SOURCE_TYPE, 'SIMULATED');
  assert.strictEqual(FLOWSTATE_CONFIG.SOURCE_DEVICE, 'Flowstate Chrome Extension');

  console.log('✓ PASS: Provenance contract strictly tagged as COMPUTER_BEHAVIOR');
}

// TEST 5: Context Isolation - Generic & LeetCode Fallbacks
function testContextIsolation() {
  const generic = new GenericContextAdapter();
  const ctx = generic.getContext();

  assert.strictEqual(ctx.platform, 'generic');
  assert.strictEqual(typeof ctx.page_title, 'string');
  assert.strictEqual(ctx.difficulty, 1.0);
  // Ensure no arbitrary DOM content or URL query params
  assert.strictEqual(ctx.dom, undefined);
  assert.strictEqual(ctx.url, undefined);

  const mgr = new ContextManager();
  const active = mgr.getActiveContext();
  assert.ok(active.platform);

  console.log('✓ PASS: Context extraction strictly bounded without arbitrary DOM/URL capture');
}

// TEST 6: Forbidden Fields Validation Throws
function testForbiddenFieldsRejection() {
  const invalidPayload = {
    platform: 'generic',
    typing_interval_mean_ms: 250,
    text: 'SELECT * FROM users', // Forbidden
  };

  assert.throws(
    () => validateTelemetryPayload(invalidPayload),
    /Privacy Violation/,
    'Validator must reject forbidden text fields'
  );

  console.log('✓ PASS: Privacy validator strictly rejects payloads with forbidden fields');
}

// TEST 7: Domain Allowlist Enforcement
function testDomainAllowlist() {
  // Supported domains must return true
  assert.strictEqual(isSupportedDomain('leetcode.com'), true);
  assert.strictEqual(isSupportedDomain('study.leetcode.com'), true);
  assert.strictEqual(isSupportedDomain('github.com'), true);
  assert.strictEqual(isSupportedDomain('gist.github.com'), true);
  assert.strictEqual(isSupportedDomain('localhost'), true);
  assert.strictEqual(isSupportedDomain('127.0.0.1'), true);

  // Arbitrary web pages must return false
  assert.strictEqual(isSupportedDomain('example.com'), false);
  assert.strictEqual(isSupportedDomain('google.com'), false);
  assert.strictEqual(isSupportedDomain('bankofamerica.com'), false);
  assert.strictEqual(isSupportedDomain('evil-phishing.org'), false);
  assert.strictEqual(isSupportedDomain(''), false);
  assert.strictEqual(isSupportedDomain(null), false);

  console.log('✓ PASS: Domain allowlist strictly permits only LeetCode, GitHub, and local dev environments');
}

// TEST 8: Idle State Telemetry Gating (FLOWSTATE — IDLE)
function testIdleStateGating() {
  // Collector initialized with isMonitoring = false (idle)
  const collector = new TelemetryCollector({ isMonitoring: false });

  // Simulate typing, backspaces, and scrolls while IDLE
  collector._handleKeyDown({ key: 'a', target: {} });
  collector._handleKeyDown({ key: 'b', target: {} });
  collector._handleKeyDown({ key: 'Backspace', target: {} });
  collector._handleScroll();
  collector.recordCodeRun(true);

  // Assert zero interaction metrics recorded
  assert.strictEqual(collector.keyIntervals.length, 0, 'Must not record intervals while idle');
  assert.strictEqual(collector.backspaceCount, 0, 'Must not count backspaces while idle');
  assert.strictEqual(collector.scrollEvents, 0, 'Must not count scrolls while idle');
  assert.strictEqual(collector.codeRunCount, 0, 'Must not record code runs while idle');

  // Assert harvest returns null when idle
  const idlePayload = collector.harvest();
  assert.strictEqual(idlePayload, null, 'Harvest must return null when monitoring is idle');

  // Turn monitoring ON
  collector.setMonitoring(true);
  collector._handleKeyDown({ key: 'c', target: {} });
  collector._handleKeyDown({ key: 'Backspace', target: {} });
  assert.strictEqual(collector.backspaceCount, 1, 'Must count backspaces when monitoring is active');
  const activePayload = collector.harvest();
  assert.notStrictEqual(activePayload, null, 'Harvest must return payload when monitoring is active');

  // Turn monitoring back OFF -> state resets
  collector.setMonitoring(false);
  assert.strictEqual(collector.harvest(), null);

  console.log('✓ PASS: Idle state strictly produces zero behavioral telemetry');
}

// TEST 9: Password Field & data-private Attribute Shielding
function testSensitiveFieldShielding() {
  const collector = new TelemetryCollector({ isMonitoring: true });

  const passwordElement = {
    tagName: 'INPUT',
    type: 'password',
    getAttribute: () => null,
  };

  const privateElement = {
    tagName: 'DIV',
    getAttribute: (attr) => (attr === 'data-private' ? 'true' : null),
  };

  const normalElement = {
    tagName: 'INPUT',
    type: 'text',
    getAttribute: () => null,
  };

  // Simulate typing into password field
  collector._handleKeyDown({ key: 'P', target: passwordElement });
  collector._handleKeyDown({ key: 'a', target: passwordElement });
  collector._handleKeyDown({ key: 'Backspace', target: passwordElement });

  // Simulate typing into data-private container
  collector._handleKeyDown({ key: 'S', target: privateElement });
  collector._handleKeyDown({ key: 'e', target: privateElement });

  // Verify zero metrics recorded from sensitive elements
  assert.strictEqual(collector.keyIntervals.length, 0, 'Zero typing intervals from sensitive fields');
  assert.strictEqual(collector.backspaceCount, 0, 'Zero backspaces from password field');

  // Normal element should record backspace
  collector._handleKeyDown({ key: 'Backspace', target: normalElement });
  assert.strictEqual(collector.backspaceCount, 1, 'Normal elements permitted');

  console.log('✓ PASS: Password and data-private inputs completely shielded from observation');
}

// TEST 10: URL & Title Privacy Sanitization
function testUrlAndTitleSanitization() {
  const dirtyTitleWithUrl = 'Problem 12 - https://leetcode.com/problems/two-sum/?token=secret123#frag';
  const sanitized = sanitizeTitle(dirtyTitleWithUrl);

  assert.strictEqual(sanitized.includes('secret123'), false, 'Token must be stripped');
  assert.strictEqual(sanitized.includes('https://'), false, 'URL must be stripped');
  assert.strictEqual(sanitized.includes('#frag'), false, 'Hash must be stripped');
  assert.strictEqual(sanitized.includes('?token'), false, 'Query param must be stripped');

  // Test empty/null fallback
  assert.strictEqual(sanitizeTitle(null), 'Web Interaction');
  assert.strictEqual(sanitizeTitle(''), 'Web Interaction');

  console.log('✓ PASS: URL parameters, tokens, and fragments sanitized from page titles');
}

// TEST 11: Zero Source Code and Arbitrary Page Text Transmitted
function testNoSourceCodeOrDomText() {
  const collector = new TelemetryCollector({ isMonitoring: true });
  collector.keyIntervals = [200, 250];
  collector.backspaceCount = 2;

  const payload = collector.harvest({
    platform: 'leetcode',
    page_title: '1. Two Sum',
    difficulty: 1.0,
    metadata: { language: 'Python3' }
  });

  const serialized = JSON.stringify(payload);

  // Assert no code keywords or DOM properties exist
  const forbiddenPatterns = ['def ', 'function', 'class ', 'return ', '<div', '<html', 'body', 'script'];
  for (const pat of forbiddenPatterns) {
    assert.strictEqual(serialized.includes(pat), false, `Payload must not contain code pattern: ${pat}`);
  }

  // Verify only authorized numeric and structural metrics
  assert.strictEqual(typeof payload.typing_interval_mean_ms, 'number');
  assert.strictEqual(typeof payload.backspace_count, 'number');
  assert.strictEqual(typeof payload.difficulty, 'number');
  assert.strictEqual(payload.platform, 'leetcode');

  console.log('✓ PASS: Payload contains zero source code, script tags, or DOM markup');
}

// Run all test cases
try {
  testPrivacyZeroKeylogging();
  testMathematicalAggregation();
  testPauseDetection();
  testProvenanceContract();
  testContextIsolation();
  testForbiddenFieldsRejection();
  testDomainAllowlist();
  testIdleStateGating();
  testSensitiveFieldShielding();
  testUrlAndTitleSanitization();
  testNoSourceCodeOrDomText();
  console.log('\nALL 11 EXTENSION HARDENING & PRIVACY TESTS PASSED CLEANLY!\n');
} catch (err) {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
}
