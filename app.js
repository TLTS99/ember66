const STORAGE_KEY = "ember66:data";
const DAY_COUNT = 66;
const XP_PER_QUEST = 10;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { quests: [], xp: 0 };
}
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();
let activeTab = "today";
let activeQuestId = data.quests[0]?.id || null;
let timerSeconds = 25 * 60;
let timerRemaining = timerSeconds;
let timerInterval = null;

function levelForXP(xp) {
  return Math.floor(1 + Math.sqrt(xp / 50));
}
function xpForLevel(level) {
  return Math.pow(level - 1, 2) * 50;
}
function xpProgress(xp) {
  const level = levelForXP(xp);
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const pct = Math.round(((xp - cur) / (next - cur)) * 100);
  return { level, cur, next, pct };
}

function questStreak(q) {
  let streak = 0;
  let cursor = todayISO();
  const today = todayISO();
  while (daysBetween(q.startDate, cursor) >= 0) {
    if (q.completions[cursor]) {
      streak++;
      cursor = addDays(cursor, -1);
    } else if (cursor === today) {
      cursor = addDays(cursor, -1);
    } else break;
  }
  return streak;
}

function questDaysDone(q) {
  return Object.values(q.completions).filter(Boolean).length;
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1600);
}

function addQuest(name) {
  const q = {
    id: "q_" + Date.now() + Math.random().toString(36).slice(2, 6),
    name,
    startDate: todayISO(),
    completions: {},
  };
  data.quests.push(q);
  saveData(data);
  activeQuestId = q.id;
  render();
}

function removeQuest(id) {
  data.quests = data.quests.filter((q) => q.id !== id);
  saveData(data);
  if (activeQuestId === id) activeQuestId = data.quests[0]?.id || null;
  render();
}

function toggleQuestToday(id) {
  const q = data.quests.find((x) => x.id === id);
  if (!q) return;
  const today = todayISO();
  if (q.completions[today]) {
    delete q.completions[today];
    data.xp = Math.max(0, data.xp - XP_PER_QUEST);
  } else {
    q.completions[today] = true;
    data.xp += XP_PER_QUEST;
    toast(`+${XP_PER_QUEST} XP`);
  }
  saveData(data);
  render();
}

function toggleGridCell(id, iso) {
  const q = data.quests.find((x) => x.id === id);
  if (!q) return;
  if (q.completions[iso]) {
    delete q.completions[iso];
    data.xp = Math.max(0, data.xp - XP_PER_QUEST);
  } else {
    q.completions[iso] = true;
    data.xp += XP_PER_QUEST;
  }
  saveData(data);
  render();
}

function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function renderTop() {
  const { level, pct } = xpProgress(data.xp);
  return `
    <div class="card">
      <div class="level-row">
        <div class="level-badge">${level}</div>
        <div style="flex:1">
          <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${Math.min(100, Math.max(0, pct))}%"></div></div>
          <div class="xp-label">${data.xp} XP total &middot; Level ${level}</div>
        </div>
      </div>
    </div>
  `;
}

function renderToday() {
  if (data.quests.length === 0) {
    return `
      <div class="empty">
        <div class="headline">No quests yet</div>
        <div>Add your first daily quest to start your 66-day arc.</div>
      </div>
      ${renderAddRow()}
    `;
  }
  const today = todayISO();
  const rows = data.quests.map((q) => {
    const done = !!q.completions[today];
    const streak = questStreak(q);
    return `
      <div class="quest">
        <button class="quest-check ${done ? "done" : ""}" data-toggle="${q.id}">${done ? "✓" : ""}</button>
        <div class="quest-info">
          <div class="quest-name">${escapeHtml(q.name)}</div>
          <div class="quest-meta">${streak} day streak</div>
        </div>
        <button class="quest-del" data-del="${q.id}">&times;</button>
      </div>
    `;
  }).join("");
  return `
    <div class="section-title">Today's quests</div>
    <div class="card">${rows}</div>
    ${renderAddRow()}
  `;
}

function renderAddRow() {
  return `
    <div class="add-row">
      <input type="text" id="questInput" placeholder="e.g. Read 10 pages" maxlength="60" />
      <button class="primary" id="addQuestBtn">Add</button>
    </div>
  `;
}

function renderArc() {
  if (data.quests.length === 0) {
    return `<div class="empty"><div class="headline">Nothing to show yet</div><div>Add a quest on the Today tab first.</div></div>`;
  }
  if (!activeQuestId || !data.quests.find((q) => q.id === activeQuestId)) {
    activeQuestId = data.quests[0].id;
  }
  const chips = data.quests.map((q) => `
    <button class="habit-chip ${q.id === activeQuestId ? "active" : ""}" data-select="${q.id}">${escapeHtml(q.name)}</button>
  `).join("");

  const q = data.quests.find((x) => x.id === activeQuestId);
  const done = questDaysDone(q);
  const streak = questStreak(q);
  const dayIndex = Math.min(daysBetween(q.startDate, todayISO()), DAY_COUNT - 1) + 1;
  const pct = Math.round((done / DAY_COUNT) * 100);

  let cells = "";
  for (let i = 0; i < DAY_COUNT; i++) {
    const iso = addDays(q.startDate, i);
    const isFuture = daysBetween(iso, todayISO()) < 0;
    const isToday = iso === todayISO();
    const isDone = !!q.completions[iso];
    cells += `<button class="grid-cell ${isDone ? "done" : ""} ${isToday ? "today" : ""} ${isFuture ? "future" : ""}"
      ${isFuture ? "disabled" : `data-cell="${q.id}|${iso}"`}>${i + 1}</button>`;
  }

  return `
    <div class="habit-select">${chips}</div>
    <div class="card">
      <div class="stat-row">
        <div class="stat"><div class="num">${streak}</div><div class="lbl">day streak</div></div>
        <div class="stat"><div class="num">${done}/${DAY_COUNT}</div><div class="lbl">completed</div></div>
        <div class="stat"><div class="num">${pct}%</div><div class="lbl">progress</div></div>
        <div class="stat"><div class="num">Day ${Math.max(dayIndex,1)}</div><div class="lbl">of ${DAY_COUNT}</div></div>
      </div>
      <div class="grid-66">${cells}</div>
    </div>
  `;
}

function renderFocus() {
  return `
    <div class="card">
      <div class="section-title" style="margin-bottom:0">Focus timer</div>
      <div class="timer-display">${fmtTime(timerRemaining)}</div>
      <div class="timer-controls">
        <button class="ghost" id="timerMinus">−5 min</button>
        <button class="primary" id="timerToggle">${timerInterval ? "Pause" : "Start"}</button>
        <button class="ghost" id="timerPlus">+5 min</button>
      </div>
      <div style="text-align:center;margin-top:10px">
        <button class="ghost" id="timerReset">Reset</button>
      </div>
    </div>
  `;
}

function renderProfile() {
  const { level } = xpProgress(data.xp);
  const totalDone = data.quests.reduce((s, q) => s + questDaysDone(q), 0);
  const bestStreak = data.quests.reduce((s, q) => Math.max(s, questStreak(q)), 0);
  return `
    <div class="card">
      <div class="section-title" style="margin-bottom:12px">Your arc</div>
      <div class="stat-row">
        <div class="stat"><div class="num">${level}</div><div class="lbl">level</div></div>
        <div class="stat"><div class="num">${data.xp}</div><div class="lbl">total XP</div></div>
        <div class="stat"><div class="num">${data.quests.length}</div><div class="lbl">active quests</div></div>
        <div class="stat"><div class="num">${bestStreak}</div><div class="lbl">best streak</div></div>
        <div class="stat"><div class="num">${totalDone}</div><div class="lbl">days logged</div></div>
      </div>
    </div>
    <div class="card">
      <div class="section-title" style="margin-bottom:8px">Reset progress</div>
      <button class="ghost" id="resetAllBtn">Clear all data</button>
    </div>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render() {
  const main = document.getElementById("main");
  let body = "";
  if (activeTab === "today") body = renderTop() + renderToday();
  else if (activeTab === "arc") body = renderArc();
  else if (activeTab === "focus") body = renderFocus();
  else if (activeTab === "profile") body = renderProfile();
  main.innerHTML = body;

  document.querySelectorAll("[data-toggle]").forEach((el) =>
    el.addEventListener("click", () => toggleQuestToday(el.dataset.toggle))
  );
  document.querySelectorAll("[data-del]").forEach((el) =>
    el.addEventListener("click", () => removeQuest(el.dataset.del))
  );
  document.querySelectorAll("[data-select]").forEach((el) =>
    el.addEventListener("click", () => { activeQuestId = el.dataset.select; render(); })
  );
  document.querySelectorAll("[data-cell]").forEach((el) =>
    el.addEventListener("click", () => {
      const [id, iso] = el.dataset.cell.split("|");
      toggleGridCell(id, iso);
    })
  );
  const addBtn = document.getElementById("addQuestBtn");
  if (addBtn) {
    const input = document.getElementById("questInput");
    addBtn.addEventListener("click", () => {
      const v = input.value.trim();
      if (v) addQuest(v);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const v = input.value.trim();
        if (v) addQuest(v);
      }
    });
  }
  const resetBtn = document.getElementById("resetAllBtn");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (confirm("Clear all quests and XP? This can't be undone.")) {
      data = { quests: [], xp: 0 };
      saveData(data);
      activeQuestId = null;
      render();
    }
  });

  const timerToggle = document.getElementById("timerToggle");
  if (timerToggle) {
    timerToggle.addEventListener("click", () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      } else {
        timerInterval = setInterval(() => {
          timerRemaining = Math.max(0, timerRemaining - 1);
          document.querySelector(".timer-display").textContent = fmtTime(timerRemaining);
          if (timerRemaining === 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            toast("Focus session complete");
            render();
          }
        }, 1000);
      }
      render();
    });
  }
  const minus = document.getElementById("timerMinus");
  const plus = document.getElementById("timerPlus");
  const reset = document.getElementById("timerReset");
  if (minus) minus.addEventListener("click", () => { timerSeconds = Math.max(60, timerSeconds - 300); timerRemaining = timerSeconds; render(); });
  if (plus) plus.addEventListener("click", () => { timerSeconds += 300; timerRemaining = timerSeconds; render(); });
  if (reset) reset.addEventListener("click", () => { timerRemaining = timerSeconds; render(); });

  document.querySelectorAll("nav.tabs button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === activeTab);
  });
}

document.querySelectorAll("nav.tabs button").forEach((b) => {
  b.addEventListener("click", () => {
    activeTab = b.dataset.tab;
    render();
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

render();
