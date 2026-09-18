/**
 * Flowstate Content Script ES Module Loader (Manifest V3).
 * Enables native ES module imports in content scripts without a build step.
 */
(async () => {
  try {
    console.log('[Flowstate Loader] Executing loader on:', window.location.href);
    const scriptUrl = chrome.runtime.getURL('src/content/content.js');
    await import(scriptUrl);
  } catch (err) {
    console.warn('[Flowstate Loader] Failed to load content module:', err);
  }
})();
