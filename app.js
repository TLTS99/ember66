const STORAGE_KEY = "reset66:data";
const PROGRAM_LENGTH = 66;

/* ---------------- date helpers ---------------- */
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDays(iso, n) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000); }
function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------------- persistence ---------------- */
function freshData() {
  return {
    onboarding: { goals: [], problems: [], wake: "", exercise: "", screentime: "", identity: "", commitment: "", difficulty: "BALANCED" },
    started: false,
    startDate: null,
    quests: [],
    days: {},
    xp: 0,
    attributes: { discipline: 50, body: 50, energy: 50, focus: 50, mind: 50, knowledge: 50, social: 50, purpose: 50 },
    streak: { current: 0, longest: 0, bonusesAwarded: {} },
    achievements: {},
    finaleSeen: false,
  };
}
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...freshData(), ...JSON.parse(raw) };
  } catch (e) {}
  return freshData();
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

let data = loadData();

/* ---------------- content ---------------- */
const GOALS = ["Discipline", "Fitness", "Energy", "Focus", "Sleep", "Confidence", "Productivity", "Mental clarity", "Learning", "Relationships", "Digital habits", "Purpose"];
const PROBLEMS = ["Procrastination", "Phone / social media", "Poor sleep", "Lack of consistency", "Low energy", "Stress", "Lack of structure", "Lack of motivation", "Overthinking", "Distractions"];

const STEP_CONFIG = {
  goal: { title: "WHAT DO YOU WANT TO CHANGE?", multi: true, options: GOALS },
  problem: { title: "WHAT'S GETTING IN YOUR WAY?", multi: true, options: PROBLEMS },
  wake: { title: "What time do you usually wake up?", multi: false, options: ["Before 6am", "6–7am", "7–8am", "After 8am, varies a lot"] },
  exercise: { title: "How often do you currently exercise?", multi: false, options: ["Rarely or never", "1–2 times a week", "3–4 times a week", "Almost daily"] },
  screentime: { title: "How would you describe your daily screen time?", multi: false, options: ["Under 2 hours", "2–4 hours", "4–6 hours", "6+ hours"] },
  commitment: {
    title: "HOW SERIOUS ARE YOU?", multi: false,
    options: [
      { label: "CURIOUS", sub: "I want to explore." },
      { label: "COMMITTED", sub: "I want to improve." },
      { label: "SERIOUS", sub: "I am ready to change." },
      { label: "ALL IN", sub: "I am done making excuses." },
    ],
  },
  difficulty: {
    title: "HOW HARD SHOULD YOUR RESET BE?", multi: false,
    options: [
      { label: "RELAXED", sub: "Gradual progress." },
      { label: "BALANCED", sub: "Steady challenge." },
      { label: "HARD", sub: "Every week gets harder." },
      { label: "BEAST", sub: "Maximum challenge." },
    ],
  },
};
const STEP_ORDER = ["welcome", "goal", "problem", "wake", "exercise", "screentime", "identity", "commitment", "difficulty", "generating", "preview"];

const QUEST_LIBRARY = {
  sleep: [
    { title: "Lights out at a consistent time", description: "Protect your wind-down window tonight.", type: "HABIT", attribute: "discipline", secondaryAttribute: "energy", difficulty: 2 },
    { title: "No screens 30 min before bed", description: "Give your mind a real chance to wind down.", type: "LIMIT", attribute: "discipline", secondaryAttribute: "mind", difficulty: 3 },
  ],
  movement: [
    { title: "10-minute walk", description: "Any time of day, just move.", type: "PHYSICAL", attribute: "body", secondaryAttribute: "energy", difficulty: 1 },
    { title: "20-minute workout", description: "Push your body a little today.", type: "PHYSICAL", attribute: "body", secondaryAttribute: "discipline", difficulty: 3 },
  ],
  screen: [
    { title: "One phone-free hour", description: "Pick a block of time and protect it.", type: "LIMIT", attribute: "focus", secondaryAttribute: "discipline", difficulty: 2 },
    { title: "No phone in the first 30 minutes awake", description: "Start the day on your terms.", type: "LIMIT", attribute: "discipline", secondaryAttribute: "mind", difficulty: 2 },
  ],
  mind: [
    { title: "5-minute breathing break", description: "Slow down and reset your nervous system.", type: "REFLECTION", attribute: "mind", secondaryAttribute: "energy", difficulty: 1 },
    { title: "10-minute quiet sit", description: "No phone, no music, just sit.", type: "REFLECTION", attribute: "mind", secondaryAttribute: "purpose", difficulty: 2 },
  ],
  focus: [
    { title: "One 25-minute focus block", description: "Phone away, single task, no switching.", type: "FOCUS", attribute: "focus", secondaryAttribute: "discipline", difficulty: 2 },
    { title: "Clear your workspace before starting", description: "A clean space, a clear head.", type: "ACTION", attribute: "discipline", secondaryAttribute: "focus", difficulty: 1 },
  ],
  learning: [
    { title: "Read for 15 minutes", description: "Anything that teaches you something.", type: "LEARNING", attribute: "knowledge", secondaryAttribute: "focus", difficulty: 2 },
  ],
  social: [
    { title: "Reach out to one person today", description: "A real message, not just a like.", type: "SOCIAL", attribute: "social", secondaryAttribute: "purpose", difficulty: 1 },
  ],
};
const PROBLEM_TO_CATEGORY = {
  "Procrastination": "focus", "Phone / social media": "screen", "Poor sleep": "sleep",
  "Lack of consistency": "focus", "Low energy": "movement", "Stress": "mind",
  "Lack of structure": "focus", "Lack of motivation": "mind", "Overthinking": "mind", "Distractions": "screen",
};
const GOAL_TO_CATEGORY = {
  "Discipline": "focus", "Fitness": "movement", "Energy": "movement", "Focus": "focus", "Sleep": "sleep",
  "Confidence": "mind", "Productivity": "focus", "Mental clarity": "mind", "Learning": "learning",
  "Relationships": "social", "Digital habits": "screen", "Purpose": "mind",
};

const XP_BY_DIFFICULTY = { 1: 25, 2: 50, 3: 100, 4: 175, 5: 300 };
const SUCCESSFUL_DAY_BONUS = 100;
const PERFECT_DAY_BONUS = 250;
const STREAK_BONUS = { 7: 500, 14: 1000, 30: 2500 };
const DAY66_BONUS = 10000;

const PHASES = [
  { name: "RESET", from: 1, to: 7 },
  { name: "FOUNDATION", from: 8, to: 21 },
  { name: "DISCIPLINE", from: 22, to: 35 },
  { name: "MOMENTUM", from: 36, to: 49 },
  { name: "IDENTITY", from: 50, to: 60 },
  { name: "MASTERY", from: 61, to: 65 },
];
function phaseForDay(day) {
  if (day >= 66) return { name: "TRANSFORMATION", from: 66, to: 66 };
  return PHASES.find((p) => day >= p.from && day <= p.to) || PHASES[0];
}

const ACHIEVEMENTS = [
  { id: "first_step", title: "FIRST STEP", desc: "Complete Day 1." },
  { id: "week_one", title: "WEEK ONE", desc: "Complete 7 successful days." },
  { id: "unbreakable", title: "UNBREAKABLE", desc: "Reach a 14-day streak." },
  { id: "halfway", title: "HALFWAY", desc: "Reach Day 33." },
  { id: "finisher", title: "THE FINISHER", desc: "Complete Day 66." },
];

/* ---------------- program generation ---------------- */
function generateQuests(ob) {
  const cats = [];
  ob.problems.forEach((p) => { const c = PROBLEM_TO_CATEGORY[p]; if (c && !cats.includes(c)) cats.push(c); });
  ob.goals.forEach((g) => { const c = GOAL_TO_CATEGORY[g]; if (c && !cats.includes(c)) cats.push(c); });
  if (cats.length === 0) cats.push("focus", "movement", "mind");

  const band = ob.difficulty || "BALANCED";
  const variantIndex = band === "RELAXED" ? 0 : band === "BALANCED" ? 0 : 1;
  const maxCats = band === "RELAXED" ? 4 : band === "BALANCED" ? 5 : band === "HARD" ? 6 : 7;

  const picked = [];
  cats.slice(0, maxCats).forEach((cat) => {
    const bank = QUEST_LIBRARY[cat];
    if (!bank) return;
    const idx = Math.min(variantIndex, bank.length - 1);
    picked.push({ ...bank[idx], category: cat });
    if (band === "BEAST" && bank.length > 1) picked.push({ ...bank[0], category: cat });
  });
  ["focus", "movement", "mind"].forEach((cat) => {
    if (picked.length < 4) picked.push({ ...QUEST_LIBRARY[cat][0], category: cat });
  });
  const seen = new Set();
  const unique = picked.filter((q) => (seen.has(q.title) ? false : seen.add(q.title)));

  return unique.map((q, i) => ({
    id: "quest_" + i + "_" + Date.now().toString(36),
    title: q.title,
    description: q.description,
    type: q.type,
    attribute: q.attribute,
    secondaryAttribute: q.secondaryAttribute,
    difficulty: q.difficulty,
    xp: XP_BY_DIFFICULTY[q.difficulty],
  }));
}

/* ---------------- level math ---------------- */
function xpForLevel(n) {
  if (n <= 1) return 0;
  let total = 0, inc = 500;
  for (let i = 2; i <= n; i++) { total += inc; inc += 100; }
  return total;
}
function levelForXP(xp) {
  let n = 1;
  while (xpForLevel(n + 1) <= xp && n < 300) n++;
  return n;
}

/* ---------------- day / streak / attribute logic ---------------- */
function ensureDay(iso) {
  if (!data.days[iso]) data.days[iso] = { completed: {}, mood: null, energy: null, win: "", learned: "", status: "incomplete", bonusAwarded: null };
  return data.days[iso];
}
function dayStats(iso) {
  const day = data.days[iso];
  const total = data.quests.length;
  const done = day ? Object.values(day.completed).filter(Boolean).length : 0;
  const pct = total ? done / total : 0;
  return { done, total, pct };
}
function recomputeDayStatus(iso) {
  const day = ensureDay(iso);
  const { pct } = dayStats(iso);
  const status = pct >= 0.9 ? "perfect" : pct >= 0.7 ? "successful" : "incomplete";
  if (status !== day.bonusAwarded) {
    if (day.bonusAwarded === "successful") data.xp -= SUCCESSFUL_DAY_BONUS;
    if (day.bonusAwarded === "perfect") data.xp -= PERFECT_DAY_BONUS;
    if (status === "successful") data.xp += SUCCESSFUL_DAY_BONUS;
    if (status === "perfect") data.xp += PERFECT_DAY_BONUS;
    day.bonusAwarded = status === "incomplete" ? null : status;
  }
  day.status = status;
  data.xp = Math.max(0, data.xp);
}
function recomputeStreak() {
  let streak = 0;
  const today = todayISO();
  let cursor = today;
  while (daysBetween(data.startDate, cursor) >= 0) {
    const d = data.days[cursor];
    const ok = d && (d.status === "successful" || d.status === "perfect");
    if (ok) { streak++; cursor = addDays(cursor, -1); }
    else if (cursor === today) { cursor = addDays(cursor, -1); }
    else break;
  }
  data.streak.current = streak;
  if (streak > data.streak.longest) data.streak.longest = streak;
  [7, 14, 30].forEach((n) => {
    if (streak >= n && !data.streak.bonusesAwarded[n]) {
      data.xp += STREAK_BONUS[n];
      data.streak.bonusesAwarded[n] = true;
      toast(`${n}-day streak · +${STREAK_BONUS[n]} XP`);
    }
  });
}
function adjustAttributes(quest, sign) {
  const gain = quest.difficulty * sign;
  const secGain = Math.ceil(quest.difficulty / 2) * sign;
  data.attributes[quest.attribute] = Math.min(100, Math.max(0, data.attributes[quest.attribute] + gain));
  if (quest.secondaryAttribute) {
    data.attributes[quest.secondaryAttribute] = Math.min(100, Math.max(0, data.attributes[quest.secondaryAttribute] + secGain));
  }
}
function programDayNumber(iso) {
  return Math.min(Math.max(daysBetween(data.startDate, iso) + 1, 1), PROGRAM_LENGTH);
}
function evaluateAchievements() {
  const successfulDays = Object.values(data.days).filter((d) => d.status === "successful" || d.status === "perfect").length;
  if (successfulDays >= 1) data.achievements.first_step = true;
  if (successfulDays >= 7) data.achievements.week_one = true;
  if (data.streak.longest >= 14) data.achievements.unbreakable = true;
  if (programDayNumber(todayISO()) >= 33) data.achievements.halfway = true;
  const day66Iso = addDays(data.startDate, 65);
  const d66 = data.days[day66Iso];
  if (d66 && (d66.status === "successful" || d66.status === "perfect")) {
    if (!data.achievements.finisher) data.xp += DAY66_BONUS;
    data.achievements.finisher = true;
  }
}

function toggleQuest(iso, questId) {
  const day = ensureDay(iso);
  const quest = data.quests.find((q) => q.id === questId);
  if (!quest) return;
  if (day.completed[questId]) {
    delete day.completed[questId];
    data.xp = Math.max(0, data.xp - quest.xp);
    adjustAttributes(quest, -1);
  } else {
    day.completed[questId] = true;
    data.xp += quest.xp;
    adjustAttributes(quest, 1);
    toast(`+${quest.xp} XP`);
  }
  recomputeDayStatus(iso);
  recomputeStreak();
  evaluateAchievements();
  saveData();
}

/* ---------------- UI state (ephemeral) ---------------- */
let appScreen = "splash";
let activeTab = "home";
let obStepIndex = 0;
let obAnswers = { goals: [], problems: [], wake: "", exercise: "", screentime: "", identity: "", commitment: "", difficulty: "BALANCED" };
let genStepsShown = 0;
let completeDayIso = null;
let detailDayIso = null;
let journalIso = null;
let journalDraft = { mood: null, energy: null, win: "", learned: "" };
let toolView = null;
let timerDuration = 25 * 60, timerRemaining = 25 * 60, timerInterval = null, timerLabel = "Focus";
let breathDuration = 5 * 60, breathRemaining = 5 * 60, breathInterval = null;
let workoutLog = { pushups: 0, squats: 0, situps: 0, plankSec: 0, walkMin: 0 };

if (data.started) appScreen = "main";

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1700);
}

/* ---------------- render: chrome ---------------- */
function setChromeVisible(v) {
  document.getElementById("topHeader").style.display = v ? "flex" : "none";
  document.getElementById("tabs").style.display = v ? "flex" : "none";
}

function render() {
  const main = document.getElementById("main");
  if (appScreen === "splash") {
    setChromeVisible(false);
    main.innerHTML = `<div class="splash fade-in"><div class="display">RESET 66</div><div class="caption">66 DAYS. ONE RESET.</div></div>`;
    return;
  }
  if (appScreen === "onboarding") {
    setChromeVisible(false);
    main.innerHTML = renderOnboardingStep();
    wireOnboarding();
    return;
  }
  if (appScreen === "dayComplete") { setChromeVisible(false); main.innerHTML = renderDayComplete(); wireDayComplete(); return; }
  if (appScreen === "finale") { setChromeVisible(false); main.innerHTML = renderFinale(); wireFinale(); return; }
  if (appScreen === "journal") { setChromeVisible(false); main.innerHTML = renderJournal(); wireJournal(); return; }
  if (appScreen === "dayDetail") { setChromeVisible(false); main.innerHTML = renderDayDetail(); wireDayDetail(); return; }
  if (appScreen === "weeklyReview") { setChromeVisible(false); main.innerHTML = renderWeeklyReview(); wireBack(() => { appScreen = "main"; activeTab = "you"; render(); }); return; }
  if (appScreen === "journalTimeline") { setChromeVisible(false); main.innerHTML = renderJournalTimeline(); wireBack(() => { appScreen = "main"; activeTab = "you"; render(); }); return; }
  if (appScreen === "tool") { setChromeVisible(false); main.innerHTML = renderTool(); wireTool(); return; }

  setChromeVisible(true);
  document.querySelectorAll("nav.tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === activeTab));
  let body = "";
  if (activeTab === "home") body = renderHome();
  else if (activeTab === "journey") body = renderJourney();
  else if (activeTab === "you") body = renderYou();
  else if (activeTab === "tools") body = renderTools();
  main.innerHTML = `<div class="fade-in">${body}</div>`;
  wireMain();
}

function wireBack(fn) {
  const b = document.getElementById("backBtn");
  if (b) b.addEventListener("click", fn);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("nav.tabs button").forEach((b) =>
    b.addEventListener("click", () => { activeTab = b.dataset.tab; render(); })
  );
  document.getElementById("avatarBtn").addEventListener("click", () => { activeTab = "you"; render(); });
  render();
  setTimeout(() => {
    if (appScreen === "splash") {
      appScreen = data.started ? "main" : "onboarding";
      if (appScreen === "onboarding") obStepIndex = 0;
      render();
    }
  }, 1100);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
});

/* ================= ONBOARDING ================= */
function renderOnboardingStep() {
  const step = STEP_ORDER[obStepIndex];
  const progress = `<div class="onb-progress">${STEP_ORDER.slice(1, -2).map((s, i) => `<div class="seg ${STEP_ORDER.indexOf(s) <= obStepIndex ? "filled" : ""}"></div>`).join("")}</div>`;

  if (step === "welcome") {
    return `
      <div class="center-screen fade-in">
        <div class="display" style="margin-bottom:10px">RESET YOUR ROUTINE.</div>
        <div class="body-text" style="margin-bottom:26px">66 days.<br/>A little more discipline every day.</div>
        <button class="btn btn-primary" id="startBtn">START MY RESET</button>
      </div>
    `;
  }
  if (step === "identity") {
    return `
      ${progress}
      <main>
        <div class="h1" style="margin-bottom:16px">WHO DO YOU WANT TO BE IN 66 DAYS?</div>
        <textarea id="identityInput" placeholder="I want to become someone who is...">${escapeHtml(obAnswers.identity)}</textarea>
        <div class="btn-row" style="margin-top:20px">
          <button class="btn btn-ghost" id="backStepBtn">Back</button>
          <button class="btn btn-primary" id="nextStepBtn">Continue</button>
        </div>
      </main>
    `;
  }
  if (step === "generating") {
    return `
      <div class="center-screen fade-in">
        <div class="h1" style="margin-bottom:6px">BUILDING YOUR RESET</div>
        <div id="genSteps" style="margin-top:14px"></div>
      </div>
    `;
  }
  if (step === "preview") {
    const phasesHtml = PHASES.map((p, i) => `
      <div class="phase-row">
        <div class="phase-num">P${i + 1}</div>
        <div>
          <div class="phase-name">${p.name}</div>
          <div class="phase-days">Days ${p.from}–${p.to}</div>
        </div>
      </div>
    `).join("") + `
      <div class="phase-row">
        <div class="phase-num">66</div>
        <div><div class="phase-name">TRANSFORMATION</div><div class="phase-days">Day 66</div></div>
      </div>
    `;
    return `
      <main>
        <div class="caption">YOUR RESET</div>
        <div class="display" style="font-size:34px;margin:4px 0 18px">66 DAYS · ${data.quests.length} DAILY QUESTS</div>
        <div class="card">${phasesHtml}</div>
        <div class="card">
          <div class="h3" style="margin-bottom:10px">Starting quests</div>
          ${data.quests.map((q) => `<div style="padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-weight:600">${escapeHtml(q.title)}</span><br/><span class="caption">${q.type} · +${q.xp} XP</span></div>`).join("")}
        </div>
        <button class="btn btn-primary" id="startDay1Btn" style="margin-top:6px">START DAY 1</button>
      </main>
    `;
  }

  // generic select steps
  const cfg = STEP_CONFIG[step];
  const key = step === "goal" ? "goals" : step === "problem" ? "problems" : step;
  const current = obAnswers[key];
  const optsHtml = cfg.options.map((opt, i) => {
    const label = typeof opt === "string" ? opt : opt.label;
    const sub = typeof opt === "string" ? "" : `<div class="caption" style="margin-top:3px">${opt.sub}</div>`;
    const isSelected = cfg.multi ? current.includes(label) : current === label;
    return `<div class="select-card ${isSelected ? "selected" : ""}" data-opt="${escapeHtml(label)}">${label}${sub}</div>`;
  }).join("");
  const canContinue = cfg.multi ? current.length > 0 : !!current;
  return `
    ${progress}
    <main>
      <div class="h1" style="margin-bottom:16px">${cfg.title}</div>
      <div>${optsHtml}</div>
      <div class="btn-row" style="margin-top:20px">
        <button class="btn btn-ghost" id="backStepBtn">Back</button>
        <button class="btn btn-primary" id="nextStepBtn" ${canContinue ? "" : "disabled style='opacity:0.4'"}>Continue</button>
      </div>
    </main>
  `;
}

function wireOnboarding() {
  const startBtn = document.getElementById("startBtn");
  if (startBtn) startBtn.addEventListener("click", () => { obStepIndex = 1; render(); });

  document.querySelectorAll("[data-opt]").forEach((el) => {
    el.addEventListener("click", () => {
      const step = STEP_ORDER[obStepIndex];
      const cfg = STEP_CONFIG[step];
      const key = step === "goal" ? "goals" : step === "problem" ? "problems" : step;
      const val = el.dataset.opt;
      if (cfg.multi) {
        const arr = obAnswers[key];
        const idx = arr.indexOf(val);
        if (idx >= 0) arr.splice(idx, 1); else arr.push(val);
      } else {
        obAnswers[key] = val;
      }
      render();
    });
  });

  const identityInput = document.getElementById("identityInput");
  if (identityInput) identityInput.addEventListener("input", (e) => { obAnswers.identity = e.target.value; });

  const backBtn = document.getElementById("backStepBtn");
  if (backBtn) backBtn.addEventListener("click", () => { if (obStepIndex > 0) { obStepIndex--; render(); } });

  const nextBtn = document.getElementById("nextStepBtn");
  if (nextBtn) nextBtn.addEventListener("click", () => {
    const step = STEP_ORDER[obStepIndex];
    if (step === "difficulty") {
      obStepIndex++;
      render();
      runGenerationAnimation();
      return;
    }
    obStepIndex++;
    render();
  });

  const startDay1 = document.getElementById("startDay1Btn");
  if (startDay1) startDay1.addEventListener("click", () => {
    data.started = true;
    data.startDate = todayISO();
    ensureDay(data.startDate);
    saveData();
    appScreen = "main";
    activeTab = "home";
    render();
  });
}

function runGenerationAnimation() {
  const labels = ["Understanding your goals...", "Mapping your current habits...", "Building your daily quests...", "Creating your progression..."];
  data.onboarding = { ...obAnswers };
  data.quests = generateQuests(obAnswers);
  saveData();
  genStepsShown = 0;
  const el = document.getElementById("genSteps");
  function showNext() {
    if (!el) return;
    if (genStepsShown < labels.length) {
      el.innerHTML += `<div class="gen-step fade-in"><span class="mark">✓</span>${labels[genStepsShown]}</div>`;
      genStepsShown++;
      setTimeout(showNext, 380);
    } else {
      setTimeout(() => { obStepIndex = STEP_ORDER.indexOf("preview"); render(); }, 500);
    }
  }
  showNext();
}

/* ================= HOME ================= */
function renderHome() {
  const iso = todayISO();
  ensureDay(iso);
  const dayNum = programDayNumber(iso);
  const pctProgram = Math.round((dayNum / PROGRAM_LENGTH) * 100);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 18 ? "GOOD AFTERNOON" : "GOOD EVENING";
  const level = levelForXP(data.xp);
  const curThresh = xpForLevel(level), nextThresh = xpForLevel(level + 1);

  const { done, total, pct } = dayStats(iso);
  const status = data.days[iso].status;

  const questCards = data.quests.map((q) => {
    const isDone = !!data.days[iso].completed[q.id];
    return `
      <div class="quest-card ${isDone ? "done" : ""}">
        <button class="quest-check ${isDone ? "done" : ""}" data-toggle="${q.id}">${isDone ? "✓" : ""}</button>
        <div class="quest-body">
          <div class="quest-title">${escapeHtml(q.title)}</div>
          <div class="quest-desc">${escapeHtml(q.description)}</div>
          <div class="quest-meta">
            <span class="quest-tag">${q.type}</span>
            <span class="stars">${"★".repeat(q.difficulty)}${"☆".repeat(5 - q.difficulty)}</span>
            <span class="quest-xp">+${q.xp} XP</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const statusLabel = status === "perfect" ? "PERFECT" : status === "successful" ? "SUCCESSFUL" : "IN PROGRESS";
  const statusClass = status === "perfect" ? "perfect" : status === "successful" ? "successful" : "incomplete";

  const finaleReady = dayNum >= PROGRAM_LENGTH && status !== "incomplete";
  const dayCompleteBtn = status !== "incomplete"
    ? `<button class="btn btn-secondary" id="viewDaySummaryBtn" style="margin-top:12px">${finaleReady ? "SEE MY TRANSFORMATION" : "View day summary"}</button>`
    : "";

  return `
    <div class="greeting">${greeting}</div>
    <div class="day-count"><span class="num">DAY ${dayNum}</span><span class="of">/ ${PROGRAM_LENGTH}</span></div>
    <div class="progress-track" style="margin-bottom:16px"><div class="progress-fill" style="width:${pctProgram}%"></div></div>

    <div class="streak-xp-row">
      <div class="pill-stat"><div class="top">🔥 ${data.streak.current}</div><div class="lbl">Day streak</div></div>
      <div class="pill-stat"><div class="top">LV ${level}</div><div class="lbl">${data.xp - curThresh} / ${nextThresh - curThresh} XP</div></div>
    </div>

    <div class="h2" style="margin-bottom:10px">Today's quests</div>
    ${data.quests.length === 0 ? `<div class="empty-state"><div class="h2">Nothing scheduled</div><div>Retake the quiz from YOU to build a new set of quests.</div></div>` : questCards}

    <div class="card daily-progress-foot">
      <div class="row"><span>Today</span><span class="status-badge ${statusClass}">${statusLabel}</span></div>
      <div class="row"><span>${done} / ${total} quests</span><span>${Math.round(pct * 100)}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${Math.round(pct * 100)}%"></div></div>
      ${dayCompleteBtn}
      <button class="btn btn-ghost" id="reflectBtn" style="margin-top:10px">Reflect on today</button>
    </div>
  `;
}

/* ================= JOURNEY ================= */
function renderJourney() {
  const todayNum = programDayNumber(todayISO());
  const milestones = Array.from(new Set([1, 7, 14, 21, 30, 42, 49, 56, 60, 65, 66, todayNum])).sort((a, b) => a - b);
  const nodes = milestones.map((d) => {
    const phase = phaseForDay(d);
    const iso = addDays(data.startDate, d - 1);
    const dayObj = data.days[iso];
    const isDone = d < todayNum && dayObj && (dayObj.status === "successful" || dayObj.status === "perfect");
    const isCurrent = d === todayNum;
    const cls = isCurrent ? "current" : isDone ? "done" : "";
    const mark = d === 66 ? "★ " : "";
    return `
      <div class="journey-node ${cls}" data-day="${d}">
        <div class="jn-day">${mark}DAY ${d}</div>
        <div class="jn-meta">${phase.name}${isCurrent ? " · today" : isDone ? " · complete" : ""}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="h1" style="margin-bottom:4px">Your Journey</div>
    <div class="body-text" style="margin-bottom:20px">Six phases, 66 days, one transformation.</div>
    <div class="journey-path">${nodes}</div>
  `;
}

/* ================= YOU ================= */
function renderYou() {
  const level = levelForXP(data.xp);
  const curThresh = xpForLevel(level), nextThresh = xpForLevel(level + 1);
  const pct = Math.round(((data.xp - curThresh) / (nextThresh - curThresh)) * 100);
  const attrOrder = ["discipline", "body", "energy", "focus", "mind", "knowledge", "social", "purpose"];
  const attrs = attrOrder.map((k) => `
    <div class="attr-row">
      <div class="top"><span class="name">${k.toUpperCase()}</span><span class="val">${data.attributes[k]}</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${data.attributes[k]}%"></div></div>
    </div>
  `).join("");
  const achv = ACHIEVEMENTS.map((a) => `
    <div class="achv-card ${data.achievements[a.id] ? "unlocked" : ""}">
      <div class="achv-title">${a.title}</div>
      <div class="achv-desc">${a.desc}</div>
    </div>
  `).join("");

  return `
    <div class="card-elevated" style="text-align:center">
      <div class="caption">LEVEL</div>
      <div class="display" style="margin:4px 0">${level}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="caption" style="margin-top:8px">${data.xp} XP total</div>
    </div>

    <div class="card">
      <div class="h2" style="margin-bottom:14px">Attributes</div>
      ${attrs}
    </div>

    <div class="card">
      <div class="h2" style="margin-bottom:12px">Achievements</div>
      <div class="achv-grid">${achv}</div>
    </div>

    <div class="btn-row">
      <button class="btn btn-secondary" id="weeklyReviewBtn">Weekly review</button>
      <button class="btn btn-secondary" id="journalTimelineBtn">Journal</button>
    </div>
    <button class="btn btn-ghost" id="retakeQuizBtn" style="margin-top:10px">Retake personalization quiz</button>
    <button class="btn btn-ghost" id="resetAllBtn" style="margin-top:10px;color:var(--danger)">Clear all data</button>
  `;
}

/* ================= TOOLS ================= */
function renderTools() {
  return `
    <div class="h1" style="margin-bottom:16px">Tools</div>
    <div class="tool-tile" data-tool="focus"><div class="h2">Focus</div><div class="caption">Distraction-free work sessions</div></div>
    <div class="tool-tile" data-tool="meditation"><div class="h2">Meditation</div><div class="caption">Slow down with guided breathing</div></div>
    <div class="tool-tile" data-tool="workout"><div class="h2">Workout</div><div class="caption">Log today's movement</div></div>
  `;
}

function renderTool() {
  const back = `<button class="btn btn-ghost" id="backBtn" style="width:auto;margin-bottom:16px">← Back</button>`;
  if (toolView === "focus") {
    return `<main>${back}
      <div class="h1" style="text-align:center">Focus</div>
      <div class="duration-row">
        ${[15, 25, 45, 60].map((m) => `<button class="duration-chip ${timerDuration === m * 60 ? "active" : ""}" data-dur="${m}">${m} min</button>`).join("")}
      </div>
      <div class="timer-display">${fmtTime(timerRemaining)}</div>
      <button class="btn btn-primary" id="timerToggleBtn">${timerInterval ? "PAUSE" : "START"}</button>
    </main>`;
  }
  if (toolView === "meditation") {
    return `<main>${back}
      <div class="h1" style="text-align:center">Meditation</div>
      <div class="duration-row">
        ${[5, 10, 20].map((m) => `<button class="duration-chip ${breathDuration === m * 60 ? "active" : ""}" data-bdur="${m}">${m} min</button>`).join("")}
      </div>
      <div class="breath-circle" id="breathCircle">${breathInterval ? "breathe" : "ready"}</div>
      <div class="timer-display" style="font-size:34px;padding:6px 0 18px">${fmtTime(breathRemaining)}</div>
      <button class="btn btn-primary" id="breathToggleBtn">${breathInterval ? "PAUSE" : "START"}</button>
    </main>`;
  }
  if (toolView === "workout") {
    const row = (key, label, unit, step) => `
      <div class="workout-row">
        <div>${label}</div>
        <div class="stepper">
          <button data-wminus="${key}">−</button>
          <div class="count">${workoutLog[key]}${unit}</div>
          <button data-wplus="${key}">+</button>
        </div>
      </div>
    `;
    return `<main>${back}
      <div class="h1" style="margin-bottom:12px">Workout</div>
      <div class="card">
        ${row("pushups", "Push-ups", "", 5)}
        ${row("squats", "Squats", "", 5)}
        ${row("situps", "Sit-ups", "", 5)}
        ${row("plankSec", "Plank", "s", 15)}
        ${row("walkMin", "Walking", "min", 5)}
      </div>
    </main>`;
  }
  return "";
}

function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

/* ================= JOURNAL ================= */
function renderJournal() {
  const iso = journalIso;
  const dayNum = programDayNumber(iso);
  const moods = ["😫", "😕", "😐", "🙂", "🔥"];
  return `
    <main>
      <button class="btn btn-ghost" id="backBtn" style="width:auto;margin-bottom:16px">← Back</button>
      <div class="h1" style="margin-bottom:4px">Day ${dayNum} reflection</div>
      <div class="body-text" style="margin-bottom:18px">How was today?</div>
      <div class="mood-row">${moods.map((m, i) => `<div class="mood-opt ${journalDraft.mood === i ? "selected" : ""}" data-mood="${i}">${m}</div>`).join("")}</div>
      <div class="h3" style="margin-bottom:8px">Energy</div>
      <div class="energy-row">${[1, 2, 3, 4, 5].map((n) => `<div class="energy-opt ${journalDraft.energy === n ? "selected" : ""}" data-energy="${n}">${n}</div>`).join("")}</div>
      <div class="h3" style="margin-bottom:8px">Today's win</div>
      <textarea id="winInput" placeholder="One thing that went well">${escapeHtml(journalDraft.win)}</textarea>
      <div class="h3" style="margin:14px 0 8px">What did you learn?</div>
      <textarea id="learnedInput" placeholder="Optional">${escapeHtml(journalDraft.learned)}</textarea>
      <button class="btn btn-primary" id="saveJournalBtn" style="margin-top:18px">Save reflection</button>
    </main>
  `;
}
function wireJournal() {
  document.getElementById("backBtn").addEventListener("click", () => { appScreen = "main"; render(); });
  document.querySelectorAll("[data-mood]").forEach((el) => el.addEventListener("click", () => { journalDraft.mood = parseInt(el.dataset.mood); render(); }));
  document.querySelectorAll("[data-energy]").forEach((el) => el.addEventListener("click", () => { journalDraft.energy = parseInt(el.dataset.energy); render(); }));
  document.getElementById("winInput").addEventListener("input", (e) => { journalDraft.win = e.target.value; });
  document.getElementById("learnedInput").addEventListener("input", (e) => { journalDraft.learned = e.target.value; });
  document.getElementById("saveJournalBtn").addEventListener("click", () => {
    const day = ensureDay(journalIso);
    day.mood = journalDraft.mood;
    day.energy = journalDraft.energy;
    day.win = journalDraft.win;
    day.learned = journalDraft.learned;
    saveData();
    toast("Reflection saved");
    appScreen = "main";
    render();
  });
}

function renderJournalTimeline() {
  const entries = Object.keys(data.days).sort().reverse().filter((iso) => {
    const d = data.days[iso];
    return d.win || d.learned || d.mood !== null;
  });
  const moods = ["😫", "😕", "😐", "🙂", "🔥"];
  const rows = entries.map((iso) => {
    const d = data.days[iso];
    return `
      <div class="journal-entry">
        <div class="journal-day">DAY ${programDayNumber(iso)} · ${iso} ${d.mood !== null ? moods[d.mood] : ""}</div>
        ${d.win ? `<div class="body-text">${escapeHtml(d.win)}</div>` : ""}
      </div>
    `;
  }).join("");
  return `
    <main>
      <button class="btn btn-ghost" id="backBtn" style="width:auto;margin-bottom:16px">← Back</button>
      <div class="h1" style="margin-bottom:14px">Journal</div>
      ${entries.length === 0 ? `<div class="empty-state"><div class="h2">Your story starts today.</div><div>Reflect on Day 1 from the Home tab.</div></div>` : `<div class="card">${rows}</div>`}
    </main>
  `;
}

/* ================= DAY DETAIL ================= */
function renderDayDetail() {
  const iso = detailDayIso;
  const dayNum = programDayNumber(iso);
  const isFuture = daysBetween(iso, todayISO()) < 0;
  const day = data.days[iso];
  if (isFuture || !day) {
    return `<main>
      <button class="btn btn-ghost" id="backBtn" style="width:auto;margin-bottom:16px">← Back</button>
      <div class="h1">Day ${dayNum}</div>
      <div class="body-text">This day hasn't arrived yet. Keep showing up and you'll see it soon.</div>
    </main>`;
  }
  const { done, total } = dayStats(iso);
  const questsHtml = data.quests.map((q) => `
    <div class="quest-card ${day.completed[q.id] ? "done" : ""}">
      <div class="quest-check ${day.completed[q.id] ? "done" : ""}">${day.completed[q.id] ? "✓" : ""}</div>
      <div class="quest-body"><div class="quest-title">${escapeHtml(q.title)}</div></div>
    </div>
  `).join("");
  return `<main>
    <button class="btn btn-ghost" id="backBtn" style="width:auto;margin-bottom:16px">← Back</button>
    <div class="h1">Day ${dayNum}</div>
    <div class="caption" style="margin-bottom:14px">${phaseForDay(dayNum).name} · ${done}/${total} quests · ${day.status.toUpperCase()}</div>
    ${questsHtml}
    ${day.win ? `<div class="card"><div class="h3" style="margin-bottom:6px">Reflection</div><div class="body-text">${escapeHtml(day.win)}</div></div>` : ""}
  </main>`;
}
function wireDayDetail() { document.getElementById("backBtn").addEventListener("click", () => { appScreen = "main"; render(); }); }

/* ================= DAY COMPLETE ================= */
function renderDayComplete() {
  const iso = completeDayIso;
  const dayNum = programDayNumber(iso);
  const day = data.days[iso];
  const { pct } = dayStats(iso);
  const bonus = day.status === "perfect" ? PERFECT_DAY_BONUS : day.status === "successful" ? SUCCESSFUL_DAY_BONUS : 0;
  const nextDay = dayNum + 1;
  return `
    <div class="center-screen fade-in">
      <div class="caption">DAY ${dayNum} COMPLETE</div>
      <div class="display" style="margin:6px 0">${Math.round(pct * 100)}%</div>
      <div class="body-text">+${bonus} XP bonus · ${data.streak.current} day streak</div>
      ${nextDay <= PROGRAM_LENGTH ? `<div class="caption" style="margin:18px 0 4px">TOMORROW</div><div class="h2" style="margin-bottom:24px">DAY ${nextDay}</div>` : ""}
      <button class="btn btn-primary" id="continueBtn">CONTINUE</button>
    </div>
  `;
}
function wireDayComplete() {
  document.getElementById("continueBtn").addEventListener("click", () => { appScreen = "main"; render(); });
}

/* ================= WEEKLY REVIEW ================= */
function renderWeeklyReview() {
  const isoList = [];
  for (let i = 6; i >= 0; i--) isoList.push(addDays(todayISO(), -i));
  let xpEarned = 0, successfulCount = 0;
  isoList.forEach((iso) => {
    const day = data.days[iso];
    if (!day) return;
    if (day.status === "successful") { successfulCount++; xpEarned += SUCCESSFUL_DAY_BONUS; }
    if (day.status === "perfect") { successfulCount++; xpEarned += PERFECT_DAY_BONUS; }
    xpEarned += Object.keys(day.completed).reduce((sum, qid) => {
      const q = data.quests.find((x) => x.id === qid);
      return sum + (q ? q.xp : 0);
    }, 0);
  });
  const completionPct = Math.round((successfulCount / 7) * 100);
  return `
    <main>
      <button class="btn btn-ghost" id="backBtn" style="width:auto;margin-bottom:16px">← Back</button>
      <div class="h1" style="margin-bottom:16px">Your week</div>
      <div class="finale-stat-grid">
        <div class="finale-stat"><div class="num">${completionPct}%</div><div class="lbl">Completion</div></div>
        <div class="finale-stat"><div class="num">${xpEarned}</div><div class="lbl">XP earned</div></div>
        <div class="finale-stat"><div class="num">${data.streak.current}</div><div class="lbl">Current streak</div></div>
        <div class="finale-stat"><div class="num">${successfulCount}/7</div><div class="lbl">Strong days</div></div>
      </div>
      <div class="card">
        <div class="h3" style="margin-bottom:8px">Keep going</div>
        <div class="body-text">Stay consistent with the quests that are working, and don't be afraid to swap out ones that aren't — retake the quiz any time from YOU.</div>
      </div>
    </main>
  `;
}

/* ================= FINALE ================= */
function renderFinale() {
  const level = levelForXP(data.xp);
  const totalQuests = Object.values(data.days).reduce((s, d) => s + Object.keys(d.completed).length, 0);
  const attrOrder = ["discipline", "focus", "body", "energy"];
  const changes = attrOrder.map((k) => `<div class="finale-stat"><div class="num">${data.attributes[k]}</div><div class="lbl">${k.toUpperCase()}</div></div>`).join("");
  return `
    <div class="center-screen fade-in">
      <div class="caption">DAY 66</div>
      <div class="display" style="margin:4px 0">RESET COMPLETE</div>
      <div class="body-text" style="margin-bottom:14px">LEVEL ${level} · ${totalQuests} QUESTS · ${data.xp} XP</div>
      <div class="finale-stat-grid">${changes}</div>
      <div class="h2" style="text-align:center;margin:10px 0 20px">YOU SHOWED UP.</div>
      <button class="btn btn-primary" id="finaleContinueBtn">CONTINUE</button>
    </div>
  `;
}
function wireFinale() {
  document.getElementById("finaleContinueBtn").addEventListener("click", () => {
    data.finaleSeen = true;
    saveData();
    appScreen = "main";
    activeTab = "you";
    render();
  });
}

/* ================= main tab wiring ================= */
function wireMain() {
  document.querySelectorAll("[data-toggle]").forEach((el) =>
    el.addEventListener("click", () => { toggleQuest(todayISO(), el.dataset.toggle); render(); })
  );
  const viewSummary = document.getElementById("viewDaySummaryBtn");
  if (viewSummary) viewSummary.addEventListener("click", () => {
    const iso = todayISO();
    const dayNum = programDayNumber(iso);
    if (dayNum >= PROGRAM_LENGTH) { appScreen = "finale"; render(); }
    else { completeDayIso = iso; appScreen = "dayComplete"; render(); }
  });
  const reflectBtn = document.getElementById("reflectBtn");
  if (reflectBtn) reflectBtn.addEventListener("click", () => {
    journalIso = todayISO();
    const d = ensureDay(journalIso);
    journalDraft = { mood: d.mood, energy: d.energy, win: d.win, learned: d.learned };
    appScreen = "journal";
    render();
  });

  document.querySelectorAll("[data-day]").forEach((el) =>
    el.addEventListener("click", () => {
      const d = parseInt(el.dataset.day);
      detailDayIso = addDays(data.startDate, d - 1);
      appScreen = "dayDetail";
      render();
    })
  );

  const weeklyBtn = document.getElementById("weeklyReviewBtn");
  if (weeklyBtn) weeklyBtn.addEventListener("click", () => { appScreen = "weeklyReview"; render(); });
  const journalTimelineBtn = document.getElementById("journalTimelineBtn");
  if (journalTimelineBtn) journalTimelineBtn.addEventListener("click", () => { appScreen = "journalTimeline"; render(); });
  const retakeBtn = document.getElementById("retakeQuizBtn");
  if (retakeBtn) retakeBtn.addEventListener("click", () => {
    obAnswers = { goals: [], problems: [], wake: "", exercise: "", screentime: "", identity: "", commitment: "", difficulty: "BALANCED" };
    obStepIndex = 1;
    appScreen = "onboarding";
    render();
  });
  const resetBtn = document.getElementById("resetAllBtn");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (confirm("Clear everything and start over? This can't be undone.")) {
      data = freshData();
      saveData();
      appScreen = "onboarding";
      obStepIndex = 0;
      obAnswers = { goals: [], problems: [], wake: "", exercise: "", screentime: "", identity: "", commitment: "", difficulty: "BALANCED" };
      render();
    }
  });

  document.querySelectorAll("[data-tool]").forEach((el) =>
    el.addEventListener("click", () => { toolView = el.dataset.tool; appScreen = "tool"; render(); })
  );
}

/* ================= TOOL wiring ================= */
function wireTool() {
  document.getElementById("backBtn").addEventListener("click", () => {
    clearInterval(timerInterval); timerInterval = null;
    clearInterval(breathInterval); breathInterval = null;
    toolView = null; appScreen = "main"; render();
  });

  document.querySelectorAll("[data-dur]").forEach((el) => el.addEventListener("click", () => {
    timerDuration = parseInt(el.dataset.dur) * 60;
    timerRemaining = timerDuration;
    clearInterval(timerInterval); timerInterval = null;
    render();
  }));
  const timerToggle = document.getElementById("timerToggleBtn");
  if (timerToggle) timerToggle.addEventListener("click", () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; render(); return; }
    timerInterval = setInterval(() => {
      timerRemaining = Math.max(0, timerRemaining - 1);
      const disp = document.querySelector(".timer-display");
      if (disp) disp.textContent = fmtTime(timerRemaining);
      if (timerRemaining === 0) {
        clearInterval(timerInterval); timerInterval = null;
        toast("Focus session complete · +25 XP");
        data.xp += 25; saveData();
        render();
      }
    }, 1000);
    render();
  });

  document.querySelectorAll("[data-bdur]").forEach((el) => el.addEventListener("click", () => {
    breathDuration = parseInt(el.dataset.bdur) * 60;
    breathRemaining = breathDuration;
    clearInterval(breathInterval); breathInterval = null;
    render();
  }));
  const breathToggle = document.getElementById("breathToggleBtn");
  if (breathToggle) breathToggle.addEventListener("click", () => {
    if (breathInterval) { clearInterval(breathInterval); breathInterval = null; render(); return; }
    const circle = document.getElementById("breathCircle");
    let breatheIn = true;
    breathInterval = setInterval(() => {
      breathRemaining = Math.max(0, breathRemaining - 1);
      const disp = document.querySelectorAll(".timer-display")[0];
      if (disp) disp.textContent = fmtTime(breathRemaining);
      if (breathRemaining % 4 === 0 && circle) {
        breatheIn = !breatheIn;
        circle.style.transform = breatheIn ? "scale(1.15)" : "scale(1)";
        circle.textContent = breatheIn ? "breathe in" : "breathe out";
      }
      if (breathRemaining === 0) {
        clearInterval(breathInterval); breathInterval = null;
        toast("Meditation complete");
        render();
      }
    }, 1000);
    render();
  });

  document.querySelectorAll("[data-wplus]").forEach((el) => el.addEventListener("click", () => {
    const k = el.dataset.wplus;
    workoutLog[k] += k === "plankSec" ? 15 : k === "walkMin" ? 5 : 5;
    render();
  }));
  document.querySelectorAll("[data-wminus]").forEach((el) => el.addEventListener("click", () => {
    const k = el.dataset.wminus;
    const step = k === "plankSec" ? 15 : k === "walkMin" ? 5 : 5;
    workoutLog[k] = Math.max(0, workoutLog[k] - step);
    render();
  }));
}
