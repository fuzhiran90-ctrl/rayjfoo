// ==================== 数据定义 ====================
const EXPENSE_CATEGORIES = {
  expense: [
    { id:'餐饮', icon:'🍜', emoji:'🍜' },
    { id:'交通', icon:'🚌', emoji:'🚌' },
    { id:'购物', icon:'🛍️', emoji:'🛍️' },
    { id:'居住', icon:'🏠', emoji:'🏠' },
    { id:'娱乐', icon:'🎮', emoji:'🎮' },
    { id:'医疗', icon:'🏥', emoji:'🏥' },
    { id:'教育', icon:'📚', emoji:'📚' },
    { id:'通讯', icon:'📱', emoji:'📱' },
    { id:'服饰', icon:'👔', emoji:'👔' },
    { id:'日用', icon:'🧴', emoji:'🧴' },
    { id:'其他支出', icon:'📌', emoji:'📌' },
  ],
  income: [
    { id:'工资', icon:'💰', emoji:'💰' },
    { id:'奖金', icon:'🎁', emoji:'🎁' },
    { id:'兼职', icon:'💼', emoji:'💼' },
    { id:'投资', icon:'📈', emoji:'📈' },
    { id:'红包', icon:'🧧', emoji:'🧧' },
    { id:'其他收入', icon:'➕', emoji:'➕' },
  ],
};
const ALL_CATEGORIES = [...EXPENSE_CATEGORIES.expense, ...EXPENSE_CATEGORIES.income];

const HABIT_EMOJIS = ['💪','📖','🏃','🧘','🥗','💧','✍️','🎯','🧠','🌅','😴','🎨','🎵','🧹','📝','🌱'];

// ==================== 状态 ====================
let state = {
  expenses: [],
  habits: [],
  currentTab: 'dashboard',
  dashMonth: new Date(),
  expMonth: new Date(),
  statsYear: new Date().getFullYear(),
  editingExpense: null,
  editingHabit: null,
};

// ==================== 数据库 ====================
const DB = {
  load() {
    try {
      state.expenses = JSON.parse(localStorage.getItem('rf_expenses')) || [];
      state.habits = JSON.parse(localStorage.getItem('rf_habits')) || [];
    } catch(e) {
      state.expenses = [];
      state.habits = [];
    }
  },
  saveExpenses() {
    localStorage.setItem('rf_expenses', JSON.stringify(state.expenses));
  },
  saveHabits() {
    localStorage.setItem('rf_habits', JSON.stringify(state.habits));
  },
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  },
};

// ==================== 工具函数 ====================
function todayISO() {
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function fmtDate(d) {
  const m = d.getMonth()+1, day = d.getDate();
  return m+'月'+day+'日';
}

function fmtMonth(d) {
  return d.getFullYear()+'年 '+String(d.getMonth()+1).padStart(2,'0')+'月';
}

function fmtAmount(n) {
  return '¥'+(n).toFixed(2);
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59);
}

function daysInMonth(d) {
  return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
}

function firstWeekday(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1).getDay();
}

function sameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function getMonthExpenses(d) {
  const s = startOfMonth(d).getTime(), e = endOfMonth(d).getTime();
  return state.expenses.filter(x => {
    const t = new Date(x.date).getTime();
    return t >= s && t <= e;
  });
}

function calcStreak(habit) {
  const completed = new Set(
    (habit.records||[]).filter(r=>r.completed).map(r=>r.date)
  );
  let count = 0;
  for (let i=0; ; i++) {
    const d = new Date();
    d.setDate(d.getDate()-i);
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if (completed.has(key)) count++;
    else break;
  }
  return count;
}

function totalCompleted(habit) {
  return new Set((habit.records||[]).filter(r=>r.completed).map(r=>r.date)).size;
}

function isCheckedIn(habit, dateStr) {
  return (habit.records||[]).some(r => r.date === dateStr && r.completed);
}

// ==================== Toast ====================
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1500);
}

// ==================== 标签切换 ====================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-'+tab).classList.add('active');

  const titles = {dashboard:'总览', expenses:'记账', habits:'打卡', settings:'设置'};
  document.getElementById('header-title').textContent = titles[tab] || 'rayjfoo';

  if (tab === 'dashboard') renderDashboard();
  else if (tab === 'expenses') renderExpenses();
  else if (tab === 'habits') renderHabits();
  else if (tab === 'settings') renderSettings();
}

// ==================== 总览 ====================
function renderDashboard() {
  const m = state.dashMonth;
  document.getElementById('dash-month').textContent = fmtMonth(m);

  const list = getMonthExpenses(m);
  const expense = list.filter(x=>x.isExpense).reduce((s,x)=>s+x.amount, 0);
  const income = list.filter(x=>!x.isExpense).reduce((s,x)=>s+x.amount, 0);
  document.getElementById('dash-expense').textContent = fmtAmount(expense);
  document.getElementById('dash-income').textContent = fmtAmount(income);
  const bal = document.getElementById('dash-balance');
  bal.textContent = fmtAmount(income-expense);
  bal.style.color = (income-expense) >= 0 ? 'var(--green)' : 'var(--red)';

  // Quick grid
  const quickCats = [
    {id:'餐饮', icon:'🍜', isExpense:true},
    {id:'交通', icon:'🚌', isExpense:true},
    {id:'购物', icon:'🛍️', isExpense:true},
    {id:'日用', icon:'🧴', isExpense:true},
    {id:'工资', icon:'💰', isExpense:false},
  ];
  const qg = document.getElementById('quick-grid');
  qg.innerHTML = quickCats.map(c => `
    <button class="quick-btn ${c.isExpense?'expense':'income'}" onclick="quickAdd('${c.id}')">
      <span class="icon">${c.icon}</span>
      <span>${c.id}</span>
    </button>
  `).join('');

  // Today habits
  const dh = document.getElementById('dash-habits');
  if (!state.habits.length) {
    dh.innerHTML = '<div class="empty-state" style="padding:8px 0">还没有习惯项目</div>';
  } else {
    dh.innerHTML = state.habits.map(h => `
      <div class="habit-mini">
        <span>${h.emoji}</span>
        <span>${h.name}</span>
        <button class="check-btn" onclick="toggleCheckin('${h.id}');renderDashboard()">
          ${isCheckedIn(h, todayISO()) ? '✅' : '⭕'}
        </button>
      </div>
    `).join('');
  }

  // Recent
  const sorted = [...state.expenses].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const recent = sorted.slice(0,5);
  const rl = document.getElementById('dash-recent');
  if (!recent.length) {
    rl.innerHTML = '<div class="empty-state">还没有记账记录</div>';
  } else {
    rl.innerHTML = recent.map(x => {
      const cat = getCategory(x.category);
      return `
        <div class="txn-row">
          <div class="txn-icon ${x.isExpense?'expense':'income'}">${cat?cat.emoji:'📌'}</div>
          <div class="txn-info">
            <div class="txn-category">${x.category}</div>
            ${x.note ? '<div class="txn-note">'+x.note+'</div>' : ''}
          </div>
          <div class="txn-amount ${x.isExpense?'expense':'income'}">
            ${x.isExpense?'-':'+'}${fmtAmount(x.amount)}
          </div>
        </div>
      `;
    }).join('');
  }
}

function navMonth(d) {
  state.dashMonth.setMonth(state.dashMonth.getMonth()+d);
  renderDashboard();
}

function quickAdd(catId) {
  openAddExpense(catId);
}

// ==================== 记账 ====================
function renderExpenses() {
  const m = state.expMonth;
  document.getElementById('exp-month').textContent = fmtMonth(m);

  const list = getMonthExpenses(m);
  const expense = list.filter(x=>x.isExpense).reduce((s,x)=>s+x.amount, 0);
  const income = list.filter(x=>!x.isExpense).reduce((s,x)=>s+x.amount, 0);
  document.getElementById('exp-summary').innerHTML = `
    <div class="exp-month-summary">
      <span>收入 <span class="green">${fmtAmount(income)}</span></span>
      <span>支出 <span class="red">${fmtAmount(expense)}</span></span>
    </div>
  `;

  const container = document.getElementById('expense-list');
  if (!list.length) {
    container.innerHTML = '<div class="empty-state">暂无记录，点 ➕ 添加</div>';
    return;
  }
  const sorted = [...list].sort((a,b)=>new Date(b.date)-new Date(a.date));
  container.innerHTML = sorted.map(x => {
    const cat = getCategory(x.category);
    return `
      <div class="card" style="margin-bottom:6px;padding:12px 14px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="txn-icon ${x.isExpense?'expense':'income'}">${cat?cat.emoji:'📌'}</div>
          <div class="txn-info">
            <div class="txn-category">${x.category}</div>
            <div class="txn-note">${x.note ? x.note+' · ' : ''}${fmtDate(new Date(x.date))}</div>
          </div>
          <div class="txn-amount ${x.isExpense?'expense':'income'}">${x.isExpense?'-':'+'}${fmtAmount(x.amount)}</div>
          <button onclick="deleteExpense('${x.id}')" style="background:none;border:none;color:var(--red);font-size:16px;cursor:pointer;padding:4px">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function expNavMonth(d) {
  state.expMonth.setMonth(state.expMonth.getMonth()+d);
  renderExpenses();
}

function deleteExpense(id) {
  if (!confirm('删除这条记录？')) return;
  state.expenses = state.expenses.filter(x => x.id !== id);
  DB.saveExpenses();
  renderExpenses();
  renderDashboard();
}

// ==================== 记一笔 (模态框) ====================
function openAddExpense(defaultCategory) {
  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-note').value = '';
  document.getElementById('exp-date').value = todayISO();
  state.editingExpense = null;

  const isIncomeCat = EXPENSE_CATEGORIES.income.some(c => c.id === defaultCategory);
  const isExpense = !isIncomeCat;
  document.querySelectorAll('#modal-add-expense .toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === String(isExpense));
  });
  const cs = document.querySelector('.currency-symbol');
  if (cs) cs.style.color = isExpense ? 'var(--red)' : 'var(--green)';

  renderCategoryGrid(defaultCategory || (isExpense ? '餐饮' : '工资'), isExpense);
  document.getElementById('modal-add-expense').classList.add('open');
  setTimeout(() => document.getElementById('exp-amount').focus(), 300);
}

function toggleExpenseType(btn) {
  btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const isExp = btn.dataset.value === 'true';
  const cs = document.querySelector('.currency-symbol');
  if (cs) cs.style.color = isExp ? 'var(--red)' : 'var(--green)';
  const curCat = document.querySelector('.cat-btn.selected');
  const curId = curCat ? curCat.dataset.id : null;
  renderCategoryGrid(curId, isExp);
}

function renderCategoryGrid(selectedId, forceExpense) {
  const isExp = forceExpense !== undefined ? forceExpense :
    document.querySelector('#modal-add-expense .toggle-btn.active')?.dataset.value === 'true';
  const cats = isExp ? EXPENSE_CATEGORIES.expense : EXPENSE_CATEGORIES.income;
  const grid = document.getElementById('exp-category-grid');
  grid.innerHTML = cats.map(c => `
    <button class="cat-btn ${c.id===selectedId?'selected':''}" data-id="${c.id}" onclick="selectCategory(this)">
      <span class="icon">${c.icon}</span>
      <span>${c.id}</span>
    </button>
  `).join('');
}

function selectCategory(el) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function saveExpense() {
  const amount = parseFloat(document.getElementById('exp-amount').value);
  if (!amount || amount <= 0) { showToast('请输入金额'); return; }

  const isExp = document.querySelector('#modal-add-expense .toggle-btn.active').dataset.value === 'true';
  const cat = document.querySelector('.cat-btn.selected');
  if (!cat) { showToast('请选择分类'); return; }

  const item = {
    id: DB.genId(),
    amount: amount,
    category: cat.dataset.id,
    note: document.getElementById('exp-note').value.trim(),
    date: document.getElementById('exp-date').value || todayISO(),
    isExpense: isExp,
    createdAt: new Date().toISOString(),
  };

  state.expenses.push(item);
  DB.saveExpenses();
  closeModal(document.getElementById('modal-add-expense'));
  showToast('已保存');
  renderDashboard();
  renderExpenses();
}

// ==================== 打卡 ====================
function renderHabits() {
  const grid = document.getElementById('habit-grid');
  if (!state.habits.length) {
    grid.innerHTML = '<div class="habit-empty">还没有习惯项目<br><br><button class="btn-block btn-primary" onclick="openAddHabit()">＋ 添加第一个习惯</button></div>';
    return;
  }

  grid.innerHTML = state.habits.map(h => {
    const streak = calcStreak(h);
    return `
      <div class="habit-card" onclick="openHabitDetail('${h.id}')">
        <div class="emoji">${h.emoji}</div>
        <div class="name">${h.name}</div>
        <div class="streak ${streak>0?'active':''}">🔥 ${streak}天</div>
        <button class="check-btn" onclick="event.stopPropagation();toggleCheckin('${h.id}');renderHabits();renderDashboard()">
          ${isCheckedIn(h, todayISO()) ? '✅' : '⭕'}
        </button>
      </div>
    `;
  }).join('') + `
    <div class="habit-card" style="border:2px dashed var(--separator);background:none;box-shadow:none;justify-content:center"
         onclick="openAddHabit()">
      <div style="font-size:28px;color:var(--secondary)">＋</div>
      <div style="font-size:14px;color:var(--secondary)">新建</div>
    </div>
  `;
}

function toggleCheckin(id) {
  const h = state.habits.find(x => x.id === id);
  if (!h) return;
  if (!h.records) h.records = [];
  const today = todayISO();
  const existing = h.records.find(r => r.date === today);
  if (existing) {
    existing.completed = !existing.completed;
  } else {
    h.records.push({ date: today, completed: true });
  }
  DB.saveHabits();
}

// ==================== 新增习惯 ====================
function openAddHabit() {
  document.getElementById('habit-name').value = '';
  const grid = document.getElementById('emoji-grid');
  grid.innerHTML = HABIT_EMOJIS.map(e => `
    <button class="emoji-btn" onclick="selectEmoji(this)">${e}</button>
  `).join('');
  grid.firstElementChild?.classList.add('selected');
  document.getElementById('modal-add-habit').classList.add('open');
}

function selectEmoji(el) {
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function saveHabit() {
  const name = document.getElementById('habit-name').value.trim();
  if (!name) { showToast('请输入习惯名称'); return; }
  const emoji = document.querySelector('.emoji-btn.selected')?.textContent || '💪';
  state.habits.push({
    id: DB.genId(),
    name,
    emoji,
    records: [],
    createdAt: new Date().toISOString(),
  });
  DB.saveHabits();
  closeModal(document.getElementById('modal-add-habit'));
  showToast('习惯已创建');
  renderHabits();
  renderDashboard();
}

// ==================== 习惯详情 ====================
function openHabitDetail(id) {
  const h = state.habits.find(x => x.id === id);
  if (!h) return;
  state.editingHabit = h;
  document.getElementById('habit-detail-title').textContent = h.name;

  const body = document.getElementById('habit-detail-body');

  // Stats
  const streak = calcStreak(h);
  const total = totalCompleted(h);
  const startDate = new Date(h.createdAt);
  const daysSince = Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000));
  const rate = Math.min(100, Math.round(total / daysSince * 100));

  // Calendar
  const now = new Date();
  const totalDays = daysInMonth(now);
  const wd = firstWeekday(now);
  const today = now.getDate();

  let calCells = '';
  for (let i=0; i<wd; i++) calCells += '<div class="calendar-day other-month"></div>';
  for (let d=1; d<=totalDays; d++) {
    const dateStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const isToday = d === today;
    const completed = isCheckedIn(h, dateStr);
    const isFuture = dateStr > todayISO();
    let cls = 'calendar-day';
    if (isToday) cls += ' today';
    if (completed) cls += ' completed';
    if (isFuture) cls += ' future';
    calCells += `<div class="${cls}">${d}</div>`;
  }

  body.innerHTML = `
    <div class="habit-detail-header">
      <div class="emoji">${h.emoji}</div>
      <div class="name">${h.name}</div>
    </div>
    <div class="card">
      <div class="habit-stats">
        <div><div class="habit-stat-value">${streak}</div><div class="habit-stat-label">连续天数</div></div>
        <div><div class="habit-stat-value">${total}</div><div class="habit-stat-label">累计天数</div></div>
        <div><div class="habit-stat-value">${rate}%</div><div class="habit-stat-label">完成率</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">本月打卡日历</div>
      <div class="calendar-grid">
        <div class="calendar-weekday">日</div>
        <div class="calendar-weekday">一</div>
        <div class="calendar-weekday">二</div>
        <div class="calendar-weekday">三</div>
        <div class="calendar-weekday">四</div>
        <div class="calendar-weekday">五</div>
        <div class="calendar-weekday">六</div>
        ${calCells}
      </div>
    </div>
  `;

  document.getElementById('modal-habit-detail').classList.add('open');
}

function deleteCurrentHabit() {
  if (!state.editingHabit) return;
  if (!confirm('删除习惯「'+state.editingHabit.name+'」？所有打卡记录将一并删除。')) return;
  state.habits = state.habits.filter(h => h.id !== state.editingHabit.id);
  DB.saveHabits();
  state.editingHabit = null;
  closeModal(document.getElementById('modal-habit-detail'));
  showToast('已删除');
  renderHabits();
  renderDashboard();
}

// ==================== 设置 ====================
function renderSettings() {
  document.getElementById('set-expense-count').textContent = state.expenses.length;
  document.getElementById('set-habit-count').textContent = state.habits.length;
  const total = state.habits.reduce((s, h) => s + totalCompleted(h), 0);
  document.getElementById('set-checkin-count').textContent = total;
}

function exportData() {
  let text = 'rayjfoo 数据导出\n';
  text += '导出时间: '+new Date().toLocaleString('zh-CN')+'\n\n';

  text += '=== 记账记录 ===\n';
  text += '日期, 分类, 金额, 类型, 备注\n';
  const sorted = [...state.expenses].sort((a,b)=>new Date(a.date)-new Date(b.date));
  for (const x of sorted) {
    text += `${x.date}, ${x.category}, ¥${x.amount}, ${x.isExpense?'支出':'收入'}, ${x.note}\n`;
  }

  text += '\n=== 打卡记录 ===\n';
  for (const h of state.habits) {
    text += `\n【${h.emoji} ${h.name}】连续${calcStreak(h)}天\n`;
    for (const r of (h.records||[]).filter(r=>r.completed)) {
      text += `  ${r.date}: ✅\n`;
    }
  }

  // Copy to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('数据已复制到剪贴板');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('数据已复制到剪贴板');
}

function clearAllData() {
  if (!confirm('确定清除所有数据？此操作不可恢复！')) return;
  if (!confirm('再次确认：将删除所有记账和打卡数据。')) return;
  state.expenses = [];
  state.habits = [];
  DB.saveExpenses();
  DB.saveHabits();
  renderDashboard();
  renderExpenses();
  renderHabits();
  renderSettings();
  showToast('已清除所有数据');
}

// ==================== 统计 ====================
function openStats() {
  state.statsYear = new Date().getFullYear();
  renderStats();
  document.getElementById('modal-stats').classList.add('open');
}

function statsYear(d) {
  state.statsYear += d;
  renderStats();
}

function renderStats() {
  const year = state.statsYear;
  document.getElementById('stats-year-label').textContent = year+'年';

  const yearExpenses = state.expenses.filter(x => {
    const d = new Date(x.date);
    return d.getFullYear() === year && x.isExpense;
  });

  // Bar chart
  const monthlyData = [];
  for (let m=1; m<=12; m++) {
    const total = yearExpenses.filter(x => new Date(x.date).getMonth()+1 === m).reduce((s,x)=>s+x.amount, 0);
    if (total > 0) monthlyData.push({month: m, amount: total});
  }

  const chartEl = document.getElementById('stats-chart');
  if (!monthlyData.length) {
    chartEl.innerHTML = '<div class="no-data">暂无数据</div>';
  } else {
    const max = Math.max(...monthlyData.map(d => d.amount));
    chartEl.innerHTML = '<div class="bar-chart">' + monthlyData.map(d => `
      <div class="bar-wrapper">
        <div class="bar" style="height:${(d.amount/max*150)+'px'}"></div>
        <div class="bar-label">${d.month}月</div>
      </div>
    `).join('') + '</div>';
  }

  // Category ranking
  const catMap = {};
  for (const x of yearExpenses) {
    catMap[x.category] = (catMap[x.category]||0) + x.amount;
  }
  const total = Object.values(catMap).reduce((s,v)=>s+v, 0);
  const sorted = Object.entries(catMap).sort((a,b) => b[1]-a[1]);

  const catEl = document.getElementById('stats-category');
  if (!sorted.length) {
    catEl.innerHTML = '<div class="empty-state">暂无数据</div>';
  } else {
    catEl.innerHTML = sorted.map(([cat, amt], i) => `
      <div class="cat-rank-row">
        <span class="cat-rank-num">${i+1}</span>
        <span class="cat-rank-name">${cat}</span>
        <span class="cat-rank-amount">¥${amt.toFixed(0)}</span>
        <span class="cat-rank-pct">${total>0 ? Math.round(amt/total*100) : 0}%</span>
      </div>
    `).join('');
  }
}

// ==================== CSV导入 ====================
let csvSource = 'auto';
let csvEncoding = 'utf8';

function openCSVImport() {
  csvSource = 'auto';
  csvEncoding = 'utf8';
  document.getElementById('csv-text').value = '';
  document.getElementById('csv-result').innerHTML = '';
  document.getElementById('csv-result').className = 'csv-result';
  document.getElementById('csv-file').value = '';
  document.getElementById('csv-file-name').textContent = '未选择文件';

  document.querySelectorAll('#csv-source-toggle .toggle-btn').forEach((b,i) => {
    b.classList.toggle('active', i===0);
  });
  document.querySelectorAll('#csv-encoding-toggle .toggle-btn').forEach((b,i) => {
    b.classList.toggle('active', i===0);
  });

  document.getElementById('modal-csv').classList.add('open');
}

// 选择文件
document.getElementById('csv-file').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('csv-file-name').textContent = file.name;
  readCSVFile(file, csvEncoding);
});

function selectEncoding(el, enc) {
  csvEncoding = enc;
  document.querySelectorAll('#csv-encoding-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  const fileInput = document.getElementById('csv-file');
  if (fileInput.files && fileInput.files[0]) {
    readCSVFile(fileInput.files[0], enc);
  }
}

function readCSVFile(file, encoding) {
  const reader = new FileReader();
  reader.onload = function(e) {
    if (encoding === 'gbk') {
      try {
        const decoder = new TextDecoder('gbk');
        document.getElementById('csv-text').value = decoder.decode(e.target.result);
      } catch {
        const decoder = new TextDecoder('utf-8');
        document.getElementById('csv-text').value = decoder.decode(e.target.result);
        showToast('GBK 解码失败，已回退到 UTF-8');
      }
    } else {
      const decoder = new TextDecoder('utf-8');
      document.getElementById('csv-text').value = decoder.decode(e.target.result);
    }
  };
  reader.onerror = function() { showToast('读取文件失败'); };
  reader.readAsArrayBuffer(file);
}

function selectCSVSource(el, src) {
  csvSource = src;
  document.querySelectorAll('#csv-source-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function importCSV() {
  const text = document.getElementById('csv-text').value.trim();
  if (!text) { showToast('请先选择文件或粘贴内容'); return; }

  // 自动检测来源
  let source = csvSource;
  if (source === 'auto') {
    const lower = text.toLowerCase();
    if (lower.includes('支付宝') || lower.includes('余额')) source = 'alipay';
    else if (lower.includes('微信支付') || lower.includes('微信') || lower.includes('商户单号')) source = 'wechat';
    else source = 'alipay';
  }

  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { showToast('文件内容太少，需要标题行+数据行'); return; }

  // 寻找标题行
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const row = lines[i];
    if (/时间/.test(row) && /金额/.test(row)) { headerIdx = i; break; }
    if (/交易/.test(row) && /金额/.test(row)) { headerIdx = i; break; }
  }
  if (headerIdx === -1) {
    // 没有找到标题行，尝试找第一行有数字的
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length >= 6) { headerIdx = i; break; }
    }
    if (headerIdx === -1) headerIdx = 0;
  }

  // 解析标题行，映射列位置
  const headerCols = parseCSVLine(lines[headerIdx]);
  const col = { date:-1, amount:-1, type:-1, note:-1, status:-1 };

  for (let i = 0; i < headerCols.length; i++) {
    const c = headerCols[i].trim();
    if (/时间|日期/.test(c) && col.date === -1) col.date = i;
    if (/金额/.test(c) && col.amount === -1) col.amount = i;
    if (/收.?支/.test(c)) col.type = i;
    else if (/收$|^收/.test(c)) col.type = i;
    else if (/支$|^支/.test(c)) col.type = i;
    if (/商品|说明|名称/.test(c) && col.note === -1) col.note = i;
    if (/状态/.test(c) && col.status === -1) col.status = i;
    if (/分类/.test(c) && col.note === -1) col.note = i;
    if (/对方/.test(c) && col.note === -1) col.note = i;
  }

  // 如果列映射失败，按来源使用固定位置
  if (col.date === -1 || col.amount === -1) {
    if (source === 'alipay') { col.date=0; col.note=3; col.type=4; col.amount=5; col.status=7; }
    else { col.date=0; col.note=3; col.type=4; col.amount=5; col.status=7; }
  }

  let imported = 0, skipped = 0, errors = [];
  const maxIdx = Math.max(col.date, col.amount, col.type, col.status, col.note);

  for (let i = headerIdx + 1; i < lines.length; i++) {
    try {
      if (i >= lines.length) continue;
      const cols = parseCSVLine(lines[i]);
      if (cols.length <= maxIdx) { skipped++; continue; }

      const dateRaw = (cols[col.date] || '').trim();
      const desc = (col.note !== -1 ? (cols[col.note] || '') : '').trim();
      const typeRaw = (col.type !== -1 ? (cols[col.type] || '') : '').trim();
      let amountRaw = (cols[col.amount] || '').trim().replace(/,/g, '');

      // 跳过非数据行
      if (isNaN(parseFloat(amountRaw.replace(/[¥￥]/g,'')))) { skipped++; continue; }

      const statusRaw = col.status !== -1 ? (cols[col.status] || '').trim() : '';

      // 状态过滤 (支付宝/微信状态值不同)
      if (statusRaw && !/成功|收支|已全额/.test(statusRaw)) { skipped++; continue; }

      // 解析日期
      const dt = parseDate(dateRaw);
      if (!dt) { errors.push('行'+(i+1)+': 日期无效 "'+dateRaw.slice(0,16)+'"'); continue; }
      if (dt > new Date()) { skipped++; continue; }

      const dateISO = dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
      const amount = Math.abs(parseFloat(amountRaw.replace(/[¥￥]/g,'')));
      if (isNaN(amount) || amount <= 0) { skipped++; continue; }

      const isExpense = typeRaw === '支出';

      // 去重
      if (state.expenses.some(x => x.date === dateISO && Math.abs(x.amount-amount)<0.01)) {
        skipped++; continue;
      }

      const cat = mapCategory(desc, isExpense);
      state.expenses.push({
        id: DB.genId(),
        amount: Math.round(amount * 100) / 100,
        category: cat,
        note: desc.slice(0,30),
        date: dateISO,
        isExpense,
        createdAt: new Date().toISOString(),
      });
      imported++;
    } catch(e) {
      errors.push('行'+(i+1)+': 解析错误');
    }
  }

  DB.saveExpenses();

  const resultEl = document.getElementById('csv-result');
  if (imported > 0) {
    resultEl.className = 'csv-result success';
    let msg = '✅ 成功导入 '+imported+' 条记录';
    if (skipped > 0) msg += '，跳过 '+skipped+' 条';
    if (errors.length) msg += '<span class="detail">⚠️ '+errors.length+' 个警告（最多显示5条）:<br>'+errors.slice(0,5).join('<br>')+'</span>';
    resultEl.innerHTML = msg;
    renderDashboard();
    renderExpenses();
  } else {
    // 诊断信息
    let diag = '';
    diag += '<span class="detail">来源: '+source+'</span>';
    diag += '<span class="detail">标题行: 第'+(headerIdx+1)+'行 → '+escapeHTML(headerCols.slice(0,6).join(' | '))+'</span>';
    diag += '<span class="detail">列映射: 日期='+col.date+' 金额='+col.amount+' 类型='+col.type+' 备注='+col.note+' 状态='+col.status+'</span>';
    // 显示前3条数据行
    const dataPreview = [];
    for (let i = headerIdx+1; i < Math.min(headerIdx+4, lines.length); i++) {
      dataPreview.push('行'+(i+1)+': '+escapeHTML(lines[i].slice(0,80)));
    }
    diag += '<span class="detail">前几条数据:<br>'+dataPreview.join('<br>')+'</span>';
    if (errors.length) diag += '<span class="detail">错误:<br>'+errors.slice(0,5).join('<br>')+'</span>';
    if (skipped > 0) diag += '<span class="detail">共跳过 '+skipped+' 行</span>';

    resultEl.className = 'csv-result error';
    resultEl.innerHTML = '❌ 未能导入任何记录'+diag;
  }
}

function escapeHTML(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function parseDate(str) {
  let s = str.trim();
  const m = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) {
    const d = new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
    if (!isNaN(d.getTime())) return d;
  }
  const d2 = new Date(s.replace(/-/g, '/'));
  if (!isNaN(d2.getTime())) return d2;
  return null;
}

function parseCSVLine(line) {
  const result = [];
  let curr = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(curr); curr = ''; }
    else { curr += ch; }
  }
  result.push(curr);
  return result;
}

function mapCategory(desc, isExp) {
  if (isExp) {
    if (/餐|食|买菜|外卖/.test(desc)) return '餐饮';
    if (/交通|加油|地铁|公交|打车/.test(desc)) return '交通';
    if (/淘宝|京东|拼多多|购物|超市/.test(desc)) return '购物';
    if (/房租|水电|物业|燃气/.test(desc)) return '居住';
    if (/娱乐|电影|游戏|视频/.test(desc)) return '娱乐';
    if (/医疗|药|医院|体检/.test(desc)) return '医疗';
    if (/教育|课程|培训|书/.test(desc)) return '教育';
    if (/通讯|话费|流量/.test(desc)) return '通讯';
    if (/服饰|衣服|鞋|包/.test(desc)) return '服饰';
    if (/日用|家居|五金/.test(desc)) return '日用';
    return '其他支出';
  } else {
    if (/工资|薪资/.test(desc)) return '工资';
    if (/奖金|绩效/.test(desc)) return '奖金';
    if (/红包/.test(desc)) return '红包';
    if (/理财|利息|基金/.test(desc)) return '投资';
    return '其他收入';
  }
}

// ==================== 辅助 ====================
function getCategory(id) {
  return ALL_CATEGORIES.find(c => c.id === id);
}

function closeModal(el) {
  el.classList.remove('open');
  while (el && !el.classList.contains('modal-overlay')) el = el.parentElement;
  if (el) el.classList.remove('open');
}

// Close modal on back button
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// ==================== 初始化 ====================
DB.load();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// Render initial
switchTab('dashboard');
