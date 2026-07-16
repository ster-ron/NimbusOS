/* ==========================================================================
   NimbusOS Virtual Filesystem
   A simple in-memory tree, persisted to localStorage.
   Paths are always absolute, "/"-separated, starting at "/".
   ========================================================================== */
const FS = (() => {
  const STORAGE_KEY = "nimbusos_fs_v1";

  function defaultTree() {
    return {
      type: "dir",
      name: "/",
      children: {
        "Desktop": { type: "dir", name: "Desktop", children: {} },
        "Projects": {
          type: "dir", name: "Projects", children: {
            "hello.js": {
              type: "file", name: "hello.js",
              content: "// Try it: hit Run above, or from Terminal run:\n" +
                "//   cd /Projects && run hello.js\n\n" +
                "function fib(n) {\n" +
                "  return n < 2 ? n : fib(n - 1) + fib(n - 2);\n" +
                "}\n\n" +
                "console.log(\"Hello from NimbusOS 👋\");\n" +
                "console.log(\"fib(10) =\", fib(10));\n"
            },
            "demo.html": {
              type: "file", name: "demo.html",
              content: "<!DOCTYPE html>\n<html>\n<head>\n<style>\n" +
                "  body { font-family: sans-serif; background: #12132b; color: #eee; padding: 40px; }\n" +
                "  h1 { color: #5eead4; }\n" +
                "</style>\n</head>\n<body>\n" +
                "  <h1>Hello, NimbusOS 👋</h1>\n" +
                "  <p>Edit this file, then hit <b>Run</b> above to preview it live.</p>\n" +
                "</body>\n</html>\n"
            }
          }
        },
        "Documents": {
          type: "dir", name: "Documents", children: {
            "Welcome.txt": {
              type: "file", name: "Welcome.txt",
              content: "NimbusOS — a webOS built for coders 👋\n\n" +
                "Try these things:\n" +
                "  • Open Terminal and run: cd /Projects && run hello.js\n" +
                "  • Open Code Editor on /Projects/demo.html and hit Run to preview it\n" +
                "  • Code Editor has real syntax highlighting and a live JS console / HTML preview\n" +
                "  • Everything runs for real — no simulation — right in your browser\n" +
                "  • The filesystem persists in localStorage, so your files survive a refresh\n"
            }
          }
        },
        "Downloads": { type: "dir", name: "Downloads", children: {} }
      }
    };
  }

  let root = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return defaultTree();
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(root)); } catch (e) {}
  }

  function parts(path) {
    return path.split("/").filter(Boolean);
  }

  function resolveNode(path) {
    const segs = parts(path);
    let node = root;
    for (const seg of segs) {
      if (!node || node.type !== "dir" || !node.children[seg]) return null;
      node = node.children[seg];
    }
    return node;
  }

  function parentOf(path) {
    const segs = parts(path);
    const name = segs.pop();
    const parentPath = "/" + segs.join("/");
    return { parent: resolveNode(parentPath) || (segs.length === 0 ? root : null), name, parentPath };
  }

  function normalize(path, base) {
    if (!path) return base || "/";
    if (path.startsWith("/")) {
      // absolute, still resolve . and ..
    } else {
      path = (base === "/" ? "" : base) + "/" + path;
    }
    const segs = path.split("/").filter(Boolean);
    const out = [];
    for (const s of segs) {
      if (s === ".") continue;
      if (s === "..") out.pop();
      else out.push(s);
    }
    return "/" + out.join("/");
  }

  function exists(path) { return !!resolveNode(path); }

  function isDir(path) {
    const n = resolveNode(path);
    return !!n && n.type === "dir";
  }

  function readDir(path) {
    const n = resolveNode(path);
    if (!n || n.type !== "dir") return null;
    return Object.values(n.children).sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  function readFile(path) {
    const n = resolveNode(path);
    if (!n || n.type !== "file") return null;
    return n.content;
  }

  function writeFile(path, content) {
    const { parent, name } = parentOf(path);
    if (!parent || parent.type !== "dir") return false;
    if (parent.children[name] && parent.children[name].type === "dir") return false;
    parent.children[name] = { type: "file", name, content: content ?? "" };
    persist();
    return true;
  }

  function mkdir(path) {
    const { parent, name } = parentOf(path);
    if (!parent || parent.type !== "dir" || !name) return false;
    if (parent.children[name]) return false;
    parent.children[name] = { type: "dir", name, children: {} };
    persist();
    return true;
  }

  function remove(path) {
    const { parent, name } = parentOf(path);
    if (!parent || !parent.children[name]) return false;
    delete parent.children[name];
    persist();
    return true;
  }

  function rename(path, newName) {
    const { parent, name } = parentOf(path);
    if (!parent || !parent.children[name] || parent.children[newName]) return false;
    const node = parent.children[name];
    node.name = newName;
    parent.children[newName] = node;
    delete parent.children[name];
    persist();
    return true;
  }

  function move(path, destDirPath) {
    const { parent, name } = parentOf(path);
    const dest = resolveNode(destDirPath);
    if (!parent || !parent.children[name] || !dest || dest.type !== "dir") return false;
    if (dest.children[name]) return false;
    dest.children[name] = parent.children[name];
    delete parent.children[name];
    persist();
    return true;
  }

  function reset() {
    root = defaultTree();
    persist();
  }

  return { exists, isDir, readDir, readFile, writeFile, mkdir, remove, rename, move, normalize, reset, resolveNode };
})();
