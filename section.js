/* Budget Power-Up — card-back section */

var t = window.TrelloPowerUp.iframe();

var cfg = null;   // { b: approvedBudget, r: hourlyRate }
var log = [];     // [{ y: 'T'|'E', d: desc, h: hours, c: category, a: amount, ts: 'YYYY-MM-DD' }]
var editIndex = -1;  // index of the ledger entry currently being edited, -1 = none

var CATEGORIES = ['Hotel', 'Meals', 'Travel', 'Vendor', 'Materials', 'Other'];

/* ---------- helpers ---------- */

function $(id) { return document.getElementById(id); }

function money(n) {
  return '$' + Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function totals() {
  var spent = 0;
  log.forEach(function (e) { spent += Number(e.a) || 0; });
  var b = Number(cfg && cfg.b) || 0;
  return { budget: b, spent: spent, remaining: b - spent, pct: b > 0 ? spent / b : 0 };
}

function save() {
  return t.set('card', 'shared', 'cfg', cfg)
    .then(function () { return t.set('card', 'shared', 'log', log); })
    .catch(function (err) {
      alert('Could not save. Trello limits how much data a Power-Up can store per card (~4KB). Try exporting to CSV and clearing old entries.');
      console.error(err);
    });
}

function resize() { t.sizeTo('#app').catch(function () {}); }

/* ---------- rendering ---------- */

function render() {
  var hasCfg = cfg && Number(cfg.b) > 0;
  $('setup').classList.toggle('hidden', hasCfg);
  $('main').classList.toggle('hidden', !hasCfg);

  if (hasCfg) {
    var s = totals();

    $('remaining').textContent = (s.remaining < 0 ? '-' : '') + money(Math.abs(s.remaining));
    $('spent').textContent = money(s.spent);
    $('budget').textContent = money(s.budget);

    var pct = Math.min(s.pct, 1) * 100;
    var fill = $('meter-fill');
    fill.style.width = pct + '%';

    var state = 'ok';                    // green  < 50%
    if (s.pct >= 1) state = 'over';      // red    >= 100% (or over)
    else if (s.pct >= 0.8) state = 'hot'; // orange >= 80%
    else if (s.pct >= 0.5) state = 'warm'; // yellow >= 50%
    $('meter').dataset.state = state;
    $('remaining').dataset.state = state;

    renderLedger();
  }
  resize();
}

function renderLedger() {
  var body = $('ledger-body');
  body.innerHTML = '';
  $('ledger').classList.toggle('hidden', log.length === 0);
  $('ledger-empty').classList.toggle('hidden', log.length > 0);

  log.forEach(function (e, i) {
    body.appendChild(i === editIndex ? buildEditRow(e, i) : buildDisplayRow(e, i));
  });
}

function buildDisplayRow(e, i) {
  var tr = document.createElement('tr');

  function td(text, cls) {
    var el = document.createElement('td');
    el.textContent = text;
    if (cls) el.className = cls;
    tr.appendChild(el);
  }

  td(e.ts);
  td(e.y === 'T' ? 'Time' : (e.c || 'Expense'));
  td(e.d || '');
  td(e.y === 'T' ? Number(e.h).toString() : '', 'num');
  td(money(e.a), 'num');

  var actions = document.createElement('td');
  actions.className = 'num actions';

  var edit = document.createElement('button');
  edit.className = 'row-btn';
  edit.title = 'Edit entry';
  edit.textContent = '\u270e';
  edit.addEventListener('click', function () {
    editIndex = i;
    renderLedger();
    resize();
  });
  actions.appendChild(edit);

  var del = document.createElement('button');
  del.className = 'row-btn del';
  del.title = 'Delete entry';
  del.textContent = '\u00d7';
  del.addEventListener('click', function () {
    log.splice(i, 1);
    editIndex = -1; // indexes shift after a delete; drop any open editor
    save().then(render);
  });
  actions.appendChild(del);

  tr.appendChild(actions);
  return tr;
}

function buildEditRow(e, i) {
  var tr = document.createElement('tr');
  tr.className = 'edit-row';

  function cell(child, cls, colSpan) {
    var el = document.createElement('td');
    if (cls) el.className = cls;
    if (colSpan) el.colSpan = colSpan;
    el.appendChild(child);
    tr.appendChild(el);
    return el;
  }

  // date
  var dateIn = document.createElement('input');
  dateIn.type = 'date';
  dateIn.value = e.ts;
  cell(dateIn);

  // type/category
  var catSel = null;
  if (e.y === 'E') {
    catSel = document.createElement('select');
    CATEGORIES.forEach(function (c) {
      var opt = document.createElement('option');
      opt.textContent = c;
      if (c === e.c) opt.selected = true;
      catSel.appendChild(opt);
    });
    cell(catSel);
  } else {
    var typeSpan = document.createElement('span');
    typeSpan.textContent = 'Time';
    cell(typeSpan);
  }

  // description
  var descIn = document.createElement('input');
  descIn.type = 'text';
  descIn.maxLength = 80;
  descIn.value = e.d || '';
  cell(descIn, 'grow-cell');

  // hours (time) or amount (expense)
  var hoursIn = null, amountIn = null;
  if (e.y === 'T') {
    hoursIn = document.createElement('input');
    hoursIn.type = 'number';
    hoursIn.min = '0';
    hoursIn.step = '0.25';
    hoursIn.value = e.h;
    cell(hoursIn, 'num');
    // amount is derived, show read-only preview
    var preview = document.createElement('span');
    preview.textContent = money(e.a);
    hoursIn.addEventListener('input', function () {
      var h = parseFloat(hoursIn.value);
      preview.textContent = h > 0 ? money(h * entryRate(e)) : '\u2014';
    });
    cell(preview, 'num');
  } else {
    var blank = document.createElement('span');
    cell(blank, 'num');
    amountIn = document.createElement('input');
    amountIn.type = 'number';
    amountIn.min = '0';
    amountIn.step = '0.01';
    amountIn.value = e.a;
    cell(amountIn, 'num');
  }

  // save / cancel
  var actions = document.createElement('td');
  actions.className = 'num actions';

  var saveBtn = document.createElement('button');
  saveBtn.className = 'row-btn save';
  saveBtn.title = 'Save changes';
  saveBtn.textContent = '\u2713';
  saveBtn.addEventListener('click', function () {
    if (dateIn.value) e.ts = dateIn.value;
    e.d = descIn.value.trim();
    if (e.y === 'T') {
      var h = parseFloat(hoursIn.value);
      if (!(h > 0)) { hoursIn.focus(); return; }
      var rate = entryRate(e);
      e.h = h;
      e.a = +(h * rate).toFixed(2);
    } else {
      var a = parseFloat(amountIn.value);
      if (!(a > 0)) { amountIn.focus(); return; }
      e.c = catSel.value;
      e.a = +a.toFixed(2);
    }
    editIndex = -1;
    save().then(render);
  });
  actions.appendChild(saveBtn);

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'row-btn';
  cancelBtn.title = 'Cancel';
  cancelBtn.textContent = '\u00d7';
  cancelBtn.addEventListener('click', function () {
    editIndex = -1;
    renderLedger();
    resize();
  });
  actions.appendChild(cancelBtn);

  tr.appendChild(actions);
  return tr;
}

// Rate snapshotted when the entry was logged (amount / hours), so editing
// hours doesn't silently reprice old work at today's rate. Falls back to
// the current rate if the entry can't tell us.
function entryRate(e) {
  if (e.h > 0 && e.a > 0) return e.a / e.h;
  return Number(cfg.r) || 0;
}

/* ---------- CSV export ---------- */

function csvEscape(v) {
  v = String(v == null ? '' : v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function exportCsv() {
  var s = totals();
  var rows = [
    ['Date', 'Type', 'Category', 'Description', 'Hours', 'Rate', 'Amount']
  ];
  log.forEach(function (e) {
    rows.push([
      e.ts,
      e.y === 'T' ? 'Time' : 'Expense',
      e.y === 'T' ? '' : (e.c || ''),
      e.d || '',
      e.y === 'T' ? e.h : '',
      e.y === 'T' ? cfg.r : '',
      Number(e.a).toFixed(2)
    ]);
  });
  rows.push([]);
  rows.push(['Approved budget', '', '', '', '', '', Number(s.budget).toFixed(2)]);
  rows.push(['Total spent', '', '', '', '', '', Number(s.spent).toFixed(2)]);
  rows.push(['Remaining', '', '', '', '', '', Number(s.remaining).toFixed(2)]);

  var csv = rows.map(function (r) { return r.map(csvEscape).join(','); }).join('\r\n');
  var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'budget-' + today() + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

/* ---------- events ---------- */

$('setup-save').addEventListener('click', function () {
  var b = parseFloat($('setup-budget').value);
  var r = parseFloat($('setup-rate').value);
  if (!(b > 0)) { $('setup-budget').focus(); return; }
  cfg = { b: b, r: r > 0 ? r : 0 };
  save().then(render);
});

$('edit-cfg').addEventListener('click', function (ev) {
  ev.preventDefault();
  $('cfg-budget').value = cfg.b;
  $('cfg-rate').value = cfg.r;
  $('cfg-form').classList.remove('hidden');
  resize();
});

$('cfg-cancel').addEventListener('click', function () {
  $('cfg-form').classList.add('hidden');
  resize();
});

$('cfg-save').addEventListener('click', function () {
  var b = parseFloat($('cfg-budget').value);
  var r = parseFloat($('cfg-rate').value);
  if (!(b > 0)) { $('cfg-budget').focus(); return; }
  cfg = { b: b, r: r > 0 ? r : 0 };
  $('cfg-form').classList.add('hidden');
  save().then(render);
});

$('tab-time').addEventListener('click', function () { switchTab('time'); });
$('tab-exp').addEventListener('click', function () { switchTab('exp'); });

function switchTab(which) {
  $('tab-time').classList.toggle('active', which === 'time');
  $('tab-exp').classList.toggle('active', which === 'exp');
  $('form-time').classList.toggle('hidden', which !== 'time');
  $('form-exp').classList.toggle('hidden', which !== 'exp');
  resize();
}

$('time-add').addEventListener('click', function () {
  var h = parseFloat($('time-hours').value);
  var d = $('time-desc').value.trim();
  if (!(h > 0)) { $('time-hours').focus(); return; }
  var ts = $('time-date').value || today();
  log.push({ y: 'T', d: d, h: h, a: +(h * (Number(cfg.r) || 0)).toFixed(2), ts: ts });
  $('time-hours').value = '';
  $('time-desc').value = '';
  $('time-date').value = today();
  save().then(render);
});

$('exp-add').addEventListener('click', function () {
  var a = parseFloat($('exp-amount').value);
  var d = $('exp-desc').value.trim();
  if (!(a > 0)) { $('exp-amount').focus(); return; }
  var ts = $('exp-date').value || today();
  log.push({ y: 'E', d: d, c: $('exp-cat').value, a: +a.toFixed(2), ts: ts });
  $('exp-amount').value = '';
  $('exp-desc').value = '';
  $('exp-date').value = today();
  save().then(render);
});

$('export').addEventListener('click', exportCsv);

/* ---------- init ---------- */

t.render(function () {
  $('time-date').value = today();
  $('exp-date').value = today();
  Promise.all([
    t.get('card', 'shared', 'cfg'),
    t.get('card', 'shared', 'log')
  ]).then(function (res) {
    cfg = res[0] || null;
    log = Array.isArray(res[1]) ? res[1] : [];
    render();
  });
});
