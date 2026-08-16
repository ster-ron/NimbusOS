/* ========================= File Explorer App =========================
   Breadcrumb navigation + a status bar make the current location and
   selection unambiguous. Right-click a file or folder for Rename, Move
   to…, Compress, Send to (download to your real device), and — for
   files — Open With…. Archives are handled with JSZip: Compress creates
   a real .zip inside the virtual filesystem, and double-clicking (or
   "Extract Here" on) a .zip unpacks it back into a folder.
========================================================================= */
const FileExplorerApp = (() => {

  const QUICK = [
    { label: "Desktop", path: "/Desktop", icon: ICONS.window },
    { label: "Projects", path: "/Projects", icon: ICONS.code },
    { label: "Documents", path: "/Documents", icon: ICONS.folder },
    { label: "Downloads", path: "/Downloads", icon: ICONS.folder },
    { label: "This PC", path: "/", icon: ICONS.explorer },
  ];

  function extOf(name) { return (name.split(".").pop() || "").toLowerCase(); }
  function isZip(name) { return extOf(name) === "zip"; }

  function iconFor(node) {
    if (node.type === "dir") return ICONS.folder;
    const ext = extOf(node.name);
    if (ext === "zip") return ICONS.archive;
    if (["txt", "md"].includes(ext)) return ICONS.editor;
    if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) return ICONS.image;
    if (["js", "json", "css", "html", "htm"].includes(ext)) return ICONS.code;
    return ICONS.file;
  }

  /* ---------------- zip / download helpers ---------------- */
  function addDirToZip(zip, dirPath, relBase) {
    const entries = FS.readDir(dirPath) || [];
    entries.forEach(e => {
      const full = (dirPath === "/" ? "" : dirPath) + "/" + e.name;
      const rel = relBase ? relBase + "/" + e.name : e.name;
      if (e.type === "dir") addDirToZip(zip, full, rel);
      else zip.file(rel, FS.readFile(full) || "");
    });
  }

  function base64ToBytes(base64) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function ensureParentDirs(filePath) {
    const parts = filePath.split("/").filter(Boolean);
    parts.pop();
    let acc = "";
    parts.forEach(p => { acc += "/" + p; if (!FS.exists(acc)) FS.mkdir(acc); });
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
      <div class="fe-breadcrumbs" data-act="breadcrumbs"></div>
      <div class="fe-body">
        <div class="fe-sidebar">${QUICK.map(q => `<div class="fe-sidebar-item" data-path="${q.path}"><span>${q.icon}</span><span>${q.label}</span></div>`).join("")}</div>
        <div class="fe-main"><div class="fe-grid"></div></div>
      </div>
      <div class="fe-statusbar" data-act="statusbar"></div>
    `;

    const winId = WM.createWindow({
      appId: "fileExplorer:" + (startPath || "/"),
      title: "File Explorer",
      icon: ICONS.explorer,
      width: 700, height: 480,
      content: root
    });

    root.tabIndex = 0;
    root.style.outline = "none";

    const history = [path];
    let histIdx = 0;
    const deleteBtn = root.querySelector('[data-act="delete"]');
    const statusbar = root.querySelector('[data-act="statusbar"]');

    function selectedPath() {
      if (!selected) return null;
      return (path === "/" ? "" : path) + "/" + selected;
    }
    function childPath(name) { return (path === "/" ? "" : path) + "/" + name; }

    function setSelection(name) {
      selected = name;
      root.querySelectorAll(".fe-item").forEach(i => i.classList.toggle("selected", i.dataset.name === name));
      deleteBtn.disabled = !name;
      updateStatusbar();
    }

    function updateStatusbar() {
      const count = (FS.readDir(path) || []).length;
      const countText = `${count} item${count === 1 ? "" : "s"}`;
      statusbar.innerHTML = selected
        ? `<span>${countText} · selected <strong>${selected}</strong></span><span class="fe-status-path">${selectedPath()}</span>`
        : `<span>${countText}</span><span class="fe-status-path">${path}</span>`;
    }

    function renderBreadcrumbs() {
      const bc = root.querySelector('[data-act="breadcrumbs"]');
      const segs = path === "/" ? [] : path.split("/").filter(Boolean);
      let acc = "";
      const parts = [{ label: "This PC", p: "/" }];
      segs.forEach(s => { acc += "/" + s; parts.push({ label: s, p: acc }); });
      bc.innerHTML = parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        return `<span class="fe-crumb${isLast ? " current" : ""}" data-path="${part.p}">${part.label}</span>` +
          (isLast ? "" : `<span class="fe-crumb-sep">›</span>`);
      }).join("");
      bc.querySelectorAll(".fe-crumb:not(.current)").forEach(el => el.addEventListener("click", () => navigate(el.dataset.path)));
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

    function moveToNode(nodePath, nodeName) {
      const dest = prompt("Move to (destination folder path):", path);
      if (!dest) return;
      const destPath = FS.normalize(dest, path);
      if (!FS.isDir(destPath)) { alert(`"${dest}" isn't a folder.`); return; }
      if (!FS.move(nodePath, destPath)) { alert(`Couldn't move "${nodeName}" there — a file with that name may already exist.`); return; }
      if (selected === nodeName) setSelection(null);
      render();
    }

    async function compressNode(nodePath, name, isDir) {
      if (typeof JSZip === "undefined") { alert("Compression isn't available right now (couldn't load JSZip — check your internet connection)."); return; }
      const zip = new JSZip();
      if (isDir) addDirToZip(zip, nodePath, "");
      else zip.file(name, FS.readFile(nodePath) || "");

      const baseName = isDir ? name : name.replace(/\.[^.]+$/, "");
      let zipName = baseName + ".zip";
      let destPath = childPath(zipName);
      let n = 1;
      while (FS.exists(destPath)) { zipName = `${baseName} (${n}).zip`; destPath = childPath(zipName); n++; }

      const base64 = await zip.generateAsync({ type: "base64" });
      FS.writeFile(destPath, base64);
      render();
    }

    async function downloadNode(nodePath, name, isDir) {
      if (isDir) {
        if (typeof JSZip === "undefined") { alert("Download isn't available right now (couldn't load JSZip — check your internet connection)."); return; }
        const zip = new JSZip();
        addDirToZip(zip, nodePath, "");
        const blob = await zip.generateAsync({ type: "blob" });
        triggerDownload(blob, name + ".zip");
      } else {
        const content = FS.readFile(nodePath) || "";
        const blob = isZip(name)
          ? new Blob([base64ToBytes(content)], { type: "application/zip" })
          : new Blob([content], { type: "text/plain" });
        triggerDownload(blob, name);
      }
    }

    async function extractZip(nodePath, name) {
      if (typeof JSZip === "undefined") { alert("Extraction isn't available right now (couldn't load JSZip — check your internet connection)."); return; }
      const base64 = FS.readFile(nodePath);
      if (base64 === null) return;
      let zip;
      try { zip = await JSZip.loadAsync(base64, { base64: true }); }
      catch (e) { alert("This doesn't look like a valid zip file."); return; }

      const baseName = name.replace(/\.zip$/i, "") || "extracted";
      let folderName = baseName, destDir = childPath(folderName), n = 1;
      while (FS.exists(destDir)) { folderName = `${baseName} (${n})`; destDir = childPath(folderName); n++; }
      FS.mkdir(destDir);

      for (const relPath of Object.keys(zip.files)) {
        const entry = zip.files[relPath];
        const fullDest = destDir + "/" + relPath.replace(/\/$/, "");
        if (entry.dir) { ensureParentDirs(fullDest + "/x"); if (!FS.exists(fullDest)) FS.mkdir(fullDest); }
        else { ensureParentDirs(fullDest); FS.writeFile(fullDest, await entry.async("string")); }
      }
      render();
    }

    function openWithMenu(nodePath, name, x, y) {
      const ext = extOf(name);
      const items = [
        { label: "Codex", icon: ICONS.code, action: () => CodexApp.open(nodePath) },
      ];
      if (ext === "js" || ext === "html" || ext === "htm") {
        items.push({ label: "Codex — Preview & Run", icon: ICONS.play, action: () => CodexApp.open(nodePath, { autoRun: true }) });
      }
      items.push("-");
      items.push({ label: "Download to device", icon: ICONS.download, action: () => downloadNode(nodePath, name, false) });
      ContextMenu.show(x, y, items);
    }

    function menuForNode(node, nodePath, x, y) {
      const common = [
        { label: "Rename", icon: ICONS.rename, action: () => renameNode(nodePath, node.name) },
        { label: "Move to…", icon: ICONS.moveTo, action: () => moveToNode(nodePath, node.name) },
      ];
      const danger = [{ label: "Delete", icon: ICONS.trash, danger: true, action: () => deleteNode(nodePath, node.name) }];

      if (node.type === "dir") {
        return [
          { label: "Open", icon: ICONS.folder, action: () => navigate(nodePath) },
          "-",
          ...common,
          "-",
          { label: "Compress", icon: ICONS.archive, action: () => compressNode(nodePath, node.name, true) },
          { label: "Send to…", icon: ICONS.download, action: () => downloadNode(nodePath, node.name, true) },
          "-",
          ...danger,
        ];
      }
      if (isZip(node.name)) {
        return [
          { label: "Extract Here", icon: ICONS.archive, action: () => extractZip(nodePath, node.name) },
          { label: "Download", icon: ICONS.download, action: () => downloadNode(nodePath, node.name, false) },
          "-",
          ...common,
          "-",
          ...danger,
        ];
      }
      return [
        { label: "Open", icon: ICONS.file, action: () => CodexApp.open(nodePath) },
        { label: "Open With…", icon: ICONS.openWith, action: () => openWithMenu(nodePath, node.name, x, y) },
        "-",
        ...common,
        "-",
        { label: "Compress", icon: ICONS.archive, action: () => compressNode(nodePath, node.name, false) },
        { label: "Send to…", icon: ICONS.download, action: () => downloadNode(nodePath, node.name, false) },
        "-",
        ...danger,
      ];
    }

    function render() {
      root.querySelector('[data-act="path"]').value = path;
      root.querySelectorAll(".fe-sidebar-item").forEach(el => el.classList.toggle("active", el.dataset.path === path));
      WM.setTitle(winId, path === "/" ? "This PC" : path.split("/").pop());
      renderBreadcrumbs();

      const grid = root.querySelector(".fe-grid");
      const entries = FS.readDir(path);
      grid.innerHTML = "";
      deleteBtn.disabled = !selected;
      updateStatusbar();
      if (!entries || entries.length === 0) {
        grid.innerHTML = `<div class="fe-empty">This folder is empty</div>`;
        return;
      }
      entries.forEach(node => {
        const nodePath = childPath(node.name);
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
          if (node.type === "dir") navigate(nodePath);
          else if (isZip(node.name)) extractZip(nodePath, node.name);
          else CodexApp.open(nodePath);
        });
        item.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelection(node.name);
          ContextMenu.show(e.clientX, e.clientY, menuForNode(node, nodePath, e.clientX, e.clientY));
        });
        grid.appendChild(item);
      });
    }

    function navigate(p) {
      path = FS.normalize(p, path);
      history.splice(histIdx + 1);
      history.push(path); histIdx = history.length - 1;
      setSelection(null);
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
      if (name) { FS.mkdir(childPath(name)); render(); }
    });
    root.querySelector('[data-act="new-file"]').addEventListener("click", () => {
      const name = prompt("File name:", "script.js");
      if (name) { FS.writeFile(childPath(name), ""); render(); CodexApp.open(childPath(name)); }
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
        { label: "New Folder", icon: ICONS.folder, action: () => { const n = prompt("Folder name:", "New folder"); if (n) { FS.mkdir(childPath(n)); render(); } } },
        { label: "New File", icon: ICONS.add, action: () => { const n = prompt("File name:", "script.js"); if (n) { FS.writeFile(childPath(n), ""); render(); CodexApp.open(childPath(n)); } } },
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