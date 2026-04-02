/* ═══════════════════════════════════════════
   FocusFlow — Work Tracking App
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── State ───
  let timerInterval = null;
  let elapsedSeconds = 0;
  let isRunning = false;
  let startTimestamp = null;
  let selectedTag = 'Trabalho';

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
  const ringProgress = $('.timer-ring-progress');

  const CIRCUMFERENCE = 2 * Math.PI * 140; // r=140

  // ─── Storage ───
  function getSessions() {
    try {
      return JSON.parse(localStorage.getItem('focusflow_sessions') || '[]');
    } catch {
      return [];
    }
  }

  function saveSessions(sessions) {
    localStorage.setItem('focusflow_sessions', JSON.stringify(sessions));
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

  function getDateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  function getFullDayName(dateStr) {
    const today = getTodayKey();
    if (dateStr === today) return 'Hoje';
    const yesterday = getDateKey(new Date(Date.now() - 86400000));
    if (dateStr === yesterday) return 'Ontem';
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const d = new Date(dateStr + 'T12:00:00');
    return `${getDayName(dateStr)}, ${d.getDate()} ${months[d.getMonth()]}`;
  }

  // ─── Timer Logic ───
  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(elapsedSeconds);

    // Update ring — full loop every 60 minutes
    const progress = (elapsedSeconds % 3600) / 3600;
    const offset = CIRCUMFERENCE * (1 - progress);
    ringProgress.style.strokeDashoffset = offset;
  }

  function tick() {
    elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
    updateTimerDisplay();
  }

  function startTimer() {
    if (isRunning) {
      // Pause
      clearInterval(timerInterval);
      isRunning = false;
      iconPlay.style.display = '';
      iconPause.style.display = 'none';
      btnStart.classList.remove('running');
      timerLabel.textContent = 'Pausado';
      timerLabel.classList.remove('running');
      statusDot.classList.remove('active');
      statusText.textContent = 'Pausado';
      btnSave.disabled = false;
    } else {
      // Start / Resume
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
      statusText.textContent = 'Em foco';
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
    statusText.textContent = 'Pronto para focar';
    ringProgress.style.strokeDashoffset = 0;
  }

  function saveSession() {
    if (elapsedSeconds < 5) return; // Minimum 5 seconds

    const endTime = Date.now();
    const startTime = endTime - elapsedSeconds * 1000;

    const session = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      start: startTime,
      end: endTime,
      duration: elapsedSeconds,
      tag: selectedTag,
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

  // ─── Rendering ───
  function renderTodaySessions() {
    const container = $('#today-sessions');
    const today = getTodayKey();
    const sessions = getSessions()
      .filter((s) => s.date === today)
      .sort((a, b) => b.start - a.start);

    if (sessions.length === 0) {
      container.innerHTML = '<div class="empty-state">Nenhuma sessao registrada hoje. Comece a focar!</div>';
      return;
    }

    container.innerHTML = sessions
      .map(
        (s) => `
      <div class="session-item">
        <div class="session-info">
          <span class="session-tag-badge">${s.tag}</span>
          <span class="session-time-range">${formatTimeOfDay(s.start)} — ${formatTimeOfDay(s.end)}</span>
        </div>
        <div style="display:flex;align-items:center;">
          <span class="session-duration">${formatDuration(s.duration)}</span>
          <button class="session-delete" data-id="${s.id}" title="Remover sessao">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `
      )
      .join('');

    container.querySelectorAll('.session-delete').forEach((btn) => {
      btn.addEventListener('click', () => deleteSession(btn.dataset.id));
    });
  }

  function renderWeeklyChart() {
    const container = $('#weekly-chart');
    const sessions = getSessions();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      const total = sessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.duration, 0);
      days.push({ key, total, label: getDayName(key), isToday: i === 0 });
    }

    const maxVal = Math.max(...days.map((d) => d.total), 1);

    container.innerHTML = days
      .map((d) => {
        const height = Math.max((d.total / maxVal) * 160, 4);
        return `
        <div class="chart-bar-wrapper">
          <span class="chart-bar-value">${d.total > 0 ? formatDuration(d.total) : '—'}</span>
          <div class="chart-bar ${d.isToday ? 'today' : ''}" style="height:${height}px"></div>
          <span class="chart-bar-label">${d.isToday ? 'Hoje' : d.label}</span>
        </div>
      `;
      })
      .join('');
  }

  function renderHistoryList() {
    const container = $('#history-list');
    const sessions = getSessions();

    // Group by date
    const grouped = {};
    sessions.forEach((s) => {
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push(s);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    if (sortedDates.length === 0) {
      container.innerHTML = '<div class="empty-state">Nenhuma sessao registrada ainda.</div>';
      return;
    }

    container.innerHTML = sortedDates
      .slice(0, 14)
      .map((date) => {
        const daySessions = grouped[date].sort((a, b) => b.start - a.start);
        const total = daySessions.reduce((sum, s) => sum + s.duration, 0);
        return `
        <div class="history-day">
          <div class="history-day-header" data-date="${date}">
            <span class="history-day-date">${getFullDayName(date)}</span>
            <span class="history-day-total">${formatDuration(total)}</span>
          </div>
          <div class="history-day-sessions" id="sessions-${date}">
            ${daySessions
              .map(
                (s) => `
              <div class="session-item">
                <div class="session-info">
                  <span class="session-tag-badge">${s.tag}</span>
                  <span class="session-time-range">${formatTimeOfDay(s.start)} — ${formatTimeOfDay(s.end)}</span>
                </div>
                <span class="session-duration">${formatDuration(s.duration)}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
      })
      .join('');

    // Toggle day sessions
    container.querySelectorAll('.history-day-header').forEach((header) => {
      header.addEventListener('click', () => {
        const panel = $(`#sessions-${header.dataset.date}`);
        panel.classList.toggle('open');
      });
    });
  }

  function renderStats() {
    const sessions = getSessions();
    const today = getTodayKey();

    // Total today
    const todayTotal = sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.duration, 0);
    $('#stat-total-today').textContent = formatHM(todayTotal);

    // Streak
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = getDateKey(d);
      const hasSessions = sessions.some((s) => s.date === key);
      if (hasSessions) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    $('#stat-streak').textContent = `${streak} dia${streak !== 1 ? 's' : ''}`;

    // Average (7 days)
    let totalWeek = 0;
    let daysWithSessions = 0;
    for (let i = 0; i < 7; i++) {
      const key = getDateKey(new Date(Date.now() - i * 86400000));
      const dayTotal = sessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.duration, 0);
      totalWeek += dayTotal;
      if (dayTotal > 0) daysWithSessions++;
    }
    const avg = daysWithSessions > 0 ? Math.round(totalWeek / daysWithSessions) : 0;
    $('#stat-avg').textContent = formatHM(avg);

    // Best day
    const grouped = {};
    sessions.forEach((s) => {
      grouped[s.date] = (grouped[s.date] || 0) + s.duration;
    });
    const best = Math.max(...Object.values(grouped), 0);
    $('#stat-best').textContent = formatHM(best);

    // Total sessions count
    $('#stat-sessions-count').textContent = sessions.length;

    // Longest session
    const longest = sessions.reduce((max, s) => Math.max(max, s.duration), 0);
    $('#stat-longest-session').textContent = formatHM(longest);

    // Category breakdown
    const categories = {};
    sessions.forEach((s) => {
      categories[s.tag] = (categories[s.tag] || 0) + s.duration;
    });
    const maxCat = Math.max(...Object.values(categories), 1);
    const catContainer = $('#category-bars');

    const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    if (sortedCats.length === 0) {
      catContainer.innerHTML = '<div class="empty-state">Nenhum dado ainda.</div>';
    } else {
      catContainer.innerHTML = sortedCats
        .map(
          ([name, total]) => `
        <div class="category-row">
          <span class="category-name">${name}</span>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width:${(total / maxCat) * 100}%"></div>
          </div>
          <span class="category-value">${formatDuration(total)}</span>
        </div>
      `
        )
        .join('');
    }
  }

  function renderAll() {
    renderTodaySessions();
    renderWeeklyChart();
    renderHistoryList();
    renderStats();
  }

  // ─── Navigation ───
  function switchView(viewName) {
    $$('.view').forEach((v) => v.classList.remove('active'));
    $(`#view-${viewName}`).classList.add('active');

    $$('.nav-link').forEach((l) => l.classList.toggle('active', l.dataset.view === viewName));
    $$('.mobile-nav-link').forEach((l) => l.classList.toggle('active', l.dataset.view === viewName));

    // Re-render when switching to ensure fresh data
    renderAll();
  }

  // ─── Event Listeners ───
  btnStart.addEventListener('click', startTimer);
  btnReset.addEventListener('click', resetTimer);
  btnSave.addEventListener('click', saveSession);

  // Tags
  $('#tags').addEventListener('click', (e) => {
    const tag = e.target.closest('.tag');
    if (!tag) return;
    $$('.tag').forEach((t) => t.classList.remove('active'));
    tag.classList.add('active');
    selectedTag = tag.dataset.tag;
  });

  // Navigation — sidebar
  $$('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });

  // Navigation — mobile
  $$('.mobile-nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });

  // Keyboard shortcut — Space to start/pause
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      startTimer();
    }
  });

  // ─── Init ───
  ringProgress.style.strokeDasharray = CIRCUMFERENCE;
  ringProgress.style.strokeDashoffset = 0;
  renderAll();
})();
