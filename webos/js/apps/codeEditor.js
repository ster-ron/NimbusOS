/* ========================= Code Editor App =========================
   Syntax-highlighted editor (CodeMirror, loaded from CDN) with a Run
   button: .js files execute in a sandbox with console output captured
   below the editor; .html files render live in a preview pane.
   Falls back to a plain textarea if CodeMirror didn't load (e.g. offline).
======================================================================= */
const CodeEditorApp = (() => {

  const MODE_BY_EXT = {
    js: "javascript", json: "application/json", jsx: "javascript",
    html: "htmlmixed", htm: "htmlmixed", xml: "xml", svg: "xml",
    css: "css", md: "markdown", markdown: "markdown",
    py: "python", sh: "shell", txt: null,
  };

  function extOf(path) { return (path.split(".").pop() || "").toLowerCase(); }
  function isRunnable(path) { const e = extOf(path); return e === "js" || e === "html" || e === "htm"; }

  function open(path) {
    if (path) {
      const existing = WM.findByAppId("codeEditor:" + path);
      if (existing) { WM.focusWindow(existing.meta.id); return existing.meta.id; }
    }

    let currentPath = path || null;
    let dirty = false;
    let panelMode = null; // null | "console" | "preview"

    const root = document.createElement("div");
    root.className = "app-root ce-root";
    root.innerHTML = `
      <div class="app-toolbar">
        <button class="app-btn primary" data-act="save">${ICONS.save} Save</button>
        <button class="app-btn" data-act="save-as">Save As…</button>
        <button class="app-btn" data-act="run" style="display:none;">${ICONS.play} Run</button>
        <span style="flex:1"></span>
        <span class="ce-mode-label" data-act="mode-label"></span>
        <span style="font-size:11.5px;color:var(--panel-text-dim);" data-act="path-label"></span>
      </div>
      <div class="ce-editor-wrap"></div>
      <div class="ce-panel" data-act="panel" style="display:none;">
        <div class="ce-panel-head">
          <span data-act="panel-title">Console</span>
          <button class="app-btn" data-act="panel-close">Close</button>
        </div>
        <div class="ce-panel-body" data-act="panel-body"></div>
      </div>
      <div class="te-status" data-act="status">Ready</div>
    `;

    const editorWrap = root.querySelector(".ce-editor-wrap");
    const runBtn = root.querySelector('[data-act="run"]');
    const modeLabel = root.querySelector('[data-act="mode-label"]');
    const pathLabel = root.querySelector('[data-act="path-label"]');
    const status = root.querySelector('[data-act="status"]');
    const panel = root.querySelector('[data-act="panel"]');
    const panelTitle = root.querySelector('[data-act="panel-title"]');
    const panelBody = root.querySelector('[data-act="panel-body"]');

    const initialContent = currentPath ? (FS.readFile(currentPath) || "") : "";

    // ---- build editor: CodeMirror if available, otherwise a plain textarea ----
    let cm = null, textarea = null, resizeObserver = null;
    const useCM = typeof window.CodeMirror !== "undefined";

    if (useCM) {
      cm = CodeMirror(editorWrap, {
        value: initialContent,
        lineNumbers: true,
        theme: "nimbus",
        matchBrackets: true,
        autoCloseBrackets: true,
        styleActiveLine: true,
        tabSize: 2,
        indentUnit: 2,
        mode: currentPath ? (MODE_BY_EXT[extOf(currentPath)] || null) : null,
        viewportMargin: Infinity,
      });
      cm.on("change", () => { dirty = true; onContentChanged(); });
      resizeObserver = new ResizeObserver(() => cm.refresh());
      resizeObserver.observe(root);
    } else {
      textarea = document.createElement("textarea");
      textarea.className = "te-textarea";
      textarea.spellcheck = false;
      textarea.placeholder = "Start typing…";
      textarea.value = initialContent;
      textarea.style.cssText = "flex:1;background:transparent;";
      editorWrap.style.cssText = "display:flex;flex:1;";
      editorWrap.appendChild(textarea);
      textarea.addEventListener("input", () => { dirty = true; onContentChanged(); });
    }

    function getValue() { return cm ? cm.getValue() : textarea.value; }
    function setMode(path) {
      const mode = path ? MODE_BY_EXT[extOf(path)] : null;
      if (cm) cm.setOption("mode", mode || null);
      modeLabel.textContent = path ? (extOf(path).toUpperCase() || "TEXT") : "";
      runBtn.style.display = (path && isRunnable(path)) ? "flex" : "none";
    }

    const winId = WM.createWindow({
      appId: "codeEditor:" + (path || ("untitled-" + Date.now())),
      title: currentPath ? currentPath.split("/").pop() : "Untitled — Code Editor",
      icon: ICONS.code,
      width: 660, height: 500,
      content: root,
      onFocus: () => { if (cm) setTimeout(() => cm.focus(), 30); },
      onClose: () => { if (resizeObserver) resizeObserver.disconnect(); }
    });

    function refreshTitle() {
      const name = currentPath ? currentPath.split("/").pop() : "Untitled";
      WM.setTitle(winId, (dirty ? "• " : "") + name + " — Code Editor");
      pathLabel.textContent = currentPath || "not saved";
    }
    function onContentChanged() {
      status.textContent = `${getValue().length} characters`;
      refreshTitle();
    }

    setMode(currentPath);
    refreshTitle();
    onContentChanged();

    function saveAs() {
      const suggestion = currentPath || "/Projects/untitled.js";
      const p = prompt("Save as (full path):", suggestion);
      if (!p) return;
      if (FS.writeFile(p, getValue())) {
        currentPath = p; dirty = false; refreshTitle(); setMode(currentPath);
        status.textContent = "Saved to " + p;
      } else {
        status.textContent = "Could not save — check the path";
      }
    }

    root.querySelector('[data-act="save"]').addEventListener("click", () => {
      if (!currentPath) return saveAs();
      FS.writeFile(currentPath, getValue());
      dirty = false; refreshTitle();
      status.textContent = "Saved";
    });
    root.querySelector('[data-act="save-as"]').addEventListener("click", saveAs);

    /* ---------------- Run ---------------- */
    function openPanel(mode) {
      panelMode = mode;
      panel.style.display = "flex";
      panelTitle.textContent = mode === "console" ? "Console" : "Preview";
      if (cm) setTimeout(() => cm.refresh(), 0);
    }
    function closePanel() {
      panel.style.display = "none";
      panelBody.innerHTML = "";
      panelMode = null;
      if (cm) setTimeout(() => cm.refresh(), 0);
    }
    root.querySelector('[data-act="panel-close"]').addEventListener("click", closePanel);

    function runJS() {
      openPanel("console");
      panelBody.innerHTML = "";
      panelBody.className = "ce-panel-body ce-console";
      const print = (text, cls) => {
        const line = document.createElement("div");
        line.className = "ce-console-line" + (cls ? " " + cls : "");
        line.textContent = text;
        panelBody.appendChild(line);
      };
      const fmt = (a) => a.map(v => {
        try { return typeof v === "string" ? v : JSON.stringify(v); } catch (e) { return String(v); }
      }).join(" ");
      const sandboxConsole = {
        log: (...a) => print(fmt(a)),
        info: (...a) => print(fmt(a)),
        warn: (...a) => print(fmt(a), "ce-warn"),
        error: (...a) => print(fmt(a), "ce-error"),
      };
      try {
        const fn = new Function("console", getValue());
        fn(sandboxConsole);
        if (!panelBody.children.length) print("(ran with no output)", "ce-dim");
      } catch (e) {
        print("Uncaught " + e.message, "ce-error");
      }
    }

    function runHTML() {
      openPanel("preview");
      panelBody.className = "ce-panel-body ce-preview";
      panelBody.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.className = "ce-preview-frame";
      iframe.sandbox = "allow-scripts allow-modals";
      panelBody.appendChild(iframe);
      iframe.srcdoc = getValue();
    }

    runBtn.addEventListener("click", () => {
      const ext = currentPath ? extOf(currentPath) : "js";
      if (ext === "html" || ext === "htm") runHTML();
      else runJS();
    });

    // Ctrl/Cmd+S save, Ctrl/Cmd+Enter run
    root.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        root.querySelector('[data-act="save"]').click();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && currentPath && isRunnable(currentPath)) {
        e.preventDefault();
        runBtn.click();
      }
    });

    setTimeout(() => { if (cm) { cm.refresh(); cm.focus(); } else textarea.focus(); }, 60);
    return winId;
  }

  return { open };
})();
