/* ═══════════════════════════════════════════
   FocusFlow — Work Tracking + Revenue App
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Timer State ───
  let timerInterval = null;
  let elapsedSeconds = 0;
  let isRunning = false;
  let startTimestamp = null;

  // ─── DOM ───
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const timerDisplay = $('#timer-display');
  const timerLabel = $('#timer-label');
  const btnStart = $('#btn-start');
  const btnReset = $('#btn-reset');
  const btnSave = $('#btn-save');
  const iconPlay = $('#icon-play');
  const iconPause = $('#icon-pause');
  const statusDot = $('.status-dot');
  const statusText = $('.status-text');
  const statusBadge = $('#status-badge');
  const ringProgress = $('.timer-ring-progress');
  const timerGlow = $('#timer-glow');

  const CIRCUMFERENCE = 2 * Math.PI * 140;

  // ─── Storage ───
  function getSessions() {
    try { return JSON.parse(localStorage.getItem('focusflow_sessions') || '[]'); }
    catch { return []; }
  }
  function saveSessions(sessions) {
    localStorage.setItem('focusflow_sessions', JSON.stringify(sessions));
  }
  function getRevenue() {
    try { return JSON.parse(localStorage.getItem('focusflow_revenue') || '[]'); }
    catch { return []; }
  }
  function saveRevenue(entries) {
    localStorage.setItem('focusflow_revenue', JSON.stringify(entries));
  }
  function getGoal() {
    try { return JSON.parse(localStorage.getItem('focusflow_goal') || '{}'); }
    catch { return {}; }
  }
  function saveGoal(goal) {
    localStorage.setItem('focusflow_goal', JSON.stringify(goal));
  }

  // ─── Helpers ───
  function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${totalSeconds}s`;
  }

  function formatHM(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  function formatMoney(val) {
    return 'R$ ' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatMoneyShort(val) {
    if (val >= 1000) return 'R$ ' + (val / 1000).toFixed(1).replace('.0', '') + 'k';
    return 'R$ ' + Number(val).toFixed(0);
  }

  function getDateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getMonthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function getCurrentMonthKey() {
    return getMonthKey(new Date());
  }

  function getTodayKey() {
    return getDateKey(new Date());
  }

  function formatTimeOfDay(date) {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function getDayName(dateStr) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const d = new Date(dateStr + 'T12:00:00');
    return days[d.getDay()];
  }

  function getMonthName(monthKey) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const [y, m] = monthKey.split('-');
    return `${months[parseInt(m) - 1]}`;
  }

  function getMonthFullName(monthKey) {
    const months = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const [y, m] = monthKey.split('-');
    return `${months[parseInt(m) - 1]} ${y}`;
  }

  function getFullDayName(dateStr) {
    const today = getTodayKey();
    if (dateStr === today) return 'Hoje';
    const yesterday = getDateKey(new Date(Date.now() - 86400000));
    if (dateStr === yesterday) return 'Ontem';
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const d = new Date(dateStr + 'T12:00:00');
    return `${getDayName(dateStr)}, ${d.getDate()} ${months[d.getMonth()]}`;
  }

  function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  // ─── Timer Logic ───
  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(elapsedSeconds);
    const progress = (elapsedSeconds % 3600) / 3600;
    const offset = CIRCUMFERENCE * (1 - progress);
    ringProgress.style.strokeDashoffset = offset;
    if (isRunning) document.title = `${formatTime(elapsedSeconds)} — FocusFlow`;
  }

  function tick() {
    elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
    updateTimerDisplay();
  }

  function startTimer() {
    if (isRunning) {
      clearInterval(timerInterval);
      isRunning = false;
      iconPlay.style.display = '';
      iconPause.style.display = 'none';
      btnStart.classList.remove('running');
      timerLabel.textContent = 'Pausado';
      timerLabel.classList.remove('running');
      statusDot.classList.remove('active');
      statusBadge.classList.remove('active');
      statusText.textContent = 'Pausado';
      timerGlow.classList.remove('active');
      btnSave.disabled = false;
      document.title = 'FocusFlow — Work Tracker';
    } else {
      if (startTimestamp === null) {
        startTimestamp = Date.now();
      } else {
        startTimestamp = Date.now() - elapsedSeconds * 1000;
      }
      timerInterval = setInterval(tick, 250);
      isRunning = true;
      iconPlay.style.display = 'none';
      iconPause.style.display = '';
      btnStart.classList.add('running');
      btnReset.disabled = false;
      btnSave.disabled = true;
      timerLabel.textContent = 'Focando...';
      timerLabel.classList.add('running');
      statusDot.classList.add('active');
      statusBadge.classList.add('active');
      statusText.textContent = 'Em foco';
      timerGlow.classList.add('active');
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    elapsedSeconds = 0;
    startTimestamp = null;
    updateTimerDisplay();
    iconPlay.style.display = '';
    iconPause.style.display = 'none';
    btnStart.classList.remove('running');
    btnReset.disabled = true;
    btnSave.disabled = true;
    timerLabel.textContent = 'Pronto';
    timerLabel.classList.remove('running');
    statusDot.classList.remove('active');
    statusBadge.classList.remove('active');
    statusText.textContent = 'Pronto para focar';
    timerGlow.classList.remove('active');
    ringProgress.style.strokeDashoffset = 0;
    document.title = 'FocusFlow — Work Tracker';
  }

  function saveSession() {
    if (elapsedSeconds < 5) return;
    const endTime = Date.now();
    const startTime = endTime - elapsedSeconds * 1000;
    const session = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      start: startTime,
      end: endTime,
      duration: elapsedSeconds,
      tag: 'Work',
      date: getDateKey(new Date(startTime)),
    };
    const sessions = getSessions();
    sessions.push(session);
    saveSessions(sessions);
    resetTimer();
    renderAll();
  }

  function deleteSession(id) {
    const sessions = getSessions().filter((s) => s.id !== id);
    saveSessions(sessions);
    renderAll();
  }

  // ─── Revenue Logic ───
  function addRevenue() {
    const valInput = $('#input-revenue-value');
    const descInput = $('#input-revenue-desc');
    const dateInput = $('#input-revenue-date');
    const val = parseFloat(valInput.value);
    if (!val || val <= 0) return;

    const dateStr = dateInput.value || getTodayKey();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      value: val,
      description: descInput.value.trim(),
      date: dateStr,
      month: getMonthKey(new Date(dateStr + 'T12:00:00')),
      createdAt: Date.now(),
    };

    const entries = getRevenue();
    entries.push(entry);
    saveRevenue(entries);

    valInput.value = '';
    descInput.value = '';
    renderAll();
  }

  function deleteRevenue(id) {
    const entries = getRevenue().filter((e) => e.id !== id);
    saveRevenue(entries);
    renderAll();
  }

  // ─── Quick Stats ───
  function updateQuickStats() {
    const sessions = getSessions();
    const today = getTodayKey();
    const todayTotal = sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.duration, 0);
    $('#pill-today-val').textContent = `${formatHM(todayTotal)} hoje`;

    let streak = 0;
    const d = new Date();
    while (true) {
      const key = getDateKey(d);
      if (sessions.some((s) => s.date === key)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    $('#pill-streak-val').textContent = `${streak} dia${streak !== 1 ? 's' : ''}`;
  }

  // ─── Render: Today Sessions ───
  function renderTodaySessions() {
    const container = $('#today-sessions');
    const today = getTodayKey();
    const sessions = getSessions().filter((s) => s.date === today).sort((a, b) => b.start - a.start);

    $('#today-count').textContent = `${sessions.length} sess${sessions.length !== 1 ? 'oes' : 'ao'}`;

    if (sessions.length === 0) {
      container.innerHTML = '<div class="empty-state">Nenhuma sessao registrada hoje. Comece a focar!</div>';
      return;
    }

    container.innerHTML = sessions.map((s) => `
      <div class="session-item">
        <div class="session-info">
          <span class="session-tag-badge">WORK</span>
          <span class="session-time-range">${formatTimeOfDay(s.start)} — ${formatTimeOfDay(s.end)}</span>
        </div>
        <div style="display:flex;align-items:center;">
          <span class="session-duration">${formatDuration(s.duration)}</span>
          <button class="session-delete" data-id="${s.id}" title="Remover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.session-delete').forEach((btn) => {
      btn.addEventListener('click', () => deleteSession(btn.dataset.id));
    });
  }

  // ─── Render: Weekly Chart ───
  function renderWeeklyChart() {
    const container = $('#weekly-chart');
    const sessions = getSessions();
    const days = [];
    let weekTotal = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      const total = sessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.duration, 0);
      weekTotal += total;
      days.push({ key, total, label: getDayName(key), isToday: i === 0 });
    }

    $('#chart-total').textContent = `${formatHM(weekTotal)} total`;
    const maxVal = Math.max(...days.map((d) => d.total), 1);

    container.innerHTML = days.map((d) => {
      const height = Math.max((d.total / maxVal) * 155, 4);
      return `
        <div class="chart-bar-wrapper">
          <span class="chart-bar-value">${d.total > 0 ? formatDuration(d.total) : '—'}</span>
          <div class="chart-bar ${d.isToday ? 'today' : ''}" style="height:${height}px"></div>
          <span class="chart-bar-label">${d.isToday ? 'Hoje' : d.label}</span>
        </div>
      `;
    }).join('');
  }

  // ─── Render: History List ───
  function renderHistoryList() {
    const container = $('#history-list');
    const sessions = getSessions();
    const grouped = {};
    sessions.forEach((s) => { if (!grouped[s.date]) grouped[s.date] = []; grouped[s.date].push(s); });
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    if (sortedDates.length === 0) {
      container.innerHTML = '<div class="empty-state">Nenhuma sessao registrada ainda.</div>';
      return;
    }

    container.innerHTML = sortedDates.slice(0, 14).map((date) => {
      const daySessions = grouped[date].sort((a, b) => b.start - a.start);
      const total = daySessions.reduce((sum, s) => sum + s.duration, 0);
      return `
        <div class="history-day">
          <div class="history-day-header" data-date="${date}">
            <span class="history-day-date">${getFullDayName(date)}</span>
            <span class="history-day-total">${formatDuration(total)}</span>
          </div>
          <div class="history-day-sessions" id="sessions-${date}">
            ${daySessions.map((s) => `
              <div class="session-item">
                <div class="session-info">
                  <span class="session-tag-badge">WORK</span>
                  <span class="session-time-range">${formatTimeOfDay(s.start)} — ${formatTimeOfDay(s.end)}</span>
                </div>
                <span class="session-duration">${formatDuration(s.duration)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.history-day-header').forEach((header) => {
      header.addEventListener('click', () => {
        $(`#sessions-${header.dataset.date}`).classList.toggle('open');
      });
    });
  }

  // ─── Render: Stats ───
  function renderStats() {
    const sessions = getSessions();
    const today = getTodayKey();

    const todayTotal = sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.duration, 0);
    $('#stat-total-today').textContent = formatHM(todayTotal);

    let streak = 0;
    const d = new Date();
    while (true) {
      const key = getDateKey(d);
      if (sessions.some((s) => s.date === key)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    $('#stat-streak').textContent = `${streak} dia${streak !== 1 ? 's' : ''}`;

    let totalWeek = 0, daysWithSessions = 0;
    for (let i = 0; i < 7; i++) {
      const key = getDateKey(new Date(Date.now() - i * 86400000));
      const dayTotal = sessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.duration, 0);
      totalWeek += dayTotal;
      if (dayTotal > 0) daysWithSessions++;
    }
    const avg = daysWithSessions > 0 ? Math.round(totalWeek / daysWithSessions) : 0;
    $('#stat-avg').textContent = formatHM(avg);

    const grouped = {};
    sessions.forEach((s) => { grouped[s.date] = (grouped[s.date] || 0) + s.duration; });
    const best = Math.max(...Object.values(grouped), 0);
    $('#stat-best').textContent = formatHM(best);

    $('#stat-sessions-count').textContent = sessions.length;

    const longest = sessions.reduce((max, s) => Math.max(max, s.duration), 0);
    $('#stat-longest-session').textContent = formatHM(longest);
  }

  // ─── Render: Revenue ───
  function renderRevenue() {
    const entries = getRevenue();
    const goal = getGoal();
    const currentMonth = getCurrentMonthKey();
    const now = new Date();

    // Goal period label
    $('#goal-period').textContent = getMonthFullName(currentMonth);

    // Current month revenue
    const monthRevenue = entries.filter((e) => e.month === currentMonth).reduce((sum, e) => sum + e.value, 0);

    // Pill
    $('#pill-month-revenue').textContent = `${formatMoneyShort(monthRevenue)} este mes`;

    // Goal progress
    const goalValue = goal.value || 0;
    const percent = goalValue > 0 ? Math.min((monthRevenue / goalValue) * 100, 100) : 0;

    $('#goal-current').textContent = formatMoney(monthRevenue);
    $('#goal-target').textContent = goalValue > 0 ? `Meta: ${formatMoney(goalValue)}` : 'Sem meta definida';
    $('#goal-bar-fill').style.width = `${percent}%`;
    $('#goal-percent').textContent = `${percent.toFixed(1)}%`;
    const remaining = Math.max(goalValue - monthRevenue, 0);
    $('#goal-remaining').textContent = goalValue > 0 ? `Faltam ${formatMoney(remaining)}` : 'Defina uma meta';

    // Projection
    const dayOfMonth = now.getDate();
    const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth() + 1);
    const projection = dayOfMonth > 0 ? (monthRevenue / dayOfMonth) * daysInMonth : 0;
    $('#projection-value').textContent = formatMoney(projection);

    // Goal edit
    const goalInput = $('#input-goal');
    if (goalInput && !goalInput.value && goalValue > 0) {
      goalInput.placeholder = goalValue.toString();
    }

    // Monthly chart (last 6 months)
    renderRevenueChart(entries);

    // Recent entries
    renderRevenueList(entries);
  }

  function renderRevenueChart(entries) {
    const container = $('#revenue-chart');
    const months = [];
    const currentMonth = getCurrentMonthKey();
    let total6m = 0;

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = getMonthKey(d);
      const monthTotal = entries.filter((e) => e.month === key).reduce((sum, e) => sum + e.value, 0);
      total6m += monthTotal;
      months.push({ key, total: monthTotal, label: getMonthName(key), isCurrent: key === currentMonth });
    }

    $('#revenue-6m-total').textContent = `${formatMoney(total6m)} total`;
    const maxVal = Math.max(...months.map((m) => m.total), 1);

    container.innerHTML = months.map((m) => {
      const height = Math.max((m.total / maxVal) * 155, 4);
      return `
        <div class="chart-bar-wrapper">
          <span class="chart-bar-value">${m.total > 0 ? formatMoneyShort(m.total) : '—'}</span>
          <div class="chart-bar revenue-bar ${m.isCurrent ? 'current-month' : ''}" style="height:${height}px"></div>
          <span class="chart-bar-label">${m.isCurrent ? 'Atual' : m.label}</span>
        </div>
      `;
    }).join('');
  }

  function renderRevenueList(entries) {
    const container = $('#revenue-list');
    const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

    $('#revenue-count').textContent = `${sorted.length} entrada${sorted.length !== 1 ? 's' : ''}`;

    if (sorted.length === 0) {
      container.innerHTML = '<div class="empty-state">Nenhuma receita registrada ainda.</div>';
      return;
    }

    container.innerHTML = sorted.slice(0, 30).map((e) => `
      <div class="session-item">
        <div class="session-info">
          <span class="revenue-item-value">${formatMoney(e.value)}</span>
          <span class="revenue-item-desc">${e.description || '—'}</span>
        </div>
        <div style="display:flex;align-items:center;">
          <span class="revenue-item-date">${formatDateShort(e.date)}</span>
          <button class="session-delete" data-revenue-id="${e.id}" title="Remover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-revenue-id]').forEach((btn) => {
      btn.addEventListener('click', () => deleteRevenue(btn.dataset.revenueId));
    });
  }

  // ─── Render All ───
  function renderAll() {
    renderTodaySessions();
    renderWeeklyChart();
    renderHistoryList();
    renderStats();
    renderRevenue();
    updateQuickStats();
  }

  // ─── Navigation ───
  function switchView(viewName) {
    $$('.view').forEach((v) => v.classList.remove('active'));
    $(`#view-${viewName}`).classList.add('active');
    $$('.nav-link').forEach((l) => l.classList.toggle('active', l.dataset.view === viewName));
    $$('.mobile-nav-link').forEach((l) => l.classList.toggle('active', l.dataset.view === viewName));
    renderAll();
  }

  // ─── Event Listeners ───
  btnStart.addEventListener('click', startTimer);
  btnReset.addEventListener('click', resetTimer);
  btnSave.addEventListener('click', saveSession);

  // Navigation
  $$('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => { e.preventDefault(); switchView(link.dataset.view); });
  });
  $$('.mobile-nav-link').forEach((link) => {
    link.addEventListener('click', (e) => { e.preventDefault(); switchView(link.dataset.view); });
  });

  // Revenue
  $('#btn-add-revenue').addEventListener('click', addRevenue);
  $('#input-revenue-value').addEventListener('keydown', (e) => { if (e.key === 'Enter') addRevenue(); });

  // Goal edit toggle
  $('#btn-edit-goal').addEventListener('click', () => {
    const form = $('#goal-edit-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    if (form.style.display === 'block') {
      const goal = getGoal();
      if (goal.value) $('#input-goal').value = goal.value;
      $('#input-goal').focus();
    }
  });

  // Save goal
  $('#btn-save-goal').addEventListener('click', () => {
    const val = parseFloat($('#input-goal').value);
    if (val > 0) {
      saveGoal({ value: val });
      $('#goal-edit-form').style.display = 'none';
      renderAll();
    }
  });

  $('#input-goal').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = parseFloat($('#input-goal').value);
      if (val > 0) {
        saveGoal({ value: val });
        $('#goal-edit-form').style.display = 'none';
        renderAll();
      }
    }
  });

  // Keyboard: Space to start/pause
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      startTimer();
    }
  });

  // Set default date on revenue input
  const dateInput = $('#input-revenue-date');
  if (dateInput) dateInput.value = getTodayKey();

  // ─── Init ───
  ringProgress.style.strokeDasharray = CIRCUMFERENCE;
  ringProgress.style.strokeDashoffset = 0;
  renderAll();
})();
