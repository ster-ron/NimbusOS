/* ========================= Settings App ========================= */
const SettingsApp = (() => {
  const PREF_KEY = "nimbusos_prefs_v1";

  const ACCENTS = [
    { name: "Nimbus", a: "#6ee7d8", b: "#8b7fe8" },
    { name: "Sunset", a: "#ffb86e", b: "#ff6e8e" },
    { name: "Forest", a: "#7ee787", b: "#3fb68b" },
    { name: "Rose", a: "#ff9ecb", b: "#c96eff" },
    { name: "Ocean", a: "#6ec6ff", b: "#4f7bff" },
  ];
  const WALLPAPERS = [
    { name: "Nimbus", grad: "radial-gradient(ellipse 900px 600px at 15% 10%, rgba(139,127,232,.35), transparent 60%), radial-gradient(ellipse 900px 700px at 85% 90%, rgba(110,231,216,.22), transparent 60%), linear-gradient(160deg, #1c2150 0%, #12132b 55%, #0c0d20 100%)" },
    { name: "Dawn", grad: "radial-gradient(ellipse 900px 600px at 20% 20%, rgba(255,184,110,.30), transparent 60%), radial-gradient(ellipse 900px 700px at 80% 80%, rgba(255,110,142,.20), transparent 60%), linear-gradient(160deg, #2b1e3d 0%, #1a1330 55%, #0f0a1f 100%)" },
    { name: "Deep Sea", grad: "radial-gradient(ellipse 900px 600px at 20% 15%, rgba(110,198,255,.30), transparent 60%), radial-gradient(ellipse 900px 700px at 85% 85%, rgba(79,123,255,.22), transparent 60%), linear-gradient(160deg, #0e2a4a 0%, #0a1730 55%, #060c1c 100%)" },
    { name: "Forest", grad: "radial-gradient(ellipse 900px 600px at 15% 15%, rgba(126,231,135,.25), transparent 60%), radial-gradient(ellipse 900px 700px at 85% 85%, rgba(63,182,139,.22), transparent 60%), linear-gradient(160deg, #10331f 0%, #0b2016 55%, #071409 100%)" },
  ];

  const OS_MARK = `<svg viewBox="0 0 56 56" fill="none" width="34" height="34"><path d="M16 32c0-5 4-8 8-7 1-4 5-7 9-6 4 1 7 5 6 9 3 1 5 4 4 7-1 3-4 4-7 4H19c-3 0-6-2-6-5 0-2 1-3 3-2z" fill="url(#sg)"/><defs><linearGradient id="sg" x1="0" y1="0" x2="56" y2="56"><stop stop-color="#5EEAD4"/><stop offset="1" stop-color="#A78BFA"/></linearGradient></defs></svg>`;

  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch (e) { return {}; }
  }
  function savePrefs(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) {} }

  function applyPrefs(p) {
    const root = document.documentElement.style;
    const accent = ACCENTS.find(a => a.name === p.accent) || ACCENTS[0];
    root.setProperty("--accent", accent.a);
    root.setProperty("--accent-2", accent.b);
    const wp = WALLPAPERS.find(w => w.name === p.wallpaper) || WALLPAPERS[0];
    const desktop = document.getElementById("desktop");
    if (desktop) desktop.style.background = wp.grad;
    document.documentElement.classList.toggle("theme-light", p.theme === "light");
  }

  function init() {
    applyPrefs(loadPrefs());
  }

  function open() {
    const existing = WM.findByAppId("settings");
    if (existing) { WM.focusWindow(existing.meta.id); return existing.meta.id; }

    const prefs = loadPrefs();
    let section = "personalize";

    const root = document.createElement("div");
    root.className = "app-root";
    root.innerHTML = `<div class="set-root">
      <div class="set-nav">
        <div class="set-nav-item" data-s="personalize">${ICONS.palette} Personalize</div>
        <div class="set-nav-item" data-s="system">${ICONS.sliders} System</div>
        <div class="set-nav-item" data-s="about">${ICONS.info} About</div>
      </div>
      <div class="set-main"></div>
    </div>`;

    const main = root.querySelector(".set-main");

    function renderPersonalize() {
      const isLight = prefs.theme === "light";
      main.innerHTML = `
        <div class="set-section-title">Personalize</div>
        <div class="set-row">
          <div><div class="set-row-label">Appearance</div><div class="set-row-sub">Switch NimbusOS between dark and light chrome</div></div>
          <div class="appearance-switch">
            <button class="app-btn ${!isLight ? "primary" : ""}" data-theme="dark">${ICONS.moon} Dark</button>
            <button class="app-btn ${isLight ? "primary" : ""}" data-theme="light">${ICONS.sun} Light</button>
          </div>
        </div>
        <div class="set-row">
          <div><div class="set-row-label">Accent color</div><div class="set-row-sub">Used across the taskbar, start menu and highlights</div></div>
          <div class="swatches">${ACCENTS.map(a => `<div class="swatch ${prefs.accent === a.name || (!prefs.accent && a.name === "Nimbus") ? "active" : ""}" data-accent="${a.name}" style="background:linear-gradient(135deg,${a.a},${a.b})" title="${a.name}"></div>`).join("")}</div>
        </div>
        <div class="set-row" style="align-items:flex-start;">
          <div><div class="set-row-label">Wallpaper</div><div class="set-row-sub">Choose a desktop background</div></div>
          <div class="wallpapers">${WALLPAPERS.map(w => `<div class="wp-thumb ${prefs.wallpaper === w.name || (!prefs.wallpaper && w.name === "Nimbus") ? "active" : ""}" data-wallpaper="${w.name}" style="background-image:${w.grad}" title="${w.name}"></div>`).join("")}</div>

        </div>
      `;
      main.querySelectorAll("[data-theme]").forEach(el => el.addEventListener("click", () => {
        prefs.theme = el.dataset.theme; savePrefs(prefs); applyPrefs(prefs); renderPersonalize();
      }));
      main.querySelectorAll("[data-accent]").forEach(el => el.addEventListener("click", () => {
        prefs.accent = el.dataset.accent; savePrefs(prefs); applyPrefs(prefs); renderPersonalize();
      }));
      main.querySelectorAll("[data-wallpaper]").forEach(el => el.addEventListener("click", () => {
        prefs.wallpaper = el.dataset.wallpaper; savePrefs(prefs); applyPrefs(prefs); renderPersonalize();
      }));
    }

    function renderSystem() {
      main.innerHTML = `
        <div class="set-section-title">System</div>
        <div class="set-row">
          <div><div class="set-row-label">Reduce motion</div><div class="set-row-sub">Slows/removes drifting cloud animation</div></div>
          <div class="toggle ${prefs.reduceMotion ? "on" : ""}" data-act="motion"><div class="knob"></div></div>
        </div>
        <div class="set-row">
          <div><div class="set-row-label">Reset filesystem</div><div class="set-row-sub">Restore Documents, Pictures, Downloads to defaults</div></div>
          <button class="app-btn" data-act="reset-fs">Reset</button>
        </div>
        <div class="set-row">
          <div><div class="set-row-label">Storage used</div><div class="set-row-sub" data-act="storage-size">calculating…</div></div>
        </div>
      `;
      try {
        const bytes = new Blob([localStorage.getItem("nimbusos_fs_v1") || ""]).size;
        main.querySelector('[data-act="storage-size"]').textContent = `${(bytes / 1024).toFixed(1)} KB in browser localStorage`;
      } catch (e) {}
      main.querySelector('[data-act="motion"]').addEventListener("click", (el) => {
        prefs.reduceMotion = !prefs.reduceMotion; savePrefs(prefs);
        document.querySelectorAll(".cloud").forEach(c => c.style.animationPlayState = prefs.reduceMotion ? "paused" : "running");
        renderSystem();
      });
      main.querySelector('[data-act="reset-fs"]').addEventListener("click", () => {
        if (confirm("Reset the virtual filesystem? This deletes any files you've created.")) {
          FS.reset(); renderSystem();
        }
      });
    }

    function renderAbout() {
      main.innerHTML = `
        <div class="set-section-title">About NimbusOS</div>
        <div class="about-card">
          <div>${OS_MARK}</div>
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--panel-text);">NimbusOS — Web Edition</div>
            <div style="font-size:12px;color:var(--panel-text-dim);margin-top:2px;">Version 1.0 · Runs entirely in your browser</div>
          </div>
        </div>
        <div style="margin-top:16px;font-size:12.5px;color:var(--panel-text-dim);line-height:1.7;">
          NimbusOS is a self-contained desktop environment built with plain HTML, CSS and JavaScript.<br>
          Everything — the filesystem, your settings, your documents — lives in this browser's localStorage,
          so it stays put between visits on this device, but doesn't sync anywhere else.
        </div>
      `;
    }

    function renderSection() {
      root.querySelectorAll(".set-nav-item").forEach(el => el.classList.toggle("active", el.dataset.s === section));
      if (section === "personalize") renderPersonalize();
      else if (section === "system") renderSystem();
      else renderAbout();
    }

    root.querySelectorAll(".set-nav-item").forEach(el => el.addEventListener("click", () => { section = el.dataset.s; renderSection(); }));
    renderSection();

    return WM.createWindow({
      appId: "settings", title: "Settings", icon: ICONS.settings,
      width: 620, height: 460, content: root
    });
  }

  return { open, init, applyPrefs, loadPrefs, ACCENTS, WALLPAPERS };
})();
