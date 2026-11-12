'use strict';

const paths = {
  wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8h15m3 3h-5a2.5 2.5 0 0 0 0 5h5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  swap: '<path d="M4 8h15m-4-4 4 4-4 4m5 4H5m4-4-4 4 4 4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M3 4v16h18M8 16v-4m5 4V8m5 8v-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  out: '<path d="M7 17 17 7m-7 0h7v7"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  warning: '<path d="m12 3 10 17H2L12 3Zm0 6v4m0 3h.01"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  food: '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M18 21V3c-3 3-4 7-3 10h3"/>',
  book: '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>',
  home: '<path d="m3 10 9-7 9 7m-2-2v12H5V8m5 12v-6h4v6"/>'
};
const icon = name => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + paths[name] + '</svg>';
const escapeHTML = value => String(value).replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'}).format(value);
const dateLabel = value => value.split('-').reverse().join('/');
const monthLabel = value => value.slice(5) + '/' + value.slice(0, 4);
const categoriesIcon = {'Ăn uống':'food','Nhà ở':'home','Học tập':'book','Di chuyển':'swap'};
const storageKey = 'vi-nho-wallet-v1';
const today = Wallet.localDate();
// Keep legacy income records when changing the visible expense data.
const legacyIncome = rows => rows.filter(row => row.type === 'in');
const expenseRows = rows => rows.filter(row => row.type === 'out');
let storageError = false;
function load() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return Wallet.seed(today);
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Array.isArray(value.transactions) || !Array.isArray(value.budgets)) throw new Error('Invalid wallet');
    const validRows = value.transactions.every(row => row && typeof row.id === 'string' &&
      ['in','out'].includes(row.type) && (row.type === 'in' ? Wallet.income : Wallet.expenses).includes(row.category) &&
      typeof row.note === 'string' && typeof row.date === 'string' && Wallet.validDate(row.date) && Wallet.validAmount(row.amount));
    const validBudgets = value.budgets.every(row => row && Wallet.validMonth(row.month) &&
      Wallet.expenses.includes(row.category) && Wallet.validAmount(row.cap));
    if (!validRows || !validBudgets) throw new Error('Invalid wallet records');
    return value;
  } catch {
    storageError = true;
    return Wallet.seed(today);
  }
}
let state = load();
let month = today.slice(0,7);
let page = 'home';
let filter = 'all';
let query = '';
let toastTimer;
const pages = {
  home:['Tổng quan','Tổng quan chi tiêu','Theo dõi chi tiêu và ngân sách của bạn trong tháng.'],
  transactions:['Khoản chi','Khoản chi của bạn','Ghi lại, tìm và điều chỉnh các khoản chi theo tháng.'],
  budgets:['Ngân sách','Ngân sách tháng','Đặt hạn mức cho từng danh mục và xem số tiền còn lại.'],
  reports:['Báo cáo','Báo cáo chi tiêu','Xem mức chi theo thời gian và nhóm chi tiêu lớn nhất trong tháng.']
};

function save(next, errorElement) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    state = next;
    storageError = false;
    return true;
  } catch {
    errorElement.textContent = 'Trình duyệt không lưu được dữ liệu. Hãy kiểm tra cài đặt lưu trữ rồi thử lại.';
    return false;
  }
}

function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000);
}

function panel(title, description, content, extra = '', cls = '') {
  return '<section class="panel ' + cls + '"><div class="panel-head"><div><h2>' + title + '</h2><p>' +
    description + '</p></div>' + extra + '</div>' + content + '</section>';
}
function empty(title, copy) {
  return '<div class="empty"><strong>' + title + '</strong>' + copy + '</div>';
}
function jump(target, label) {
  return '<button class="text-button" data-jump="' + target + '">' + label + icon('arrow') + '</button>';
}
function metric(label, displayValue, note, kind) {
  return '<div class="metric ' + (kind === 'wallet' ? 'dark' : '') + '"><span class="metric-top"><span class="metric-icon ' +
    kind + '">' + icon(kind) + '</span>' + label + '</span><strong class="metric-value">' +
    displayValue + '</strong><span class="metric-note">' + note + '</span></div>';
}
function metrics(rows) {
  const total = Wallet.totalSpent(rows);
  const average = rows.length ? Math.round(total / rows.length) : 0;
  return '<div class="metrics">' + metric('Tổng chi tháng', money(total), 'Tất cả khoản chi đã ghi', 'wallet') +
    metric('Số khoản chi', rows.length, 'Số lần ghi chi trong tháng', 'swap') +
    metric('Bình quân mỗi khoản', money(average), 'Tổng chi chia cho số khoản', 'out') + '</div>';
}
function chart(rows) {
  const monthDays = new Date(Number(month.slice(0,4)), Number(month.slice(5)), 0).getDate();
  const periods = [[1,7], [8,14], [15,21], [22,monthDays]];
  const buckets = periods.map(([start,end]) => Wallet.totalSpent(rows.filter(row => {
    const day = Number(row.date.slice(8));
    return day >= start && day <= end;
  })));
  const peak = Math.max(0, ...buckets);
  const unit = peak ? 10 ** Math.floor(Math.log10(peak)) : 1;
  // An empty month still gets a readable axis instead of 0–1 ₫.
  const top = peak ? Math.ceil(peak / unit) * unit : 1000000;
  const compact = value => new Intl.NumberFormat('vi-VN', {notation:'compact', maximumFractionDigits:2}).format(value);
  const grid = [0,1,2,3,4].map(i => {
    const y = 16 + i * 39;
    return '<line class="grid" x1="57" x2="494" y1="' + y + '" y2="' + y + '"/><text x="49" y="' + (y+4) +
      '" text-anchor="end">' + compact(top * (4-i) / 4) + '</text>';
  }).join('');
  const bars = buckets.map((spent, i) => {
    const x = 112 + i * 109;
    const height = 156 * spent / top;
    return '<rect class="bar-out" x="' + (x-20) + '" y="' + (172-height) + '" width="40" height="' + height +
      '" rx="4"><title>Chi ' + money(spent) + '</title></rect><text x="' + x +
      '" y="195" text-anchor="middle">' + periods[i].join('–') + '</text>';
  }).join('');
  const description = buckets.map((spent,i) => 'Ngày ' + periods[i].join(' đến ') + ', chi ' + money(spent)).join('. ');
  return '<svg class="chart-svg" viewBox="0 0 508 206" role="img" aria-label="' + description + '">' + grid + bars + '</svg>';
}
function chartPanel(rows) {
  return panel('Chi tiêu trong tháng', 'Tổng chi theo nhóm ngày · VND', chart(rows), '', 'chart-panel');
}
function budgetRows(rows, full) {
  const spending = Wallet.byCategory(rows);
  const entries = state.budgets.filter(row => row.month === month);
  if (!entries.length) return empty('Chưa có ngân sách', 'Đặt hạn mức cho một danh mục chi tiêu để theo dõi.');
  const statuses = entries.map(row => ({...row,...Wallet.budgetStatus(spending[row.category],row.cap)}));
  statuses.sort((a,b) => b.spent / b.cap - a.spent / a.cap);
  const display = (full ? statuses : statuses.slice(0,3)).map(row => {
    const difference = row.remaining === 0 ? 'Đã chạm hạn mức' :
      (row.remaining < 0 ? 'Vượt ' : 'Còn ') + money(Math.abs(row.remaining));
    return '<div class="budget-row"><div class="budget-top"><strong>' + row.category + '</strong><span class="budget-percent ' +
      row.level + '">' + row.percent + '%</span></div><div class="meter" aria-hidden="true"><div class="' + row.level +
      '" style="width:' + Math.min(100,row.percent) + '%"></div></div><div class="budget-meta"><span>' + money(row.spent) +
      ' / ' + money(row.cap) + '</span><span>' + difference + '</span></div>' +
      (full ? '<div class="budget-controls"><button class="text-button" data-edit-budget="' + row.category +
      '">Sửa</button><button class="text-button" data-delete-budget="' + row.category + '">Xóa</button></div>' : '') + '</div>';
  }).join('');
  const overdue = statuses.filter(row => row.level === 'over').length;
  const near = statuses.filter(row => row.level === 'near').length;
  const warning = [overdue ? overdue + ' danh mục vượt ngân sách' : '', near ? near + ' danh mục đã dùng từ 80% ngân sách' : ''].filter(Boolean);
  return '<div class="budget-list ' + (full ? 'budget-full' : '') + '">' + display + '</div>' +
    (warning.length ? '<div class="alert">' + icon('warning') + '<span>' + warning.join('. ') + '.</span></div>' : '');
}
function transactionTable(rows, editable) {
  if (!rows.length) return empty('Chưa tìm thấy khoản chi', 'Thêm khoản chi hoặc thay đổi tháng và bộ lọc.');
  return '<div class="table-wrap"><table class="transactions"><thead><tr><th>Khoản chi</th><th class="category-col">Danh mục</th><th>Ngày</th>' +
    '<th class="amount">Số tiền</th>' + (editable ? '<th>Thao tác</th>' : '') + '</tr></thead><tbody>' + rows.map(row => {
    const name = escapeHTML(row.note || row.category);
    const id = escapeHTML(row.id);
    return '<tr><td><div class="row-name"><span class="item-icon">' + icon(categoriesIcon[row.category] || 'out') +
      '</span><strong>' + name + '</strong></div></td><td class="category-col"><span class="tag">' + row.category + '</span></td><td>' + dateLabel(row.date) +
      '</td><td class="amount out">' + money(row.amount) + '</td>' +
      (editable ? '<td><button class="text-button" data-edit="' + id + '" aria-label="Sửa ' + name + '">Sửa</button>' +
        '<button class="text-button" data-delete="' + id + '" aria-label="Xóa ' + name + '">Xóa</button></td>' : '') + '</tr>';
  }).join('') + '</tbody></table></div>';
}
function spendingReport(rows) {
  const amounts = Object.entries(Wallet.byCategory(rows)).filter(([,value]) => value > 0).sort((a,b) => b[1] - a[1]);
  const total = Wallet.totalSpent(rows);
  if (!total) return empty('Chưa có chi tiêu', 'Thêm khoản chi để xem tỷ trọng theo danh mục.');
  return '<div class="report-list">' + amounts.map(([name,value]) => {
    const share = value / total * 100;
    return '<div class="budget-row"><div class="report-share"><strong>' + name + '</strong><span>' + money(value) +
      ' · ' + new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(share) + '%</span></div>' +
      '<div class="meter" aria-hidden="true"><div style="width:' + share + '%"></div></div></div>';
  }).join('') + '</div>';
}
function monthRows() {
  return expenseRows(Wallet.period(state.transactions,month)).reverse().sort((a,b) => b.date.localeCompare(a.date));
}
function filterRows() {
  return monthRows().filter(row => (filter === 'all' || row.category === filter) &&
    (row.note + ' ' + row.category).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
}
function render() {
  const [label,title,copy] = pages[page];
  $('breadcrumb').textContent = label;
  $('page-title').textContent = title;
  $('page-copy').textContent = copy;
  $('demo-menu').innerHTML = '<span></span>' + (state.demo ? 'Chế độ demo' : 'Dữ liệu cục bộ');
  $('month').value = month;
  document.querySelectorAll('[data-page]').forEach(button => {
    if (button.dataset.page === page) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  });
  const rows = monthRows();
  const warning = storageError ? '<div class="alert">Dữ liệu lưu trữ không đọc được. Đang hiển thị dữ liệu mẫu.</div>' : '';
  if (page === 'home') $('view').innerHTML = warning + metrics(rows) + '<div class="dashboard-grid">' + chartPanel(rows) +
    panel('Theo dõi ngân sách', 'Hạn mức theo danh mục', budgetRows(rows,false), jump('budgets','Chi tiết'), 'budget-panel') +
    panel('Khoản chi gần đây','Các khoản chi mới nhất trong tháng',transactionTable(rows.slice(0,4),false),
      jump('transactions','Xem tất cả'),'span-all') + '</div>';
  if (page === 'transactions') {
    $('view').innerHTML = warning + panel('Lịch sử chi tiêu','Tháng ' + monthLabel(month),
      '<div class="filters"><input id="search" type="search" aria-label="Tìm khoản chi" placeholder="Tìm ghi chú hoặc danh mục…">' +
      '<select id="category-filter" aria-label="Danh mục chi tiêu"><option value="all">Tất cả danh mục</option>' +
      options(Wallet.expenses) + '</select></div><div id="table-results">' + transactionTable(filterRows(),true) + '</div>');
    $('search').value = query;
    $('category-filter').value = filter;
    $('search').addEventListener('input', event => { query = event.target.value; $('table-results').innerHTML = transactionTable(filterRows(),true); });
    $('category-filter').addEventListener('change', event => { filter = event.target.value; $('table-results').innerHTML = transactionTable(filterRows(),true); });
  }
  if (page === 'budgets') $('view').innerHTML = warning + panel('Hạn mức theo danh mục',
    'Cảnh báo từ 80% · Vượt khi chi nhiều hơn hạn mức', budgetRows(rows,true),
    '<button class="primary" data-new-budget>' + icon('plus') + 'Đặt hạn mức</button>');
  if (page === 'reports') $('view').innerHTML = warning + metrics(rows) + '<div class="dashboard-grid">' + chartPanel(rows) +
    panel('Cơ cấu chi tiêu','Tỷ trọng trong tổng chi tháng',spendingReport(rows)) + '</div>';
}

const dialog = $('dialog');
function openDialog(title, content) {
  $('dialog-content').innerHTML = '<div class="dialog-head"><h2 id="dialog-title">' + title +
    '</h2><button class="icon-button" id="close-dialog" aria-label="Đóng">' + icon('x') + '</button></div>' + content;
  $('close-dialog').onclick = () => dialog.close();
  if (!dialog.open) dialog.showModal();
  $('cancel-dialog')?.addEventListener('click', () => dialog.close());
}
const actionButtons = (label, cls = 'primary') => '<div class="dialog-actions"><button type="button" class="secondary" id="cancel-dialog">Hủy</button>' +
  '<button type="submit" class="' + cls + '">' + label + '</button></div>';
const errorMarkup = '<div id="form-error" class="error" role="alert"></div>';
const options = (items, selection) => items.map(item => '<option' + (item === selection ? ' selected' : '') + '>' + item + '</option>').join('');
const amountField = (label, value = '') => '<label class="field">' + label + '<input name="amount" type="number" inputmode="numeric" min="1" max="' +
  Wallet.limit + '" step="1" value="' + value + '" placeholder="300000" required></label>';

function transactionDialog(existing) {
  const date = existing?.date ?? (today.startsWith(month) ? today : month + '-01');
  openDialog(existing ? 'Sửa khoản chi' : 'Thêm khoản chi', '<form id="tx-form"><div class="form-grid">' +
    amountField('Số tiền (VND)',existing?.amount) + '<label class="field">Danh mục<select name="category" required>' +
    options(Wallet.expenses,existing?.category) + '</select></label>' +
    '<label class="field">Ngày chi<input name="date" type="date" min="2000-01-01" max="2099-12-31" required value="' + date +
    '"></label><label class="field wide">Ghi chú<input name="note" maxlength="100" placeholder="Ví dụ: Ăn trưa với bạn" value="' +
    escapeHTML(existing?.note ?? '') + '"></label></div>' + errorMarkup + actionButtons('Lưu khoản chi') + '</form>');
  const form = $('tx-form');
  form.onsubmit = event => {
    event.preventDefault();
    const fields = new FormData(form);
    const row = {id: existing?.id ?? (globalThis.crypto.randomUUID?.() ?? Date.now() + '-' + Math.random()),
      type: 'out', category: fields.get('category'), date: fields.get('date'),
      amount:Number(fields.get('amount')), note:fields.get('note').trim()};
    const error = $('form-error');
    if (!Wallet.validAmount(row.amount) || !Wallet.validDate(row.date) || !Wallet.expenses.includes(row.category)) {
      error.textContent = 'Kiểm tra lại số tiền, ngày và danh mục.';
      return;
    }
    const transactions = existing ? state.transactions.map(item => item.id === existing.id ? row : item) : [...state.transactions,row];
    if (save({...state,transactions},error)) {
      month = row.date.slice(0,7);
      filter = 'all';
      query = '';
      dialog.close();
      render();
      toast(existing ? 'Đã cập nhật khoản chi.' : 'Đã thêm khoản chi.');
    }
  };
  form.elements.namedItem('amount').focus();
}
function budgetDialog(category) {
  const editingMonth = month;
  const existing = state.budgets.find(row => row.month === editingMonth && row.category === category);
  const available = Wallet.expenses.filter(name => !state.budgets.some(row => row.month === editingMonth && row.category === name));
  if (!existing && !available.length) { toast('Tất cả danh mục đã có hạn mức trong tháng này.'); return; }
  openDialog(existing ? 'Sửa hạn mức' : 'Đặt hạn mức', '<p class="dialog-body">Ngân sách cho tháng ' + monthLabel(editingMonth) +
    '.</p><form id="budget-form"><div class="form-grid"><label class="field">Danh mục<select name="category" required>' +
    options(existing ? [category] : available) + '</select></label>' + amountField('Hạn mức (VND)',existing?.cap) + '</div>' +
    errorMarkup + actionButtons('Lưu hạn mức') + '</form>');
  const form = $('budget-form');
  form.onsubmit = event => {
    event.preventDefault();
    const fields = new FormData(form);
    const cap = Number(fields.get('amount'));
    const name = fields.get('category');
    const error = $('form-error');
    if (!Wallet.validAmount(cap) || !Wallet.expenses.includes(name)) {
      error.textContent = 'Kiểm tra lại hạn mức và danh mục.';
      return;
    }
    const budgets = state.budgets.filter(row => row.month !== editingMonth || row.category !== name);
    if (save({...state,budgets:[...budgets,{month:editingMonth,category:name,cap}]},error)) {
      dialog.close();
      render();
      toast('Đã lưu hạn mức.');
    }
  };
}
function confirmChange(title, description, label, apply, onSaved) {
  openDialog(title,'<p class="dialog-body">' + description + '</p><form id="confirm-form">' +
    errorMarkup + actionButtons(label,'danger') + '</form>');
  $('confirm-form').onsubmit = event => {
    event.preventDefault();
    if (save(apply(),$('form-error'))) {
      onSaved?.();
      dialog.close();
      render();
      toast('Đã lưu thay đổi.');
    }
  };
}
function demoDialog() {
  openDialog('Dữ liệu của Ví Nhỏ','<p class="dialog-body">Khoản chi và hạn mức được lưu trong trình duyệt này. Các khoản mẫu chỉ dùng để minh họa.</p>' +
    '<div class="dialog-actions"><button class="secondary" id="reset-demo">Nạp lại dữ liệu mẫu</button>' +
    '<button class="danger" id="clear-wallet">Xóa sổ chi tiêu</button></div>');
  $('reset-demo').onclick = () => confirmChange('Nạp lại dữ liệu mẫu?',
    'Thao tác này thay toàn bộ khoản chi và hạn mức đang lưu bằng bộ dữ liệu minh họa.', 'Nạp dữ liệu mẫu', () => {
      const sample = Wallet.seed(today);
      return {...sample, transactions:[...legacyIncome(state.transactions), ...sample.transactions]};
    }, () => { month = today.slice(0,7); });
  $('clear-wallet').onclick = () => confirmChange('Xóa sổ chi tiêu?',
    'Toàn bộ khoản chi và hạn mức trên trình duyệt này sẽ bị xóa.', 'Xóa dữ liệu', () => ({
      ...state, demo:false, transactions:legacyIncome(state.transactions), budgets:[]
    }));
}
function go(next) {
  page = next;
  render();
  window.scrollTo(0,0);
}

document.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
document.querySelectorAll('[data-page]').forEach(button => { button.onclick = () => go(button.dataset.page); });
$('add').onclick = () => transactionDialog();
$('demo-menu').onclick = demoDialog;
$('month').onchange = event => {
  if (Wallet.validMonth(event.target.value)) month = event.target.value;
  render();
};
$('view').onclick = event => {
  const button = event.target.closest('button');
  if (!button) return;
  const data = button.dataset;
  if (data.jump) go(data.jump);
  if ('newBudget' in data) budgetDialog();
  if (data.editBudget) budgetDialog(data.editBudget);
  if (data.deleteBudget) {
    const selectedMonth = month;
    confirmChange('Xóa hạn mức?', 'Hạn mức của mục ' + data.deleteBudget + ' trong tháng ' + monthLabel(month) +
      ' sẽ bị xóa. Các khoản chi vẫn được lưu.', 'Xóa hạn mức', () => ({
      ...state,budgets:state.budgets.filter(row => row.month !== selectedMonth || row.category !== data.deleteBudget)
    }));
  }
  if (data.edit) {
    const row = expenseRows(state.transactions).find(item => item.id === data.edit);
    if (row) transactionDialog(row);
  }
  if (data.delete) {
    const row = expenseRows(state.transactions).find(item => item.id === data.delete);
    if (row) confirmChange('Xóa khoản chi?', 'Xóa khoản ' + escapeHTML(row.note || row.category) + ' có giá trị ' +
      money(row.amount) + '?', 'Xóa khoản chi', () => ({...state,transactions:state.transactions.filter(item => item.id !== row.id)}));
  }
};
window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) {
    dialog.close();
    storageError = false;
    state = load();
    render();
  }
});
render();
