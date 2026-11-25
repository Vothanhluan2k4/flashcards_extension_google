'use strict';

const API_BASE = 'http://localhost:3000';
const TIMEOUT_MS = 6000;

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('quickCaptureEnabled');
  if (typeof data.quickCaptureEnabled !== 'boolean') {
    await chrome.storage.local.set({ quickCaptureEnabled: true });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'SYNC_SETS') {
    syncNow()
      .then((ok) => sendResponse({ ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

async function syncNow() {
  const data = await chrome.storage.local.get(['userId', 'cacheSets', 'cacheUpdatedAt']);
  let userId = data.userId;
  if (!userId) {
    userId = crypto.randomUUID();
    await chrome.storage.local.set({ userId });
  }

  const sets = Array.isArray(data.cacheSets) ? data.cacheSets : [];
  const updatedAt = Number(data.cacheUpdatedAt) || Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/sets/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sets, updatedAt }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
