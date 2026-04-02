/* ═══════════════════════════════════════════
   FocusFlow — Work Tracking + Revenue App v3
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

  // ─── Toast System ───
  function showToast(message, type = 'success') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    const iconSvg = type === 'success'
      ? '<svg class="toast-icon toast-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg class="toast-icon toast-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    toast.innerHTML = `${iconSvg}<span class="toast-text">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // ─── Celebration ───
  function celebrate() {
    const overlay = $('#celebration-overlay');
    const colors = ['#4ade80', '#34d399', '#a78bfa', '#f472b6', '#fbbf24', '#60a5fa'];
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = '-10px';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.8 + 's';
      confetti.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      confetti.style.width = (5 + Math.random() * 6) + 'px';
      confetti.style.height = (5 + Math.random() * 6) + 'px';
      overlay.appendChild(confetti);
    }
    setTimeout(() => { overlay.innerHTML = ''; }, 3500);
  }

  // ─── Storage ───
  function getSessions() {
    try { return JSON.parse(localStorage.getItem('focusflow_sessions') || '[]'); }
    catch { return []; }
  }
  function saveSessions(sessions) { localStorage.setItem('focusflow_sessions', JSON.stringify(sessions)); }
  function getRevenue() {
    try { return JSON.parse(localStorage.getItem('focusflow_revenue') || '[]'); }
    catch { return []; }
  }
  function saveRevenue(entries) { localStorage.setItem('focusflow_revenue', JSON.stringify(entries)); }
  function getGoal() {
    try { return JSON.parse(localStorage.getItem('focusflow_goal') || '{}'); }
    catch { return {}; }
  }
  function saveGoal(goal) { localStorage.setItem('focusflow_goal', JSON.stringify(goal)); }

  // ─── Helpers ───
  function formatTime(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }
  function formatDuration(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }
  function formatHM(s) { return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`; }
  function formatMoney(v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
  function formatMoneyShort(v) {
    if (v >= 1000) return 'R$ ' + (v/1000).toFixed(1).replace('.0','') + 'k';
    return 'R$ ' + Number(v).toFixed(0);
  }
  function getDateKey(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; }
  function getMonthKey(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`; }
  function getCurrentMonthKey() { return getMonthKey(new Date()); }
  function getTodayKey() { return getDateKey(new Date()); }
  function formatTimeOfDay(d) { const x = new Date(d); return `${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`; }
  function getDayName(s) { return ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][new Date(s+'T12:00:00').getDay()]; }
  function getMonthName(k) { return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(k.split('-')[1])-1]; }
  function getMonthFullName(k) { const m = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']; return `${m[parseInt(k.split('-')[1])-1]} ${k.split('-')[0]}`; }
  function getFullDayName(s) {
    if (s === getTodayKey()) return 'Hoje';
    if (s === getDateKey(new Date(Date.now()-86400000))) return 'Ontem';
    const m = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const d = new Date(s+'T12:00:00');
    return `${getDayName(s)}, ${d.getDate()} ${m[d.getMonth()]}`;
  }
  function formatDateShort(s) { const d = new Date(s+'T12:00:00'); const m = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; return `${d.getDate()} ${m[d.getMonth()]}`; }
  function getDaysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

  // ─── Timer Logic ───
  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(elapsedSeconds);
    const progress = (elapsedSeconds % 3600) / 3600;
    ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    if (isRunning) document.title = `${formatTime(elapsedSeconds)} — FocusFlow`;
  }

  function tick() {
    elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
    updateTimerDisplay();
  }

  function startTimer() {
    if (isRunning) {
      clearInterval(timerInterval); isRunning = false;
      iconPlay.style.display = ''; iconPause.style.display = 'none';
      btnStart.classList.remove('running');
      timerLabel.textContent = 'Pausado'; timerLabel.classList.remove('running');
      statusDot.classList.remove('active'); statusBadge.classList.remove('active');
      statusText.textContent = 'Pausado';
      timerGlow.classList.remove('active');
      btnSave.disabled = false;
      document.title = 'FocusFlow — Work Tracker';
    } else {
      startTimestamp = startTimestamp === null ? Date.now() : Date.now() - elapsedSeconds * 1000;
      timerInterval = setInterval(tick, 250); isRunning = true;
      iconPlay.style.display = 'none'; iconPause.style.display = '';
      btnStart.classList.add('running');
      btnReset.disabled = false; btnSave.disabled = true;
      timerLabel.textContent = 'Focando...'; timerLabel.classList.add('running');
      statusDot.classList.add('active'); statusBadge.classList.add('active');
      statusText.textContent = 'Em foco';
      timerGlow.classList.add('active');
    }
  }

  function resetTimer() {
    clearInterval(timerInterval); isRunning = false; elapsedSeconds = 0; startTimestamp = null;
    updateTimerDisplay();
    iconPlay.style.display = ''; iconPause.style.display = 'none';
    btnStart.classList.remove('running'); btnReset.disabled = true; btnSave.disabled = true;
    timerLabel.textContent = 'Pronto'; timerLabel.classList.remove('running');
    statusDot.classList.remove('active'); statusBadge.classList.remove('active');
    statusText.textContent = 'Pronto para focar';
    timerGlow.classList.remove('active');
    ringProgress.style.strokeDashoffset = 0;
    document.title = 'FocusFlow — Work Tracker';
  }

  function saveSession() {
    if (elapsedSeconds < 5) { showToast('Sessao muito curta (minimo 5s)', 'error'); return; }
    const endTime = Date.now(), startTime = endTime - elapsedSeconds * 1000;
    const session = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      start: startTime, end: endTime, duration: elapsedSeconds,
      tag: 'Work', date: getDateKey(new Date(startTime)),
    };
    const sessions = getSessions(); sessions.push(session); saveSessions(sessions);
    showToast(`Sessao salva! ${formatDuration(elapsedSeconds)} registradas`);
    resetTimer(); renderAll();
  }

  function deleteSession(id) {
    saveSessions(getSessions().filter(s => s.id !== id));
    showToast('Sessao removida'); renderAll();
  }

  // ─── Revenue Logic ───
  let previousGoalAchieved = false;

  function addRevenue() {
    const valInput = $('#input-revenue-value'), descInput = $('#input-revenue-desc'), dateInput = $('#input-revenue-date');
    const val = parseFloat(valInput.value);
    if (!val || val <= 0) { showToast('Insira um valor valido', 'error'); return; }
    const dateStr = dateInput.value || getTodayKey();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      value: val, description: descInput.value.trim(), date: dateStr,
      month: getMonthKey(new Date(dateStr+'T12:00:00')), createdAt: Date.now(),
    };
    const entries = getRevenue(); entries.push(entry); saveRevenue(entries);
    valInput.value = ''; descInput.value = '';
    showToast(`${formatMoney(val)} registrado!`);
    renderAll();

    // Check if goal just achieved
    const goal = getGoal();
    if (goal.value) {
      const monthRevenue = entries.filter(e => e.month === getCurrentMonthKey()).reduce((s,e) => s + e.value, 0);
      if (monthRevenue >= goal.value && !previousGoalAchieved) {
        setTimeout(() => { celebrate(); showToast('Meta mensal atingida! Parabens!'); }, 300);
      }
    }
  }

  function deleteRevenue(id) {
    saveRevenue(getRevenue().filter(e => e.id !== id));
    showToast('Entrada removida'); renderAll();
  }

  // ─── Export / Import ───
  function exportData() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      sessions: getSessions(),
      revenue: getRevenue(),
      goal: getGoal(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `focusflow-backup-${getTodayKey()}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Dados exportados!');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.sessions) saveSessions(data.sessions);
        if (data.revenue) saveRevenue(data.revenue);
        if (data.goal) saveGoal(data.goal);
        showToast(`Dados importados! ${(data.sessions||[]).length} sessoes, ${(data.revenue||[]).length} entradas`);
        renderAll();
      } catch {
        showToast('Erro ao importar arquivo', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ─── Quick Stats ───
  function updateQuickStats() {
    const sessions = getSessions(), today = getTodayKey();
    const todayTotal = sessions.filter(s => s.date === today).reduce((sum,s) => sum + s.duration, 0);
    $('#pill-today-val').textContent = `${formatHM(todayTotal)} hoje`;
    let streak = 0; const d = new Date();
    while (sessions.some(s => s.date === getDateKey(d))) { streak++; d.setDate(d.getDate()-1); }
    $('#pill-streak-val').textContent = `${streak} dia${streak!==1?'s':''}`;
  }

  // ─── Empty State HTML ───
  function emptyHTML(icon, title, text, hint) {
    return `<div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-text">${text}</div>
      ${hint ? `<div class="empty-state-hint">${hint}</div>` : ''}
    </div>`;
  }

  // ─── Render: Today Sessions ───
  function renderTodaySessions() {
    const container = $('#today-sessions'), today = getTodayKey();
    const sessions = getSessions().filter(s => s.date === today).sort((a,b) => b.start - a.start);
    $('#today-count').textContent = `${sessions.length} sess${sessions.length!==1?'oes':'ao'}`;
    if (sessions.length === 0) {
      container.innerHTML = emptyHTML(
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        'Nenhuma sessao hoje',
        'Comece uma sessao de foco para registrar seu trabalho.',
        'Pressione <span class="kbd">Espaco</span> para iniciar'
      );
      return;
    }
    container.innerHTML = sessions.map(s => `
      <div class="session-item"><div class="session-info">
        <span class="session-tag-badge">WORK</span>
        <span class="session-time-range">${formatTimeOfDay(s.start)} — ${formatTimeOfDay(s.end)}</span>
      </div><div style="display:flex;align-items:center;">
        <span class="session-duration">${formatDuration(s.duration)}</span>
        <button class="session-delete" data-id="${s.id}" title="Remover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div></div>
    `).join('');
    container.querySelectorAll('.session-delete').forEach(b => b.addEventListener('click', () => deleteSession(b.dataset.id)));
  }

  // ─── Render: Weekly Chart ───
  function renderWeeklyChart() {
    const container = $('#weekly-chart'), sessions = getSessions(), days = [];
    let weekTotal = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const key = getDateKey(d), total = sessions.filter(s => s.date === key).reduce((sum,s) => sum+s.duration, 0);
      weekTotal += total; days.push({key, total, label: getDayName(key), isToday: i===0});
    }
    $('#chart-total').textContent = `${formatHM(weekTotal)} total`;
    const maxVal = Math.max(...days.map(d => d.total), 1);
    container.innerHTML = days.map(d => {
      const h = Math.max((d.total/maxVal)*155, 4);
      return `<div class="chart-bar-wrapper">
        <span class="chart-bar-value">${d.total>0?formatDuration(d.total):'—'}</span>
        <div class="chart-bar ${d.isToday?'today':''}" style="height:${h}px"></div>
        <span class="chart-bar-label">${d.isToday?'Hoje':d.label}</span>
      </div>`;
    }).join('');
  }

  // ─── Render: History List ───
  function renderHistoryList() {
    const container = $('#history-list'), sessions = getSessions(), grouped = {};
    sessions.forEach(s => { if (!grouped[s.date]) grouped[s.date]=[]; grouped[s.date].push(s); });
    const sortedDates = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
    if (sortedDates.length === 0) {
      container.innerHTML = emptyHTML(
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>',
        'Sem historico ainda',
        'Suas sessoes de trabalho vao aparecer aqui.'
      );
      return;
    }
    container.innerHTML = sortedDates.slice(0,14).map(date => {
      const ds = grouped[date].sort((a,b) => b.start-a.start);
      const total = ds.reduce((sum,s) => sum+s.duration, 0);
      return `<div class="history-day">
        <div class="history-day-header" data-date="${date}">
          <span class="history-day-date">${getFullDayName(date)}</span>
          <span class="history-day-total">${formatDuration(total)}</span>
        </div>
        <div class="history-day-sessions" id="sessions-${date}">
          ${ds.map(s => `<div class="session-item"><div class="session-info">
            <span class="session-tag-badge">WORK</span>
            <span class="session-time-range">${formatTimeOfDay(s.start)} — ${formatTimeOfDay(s.end)}</span>
          </div><span class="session-duration">${formatDuration(s.duration)}</span></div>`).join('')}
        </div>
      </div>`;
    }).join('');
    container.querySelectorAll('.history-day-header').forEach(h => {
      h.addEventListener('click', () => $(`#sessions-${h.dataset.date}`).classList.toggle('open'));
    });
  }

  // ─── Render: Stats ───
  function renderStats() {
    const sessions = getSessions(), today = getTodayKey();
    const todayTotal = sessions.filter(s => s.date === today).reduce((sum,s) => sum+s.duration, 0);
    $('#stat-total-today').textContent = formatHM(todayTotal);

    let streak = 0; const sd = new Date();
    while (sessions.some(s => s.date === getDateKey(sd))) { streak++; sd.setDate(sd.getDate()-1); }
    $('#stat-streak').textContent = `${streak} dia${streak!==1?'s':''}`;

    // This week avg
    let thisWeek = 0, thisWeekDays = 0;
    for (let i = 0; i < 7; i++) {
      const key = getDateKey(new Date(Date.now()-i*86400000));
      const dt = sessions.filter(s => s.date===key).reduce((sum,s) => sum+s.duration, 0);
      thisWeek += dt; if (dt > 0) thisWeekDays++;
    }
    const thisAvg = thisWeekDays > 0 ? Math.round(thisWeek/thisWeekDays) : 0;
    $('#stat-avg').textContent = formatHM(thisAvg);

    // Last week avg for comparison
    let lastWeek = 0, lastWeekDays = 0;
    for (let i = 7; i < 14; i++) {
      const key = getDateKey(new Date(Date.now()-i*86400000));
      const dt = sessions.filter(s => s.date===key).reduce((sum,s) => sum+s.duration, 0);
      lastWeek += dt; if (dt > 0) lastWeekDays++;
    }
    const lastAvg = lastWeekDays > 0 ? Math.round(lastWeek/lastWeekDays) : 0;
    const compareEl = $('#stat-avg-compare');
    if (lastAvg > 0 && thisAvg > 0) {
      const diff = ((thisAvg - lastAvg) / lastAvg * 100).toFixed(0);
      const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
      const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
      compareEl.className = `stat-compare ${cls}`;
      compareEl.textContent = `${arrow} ${Math.abs(diff)}% vs semana passada`;
    } else {
      compareEl.className = 'stat-compare'; compareEl.textContent = '';
    }

    const grouped = {};
    sessions.forEach(s => { grouped[s.date] = (grouped[s.date]||0) + s.duration; });
    const best = Math.max(...Object.values(grouped), 0);
    $('#stat-best').textContent = formatHM(best);
    $('#stat-sessions-count').textContent = sessions.length;
    const longest = sessions.reduce((max,s) => Math.max(max,s.duration), 0);
    $('#stat-longest-session').textContent = formatHM(longest);
  }

  // ─── Render: Revenue ───
  function renderRevenue() {
    const entries = getRevenue(), goal = getGoal(), currentMonth = getCurrentMonthKey(), now = new Date();
    $('#goal-period').textContent = getMonthFullName(currentMonth);

    const monthRevenue = entries.filter(e => e.month === currentMonth).reduce((sum,e) => sum+e.value, 0);
    $('#pill-month-revenue').textContent = `${formatMoneyShort(monthRevenue)} este mes`;

    const goalValue = goal.value || 0;
    const percent = goalValue > 0 ? Math.min((monthRevenue/goalValue)*100, 100) : 0;
    previousGoalAchieved = goalValue > 0 && monthRevenue >= goalValue;

    $('#goal-current').textContent = formatMoney(monthRevenue);
    $('#goal-target').textContent = goalValue > 0 ? `Meta: ${formatMoney(goalValue)}` : 'Sem meta definida';

    // Dynamic bar colors
    const barFill = $('#goal-bar-fill');
    barFill.style.width = `${percent}%`;
    barFill.className = 'goal-bar-fill';
    if (goalValue > 0) {
      if (percent >= 100) barFill.classList.add('goal-done');
      else if (percent >= 70) barFill.classList.add('goal-high');
      else if (percent >= 40) barFill.classList.add('goal-mid');
      else barFill.classList.add('goal-low');
    }

    // Card state for achieved
    const goalCard = $('#revenue-goal-card');
    goalCard.classList.toggle('goal-achieved', percent >= 100 && goalValue > 0);

    $('#goal-percent').textContent = `${percent.toFixed(1)}%`;
    const remaining = Math.max(goalValue - monthRevenue, 0);
    $('#goal-remaining').textContent = goalValue > 0
      ? (remaining > 0 ? `Faltam ${formatMoney(remaining)}` : 'Meta atingida!')
      : 'Defina uma meta';

    // Projection + Daily pace
    const dayOfMonth = now.getDate();
    const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth()+1);
    const projection = dayOfMonth > 0 ? (monthRevenue/dayOfMonth)*daysInMonth : 0;
    $('#projection-value').textContent = formatMoney(projection);

    const daysLeft = daysInMonth - dayOfMonth;
    const dailyPace = (goalValue > 0 && daysLeft > 0) ? Math.max(remaining/daysLeft, 0) : 0;
    $('#pace-daily').textContent = goalValue > 0 ? `${formatMoney(dailyPace)}/dia` : '—';

    renderRevenueChart(entries);
    renderRevenueList(entries);
  }

  function renderRevenueChart(entries) {
    const container = $('#revenue-chart'), months = [], currentMonth = getCurrentMonthKey();
    let total6m = 0;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
      const key = getMonthKey(d), mt = entries.filter(e => e.month===key).reduce((s,e) => s+e.value, 0);
      total6m += mt; months.push({key, total: mt, label: getMonthName(key), isCurrent: key===currentMonth});
    }
    $('#revenue-6m-total').textContent = `${formatMoney(total6m)} total`;
    const maxVal = Math.max(...months.map(m => m.total), 1);
    container.innerHTML = months.map(m => {
      const h = Math.max((m.total/maxVal)*155, 4);
      return `<div class="chart-bar-wrapper">
        <span class="chart-bar-value">${m.total>0?formatMoneyShort(m.total):'—'}</span>
        <div class="chart-bar revenue-bar ${m.isCurrent?'current-month':''}" style="height:${h}px"></div>
        <span class="chart-bar-label">${m.isCurrent?'Atual':m.label}</span>
      </div>`;
    }).join('');
  }

  function renderRevenueList(entries) {
    const container = $('#revenue-list');
    const sorted = [...entries].sort((a,b) => b.createdAt - a.createdAt);
    $('#revenue-count').textContent = `${sorted.length} entrada${sorted.length!==1?'s':''}`;
    if (sorted.length === 0) {
      container.innerHTML = emptyHTML(
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
        'Nenhuma receita ainda',
        'Registre sua primeira entrada de faturamento acima.'
      );
      return;
    }
    container.innerHTML = sorted.slice(0,30).map(e => `
      <div class="session-item"><div class="session-info">
        <span class="revenue-item-value">${formatMoney(e.value)}</span>
        <span class="revenue-item-desc">${e.description||'—'}</span>
      </div><div style="display:flex;align-items:center;">
        <span class="revenue-item-date">${formatDateShort(e.date)}</span>
        <button class="session-delete" data-revenue-id="${e.id}" title="Remover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div></div>
    `).join('');
    container.querySelectorAll('[data-revenue-id]').forEach(b => b.addEventListener('click', () => deleteRevenue(b.dataset.revenueId)));
  }

  // ─── Render All ───
  function renderAll() {
    renderTodaySessions(); renderWeeklyChart(); renderHistoryList();
    renderStats(); renderRevenue(); updateQuickStats();
  }

  // ─── Navigation ───
  function switchView(name) {
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#view-${name}`).classList.add('active');
    $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view===name));
    $$('.mobile-nav-link').forEach(l => l.classList.toggle('active', l.dataset.view===name));
    renderAll();
  }

  // ─── Events ───
  btnStart.addEventListener('click', startTimer);
  btnReset.addEventListener('click', resetTimer);
  btnSave.addEventListener('click', saveSession);

  $$('.nav-link').forEach(l => l.addEventListener('click', e => { e.preventDefault(); switchView(l.dataset.view); }));
  $$('.mobile-nav-link').forEach(l => l.addEventListener('click', e => { e.preventDefault(); switchView(l.dataset.view); }));

  // Revenue form toggle
  $('#add-revenue-toggle').addEventListener('click', () => {
    const body = $('#revenue-form-body');
    const chevron = $('#toggle-chevron');
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'flex';
    chevron.classList.toggle('open', !isOpen);
    if (!isOpen) $('#input-revenue-value').focus();
  });

  $('#btn-add-revenue').addEventListener('click', addRevenue);
  $('#input-revenue-value').addEventListener('keydown', e => { if (e.key==='Enter') addRevenue(); });

  // Goal edit
  $('#btn-edit-goal').addEventListener('click', () => {
    const form = $('#goal-edit-form');
    form.style.display = form.style.display==='none' ? 'block' : 'none';
    if (form.style.display==='block') { const g = getGoal(); if (g.value) $('#input-goal').value = g.value; $('#input-goal').focus(); }
  });

  function saveGoalAction() {
    const val = parseFloat($('#input-goal').value);
    if (val > 0) { saveGoal({value:val}); $('#goal-edit-form').style.display='none'; showToast(`Meta definida: ${formatMoney(val)}`); renderAll(); }
    else showToast('Insira um valor valido', 'error');
  }
  $('#btn-save-goal').addEventListener('click', saveGoalAction);
  $('#input-goal').addEventListener('keydown', e => { if (e.key==='Enter') saveGoalAction(); });

  // Export/Import (desktop sidebar + mobile)
  $('#btn-export').addEventListener('click', exportData);
  $('#btn-import').addEventListener('click', () => $('#file-import').click());
  const exportMobile = $('#btn-export-mobile');
  const importMobile = $('#btn-import-mobile');
  if (exportMobile) exportMobile.addEventListener('click', exportData);
  if (importMobile) importMobile.addEventListener('click', () => $('#file-import').click());
  $('#file-import').addEventListener('change', e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value=''; });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.code==='Space' && e.target===document.body) { e.preventDefault(); startTimer(); }
  });

  // Default date
  const dateInput = $('#input-revenue-date');
  if (dateInput) dateInput.value = getTodayKey();

  // ─── Init ───
  ringProgress.style.strokeDasharray = CIRCUMFERENCE;
  ringProgress.style.strokeDashoffset = 0;

  // Check if goal was already achieved on load
  const initGoal = getGoal();
  if (initGoal.value) {
    const initRevenue = getRevenue().filter(e => e.month === getCurrentMonthKey()).reduce((s,e) => s+e.value, 0);
    previousGoalAchieved = initRevenue >= initGoal.value;
  }

  renderAll();
})();
