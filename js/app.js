/**
 * TypeFlow — 现代化打字测试应用核心逻辑
 * 特性：实时 WPM/准确率、计时/词数双模式、多词库、主题切换、本地成绩与趋势图
 * 零依赖、纯前端、localStorage 持久化。
 */
"use strict";

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ---------- 状态 ----------
  const state = {
    config: {
      mode: "time",        // time | words
      time: 30,            // 秒
      words: 25,           // 词数
      language: "english", // english | chinese | code | numbers
      punctuation: false,
      numbers: false,
      theme: "dark",       // dark | light
      accent: "violet"
    },
    running: false,
    finished: false,
    timerId: null,
    startTime: 0,
    elapsed: 0,
    remaining: 0,
    words: [],            // 当前文章
    typed: [],            // 每词输入情况 {charIndex, errors}
    currentWord: 0,
    keyEvents: [],        // 记录每次按键 {t, correct, char} 用于wpm/accuracy
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    charHistory: [],      // 每0.5s采样一次已打字符数，用于趋势图
    samplers: []
  };

  // ---------- DOM 引用 ----------
  const els = {
    modeButtons: $$(".mode-btn"),
    timeButtons: $$(".time-btn"),
    wordButtons: $$(".word-btn"),
    langButtons: $$(".lang-btn"),
    punctuation: $("#togglePunctuation"),
    numbers: $("#toggleNumbers"),
    themeButtons: $$(".theme-btn"),
    accentSwatches: $$(".swatch"),
    board: $("#board"),
    startOverlay: $(".start-overlay"),
    wordsBox: $("#words"),
    caret: $("#caret"),
    wpm: $("#wpm"),
    acc: $("#acc"),
    raw: $("#raw"),
    chars: $("#chars"),
    timeLeft: $("#timeLeft"),
    restartBtn: $("#restart"),
    result: $("#result"),
    resultWpm: $("#resultWpm"),
    resultAcc: $("#resultAcc"),
    resultRaw: $("#resultRaw"),
    chart: $("#chart"),
    historyList: $("#historyList"),
    emptyHistory: $("#emptyHistory"),
    clearHistory: $("#clearHistory"),
    pbBadge: $("#pbBadge")
  };

  // ---------- 持久化 ----------
  const PREF_KEY = "typeflow:prefs";
  const STATS_KEY = "typeflow:stats";

  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY));
      if (p) {
        Object.assign(state.config, p);
        if (state.config.accent === "#7c5cff") state.config.accent = "violet";
      }
    } catch (e) { /* ignore */ }
  }
  function savePrefs() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(state.config)); } catch (e) { /* ignore */ }
  }
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY));
      return Array.isArray(s) ? s : [];
    } catch (e) { return []; }
  }
  function saveStats(stats) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
  }

  // ---------- 工具 ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  const fmt = (n) => Math.round(clamp(n, 0, Infinity));

  // ---------- 配置 UI 同步 ----------
  function syncUI() {
    const c = state.config;
    els.modeButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === c.mode));
    els.timeButtons.forEach((b) => b.classList.toggle("hidden", c.mode !== "time"));
    els.wordButtons.forEach((b) => b.classList.toggle("hidden", c.mode !== "words"));
    els.timeButtons.forEach((b) => b.classList.toggle("active", b.dataset.time === String(c.time)));
    els.wordButtons.forEach((b) => b.classList.toggle("active", b.dataset.words === String(c.words)));
    els.langButtons.forEach((b) => b.classList.toggle("active", b.dataset.lang === c.language));
    els.punctuation.classList.toggle("active", c.punctuation);
    els.numbers.classList.toggle("active", c.numbers);
    els.themeButtons.forEach((b) => b.classList.toggle("active", b.dataset.theme === c.theme));
    els.accentSwatches.forEach((s) => s.classList.toggle("active", s.dataset.accent === c.accent));
    document.documentElement.setAttribute("data-theme", c.theme);
    document.documentElement.setAttribute("data-accent", c.accent);
    document.documentElement.setAttribute("data-lang", c.language);
    document.documentElement.setAttribute("data-mode", c.mode);
  }

  // ---------- 文章生成与渲染 ----------
  function buildArticle() {
    const c = state.config;
    const count = c.mode === "time" ? 60 : c.words;
    state.words = generateWords({
      language: c.language,
      punctuation: c.punctuation,
      numbers: c.numbers,
      wordsCount: count
    });
    state.typed = state.words.map(() => ({ chars: [], errors: 0 }));
    state.currentWord = 0;
    state.keyEvents = [];
    state.totalKeystrokes = 0;
    state.correctKeystrokes = 0;
    state.samplers = [];
    renderWords();
  }

  function renderWords() {
    const box = els.wordsBox;
    box.innerHTML = "";
    state.words.forEach((word, wi) => {
      const span = document.createElement("span");
      span.className = "word";
      span.dataset.wi = wi;
      const chars = String(word).split("");
      chars.forEach((ch, ci) => {
        const c = document.createElement("span");
        c.className = "char";
        c.dataset.wi = wi;
        c.dataset.ci = ci;
        c.textContent = ch;
        span.appendChild(c);
      });
      box.appendChild(span);
    });
    positionCaret();
  }

  function charEl(wi, ci) {
    return els.wordsBox.querySelector(`.char[data-wi="${wi}"][data-ci="${ci}"]`);
  }

  function currentWordEl() {
    return els.wordsBox.querySelector(`.word[data-wi="${state.currentWord}"]`);
  }

  function positionCaret() {
    const el = charEl(state.currentWord, state.typed[state.currentWord].chars.length);
    if (!el) return;
    const boxRect = els.wordsBox.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    els.caret.style.transform = `translate(${rect.left - boxRect.left - 2}px, ${rect.top - boxRect.top - 2}px)`;
    els.caret.style.height = `${el.offsetHeight + 4}px`;
  }

  // ---------- 计时 ----------
  function startTimer() {
    state.running = true;
    state.finished = false;
    els.startOverlay.style.opacity = "0";
    state.startTime = performance.now();
    if (state.config.mode === "time") {
      state.remaining = state.config.time * 1000;
      els.timeLeft.textContent = state.config.time;
      state.timerId = setInterval(tick, 100);
    } else {
      state.timerId = setInterval(tick, 100);
    }
  }

  function tick() {
    const c = state.config;
    if (c.mode === "time") {
      state.elapsed = performance.now() - state.startTime;
      state.remaining = c.time * 1000 - state.elapsed;
      const secs = Math.max(0, Math.ceil(state.remaining / 1000));
      els.timeLeft.textContent = secs;
      if (state.remaining <= 0) finishTest();
    } else {
      if (state.currentWord >= state.words.length) finishTest();
    }
    sampleChart();
    updateLiveStats();
  }

  function sampleChart() {
    const total = state.keyEvents.reduce((a, e) => a + (e.correct ? 1 : 0), 0);
    state.samplers.push({
      t: state.config.mode === "time"
        ? (state.elapsed / 1000)
        : (state.config.time ? (performance.now() - state.startTime) / 1000 : 0),
      count: total
    });
  }

  // ---------- 实时统计 ----------
  function updateLiveStats() {
    const secs = state.config.mode === "time"
      ? clamp(state.elapsed / 1000, 0, state.config.time)
      : (performance.now() - state.startTime) / 1000;
    const minutes = Math.max((secs / 60), 0.0001);
    const correct = state.keyEvents.reduce((a, e) => a + (e.correct ? 1 : 0), 0);
    const total = state.keyEvents.length;

    const wpm = correct === 0 ? 0 : (correct / 5) / minutes;
    const raw = total === 0 ? 0 : (total / 5) / minutes;
    const acc = total === 0 ? 100 : (correct / total) * 100;

    els.wpm.textContent = fmt(wpm);
    els.acc.textContent = acc.toFixed(1);
    els.raw.textContent = fmt(raw);
    els.chars.textContent = `${correct}/${total}`;
  }

  // ---------- 输入处理 ----------
  function currentWord() { return String(state.words[state.currentWord] || ""); }

  function handleKey(key, isBackspace, isSpace) {
    if (!state.running) {
      if (key === "Tab") { startTimer(); return; }
    }
    if (state.finished) return;

    const word = currentWord();
    const typ = state.typed[state.currentWord];
    const pos = typ.chars.length;

    // 空格：进入下一个词
    if (isSpace) {
      if (pos < word.length) {
        // 提前空格：补齐剩余字符为错误
        while (typ.chars.length < word.length) typ.chars.push({ c: "", wrong: true });
      }
      state.currentWord++;
      if (state.currentWord >= state.words.length) {
        if (state.config.mode === "words") { finishTest(); return; }
        extendArticle();
      }
      renderCurrentWordStatus();
      positionCaret();
      return;
    }

    // 退格
    if (isBackspace) {
      if (typ.chars.length > 0) {
        typ.chars.pop();
        renderCurrentWordStatus();
        positionCaret();
      } else if (state.currentWord > 0) {
        state.currentWord--;
        const prev = state.typed[state.currentWord];
        prev.chars.pop();
        renderCurrentWordStatus();
        positionCaret();
      }
      return;
    }

    // 普通字符
    const expected = word[pos];
    const correct = expected !== undefined && key === expected;
    typ.chars.push({ c: key, wrong: !correct });
    if (!correct) typ.errors++;
    state.totalKeystrokes++;
    if (correct) state.correctKeystrokes++;
    state.keyEvents.push({ t: performance.now(), correct });

    renderCurrentWordStatus();
    positionCaret();
    updateLiveStats();
  }

  function extendArticle() {
    const c = state.config;
    const extra = generateWords({
      language: c.language, punctuation: c.punctuation, numbers: c.numbers, wordsCount: 24
    });
    state.words.push(...extra);
    extra.forEach(() => state.typed.push({ chars: [], errors: 0 }));
    // 仅追加 DOM
    const box = els.wordsBox;
    extra.forEach((word, i) => {
      const og = state.words.length - extra.length + i;
      const span = document.createElement("span");
      span.className = "word";
      span.dataset.wi = og;
      String(word).split("").forEach((ch, ci) => {
        const cEl = document.createElement("span");
        cEl.className = "char";
        cEl.dataset.wi = og;
        cEl.dataset.ci = ci;
        cEl.textContent = ch;
        span.appendChild(cEl);
      });
      box.appendChild(span);
    });
  }

  function renderCurrentWordStatus() {
    const word = currentWord();
    const typ = state.typed[state.currentWord];
    const chars = word.split("");
    // 当前词
    chars.forEach((ch, ci) => {
      const el = charEl(state.currentWord, ci);
      if (!el) return;
      el.classList.remove("correct", "wrong", "current");
      const inp = typ.chars[ci];
      if (inp) {
        el.classList.add(inp.wrong ? "wrong" : "correct");
      } else if (ci >= typ.chars.length) {
        el.classList.add("current");
      }
    });
    // 已完成词
    $$(".word").forEach((wEl) => {
      const wi = parseInt(wEl.dataset.wi, 10);
      const isDone = wi < state.currentWord;
      wEl.classList.toggle("done", isDone);
      if (isDone) {
        wEl.classList.toggle("has-error", state.typed[wi].errors > 0);
      }
    });
  }

  // ---------- 结束 ----------
  function finishTest() {
    clearInterval(state.timerId);
    state.running = false;
    state.finished = true;
    els.startOverlay.style.opacity = "0.8";
    const secs = state.config.mode === "time"
      ? state.config.time
      : (performance.now() - state.startTime) / 1000;
    const minutes = Math.max(secs / 60, 0.0001);
    const correct = state.keyEvents.reduce((a, e) => a + (e.correct ? 1 : 0), 0);
    const total = state.keyEvents.length;
    const wpm = (correct / 5) / minutes;
    const raw = (total / 5) / minutes;
    const acc = total === 0 ? 100 : (correct / total) * 100;

    const entry = {
      wpm: Math.round(wpm),
      raw: Math.round(raw),
      acc: Math.round(acc * 10) / 10,
      secs: Math.round(secs),
      mode: state.config.mode,
      time: state.config.time,
      words: state.config.words,
      language: state.config.language,
      ts: Date.now()
    };

    const stats = loadStats();
    const isPB = stats.length === 0 || entry.wpm > Math.max(...stats.map((s) => s.wpm || 0));
    stats.push(entry);
    if (stats.length > 200) stats.shift();
    saveStats(stats);

    showResult(entry, isPB);
    renderHistory();
    updateLiveStats();
  }

  function showResult(entry, isPB) {
    els.resultWpm.textContent = entry.wpm;
    els.resultAcc.textContent = entry.acc + "%";
    els.resultRaw.textContent = entry.raw;
    els.pbBadge.classList.toggle("visible", isPB);
    els.result.classList.add("shown");
    drawChart(statsForChart());
  }

  function statsForChart() {
    const stats = loadStats().slice(-30);
    return stats;
  }

  // ---------- 进程折线图 (SVG) ----------
  function drawChart(stats) {
    const box = els.chart;
    box.innerHTML = "";
    if (stats.length < 2) {
      box.innerHTML = '<div class="chart-empty">Selesaikan beberapa sesi untuk melihat tren 📈</div>';
      return;
    }
    const w = 560, h = 120, pad = 8;
    const maxW = Math.max(...stats.map((s) => s.wpm), 5);
    const step = (w - pad * 2) / (stats.length - 1);
    const pts = stats.map((s, i) => [pad + i * step, h - pad - (s.wpm / maxW) * (h - pad * 2)]);
    const line = pts.map((p) => p.join(",")).join(" ");
    const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.innerHTML = `
      <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--accent)" stop-opacity="0.35"/>
        <stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="${area}" fill="url(#grad)"/>
      <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    `;
    box.appendChild(svg);
  }

  // ---------- 历史记录 ----------
  function renderHistory() {
    const stats = loadStats().slice().reverse().slice(0, 10);
    els.historyList.innerHTML = "";
    els.emptyHistory.classList.toggle("hidden", stats.length > 0);
    stats.forEach((s) => {
      if (!s || !s.wpm) return;
      const date = new Date(s.ts).toLocaleString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const language = { english: "English", chinese: "中文", code: "Code", numbers: "Angka" }[s.language] || s.language;
      const li = document.createElement("li");
      li.innerHTML = `<span class="h-wpm">${s.wpm}<em>WPM</em></span>
        <span class="h-acc">${s.acc}%</span>
        <span class="h-mode">${language} · ${s.mode === "time" ? s.time + " detik" : s.words + " kata"}</span>
        <span class="h-time">${date}</span>`;
      els.historyList.appendChild(li);
    });
  }

  // ---------- 重置 ----------
  function reset() {
    clearInterval(state.timerId);
    state.running = false;
    state.finished = false;
    state.elapsed = 0;
    els.startOverlay.style.opacity = "0.8";
    if (state.config.mode === "time") els.timeLeft.textContent = state.config.time;
    els.wpm.textContent = "0";
    els.acc.textContent = "100.0";
    els.raw.textContent = "0";
    els.chars.textContent = "0/0";
    els.result.classList.remove("shown");
    buildArticle();
    els.board.classList.remove("done");
    focusBoard();
    updatePB();
  }

  function updatePB() {
    const stats = loadStats();
    const best = stats.length ? Math.max(...stats.map((s) => s.wpm || 0)) : 0;
    els.pbBadge.classList.toggle("visible", best > 0);
    if (best > 0) els.pbBadge.textContent = `PB ${best} wpm`;
  }

  // ---------- 焦点 ----------
  let focusLock = false;
  function focusBoard() {
    if (focusLock) return;
    focusLock = true;
    els.board.tabIndex = -1;
    els.board.focus();
    setTimeout(() => { focusLock = false; }, 50);
  }

  // ---------- 事件绑定 ----------
  function bindEvents() {
    // 模式
    els.modeButtons.forEach((b) => b.addEventListener("click", () => {
      state.config.mode = b.dataset.mode;
      syncUI(); savePrefs(); reset();
    }));
    els.timeButtons.forEach((b) => b.addEventListener("click", () => {
      state.config.time = parseInt(b.dataset.time, 10);
      syncUI(); savePrefs(); reset();
    }));
    els.wordButtons.forEach((b) => b.addEventListener("click", () => {
      state.config.words = parseInt(b.dataset.words, 10);
      syncUI(); savePrefs(); reset();
    }));
    els.langButtons.forEach((b) => b.addEventListener("click", () => {
      state.config.language = b.dataset.lang;
      syncUI(); savePrefs(); reset();
    }));
    els.punctuation.addEventListener("click", () => { state.config.punctuation = !state.config.punctuation; syncUI(); savePrefs(); reset(); });
    els.numbers.addEventListener("click", () => { state.config.numbers = !state.config.numbers; syncUI(); savePrefs(); reset(); });
    els.themeButtons.forEach((b) => b.addEventListener("click", () => {
      state.config.theme = b.dataset.theme;
      syncUI(); savePrefs(); reset();
    }));
    els.accentSwatches.forEach((s) => s.addEventListener("click", () => {
      state.config.accent = s.dataset.accent;
      syncUI(); savePrefs(); reset();
    }));

    els.restartBtn.addEventListener("click", reset);
    els.board.addEventListener("click", () => { if (state.finished || !state.running) reset(); });

    els.clearHistory.addEventListener("click", () => {
      saveStats([]);
      renderHistory();
      updatePB();
    });

    // 键盘输入
    document.addEventListener("keydown", (e) => {
      if (e.key === "Tab") { e.preventDefault(); if (!state.running) startTimer(); return; }
      if (e.key === "Escape") { e.preventDefault(); reset(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1) {
        e.preventDefault();
        if (!state.running) startTimer();
        handleKey(e.key, false, false);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleKey("", true, false);
      } else if (e.key === " ") {
        e.preventDefault();
        handleKey("", false, true);
      }
    });
  }

  // ---------- 启动 ----------
  function init() {
    loadPrefs();
    syncUI();
    buildArticle();
    updatePB();
    renderHistory();
    bindEvents();
    focusBoard();
  }

  init();
})();
