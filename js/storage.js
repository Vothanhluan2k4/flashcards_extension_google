'use strict';

const API_BASE = 'http://localhost:3000';
const TIMEOUT_MS = 6000;

let pushChain = Promise.resolve(true);

async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(API_BASE + path, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const Store = {
  async getUserId() {
    const data = await chrome.storage.local.get('userId');
    if (data.userId) return data.userId;

    const id = crypto.randomUUID();
    await chrome.storage.local.set({ userId: id });
    return id;
  },

  async getLocal() {
    const data = await chrome.storage.local.get([
      'cacheSets',
      'cacheUpdatedAt',
      'sets',
    ]);

    if (Array.isArray(data.cacheSets)) {
      return {
        sets: data.cacheSets,
        updatedAt: Number(data.cacheUpdatedAt) || 0,
      };
    }

    if (Array.isArray(data.sets)) {
      const at = Date.now();
      await chrome.storage.local.set({ cacheSets: data.sets, cacheUpdatedAt: at });
      await chrome.storage.local.remove('sets');
      return { sets: data.sets, updatedAt: at };
    }

    return { sets: [], updatedAt: 0 };
  },

  async saveLocal(sets, updatedAt) {
    await chrome.storage.local.set({ cacheSets: sets, cacheUpdatedAt: updatedAt });
  },

  async fetchRemote(userId) {
    const res = await apiFetch(`/api/sets/${userId}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('fetch_failed');
    return res.json();
  },

  async pushRemote(userId, sets, updatedAt) {
    const res = await apiFetch(`/api/sets/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sets, updatedAt }),
    });
    if (!res.ok) throw new Error('push_failed');
  },

  async sync() {
    const userId = await this.getUserId();
    const local = await this.getLocal();

    try {
      const remote = await this.fetchRemote(userId);
      const remoteAt = remote ? Number(remote.updatedAt) || 0 : 0;

      if (remote && remoteAt > local.updatedAt) {
        const sets = Array.isArray(remote.sets) ? remote.sets : [];
        await this.saveLocal(sets, remoteAt);
        return { sets, changed: true, online: true };
      }

      if (local.updatedAt > remoteAt || (!remote && local.sets.length)) {
        const at = local.updatedAt || Date.now();
        await this.pushRemote(userId, local.sets, at);
        await this.saveLocal(local.sets, at);
      }

      return { sets: local.sets, changed: false, online: true };
    } catch (err) {
      return { sets: local.sets, changed: false, online: false };
    }
  },

  async saveSets(sets) {
    const updatedAt = Date.now();
    await this.saveLocal(sets, updatedAt);

    const userId = await this.getUserId();
    pushChain = pushChain.then(async () => {
      try {
        await this.pushRemote(userId, sets, updatedAt);
        return true;
      } catch (err) {
        return false;
      }
    });

    return pushChain;
  },
};
