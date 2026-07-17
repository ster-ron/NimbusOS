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
        <button class="app-btn" data-act="delete" disabled>${ICONS.trash} Delete</button>
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

    root.tabIndex = 0;
    root.style.outline = "none";

    const history = [path];
    let histIdx = 0;
    const deleteBtn = root.querySelector('[data-act="delete"]');

    function selectedPath() {
      if (!selected) return null;
      return (path === "/" ? "" : path) + "/" + selected;
    }

    function setSelection(name) {
      selected = name;
      root.querySelectorAll(".fe-item").forEach(i => i.classList.toggle("selected", i.dataset.name === name));
      deleteBtn.disabled = !name;
    }

    function deleteNode(nodePath, nodeName) {
      if (!confirm(`Delete "${nodeName}"? This can't be undone.`)) return;
      if (FS.remove(nodePath)) {
        if (selected === nodeName) setSelection(null);
        render();
      } else {
        alert(`Couldn't delete "${nodeName}".`);
      }
    }

    function renameNode(nodePath, nodeName) {
      const newName = prompt("Rename to:", nodeName);
      if (!newName || newName === nodeName) return;
      if (!FS.rename(nodePath, newName)) alert(`Couldn't rename "${nodeName}".`);
      render();
    }

    function render() {
      root.querySelector('[data-act="path"]').value = path;
      root.querySelectorAll(".fe-sidebar-item").forEach(el => el.classList.toggle("active", el.dataset.path === path));
      WM.setTitle(winId, path === "/" ? "This PC" : path.split("/").pop());

      const grid = root.querySelector(".fe-grid");
      const entries = FS.readDir(path);
      grid.innerHTML = "";
      deleteBtn.disabled = !selected;
      if (!entries || entries.length === 0) {
        grid.innerHTML = `<div class="fe-empty">This folder is empty</div>`;
        return;
      }
      entries.forEach(node => {
        const nodePath = (path === "/" ? "" : path) + "/" + node.name;
        const item = document.createElement("div");
        item.className = "fe-item" + (selected === node.name ? " selected" : "");
        item.dataset.name = node.name;
        item.innerHTML = `<span class="fi-emoji">${iconFor(node)}</span><span class="fi-label">${node.name}</span>`;
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelection(node.name);
          root.focus();
        });
        item.addEventListener("dblclick", () => {
          if (node.type === "dir") { navigate(nodePath); }
          else { CodeEditorApp.open(nodePath); }
        });
        item.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelection(node.name);
          ContextMenu.show(e.clientX, e.clientY, [
            { label: "Open", icon: ICONS.file, action: () => (node.type === "dir" ? navigate(nodePath) : CodeEditorApp.open(nodePath)) },
            { label: "Rename", icon: ICONS.rename, action: () => renameNode(nodePath, node.name) },
            "-",
            { label: "Delete", icon: ICONS.trash, danger: true, action: () => deleteNode(nodePath, node.name) },
          ]);
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
    deleteBtn.addEventListener("click", () => {
      if (!selected) return;
      deleteNode(selectedPath(), selected);
    });
    root.querySelectorAll(".fe-sidebar-item").forEach(el => {
      el.addEventListener("click", () => navigate(el.dataset.path));
    });
    root.querySelector(".fe-main").addEventListener("click", (e) => {
      if (e.target.closest(".fe-item")) return;
      setSelection(null);
      root.focus();
    });
    root.querySelector(".fe-main").addEventListener("contextmenu", (e) => {
      if (e.target.closest(".fe-item")) return;
      e.preventDefault();
      ContextMenu.show(e.clientX, e.clientY, [
        { label: "New Folder", icon: ICONS.folder, action: () => { const n = prompt("Folder name:", "New folder"); if (n) { FS.mkdir((path === "/" ? "" : path) + "/" + n); render(); } } },
        { label: "New File", icon: ICONS.add, action: () => { const n = prompt("File name:", "script.js"); if (n) { FS.writeFile((path === "/" ? "" : path) + "/" + n, ""); render(); CodeEditorApp.open((path === "/" ? "" : path) + "/" + n); } } },
      ]);
    });
    root.addEventListener("keydown", (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selected && document.activeElement !== root.querySelector('[data-act="path"]')) {
        e.preventDefault();
        deleteNode(selectedPath(), selected);
      }
    });

    render();
    return winId;
  }

  return { open };
})();
