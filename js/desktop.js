/* ========================= Desktop / OS bootstrap ========================= */
(() => {
  const APPS = [
    { id: "fileExplorer", label: "File Explorer", icon: ICONS.explorer, launch: () => FileExplorerApp.open("/") },
    { id: "codeEditor", label: "Code Editor", icon: ICONS.code, launch: () => CodeEditorApp.open(null) },
    { id: "terminal", label: "Terminal", icon: ICONS.terminal, launch: () => TerminalApp.open() },
    { id: "browser", label: "Nimbus Browser", icon: ICONS.browser, launch: () => BrowserApp.open() },
    { id: "music", label: "Music", icon: ICONS.music, launch: () => MusicApp.open() },
    { id: "settings", label: "Settings", icon: ICONS.settings, launch: () => SettingsApp.open() },
  ];

  const DESKTOP_ICONS = [
    { label: "File Explorer", icon: ICONS.explorer, launch: () => FileExplorerApp.open("/") },
    { label: "Projects", icon: ICONS.code, launch: () => FileExplorerApp.open("/Projects") },
    { label: "Terminal", icon: ICONS.terminal, launch: () => TerminalApp.open() },
    { label: "Nimbus Browser", icon: ICONS.browser, launch: () => BrowserApp.open() },
    { label: "Music", icon: ICONS.music, launch: () => MusicApp.open() },
    { label: "Code Editor", icon: ICONS.code, launch: () => CodeEditorApp.open(null) },
    { label: "Settings", icon: ICONS.settings, launch: () => SettingsApp.open() },
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

  function renderDesktopIcons() {
    const wrap = document.getElementById("desktop-icons");
    wrap.innerHTML = "";
    DESKTOP_ICONS.forEach(icon => {
      const el = document.createElement("div");
      el.className = "dicon";
      el.innerHTML = `<span class="di-emoji">${icon.icon}</span><span class="di-label">${icon.label}</span>`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        wrap.querySelectorAll(".dicon").forEach(i => i.classList.remove("selected"));
        el.classList.add("selected");
      });
      el.addEventListener("dblclick", () => icon.launch());
      wrap.appendChild(el);
    });
  }

  function renderStartApps(filter) {
    const wrap = document.getElementById("start-apps");
    wrap.innerHTML = "";
    const f = (filter || "").toLowerCase();
    APPS.filter(a => a.label.toLowerCase().includes(f)).forEach(app => {
      const el = document.createElement("div");
      el.className = "start-app";
      el.innerHTML = `<span class="sa-emoji">${app.icon}</span><span class="sa-label">${app.label}</span>`;
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

  function wireDesktopDeselect() {
    document.getElementById("desktop").addEventListener("mousedown", (e) => {
      if (e.target.id === "desktop" || e.target.closest("#desktop-icons") === null) {
        if (!e.target.closest(".dicon")) {
          document.querySelectorAll(".dicon.selected").forEach(i => i.classList.remove("selected"));
        }
      }
    });
  }

  /* ---------------- context menu ---------------- */
  function wireContextMenu() {
    document.getElementById("desktop").addEventListener("contextmenu", (e) => {
      e.preventDefault();
      ContextMenu.show(e.clientX, e.clientY, [
        { label: "New Folder", icon: ICONS.folder, action: () => { const n = prompt("Folder name:", "New folder"); if (n) FS.mkdir("/Desktop/" + n); } },
        { label: "New File", icon: ICONS.code, action: () => { const n = prompt("File name:", "script.js"); if (n) { FS.writeFile("/Desktop/" + n, ""); CodeEditorApp.open("/Desktop/" + n); } } },
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

  function init() {
    SettingsApp.init();
    renderDesktopIcons();
    wireStart();
    wireDesktopDeselect();
    wireContextMenu();
    wireBoot();
    tickClock();
    setInterval(tickClock, 1000 * 15);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
