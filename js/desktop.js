/* ========================= Desktop / OS bootstrap ========================= */
(() => {
  const APPS = [
    { id: "fileExplorer", label: "File Explorer", icon: ICONS.explorer, shortcut: "Ctrl+Alt+E", launch: () => FileExplorerApp.open("/") },
    { id: "codex", label: "Codex", icon: ICONS.code, shortcut: "Ctrl+Alt+C", launch: () => CodexApp.open(null) },
    { id: "terminal", label: "Terminal", icon: ICONS.terminal, shortcut: "Ctrl+`", launch: () => TerminalApp.open() },
    { id: "browser", label: "Nimbus Browser", icon: ICONS.browser, shortcut: "Ctrl+Alt+B", launch: () => BrowserApp.open() },
    { id: "music", label: "Music", icon: ICONS.music, shortcut: "Ctrl+Alt+M", launch: () => MusicApp.open() },
    { id: "settings", label: "Settings", icon: ICONS.settings, shortcut: "Ctrl+,", launch: () => SettingsApp.open() },
  ];

  // Shortcuts that aren't tied to a single app tile, shown in Settings' shortcut list
  const EXTRA_SHORTCUTS = [
    { label: "Open launcher", shortcut: "Ctrl+Space" },
    { label: "Show desktop", shortcut: "Ctrl+Alt+D" },
    { label: "Close focused window", shortcut: "Ctrl+Alt+W" },
  ];

  window.NIMBUS_SHORTCUTS = [
    ...APPS.filter(a => a.shortcut).map(a => ({ label: "Open " + a.label, shortcut: a.shortcut })),
    ...EXTRA_SHORTCUTS,
  ];

  function fmtTime(d) {
    let h = d.getHours(), m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
  }
  function fmtDate(d) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function tickClock() {
    const now = new Date();
    document.getElementById("boot-time").textContent = fmtTime(now);
    document.getElementById("boot-date").textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    const tt = document.getElementById("tray-time");
    const td = document.getElementById("tray-date");
    if (tt) tt.textContent = fmtTime(now);
    if (td) td.textContent = fmtDate(now);
  }

  function renderStartApps(filter) {
    const wrap = document.getElementById("start-apps");
    wrap.innerHTML = "";
    const f = (filter || "").toLowerCase();
    APPS.filter(a => a.label.toLowerCase().includes(f)).forEach(app => {
      const el = document.createElement("div");
      el.className = "start-app";
      el.innerHTML = `<span class="sa-emoji">${app.icon}</span><span class="sa-label">${app.label}</span><span class="sa-shortcut">${app.shortcut || ""}</span>`;
      el.addEventListener("click", () => { app.launch(); closeStart(); });
      wrap.appendChild(el);
    });
  }

  function openStart() {
    document.getElementById("start-menu").classList.add("open");
    document.getElementById("launcher-backdrop").classList.add("open");
    const input = document.getElementById("start-search-input");
    input.value = ""; renderStartApps("");
    setTimeout(() => input.focus(), 60);
  }
  function closeStart() {
    document.getElementById("start-menu").classList.remove("open");
    document.getElementById("launcher-backdrop").classList.remove("open");
  }
  function toggleStart() {
    document.getElementById("start-menu").classList.contains("open") ? closeStart() : openStart();
  }

  function wireStart() {
    document.getElementById("start-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleStart(); });
    document.getElementById("start-search-input").addEventListener("input", (e) => renderStartApps(e.target.value));
    document.getElementById("taskbar-search-input").addEventListener("focus", openStart);
    document.getElementById("taskbar-search-input").addEventListener("input", (e) => renderStartApps(e.target.value));
    document.getElementById("start-power").addEventListener("click", () => {
      if (confirm("Restart NimbusOS? Open windows will close.")) {
        WM.closeAll();
        closeStart();
        document.getElementById("boot-screen").classList.remove("hidden");
      }
    });
    document.addEventListener("click", (e) => {
      const startMenu = document.getElementById("start-menu");
      if (!startMenu.contains(e.target) && e.target.id !== "start-btn" && !e.target.closest("#start-btn")) {
        closeStart();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeStart();
    });
  }

  /* ---------------- context menu ---------------- */
  function wireContextMenu() {
    document.getElementById("desktop").addEventListener("contextmenu", (e) => {
      e.preventDefault();
      ContextMenu.show(e.clientX, e.clientY, [
        { label: "New Folder", icon: ICONS.folder, action: () => { const n = prompt("Folder name:", "New folder"); if (n) FS.mkdir("/Desktop/" + n); } },
        { label: "New File", icon: ICONS.code, action: () => { const n = prompt("File name:", "script.js"); if (n) { FS.writeFile("/Desktop/" + n, ""); CodexApp.open("/Desktop/" + n); } } },
        "-",
        { label: "Open Terminal here", icon: ICONS.terminal, action: () => TerminalApp.open() },
        { label: "Personalize…", icon: ICONS.settings, action: () => SettingsApp.open() },
      ]);
    });
  }

  /* ---------------- boot ---------------- */
  function wireBoot() {
    document.getElementById("boot-enter").addEventListener("click", () => {
      document.getElementById("boot-screen").classList.add("hidden");
    });
    document.getElementById("boot-screen").addEventListener("dblclick", () => {
      document.getElementById("boot-screen").classList.add("hidden");
    });
  }

  /* ---------------- global keyboard shortcuts ---------------- */
  let minimizedByShowDesktop = null;

  function toggleShowDesktop() {
    if (minimizedByShowDesktop) {
      minimizedByShowDesktop.forEach(id => WM.focusWindow(id));
      minimizedByShowDesktop = null;
    } else {
      const ids = WM.minimizeAll();
      minimizedByShowDesktop = ids.length ? ids : null;
    }
  }

  function wireGlobalShortcuts() {
    document.addEventListener("keydown", (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();
      if (!ctrl) return;

      if (!alt && key === "`") { e.preventDefault(); TerminalApp.focusOrOpen(); return; }
      if (!alt && key === " ") { e.preventDefault(); toggleStart(); return; }
      if (!alt && key === ",") { e.preventDefault(); SettingsApp.open(); return; }
      if (alt && key === "e") { e.preventDefault(); FileExplorerApp.open("/"); return; }
      if (alt && key === "c") { e.preventDefault(); CodexApp.open(null); return; }
      if (alt && key === "b") { e.preventDefault(); BrowserApp.open(); return; }
      if (alt && key === "m") { e.preventDefault(); MusicApp.open(); return; }
      if (alt && key === "d") { e.preventDefault(); toggleShowDesktop(); return; }
      if (alt && key === "w") { e.preventDefault(); WM.closeFocused(); return; }
    });
  }

  function init() {
    SettingsApp.init();
    wireStart();
    wireContextMenu();
    wireBoot();
    wireGlobalShortcuts();
    tickClock();
    setInterval(tickClock, 1000 * 15);
  }

  document.addEventListener("DOMContentLoaded", init);
})();