'use strict';

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

async function renderPrint() {
  const data = await chrome.storage.local.get('printPayload');
  const payload = data.printPayload;
  const content = document.getElementById('printContent');
  const meta = document.getElementById('printMeta');

  if (!payload || !Array.isArray(payload.sets) || !payload.sets.length) {
    meta.textContent = 'Không có dữ liệu để hiển thị.';
    return;
  }

  const totalWords = payload.sets.reduce((sum, s) => sum + (s.words ? s.words.length : 0), 0);
  meta.textContent = `Tổng cộng: ${payload.sets.length} bộ thẻ • ${totalWords} từ • Xuất lúc ${new Date(payload.exportedAt).toLocaleString('vi-VN')}`;

  payload.sets.forEach((set) => {
    const section = document.createElement('section');
    section.className = 'set-block';

    const title = document.createElement('h2');
    title.className = 'set-title';
    title.textContent = `${set.name} (${(set.words || []).length} từ)`;
    section.appendChild(title);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th class="col-num">#</th><th>Từ / Cụm từ</th><th class="col-type">Loại từ</th><th>Nghĩa / Định nghĩa</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    (set.words || []).forEach((w, idx) => {
      const tr = document.createElement('tr');

      const tdNum = document.createElement('td');
      tdNum.className = 'col-num';
      tdNum.textContent = String(idx + 1);

      const tdTerm = document.createElement('td');
      tdTerm.textContent = w.term || '';

      const tdType = document.createElement('td');
      tdType.className = 'col-type';
      tdType.textContent = w.wordType ? (WORD_TYPE_LABELS[w.wordType] || w.wordType) : '';

      const tdDef = document.createElement('td');
      tdDef.textContent = w.definition || '';

      tr.append(tdNum, tdTerm, tdType, tdDef);
      tbody.appendChild(tr);
    });

    if (!set.words || !set.words.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = '(Bộ thẻ chưa có từ nào)';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    section.appendChild(table);
    content.appendChild(section);
  });

  setTimeout(() => window.print(), 150);
}

document.getElementById('btnPrint').addEventListener('click', () => window.print());
document.getElementById('btnClose').addEventListener('click', () => window.close());

renderPrint();
