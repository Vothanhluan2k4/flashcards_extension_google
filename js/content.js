'use strict';

(() => {
  if (typeof window.__flashcardsCaptureCleanup === 'function') {
    window.__flashcardsCaptureCleanup();
  }

  const STYLE_ID = 'flashcards-allow-select-style';
  let enabled = false;
  let host = null;
  let shadow = null;
  let lastSelectionRect = null;
  let selectedText = '';

  function syncAllowSelectStyle() {
    const existing = document.getElementById(STYLE_ID);
    if (!enabled) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      *, *::before, *::after {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        user-select: text !important;
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  chrome.storage.local.get('quickCaptureEnabled', (data) => {
    enabled = data.quickCaptureEnabled !== false;
    syncAllowSelectStyle();
    if (!enabled) removeUI();
  });

  const onStorageChanged = (changes, area) => {
    if (area === 'local' && changes.quickCaptureEnabled) {
      enabled = changes.quickCaptureEnabled.newValue !== false;
      syncAllowSelectStyle();
      if (!enabled) removeUI();
    }
  };
  chrome.storage.onChanged.addListener(onStorageChanged);

  function ensureHost() {
    if (host && document.body.contains(host)) return shadow;
    host = document.createElement('div');
    host.id = 'flashcards-quick-capture-host';
    host.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;';
    shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif; }
      .fc-fab {
        position: fixed;
        pointer-events: auto;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 11px;
        background: #ffe599;
        color: #1e1e24;
        border: 2px solid #1e1e24;
        box-shadow: 3px 3px 0 #1e1e24;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        user-select: none;
        transition: transform 0.08s, box-shadow 0.08s, background 0.08s;
      }
      .fc-fab:hover {
        background: #a5d8ff;
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 #1e1e24;
      }
      .fc-fab-logo {
        display: inline-grid;
        place-items: center;
        width: 18px;
        height: 18px;
        background: #ff94ae;
        border: 1.5px solid #1e1e24;
        font-size: 11px;
        font-weight: 900;
      }
      .fc-card {
        position: fixed;
        pointer-events: auto;
        width: 310px;
        background: #faf8f5;
        color: #1e1e24;
        border: 3px solid #1e1e24;
        box-shadow: 6px 6px 0 #1e1e24;
        padding: 16px 18px 18px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .fc-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .fc-title {
        font-size: 13px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .fc-close {
        width: 24px;
        height: 24px;
        border: 2px solid #1e1e24;
        background: #ffffff;
        box-shadow: 2px 2px 0 #1e1e24;
        font-size: 16px;
        font-weight: 900;
        line-height: 1;
        cursor: pointer;
        display: grid;
        place-items: center;
        color: #1e1e24;
      }
      .fc-close:hover { background: #ffc2d1; }
      .fc-field {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #1e1e24;
        background: #ffffff;
        color: #1e1e24;
        font-size: 13.5px;
        font-weight: 600;
        outline: none;
      }
      .fc-field:focus {
        box-shadow: 2.5px 2.5px 0 #1e1e24;
      }
      .fc-row {
        display: grid;
        grid-template-columns: 118px 1fr;
        gap: 8px;
      }
      .fc-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 2px;
      }
      .fc-btn {
        border: 2px solid #1e1e24;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 800;
        background: #ffffff;
        color: #1e1e24;
        box-shadow: 2px 2px 0 #1e1e24;
        cursor: pointer;
      }
      .fc-btn-primary {
        background: #99e2b4;
      }
      .fc-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 #1e1e24;
      }
      .fc-status {
        font-size: 12px;
        font-weight: 800;
        color: #216e4e;
      }
    `;
    shadow.appendChild(style);
    document.body.appendChild(host);
    return shadow;
  }

  function clearContent() {
    if (!shadow) return;
    Array.from(shadow.children).forEach((child) => {
      if (child.tagName !== 'STYLE') child.remove();
    });
  }

  function removeUI() {
    clearContent();
  }

  function clampPosition(left, top, width, height) {
    const pad = 10;
    const x = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    const y = Math.max(pad, Math.min(top, window.innerHeight - height - pad));
    return { x, y };
  }

  function showFab(rect, text) {
    const root = ensureHost();
    clearContent();

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'fc-fab';
    fab.innerHTML = '<span class="fc-fab-logo">F</span><span>+ Thêm thẻ</span>';

    const { x, y } = clampPosition(rect.right - 20, rect.bottom + 8, 120, 34);
    fab.style.left = `${x}px`;
    fab.style.top = `${y}px`;

    fab.addEventListener('mousedown', (e) => e.stopPropagation());
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      openCaptureCard(rect, text);
    });

    root.appendChild(fab);
  }

  async function openCaptureCard(rect, text) {
    const root = ensureHost();
    clearContent();

    const data = await chrome.storage.local.get(['cacheSets', 'sets', 'lastCaptureSetId']);
    const sets = Array.isArray(data.cacheSets)
      ? data.cacheSets
      : Array.isArray(data.sets)
      ? data.sets
      : [];

    const card = document.createElement('form');
    card.className = 'fc-card';
    const { x, y } = clampPosition(rect.left, rect.bottom + 8, 310, 260);
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;

    card.innerHTML = `
      <div class="fc-head">
        <span class="fc-title">Thêm vào Flashcards</span>
        <button type="button" class="fc-close" title="Đóng">&times;</button>
      </div>
      <input class="fc-field" name="term" type="text" placeholder="Từ / cụm từ" maxlength="200" required>
      <div class="fc-row">
        <select class="fc-field" name="wordType" aria-label="Loại từ">
          <option value="">Loại từ</option>
          <option value="n">Danh từ (n)</option>
          <option value="v">Động từ (v)</option>
          <option value="adj">Tính từ (adj)</option>
          <option value="adv">Trạng từ (adv)</option>
          <option value="prep">Giới từ (prep)</option>
          <option value="conj">Liên từ (conj)</option>
          <option value="pron">Đại từ (pron)</option>
          <option value="interj">Thán từ (interj)</option>
          <option value="phrase">Cụm từ (phrase)</option>
        </select>
        <select class="fc-field" name="setId" aria-label="Bộ thẻ"></select>
      </div>
      <input class="fc-field" name="definition" type="text" placeholder="Nghĩa / định nghĩa (tùy chọn)" maxlength="500">
      <div class="fc-actions">
        <button type="button" class="fc-btn fc-cancel">Hủy</button>
        <button type="submit" class="fc-btn fc-btn-primary">Lưu thẻ</button>
      </div>
    `;

    const termInput = card.querySelector('[name="term"]');
    const typeSelect = card.querySelector('[name="wordType"]');
    const setSelect = card.querySelector('[name="setId"]');
    const defInput = card.querySelector('[name="definition"]');

    termInput.value = text.slice(0, 200);

    if (sets.length) {
      sets.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        setSelect.appendChild(opt);
      });
      if (data.lastCaptureSetId && sets.some((s) => s.id === data.lastCaptureSetId)) {
        setSelect.value = data.lastCaptureSetId;
      }
    } else {
      const opt = document.createElement('option');
      opt.value = '__new__';
      opt.textContent = '+ Bộ thẻ mới (Từ vựng web)';
      setSelect.appendChild(opt);
    }

    card.addEventListener('mousedown', (e) => e.stopPropagation());
    card.querySelector('.fc-close').addEventListener('click', removeUI);
    card.querySelector('.fc-cancel').addEventListener('click', removeUI);

    card.addEventListener('submit', async (e) => {
      e.preventDefault();
      const term = termInput.value.trim().slice(0, 200);
      if (!term) {
        termInput.focus();
        return;
      }

      const wordType = typeSelect.value.trim().slice(0, 30);
      const definition = defInput.value.trim().slice(0, 500);

      const latest = await chrome.storage.local.get(['cacheSets', 'sets']);
      const currentSets = Array.isArray(latest.cacheSets)
        ? latest.cacheSets
        : Array.isArray(latest.sets)
        ? latest.sets
        : [];

      let targetSet = currentSets.find((s) => s.id === setSelect.value);
      if (!targetSet) {
        targetSet = {
          id: crypto.randomUUID(),
          name: 'Từ vựng web',
          createdAt: Date.now(),
          words: [],
        };
        currentSets.push(targetSet);
      }

      targetSet.words.push({
        id: crypto.randomUUID(),
        term,
        wordType,
        definition,
        createdAt: Date.now(),
      });

      const updatedAt = Date.now();
      await chrome.storage.local.set({
        cacheSets: currentSets,
        cacheUpdatedAt: updatedAt,
        lastCaptureSetId: targetSet.id,
      });

      chrome.runtime.sendMessage({ type: 'SYNC_SETS' }).catch(() => {});

      card.innerHTML = `<div class="fc-status">Đã lưu "${term}" vào "${targetSet.name}"!</div>`;
      setTimeout(removeUI, 1100);
    });

    root.appendChild(card);
    defInput.focus();
  }

  function readSelection(clientX, clientY) {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (!text || text.length > 200) return null;

    let rect = null;
    if (sel.rangeCount) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (r && (r.width > 0 || r.height > 0)) {
        rect = {
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      }
    }

    if (!rect) {
      rect = {
        left: clientX,
        right: clientX,
        top: clientY,
        bottom: clientY,
        width: 1,
        height: 1,
      };
    }

    return { text, rect };
  }

  function handleSelection(clientX, clientY, fallbackSnapshot) {
    if (!chrome.runtime?.id) {
      cleanup();
      return;
    }

    chrome.storage.local.get('quickCaptureEnabled', (data) => {
      enabled = data.quickCaptureEnabled !== false;
      syncAllowSelectStyle();
      if (!enabled) {
        removeUI();
        return;
      }

      const snap = readSelection(clientX, clientY) || fallbackSnapshot;
      if (!snap) {
        removeUI();
        return;
      }

      selectedText = snap.text;
      lastSelectionRect = snap.rect;
      showFab(lastSelectionRect, selectedText);
    });
  }

  const allowCopyEvent = (event) => {
    if (!chrome.runtime?.id) {
      cleanup();
      return;
    }
    if (!enabled) return;
    if (host && event.composedPath().includes(host)) return;
    event.stopPropagation();
  };

  const onMouseUp = (event) => {
    if (!chrome.runtime?.id) {
      cleanup();
      return;
    }
    if (!enabled) return;
    if (host && event.composedPath().includes(host)) return;
    const { clientX, clientY } = event;
    const immediate = readSelection(clientX, clientY);
    setTimeout(() => handleSelection(clientX, clientY, immediate), 15);
  };

  const onMouseDown = (event) => {
    if (host && event.composedPath().includes(host)) return;
    removeUI();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') removeUI();
  };

  function cleanup() {
    window.removeEventListener('selectstart', allowCopyEvent, true);
    window.removeEventListener('copy', allowCopyEvent, true);
    window.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('keydown', onKeyDown);
    const styleEl = document.getElementById(STYLE_ID);
    if (styleEl) styleEl.remove();
    if (chrome.runtime?.id) {
      chrome.storage.onChanged.removeListener(onStorageChanged);
    }
    if (host && host.parentNode) {
      host.remove();
    }
    host = null;
    shadow = null;
  }

  window.__flashcardsCaptureCleanup = cleanup;

  window.addEventListener('selectstart', allowCopyEvent, true);
  window.addEventListener('copy', allowCopyEvent, true);
  window.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('keydown', onKeyDown);
})();
