/* ========================= Settings App ========================= */
const SettingsApp = (() => {
  const PREF_KEY = "nimbusos_prefs_v1";

  const ACCENTS = [
    { name: "Nimbus", a: "#6ee7d8", b: "#8b7fe8" },
    { name: "Sunset", a: "#ffb86e", b: "#ff6e8e" },
    { name: "Forest", a: "#7ee787", b: "#3fb68b" },
    { name: "Rose", a: "#ff9ecb", b: "#c96eff" },
    { name: "Ocean", a: "#6ec6ff", b: "#4f7bff" },
    { name: "Amber", a: "#fde68a", b: "#f59e0b" },
    { name: "Mint", a: "#6ee7b7", b: "#10b981" },
    { name: "Coral", a: "#fca5a5", b: "#ef4444" },
    { name: "Indigo", a: "#a5b4fc", b: "#6366f1" },
    { name: "Lime", a: "#d9f99d", b: "#84cc16" },
  ];

  const WALLPAPERS = [
    { name: "Nimbus", grad: "radial-gradient(ellipse 900px 600px at 15% 10%, rgba(139,127,232,.35), transparent 60%), radial-gradient(ellipse 900px 700px at 85% 90%, rgba(110,231,216,.22), transparent 60%), linear-gradient(160deg, #1c2150 0%, #12132b 55%, #0c0d20 100%)" },
    { name: "Dawn", grad: "radial-gradient(ellipse 900px 600px at 20% 20%, rgba(255,184,110,.30), transparent 60%), radial-gradient(ellipse 900px 700px at 80% 80%, rgba(255,110,142,.20), transparent 60%), linear-gradient(160deg, #2b1e3d 0%, #1a1330 55%, #0f0a1f 100%)" },
    { name: "Deep Sea", grad: "radial-gradient(ellipse 900px 600px at 20% 15%, rgba(110,198,255,.30), transparent 60%), radial-gradient(ellipse 900px 700px at 85% 85%, rgba(79,123,255,.22), transparent 60%), linear-gradient(160deg, #0e2a4a 0%, #0a1730 55%, #060c1c 100%)" },
    { name: "Forest", grad: "radial-gradient(ellipse 900px 600px at 15% 15%, rgba(126,231,135,.25), transparent 60%), radial-gradient(ellipse 900px 700px at 85% 85%, rgba(63,182,139,.22), transparent 60%), linear-gradient(160deg, #10331f 0%, #0b2016 55%, #071409 100%)" },
    { name: "Midnight", grad: "radial-gradient(ellipse 900px 600px at 20% 15%, rgba(99,102,241,.18), transparent 60%), radial-gradient(ellipse 900px 700px at 80% 85%, rgba(51,65,85,.30), transparent 60%), linear-gradient(160deg, #0a0b1a 0%, #05060f 55%, #020204 100%)" },
    { name: "Ember", grad: "radial-gradient(ellipse 900px 600px at 20% 15%, rgba(251,191,36,.22), transparent 60%), radial-gradient(ellipse 900px 700px at 85% 85%, rgba(248,113,113,.18), transparent 60%), linear-gradient(160deg, #2b1710 0%, #1a0f0a 55%, #0f0805 100%)" },
    { name: "Lavender", grad: "radial-gradient(ellipse 900px 600px at 20% 15%, rgba(216,180,254,.25), transparent 60%), radial-gradient(ellipse 900px 700px at 85% 85%, rgba(244,114,182,.18), transparent 60%), linear-gradient(160deg, #241a33 0%, #170f22 55%, #0d0815 100%)" },
    { name: "Slate", grad: "radial-gradient(ellipse 900px 600px at 20% 15%, rgba(148,163,184,.18), transparent 60%), radial-gradient(ellipse 900px 700px at 85% 85%, rgba(100,116,139,.16), transparent 60%), linear-gradient(160deg, #1a2029 0%, #11151c 55%, #090b10 100%)" },
  ];

  // "Nimbus" pairs Space Grotesk (headings) with Manrope (body) — the crafted
  // default look. Every other option uses one consistent family for both.
  const UI_FONTS = [
    { name: "Nimbus", display: "'Space Grotesk', system-ui, sans-serif", body: "'Manrope', system-ui, sans-serif", google: ["Space Grotesk", "Manrope"] },
    { name: "Inter", display: "'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", google: ["Inter"] },
    { name: "Poppins", display: "'Poppins', system-ui, sans-serif", body: "'Poppins', system-ui, sans-serif", google: ["Poppins"] },
    { name: "System", display: "system-ui, -apple-system, sans-serif", body: "system-ui, -apple-system, sans-serif", google: [] },
  ];

  const CODE_FONTS = [
    { name: "JetBrains Mono", stack: "'JetBrains Mono', monospace", google: ["JetBrains Mono"] },
    { name: "Fira Code", stack: "'Fira Code', monospace", google: ["Fira Code"] },
    { name: "Source Code Pro", stack: "'Source Code Pro', monospace", google: ["Source Code Pro"] },
    { name: "IBM Plex Mono", stack: "'IBM Plex Mono', monospace", google: ["IBM Plex Mono"] },
  ];

  // fonts already present in index.html's base <link> — no need to fetch again
  const PRELOADED_FONTS = new Set(["Space Grotesk", "Manrope", "JetBrains Mono"]);
  const GOOGLE_FONT_QUERY = {
    "Inter": "Inter:wght@400;500;600;700;800",
    "Poppins": "Poppins:wght@400;500;600;700",
    "Fira Code": "Fira+Code:wght@400;500;600",
    "Source Code Pro": "Source+Code+Pro:wght@400;500;600",
    "IBM Plex Mono": "IBM+Plex+Mono:wght@400;500;600",
  };
  function ensureFontsLoaded(names) {
    const need = (names || []).filter(n => GOOGLE_FONT_QUERY[n] && !PRELOADED_FONTS.has(n));
    if (need.length === 0) return;
    const query = need.map(n => `family=${GOOGLE_FONT_QUERY[n]}`).join("&");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
    document.head.appendChild(link);
    need.forEach(n => PRELOADED_FONTS.add(n));
  }

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

    const uiFont = UI_FONTS.find(f => f.name === p.uiFont) || UI_FONTS[0];
    ensureFontsLoaded(uiFont.google);
    root.setProperty("--font-display", uiFont.display);
    root.setProperty("--font-body", uiFont.body);

    const codeFont = CODE_FONTS.find(f => f.name === p.codeFont) || CODE_FONTS[0];
    ensureFontsLoaded(codeFont.google);
    root.setProperty("--font-mono", codeFont.stack);
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
        <div class="set-nav-item" data-s="device">${ICONS.device} Device</div>
        <div class="set-nav-item" data-s="about">${ICONS.info} About</div>
      </div>
      <div class="set-main"></div>
    </div>`;

    const main = root.querySelector(".set-main");

    function renderPersonalize() {
      const isLight = prefs.theme === "light";
      const activeUiFont = prefs.uiFont || "Nimbus";
      const activeCodeFont = prefs.codeFont || "JetBrains Mono";
      main.innerHTML = `
        <div class="set-section-title">Personalize</div>
        <div class="set-row">
          <div><div class="set-row-label">Appearance</div><div class="set-row-sub">Switch NimbusOS between dark and light chrome</div></div>
          <div class="appearance-switch">
            <button class="app-btn ${!isLight ? "primary" : ""}" data-theme="dark">${ICONS.moon} Dark</button>
            <button class="app-btn ${isLight ? "primary" : ""}" data-theme="light">${ICONS.sun} Light</button>
          </div>
        </div>
        <div class="set-row" style="align-items:flex-start;">
          <div><div class="set-row-label">Accent color</div><div class="set-row-sub">Used across the taskbar, start menu and highlights</div></div>
          <div class="swatches">${ACCENTS.map(a => `<div class="swatch ${prefs.accent === a.name || (!prefs.accent && a.name === "Nimbus") ? "active" : ""}" data-accent="${a.name}" style="background:linear-gradient(135deg,${a.a},${a.b})" title="${a.name}"></div>`).join("")}</div>
        </div>
        <div class="set-row" style="align-items:flex-start;">
          <div><div class="set-row-label">UI Font</div><div class="set-row-sub">Headings and general interface text</div></div>
          <div class="font-options">${UI_FONTS.map(f => `<div class="font-option ${activeUiFont === f.name ? "active" : ""}" data-uifont="${f.name}" style="font-family:${f.display}">${f.name}</div>`).join("")}</div>
        </div>
        <div class="set-row" style="align-items:flex-start;">
          <div><div class="set-row-label">Code Font</div><div class="set-row-sub">Used in Codex and Terminal</div></div>
          <div class="font-options">${CODE_FONTS.map(f => `<div class="font-option ${activeCodeFont === f.name ? "active" : ""}" data-codefont="${f.name}" style="font-family:${f.stack}">${f.name}</div>`).join("")}</div>
        </div>
        <div class="set-row" style="align-items:flex-start;border-bottom:none;">
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
      main.querySelectorAll("[data-uifont]").forEach(el => el.addEventListener("click", () => {
        prefs.uiFont = el.dataset.uifont; savePrefs(prefs); applyPrefs(prefs); renderPersonalize();
      }));
      main.querySelectorAll("[data-codefont]").forEach(el => el.addEventListener("click", () => {
        prefs.codeFont = el.dataset.codefont; savePrefs(prefs); applyPrefs(prefs); renderPersonalize();
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
          <div><div class="set-row-label">Reset filesystem</div><div class="set-row-sub">Restore Desktop, Projects, Documents, Downloads to defaults</div></div>
          <button class="app-btn" data-act="reset-fs">Reset</button>
        </div>
        <div class="set-row">
          <div><div class="set-row-label">Storage used</div><div class="set-row-sub" data-act="storage-size">calculating…</div></div>
        </div>
        <div class="set-row" style="align-items:flex-start;flex-direction:column;gap:10px;border-bottom:none;">
          <div class="set-row-label">Keyboard shortcuts</div>
          <div class="shortcut-list">
            ${(window.NIMBUS_SHORTCUTS || []).map(s => `<div class="shortcut-row"><span>${s.label}</span><span class="kbd">${s.shortcut}</span></div>`).join("")}
          </div>
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

    function getGPUInfo() {
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (!gl) return null;
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        return renderer || null;
      } catch (e) { return null; }
    }

    function detectBrowser() {
      const ua = navigator.userAgent;
      if (ua.includes("Edg/")) return "Microsoft Edge";
      if (ua.includes("OPR/")) return "Opera";
      if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
      if (ua.includes("Firefox/")) return "Firefox";
      if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
      return "Unknown browser";
    }

    function detectPlatform() {
      if (navigator.userAgentData && navigator.userAgentData.platform) return navigator.userAgentData.platform;
      return navigator.platform || "Unknown";
    }

    function renderDevice() {
      const gpu = getGPUInfo();
      const rows = [
        { label: "Platform", value: detectPlatform() },
        { label: "Browser", value: detectBrowser() },
        { label: "Logical CPU cores", value: navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : "Not reported" },
        { label: "Approx. memory", value: navigator.deviceMemory ? `~${navigator.deviceMemory} GB (rounded, capped by browser)` : "Not reported by this browser" },
        { label: "GPU renderer", value: gpu || "Not available" },
        { label: "Screen resolution", value: `${screen.width}×${screen.height} @ ${window.devicePixelRatio}x` },
        { label: "Language", value: navigator.language || "Unknown" },
        { label: "Timezone", value: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown" },
        { label: "App storage used", value: "Calculating…" },
      ];

      main.innerHTML = `
        <div class="set-section-title">Device</div>
        <div class="device-note">
          Browsers don't expose your device's exact model, CPU name, RAM size, or whether you have an
          SSD or HDD — that's blocked on purpose, across every major browser, to stop websites from
          fingerprinting your hardware. Below is only what your browser is willing to report, and it's
          often approximate.
        </div>
        <div class="shortcut-list" data-act="device-rows">
          ${rows.map(r => `<div class="shortcut-row"><span>${r.label}</span><span class="kbd" data-row="${r.label}" title="${String(r.value).replace(/"/g, "&quot;")}">${r.value}</span></div>`).join("")}
        </div>
      `;

      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(({ usage, quota }) => {
          const el = main.querySelector('[data-row="App storage used"]');
          if (!el) return;
          const usedMB = ((usage || 0) / (1024 * 1024)).toFixed(1);
          const quotaMB = quota ? (quota / (1024 * 1024)).toFixed(0) : "?";
          el.textContent = `${usedMB} MB of ~${quotaMB} MB browser quota`;
        }).catch(() => {
          const el = main.querySelector('[data-row="App storage used"]');
          if (el) el.textContent = "Not available";
        });
      } else {
        const el = main.querySelector('[data-row="App storage used"]');
        if (el) el.textContent = "Not available";
      }
    }

    function renderAbout() {
      main.innerHTML = `
        <div class="set-section-title">About NimbusOS</div>
        <div class="about-card">
          <div>${OS_MARK}</div>
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--panel-text);">NimbusOS — Web Edition</div>
            <div style="font-size:12px;color:var(--panel-text-dim);margin-top:2px;">Version 2.0 · Runs entirely in your browser</div>
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
      else if (section === "device") renderDevice();
      else renderAbout();
    }

    root.querySelectorAll(".set-nav-item").forEach(el => el.addEventListener("click", () => { section = el.dataset.s; renderSection(); }));
    renderSection();

    return WM.createWindow({
      appId: "settings", title: "Settings", icon: ICONS.settings,
      width: 640, height: 540, content: root
    });
  }

  return { open, init, applyPrefs, loadPrefs, ACCENTS, WALLPAPERS, UI_FONTS, CODE_FONTS };
})();