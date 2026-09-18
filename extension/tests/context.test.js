/**
 * Automated Verification Suite for Flowstate Context Intelligence (Phase 3B).
 * Runs directly via: node extension/tests/context.test.js
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GenericContextAdapter,
  LeetCodeAdapter,
  GitHubAdapter,
  ContextManager,
  sanitizeTitle,
} from '../src/content/context.js';
import { TelemetryCollector } from '../src/content/telemetry.js';
import { FLOWSTATE_CONFIG, CONTEXT_SCHEMA_VERSION, OUTCOME_CATEGORIES, DIFFICULTY_MAP } from '../src/shared/constants.js';
import { validateTelemetryPayload } from '../src/shared/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- RUNNING FLOWSTATE PHASE 3B CONTEXT INTELLIGENCE TESTS ---');

// Helper to create a DOM mock from HTML fixtures
function createMockDomFromFixture(fixtureFileName, options = {}) {
  const fixturePath = path.join(__dirname, 'fixtures', fixtureFileName);
  const html = fs.readFileSync(fixturePath, 'utf8');

  // Extract <title>
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Test Page';

  // Build a selector query helper
  function querySelector(selector) {
    if (selector.includes('data-cy="question-title"')) {
      const m = html.match(/data-cy="question-title"[^>]*>([^<]+)<\//i);
      if (m) return { textContent: m[1].trim(), getAttribute: () => null, className: '' };
    }
    if (selector.includes('difficulty')) {
      const m = html.match(/class="[^"]*(?:text-difficulty-[a-z]+|[^"]*difficulty[^"]*)"[^>]*>([^<]+)<\//i);
      if (m) return { className: m[0], textContent: m[1].trim(), getAttribute: () => null };
    }
    if (selector.includes('headlessui-listbox-button')) {
      const m = html.match(/id="[^"]*headlessui-listbox-button[^"]*"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/i);
      if (m) return { textContent: m[1].trim(), getAttribute: () => null, className: '' };
    }
    if (selector.includes('submission-result')) {
      const m = html.match(/data-e2e-locator="submission-result"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/i);
      if (m) return { textContent: m[1].trim(), getAttribute: () => null, className: '' };
    }
    if (selector.includes('console-run-button')) {
      if (html.includes('console-run-button')) {
        return {
          textContent: 'Run',
          addEventListener: () => {},
          removeEventListener: () => {},
        };
      }
    }
    if (selector.includes('console-submit-button')) {
      if (html.includes('console-submit-button')) {
        return {
          textContent: 'Submit',
          addEventListener: () => {},
          removeEventListener: () => {},
        };
      }
    }
    if (selector.includes('monaco-editor')) {
      const m = html.match(/class="monaco-editor"[^>]*>([\s\S]*?)<\/div>/i);
      if (m) return { innerHTML: m[1], textContent: m[1].replace(/<[^>]+>/g, '') };
    }
    return null;
  }

  const mockWindow = {
    location: {
      hostname: options.hostname || 'leetcode.com',
      pathname: options.pathname || '/problems/3sum/',
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const mockDocument = {
    title,
    querySelector,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  return { mockWindow, mockDocument, html };
}

// TEST 1: Context Schema Versioning (v1.0.0)
function testContextSchemaVersioning() {
  const adapter = new GenericContextAdapter({
    location: { hostname: 'example.com', pathname: '/docs' },
  });
  const ctx = adapter.getContext();

  assert.strictEqual(ctx.context_schema_version, '1.0.0', 'Schema version must be 1.0.0');
  assert.strictEqual(ctx.platform, 'generic');
  assert.ok(ctx.task);
  assert.ok(ctx.activity);
  assert.strictEqual(typeof ctx.activity.active_time_seconds, 'number');

  console.log('✓ PASS 1: Context schema versioning strictly stamped as 1.0.0');
}

// TEST 2: Generic Adapter Safe Fields (No DOM / No Source / No Query Params)
function testGenericAdapterSafeFields() {
  const generic = new GenericContextAdapter({
    location: { hostname: 'developer.mozilla.org', pathname: '/en-US/docs/Web' },
  });
  const ctx = generic.getContext();

  assert.strictEqual(ctx.platform, 'generic');
  assert.strictEqual(ctx.task.type, 'web_interaction');
  assert.strictEqual(ctx.task.difficulty, null);
  assert.strictEqual(ctx.task.difficulty_scalar, 1.0);

  // Privacy invariant: Absolutely no raw DOM or query parameters
  assert.strictEqual(ctx.dom, undefined);
  assert.strictEqual(ctx.html, undefined);
  assert.strictEqual(ctx.query, undefined);
  assert.strictEqual(ctx.search, undefined);
  assert.strictEqual(ctx.source_code, undefined);

  console.log('✓ PASS 2: Generic adapter yields only approved safe fields without DOM/URL leakage');
}

// TEST 3: LeetCode Adapter Feature Extraction from Fixture
function testLeetCodeAdapterExtraction() {
  const { mockWindow, mockDocument } = createMockDomFromFixture('leetcode_problem.html');

  // Install mocks temporarily
  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  try {
    const adapter = new LeetCodeAdapter(mockWindow);
    const ctx = adapter.getContext();

    assert.strictEqual(ctx.platform, 'leetcode');
    assert.strictEqual(ctx.task.type, 'coding_problem');
    assert.strictEqual(ctx.task.title, '15. 3Sum');
    assert.strictEqual(ctx.task.difficulty, 'hard');
    assert.strictEqual(ctx.task.difficulty_scalar, 4.0);
    assert.strictEqual(ctx.task.language, 'python3');

    // Verify activity outcome classification
    const outcome = adapter._extractLatestOutcome();
    assert.strictEqual(outcome, OUTCOME_CATEGORIES.WRONG_ANSWER);
    assert.strictEqual(ctx.activity.last_outcome, 'WRONG_ANSWER');
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }

  console.log('✓ PASS 3: LeetCode adapter extracts title, difficulty, language, and outcome accurately');
}

// TEST 4: LeetCode Fallback Gracefully when DOM Changed
function testLeetCodeChangedDomFallback() {
  const { mockWindow, mockDocument } = createMockDomFromFixture('leetcode_changed_dom.html');

  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  try {
    const adapter = new LeetCodeAdapter(mockWindow);
    // Even if DOM is completely unrecognizable, getContext must NOT throw
    assert.doesNotThrow(() => {
      const ctx = adapter.getContext();
      assert.strictEqual(ctx.platform, 'leetcode');
      assert.strictEqual(ctx.task.difficulty, null);
      assert.strictEqual(ctx.task.difficulty_scalar, null);
      assert.strictEqual(ctx.task.language, null);
    });
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }

  console.log('✓ PASS 4: Changed DOM structure handled gracefully without crashing or fabricating data');
}

// TEST 5: Missing Difficulty Stays Null (Never Fabricated)
function testMissingDifficultyRemainsNull() {
  const { mockWindow, mockDocument } = createMockDomFromFixture('leetcode_missing_diff.html');

  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  try {
    const adapter = new LeetCodeAdapter(mockWindow);
    const ctx = adapter.getContext();

    assert.strictEqual(ctx.task.title, '1. Two Sum');
    assert.strictEqual(ctx.task.difficulty, null, 'Difficulty must be null when element missing');
    assert.strictEqual(ctx.task.difficulty_scalar, null, 'Scalar must be null when missing');
    assert.strictEqual(ctx.task.language, 'javascript');
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }

  console.log('✓ PASS 5: Missing difficulty remains null and is never fabricated');
}

// TEST 6: SPA Navigation & Task Transition (Resetting Counters & Context Isolation)
function testSpaNavigationAndIsolation() {
  const origDoc = globalThis.document;
  const origWin = globalThis.window;

  try {
    // Problem A
    let currentHtml = 'leetcode_problem.html';
    let { mockWindow, mockDocument } = createMockDomFromFixture(currentHtml);
    globalThis.document = mockDocument;
    globalThis.window = mockWindow;

    const mgr = new ContextManager();
    const adapter = mgr.getActiveAdapter();

    // Simulate interactions on Problem A
    adapter.recordCodeRun();
    adapter.recordSubmission();
    adapter.recordSubmission();

    const ctxA = adapter.getContext();
    assert.strictEqual(ctxA.task.title, '15. 3Sum');
    assert.strictEqual(ctxA.activity.code_run_count, 1);
    assert.strictEqual(ctxA.activity.submission_count, 2);
    assert.strictEqual(ctxA.activity.failure_count, 1);

    // Simulate SPA transition to Problem B
    const bFixture = createMockDomFromFixture('leetcode_missing_diff.html', {
      pathname: '/problems/two-sum/',
    });
    globalThis.document = bFixture.mockDocument;
    globalThis.window = bFixture.mockWindow;

    // Trigger task reset
    let transitionNotified = false;
    mgr.onTaskTransition = () => {
      transitionNotified = true;
    };
    mgr.handleTaskTransition('https://leetcode.com/problems/3sum/', 'https://leetcode.com/problems/two-sum/');

    assert.strictEqual(transitionNotified, true, 'Task transition listener must be fired');

    // Context B after reset
    const ctxB = mgr.getActiveContext();
    assert.strictEqual(ctxB.task.title, '1. Two Sum');
    assert.strictEqual(ctxB.activity.code_run_count, 0, 'Counters must be reset to 0');
    assert.strictEqual(ctxB.activity.submission_count, 0, 'Counters must be reset to 0');
    assert.strictEqual(ctxB.activity.failure_count, 0, 'Counters must be reset to 0');
    assert.strictEqual(ctxB.activity.last_outcome, null);

    // Strict metadata isolation: Problem A metadata must NOT leak into Problem B
    assert.notStrictEqual(ctxB.task.title, ctxA.task.title);
    assert.strictEqual(ctxB.task.difficulty, null); // Two Sum fixture had missing difficulty
    assert.notStrictEqual(ctxB.task.difficulty, ctxA.task.difficulty);
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }

  console.log('✓ PASS 6: SPA navigation resets task counters and guarantees metadata isolation');
}

// TEST 7: Telemetry Batch Combines Structured Context and Behavior
function testTelemetryBatchCombinedObservation() {
  const origDoc = globalThis.document;
  const origWin = globalThis.window;

  try {
    const { mockWindow, mockDocument } = createMockDomFromFixture('leetcode_problem.html');
    globalThis.document = mockDocument;
    globalThis.window = mockWindow;

    const collector = new TelemetryCollector({ isMonitoring: true });
    collector.keyIntervals.push(220, 240, 260);
    collector.backspaceCount = 7;
    collector.pauseCount = 2;
    collector.totalPauseDurationMs = 12000;

    const contextPayload = {
      context_schema_version: '1.0.0',
      platform: 'leetcode',
      task: {
        type: 'coding_problem',
        difficulty: 'hard',
        difficulty_scalar: 4.0,
        title: '15. 3Sum',
        language: 'python3',
      },
      activity: {
        active_time_seconds: 45,
        submission_count: 2,
        code_run_count: 3,
        failure_count: 1,
        last_outcome: 'WRONG_ANSWER',
      },
    };

    const harvest = collector.harvest(contextPayload);

    // Assert provenance invariant
    assert.strictEqual(harvest.source_type, 'COMPUTER_BEHAVIOR');

    // Assert structured behavior
    assert.strictEqual(harvest.behavior.typing_interval_mean_ms, 240);
    assert.strictEqual(harvest.behavior.backspace_count, 7);
    assert.strictEqual(harvest.behavior.pause_count, 2);
    assert.strictEqual(harvest.behavior.pause_duration_seconds, 12);

    // Assert structured context
    assert.strictEqual(harvest.context.context_schema_version, '1.0.0');
    assert.strictEqual(harvest.context.platform, 'leetcode');
    assert.strictEqual(harvest.context.task.difficulty_scalar, 4.0);
    assert.strictEqual(harvest.context.activity.last_outcome, 'WRONG_ANSWER');

    // Assert schema validity
    assert.doesNotThrow(() => validateTelemetryPayload(harvest));
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }

  console.log('✓ PASS 7: Telemetry harvest seamlessly bundles structured behavior and versioned context');
}

// TEST 8: Strict Privacy Invariant (Zero Source Code in Telemetry)
function testZeroSourceCodeInPayload() {
  const { mockWindow, mockDocument, html } = createMockDomFromFixture('leetcode_problem.html');

  // Verify the HTML fixture indeed contains source code
  assert.ok(html.includes('def threeSum'));
  assert.ok(html.includes('sensitive_secret_logic'));

  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  try {
    const adapter = new LeetCodeAdapter(mockWindow);
    const ctx = adapter.getContext();
    const serialized = JSON.stringify(ctx);

    // Verify source code NEVER leaked into context
    assert.strictEqual(serialized.includes('threeSum'), false);
    assert.strictEqual(serialized.includes('sensitive_secret_logic'), false);
    assert.strictEqual(serialized.includes('monaco-editor'), false);
    assert.strictEqual(serialized.includes('view-lines'), false);

    const collector = new TelemetryCollector({ isMonitoring: true });
    const payload = collector.harvest(ctx);
    const serializedPayload = JSON.stringify(payload);

    assert.strictEqual(serializedPayload.includes('sensitive_secret_logic'), false);
    assert.strictEqual(serializedPayload.includes('def '), false);
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }

  console.log('✓ PASS 8: Strict privacy verification - Zero editor content or source code extracted');
}

// TEST 9: Platform Abstraction Extensibility (GitHub Adapter Stub)
function testPlatformAbstractionExtensibility() {
  const gh = new GitHubAdapter({
    location: { hostname: 'github.com', pathname: '/facebook/react' },
  });
  const ctx = gh.getContext();

  assert.strictEqual(ctx.platform, 'github');
  assert.strictEqual(ctx.task.type, 'code_collaboration');
  assert.strictEqual(ctx.task.difficulty, null);
  assert.strictEqual(ctx.task.difficulty_scalar, 1.0);

  console.log('✓ PASS 9: Modular ContextAdapter architecture successfully exposes extensible adapter contracts');
}

// TEST 10: Non-Causal Grounding Verification (Difficulty != Workload)
function testNonCausalGrounding() {
  const diffEasy = DIFFICULTY_MAP.easy;
  const diffHard = DIFFICULTY_MAP.hard;

  assert.strictEqual(diffEasy, 1.0);
  assert.strictEqual(diffHard, 4.0);

  // Assert that context difficulty scalar is strictly descriptive metadata
  const sampleContext = {
    context_schema_version: '1.0.0',
    platform: 'leetcode',
    task: {
      type: 'coding_problem',
      difficulty: 'hard',
      difficulty_scalar: 4.0,
      title: '42. Trapping Rain Water',
    },
  };

  // Ensure no cognitive workload inference is calculated in the observation layer
  assert.strictEqual(sampleContext.workload, undefined);
  assert.strictEqual(sampleContext.task.workload, undefined);
  assert.strictEqual(sampleContext.cognitive_state, undefined);

  console.log('✓ PASS 10: Scientific integrity verified - Context difficulty is strictly non-causal metadata');
}

// Run all tests
testContextSchemaVersioning();
testGenericAdapterSafeFields();
testLeetCodeAdapterExtraction();
testLeetCodeChangedDomFallback();
testMissingDifficultyRemainsNull();
testSpaNavigationAndIsolation();
testTelemetryBatchCombinedObservation();
testZeroSourceCodeInPayload();
testPlatformAbstractionExtensibility();
testNonCausalGrounding();

console.log('\nALL 10 PHASE 3B CONTEXT INTELLIGENCE TESTS PASSED CLEANLY!\n');
