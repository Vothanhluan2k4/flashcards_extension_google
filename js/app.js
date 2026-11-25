'use strict';

const state = {
  sets: [],
  activeSetId: null,
  editingWordId: null,
  query: '',
  study: { cards: [], index: 0 },
};

const el = (id) => document.getElementById(id);

const dom = {
  setList: el('setList'),
  btnAddSet: el('btnAddSet'),
  btnExport: el('btnExport'),
  btnImport: el('btnImport'),
  fileImport: el('fileImport'),

  syncStatus: el('syncStatus'),
  syncText: el('syncText'),

  emptyState: el('emptyState'),
  btnCreateFirst: el('btnCreateFirst'),

  setView: el('setView'),
  setName: el('setName'),
  wordCount: el('wordCount'),
  btnRenameSet: el('btnRenameSet'),
  btnDeleteSet: el('btnDeleteSet'),
  btnStudy: el('btnStudy'),

  wordForm: el('wordForm'),
  formTitle: el('formTitle'),
  inputTerm: el('inputTerm'),
  inputType: el('inputType'),
  inputDef: el('inputDef'),
  btnSaveWord: el('btnSaveWord'),
  btnCancelEdit: el('btnCancelEdit'),

  searchInput: el('searchInput'),
  wordList: el('wordList'),
  wordEmpty: el('wordEmpty'),

  studyOverlay: el('studyOverlay'),
  studySetName: el('studySetName'),
  studyProgress: el('studyProgress'),
  btnCloseStudy: el('btnCloseStudy'),
  flashcard: el('flashcard'),
  cardType: el('cardType'),
  cardTerm: el('cardTerm'),
  cardDef: el('cardDef'),
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
  const ok = await Store.saveSets(state.sets);
  setSyncStatus(ok ? 'online' : 'offline');
}

function setSyncStatus(mode) {
  const labels = {
    pending: 'Đang kết nối...',
    online: 'Đã đồng bộ MongoDB',
    offline: 'Ngoại tuyến - lưu cục bộ',
  };
  dom.syncStatus.dataset.state = mode;
  dom.syncText.textContent = labels[mode] || '';
}

function applySyncResult(result) {
  setSyncStatus(result.online ? 'online' : 'offline');

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

function renderWords(set) {
  const q = state.query.trim().toLowerCase();
  const words = set.words.filter(
    (w) =>
      !q ||
      w.term.toLowerCase().includes(q) ||
      w.definition.toLowerCase().includes(q) ||
      (w.wordType && w.wordType.toLowerCase().includes(q))
  );

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
    const li = document.createElement('li');
    li.className = 'word-card';

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
      badge.textContent = word.wordType;
      badge.title = WORD_TYPE_LABELS[word.wordType] || word.wordType;
      termRow.appendChild(badge);
    }

    const def = document.createElement('span');
    def.className = 'word-def';
    def.textContent = word.definition || '(chưa có nghĩa)';

    main.append(termRow, def);

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
    li.append(main, actions);
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
  resetForm();
  state.query = '';
  dom.searchInput.value = '';

  await persist();
  render();
}

function selectSet(id) {
  state.activeSetId = id;
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

async function deleteSet() {
  const set = getActiveSet();
  if (!set) return;

  const ok = await showConfirm(`Xóa bộ "${set.name}" và ${set.words.length} từ bên trong?`, 'Xóa bộ thẻ');
  if (!ok) return;

  state.sets = state.sets.filter((s) => s.id !== set.id);
  state.activeSetId = state.sets.length ? state.sets[0].id : null;
  resetForm();
  state.query = '';
  dom.searchInput.value = '';

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
  if (state.editingWordId === wordId) resetForm();

  await persist();
  render();
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

function openStudy() {
  const set = getActiveSet();
  if (!set) return;

  if (!set.words.length) {
    showAlert('Bộ thẻ chưa có từ nào để học.');
    return;
  }

  state.study = { cards: set.words.slice(), index: 0 };
  dom.studySetName.textContent = set.name;
  dom.studyOverlay.classList.remove('hidden');
  showCard();
}

function closeStudy() {
  dom.studyOverlay.classList.add('hidden');
  dom.flashcard.classList.remove('flipped');
}

function showCard() {
  const { cards, index } = state.study;
  const card = cards[index];
  if (!card) return;

  dom.flashcard.classList.remove('flipped');
  dom.cardType.textContent = card.wordType ? (WORD_TYPE_LABELS[card.wordType] || card.wordType) : '';
  dom.cardType.classList.toggle('hidden', !card.wordType);
  dom.cardTerm.textContent = card.term;
  dom.cardDef.textContent = card.definition || '(chưa có nghĩa)';
  dom.studyProgress.textContent = `${index + 1} / ${cards.length}`;
  dom.btnPrev.disabled = index === 0;
  dom.btnNext.disabled = index === cards.length - 1;
}

function flipCard() {
  dom.flashcard.classList.toggle('flipped');
}

async function nextCard() {
  const { cards, index } = state.study;
  if (index < cards.length - 1) {
    state.study.index += 1;
    showCard();
  } else {
    await showAlert('Bạn đã học hết bộ thẻ.', 'Hoàn thành');
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

function exportJson() {
  if (!state.sets.length) {
    showAlert('Chưa có dữ liệu để xuất.');
    return;
  }

  const payload = {
    app: 'flashcards',
    version: 1,
    exportedAt: new Date().toISOString(),
    sets: state.sets,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);

  const a = document.createElement('a');
  a.href = url;
  a.download = `flashcards-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importJson(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data || !Array.isArray(data.sets)) {
      throw new Error('invalid');
    }

    const imported = data.sets.map((s) => ({
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

    state.sets = state.sets.concat(imported);
    if (!state.activeSetId && imported.length) {
      state.activeSetId = imported[0].id;
    }

    await persist();
    render();
    await showAlert(`Đã nhập ${imported.length} bộ thẻ.`, 'Nhập thành công');
  } catch (err) {
    await showAlert('File JSON không hợp lệ.', 'Lỗi');
  }
}

/* ---------- Events ---------- */

dom.btnAddSet.addEventListener('click', createSet);
dom.btnCreateFirst.addEventListener('click', createSet);
dom.btnRenameSet.addEventListener('click', renameSet);
dom.btnDeleteSet.addEventListener('click', deleteSet);

dom.wordForm.addEventListener('submit', submitWord);
dom.btnCancelEdit.addEventListener('click', resetForm);

dom.searchInput.addEventListener('input', () => {
  state.query = dom.searchInput.value;
  const set = getActiveSet();
  if (set) renderWords(set);
});

dom.btnStudy.addEventListener('click', openStudy);
dom.btnCloseStudy.addEventListener('click', closeStudy);
dom.flashcard.addEventListener('click', flipCard);
dom.btnFlip.addEventListener('click', flipCard);
dom.btnNext.addEventListener('click', nextCard);
dom.btnPrev.addEventListener('click', prevCard);

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

  if (dom.studyOverlay.classList.contains('hidden')) return;

  if (event.key === 'ArrowRight') {
    nextCard();
  } else if (event.key === 'ArrowLeft') {
    prevCard();
  } else if (event.key === ' ') {
    event.preventDefault();
    flipCard();
  } else if (event.key === 'Escape') {
    closeStudy();
  }
});

dom.btnExport.addEventListener('click', exportJson);
dom.btnImport.addEventListener('click', () => dom.fileImport.click());
dom.fileImport.addEventListener('change', importJson);

dom.syncStatus.addEventListener('click', async () => {
  setSyncStatus('pending');
  applySyncResult(await Store.sync());
});

/* ---------- Init ---------- */

async function init() {
  const local = await Store.getLocal();
  state.sets = local.sets;
  if (state.sets.length) {
    state.activeSetId = state.sets[0].id;
  }
  render();
  dom.inputTerm.focus();

  setSyncStatus('pending');
  applySyncResult(await Store.sync());

  const userId = await Store.getUserId();
  dom.syncStatus.title = `ID người dùng ẩn danh: ${userId}\nNhấn để đồng bộ lại`;
}

init();
