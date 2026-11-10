/* v16 · Animated equity chart — real points only; visual tweening between polls. Vanilla canvas. */
(function () {
  const raf = (typeof requestAnimationFrame === "function")
    ? requestAnimationFrame.bind(window || globalThis)
    : (fn) => setTimeout(() => fn(Date.now()), 16);
  const reduce = () => (document.documentElement.dataset.motion === "reduced") || !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches && document.documentElement.dataset.anim !== "full");

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  class EquityChart {
    constructor(cv) {
      this.cv = cv;
      this.pts = [];       // display points {ts, equity}
      this.target = [];    // latest real points
      this.callouts = [];
      this.color = "#32D74B";
      this.scrub = null;   // {i, x, y, equity, ts} or null
      this._raf = 0;
      this._tween = null;
      this._drawProg = 1;
      this._pulse = 0;
      this._live = true;
      this._bound = false;
    }

    setData(points, opts) {
      opts = opts || {};
      this.color = opts.color || this.color;
      this.callouts = opts.callouts || [];
      this._live = opts.live !== false;
      const next = (points || []).map(p => ({ ts: p.ts, equity: +p.equity })).filter(p => p.equity != null && !Number.isNaN(p.equity));
      if (!next.length) { this.target = []; this.pts = []; this._paint(); return; }

      if (!this.pts.length || reduce()) {
        this.target = next; this.pts = next.map(p => ({ ...p }));
        this._drawProg = reduce() ? 1 : 0;
        this._tween = { t0: performance.now(), dur: 700, from: null };
        this._kick();
        return;
      }

      // Visual tween: morph last point toward new last, append new points
      const from = this.pts.map(p => ({ ...p }));
      this.target = next;
      this._tween = { t0: performance.now(), dur: 480, from, to: next };
      this._kick();
    }

    _kick() {
      if (this._raf) return;
      const loop = (now) => {
        this._raf = 0;
        this._pulse = now;
        let need = false;

        if (this._tween) {
          const u = Math.min(1, (now - this._tween.t0) / this._tween.dur);
          const e = easeOut(u);
          if (this._tween.from) {
            const a = this._tween.from, b = this._tween.to;
            // align by index from end
            const n = Math.max(a.length, b.length);
            const out = [];
            for (let i = 0; i < n; i++) {
              const ia = i - (n - a.length), ib = i - (n - b.length);
              const pa = a[Math.max(0, ia)] || a[0];
              const pb = b[Math.max(0, ib)] || b[b.length - 1];
              if (ia < 0) out.push({ ts: lerp(pb.ts, pb.ts, e), equity: lerp(pa.equity, pb.equity, e) });
              else if (ib < 0) out.push({ ts: pa.ts, equity: lerp(pa.equity, (b[0] || pa).equity, e) });
              else out.push({ ts: lerp(pa.ts, pb.ts, e), equity: lerp(pa.equity, pb.equity, e) });
            }
            // prefer target length
            this.pts = b.map((pb, i) => {
              const pa = a[Math.min(i, a.length - 1)] || a[a.length - 1];
              const same = i < a.length;
              return {
                ts: same ? lerp(pa.ts, pb.ts, e) : pb.ts,
                equity: same ? lerp(pa.equity, pb.equity, e) : lerp(a[a.length - 1].equity, pb.equity, e)
              };
            });
          } else {
            this.pts = this.target.map(p => ({ ...p }));
            this._drawProg = e;
          }
          if (u < 1) need = true; else { this._tween = null; this.pts = this.target.map(p => ({ ...p })); this._drawProg = 1; }
        }

        if (this._live && !reduce()) need = true;
        this._paint();
        if (need) this._raf = raf(loop);
      };
      this._raf = raf(loop);
    }

    _layout() {
      const cv = this.cv;
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth || 300, h = cv.clientHeight || 200;
      if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr; cv.height = h * dpr;
      }
      const c = cv.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { c, w, h, padY: 30, padX: 8 };
    }

    _xy(vals, w, h, padX, padY) {
      let lo = Math.min(...vals), hi = Math.max(...vals);
      if (hi === lo) { lo -= Math.max(1, lo * 0.01); hi += Math.max(1, hi * 0.01); }
      const span = hi - lo || 1;
      const x = i => padX + (vals.length === 1 ? (w - 2 * padX) / 2 : i / (vals.length - 1) * (w - 2 * padX));
      const y = v => padY + (1 - (v - lo) / span) * (h - padY - 20);
      return { x, y, lo, hi };
    }

    _paint() {
      const { c, w, h, padY, padX } = this._layout();
      c.clearRect(0, 0, w, h);
      const pts = this.pts;
      if (!pts.length) {
        c.fillStyle = "#8E8E93"; c.font = "13px -apple-system, Inter, sans-serif";
        c.fillText("Equity curve appears after the first tick", 8, h / 2);
        return;
      }
      const vals = pts.map(p => p.equity);
      const { x, y } = this._xy(vals, w, h, padX, padY);
      const color = this.color;
      const nDraw = Math.max(2, Math.ceil(vals.length * Math.max(0.02, this._drawProg)));

      // gradient fill
      const g = c.createLinearGradient(0, padY, 0, h);
      g.addColorStop(0, color + "66"); g.addColorStop(1, "#00000000");
      c.beginPath();
      for (let i = 0; i < nDraw; i++) {
        const px = x(i), py = y(vals[i]);
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.save(); c.shadowColor = color; c.shadowBlur = 14; c.strokeStyle = color; c.lineWidth = 2.6; c.lineJoin = "round"; c.lineCap = "round"; c.stroke(); c.restore();
      const lastI = nDraw - 1;
      c.lineTo(x(lastI), h); c.lineTo(x(0), h); c.closePath(); c.fillStyle = g; c.fill();

      // glowing end dot + pulse
      const ex = x(lastI), ey = y(vals[lastI]);
      const pulse = reduce() ? 0 : (0.5 + 0.5 * Math.sin(this._pulse / 320));
      c.beginPath(); c.arc(ex, ey, 8 + pulse * 3, 0, Math.PI * 2); c.fillStyle = color + "33"; c.fill();
      c.beginPath(); c.arc(ex, ey, 4.5, 0, Math.PI * 2); c.fillStyle = color; c.fill();

      // callouts
      const tones = { buy: "#0A84FF", sell: "#32D74B", stop: "#FF453A" };
      const cos = this.callouts.slice(-6);
      cos.forEach((co, idx) => {
        let best = 0, bestD = Infinity;
        pts.forEach((p, i) => { if (i >= nDraw) return; const d = Math.abs((p.ts || 0) - (co.ts || 0)); if (d < bestD) { bestD = d; best = i; } });
        const px = x(best), py = y(pts[best].equity);
        const tone = tones[co.tone] || "#8E8E93";
        const label = String(co.label || "").slice(0, 28);
        c.font = "600 11px -apple-system, Inter, sans-serif";
        const tw = c.measureText(label).width, bw = tw + 16, bh = 22;
        const above = idx % 2 === 0;
        const bx = Math.max(4, Math.min(w - bw - 4, px - bw / 2));
        const by = above ? Math.max(4, py - bh - 14) : Math.min(h - bh - 4, py + 14);
        // pop scale based on age of set — approximate with drawProg
        const pop = reduce() ? 1 : Math.min(1, this._drawProg * 1.2 + idx * 0.05);
        c.save();
        c.translate(bx + bw / 2, by + bh / 2);
        c.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
        c.translate(-(bx + bw / 2), -(by + bh / 2));
        c.beginPath(); c.moveTo(px, py); c.lineTo(bx + bw / 2, by + (above ? bh : 0));
        c.strokeStyle = tone + "aa"; c.lineWidth = 1; c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]);
        const r = 11;
        c.beginPath();
        c.moveTo(bx + r, by); c.arcTo(bx + bw, by, bx + bw, by + bh, r);
        c.arcTo(bx + bw, by + bh, bx, by + bh, r); c.arcTo(bx, by + bh, bx, by, r);
        c.arcTo(bx, by, bx + bw, by, r); c.closePath();
        c.fillStyle = "#1C1C1E"; c.fill(); c.strokeStyle = tone; c.lineWidth = 1.2; c.stroke();
        c.fillStyle = "#fff"; c.fillText(label, bx + 8, by + 15);
        c.restore();
        c.beginPath(); c.arc(px, py, 3.5, 0, Math.PI * 2); c.fillStyle = tone; c.fill();
      });

      // scrub crosshair
      if (this.scrub && this.scrub.i != null && this.scrub.i < nDraw) {
        const i = this.scrub.i;
        const sx = x(i), sy = y(vals[i]);
        c.beginPath(); c.moveTo(sx, padY - 4); c.lineTo(sx, h - 14);
        c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 1; c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]);
        c.beginPath(); c.arc(sx, sy, 5, 0, Math.PI * 2); c.fillStyle = "#fff"; c.fill();
        this.scrub.x = sx; this.scrub.y = sy; this.scrub.equity = vals[i]; this.scrub.ts = pts[i].ts;
      }
    }

    hit(clientX) {
      if (!this.pts.length) return null;
      const rect = this.cv.getBoundingClientRect();
      const { w, h, padX, padY } = { w: this.cv.clientWidth, h: this.cv.clientHeight, padX: 8, padY: 30 };
      const vals = this.pts.map(p => p.equity);
      const { x } = this._xy(vals, w, h, padX, padY);
      const lx = clientX - rect.left;
      let best = 0, bestD = Infinity;
      for (let i = 0; i < this.pts.length; i++) {
        const d = Math.abs(x(i) - lx);
        if (d < bestD) { bestD = d; best = i; }
      }
      this.scrub = { i: best };
      this._paint();
      return { i: best, equity: this.pts[best].equity, ts: this.pts[best].ts, x: x(best) };
    }

    clearScrub() { this.scrub = null; this._paint(); }
  }

  window.EquityChart = EquityChart;
  window.drawEquity = function (cv, points, opts) {
    if (!cv._eq) cv._eq = new EquityChart(cv);
    cv._eq.setData(points, opts);
  };
  window.drawLine = function (cv, vals, color) {
    window.drawEquity(cv, (vals || []).map((equity, i) => ({ ts: i, equity })), { color, live: false });
  };
})();
