/* ========================= File Explorer App ========================= */
const FileExplorerApp = (() => {

  const QUICK = [
    { label: "Desktop", path: "/Desktop", icon: ICONS.window },
    { label: "Projects", path: "/Projects", icon: ICONS.code },
    { label: "Documents", path: "/Documents", icon: ICONS.folder },
    { label: "Downloads", path: "/Downloads", icon: ICONS.folder },
    { label: "This PC", path: "/", icon: ICONS.explorer },
  ];

  function iconFor(node) {
    if (node.type === "dir") return ICONS.folder;
    const ext = (node.name.split(".").pop() || "").toLowerCase();
    if (["txt", "md"].includes(ext)) return ICONS.editor;
    if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) return ICONS.image;
    if (["js", "json", "css", "html"].includes(ext)) return ICONS.code;
    return ICONS.file;
  }

  function open(startPath) {
    let existing = WM.findByAppId("fileExplorer:" + (startPath || "/"));
    if (existing) { WM.focusWindow(existing.meta.id); return existing.meta.id; }

    let path = startPath || "/";
    let selected = null;

    const root = document.createElement("div");
    root.className = "app-root fe-body-wrap";
    root.innerHTML = `
      <div class="app-toolbar">
        <button class="app-btn" data-act="back">←</button>
        <button class="app-btn" data-act="up">↑</button>
        <input class="app-input" data-act="path" style="flex:1" value="${path}">
        <button class="app-btn" data-act="new-folder">${ICONS.add} New folder</button>
        <button class="app-btn" data-act="new-file">${ICONS.add} New file</button>
      </div>
      <div class="fe-body">
        <div class="fe-sidebar">${QUICK.map(q => `<div class="fe-sidebar-item" data-path="${q.path}"><span>${q.icon}</span><span>${q.label}</span></div>`).join("")}</div>
        <div class="fe-main"><div class="fe-grid"></div></div>
      </div>
    `;

    const winId = WM.createWindow({
      appId: "fileExplorer:" + (startPath || "/"),
      title: "File Explorer",
      icon: ICONS.explorer,
      width: 680, height: 460,
      content: root
    });

    const history = [path];
    let histIdx = 0;

    function render() {
      root.querySelector('[data-act="path"]').value = path;
      root.querySelectorAll(".fe-sidebar-item").forEach(el => el.classList.toggle("active", el.dataset.path === path));
      WM.setTitle(winId, path === "/" ? "This PC" : path.split("/").pop());

      const grid = root.querySelector(".fe-grid");
      const entries = FS.readDir(path);
      grid.innerHTML = "";
      if (!entries || entries.length === 0) {
        grid.innerHTML = `<div class="fe-empty">This folder is empty</div>`;
        return;
      }
      entries.forEach(node => {
        const item = document.createElement("div");
        item.className = "fe-item";
        item.innerHTML = `<span class="fi-emoji">${iconFor(node)}</span><span class="fi-label">${node.name}</span>`;
        item.addEventListener("click", (e) => {
          root.querySelectorAll(".fe-item").forEach(i => i.classList.remove("selected"));
          item.classList.add("selected");
          selected = node.name;
        });
        item.addEventListener("dblclick", () => {
          const newPath = (path === "/" ? "" : path) + "/" + node.name;
          if (node.type === "dir") { navigate(newPath); }
          else { CodeEditorApp.open(newPath); }
        });
        grid.appendChild(item);
      });
    }

    function navigate(p) {
      path = FS.normalize(p, path);
      history.splice(histIdx + 1);
      history.push(path); histIdx = history.length - 1;
      render();
    }

    root.querySelector('[data-act="back"]').addEventListener("click", () => {
      if (histIdx > 0) { histIdx--; path = history[histIdx]; render(); }
    });
    root.querySelector('[data-act="up"]').addEventListener("click", () => {
      if (path !== "/") navigate(path.split("/").slice(0, -1).join("/") || "/");
    });
    root.querySelector('[data-act="path"]').addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const p = e.target.value.trim();
        if (FS.isDir(p)) navigate(p);
        else render();
      }
    });
    root.querySelector('[data-act="new-folder"]').addEventListener("click", () => {
      const name = prompt("Folder name:", "New folder");
      if (name) { FS.mkdir((path === "/" ? "" : path) + "/" + name); render(); }
    });
    root.querySelector('[data-act="new-file"]').addEventListener("click", () => {
      const name = prompt("File name:", "script.js");
      if (name) { FS.writeFile((path === "/" ? "" : path) + "/" + name, ""); render(); CodeEditorApp.open((path === "/" ? "" : path) + "/" + name); }
    });
    root.querySelectorAll(".fe-sidebar-item").forEach(el => {
      el.addEventListener("click", () => navigate(el.dataset.path));
    });

    render();
    return winId;
  }

  return { open };
})();
