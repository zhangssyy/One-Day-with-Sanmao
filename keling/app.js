(function () {
  "use strict";

  // 晃动判定：低于 GATE 的加速度当作静止，其余按 GAIN 累积成 energy，
  // 以 TAU 为时间常数衰减，攒满 NEED 就抽出一枚。
  const GATE = 11;
  const GAIN = 0.34;
  const TAU = 0.5;
  const NEED = 30;

  // 每人只能抽一枚：抽中的那枚记在本机。演示时要重置，在网址后加 ?again。
  const KEY = "keling-bookmark:v1";

  const IDLE = "idle";
  const DRAWING = "drawing";
  const SHOWN = "shown";

  const TONE = { "祝福": "bless", "启示": "insight", "启示与祝福": "both" };

  // [字号, 列宽]，由大到小。MARK_CHROME 是卡片内外框加内边距占掉的宽度。
  const TYPE_STEPS = [[20, 42], [19, 40], [18, 38], [17, 36], [16, 34], [15, 31], [13, 28], [12, 25]];
  const MARK_CHROME = 54;

  const el = {};
  ["app", "stage", "bundle", "sheet", "quote", "work", "year", "src", "serial",
    "date", "rule", "draw", "sound", "tip", "live"].forEach(function (id) {
    el[id] = document.getElementById(id);
  });
  el.mark = document.querySelector(".mark");

  const quotes = (window.KELING_QUOTES || []).filter(function (q) {
    return q && typeof q.quote === "string" && q.quote.trim() && q.work;
  });

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const needsPermit = typeof DeviceMotionEvent !== "undefined"
    && typeof DeviceMotionEvent.requestPermission === "function";

  let state = IDLE;
  let lockUntil = 0;
  let energy = 0;
  let tilt = 0;
  let paintedShake = -1;
  let paintedTilt = -9;
  let frameId = 0;
  let frameAt = 0;
  let prevG = null;

  let listening = false;
  let permitted = !needsPermit;
  let coached = false;
  let typeQueued = false;
  let typeTries = 0;

  let soundOn = false;
  let audio = null;
  let lastKnock = 0;

  // 存储可能被禁（无痕模式、内嵌浏览器），那就只在这一次打开里有效。
  let memo = null;

  const timers = new Set();

  /* ── 启动 ─────────────────────────────────────────────── */

  if (!quotes.length) {
    el.draw.disabled = true;
    el.bundle.disabled = true;
    coached = true;
    el.tip.textContent = "书签未载入，请检查 quotes.js";
    el.tip.classList.add("is-on");
    return;
  }

  el.bundle.addEventListener("click", onDraw);
  el.draw.addEventListener("click", onDraw);
  el.sound.addEventListener("click", toggleSound);
  document.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", teardown);
  window.addEventListener("resize", setType);
  window.addEventListener("orientationchange", setType);
  // 自带宋体到得晚，先按回退字体排出来的列数就不准了，到了再排一次。
  // 不能用 document.fonts.ready：脚本跑到这里时字体往往还没开始下载，
  // ready 当场就兑现了。显式发起加载，等它真到了再排。
  // 列高一变，原先排好的列数就不作数了。会让它变的不只是窗口：标题字体
  // 晚到会撑高报头，微信的工具栏会伸缩，这些都不发 resize。直接盯着正文
  // 那一格的高度，变了就重排。
  if (window.ResizeObserver) {
    let column = 0;
    new ResizeObserver(function (entries) {
      const h = Math.round(entries[0].contentRect.height);
      if (h !== column) {
        column = h;
        setType();
      }
    }).observe(el.quote.parentNode);
  }

  if (document.fonts && document.fonts.load) {
    document.fonts.load('600 20px "KL Serif"', "柯灵").then(setType, setType);
    document.fonts.load('900 20px "KL Title"', "柯灵");
    document.fonts.addEventListener("loadingdone", setType);
  }

  if (/[?&]again\b/.test(location.search)) {
    forget();
    history.replaceState(null, "", location.pathname);
  }

  // 抽过的人再打开，直接回到自己那一枚。
  const kept = recall();
  if (kept) {
    fill(kept.quote, kept.at);
    setState(SHOWN);
  } else if (permitted) {
    startMotion();
  }
  label();

  /* ── 状态机：所有视觉切换都由 app[data-state] 驱动 ────────── */

  function setState(next) {
    if (state === next) return;
    state = next;
    el.app.dataset.state = next;
    const shown = next === SHOWN;
    el.stage.setAttribute("aria-hidden", shown ? "true" : "false");
    el.sheet.setAttribute("aria-hidden", shown ? "false" : "true");
  }

  function label() {
    const mine = !!recall();
    el.draw.textContent = mine ? "看看我的书签" : "抽一枚书签";
    el.bundle.setAttribute("aria-label", el.draw.textContent);
    el.rule.textContent = mine
      ? "你已经抽过了 · 每人限抽一枚"
      : "每人限抽一枚 · 晃一晃手机也可以";
  }

  function busy() {
    return performance.now() < lockUntil;
  }

  function lock(ms) {
    lockUntil = performance.now() + ms;
  }

  function after(ms, fn) {
    const id = setTimeout(function () {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers.clear();
  }

  /* ── 抽签 ─────────────────────────────────────────────── */

  async function onDraw() {
    if (needsPermit && !permitted) {
      permitted = await askPermit();
      if (permitted) startMotion();
    }
    draw();
  }

  function draw() {
    if (el.draw.disabled || busy() || state !== IDLE) return;
    resetShake();

    // 已经抽过：不再抽新的，只把自己那一枚拿出来。
    const kept = recall();
    if (kept) {
      fill(kept.quote, kept.at);
      lock(reduce ? 120 : 420);
      setState(SHOWN);
      return;
    }

    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    const at = Date.now();
    keep(quote, at);
    buzz();
    if (soundOn) knock(0.7);
    stopMotion();

    fill(quote, at);
    lock(reduce ? 140 : 900);
    setState(DRAWING);
    after(reduce ? 0 : 700, function () {
      setState(SHOWN);
      label();
    });
  }

  function goBack() {
    clearTimers();
    resetShake();
    lock(reduce ? 120 : 420);
    setState(IDLE);
    el.draw.focus({ preventScroll: true });
  }

  /* ── 一人一枚 ─────────────────────────────────────────── */

  function recall() {
    let saved = memo;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (err) { /* 读不到就用内存里那份 */ }
    if (!saved) return null;
    const quote = quotes.find(function (q) { return q.id === saved.id; });
    return quote ? { quote: quote, at: saved.at || Date.now() } : null;
  }

  function keep(quote, at) {
    memo = { id: quote.id, at: at };
    try { localStorage.setItem(KEY, JSON.stringify(memo)); } catch (err) { /* 同上 */ }
  }

  function forget() {
    memo = null;
    try { localStorage.removeItem(KEY); } catch (err) { /* 同上 */ }
  }

  function fill(quote, at) {
    el.app.dataset.tone = TONE[quote.intent] || "both";
    // "——"是两个字符，字距和字形自带的边距会把它从中间拉断；
    // 换成一笔到底的二倍长破折号"⸺"。
    el.quote.textContent = quote.quote.replace(/——/g, "⸺");
    el.work.textContent = "《" + quote.work + "》";
    el.year.textContent = quote.year ? "柯灵 · " + quote.year : "柯灵";

    const no = String(quotes.indexOf(quote) + 1).padStart(3, "0");
    el.serial.innerHTML = "<small>No.</small><b>" + no + "</b><small>/ " + quotes.length + "</small>";
    const d = new Date(at);
    el.date.dateTime = d.toISOString().slice(0, 10);
    el.date.textContent = d.getFullYear() + "." + pad2(d.getMonth() + 1) + "." + pad2(d.getDate());
    setType();

    const host = hostOf(quote.sourceUrl);
    if (host) {
      el.src.href = quote.sourceUrl;
      el.src.textContent = host + " ↗";
      el.src.title = quote.sourceLabel || "";
      el.src.setAttribute("aria-label", quote.sourceLabel || ("出处 " + host));
      el.src.hidden = false;
    } else {
      el.src.hidden = true;
      el.src.removeAttribute("href");
    }

    say(quote.quote + " 柯灵《" + quote.work + "》");
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function hostOf(url) {
    if (!url || !/^https?:\/\//.test(url)) return "";
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (err) {
      return "";
    }
  }

  function say(text) {
    el.live.textContent = text;
  }

  /* ── 竖排版面 ─────────────────────────────────────────── */

  // 一列能站多少字没法算准：避头尾规则会把标点挤到下一列。所以先按最宽
  // 排一遍，数出实际用了几列，再把卡片收到正好那么宽。从大号字往下试，
  // 第一个排得下的就是答案。
  function setType() {
    if (!el.quote.textContent) return;

    // 先回到竖排再量，否则上一枚留下的横排样式会把列数数错。
    delete el.mark.dataset.flat;

    // 只有真的还没布局（高度为 0）才等下一帧，且最多等几帧，不能空转。
    if (el.quote.clientHeight < 8) {
      if (!typeQueued && typeTries < 6) {
        typeQueued = true;
        typeTries += 1;
        requestAnimationFrame(function () { typeQueued = false; setType(); });
      }
      return;
    }
    typeTries = 0;

    const room = Math.floor(Math.min(308, window.innerWidth * 0.86) - MARK_CHROME);
    const last = TYPE_STEPS.length - 1;

    for (let i = 0; i <= last; i += 1) {
      const lh = TYPE_STEPS[i][1];
      const fits = Math.max(1, Math.floor(room / lh));
      el.quote.style.setProperty("--fs", TYPE_STEPS[i][0] + "px");
      el.quote.style.setProperty("--lh", lh + "px");
      let cols = measureAt(fits, lh).cols;
      // 卡片一收窄，底下的篇名可能折成两行，正文的列就变矮了，原先站得下
      // 的字会被挤到新的一列、落到卡片外头。所以按收窄后的宽度再量，
      // 不够就放宽一列，直到量出来的和设下的对得上。
      while (cols <= fits) {
        const fit = measureAt(cols, lh);
        if (fit.cols <= cols && fit.spill <= 1) {
          // 一两列的短句居中更像一枚书签；多列就按常规顶对齐。
          el.mark.dataset.set = cols <= 2 ? "middle" : "head";
          return;
        }
        cols = Math.max(cols + 1, fit.cols);
      }
    }

    // 屏幅太矮（多半是横屏），竖排再小也排不下。退回横排，宁可不好看，
    // 也不能丢字。
    el.quote.style.width = "";
    el.mark.style.width = "";
    el.quote.style.removeProperty("--fs");
    el.quote.style.removeProperty("--lh");
    el.mark.dataset.set = "head";
    el.mark.dataset.flat = "1";
  }

  // 把正文定成 cols 列宽，卡片跟着定宽，再量。卡片宽度直接写死，不交给
  // CSS 的 max-content：iOS 的 WebKit 算不出竖排子元素的宽度，卡片会停在
  // 最小宽度，正文从两边溢出去。多出的 1px 让界行在最外一列的另一侧也
  // 画得出来，每列都被两道线框住。
  function measureAt(cols, lh) {
    const width = cols * lh + 1;
    el.quote.style.width = width + "px";
    el.mark.style.width = width + MARK_CHROME + "px";
    return measure();
  }

  // 量一遍真实的排版结果：用了几列（cols），以及最多有几像素掉出了列底
  // （spill）。竖排也躲不开避头尾——标点不许起一列，列里塞不下时浏览器
  // 宁可让它溢出列底，所以"列数够"不等于"排得下"，纵向必须另外验。
  function measure() {
    const range = document.createRange();
    range.selectNodeContents(el.quote);
    const rects = range.getClientRects();
    const bottom = el.quote.getBoundingClientRect().bottom;
    const seen = Object.create(null);
    let cols = 0;
    let spill = 0;
    for (let i = 0; i < rects.length; i += 1) {
      const key = Math.round(rects[i].left);
      if (!seen[key]) {
        seen[key] = true;
        cols += 1;
      }
      if (rects[i].bottom - bottom > spill) spill = rects[i].bottom - bottom;
    }
    return { cols: cols || 1, spill: spill };
  }

  /* ── 晃动：事件只累加数值，画面统一在一个 rAF 里更新 ───────── */

  function startMotion() {
    if (listening || typeof DeviceMotionEvent === "undefined") return;
    listening = true;
    window.addEventListener("devicemotion", onMotion);
  }

  function stopMotion() {
    if (!listening) return;
    listening = false;
    window.removeEventListener("devicemotion", onMotion);
  }

  async function askPermit() {
    const asks = [];
    try {
      if (typeof DeviceMotionEvent !== "undefined"
        && typeof DeviceMotionEvent.requestPermission === "function") {
        asks.push(DeviceMotionEvent.requestPermission());
      }
      if (typeof DeviceOrientationEvent !== "undefined"
        && typeof DeviceOrientationEvent.requestPermission === "function") {
        asks.push(DeviceOrientationEvent.requestPermission());
      }
      if (!asks.length) return true;
      const results = await Promise.all(asks);
      return results.every(function (s) { return s === "granted"; });
    } catch (err) {
      return false;
    }
  }

  function onMotion(event) {
    const mag = magnitudeOf(event);
    if (mag > GATE) energy += (mag - GATE) * GAIN;
    if (mag > 6 && !coached) coach();
    if (soundOn && mag > 15) rattleSound(mag);
    if (state === IDLE && !busy() && energy >= NEED) {
      energy = 0;
      draw();
      return;
    }
    requestFrame();
  }

  function magnitudeOf(event) {
    const linear = event.acceleration;
    const gravity = event.accelerationIncludingGravity;
    let mag = 0;

    if (linear && linear.x != null && (linear.x || linear.y || linear.z)) {
      mag = Math.hypot(linear.x, linear.y, linear.z);
    } else if (gravity && gravity.x != null && prevG) {
      mag = Math.hypot(
        gravity.x - prevG.x,
        gravity.y - prevG.y,
        gravity.z - prevG.z
      ) * 4;
    }

    if (gravity && gravity.x != null) {
      prevG = { x: gravity.x, y: gravity.y, z: gravity.z };
      tilt = clamp(gravity.x / 5, -1, 1);
    }
    return Math.min(70, mag);
  }

  function requestFrame() {
    if (frameId) return;
    frameAt = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function frame(now) {
    frameId = 0;
    const dt = Math.min(0.05, Math.max(0, (now - frameAt) / 1000));
    frameAt = now;
    if (energy > 0) {
      energy *= Math.exp(-dt / TAU);
      if (energy < 0.4) energy = 0;
    }
    paint();
    if (energy > 0) requestFrame();
  }

  function paint() {
    const shake = clamp(energy / NEED, 0, 1);
    if (Math.abs(shake - paintedShake) > 0.008) {
      paintedShake = shake;
      el.app.style.setProperty("--shake", shake.toFixed(3));
      el.bundle.style.setProperty("--amp", (shake * 5).toFixed(2) + "deg");
    }
    if (Math.abs(tilt - paintedTilt) > 0.008) {
      paintedTilt = tilt;
      el.app.style.setProperty("--tilt", tilt.toFixed(3));
    }
    el.bundle.classList.toggle("is-rattling", shake > 0.1 && state === IDLE);
  }

  function resetShake() {
    energy = 0;
    paint();
  }

  function coach() {
    coached = true;
    el.tip.textContent = "晃一晃也可以";
    el.tip.classList.add("is-on");
    after(4200, function () { el.tip.classList.remove("is-on"); });
  }

  function clamp(value, low, high) {
    return value < low ? low : value > high ? high : value;
  }

  function buzz() {
    if (!navigator.vibrate) return;
    try { navigator.vibrate(12); } catch (err) { /* 浏览器拒绝就算了 */ }
  }

  /* ── 键盘与生命周期 ───────────────────────────────────── */

  function onKey(event) {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "Escape" && state === SHOWN) {
      event.preventDefault();
      goBack();
      return;
    }
    if (event.key !== " " && event.key !== "Enter") return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "BUTTON" || tag === "A" || tag === "INPUT") return;
    event.preventDefault();
    onDraw();
  }

  function onVisibility() {
    if (document.hidden) {
      teardown();
    } else if (permitted && state === IDLE) {
      startMotion();
    }
  }

  // 退到后台时定时器会被清掉，所以先把半途的出签动画落地，
  // 免得回来看到一张空白页面。
  function teardown() {
    stopMotion();
    clearTimers();
    if (state === DRAWING) setState(SHOWN);
    lockUntil = 0;
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
    energy = 0;
    prevG = null;
    paint();
    if (audio && audio.state === "running") audio.suspend();
  }

  /* ── 声音 ─────────────────────────────────────────────── */

  function toggleSound() {
    soundOn = !soundOn;
    el.sound.setAttribute("aria-pressed", soundOn ? "true" : "false");
    el.sound.setAttribute("aria-label", soundOn ? "关闭声音" : "开启声音");
    if (soundOn && ensureAudio()) knock(0.35);
  }

  function ensureAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      if (!audio) audio = new Ctx();
      if (audio.state === "suspended") audio.resume();
    } catch (err) {
      audio = null;
    }
    return audio;
  }

  function rattleSound(mag) {
    const now = performance.now();
    if (now - lastKnock < 140) return;
    lastKnock = now;
    knock(Math.min(1, mag / 36));
  }

  function knock(strength) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 150 + Math.random() * 50;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.07 * strength), t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
    osc.onended = function () {
      osc.disconnect();
      gain.disconnect();
    };
  }
})();
