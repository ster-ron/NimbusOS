/* ========================= Browser App ========================= */
const BrowserApp = (() => {

  const HOME_LINKS = [
    { label: "Wikipedia", url: "https://www.wikipedia.org" },
    { label: "MDN Web Docs", url: "https://developer.mozilla.org" },
    { label: "Anthropic", url: "https://www.anthropic.com" },
    { label: "Hacker News", url: "https://news.ycombinator.com" },
  ];

  function open(initialUrl) {
    const root = document.createElement("div");
    root.className = "br-root";
    root.innerHTML = `
      <div class="br-bar">
        <button class="app-btn" data-act="back">←</button>
        <button class="app-btn" data-act="fwd">→</button>
        <button class="app-btn" data-act="reload">⟳</button>
        <button class="app-btn" data-act="home">🏠</button>
        <input class="app-input br-url" placeholder="Search the web or enter a URL" value="${initialUrl || ""}">
        <button class="app-btn primary" data-act="go">Go</button>
      </div>
      <div class="br-frame-wrap"></div>
    `;

    const wrap = root.querySelector(".br-frame-wrap");
    const urlInput = root.querySelector(".br-url");
    const history = [];
    let histIdx = -1;

    function showHome() {
      wrap.innerHTML = `<div class="br-home">
        <div class="bh-logo">☁️</div>
        <div style="font-size:16px;font-weight:700;color:var(--panel-text);">Nimbus Browser</div>
        <div style="font-size:12.5px;">Enter a URL above to browse the web</div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:center;">
          ${HOME_LINKS.map(l => `<button class="app-btn" data-url="${l.url}">${l.label}</button>`).join("")}
        </div>
      </div>`;
      wrap.querySelectorAll("[data-url]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.url)));
      urlInput.value = "";
    }

    function normalizeUrl(v) {
      v = v.trim();
      if (!v) return null;
      if (/^https?:\/\//i.test(v)) return v;
      if (/^[\w-]+(\.[\w-]+)+/.test(v) && !v.includes(" ")) return "https://" + v;
      return "https://www.google.com/search?q=" + encodeURIComponent(v) + "&igu=1";
    }

    function navigate(raw, pushHistory = true) {
      const url = normalizeUrl(raw);
      if (!url) return showHome();
      urlInput.value = url;
      wrap.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.referrerPolicy = "no-referrer";
      let blocked = false;
      const failTimer = setTimeout(() => {
        // best-effort detection; many sites block framing via CSP with no JS signal,
        // so we just leave a helpful fallback the user can dismiss by navigating again
      }, 4000);
      iframe.addEventListener("error", () => { blocked = true; showBlocked(url); });
      wrap.appendChild(iframe);
      if (pushHistory) {
        history.splice(histIdx + 1);
        history.push(url); histIdx = history.length - 1;
      }
    }

    function showBlocked(url) {
      wrap.innerHTML = `<div class="br-blocked">
        <div style="font-size:30px;">🚫</div>
        <div style="font-weight:700;color:var(--panel-text);">This site blocked embedding</div>
        <div>Some sites (like Google's main page) don't allow being shown inside another page.<br>Try opening it in a new tab instead.</div>
        <a class="app-btn" style="text-decoration:none;" href="${url}" target="_blank" rel="noopener">Open in new tab ↗</a>
      </div>`;
    }

    root.querySelector('[data-act="go"]').addEventListener("click", () => navigate(urlInput.value));
    urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") navigate(urlInput.value); });
    root.querySelector('[data-act="home"]').addEventListener("click", showHome);
    root.querySelector('[data-act="reload"]').addEventListener("click", () => histIdx >= 0 && navigate(history[histIdx], false));
    root.querySelector('[data-act="back"]').addEventListener("click", () => { if (histIdx > 0) { histIdx--; navigate(history[histIdx], false); } });
    root.querySelector('[data-act="fwd"]').addEventListener("click", () => { if (histIdx < history.length - 1) { histIdx++; navigate(history[histIdx], false); } });

    const winId = WM.createWindow({
      appId: "browser:" + Date.now(),
      title: "Nimbus Browser",
      icon: ICONS.browser,
      width: 760, height: 520,
      content: root
    });

    if (initialUrl) navigate(initialUrl); else showHome();
    return winId;
  }

  return { open };
})();
