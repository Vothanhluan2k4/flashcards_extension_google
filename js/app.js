'use strict';

const state = {
  sets: [],
  activeSetId: null,
  editingWordId: null,
  selectedWordIds: new Set(),
  query: '',
  study: {
    cards: [],
    allWords: [],
    index: 0,
    mode: 'flip',
    cardModes: [],
    answered: 0,
    correct: 0,
    checked: false,
  },
};

const el = (id) => document.getElementById(id);

const dom = {
  setList: el('setList'),
  btnAddSet: el('btnAddSet'),
  btnExport: el('btnExport'),
  btnImport: el('btnImport'),
  fileImport: el('fileImport'),

  quickCaptureToggle: el('quickCaptureToggle'),
  quickCaptureBadge: el('quickCaptureBadge'),

  emptyState: el('emptyState'),
  btnCreateFirst: el('btnCreateFirst'),

  setView: el('setView'),
  setName: el('setName'),
  wordCount: el('wordCount'),
  btnRenameSet: el('btnRenameSet'),
  btnStudy: el('btnStudy'),

  wordForm: el('wordForm'),
  formTitle: el('formTitle'),
  inputTerm: el('inputTerm'),
  inputType: el('inputType'),
  inputDef: el('inputDef'),
  btnSaveWord: el('btnSaveWord'),
  btnCancelEdit: el('btnCancelEdit'),

  searchInput: el('searchInput'),
  btnSelectAll: el('btnSelectAll'),
  bulkBar: el('bulkBar'),
  bulkCount: el('bulkCount'),
  btnClearSelect: el('btnClearSelect'),
  btnDeleteSelected: el('btnDeleteSelected'),
  wordList: el('wordList'),
  wordEmpty: el('wordEmpty'),

  studyOverlay: el('studyOverlay'),
  fxCanvas: el('fxCanvas'),
  studySetName: el('studySetName'),
  studyProgress: el('studyProgress'),
  btnCloseStudy: el('btnCloseStudy'),
  flashcard: el('flashcard'),
  cardType: el('cardType'),
  cardTerm: el('cardTerm'),
  cardDef: el('cardDef'),
  btnSpeakFlip: el('btnSpeakFlip'),
  typeBox: el('typeBox'),
  btnSpeakType: el('btnSpeakType'),
  typeWordType: el('typeWordType'),
  typePrompt: el('typePrompt'),
  typeForm: el('typeForm'),
  typeInput: el('typeInput'),
  btnCheckType: el('btnCheckType'),
  typeFeedback: el('typeFeedback'),
  quizBox: el('quizBox'),
  btnSpeakQuiz: el('btnSpeakQuiz'),
  quizWordType: el('quizWordType'),
  quizPrompt: el('quizPrompt'),
  quizOptions: el('quizOptions'),
  quizFeedback: el('quizFeedback'),
  studyTip: el('studyTip'),
  btnPrev: el('btnPrev'),
  btnFlip: el('btnFlip'),
  btnNext: el('btnNext'),

  dialogOverlay: el('dialogOverlay'),
  dialogBox: el('dialogBox'),
  dialogTitle: el('dialogTitle'),
  dialogClose: el('dialogClose'),
  dialogMessage: el('dialogMessage'),
  dialogInput: el('dialogInput'),
  dialogCancel: el('dialogCancel'),
  dialogConfirm: el('dialogConfirm'),

  exportOverlay: el('exportOverlay'),
  exportDesc: el('exportDesc'),
  exportClose: el('exportClose'),
  btnExportJson: el('btnExportJson'),
  btnExportExcel: el('btnExportExcel'),
  btnExportPdf: el('btnExportPdf'),
};

let activeDialogResolve = null;

function closeDialog(value) {
  if (!activeDialogResolve) return;
  const resolve = activeDialogResolve;
  activeDialogResolve = null;
  dom.dialogOverlay.classList.add('hidden');
  resolve(value);
}

function showDialog({
  mode = 'alert',
  title = 'Thông báo',
  message = '',
  defaultValue = '',
  placeholder = '',
  confirmText = 'OK',
  cancelText = 'Hủy',
  danger = false,
}) {
  if (activeDialogResolve) {
    closeDialog(mode === 'prompt' ? null : false);
  }

  dom.dialogTitle.textContent = title;
  dom.dialogMessage.textContent = message;
  dom.dialogMessage.classList.toggle('hidden', !message);

  const isPrompt = mode === 'prompt';
  const isAlert = mode === 'alert';

  dom.dialogInput.classList.toggle('hidden', !isPrompt);
  dom.dialogInput.value = defaultValue;
  dom.dialogInput.placeholder = placeholder;

  dom.dialogCancel.classList.toggle('hidden', isAlert);
  dom.dialogCancel.textContent = cancelText;

  dom.dialogConfirm.textContent = confirmText;
  dom.dialogConfirm.className = `btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`;

  dom.dialogOverlay.classList.remove('hidden');

  return new Promise((resolve) => {
    activeDialogResolve = resolve;
    requestAnimationFrame(() => {
      if (isPrompt) {
        dom.dialogInput.focus();
        dom.dialogInput.select();
      } else {
        dom.dialogConfirm.focus();
      }
    });
  });
}

function showPrompt(title, defaultValue = '', placeholder = '', confirmText = 'OK') {
  return showDialog({
    mode: 'prompt',
    title,
    defaultValue,
    placeholder,
    confirmText,
  });
}

function showConfirm(message, title = 'Xác nhận', confirmText = 'Xóa', danger = true) {
  return showDialog({
    mode: 'confirm',
    title,
    message,
    confirmText,
    danger,
  });
}

function showAlert(message, title = 'Thông báo') {
  return showDialog({
    mode: 'alert',
    title,
    message,
    confirmText: 'Đóng',
  });
}

function uid() {
  return crypto.randomUUID();
}

function getActiveSet() {
  return state.sets.find((s) => s.id === state.activeSetId) || null;
}

async function persist() {
  await Store.saveSets(state.sets);
}

function applySyncResult(result) {
  if (!result.changed) return;

  state.sets = result.sets;
  if (!state.sets.some((s) => s.id === state.activeSetId)) {
    state.activeSetId = state.sets.length ? state.sets[0].id : null;
  }
  render();
}

/* ---------- Render ---------- */

function render() {
  renderSets();
  renderMain();
}

function renderSets() {
  dom.setList.innerHTML = '';

  state.sets.forEach((set) => {
    const li = document.createElement('li');
    li.className = 'set-item' + (set.id === state.activeSetId ? ' active' : '');
    li.title = set.name;

    const name = document.createElement('span');
    name.className = 'set-name';
    name.textContent = set.name;

    const count = document.createElement('span');
    count.className = 'set-count';
    count.textContent = set.words.length;

    li.append(name, count);
    li.addEventListener('click', () => selectSet(set.id));
    dom.setList.appendChild(li);
  });
}

function renderMain() {
  const set = getActiveSet();

  dom.emptyState.classList.toggle('hidden', !!set);
  dom.setView.classList.toggle('hidden', !set);

  if (!set) return;

  dom.setName.textContent = set.name;
  dom.wordCount.textContent = `${set.words.length} từ`;
  renderWords(set);
}

const WORD_TYPE_LABELS = {
  n: 'Danh từ (n)',
  v: 'Động từ (v)',
  adj: 'Tính từ (adj)',
  adv: 'Trạng từ (adv)',
  prep: 'Giới từ (prep)',
  conj: 'Liên từ (conj)',
  pron: 'Đại từ (pron)',
  interj: 'Thán từ (interj)',
  phrase: 'Cụm từ (phrase)',
};

function getFilteredWords(set) {
  const q = state.query.trim().toLowerCase();
  return set.words.filter(
    (w) =>
      !q ||
      w.term.toLowerCase().includes(q) ||
      w.definition.toLowerCase().includes(q) ||
      (w.wordType && w.wordType.toLowerCase().includes(q))
  );
}

function renderBulkBar(set, visibleWords) {
  const validIds = new Set(set.words.map((w) => w.id));
  for (const id of Array.from(state.selectedWordIds)) {
    if (!validIds.has(id)) state.selectedWordIds.delete(id);
  }

  const count = state.selectedWordIds.size;
  dom.bulkBar.classList.toggle('hidden', count === 0);
  dom.bulkCount.textContent = `Đã chọn ${count} từ`;

  dom.btnSelectAll.classList.toggle('hidden', visibleWords.length === 0);
  const allVisibleSelected =
    visibleWords.length > 0 && visibleWords.every((w) => state.selectedWordIds.has(w.id));
  dom.btnSelectAll.textContent = allVisibleSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả';
}

function renderWords(set) {
  const words = getFilteredWords(set);

  renderBulkBar(set, words);
  dom.wordList.innerHTML = '';

  if (!words.length) {
    dom.wordEmpty.classList.remove('hidden');
    dom.wordEmpty.textContent = set.words.length
      ? 'Không tìm thấy từ nào khớp với tìm kiếm.'
      : 'Bộ thẻ này chưa có từ nào. Thêm từ mới ở phía trên.';
    return;
  }

  dom.wordEmpty.classList.add('hidden');

  words.forEach((word) => {
    const isSelected = state.selectedWordIds.has(word.id);
    const li = document.createElement('li');
    li.className = 'word-card' + (isSelected ? ' selected' : '');

    const left = document.createElement('div');
    left.className = 'word-left';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'word-check';
    checkbox.checked = isSelected;
    checkbox.setAttribute('aria-label', `Chọn từ ${word.term}`);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.selectedWordIds.add(word.id);
      } else {
        state.selectedWordIds.delete(word.id);
      }
      li.classList.toggle('selected', checkbox.checked);
      renderBulkBar(set, words);
    });

    const main = document.createElement('div');
    main.className = 'word-main';

    const termRow = document.createElement('div');
    termRow.className = 'word-term-row';

    const term = document.createElement('span');
    term.className = 'word-term';
    term.textContent = word.term;
    termRow.appendChild(term);

    if (word.wordType) {
      const badge = document.createElement('span');
      badge.className = 'word-type';
      badge.dataset.type = word.wordType;
      badge.textContent = word.wordType;
      badge.title = WORD_TYPE_LABELS[word.wordType] || word.wordType;
      termRow.appendChild(badge);
    }

    const def = document.createElement('span');
    def.className = 'word-def';
    def.textContent = word.definition || '(chưa có nghĩa)';

    main.append(termRow, def);
    left.append(checkbox, main);

    const actions = document.createElement('div');
    actions.className = 'word-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-ghost btn-xs';
    editBtn.textContent = 'Sửa';
    editBtn.addEventListener('click', () => startEdit(word.id));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-ghost btn-xs danger';
    delBtn.textContent = 'Xóa';
    delBtn.addEventListener('click', () => deleteWord(word.id));

    actions.append(editBtn, delBtn);
    li.append(left, actions);
    dom.wordList.appendChild(li);
  });
}

/* ---------- Sets ---------- */

async function createSet() {
  const name = await showPrompt('Tên bộ thẻ mới', '', 'Nhập tên bộ thẻ...', 'Tạo');
  if (name === null) return;

  const trimmed = name.trim();
  if (!trimmed) return;

  const set = {
    id: uid(),
    name: trimmed.slice(0, 100),
    createdAt: Date.now(),
    words: [],
  };

  state.sets.push(set);
  state.activeSetId = set.id;
  state.selectedWordIds.clear();
  resetForm();
  state.query = '';
  dom.searchInput.value = '';

  await persist();
  render();
}

function selectSet(id) {
  state.activeSetId = id;
  state.selectedWordIds.clear();
  state.query = '';
  dom.searchInput.value = '';
  resetForm();
  render();
}

async function renameSet() {
  const set = getActiveSet();
  if (!set) return;

  const name = await showPrompt('Đổi tên bộ thẻ', set.name, 'Nhập tên bộ thẻ...', 'Lưu');
  if (name === null) return;

  const trimmed = name.trim();
  if (!trimmed) return;

  set.name = trimmed.slice(0, 100);
  await persist();
  render();
}

/* ---------- Words ---------- */

function startEdit(wordId) {
  const set = getActiveSet();
  if (!set) return;

  const word = set.words.find((w) => w.id === wordId);
  if (!word) return;

  state.editingWordId = wordId;
  dom.inputTerm.value = word.term;
  dom.inputType.value = word.wordType || '';
  dom.inputDef.value = word.definition;
  dom.formTitle.textContent = 'Sửa từ';
  dom.btnSaveWord.textContent = 'Lưu';
  dom.btnCancelEdit.classList.remove('hidden');
  dom.inputTerm.focus();
}

function resetForm() {
  state.editingWordId = null;
  dom.wordForm.reset();
  dom.formTitle.textContent = 'Thêm từ mới';
  dom.btnSaveWord.textContent = 'Thêm';
  dom.btnCancelEdit.classList.add('hidden');
}

async function deleteWord(wordId) {
  const set = getActiveSet();
  if (!set) return;

  const word = set.words.find((w) => w.id === wordId);
  if (!word) return;

  const ok = await showConfirm(`Xóa từ "${word.term}"?`, 'Xóa từ');
  if (!ok) return;

  set.words = set.words.filter((w) => w.id !== wordId);
  state.selectedWordIds.delete(wordId);
  if (state.editingWordId === wordId) resetForm();

  await persist();
  render();
}

async function deleteSelectedWords() {
  const set = getActiveSet();
  if (!set || !state.selectedWordIds.size) return;

  const count = state.selectedWordIds.size;
  const msg =
    count === 1
      ? `Xóa từ "${(set.words.find((w) => state.selectedWordIds.has(w.id)) || {}).term || ''}"?`
      : `Xóa ${count} từ đã chọn?`;

  const ok = await showConfirm(msg, 'Xóa từ đã chọn');
  if (!ok) return;

  set.words = set.words.filter((w) => !state.selectedWordIds.has(w.id));
  if (state.editingWordId && state.selectedWordIds.has(state.editingWordId)) {
    resetForm();
  }
  state.selectedWordIds.clear();

  await persist();
  render();
}

function toggleSelectAll() {
  const set = getActiveSet();
  if (!set) return;

  const visible = getFilteredWords(set);
  const allSelected = visible.length > 0 && visible.every((w) => state.selectedWordIds.has(w.id));

  if (allSelected) {
    visible.forEach((w) => state.selectedWordIds.delete(w.id));
  } else {
    visible.forEach((w) => state.selectedWordIds.add(w.id));
  }
  renderWords(set);
}

function clearSelection() {
  state.selectedWordIds.clear();
  const set = getActiveSet();
  if (set) renderWords(set);
}

async function submitWord(event) {
  event.preventDefault();

  const set = getActiveSet();
  if (!set) return;

  const term = dom.inputTerm.value.trim();
  const wordType = dom.inputType.value.trim().slice(0, 30);
  const definition = dom.inputDef.value.trim();

  if (!term) {
    dom.inputTerm.focus();
    return;
  }

  if (state.editingWordId) {
    const word = set.words.find((w) => w.id === state.editingWordId);
    if (word) {
      word.term = term.slice(0, 200);
      word.wordType = wordType;
      word.definition = definition.slice(0, 500);
      word.updatedAt = Date.now();
    }
  } else {
    set.words.push({
      id: uid(),
      term: term.slice(0, 200),
      wordType,
      definition: definition.slice(0, 500),
      createdAt: Date.now(),
    });
  }

  resetForm();
  dom.inputTerm.focus();

  await persist();
  render();
}

/* ---------- Study ---------- */

const BASE_MODES = ['flip', 'type', 'quiz'];

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildCardModes(count) {
  return Array.from({ length: count }, () =>
    BASE_MODES[Math.floor(Math.random() * BASE_MODES.length)]
  );
}

function openStudy() {
  const set = getActiveSet();
  if (!set) return;

  if (!set.words.length) {
    showAlert('Bộ thẻ chưa có từ nào để học.');
    return;
  }

  state.study = {
    cards: shuffleArray(set.words),
    allWords: set.words.slice(),
    index: 0,
    cardModes: buildCardModes(set.words.length),
    answered: 0,
    correct: 0,
    checked: false,
  };
  dom.studySetName.textContent = set.name;
  dom.studyOverlay.classList.remove('hidden');
  showCard();
}

let fxRafId = null;
let fxParticles = [];

function stopFireworks() {
  if (fxRafId) {
    cancelAnimationFrame(fxRafId);
    fxRafId = null;
  }
  fxParticles = [];
  if (dom.fxCanvas) {
    const ctx = dom.fxCanvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, dom.fxCanvas.width, dom.fxCanvas.height);
  }
}

function spawnBurst(cx, cy, count) {
  const colors = ['#ffe599', '#ff94ae', '#99e2b4', '#a5d8ff', '#d8ccff', '#ffbe98'];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
    const speed = 2.6 + Math.random() * 5.2;
    fxParticles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.4,
      size: 5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.016 + Math.random() * 0.014,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.25,
      shape: i % 3 === 0 ? 'circle' : 'square',
    });
  }
}

function launchFireworks(targetBox) {
  const canvas = dom.fxCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (targetBox) {
    targetBox.classList.remove('celebrate');
    void targetBox.offsetWidth;
    targetBox.classList.add('celebrate');
  }

  const w = canvas.width;
  const h = canvas.height;
  spawnBurst(w * 0.25, h * 0.32, 26);
  spawnBurst(w * 0.75, h * 0.32, 26);
  setTimeout(() => {
    if (!dom.studyOverlay.classList.contains('hidden')) {
      spawnBurst(w * 0.5, h * 0.24, 30);
    }
  }, 140);

  if (fxRafId) return;

  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fxParticles = fxParticles.filter((p) => p.alpha > 0.02);

    for (const p of fxParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.14;
      p.vx *= 0.985;
      p.rot += p.vRot;
      p.alpha -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }

    if (fxParticles.length) {
      fxRafId = requestAnimationFrame(tick);
    } else {
      fxRafId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  fxRafId = requestAnimationFrame(tick);
}

function closeStudy() {
  stopFireworks();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  dom.studyOverlay.classList.add('hidden');
  dom.flashcard.classList.remove('flipped');
}

function speakWord(text) {
  const clean = String(text || '').trim();
  if (!clean || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(clean);
  const hasVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean);
  utter.lang = hasVi ? 'vi-VN' : 'en-US';
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

function speakCurrentCard() {
  const card = state.study.cards[state.study.index];
  if (card) speakWord(card.term);
}

function getCurrentCardMode() {
  return state.study.cardModes[state.study.index] || 'flip';
}

function showCard() {
  const { cards, index } = state.study;
  const card = cards[index];
  if (!card) return;

  const currentMode = getCurrentCardMode();
  state.study.checked = false;
  stopFireworks();
  dom.typeBox.classList.remove('celebrate');
  dom.quizBox.classList.remove('celebrate');

  dom.studyProgress.textContent = `${index + 1} / ${cards.length}`;
  dom.btnPrev.disabled = index === 0;
  dom.btnNext.disabled = false;

  dom.flashcard.classList.toggle('hidden', currentMode !== 'flip');
  dom.typeBox.classList.toggle('hidden', currentMode !== 'type');
  dom.quizBox.classList.toggle('hidden', currentMode !== 'quiz');
  dom.btnFlip.classList.toggle('hidden', currentMode !== 'flip');

  const typeLabel = card.wordType ? (WORD_TYPE_LABELS[card.wordType] || card.wordType) : '';

  if (currentMode === 'flip') {
    dom.flashcard.classList.remove('flipped');
    dom.cardType.textContent = typeLabel;
    dom.cardType.dataset.type = card.wordType || '';
    dom.cardType.classList.toggle('hidden', !card.wordType);
    dom.cardTerm.textContent = card.term;
    dom.cardDef.textContent = card.definition || '(chưa có nghĩa)';
    dom.studyTip.textContent = 'Mẹo: dùng phím ← → để chuyển thẻ, Space để lật, S để nghe';
  } else if (currentMode === 'type') {
    dom.typeWordType.textContent = typeLabel;
    dom.typeWordType.dataset.type = card.wordType || '';
    dom.typeWordType.classList.toggle('hidden', !card.wordType);
    dom.typePrompt.textContent = card.definition || '(chưa có nghĩa - hãy gõ từ)';
    dom.typeInput.value = '';
    dom.typeInput.disabled = false;
    dom.btnCheckType.disabled = false;
    dom.typeFeedback.classList.add('hidden');
    dom.typeFeedback.className = 'study-feedback hidden';
    dom.studyTip.textContent = 'Mẹo: gõ từ rồi nhấn Enter để kiểm tra, Enter lần nữa để qua thẻ tiếp';
    requestAnimationFrame(() => dom.typeInput.focus());
  } else if (currentMode === 'quiz') {
    dom.quizWordType.textContent = typeLabel;
    dom.quizWordType.dataset.type = card.wordType || '';
    dom.quizWordType.classList.toggle('hidden', !card.wordType);
    dom.quizPrompt.textContent = card.term;
    dom.quizFeedback.classList.add('hidden');
    dom.quizFeedback.className = 'study-feedback hidden';
    renderQuizOptions(card);
    dom.studyTip.textContent = 'Mẹo: nhấn phím 1–4 để chọn nhanh đáp án, → để qua thẻ tiếp';
  }

  speakWord(card.term);
}

function renderQuizOptions(card) {
  const correctDef = card.definition || '(chưa có nghĩa)';
  const distractors = shuffleArray(
    state.study.allWords
      .filter((w) => w.id !== card.id)
      .map((w) => w.definition || '(chưa có nghĩa)')
      .filter((def, i, arr) => def !== correctDef && arr.indexOf(def) === i)
  ).slice(0, 3);

  const options = shuffleArray([
    { text: correctDef, isCorrect: true },
    ...distractors.map((text) => ({ text, isCorrect: false })),
  ]);

  dom.quizOptions.innerHTML = '';
  options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-opt';
    btn.dataset.correct = opt.isCorrect ? '1' : '0';
    btn.textContent = `${idx + 1}. ${opt.text}`;
    btn.addEventListener('click', () => handleQuizPick(btn, opt.isCorrect, correctDef));
    dom.quizOptions.appendChild(btn);
  });
}

function handleQuizPick(pickedBtn, isCorrect, correctDef) {
  if (state.study.checked) return;
  state.study.checked = true;
  state.study.answered += 1;
  if (isCorrect) state.study.correct += 1;

  dom.quizOptions.querySelectorAll('.quiz-opt').forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.correct === '1') {
      btn.classList.add('correct');
    } else if (btn === pickedBtn) {
      btn.classList.add('wrong');
    }
  });

  dom.quizFeedback.textContent = isCorrect
    ? 'Chính xác!'
    : `Chưa đúng! Đáp án: ${correctDef}`;
  dom.quizFeedback.className = `study-feedback ${isCorrect ? 'ok' : 'err'}`;
  if (isCorrect) launchFireworks(dom.quizBox);
}

function submitTypeAnswer(event) {
  event.preventDefault();
  const card = state.study.cards[state.study.index];
  if (!card) return;

  if (state.study.checked) {
    nextCard();
    return;
  }

  const answer = dom.typeInput.value.trim().toLowerCase();
  if (!answer) {
    dom.typeInput.focus();
    return;
  }

  const expected = card.term.trim().toLowerCase();
  const isCorrect = answer === expected;

  state.study.checked = true;
  state.study.answered += 1;
  if (isCorrect) state.study.correct += 1;

  dom.typeInput.disabled = true;
  dom.btnCheckType.disabled = true;
  dom.typeFeedback.textContent = isCorrect
    ? 'Chính xác!'
    : `Chưa đúng! Đáp án: ${card.term}`;
  dom.typeFeedback.className = `study-feedback ${isCorrect ? 'ok' : 'err'}`;
  if (isCorrect) launchFireworks(dom.typeBox);
}

function flipCard() {
  if (getCurrentCardMode() !== 'flip') return;
  dom.flashcard.classList.toggle('flipped');
}

async function nextCard() {
  const { cards, index, answered, correct } = state.study;
  if (index < cards.length - 1) {
    state.study.index += 1;
    showCard();
  } else {
    const summary = answered > 0
      ? `Bạn đã học hết bộ thẻ! (Đúng ${correct}/${answered} câu)`
      : 'Bạn đã học hết bộ thẻ.';
    await showAlert(summary, 'Hoàn thành');
    closeStudy();
  }
}

function prevCard() {
  if (state.study.index > 0) {
    state.study.index -= 1;
    showCard();
  }
}

/* ---------- Export / Import ---------- */

function safeFileName(name) {
  return String(name || 'flashcards')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'flashcards';
}

function getExportTarget() {
  const set = getActiveSet();
  if (!set) {
    showAlert(
      state.sets.length ? 'Vui lòng chọn một bộ thẻ để xuất.' : 'Chưa có dữ liệu để xuất.'
    );
    return null;
  }
  return set;
}

function openExportModal() {
  const set = getExportTarget();
  if (!set) return;
  dom.exportDesc.textContent = `Xuất bộ thẻ "${set.name}" (${set.words.length} từ) sang:`;
  dom.exportOverlay.classList.remove('hidden');
}

function closeExportModal() {
  dom.exportOverlay.classList.add('hidden');
}

function exportJson() {
  closeExportModal();
  const set = getExportTarget();
  if (!set) return;

  const payload = {
    app: 'flashcards',
    version: 1,
    exportedAt: new Date().toISOString(),
    sets: [set],
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName(set.name)}-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportExcel() {
  closeExportModal();
  const set = getExportTarget();
  if (!set) return;
  if (typeof XLSX === 'undefined') {
    showAlert('Không tìm thấy thư viện Excel.', 'Lỗi');
    return;
  }

  const rows = set.words.length
    ? set.words.map((w) => ({
        'Bộ thẻ': set.name,
        'Từ / Cụm từ': w.term || '',
        'Loại từ': w.wordType || '',
        'Nghĩa / Định nghĩa': w.definition || '',
      }))
    : [
        {
          'Bộ thẻ': set.name,
          'Từ / Cụm từ': '',
          'Loại từ': '',
          'Nghĩa / Định nghĩa': '',
        },
      ];

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Flashcards');

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${safeFileName(set.name)}-${date}.xlsx`);
}

async function exportPdf() {
  closeExportModal();
  const set = getExportTarget();
  if (!set) return;

  await chrome.storage.local.set({
    printPayload: {
      exportedAt: new Date().toISOString(),
      sets: [set],
    },
  });

  window.open(chrome.runtime.getURL('print.html'), '_blank');
}

function normalizeWordType(raw) {
  const val = String(raw || '').trim();
  if (!val) return '';
  const lower = val.toLowerCase();
  const map = {
    'danh từ': 'n', 'danh tu': 'n', 'noun': 'n', 'n': 'n',
    'động từ': 'v', 'dong tu': 'v', 'verb': 'v', 'v': 'v',
    'tính từ': 'adj', 'tinh tu': 'adj', 'adjective': 'adj', 'adj': 'adj',
    'trạng từ': 'adv', 'trang tu': 'adv', 'adverb': 'adv', 'adv': 'adv',
    'giới từ': 'prep', 'gioi tu': 'prep', 'preposition': 'prep', 'prep': 'prep',
    'liên từ': 'conj', 'lien tu': 'conj', 'conjunction': 'conj', 'conj': 'conj',
    'đại từ': 'pron', 'dai tu': 'pron', 'pronoun': 'pron', 'pron': 'pron',
    'thán từ': 'interj', 'than tu': 'interj', 'interjection': 'interj', 'interj': 'interj',
    'cụm từ': 'phrase', 'cum tu': 'phrase', 'phrase': 'phrase',
  };
  return (map[lower] || val).slice(0, 30);
}

function parseExcelWorkbook(buffer, fileName) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const setsMap = new Map();
  const baseName = fileName.replace(/\.(xlsx|xls|csv)$/i, '').slice(0, 100) || 'Bộ thẻ Excel';

  const findHeaderKey = (keys, candidates) =>
    keys.find((k) => candidates.includes(k.trim().toLowerCase()));

  wb.SheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!rows.length) return;

    const keys = Object.keys(rows[0]);
    const setKey = findHeaderKey(keys, ['bộ thẻ', 'bo the', 'set', 'tên bộ thẻ', 'ten bo the', 'deck']);
    const termKey = findHeaderKey(keys, ['từ / cụm từ', 'từ', 'tu', 'tu / cum tu', 'term', 'word', 'vocabulary', 'front']) || keys[0];
    const typeKey = findHeaderKey(keys, ['loại từ', 'loai tu', 'wordtype', 'word type', 'type', 'pos', 'part of speech']);
    const defKey =
      findHeaderKey(keys, ['nghĩa / định nghĩa', 'nghĩa', 'nghia', 'định nghĩa', 'dinh nghia', 'definition', 'meaning', 'back']) ||
      (keys.length > 2 && !setKey && !typeKey ? keys[2] : keys[1]);

    const fallbackSetName = wb.SheetNames.length > 1 || sheetName.toLowerCase() !== 'sheet1'
      ? sheetName.slice(0, 100)
      : baseName;

    rows.forEach((row) => {
      const setName = String(setKey ? row[setKey] : fallbackSetName).trim().slice(0, 100) || fallbackSetName;
      const term = String(termKey ? row[termKey] : '').trim().slice(0, 200);
      const wordType = normalizeWordType(typeKey ? row[typeKey] : '');
      const definition = String(defKey && defKey !== termKey ? row[defKey] : '').trim().slice(0, 500);

      if (!setsMap.has(setName)) {
        setsMap.set(setName, {
          id: uid(),
          name: setName,
          createdAt: Date.now(),
          words: [],
        });
      }

      if (term) {
        setsMap.get(setName).words.push({
          id: uid(),
          term,
          wordType,
          definition,
          createdAt: Date.now(),
        });
      }
    });
  });

  return Array.from(setsMap.values()).filter((s) => s.words.length > 0 || setsMap.size === 1);
}

async function importFile(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;

  try {
    let imported = [];
    const isExcel = /\.(xlsx|xls|csv)$/i.test(file.name);

    if (isExcel) {
      if (typeof XLSX === 'undefined') {
        throw new Error('xlsx_missing');
      }
      const buffer = await file.arrayBuffer();
      imported = parseExcelWorkbook(buffer, file.name);
      if (!imported.length) {
        throw new Error('empty_excel');
      }
    } else {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || !Array.isArray(data.sets)) {
        throw new Error('invalid');
      }

      imported = data.sets.map((s) => ({
        id: uid(),
        name: String(s.name || 'Bộ thẻ').slice(0, 100),
        createdAt: Date.now(),
        words: Array.isArray(s.words)
          ? s.words
              .filter((w) => w && typeof w.term === 'string')
              .map((w) => ({
                id: uid(),
                term: String(w.term).slice(0, 200),
                wordType: String(w.wordType || '').slice(0, 30),
                definition: String(w.definition || '').slice(0, 500),
                createdAt: Date.now(),
              }))
          : [],
      }));
    }

    state.sets = state.sets.concat(imported);
    if (!state.activeSetId && imported.length) {
      state.activeSetId = imported[0].id;
    }

    await persist();
    render();
    await showAlert(`Đã nhập ${imported.length} bộ thẻ.`, 'Nhập thành công');
  } catch (err) {
    await showAlert('File không hợp lệ hoặc không có dữ liệu từ vựng.', 'Lỗi');
  }
}

/* ---------- Events ---------- */

dom.btnAddSet.addEventListener('click', createSet);
dom.btnCreateFirst.addEventListener('click', createSet);
dom.btnRenameSet.addEventListener('click', renameSet);

dom.wordForm.addEventListener('submit', submitWord);
dom.btnCancelEdit.addEventListener('click', resetForm);

dom.searchInput.addEventListener('input', () => {
  state.query = dom.searchInput.value;
  const set = getActiveSet();
  if (set) renderWords(set);
});

dom.btnSelectAll.addEventListener('click', toggleSelectAll);
dom.btnClearSelect.addEventListener('click', clearSelection);
dom.btnDeleteSelected.addEventListener('click', deleteSelectedWords);

dom.btnStudy.addEventListener('click', openStudy);
dom.btnCloseStudy.addEventListener('click', closeStudy);
dom.flashcard.addEventListener('click', flipCard);
dom.btnSpeakFlip.addEventListener('click', (event) => {
  event.stopPropagation();
  speakCurrentCard();
});
dom.btnSpeakType.addEventListener('click', speakCurrentCard);
dom.btnSpeakQuiz.addEventListener('click', speakCurrentCard);
dom.btnFlip.addEventListener('click', flipCard);
dom.btnNext.addEventListener('click', nextCard);
dom.btnPrev.addEventListener('click', prevCard);
dom.typeForm.addEventListener('submit', submitTypeAnswer);

dom.dialogBox.addEventListener('submit', (event) => {
  event.preventDefault();
  const isPrompt = !dom.dialogInput.classList.contains('hidden');
  closeDialog(isPrompt ? dom.dialogInput.value : true);
});

const cancelActiveDialog = () => {
  const isPrompt = !dom.dialogInput.classList.contains('hidden');
  closeDialog(isPrompt ? null : false);
};

dom.dialogCancel.addEventListener('click', cancelActiveDialog);
dom.dialogClose.addEventListener('click', cancelActiveDialog);
dom.dialogOverlay.addEventListener('click', (event) => {
  if (event.target === dom.dialogOverlay) {
    cancelActiveDialog();
  }
});

document.addEventListener('keydown', (event) => {
  if (!dom.dialogOverlay.classList.contains('hidden')) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelActiveDialog();
    }
    return;
  }

  if (!dom.exportOverlay.classList.contains('hidden')) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeExportModal();
    }
    return;
  }

  if (dom.studyOverlay.classList.contains('hidden')) return;

  const isTyping = document.activeElement === dom.typeInput;
  const currentMode = getCurrentCardMode();

  if (event.key === 'Escape') {
    closeStudy();
  } else if (currentMode === 'type' && state.study.checked && event.key === 'Enter') {
    event.preventDefault();
    nextCard();
  } else if (isTyping) {
    return;
  } else if (event.key === 'ArrowRight') {
    nextCard();
  } else if (event.key === 'ArrowLeft') {
    prevCard();
  } else if (event.key === ' ' && currentMode === 'flip') {
    event.preventDefault();
    flipCard();
  } else if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    speakCurrentCard();
  } else if (currentMode === 'quiz' && ['1', '2', '3', '4'].includes(event.key)) {
    const idx = Number(event.key) - 1;
    const btn = dom.quizOptions.querySelectorAll('.quiz-opt')[idx];
    if (btn && !btn.disabled) btn.click();
  }
});

dom.btnExport.addEventListener('click', openExportModal);
dom.exportClose.addEventListener('click', closeExportModal);
dom.exportOverlay.addEventListener('click', (event) => {
  if (event.target === dom.exportOverlay) {
    closeExportModal();
  }
});
dom.btnExportJson.addEventListener('click', exportJson);
dom.btnExportExcel.addEventListener('click', exportExcel);
dom.btnExportPdf.addEventListener('click', exportPdf);

dom.btnImport.addEventListener('click', () => dom.fileImport.click());
dom.fileImport.addEventListener('change', importFile);

function renderQuickCapture(isEnabled) {
  dom.quickCaptureToggle.dataset.enabled = isEnabled ? 'true' : 'false';
  dom.quickCaptureBadge.textContent = isEnabled ? 'BẬT' : 'TẮT';
}

dom.quickCaptureToggle.addEventListener('click', async () => {
  const next = dom.quickCaptureToggle.dataset.enabled !== 'true';
  await chrome.storage.local.set({ quickCaptureEnabled: next });
  renderQuickCapture(next);
});

/* ---------- Init ---------- */

async function init() {
  const qc = await chrome.storage.local.get('quickCaptureEnabled');
  renderQuickCapture(qc.quickCaptureEnabled !== false);

  const local = await Store.getLocal();
  state.sets = local.sets;
  if (state.sets.length) {
    state.activeSetId = state.sets[0].id;
  }
  render();
  dom.inputTerm.focus();

  applySyncResult(await Store.sync());
}

init();
