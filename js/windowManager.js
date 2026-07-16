/* ==========================================================================
   NimbusOS Window Manager
   ========================================================================== */
const WM = (() => {
  let windows = {};       // id -> {el, meta}
  let zTop = 10;
  let idSeq = 1;
  let activeId = null;

  const layer = () => document.getElementById("windows-layer");
  const taskbarApps = () => document.getElementById("taskbar-apps");

  function nextId() { return "win-" + (idSeq++); }

  function createWindow(opts) {
    // opts: {appId, title, icon, width, height, x, y, content(el|html), onClose, onFocus, resizable}
    const id = nextId();
    const w = opts.width || 640;
    const h = opts.height || 440;
    const x = opts.x != null ? opts.x : 80 + (Object.keys(windows).length * 24) % 220;
    const y = opts.y != null ? opts.y : 60 + (Object.keys(windows).length * 24) % 160;

    const el = document.createElement("div");
    el.className = "win";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.dataset.id = id;
    el.dataset.appId = opts.appId || "";

    el.innerHTML = `
      <div class="win-titlebar">
        <div class="win-controls">
          <button class="win-btn win-dot close" data-glyph="&times;" title="Close"></button>
          <button class="win-btn win-dot min" data-glyph="&minus;" title="Minimize"></button>
          <button class="win-btn win-dot max" data-glyph="&#43;" title="Maximize"></button>
        </div>
        <span class="win-title-icon">${opts.icon || ICONS.window}</span>
        <span class="win-title-text">${opts.title || "Window"}</span>
      </div>
      <div class="win-body"></div>
      ${opts.resizable === false ? "" : `
        <div class="win-resize n"></div><div class="win-resize s"></div>
        <div class="win-resize e"></div><div class="win-resize w"></div>
        <div class="win-resize ne"></div><div class="win-resize nw"></div>
        <div class="win-resize se"></div><div class="win-resize sw"></div>`}
    `;

    const body = el.querySelector(".win-body");
    if (typeof opts.content === "string") body.innerHTML = opts.content;
    else if (opts.content instanceof Node) body.appendChild(opts.content);

    layer().appendChild(el);

    const meta = {
      id, appId: opts.appId, title: opts.title, icon: opts.icon || "🪟",
      minimized: false, maximized: false,
      restore: { x, y, w, h },
      onClose: opts.onClose, onFocus: opts.onFocus, singleton: opts.singleton
    };
    windows[id] = { el, meta };

    // wire controls
    el.querySelector(".win-btn.close").addEventListener("click", (e) => { e.stopPropagation(); closeWindow(id); });
    el.querySelector(".win-btn.min").addEventListener("click", (e) => { e.stopPropagation(); minimizeWindow(id); });
    el.querySelector(".win-btn.max").addEventListener("click", (e) => { e.stopPropagation(); toggleMaximize(id); });
    el.querySelector(".win-titlebar").addEventListener("dblclick", (e) => {
      if (e.target.closest(".win-controls")) return;
      toggleMaximize(id);
    });
    el.addEventListener("mousedown", () => focusWindow(id));
    makeDraggable(el, id);
    if (opts.resizable !== false) makeResizable(el, id);

    addTaskbarEntry(id);
    focusWindow(id);
    return id;
  }

  function closeWindow(id) {
    const w = windows[id];
    if (!w) return;
    if (w.meta.onClose) { try { w.meta.onClose(); } catch (e) {} }
    w.el.remove();
    delete windows[id];
    removeTaskbarEntry(id);
    if (activeId === id) {
      const rest = Object.keys(windows);
      activeId = rest.length ? rest[rest.length - 1] : null;
      if (activeId) focusWindow(activeId);
    }
  }

  function focusWindow(id) {
    const w = windows[id];
    if (!w) return;
    if (w.meta.minimized) { w.meta.minimized = false; w.el.style.display = "flex"; }
    Object.values(windows).forEach(o => o.el.classList.remove("focused"));
    w.el.style.zIndex = ++zTop;
    w.el.classList.add("focused");
    activeId = id;
    syncTaskbarActive();
    if (w.meta.onFocus) { try { w.meta.onFocus(); } catch (e) {} }
  }

  function minimizeWindow(id) {
    const w = windows[id];
    if (!w) return;
    w.meta.minimized = true;
    w.el.style.display = "none";
    if (activeId === id) activeId = null;
    syncTaskbarActive();
  }

  function toggleMaximize(id) {
    const w = windows[id];
    if (!w) return;
    if (w.meta.maximized) {
      const r = w.meta.restore;
      w.el.style.left = r.x + "px"; w.el.style.top = r.y + "px";
      w.el.style.width = r.w + "px"; w.el.style.height = r.h + "px";
      w.el.classList.remove("maximized");
      w.meta.maximized = false;
    } else {
      w.meta.restore = {
        x: parseInt(w.el.style.left), y: parseInt(w.el.style.top),
        w: parseInt(w.el.style.width), h: parseInt(w.el.style.height)
      };
      w.el.style.left = "0px"; w.el.style.top = "0px";
      w.el.style.width = "100vw";
      w.el.style.height = `calc(100vh - var(--taskbar-h))`;
      w.el.classList.add("maximized");
      w.meta.maximized = true;
    }
    focusWindow(id);
  }

  function setTitle(id, title) {
    const w = windows[id];
    if (!w) return;
    w.meta.title = title;
    w.el.querySelector(".win-title-text").textContent = title;
    const tb = document.querySelector(`.taskbar-app[data-id="${id}"] .ta-label`);
    if (tb) tb.textContent = title;
  }

  function getBody(id) {
    const w = windows[id];
    return w ? w.el.querySelector(".win-body") : null;
  }

  function findByAppId(appId) {
    return Object.values(windows).find(w => w.meta.appId === appId);
  }

  function makeDraggable(el, id) {
    const handle = el.querySelector(".win-titlebar");
    let sx, sy, ox, oy, dragging = false;
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".win-controls")) return;
      if (windows[id].meta.maximized) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = parseInt(el.style.left); oy = parseInt(el.style.top);
      document.body.style.userSelect = "none";
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const nx = Math.max(-40, ox + (e.clientX - sx));
      const ny = Math.max(0, Math.min(window.innerHeight - 44, oy + (e.clientY - sy)));
      el.style.left = nx + "px"; el.style.top = ny + "px";
    });
    window.addEventListener("mouseup", () => { dragging = false; document.body.style.userSelect = ""; });
  }

  function makeResizable(el, id) {
    el.querySelectorAll(".win-resize").forEach(handle => {
      const dirs = [...handle.classList].filter(c => c !== "win-resize");
      const dir = dirs[0];
      let sx, sy, sw, sh, sl, st, active = false;
      handle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        if (windows[id].meta.maximized) return;
        active = true;
        sx = e.clientX; sy = e.clientY;
        sw = el.offsetWidth; sh = el.offsetHeight;
        sl = parseInt(el.style.left); st = parseInt(el.style.top);
        focusWindow(id);
      });
      window.addEventListener("mousemove", (e) => {
        if (!active) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (dir.includes("e")) el.style.width = Math.max(340, sw + dx) + "px";
        if (dir.includes("s")) el.style.height = Math.max(220, sh + dy) + "px";
        if (dir.includes("w")) {
          const nw = Math.max(340, sw - dx);
          el.style.width = nw + "px"; el.style.left = (sl + (sw - nw)) + "px";
        }
        if (dir.includes("n")) {
          const nh = Math.max(220, sh - dy);
          el.style.height = nh + "px"; el.style.top = (st + (sh - nh)) + "px";
        }
      });
      window.addEventListener("mouseup", () => active = false);
    });
  }

  function addTaskbarEntry(id) {
    const w = windows[id];
    const btn = document.createElement("button");
    btn.className = "taskbar-app";
    btn.dataset.id = id;
    btn.innerHTML = `<span class="ta-emoji">${w.meta.icon}</span><span class="ta-label">${w.meta.title}</span>`;
    btn.addEventListener("click", () => {
      if (activeId === id && !w.meta.minimized) minimizeWindow(id);
      else focusWindow(id);
    });
    taskbarApps().appendChild(btn);
  }

  function removeTaskbarEntry(id) {
    const btn = taskbarApps().querySelector(`.taskbar-app[data-id="${id}"]`);
    if (btn) btn.remove();
  }

  function syncTaskbarActive() {
    taskbarApps().querySelectorAll(".taskbar-app").forEach(b => {
      b.classList.toggle("active", b.dataset.id === activeId);
    });
  }

  function closeAll() {
    Object.keys(windows).forEach(closeWindow);
  }

  return {
    createWindow, closeWindow, focusWindow, minimizeWindow, toggleMaximize,
    setTitle, getBody, findByAppId, closeAll
  };
})();
