/* Fomo Desk PWA v25 — "Night Desk" + responsive desktop/tablet layout (phone layout unchanged). Book switcher: Main desk and HOLD test. Real data only; FOMO links come only from the desk's JSON (links.py, r=savipww).
   Live: ntfy SSE (pointer.json) → Pages JSON → raw → jsDelivr. No order, wallet, deposit or withdraw UI. */
(function () {
  "use strict";
  const TZ = "Europe/Rome";
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = v => v != null && v !== "" && !Number.isNaN(+v);
  const fmtMoney = (v, dp = 2) => {
    if (!num(v)) return "—";
    const n = Math.abs(+v);
    return (v < 0 ? "-$" : "$") + n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  };
  const usd = v => fmtMoney(v, 2);
  const sgnUsd = v => !num(v) ? "—" : (v >= 0 ? "+" : "-") + "$" + Math.abs(+v).toFixed(2);
  const pct = v => !num(v) ? "—" : ((v >= 0 ? "+" : "") + Number(v).toFixed(1) + "%");
  const cls = v => v > 0 ? "up" : v < 0 ? "down" : "";
  const short = m => m ? (m.length > 12 ? m.slice(0, 4) + "…" + m.slice(-4) : m.slice(0, 4) + "…") : "";
  const safeUrl = u => (typeof u === "string" && /^https:\/\//.test(u)) ? u : null;
  const initial = s => (String(s || "?").replace(/^\$/, "").trim().slice(0, 1) || "?").toUpperCase();
  const mcFmt = v => {
    if (!num(v)) return null; const n = +v;
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2).replace(/\.00$/, "") + "M MC";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K MC";
    return "$" + Math.round(n) + " MC";
  };
  const priceFmt = p => {
    if (!num(p)) return ""; const n = +p;
    if (n >= 1) return n.toFixed(3);
    if (n >= 0.001) return n.toFixed(5);
    return n.toPrecision(3);
  };
  const romeHM = ts => { try { return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(ts ? new Date(ts * 1000) : new Date()); } catch (_) { return "—"; } };
  const romeHour = () => { try { return +new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date()); } catch (_) { return new Date().getHours(); } };

  /* ---------- motion mode ---------- */
  const animModeStored = () => localStorage.getItem("desk_anim") || "auto";
  const systemReduce = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const reduceMotion = () => { const m = animModeStored(); return m === "full" ? false : m === "reduced" ? true : systemReduce(); };
  const HTML = document.documentElement || { dataset: {}, classList: { toggle() {}, add() {}, remove() {} } };
  function applyAnimAttr() {
    HTML.dataset.anim = animModeStored();
    HTML.dataset.motion = reduceMotion() ? "reduced" : "full";
  }
  applyAnimAttr();
  if (window.matchMedia) { try { matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", applyAnimAttr); } catch (_) {} }

  /* ---------- agents ---------- */
  const AGENTS = [
    { key: "scanner", title: "Scanner", role: "new graduates", src: "PumpPortal · DexScreener", hb: ["scanner", "scanner_ws"], c: "#30B0C7", c2: "#32D74B" },
    { key: "auditor", title: "Auditor", role: "8-layer audit", src: "RugCheck · Helius", hb: ["auditor"], c: "#BF5AF2", c2: "#5E5CE6" },
    { key: "analyst", title: "Analyst", role: "scores survivors", src: "Jev · TradingAgents", hb: ["analyst"], need: "debate", c: "#0A84FF", c2: "#64D2FF" },
    { key: "executor", title: "Executor", role: "paper fills", src: "Jupiter quotes", hb: ["executor"], need: "jupiter", c: "#32D74B", c2: "#A2F06B" },
    { key: "risk", title: "Risk", role: "stop · trail", src: "Risk v2 · live quotes", hb: ["risk"], c: "#FF9F0A", c2: "#FF453A" },
    { key: "brain", title: "Brain", role: "exit advisor", src: "xai-sdk", hb: ["risk"], need: "xai_advisor", c: "#FF375F", c2: "#BF5AF2" },
  ];
  const AG = Object.fromEntries(AGENTS.map(a => [a.key, a]));
  const agentColor = k => (AG[k] && AG[k].c) || "#8E8E93";

  function toolHtml(key) {
    if (key === "scanner" || key === "auditor" || key === "executor") return `<i></i>`;
    if (key === "analyst") return `<i></i><i></i><i></i>`;
    if (key === "brain") return `<i></i><i></i><i></i>`;
    if (key === "risk") return `<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="1,13 7,13 9,8 12,18 15,5 17,13 23,13"/></svg>`;
    return "";
  }
  function botHtml(key, sz) {
    const a = AG[key];
    return `<div class="bot b-${key}" data-bot="${key}" style="--c:${a.c};--c2:${a.c2};--sz:${sz}px">
      <svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle class="trk" cx="24" cy="24" r="22" fill="none" stroke-width="2"/>
        <circle class="arc" cx="24" cy="24" r="22" fill="none" stroke-width="2.4" stroke-linecap="round" pathLength="100"/></svg>
      <div class="bob"><div class="head"><i class="ant"></i><div class="visor"><div class="eyes"><i class="eye"></i><i class="eye"></i></div></div>
        <i class="tool">${toolHtml(key)}</i></div></div>
    </div>`;
  }
  function botReact(el, kind) {
    if (!el || reduceMotion()) return;
    el.classList.remove("hit", "ripple"); void el.offsetWidth;
    el.classList.add("hit", "ripple");
    if (kind === "win") el.classList.add("happy");
    if (kind === "loss") el.classList.add("sad");
    clearTimeout(el._rt);
    el._rt = setTimeout(() => el.classList.remove("hit", "ripple", "happy", "sad"), kind ? 2600 : 900);
  }

  /* ---------- data link ---------- */
  const hp = new URLSearchParams(location.hash.slice(1));
  let D = hp.get("d") || localStorage.getItem("desk_d");
  if (hp.get("d")) localStorage.setItem("desk_d", hp.get("d"));
  const wireSave = () => {
    const b = $("dsave"); if (!b) return;
    b.onclick = () => {
      const v = ($("dlink").value || "").trim();
      const m = v.match(/[#&]d=([A-Za-z0-9_\-]+)/);
      const d = m ? m[1] : (/^[A-Za-z0-9_\-]{20,}$/.test(v) ? v : null);
      if (!d) { $("dlink").value = ""; $("dlink").placeholder = "That doesn't look like the desk link"; return; }
      localStorage.setItem("desk_d", d);
      location.replace(location.pathname + "#d=" + d); location.reload();
    };
  };
  wireSave();

  /* ---------- state ---------- */
  let range = "LIVE", posMode = "open", logFilter = "all";
  let cache = { st: null, pos: { open: [], closed: [] }, sig: { signals: [] }, act: { items: [] }, ch: { equity: [] } };
  const stores = {};
  let booksCatalog = { default: "main", books: [{ id: "main", label: "Main desk", prefix: "" }] };
  let activeBook = "main";
  try { activeBook = localStorage.getItem("desk_book") || "main"; } catch (_) {}
  let firstPaint = true;
  let liveBase = null, liveBaseFallback = null, liveFail = 0;
  let ntfySse = null, ntfyEs = null, ntfyLastAt = 0, ntfyConnectedAt = 0;
  let clockOffsetMs = 0, channelFreshAt = 0, keepaliveS = 30;
  const hbAbs = {};
  const posTween = {};
  let openIds = null;
  const pendingClose = new Map();
  const seenAct = new Set();
  const meta = {};

  function serverNow() { return (Date.now() - clockOffsetMs) / 1000; }
  function setClockFromPublished(p) {
    if (p == null) return;
    const raw = Date.now() - p * 1000;
    if (Math.abs(raw) > 120000) return;
    clockOffsetMs = clockOffsetMs ? clockOffsetMs * 0.7 + raw * 0.3 : raw;
  }
  function fmtAge(ts) {
    if (ts == null) return "—";
    const s = Math.max(0, serverNow() - ts);
    return s < 60 ? Math.round(s) + "s" : s < 3600 ? Math.round(s / 60) + "m" : s < 86400 ? (s / 3600).toFixed(s < 36000 ? 1 : 0).replace(/\.0$/, "") + "h" : Math.round(s / 86400) + "d";
  }
  const metaFor = mint => {
    if (!mint) return null;
    if (meta[mint]) return meta[mint];
    const full = Object.keys(meta).find(k => k.startsWith(mint));
    return full ? meta[full] : null;
  };
  const symFor = (mint, fallback) => {
    if (fallback) return "$" + String(fallback).replace(/^\$+/, "");
    const m = metaFor(mint);
    if (m && m.symbol) return "$" + String(m.symbol).replace(/^\$+/, "");
    return short(mint);
  };

  /* ---------- odometer (rolls, then settles to plain text = final value) ---------- */
  function eqParts(v) {
    const s = fmtMoney(v, 2); const i = s.lastIndexOf(".");
    return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i)];
  }
  function settledHtml(v) { const [w, d] = eqParts(v); return esc(w) + `<span class="dec">${esc(d)}</span>`; }
  function settle(el, v) { el.textContent = usd(v); el.innerHTML = settledHtml(v); el.classList.add("settled"); }
  function renderOdometer(el, value) {
    if (!el) return;
    if (!num(value)) { el.textContent = "—"; return; }
    const prev = el.dataset.val != null ? +el.dataset.val : null;
    if (prev === +value && el.classList.contains && el.classList.contains("settled")) return;
    el.dataset.val = String(value);
    clearTimeout(el._settleT);
    if (reduceMotion() || prev === +value) { settle(el, value); return; }
    const [w, d] = eqParts(value);
    const [pw, pd] = prev != null ? eqParts(prev) : ["", ""];
    const prevChars = (pw + pd).split("");
    const chars = (w + d).split("");
    const sameShape = prevChars.length === chars.length;
    const html = chars.map((ch, i) => {
      const inDec = i >= w.length;
      if (!/\d/.test(ch)) return inDec ? `<span class="od-dec">${esc(ch)}</span>` : `<span>${esc(ch)}</span>`;
      const from = sameShape && /\d/.test(prevChars[i]) ? +prevChars[i] : 0;
      const strip = `<span class="od-digit"><span class="od-strip" data-to="${ch}" style="transform:translate3d(0,${-from * 1.02}em,0)">${"0123456789".split("").map(x => `<span>${x}</span>`).join("")}</span></span>`;
      return inDec ? `<span class="od-dec">${strip}</span>` : strip;
    }).join("");
    el.classList.remove("settled");
    el.innerHTML = html;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelectorAll(".od-strip").forEach((s, i) => {
        s.style.transition = `transform ${0.7 + i * 0.05}s cubic-bezier(.22,1,.36,1)`;
        s.style.transform = `translate3d(0,${-(+s.dataset.to) * 1.02}em,0)`;
      });
    }));
    el._settleT = setTimeout(() => settle(el, value), 1400);
    if (prev != null && prev !== +value) {
      el.classList.remove("flash-up", "flash-down"); void el.offsetWidth;
      el.classList.add(+value > prev ? "flash-up" : "flash-down");
    }
  }

  /* ---------- sliding inks ---------- */
  function syncInk(container, ink) {
    const c = typeof container === "string" ? $(container) : container;
    const k = typeof ink === "string" ? $(ink) : ink;
    if (!c || !k) return;
    const on = c.querySelector("button.on"); if (!on || !on.offsetWidth) return;
    k.style.width = on.offsetWidth + "px";
    k.style.transform = `translate3d(${on.offsetLeft}px,0,0)`;
  }
  function syncDockInk() {
    const dock = document.querySelector(".dock"), ink = $("dock-ink"); if (!dock || !ink) return;
    const btns = [...dock.querySelectorAll("button")], on = dock.querySelector("button.on");
    const idx = Math.max(0, btns.indexOf(on));
    if (window.matchMedia && matchMedia("(min-width:1024px)").matches && on && on.offsetWidth) {  // desktop top nav
      ink.style.width = on.offsetWidth + "px"; ink.style.transform = `translate3d(${on.offsetLeft}px,0,0)`; return;
    }
    ink.style.width = `calc((100% - 20px) / ${btns.length})`;
    ink.style.transform = `translate3d(${idx * 100}%,0,0)`;
  }
  function syncAllInks() { syncInk("ranges", "range-ink"); syncInk("pos-seg", "pos-ink"); syncInk("log-seg", "log-ink"); syncInk("anim-seg", "anim-ink"); syncInk("book-seg", "book-ink"); syncDockInk(); }
  /* ---------- wide screens (>=768px): every panel visible at once; nav scrolls, Settings is a panel ---------- */
  const wideMQ = window.matchMedia ? matchMedia("(min-width:768px)") : { matches: false };
  const isWide = () => !!wideMQ.matches;
  let wideTab = "desk";
  function setDockOn(name) {
    document.querySelectorAll(".dock button").forEach(x => x.classList.toggle("on", x.dataset.tab === name));
    syncDockInk();
  }
  function setSettingsOpen(open) {
    HTML.classList.toggle("set-open", !!open);
    setDockOn(open ? "settings" : wideTab);
    if (open) { renderSettings(); requestAnimationFrame(() => syncInk("anim-seg", "anim-ink")); }
  }
  function syncHeaderVar() {
    const h = document.querySelector("header.top");
    if (h && isWide()) HTML.style.setProperty("--hdr", h.offsetHeight + "px");
  }
  /* Wide layout (inspired by the "4 agents" dashboard): two panes —
     left: equity hero · open positions · agent cards · why they died
     right: glowing agent stack · closed trades · goal bar · live log (own column on very wide screens).
     Existing nodes are MOVED (never rebuilt) so bot avatars persist; a comment marker remembers each home
     so the phone layout is restored exactly when the window narrows. */
  const homes = new Map();
  function moveTo(el, parent) {
    if (!el || !parent || el.parentNode === parent) return;
    if (!homes.has(el)) { const m = document.createComment("home"); el.parentNode.insertBefore(m, el); homes.set(el, m); }
    parent.appendChild(el);
  }
  function restoreHomes() { homes.forEach((m, el) => { if (m.parentNode) m.parentNode.insertBefore(el, m); }); }
  function wideCard(id, head) {
    let c = $(id); if (c) return c;
    c = document.createElement("div"); c.id = id; c.className = "card wide-only"; c.innerHTML = head; return c;
  }
  function placeSettings() {
    const mainEl = document.querySelector("main"); if (!mainEl || !D) return;
    if (!isWide()) {
      restoreHomes(); HTML.classList.remove("wide-l");
      document.querySelectorAll(".pane").forEach(p => p.remove());
      return;
    }
    let L = $("pane-l"), R = $("pane-r"), X = $("pane-x");
    if (!L) {
      L = document.createElement("div"); L.id = "pane-l"; L.className = "pane pane-l";
      R = document.createElement("div"); R.id = "pane-r"; R.className = "pane pane-r";
      X = document.createElement("div"); X.id = "pane-x"; X.className = "pane pane-x";
      mainEl.append(L, R, X);
    }
    const closedCard = wideCard("closed-card", `<div class="card-head"><h2>Closed <span class="count-badge" id="closed-badge">0</span></h2><span class="card-right">paper trades</span></div><div id="closed-list" class="closed-list"></div>`);
    const goalCard = wideCard("goal-card", "");
    moveTo(document.querySelector("#tab-desk .hero"), L);
    moveTo(document.querySelector(".pos-card"), L);
    moveTo($("tab-agents"), L);
    moveTo(document.querySelector(".died"), L);
    moveTo(document.querySelector("#tab-desk .foot"), L);
    moveTo(document.querySelector(".desk-card"), R);
    if (closedCard.parentNode !== R) R.appendChild(closedCard);
    if (goalCard.parentNode !== R) R.appendChild(goalCard);
    moveTo($("goal"), goalCard);
    moveTo($("tab-log"), window.matchMedia && matchMedia("(min-width:1600px)").matches ? X : R);
    moveTo($("tab-settings"), document.body);  // panel above the backdrop (main is its own stacking context)
    HTML.classList.add("wide-l");
    if (posMode === "closed") { const b = document.querySelector('#pos-seg button[data-pos="open"]'); if (b) b.click(); }
    renderClosedWide(true);
  }
  function renderHost() {  // tiny "running on" chip (desktop/tablet only); value comes from the desk's published state
    const el = $("host"); if (!el) return;
    const h = String((cache.st && cache.st.host) || "").toLowerCase();
    const t = h === "pc" ? "on PC backup" : h === "box" ? "on main" : "";
    if (el.textContent !== t) el.textContent = t;
    el.classList.toggle("pc", h === "pc");
  }
  let closedWideKey = "";
  function renderClosedWide(force) {
    const root = $("closed-list"); if (!root || !isWide()) return;
    const closed = ((cache.pos && cache.pos.closed) || []).slice(0, 25);
    const b = String(((cache.pos && cache.pos.closed) || []).length);
    if ($("closed-badge") && $("closed-badge").textContent !== b) $("closed-badge").textContent = b;
    const key = closed.map(p => p.id + ":" + (p.pnl_usd != null ? p.pnl_usd : "") + ":" + metaTag(p.mint)).join(",");
    if (!force && key === closedWideKey) return; closedWideKey = key;
    root.innerHTML = closed.length ? closed.map(closedRow).join("")
      : emptyState("No closed trades yet", "Closed paper trades appear here with their exit reason, hold time and P&L.");
    tickClock();
  }
  function onWideChange() {
    placeSettings();
    if (!isWide()) {
      HTML.classList.remove("set-open");
      const act = document.querySelector(".tab.active");
      setDockOn(act ? act.id.replace("tab-", "") : "desk");
    } else {
      // settings is a panel here; any page tab maps to the dashboard
      const act = document.querySelector(".tab.active");
      if (act && act.id === "tab-settings") gotoTabNarrow("desk");
      wideTab = "desk"; setDockOn("desk");
    }
    syncHeaderVar(); drawChart(true); requestAnimationFrame(syncAllInks);
  }
  try { wideMQ.addEventListener("change", onWideChange); } catch (_) { try { wideMQ.addListener(onWideChange); } catch (__) {} }
  function gotoTabNarrow(name) {
    document.querySelectorAll(".dock button").forEach(x => x.classList.toggle("on", x.dataset.tab === name));
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + name));
    window.scrollTo(0, 0);
    syncDockInk(); requestAnimationFrame(syncAllInks);
    if (name === "desk") drawChart();
  }
  function gotoTab(name) {
    if (!isWide()) return gotoTabNarrow(name);
    if (name === "settings") return setSettingsOpen(!HTML.classList.contains("set-open"));
    wideTab = name; setSettingsOpen(false);
    const behavior = reduceMotion() ? "auto" : "smooth";
    const el = name === "agents" ? $("tab-agents") : name === "log" ? document.querySelector("#tab-log .logger") : null;
    if (!el) { window.scrollTo({ top: 0, behavior }); return; }
    const r = el.getBoundingClientRect(), top = parseFloat(getComputedStyle(HTML).getPropertyValue("--hdr")) || 100;
    if (r.top < top || r.top > window.innerHeight * 0.6) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - top - 12), behavior });
    if (!reduceMotion()) { el.classList.remove("hl"); void el.offsetWidth; el.classList.add("hl"); setTimeout(() => el.classList.remove("hl"), 1400); }
  }
  document.querySelectorAll(".dock button").forEach(b => b.onclick = () => gotoTab(b.dataset.tab));
  if ($("set-x")) $("set-x").onclick = () => setSettingsOpen(false);
  if ($("set-bd")) $("set-bd").onclick = () => setSettingsOpen(false);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && HTML.classList.contains("set-open")) setSettingsOpen(false); });
  document.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => gotoTab(b.dataset.goto));
  document.querySelectorAll("#ranges button").forEach(b => b.onclick = () => {
    range = b.dataset.range;
    document.querySelectorAll("#ranges button").forEach(x => x.classList.toggle("on", x === b));
    syncInk("ranges", "range-ink"); drawChart();
  });
  document.querySelectorAll("#pos-seg button").forEach(b => b.onclick = () => {
    posMode = b.dataset.pos;
    document.querySelectorAll("#pos-seg button").forEach(x => x.classList.toggle("on", x === b));
    syncInk("pos-seg", "pos-ink"); renderPositions(true);
  });
  document.querySelectorAll("#log-seg button").forEach(b => b.onclick = () => {
    logFilter = b.dataset.lf;
    document.querySelectorAll("#log-seg button").forEach(x => x.classList.toggle("on", x === b));
    syncInk("log-seg", "log-ink"); renderLog(true);
  });

  /* ---------- paper-book switcher ---------- */
  function prefixFor(id) {
    const b = (booksCatalog.books || []).find(x => x.id === id);
    if (b && b.prefix != null) return b.prefix;
    return id === "main" ? "" : id + "-";
  }
  function renderBookSwitcher() {
    const bar = $("book-bar");
    const seg = $("book-seg");
    if (!bar || !seg) return;
    const books = booksCatalog.books || [];
    const ids = books.map(b => b.id);
    if (!ids.includes(activeBook)) {
      activeBook = "main";
      try { localStorage.setItem("desk_book", "main"); } catch (_) {}
    }
    HTML.dataset.book = activeBook;
    if (books.length < 2) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const ink = $("book-ink");
    seg.innerHTML = (ink ? ink.outerHTML : '<i class="seg-ink" id="book-ink"></i>') + books.map(b => {
      const on = b.id === activeBook ? " on" : "";
      return `<button type="button" role="tab" data-book="${esc(b.id)}" class="${on}" aria-selected="${b.id === activeBook}">${esc(b.label || b.id)}</button>`;
    }).join("");
    syncInk("book-seg", "book-ink");
  }
  const bookSeg = $("book-seg");
  if (bookSeg && typeof bookSeg.addEventListener === "function") {
    bookSeg.addEventListener("click", ev => {
      const b = ev.target && ev.target.closest ? ev.target.closest("button[data-book]") : null;
      if (b) switchBook(b.dataset.book, false);
    });
  }
  function switchBook(id, soon) {
    if (soon || !id || id === activeBook) return;
    stores[activeBook] = { st: cache.st, pos: cache.pos, sig: cache.sig, act: cache.act, ch: cache.ch };
    activeBook = id;
    try { localStorage.setItem("desk_book", id); } catch (_) {}
    openIds = null;
    pendingClose.clear();
    Object.keys(posTween).forEach(k => delete posTween[k]);
    seenAct.clear();
    const saved = stores[id];
    cache = saved && saved.st ? saved : { st: null, pos: { open: [], closed: [] }, sig: { signals: [] }, act: { items: [] }, ch: { equity: [] } };
    HTML.dataset.book = id;
    renderBookSwitcher();
    if (cache.st) renderAll(true);
    tick();
  }

  /* ---------- fetching ---------- */
  async function get(name) {
    const enc = encodeURIComponent(D);
    const bases = ["d/" + enc + "/"];
    if (liveBase) bases.push(liveBase.replace(/\/$/, "") + "/d/" + enc + "/");
    if (liveBaseFallback) bases.push(liveBaseFallback.replace(/\/$/, "") + "/d/" + enc + "/");
    let lastErr = null;
    for (const base of bases) {
      try {
        const r = await fetch(base + name + "?t=" + Date.now(), { cache: "no-store" });
        if (!r.ok) { lastErr = new Error(name + " " + r.status); continue; }
        const data = await r.json();
        liveFail = 0;
        return data;
      } catch (e) { lastErr = e; }
    }
    liveFail++;
    throw lastErr || new Error(name);
  }
  async function discoverLive() {
    try {
      const ptr = await fetch("d/" + encodeURIComponent(D) + "/pointer.json?t=" + Date.now(), { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null);
      if (ptr) {
        if (ptr.ntfy_sse) ntfySse = ptr.ntfy_sse;
        else if (ptr.ntfy_topic) ntfySse = (ptr.ntfy_base || "https://ntfy.envs.net") + "/" + ptr.ntfy_topic + "/sse";
        if (ptr.live_base) liveBase = ptr.live_base;
        if (ptr.live_base_fallback) liveBaseFallback = ptr.live_base_fallback;
        if (+ptr.keepalive_s > 0) keepaliveS = +ptr.keepalive_s;
        return;
      }
    } catch (_) {}
    if (/github\.io$/i.test(location.hostname || "")) {
      liveBase = "https://raw.githubusercontent.com/G4Bbooo/desk-pages/live";
      liveBaseFallback = "https://cdn.jsdelivr.net/gh/G4Bbooo/desk-pages@live";
    }
  }

  /* DexScreener public token data (symbol / price / 1h change) for coins the desk already saw. Display only. */
  let dexAt = 0;
  async function refreshDex() {
    if (Date.now() - dexAt < 60000) return;
    dexAt = Date.now();
    const mints = [];
    ((cache.pos && cache.pos.open) || []).concat((cache.pos && cache.pos.closed) || []).forEach(p => { if (p.mint && p.mint.length > 30 && !mints.includes(p.mint)) mints.push(p.mint); });
    ((cache.act && cache.act.items) || []).forEach(a => { if (a.mint && a.mint.length > 30 && !mints.includes(a.mint)) mints.push(a.mint); });
    const batch = mints.slice(0, 30);
    if (!batch.length) return;
    try {
      const r = await fetch("https://api.dexscreener.com/tokens/v1/solana/" + batch.join(","), { cache: "no-store", credentials: "omit" });
      if (!r.ok) return;
      const arr = await r.json();
      (Array.isArray(arr) ? arr : []).forEach(p => {
        const m = p && p.baseToken && p.baseToken.address; if (!m) return;
        const liq = (p.liquidity && p.liquidity.usd) || 0;
        const cur = meta[m];
        if (cur && cur._liq != null && cur._liq > liq) return;
        meta[m] = Object.assign(cur || {}, {
          symbol: (cur && cur.deskSym) || String(p.baseToken.symbol || "").slice(0, 14), price: p.priceUsd,
          h1: p.priceChange && p.priceChange.h1, mcap: p.marketCap, _liq: liq,
        });
      });
      renderTape(); renderDeskRows(); renderAgentGrid(); renderLog(); renderPositions();
    } catch (_) {}
  }

  /* ---------- live channel ---------- */
  function mergeOpenFrom(fullOpen, liveOpen) {
    const full = new Map((fullOpen || []).map(p => [p.id, p]));
    return (liveOpen || []).map(p => {
      const f = full.get(p.id) || {};
      return Object.assign({}, f, p, { mint: (f.mint && f.mint.startsWith(p.mint || "")) ? f.mint : p.mint });
    });
  }
  function applyLiveCompact(msg) {
    if (!msg || typeof msg !== "object") return;
    ntfyLastAt = Date.now(); channelFreshAt = ntfyLastAt;
    if (msg.published_at) setClockFromPublished(msg.published_at);
    const st = Object.assign({}, cache.st || {}, {
      equity: msg.equity, stack: msg.stack, start: msg.start, pnl_usd: msg.pnl_usd, pnl_pct: msg.pnl_pct,
      open_count: msg.open_count, closed_count: msg.closed_count, win_rate: msg.win_rate,
      funnel: msg.funnel || (cache.st && cache.st.funnel),
      heartbeats: msg.heartbeats || (cache.st && cache.st.heartbeats),
      published_at: msg.published_at, ts: msg.published_at, mode: "PAPER",
    });
    const pos = { open: mergeOpenFrom(cache.pos && cache.pos.open, msg.open || []), closed: (cache.pos && cache.pos.closed) || [], ts: msg.published_at };
    let act = cache.act || { items: [] };
    if (msg.activity && msg.activity.length) {
      const byId = new Map((act.items || []).map(a => [a.id, a]));
      msg.activity.forEach(a => { if (!byId.has(a.id)) byId.set(a.id, a); });
      act = { items: [...byId.values()].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 150), ts: msg.published_at };
    }
    if (activeBook === "main") {
      cache.st = st; cache.act = act;
      stampBeats(st);
      detectTrades(pos);
      cache.pos = pos;
      renderAll(false);
    } else {
      stores.main = Object.assign(stores.main || {}, { st: st, pos: pos, act: act });
    }
    window.__deskLoaded = true; window.__deskSse = (window.__deskSse || 0) + 1;
  }
  function connectNtfy(force) {
    if (!ntfySse || typeof EventSource === "undefined") return;
    if (!force && ntfyEs && ntfyConnectedAt && (Date.now() - ntfyConnectedAt) < 90000 && ntfyEs.readyState !== 2) return;
    try { if (ntfyEs) { ntfyEs.onmessage = null; ntfyEs.onerror = null; ntfyEs.close(); } } catch (_) {}
    try {
      ntfyEs = new EventSource(ntfySse);
      ntfyConnectedAt = Date.now();
      ntfyEs.onopen = () => { ntfyConnectedAt = Date.now(); };
      ntfyEs.onmessage = ev => {
        try {
          const env = JSON.parse(ev.data);
          if (env.event && env.event !== "message") return;
          const raw = env.message != null ? env.message : ev.data;
          const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (msg && (msg.published_at || msg.equity != null || msg.keepalive)) applyLiveCompact(msg);
        } catch (_) {}
      };
      ntfyEs.onerror = () => {
        const last = Math.max(ntfyLastAt || 0, ntfyConnectedAt || 0);
        if (Date.now() - last > 90000) {
          try { ntfyEs.close(); } catch (_) {}
          ntfyEs = null; setTimeout(() => connectNtfy(true), 3000);
        }
      };
    } catch (_) {}
  }
  function stampBeats(st) {
    const confAt = st.published_at || st.ts || serverNow();
    AGENTS.forEach(a => {
      let best = null;
      a.hb.forEach(k => {
        const v = (st.heartbeats || {})[k]; if (!v || v.status !== "ok") return;
        let ts = v.last_beat != null ? +v.last_beat : null;
        if (ts == null) ts = (v.ts != null && confAt - v.ts < 90) ? +v.ts : +confAt;
        if (best == null || ts > best) best = ts;
      });
      if (best == null) {
        const v = (st.heartbeats || {})[a.hb[0]];
        if (v && v.ts != null) best = +v.ts; else if (v && v.age_s != null) best = serverNow() - v.age_s;
      }
      if (best != null) hbAbs[a.key] = best;
    });
  }

  /* ---------- live pill + per-second tick ---------- */
  function setLivePill(kind) {
    const live = $("live"), lab = $("live-label"); if (!live) return;
    const next = "chip live" + (kind === "live" ? "" : " " + (kind === "offline" ? "stale" : kind === "sync" ? "delayed" : kind));
    if (live.className !== next) live.className = next;
    const t = kind === "live" ? "Live" : kind === "delayed" ? "Delayed" : kind === "sync" ? "Syncing" : kind === "offline" ? "Offline" : "Stale";
    if (lab && lab.textContent !== t) lab.textContent = t;
  }
  const liveWin = () => (keepaliveS || 30) + 15; // keepalive cadence + grace
  function sessionLabel() {
    const h = romeHour();
    return h >= 22 || h < 6 ? "night run" : h < 12 ? "morning run" : h < 18 ? "day run" : "evening run";
  }
  function tickClock() {
    const sinceCh = channelFreshAt ? (Date.now() - channelFreshAt) / 1000 : 999;
    const syncing = ntfySse && !ntfyLastAt && ntfyConnectedAt && Date.now() - ntfyConnectedAt < 45000;
    if (syncing && channelFreshAt) setLivePill("sync");
    else if (channelFreshAt) setLivePill(sinceCh <= liveWin() ? "live" : sinceCh <= 150 ? "delayed" : "stale");
    if ($("session")) $("session").textContent = sessionLabel() + " · " + romeHM();
    document.querySelectorAll("[data-hb]").forEach(el => {
      const k = el.getAttribute("data-hb");
      const ts = hbAbs[k];
      const age = ts == null ? null : Math.max(0, serverNow() - ts);
      const off = el.classList.contains("dim");
      const fresh = !off && age != null && age <= 120;
      const hot = fresh && sinceCh <= liveWin(), warm = fresh && !hot && sinceCh <= 150;
      const p = el.querySelector("[data-beat]");
      if (p) { p.classList.toggle("hot", hot); p.classList.toggle("warm", warm); p.classList.toggle("cold", !hot && !warm); }
      const a = el.querySelector("[data-age]");
      if (a) { const t = (age == null || hot || age <= 8) ? "" : " · " + fmtAge(ts); if (a.textContent !== t) a.textContent = t; }
    });
    document.querySelectorAll("[data-ago-plain]").forEach(el => { const ts = +el.getAttribute("data-ago-plain"); if (ts) el.textContent = fmtAge(ts); });
    document.querySelectorAll("[data-ago]").forEach(el => { const ts = +el.getAttribute("data-ago"); if (ts) el.textContent = fmtAge(ts) + " ago"; });
    const tmo = (cache.st && cache.st.settings && cache.st.settings.timeout_s) || 10800;
    document.querySelectorAll("[data-tmr]").forEach(el => {
      const opened = +el.getAttribute("data-tmr"); if (!opened) return;
      const left = Math.max(0, tmo - (serverNow() - opened));
      const arc = el.querySelector(".arc"); if (arc) arc.style.strokeDashoffset = String(100 - (left / tmo) * 100);
      const lab = el.querySelector("span");
      if (lab) lab.textContent = left >= 3600 ? (left / 3600).toFixed(1).replace(/\.0$/, "") + "h" : Math.ceil(left / 60) + "m";
    });
  }
  const railPos = v => {
    const s = (cache.st && cache.st.settings) || {};
    const lo = -(s.stop_pct || 6), hi = (s.trail_arm_pct || 20);
    return Math.max(0, Math.min(100, ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 100));
  };
  function tweenLoop(now) {
    Object.keys(posTween).forEach(id => {
      const tw = posTween[id]; if (!tw) return;
      const u = reduceMotion() ? 1 : Math.min(1, (now - tw.t0) / 2400), e = 1 - Math.pow(1 - u, 3);
      if (tw.done && u >= 1) return;
      const v = tw.from + (tw.to - tw.from) * e;
      const el = document.querySelector(`[data-pos-pnl="${id}"]`);
      const mk = document.querySelector(`[data-pos-mk="${id}"]`);
      if (el) { el.textContent = (v >= 0 ? "+" : "") + v.toFixed(1) + "%"; el.className = "pnl " + cls(v); }
      if (mk) { mk.style.left = railPos(v) + "%"; mk.classList.toggle("neg", v < 0); }
      if (u >= 1 && el) tw.done = true;
    });
    requestAnimationFrame(tweenLoop);
  }

  /* ---------- trades → island banner, bots react, confetti (real trades only) ---------- */
  let islandBot = null;
  function island(kind, title, sub, right, agentKey) {
    const el = $("island"); if (!el) return;
    const av = $("island-av");
    if (av && (!islandBot || islandBot.dataset.bot !== agentKey)) { av.innerHTML = botHtml(agentKey, 40); islandBot = av.firstElementChild; }
    $("island-k").textContent = (agentKey || "desk").toUpperCase() + " · " + romeHM() + " · PAPER";
    $("island-t").textContent = title; $("island-s").textContent = sub || "";
    const r = $("island-r"); r.textContent = right || ""; r.className = "island-r " + (kind === "win" ? "up" : kind === "loss" ? "down" : "");
    el.className = "island " + kind; void el.offsetWidth; el.className = "island " + kind + " show";
    botReact(islandBot, kind === "buy" ? null : kind);
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = "island " + kind + " hide"; }, 4200);
  }
  function confetti(win) {
    const fx = $("fx"); if (!fx || reduceMotion()) return;
    const colors = win ? ["#32D74B", "#FFD60A", "#ffffff", "#0A84FF", "#BF5AF2"] : ["#FF453A", "#FF9F0A", "#8E8E93"];
    const n = win ? 46 : 16;
    for (let i = 0; i < n; i++) {
      const d = document.createElement("i");
      d.style.left = (10 + Math.random() * 80) + "vw"; d.style.top = (6 + Math.random() * 14) + "vh";
      d.style.background = colors[i % colors.length];
      d.style.setProperty("--dx", ((Math.random() - .5) * 40) + "vw");
      d.style.setProperty("--rot", (360 + Math.random() * 540) + "deg");
      d.style.animationDelay = (Math.random() * .25) + "s";
      fx.appendChild(d); setTimeout(() => d.remove(), 1900);
    }
  }
  function reactAgent(key, kind) {
    ["desk-rows", "agent-grid"].forEach(w => { const r = $(w); botReact(r && r.querySelector(`[data-bot="${key}"]`), kind); });
    if (reduceMotion()) return;
    const row = document.querySelector(`#desk-rows [data-key="${key}"]`);
    if (row) { row.classList.remove("glow"); void row.offsetWidth; row.classList.add("glow"); }
    const card = document.querySelector(`#agent-grid [data-key="${key}"]`);
    if (card) { card.classList.add("glow"); setTimeout(() => card.classList.remove("glow"), 1600); }
  }
  function detectTrades(pos) {
    const opens = new Set((pos.open || []).map(p => p.id));
    if (openIds === null) { openIds = opens; return; }
    const s = ((cache.st || {}).settings) || {};
    (pos.open || []).forEach(p => {
      if (!openIds.has(p.id)) {
        p._new = true;
        island("buy", "Bought " + symFor(p.mint, p.symbol), "paper fill · stop -" + (s.stop_pct || 6) + "% · trail +" + (s.trail_arm_pct || 20) + "%", usd(p.size_usd), "executor");
        reactAgent("executor"); reactAgent("risk");
      }
    });
    openIds.forEach(id => {
      if (!opens.has(id)) {
        pendingClose.set(id, { t: Date.now() });
        setTimeout(tick, 500); // fetch positions.json for the real closed record
      }
    });
    openIds = opens;
  }
  function resolvePendingCloses() {
    if (!pendingClose.size) return;
    const closed = (cache.pos && cache.pos.closed) || [];
    pendingClose.forEach((v, id) => {
      const p = closed.find(x => x.id === id);
      if (p) {
        pendingClose.delete(id);
        const win = (p.pnl_usd || 0) >= 0;
        island(win ? "win" : "loss", (win ? "Sold " : "Stopped ") + symFor(p.mint, p.symbol),
          [p.exit_reason, pct(p.pnl_pct)].filter(Boolean).join(" · "), sgnUsd(p.pnl_usd), "risk");
        reactAgent("risk", win ? "win" : "loss"); reactAgent("executor", win ? "win" : "loss");
        confetti(win);
        if (!win && !reduceMotion()) { const h = document.querySelector(".hero"); if (h) { h.classList.remove("shake"); void h.offsetWidth; h.classList.add("shake"); } }
      } else if (Date.now() - v.t > 300000) pendingClose.delete(id);
    });
  }

  /* ---------- event classification ---------- */
  function evClass(a) {
    const k = (a.kind || "").toLowerCase(), t = (a.text || "").toLowerCase();
    if (k === "kill" || k === "no" || k === "red" || k === "skip") return "kill";
    if (k === "pass") return "pass";
    if (/buy|open|sell|close|stop|trail|timeout/.test(k) || /paper (open|close)|bought|sold/.test(t)) return "trade";
    return "info";
  }
  function evVerb(a) {
    const k = (a.kind || "").toLowerCase(), t = (a.text || "").toLowerCase();
    if (k === "migration") return "graduated";
    if (k === "pass") return "passed";
    if (k === "kill") return "killed";
    if (k === "no") return "rejected";
    if (k === "red") return "red flag";
    if (k === "skip") return "skipped";
    if (k === "reset") return "reset";
    if (k === "start") return "started";
    if (k === "buy" || /paper open|bought/.test(t)) return "bought";
    if (k === "stop" || /stop/.test(t)) return "stopped";
    if (k === "sell" || /close|sold|trail/.test(t)) return "sold";
    return (a.kind || "event").replace(/_/g, " ");
  }
  function prettyWhy(a) {
    let t = String(a.text || "");
    if ((a.kind || "") === "migration") return t.replace(/^graduated\s*->\s*/i, "→ ").replace(/^migrat\w*\s*/i, "");
    t = t.replace(/^jev\s+(jev\s+)?/i, "").replace(/\s*->\s*/g, " → ");
    t = t.replace(/^liq ([0-9.]+)<([0-9.]+)/i, (m, x, y) => "liq $" + Math.round(+x).toLocaleString("en-US") + " < $" + (+y >= 1000 ? (+y / 1000) + "k" : y));
    const cu = n => { n = +n; return n >= 1e6 ? "$" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? "$" + Math.round(n / 1e3) + "k" : "$" + Math.round(n); };
    t = t.replace(/^mcap ([0-9.]+)>([0-9.]+)/i, (m, x, y) => "mcap " + cu(x) + " > " + cu(y));
    t = t.replace(/^sell\/buy m5 ([0-9.]+)\/([0-9.]+)/i, "5m sells/buys $1/$2");
    t = t.replace(/^(L\d) (\w+): /, "$1 $2 · ").replace(/_/g, " ");
    return t;
  }
  function diedBucket(a) {
    const t = String(a.text || "").toLowerCase(), k = (a.kind || "").toLowerCase(), ag = a.agent;
    if (!(k === "kill" || k === "no" || k === "red")) return null;
    if (/^liq/.test(t)) return "Liquidity < $8k";
    if (/drawdown/.test(t)) return "Dumped from peak";
    if (/^m\d+ /.test(t)) return "Early momentum dump";
    if (/no_pair/.test(t)) return "No DEX pair in time";
    if (/^mcap/.test(t)) return "Mcap too high";
    if (/sell\/buy/.test(t)) return "Sell pressure";
    if (/top_holders/.test(t)) return "Top holders too heavy";
    if (/rugcheck|rug/.test(t)) return "RugCheck danger";
    if (ag === "auditor") return "Other audit flag";
    if (/debate/.test(t)) return "Bull/bear debate: sell";
    if (/worth/.test(t)) return "Jev worth < 0.6";
    if (/score/.test(t)) return "Analyst score < " + ((((cache.st || {}).settings) || {}).gate_min_score || 65);
    return ag === "scanner" ? "Scanner rule" : "Analyst rule";
  }

  /* ---------- hero + chart ---------- */
  function renderHero() {
    const st = cache.st || {}, s = st.settings || {};
    const start = st.start;
    const bookName = st.book_label || ((booksCatalog.books || []).find(b => b.id === activeBook) || {}).label || (activeBook !== "main" ? "Test" : null);
    const sizeBit = (activeBook === "main" && num(s.size_pct)) ? " · " + s.size_pct + "% max size"
      : (num(s.ticket_usd) ? " · $" + Number(s.ticket_usd).toFixed(0) + " tickets" : "");
    if ($("hero-label")) $("hero-label").textContent = (bookName ? bookName + " equity · " : "Equity · ") + (num(start) ? fmtMoney(start, 0) + " start" : "paper") + sizeBit;
    const sub = $("brand-sub");
    if (sub) sub.textContent = activeBook === "main" ? "Solana graduates · strict RM" : (bookName || "Test") + " paper test · no live orders";
    renderOdometer($("equity"), st.equity);
    const up = !num(st.pnl_usd) || st.pnl_usd >= 0;
    HTML.classList.toggle("pnl-down", !up);
    const pnlEl = $("pnl");
    if (pnlEl) { const h = `<span class="${up ? "up" : "down"}">${sgnUsd(st.pnl_usd)} (${pct(st.pnl_pct)})</span>`; if (pnlEl.innerHTML !== h) pnlEl.innerHTML = h; }
    const mult = num(start) && +start > 0 && num(st.equity) ? st.equity / start : null;
    const mEl = $("mult");
    if (mEl && mult != null) {
      const next = mult.toFixed(2) + "×";
      if (mEl.textContent !== next) {
        if (mEl.textContent !== "—" && !reduceMotion()) { mEl.classList.remove("flash"); void mEl.offsetWidth; mEl.classList.add("flash"); }
        mEl.textContent = next;
      }
      mEl.classList.toggle("down", mult < 1);
    }
    const closed = (cache.pos && cache.pos.closed) || [];
    const w = closed.filter(p => (p.pnl_usd || 0) > 0).length, l = closed.length - w;
    const wl = `<span class="w">${w}W</span> / <span class="l">${l}L</span>`;
    if ($("wl") && $("wl").innerHTML !== wl) $("wl").innerHTML = wl;
    if (mult != null) {
      const f = mult <= 1 ? 0 : Math.min(100, Math.log10(mult) * 100);
      if ($("goal-fill")) $("goal-fill").style.width = f.toFixed(2) + "%";
      document.querySelectorAll(".goal-m").forEach(m => m.classList.toggle("hit", mult >= +m.dataset.m));
      const nextM = [2, 5, 10].find(x => mult < x);
      if ($("goal-r")) $("goal-r").textContent = nextM ? mult.toFixed(2) + "→" + nextM + "×" : "10× ✓";
    }
    if ($("mode")) $("mode").textContent = "PAPER"; // display only — the desk is PAPER-only by spec
  }
  function filterRange(points) {
    if (!points.length || range === "ALL") return points;
    const now = serverNow();
    const win = { LIVE: 3600, "1H": 3600, "4H": 14400, "1D": 86400, "1W": 604800 }[range] || 3600;
    const f = points.filter(p => (p.ts || 0) >= now - win);
    if (f.length >= 2) return f;
    // flat window: carry the last known equity across the window so the line is honest (no movement)
    const last = points[points.length - 1];
    return [{ ts: now - win, equity: last.equity }, { ts: now, equity: last.equity }];
  }
  let chartCtl = null;
  function ensureChart() {
    const cv = $("chart"); if (!cv || !window.EquityChart) return null;
    if (!cv._eq) cv._eq = new window.EquityChart(cv);
    if (!chartCtl) {
      chartCtl = cv._eq;
      const stage = cv.parentElement;
      const onMove = ev => {
        const t = ev.touches ? ev.touches[0] : ev;
        const hit = chartCtl.hit(t.clientX), sc = $("scrub");
        if (!hit || !sc) return;
        sc.classList.remove("hidden");
        sc.querySelector(".scrub-line").style.left = hit.x + "px";
        sc.querySelector(".scrub-tip").style.left = hit.x + "px";
        $("scrub-val").textContent = usd(hit.equity); $("scrub-time").textContent = romeHM(hit.ts);
      };
      const onEnd = () => setTimeout(() => { if ($("scrub")) $("scrub").classList.add("hidden"); chartCtl.clearScrub(); }, 900);
      stage.addEventListener("pointerdown", onMove);
      stage.addEventListener("pointermove", e => { if (e.buttons || e.pressure || (e.pointerType === "mouse" && isWide())) onMove(e); });
      stage.addEventListener("pointerup", onEnd); stage.addEventListener("pointerleave", onEnd);
    }
    return cv;
  }
  let chartKey = "";
  function drawChart(force) {
    const cv = ensureChart(); if (!cv || !window.drawEquity) return;
    if (!isWide() && !$("tab-desk").classList.contains("active")) return;
    const st = cache.st || {};
    const raw = ((cache.ch && cache.ch.equity) || []).map(p => ({ ts: p.ts, equity: p.equity != null ? p.equity : p.stack })).filter(p => p.equity != null);
    if (num(st.equity)) {
      const last = raw[raw.length - 1], now = st.ts || serverNow();
      if (!last || Math.abs(last.equity - st.equity) > 1e-9 || now - (last.ts || 0) > 5) raw.push({ ts: now, equity: +st.equity });
    }
    const pts = filterRange(raw);
    const callouts = ((cache.ch && cache.ch.callouts) || []).filter(c => !pts.length || c.ts >= (pts[0].ts || 0) - 1);
    const up = !num(st.pnl_usd) || st.pnl_usd >= 0;
    const key = range + "|" + pts.length + "|" + (pts.length ? pts[pts.length - 1].equity : "") + "|" + callouts.length + "|" + up + "|" + cv.clientWidth + "x" + cv.clientHeight + "|" + HTML.dataset.motion;
    if (!force && key === chartKey) return;
    chartKey = key;
    const note = $("chart-note");
    if (note) {
      const allPts = ((cache.ch && cache.ch.equity) || []).filter(p => p.equity != null || p.stack != null);
      const flat = allPts.length && allPts.every(p => Math.abs((p.equity != null ? p.equity : p.stack) - (num(st.equity) ? +st.equity : 0)) < 1e-6);
      const traded = (st.open_count || 0) + (st.closed_count || 0);
      if (flat && !traded) { note.textContent = "flat since " + romeHM(allPts[0].ts) + " · filters say no…"; note.classList.remove("hidden"); }
      else note.classList.add("hidden");
    }
    window.drawEquity(cv, pts, { color: up ? "#32D74B" : "#FF453A", callouts, live: range === "LIVE" && !reduceMotion() });
  }

  /* ---------- agents (persistent DOM; only text/classes change) ---------- */
  const seenTotal = f => Object.values(f || {}).reduce((x, y) => x + (+y || 0), 0);
  function agentData() {
    const src = (activeBook !== "main" && stores.main && stores.main.st) ? stores.main : cache;
    const st = src.st || {}, hb = st.heartbeats || {};
    const integ = (st.connectivity && st.connectivity.integrations) || {};
    const s = st.settings || {}, f = st.funnel || {};
    const items = (src.act && src.act.items) || [];
    const seen = seenTotal(f);
    const cnt = (agent, kinds) => items.filter(a => a.agent === agent && (!kinds || kinds.includes(a.kind))).length;
    return AGENTS.map(a => {
      const prim = hb[a.hb[0]] || {};
      const info = prim.info || "";
      const status = prim.status || (Object.keys(hb).length ? "missing" : "unknown");
      const need = a.need ? integ[a.need] : "active";
      const disabled = need === "off" || need === "missing_key";
      const off = disabled || (status !== "ok" && status !== "unknown");
      const kv = {}; String(info).split(/\s+/).forEach(t => { const i = t.indexOf("="); if (i > 0) kv[t.slice(0, i)] = t.slice(i + 1); });
      let phrase = "", pill = "", nums = [], working = false;
      if (a.key === "scanner") {
        const room = num(kv.room) ? +kv.room : null;
        const ws = kv.ws != null ? String(kv.ws).toLowerCase() === "true" : null;
        phrase = (room != null ? "Watching " + room + " coin" + (room === 1 ? "" : "s") : "Scanning") + (ws === true ? " · stream on" : ws === false ? " · stream off" : "");
        pill = seen.toLocaleString("en-US") + " seen";
        nums = [[seen, "coins seen"], [f.killed || 0, "killed"]];
        working = ws === true || (room || 0) > 0;
      } else if (a.key === "auditor") {
        const m = info.match(/last=(\S+)\s+(\w+)/i);
        phrase = m ? "Last: " + symFor(m[1]) + " · " + m[2] : (/^idle$/i.test(info.trim()) || !info ? "Idle · waiting for survivors" : info);
        pill = (f.audit_red || 0) + " red";
        nums = [[cnt("auditor", ["pass"]), "recent passes"], [f.audit_red || 0, "red flags"]];
        working = !!m;
      } else if (a.key === "analyst") {
        const debateOn = integ.debate === "active";
        const jev = (kv.mode === "jev" || st.analyst_mode === "jev") ? (String(kv.jev_ok).toLowerCase() === "false" ? "Jev offline" : "Jev online") : "Rules mode";
        phrase = jev + " · " + (!debateOn ? "debate off" : (kv.debate && kv.debate !== "None" ? "debating" : "debate ready"));
        pill = (f.rejected || 0) + " rejected";
        nums = [[cnt("analyst"), "recent scores"], ["≥" + (s.gate_min_score || 65), "gate score"]];
        working = !!(kv.debate && kv.debate !== "None");
      } else if (a.key === "executor") {
        const buy = info.match(/buy(?:ing|s)?\s+(\S+)/i) || info.match(/bought\s+(\S+)/i);
        phrase = buy ? "Buying " + buy[1] : (/^idle$/i.test(info.trim()) || !info ? "Idle · nothing passed yet" : info);
        pill = "size ≤ " + (s.size_pct || 8) + "%";
        nums = [[(st.open_count || 0) + (st.closed_count || 0), "paper trades"], [num(s.size_min_usd) ? "$" + s.size_min_usd : "—", "min ticket"]];
        working = !!buy;
      } else if (a.key === "risk") {
        const n = num(kv.open) ? +kv.open : (st.open_count || 0);
        phrase = n ? "Guarding " + n + " position" + (n === 1 ? "" : "s") + " · live quotes" : "No open risk";
        pill = "-" + (s.stop_pct || 6) + "% · trail +" + (s.trail_arm_pct || 20) + "%";
        nums = [[n, "open"], ["-" + (s.stop_pct || 6) + "%", "hard stop"]];
        working = n > 0;
      } else if (a.key === "brain") {
        const ri = ((hb.risk || {}).info) || "";
        const adv = (ri.match(/advisor=(\S+)/) || [])[1];
        phrase = integ.xai_advisor !== "active" ? "Advisor off" : (adv && adv !== "None" ? "Advising · " + adv : "Standing by · reviews exits");
        pill = st.xai_model || "grok-4.6";
        nums = [[(st.open_count || 0), "exits watched"], [s.timeout_s ? (s.timeout_s / 3600) + "h" : "—", "max hold"]];
        working = !!(adv && adv !== "None");
      }
      if (disabled) phrase = need === "off" ? "Disabled" : "Needs API key";
      const mine = items.filter(x => x.agent === a.key);
      return Object.assign({}, a, { phrase, pill, nums, off, working: working && !off, ev: mine[0], recent: mine.slice(0, 3) });
    });
  }
  const metaTag = mint => (metaFor(mint) && metaFor(mint).symbol) ? "m" : "";
  function renderDeskRows() {
    const root = $("desk-rows"); if (!root) return;
    const head = document.querySelector(".desk-card h2");
    if (activeBook !== "main") {
      const st = cache.st || {}, s = st.settings || {};
      const hb = (st.heartbeats || {}).hold || (st.heartbeats || {}).newborn || {};
      const label = st.book_label || ((booksCatalog.books || []).find(b => b.id === activeBook) || {}).label || "Test";
      if (head) head.innerHTML = esc(label);
      root.dataset.ready = "";
      const stop = num(s.stop_pct) ? "−" + Number(s.stop_pct).toFixed(0) + "%" : "−6%";
      const tp = num(s.take_profit_1_pct) || num(s.take_profit_pct)
        ? ("+" + Number(s.take_profit_1_pct || 5).toFixed(0) + "% / +" + Number(s.take_profit_pct || 10).toFixed(0) + "% (half each)")
        : (num(s.take_profit) ? ((Number.isInteger(+s.take_profit) ? Number(s.take_profit).toFixed(0) : Number(s.take_profit).toFixed(1)) + "× take-profit") : "+5% / +10% (half each)");
      const tmo = num(s.timeout_s) ? Math.round(s.timeout_s / 60) + " min cap" : "10 min cap";
      const ticket = num(s.ticket_usd) ? "$" + Number(s.ticket_usd).toFixed(2).replace(/\.00$/, "") : "$23.75";
      const cap = s.max_open_positions;
      const capLabel = (cap == null || cap === 0) ? "no position cap" : ("max " + cap + " position");
      const livePx = num(st.mark_price) ? priceFmt(st.mark_price) : "—";
      const liq = num(st.liquidity) ? usd(st.liquidity) : "";
      const start = num(st.start) ? fmtMoney(st.start, 2) : "$87.23";
      root.innerHTML = `<div class="book-rules">
        <div class="br-row"><span>Tickets</span><b>${esc(ticket)} · ${esc(capLabel)}</b></div>
        <div class="br-row"><span>Exits</span><b>${esc(stop)} stop · ${esc(tp)} · ${esc(tmo)}</b></div>
        <div class="br-row"><span>Live price</span><b>${esc(livePx)}${liq ? " · liq " + esc(liq) : ""}</b></div>
        <div class="br-row"><span>Book status</span><b>${esc(hb.info || "watching")}</b></div>
        <div class="br-note">Paper only — ${esc(start)} starting stack, separate from the main desk. No live orders.</div>
      </div>`;
      const seen = (st.open_count || 0) + (st.closed_count || 0);
      const fh = `<b>${seen} paper trade${seen === 1 ? "" : "s"}</b>`;
      if ($("desk-funnel") && $("desk-funnel").innerHTML !== fh) $("desk-funnel").innerHTML = fh;
      return;
    }
    if (head && !/agents/.test(head.textContent || "")) head.innerHTML = 'Desk · <span id="agents-n">6</span> agents';
    const data = agentData();
    if (!root.dataset.ready) {
      root.innerHTML = data.map(a => `<div class="drow" data-key="${a.key}" data-hb="${a.key}" style="--c:${a.c}">
        ${botHtml(a.key, 44)}
        <div class="mid2"><div class="l1"><span class="nm">${esc(a.title)}</span><span class="rl">${esc(a.role)}</span><span class="beat" data-beat></span><span class="age" data-age></span></div>
        <div class="now" data-now></div></div>
        <span class="pillc" data-pill></span>
      </div>`).join("");
      root.dataset.ready = "1";
    }
    data.forEach(a => {
      const row = root.querySelector(`[data-key="${a.key}"]`); if (!row) return;
      row.classList.toggle("dim", a.off);
      const bot = row.querySelector(".bot");
      bot.classList.toggle("off", a.off); bot.classList.toggle("working", a.working);
      const ev = a.ev;
      let nowHtml;
      if (ev && ev.mint) {
        const sym = symFor(ev.mint), c = evClass(ev), why = prettyWhy(ev);
        nowHtml = `<span class="tkn">${esc(initial(sym))}</span><b>${esc(sym)}</b><span class="why ${c}">${esc(evVerb(ev))}${why ? " · " + esc(why) : ""}</span>`;
      } else nowHtml = `<span class="why">${esc(a.phrase)}</span>`;
      const nowEl = row.querySelector("[data-now]");
      const evId = ev ? String(ev.id) : "";
      const key = ev ? evId + metaTag(ev.mint) : "p:" + a.phrase;
      if (nowEl.dataset.k !== key) {
        const isNew = nowEl.dataset.id != null && ev && nowEl.dataset.id !== evId;
        nowEl.dataset.k = key; nowEl.dataset.id = evId;
        if (isNew && !reduceMotion()) {
          nowEl.classList.add("fade");
          setTimeout(() => { nowEl.innerHTML = nowHtml; nowEl.classList.remove("fade"); }, 180);
          reactAgent(a.key);
        } else nowEl.innerHTML = nowHtml;
      }
      const pl = row.querySelector("[data-pill]");
      if (pl.textContent !== a.pill) { const had = pl.textContent; pl.textContent = a.pill; if (had && !reduceMotion()) { pl.classList.remove("pop"); void pl.offsetWidth; pl.classList.add("pop"); } }
    });
    const st = cache.st || {};
    const seen = seenTotal(st.funnel);
    const traded = (st.open_count || 0) + (st.closed_count || 0);
    const fh = `${seen.toLocaleString("en-US")} seen · <b>${traded} traded</b>`;
    if ($("desk-funnel") && $("desk-funnel").innerHTML !== fh) $("desk-funnel").innerHTML = fh;
    const running = data.filter(a => !a.off).length;
    if ($("agents-n")) $("agents-n").textContent = AGENTS.length;
    if ($("agents-count")) $("agents-count").textContent = running + " of " + AGENTS.length + " running";
  }
  function renderAgentGrid() {
    const root = $("agent-grid"); if (!root) return;
    const data = agentData();
    if (!root.dataset.ready) {
      root.innerHTML = data.map(a => `<div class="acard" data-key="${a.key}" data-hb="${a.key}" style="--c:${a.c}">
        <div class="top">${botHtml(a.key, 58)}<div style="min-width:0"><div class="nm">${esc(a.title)}<span class="beat" data-beat></span></div><div class="src">${esc(a.src)}</div><div class="src">${esc(a.role)}<span class="age" data-age></span></div></div></div>
        <div class="st" data-st></div>
        <div class="nums"><div class="num"><b data-n0>—</b><span data-l0></span></div><div class="num"><b data-n1>—</b><span data-l1></span></div></div>
        <div class="rec" data-rec></div>
      </div>`).join("");
      root.dataset.ready = "1";
    }
    data.forEach(a => {
      const c = root.querySelector(`[data-key="${a.key}"]`); if (!c) return;
      c.classList.toggle("dim", a.off);
      const bot = c.querySelector(".bot"); bot.classList.toggle("off", a.off); bot.classList.toggle("working", a.working);
      const stEl = c.querySelector("[data-st]");
      if (stEl.dataset.v !== a.phrase) {
        const had = stEl.dataset.v; stEl.dataset.v = a.phrase;
        if (had && !reduceMotion()) { stEl.classList.add("fade"); setTimeout(() => { stEl.textContent = a.phrase; stEl.classList.remove("fade"); }, 160); }
        else stEl.textContent = a.phrase;
      }
      a.nums.forEach((n, i) => {
        const b = c.querySelector(`[data-n${i}]`), l = c.querySelector(`[data-l${i}]`);
        const v = typeof n[0] === "number" ? n[0].toLocaleString("en-US") : String(n[0]);
        if (b.textContent !== v) b.textContent = v;
        if (l.textContent !== n[1]) l.textContent = n[1];
      });
      const rk = a.recent.map(e => e.id + metaTag(e.mint)).join(",");
      const recEl = c.querySelector("[data-rec]");
      if (recEl.dataset.k !== rk) {
        recEl.dataset.k = rk;
        recEl.innerHTML = a.recent.length ? a.recent.map(e => { const w = prettyWhy(e); return `<div><span data-ago-plain="${e.ts}">${fmtAge(e.ts)}</span> <b>${esc(symFor(e.mint) || "desk")}</b> ${esc(evVerb(e))}${w ? " · " + esc(w) : ""}</div>`; }).join("")
          : `<div>No events in the recent log</div>`;
      }
    });
  }

  function renderTape() {
    const tr = $("tape-track"); if (!tr) return;
    const items = ((cache.act && cache.act.items) || []).filter(a => a.mint).slice(0, 14);
    const key = items.map(a => a.id + metaTag(a.mint) + ((metaFor(a.mint) || {}).h1 != null ? "p" : "")).join(",");
    if (tr.dataset.k === key) return;
    tr.dataset.k = key;
    if (!items.length) { tr.classList.remove("run"); tr.innerHTML = `<span class="tk"><span class="v info">${activeBook === "main" ? "waiting for the first graduate…" : "watching " + esc((cache.st && cache.st.book_label) || "the test") + " · no tape yet"}</span></span>`; return; }
    const one = items.map(a => {
      const m = metaFor(a.mint), c = evClass(a);
      const ch = m && num(m.h1) ? `<span class="${m.h1 >= 0 ? "up" : "down"}">${(m.h1 >= 0 ? "+" : "") + (+m.h1).toFixed(1)}% 1h</span>` : "";
      const px = m && num(m.price) ? `<span class="s">${priceFmt(m.price)}</span>` : "";
      return `<span class="tk"><span class="m">${esc(symFor(a.mint))}</span>${px}${ch}<span class="v ${c}">${esc(evVerb(a))}</span><span class="sep">•</span></span>`;
    }).join("");
    tr.innerHTML = one + one;
    tr.style.setProperty("--dur", Math.max(28, items.length * 5) + "s");
    tr.classList.add("run");
  }

  /* ---------- positions ---------- */
  const fmtDur = s => s < 60 ? Math.round(s) + "s" : s < 3600 ? Math.round(s / 60) + "m" : (s / 3600).toFixed(1) + "h";
  function posCard(p) {
    const s = (cache.st && cache.st.settings) || {};
    const sym = symFor(p.mint, p.symbol);
    const url = safeUrl(p.url);
    const live = num(p.pnl_pct_live) ? +p.pnl_pct_live : 0;
    const val = num(p.last_value) ? usd(p.last_value) : usd(p.size_usd * (1 + live / 100));
    const mc = mcFmt(p.mcap != null ? p.mcap : (metaFor(p.mint) || {}).mcap);
    const audits = (p.audits || []).map(a => `<span class="flag ${esc(a.result)}">${esc(a.name)}</span>`).join("");
    const fillLines = (p.fills || []).map(f => {
      const lab = f.reason || f.kind || "fill";
      const px = num(f.price) ? " @ " + esc((+f.price).toPrecision(4)) : "";
      const pn = num(f.pnl_pct) ? " · " + pct(f.pnl_pct) : "";
      const am = num(f.usd) ? " · " + usd(f.usd) : "";
      return `<div>${esc(lab)}${am}${pn}${px}</div>`;
    }).join("");
    const exitRule = activeBook !== "main"
      ? "Hard stop -" + (s.stop_pct || 6) + "% from entry · half at +" + (s.take_profit_1_pct || 5) + "% · half at +" + (s.take_profit_pct || 10) + "%"
      : (p.armed ? "Trailing stop armed · exits on " + (s.trail_giveback_pct || 12) + "% giveback" : "Hard stop -" + (s.stop_pct || 6) + "% · trail arms at +" + (s.trail_arm_pct || 20) + "%");
    const details = `<div class="details">
      <div>Size ${usd(p.size_usd)}${num(p.entry_fill) ? " · entry fill " + esc((+p.entry_fill).toPrecision(4)) : ""}</div>
      <div>Live sell quote ${num(p.last_value) ? usd(p.last_value) : "—"}${p.value_src ? " (" + esc(p.value_src) + ")" : ""}</div>
      <div>${exitRule}</div>
      ${fillLines}
      ${p.advisor_note ? `<div>Brain · ${esc(p.advisor_note)}</div>` : ""}
      ${audits ? `<div>${audits}</div>` : ""}
      ${url ? `<div><a href="${url}" target="_blank" rel="noopener">View on FOMO ↗</a></div>` : ""}
    </div>`;
    const zero = railPos(0);
    const tw = posTween[p.id]; const shown = tw ? (tw.done ? tw.to : tw.from) : live;
    return `<div class="pos ${p._new && !reduceMotion() ? "enter" : ""}" data-id="${p.id}">
      <div class="pos-top">
        <div class="tok">${esc(initial(sym))}</div>
        <div class="mid"><div class="sym">${esc(sym)}</div><div class="s">${[mc, p.opened ? `<span data-ago="${p.opened}">${fmtAge(p.opened)} ago</span>` : ""].filter(Boolean).join(" · ")}</div></div>
        <div class="r"><div class="pnl ${cls(shown)}" data-pos-pnl="${p.id}">${pct(shown)}</div><div class="s" data-pos-val>${val}</div></div>
        ${p.opened ? `<div class="tmr" data-tmr="${p.opened}" title="time left before the ${((s.timeout_s || 10800) / 3600)}h timeout"><svg viewBox="0 0 36 36"><circle class="trk" cx="18" cy="18" r="15" fill="none" stroke-width="3"/><circle class="arc" cx="18" cy="18" r="15" fill="none" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/></svg><span></span></div>` : ""}
      </div>
      <div class="rail"><div class="bar"></div><i class="mk ${shown < 0 ? "neg" : ""}" data-pos-mk="${p.id}" style="left:${railPos(shown)}%"></i>
        <span class="lb" style="left:0">-${s.stop_pct || 6}% stop</span><span class="lb" style="left:${zero}%;transform:translateX(-50%)">0</span><span class="lb" style="right:0">${activeBook !== "main" ? ("+" + (s.take_profit_pct || 10) + "% TP") : ("+" + (s.trail_arm_pct || 20) + "% trail" + (p.armed ? " ✓" : ""))}</span></div>
      ${details}
    </div>`;
  }
  function closedRow(p) {
    const sym = symFor(p.mint, p.symbol), win = (p.pnl_usd || 0) >= 0;
    const held = p.opened && p.closed ? fmtDur(p.closed - p.opened) : null;
    return `<div class="crow">
      <div class="tok ${win ? "win" : "loss"}">${esc(initial(sym))}</div>
      <div class="mid"><div class="t">${esc(sym)}</div><div class="s">${[esc(p.exit_reason || "closed"), held ? "held " + held : "", p.closed ? `<span data-ago="${p.closed}"></span>` : ""].filter(Boolean).join(" · ")}</div></div>
      <div class="r"><div class="t ${cls(p.pnl_usd)}">${sgnUsd(p.pnl_usd)}</div><div class="s ${cls(p.pnl_pct)}">${pct(p.pnl_pct)}</div></div>
    </div>`;
  }
  function emptyState(title, sub) {
    return `<div class="empty"><div class="radar"><i></i><b></b></div><div class="t">${esc(title)}</div><div class="s">${esc(sub)}</div></div>`;
  }
  let posKey = "";
  function renderPositions(force) {
    const root = $("pos-list"); if (!root) return;
    const pos = cache.pos || {}, st = cache.st || {}, f = st.funnel || {};
    const open = pos.open || [], closed = pos.closed || [];
    const badge = String(posMode === "open" ? open.length : closed.length);
    if ($("pos-badge") && $("pos-badge").textContent !== badge) $("pos-badge").textContent = badge;
    open.forEach(p => {
      const cur = num(p.pnl_pct_live) ? +p.pnl_pct_live : null; if (cur == null) return;
      const tw = posTween[p.id];
      if (!tw) posTween[p.id] = { from: cur, to: cur, t0: performance.now() };
      else if (Math.abs(tw.to - cur) > 0.05) posTween[p.id] = { from: tw.done ? tw.to : tw.from + (tw.to - tw.from) * Math.min(1, (performance.now() - tw.t0) / 2400), to: cur, t0: performance.now() };
    });
    Object.keys(posTween).forEach(id => { if (!open.find(p => String(p.id) === id)) delete posTween[id]; });
    const items = posMode === "open" ? open : closed;
    const seen = seenTotal(f), rej = (f.killed || 0) + (f.rejected || 0) + (f.audit_red || 0);
    const key = posMode + "|" + items.map(p => p.id + ":" + (p.armed ? 1 : 0) + ":" + (p.symbol || "") + ":" + (p.pnl_usd != null ? p.pnl_usd : "") + ":" + metaTag(p.mint)).join(",") + (items.length ? "" : "|" + seen + ":" + rej);
    if (!force && key === posKey) {
      open.forEach(p => {
        const el = root.querySelector(`.pos[data-id="${p.id}"] [data-pos-val]`);
        if (el) { const v = num(p.last_value) ? usd(p.last_value) : usd(p.size_usd * (1 + (+p.pnl_pct_live || 0) / 100)); if (el.textContent !== v) el.textContent = v; }
      });
      return;
    }
    const leaving = posMode === "open" ? [...root.querySelectorAll(".pos[data-id]")].filter(el => !open.find(p => String(p.id) === el.dataset.id)) : [];
    posKey = key;
    const draw = () => {
      root.innerHTML = items.length ? (posMode === "open" ? items.map(posCard).join("") : items.map(closedRow).join(""))
        : posMode === "open"
          ? emptyState("No open positions", ((st.open_count || 0) + (st.closed_count || 0)) ? `${closed.length} closed paper trade${closed.length === 1 ? "" : "s"} so far — scanning for the next coin that passes every check.` : seen ? `No trades yet — filters rejected ${rej.toLocaleString("en-US")} of ${seen.toLocaleString("en-US")} coins seen. The desk only buys what passes every check.` : "Scanning for Pump.fun graduates…")
          : emptyState("No closed trades yet", "Closed paper trades will appear here with their exit reason, hold time and P&L.");
      items.forEach(p => { delete p._new; });
      root.querySelectorAll(".pos").forEach(c => c.onclick = e => { if (e.target.closest("a")) return; c.classList.toggle("open-d"); });
      tickClock();
    };
    if (leaving.length && !reduceMotion()) { leaving.forEach(el => el.classList.add("leave")); setTimeout(draw, 650); }
    else draw();
  }

  /* ---------- logger + why they died ---------- */
  function logLine(a, isNew) {
    const c = evClass(a), col = agentColor(a.agent), why = prettyWhy(a);
    return `<div class="ll ${isNew ? "enter" : ""}" style="--c:${col}"><i class="d"></i><span class="tm">${romeHM(a.ts)}</span>
      <span class="tx"><span class="ag">${esc(String(a.agent || "desk").toUpperCase())}:</span> <span class="vb ${c}">${esc(evVerb(a))}</span>${a.mint ? ` <span class="mn">${esc(symFor(a.mint))}</span>` : ""}${why ? ` <span class="why">· ${esc(why)}</span>` : ""}</span></div>`;
  }
  let logKeyMini = "", logKeyFull = "";
  function renderLog(force) {
    const items = (cache.act && cache.act.items) || [];
    const mt = items.slice(0, 80).map(a => metaTag(a.mint)).join("");
    const killed = items.filter(a => evClass(a) === "kill").length;
    if ($("log-killed")) $("log-killed").textContent = killed + " killed · last " + items.length;
    if ($("log-count")) $("log-count").textContent = items.length + " recent events";
    const mini = $("log-mini");
    const mk = items.slice(0, 7).map(a => a.id).join(",") + "|" + mt.slice(0, 7);
    if (mini && (force || mk !== logKeyMini)) {
      logKeyMini = mk;
      mini.classList.toggle("log-mini-fade", items.length > 5);
      mini.innerHTML = items.length ? items.slice(0, 7).map(a => logLine(a, !firstPaint && !seenAct.has(a.id) && !reduceMotion())).join("")
        : emptyState("Quiet so far", "Desk events appear here as the agents make decisions.");
    }
    const full = $("log-full");
    const filt = items.filter(a => logFilter === "all" || evClass(a) === logFilter);
    const fk = logFilter + "|" + filt.slice(0, 80).map(a => a.id).join(",") + "|" + mt;
    if (full && (force || fk !== logKeyFull)) {
      logKeyFull = fk;
      full.innerHTML = filt.length ? filt.slice(0, 80).map(a => logLine(a, !firstPaint && !seenAct.has(a.id) && !reduceMotion())).join("")
        : emptyState("Nothing here yet", logFilter === "trade" ? "No paper trades yet. They show up here the moment the Executor fills one." : "No events match this filter in the recent log.");
    }
    items.forEach(a => seenAct.add(a.id));
  }
  function renderDied() {
    const root = $("died"); if (!root) return;
    const items = (cache.act && cache.act.items) || [];
    const b = {};
    items.forEach(a => { const k = diedBucket(a); if (k) b[k] = (b[k] || 0) + 1; });
    const rows = Object.entries(b).sort((x, y) => y[1] - x[1]).slice(0, 8);
    const max = rows.length ? rows[0][1] : 1;
    const oldest = items.length ? items[items.length - 1].ts : null;
    const scope = items.length ? `last ${items.length} events · since ${romeHM(oldest)}` : "—";
    if ($("died-scope") && $("died-scope").textContent !== scope) $("died-scope").textContent = scope;
    const key = rows.map(r => r.join(":")).join(",");
    if (root.dataset.k === key) return;
    root.dataset.k = key;
    root.innerHTML = rows.length ? rows.map(([k, v]) => `<div class="dd"><div class="row1"><span>${esc(k)}</span><b>${v}</b></div><div class="bar"><i data-w="${(v / max * 100).toFixed(1)}"></i></div></div>`).join("")
      : `<div class="s" style="grid-column:1/-1">No rejections in the recent log.</div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll(".bar i").forEach(i => { i.style.width = i.dataset.w + "%"; })));
  }

  /* ---------- signals + settings ---------- */
  function renderSignals() {
    const root = $("signals"); if (!root) return;
    const items = (cache.sig && cache.sig.signals) || [];
    if ($("sig-count")) $("sig-count").textContent = items.length + " signals";
    const key = items.map(s => s.id).join(",") || "empty";
    if (root.dataset.k === key) return; root.dataset.k = key;
    root.innerHTML = items.length ? items.slice(0, 30).map(s => {
      const url = safeUrl(s.url), sym = symFor(s.mint, s.symbol);
      const name = url ? `<a href="${url}" target="_blank" rel="noopener">${esc(sym)}</a>` : esc(sym);
      return `<div class="row"><div class="avatar">${esc(initial(sym))}</div>
        <div class="mid"><div class="t">${name}</div><div class="s">${esc(s.status || "")} ${esc(s.note || "")} · <span data-ago-plain="${s.ts || ""}"></span></div></div>
        <div class="r"><div class="t">${esc(s.score != null ? s.score : "")}</div><div class="s">${usd(s.size_usd)}</div></div></div>`;
    }).join("") : emptyState("No signals yet", "A signal is created only when a coin clears the scanner, the 8-layer audit and the analyst gate.");
  }
  function urlBase64ToUint8Array(b64) {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function isStandalone() {
    return window.navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  }
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function pushSupported() {
    return !!(window.isSecureContext && window.PushManager && navigator.serviceWorker && window.Notification);
  }
  function pushStatusLabel(st) {
    if (!pushSupported() || !(st && st.vapid_public_key)) return "Not available in this browser";
    if (isIOS() && !isStandalone()) return "Add this app to your Home Screen first, then enable alerts";
    if (typeof Notification !== "undefined" && Notification.permission === "denied") return "Blocked in iOS settings";
    if (localStorage.getItem("desk_push_ok") === "1" || (typeof Notification !== "undefined" && Notification.permission === "granted")) return "On · paper entries and exits";
    return "Off · tap to enable";
  }
  async function postPushSub(st, sub) {
    const base = (st.push_ntfy_base || st.ntfy_base || "https://ntfy.envs.net").replace(/\/$/, "");
    const topic = st.push_topic;
    if (!topic) throw new Error("no push topic");
    const r = await fetch(base + "/" + topic, {
      method: "POST",
      headers: { "Content-Type": "application/json", Title: "desk-push-sub", Cache: "no" },
      body: JSON.stringify({ kind: "webpush-sub", subscription: sub.toJSON ? sub.toJSON() : sub })
    });
    if (!r.ok) throw new Error("inbox " + r.status);
  }
  async function registerPush(st, interactive) {
    if (!pushSupported() || !st || !st.vapid_public_key) return "unsupported";
    if (isIOS() && !isStandalone()) return "homescreen";
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      if (interactive) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return "denied";
      } else if (Notification.permission !== "granted") {
        return "off";
      }
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(st.vapid_public_key)
      });
    }
    await postPushSub(st, sub);
    localStorage.setItem("desk_push_ok", "1");
    return "on";
  }
  let pushTried = false;
  function maybeRepairPush(st) {
    if (pushTried || !st || !st.vapid_public_key || !st.push_topic) return;
    if (!pushSupported() || (isIOS() && !isStandalone())) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    pushTried = true;
    registerPush(st, false).catch(() => { pushTried = false; });
  }

  let settingsKey = "";
  function renderSettings() {
    const root = $("settings"); if (!root) return;
    const st = cache.st || {}, c = st.connectivity || {}, integ = c.integrations || {}, s = st.settings || {};
    const prof = safeUrl(st.profile_url);
    const rows = [
      ["Mode", `<span class="chip paper">PAPER</span> no live orders`],
      ["FOMO profile", prof ? `<a href="${prof}" target="_blank" rel="noopener">@${esc(st.handle)} ↗</a>` : esc(st.handle || "—")],
      ["Analyst", esc(st.analyst_mode || "—")],
      ["Data path", `<span class="s">${esc((D || "").slice(0, 4) + "…" + (D || "").slice(-3))}</span>`],
      ["Links", `Helius ${c.helius ? "✓" : "✗"} · PumpPortal ${c.pumpportal ? "✓" : "✗"} · Jev ${c.typesafe ? "✓" : "✗"}`],
      ["Add-ons", Object.entries(integ).map(([k, v]) => esc(k) + " " + (v === "active" ? "✓" : v === "off" ? "off" : "key?")).join(" · ") || "—"],
      ["Exits", num(s.stop_pct) ? `stop -${s.stop_pct}% · trail +${s.trail_arm_pct}%/${s.trail_giveback_pct}% · ${(s.timeout_s || 0) / 3600}h` : "—"],
      ["Sizing", num(s.size_pct) ? `${s.size_pct}% of stack · min $${s.size_min_usd}` : "—"],
      ["Advisor", esc((st.xai_model || "grok-4.6") + " · xai-sdk")],
      ["Report", `${esc(s.report_time || "07:00")} ${esc(st.report_tz || TZ)}`],
      ["Stack start", usd(st.start)],
      ["Running on", st.host === "pc" ? "PC backup" : st.host === "box" ? "main (box)" : "—"],
      ["Live channel", ntfySse ? "ntfy SSE · Pages fallback" : "Pages polling"],
      ["Trade alerts", pushStatusLabel(st)],
      ["App", "v19 · Night Desk"],
    ];
    const key = JSON.stringify(rows);
    if (key === settingsKey) return; settingsKey = key;
    const anim = animModeStored();
    root.innerHTML = rows.map(([t, r]) => `<div class="row"><div class="mid"><div class="t">${t}</div></div><div class="r s">${r}</div></div>`).join("")
      + `<div class="row" id="anim-row"><div class="mid"><div class="t">Animations</div><div class="s">Auto follows iOS Reduce Motion</div></div>
          <div class="r"><div class="seg anim-seg" id="anim-seg"><i class="seg-ink" id="anim-ink"></i>
            <button type="button" data-anim="auto" class="${anim === "auto" ? "on" : ""}">Auto</button>
            <button type="button" data-anim="full" class="${anim === "full" ? "on" : ""}">Full</button>
            <button type="button" data-anim="reduced" class="${anim === "reduced" ? "on" : ""}">Reduced</button></div></div></div>`
      + `<div class="row" id="reconnect" style="cursor:pointer"><div class="mid"><div class="t">Change data link</div><div class="s">Paste a new #d= link</div></div><div class="r s">›</div></div>`;
    $("reconnect").onclick = () => { localStorage.removeItem("desk_d"); location.replace(location.pathname); location.reload(); };
    const alertRow = Array.from(root.querySelectorAll(".row")).find(r => r.querySelector(".t") && r.querySelector(".t").textContent === "Trade alerts");
    if (alertRow) {
      alertRow.style.cursor = "pointer";
      alertRow.onclick = () => {
        const stNow = cache.st || {};
        registerPush(stNow, true).then(res => {
          if (res === "on") alertRow.querySelector(".r").innerHTML = "On · paper entries and exits";
          else if (res === "homescreen") alertRow.querySelector(".r").innerHTML = "Add this app to your Home Screen first, then enable alerts";
          else if (res === "denied") alertRow.querySelector(".r").innerHTML = "Blocked in iOS settings";
          else if (res === "unsupported") alertRow.querySelector(".r").innerHTML = "Not available in this browser";
        }).catch(() => { alertRow.querySelector(".r").innerHTML = "Could not reach the desk; try again"; });
      };
    }
    maybeRepairPush(st);
    const seg = $("anim-seg");
    seg.querySelectorAll("button").forEach(btn => btn.onclick = () => {
      localStorage.setItem("desk_anim", btn.dataset.anim);
      seg.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === btn));
      applyAnimAttr(); syncInk("anim-seg", "anim-ink"); drawChart(true);
    });
    requestAnimationFrame(() => syncInk("anim-seg", "anim-ink"));
  }

  /* ---------- render orchestration ---------- */
  function renderAll(full) {
    if ($("skel")) $("skel").classList.add("hidden");
    const steps = [renderHero, renderHost, drawChart, renderDeskRows, renderAgentGrid, renderPositions, renderClosedWide, renderTape, renderLog, renderDied]
      .concat(full ? [renderSignals, renderSettings] : [], [resolvePendingCloses, tickClock]);
    steps.forEach(fn => { try { fn(); } catch (e) { if (!fn._warned) { fn._warned = 1; console.warn("render " + fn.name + ": " + (e && e.message)); } } });
    if (firstPaint) { firstPaint = false; requestAnimationFrame(syncAllInks); }
  }
  function render(st, pos, sig, act, ch) {
    // clock offset comes only from the SSE channel (fresh by nature); Pages JSON can be minutes old and would skew ages
    // a fresher SSE snapshot wins for the live fields
    const sseFresher = !!(cache.st && cache.st.published_at && (st.published_at || st.ts) && cache.st.published_at > (st.published_at || st.ts) && ntfyLastAt && Date.now() - ntfyLastAt < 60000);
    const merged = Object.assign({}, st);
    if (sseFresher) ["equity", "stack", "pnl_usd", "pnl_pct", "open_count", "closed_count", "win_rate", "funnel", "heartbeats", "published_at", "ts"].forEach(k => { if (cache.st[k] !== undefined) merged[k] = cache.st[k]; });
    merged.mode = "PAPER";
    if (st.live_base) liveBase = st.live_base;
    if (st.live_base_fallback) liveBaseFallback = st.live_base_fallback;
    if (st.ntfy_sse && st.ntfy_sse !== ntfySse) { ntfySse = st.ntfy_sse; connectNtfy(true); }
    else if (st.ntfy_topic && !ntfySse) { ntfySse = (st.ntfy_base || "https://ntfy.envs.net") + "/" + st.ntfy_topic + "/sse"; connectNtfy(true); }
    // activity: full JSON (full mints) + any newer SSE heads not yet in the JSON
    const byId = new Map(((act && act.items) || []).map(a => [a.id, a]));
    ((cache.act && cache.act.items) || []).forEach(a => { if (!byId.has(a.id)) byId.set(a.id, a); });
    const actM = { items: [...byId.values()].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 150) };
    // desk-known symbols win over DexScreener
    ((pos && pos.open) || []).concat((pos && pos.closed) || [], (sig && sig.signals) || []).forEach(p => {
      if (p.mint && p.symbol) meta[p.mint] = Object.assign(meta[p.mint] || {}, { symbol: p.symbol, deskSym: p.symbol });
    });
    const posM = sseFresher ? { open: mergeOpenFrom((pos && pos.open) || [], cache.pos.open), closed: (pos && pos.closed) || [] } : (pos || { open: [], closed: [] });
    if (!ntfyLastAt || Date.now() - ntfyLastAt > 75000) channelFreshAt = Date.now() - (ntfySse ? 60000 : 0);
    cache.st = merged; cache.sig = sig || { signals: [] }; cache.act = actM; cache.ch = ch || { equity: [] };
    stampBeats(merged);
    detectTrades(posM);
    cache.pos = posM;
    renderAll(true);
    refreshDex();
  }
  let ticking = false;
  async function tick() {
    if (ticking) return; ticking = true;
    try {
      if (firstPaint && $("skel")) $("skel").classList.remove("hidden");
      try {
        const cat = await get("books.json");
        if (cat && Array.isArray(cat.books) && cat.books.length) booksCatalog = cat;
      } catch (_) {}
      const ids = (booksCatalog.books || []).map(b => b.id);
      let want = activeBook || "main";
      try { want = localStorage.getItem("desk_book") || booksCatalog.default || "main"; } catch (_) {}
      if (!ids.includes(want)) want = "main";
      if (want !== activeBook) {
        activeBook = want;
        HTML.dataset.book = want;
      }
      renderBookSwitcher();
      const prefix = prefixFor(activeBook);
      const [st, pos, sig, act, ch] = await Promise.all(["state.json", "positions.json", "signals.json", "activity.json", "chart.json"].map(n => get(prefix + n)));
      render(st, pos, sig, act, ch);
      if (activeBook !== "main") {
        Promise.all(["state.json", "positions.json", "activity.json"].map(get)).then(([mst, mpos, mact]) => {
          stores.main = Object.assign(stores.main || {}, { st: mst, pos: mpos, act: mact });
        }).catch(() => {});
      }
      window.__deskLoaded = true; window.__deskPolls = (window.__deskPolls || 0) + 1;
    } catch (e) {
      console.warn("desk fetch failed", e && e.message);
      window.__deskTickErr = String(e && e.message || e);
      if (!ntfyLastAt || Date.now() - ntfyLastAt > 60000) setLivePill("offline");
      if ($("skel")) $("skel").classList.add("hidden");
    } finally { ticking = false; }
  }

  /* ---------- boot ---------- */
  if (!D) {
    const nd = $("nodata"); if (nd) nd.classList.remove("hidden");
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    HTML.classList.add("no-d");
    return;
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  discoverLive().finally(() => {
    connectNtfy(true);
    tick();
    setInterval(tick, 30000);
    setInterval(() => {
      const silent = !ntfyLastAt || Date.now() - ntfyLastAt > 75000;
      if (!ntfySse || silent || activeBook !== "main") tick();
      if (ntfySse && !ntfyLastAt && ntfyEs && ntfyEs.readyState === 2) connectNtfy(true);
      refreshDex();
    }, 5000);
  });
  setInterval(tickClock, 1000);
  requestAnimationFrame(tweenLoop);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { connectNtfy(true); tick(); } });
  window.addEventListener("pageshow", e => { if (e.persisted) { connectNtfy(true); tick(); } });
  window.addEventListener("resize", () => { if (isWide()) placeSettings(); syncHeaderVar(); drawChart(true); syncAllInks(); });
  syncHeaderVar(); placeSettings();
  setTimeout(syncAllInks, 60);
})();
