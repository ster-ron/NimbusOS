/* ========================= Terminal App =========================
   A small but real shell: history persists across sessions, Tab
   completes commands/paths, "|" pipes output between commands, "&&"
   chains commands, and a handful of Unix-ish filters (grep/head/
   tail/wc/sort/uniq) work both standalone and piped.
==================================================================== */
const TerminalApp = (() => {
  const HIST_KEY = "nimbusos_term_history_v1";

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch (e) { return []; }
  }
  function saveHistory(h) {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(-200))); } catch (e) {}
  }

  function open() {
    let cwd = "/";
    const root = document.createElement("div");
    root.className = "term-root";
    root.tabIndex = 0;

    const output = document.createElement("div");
    root.appendChild(output);

    const promptLine = document.createElement("div");
    promptLine.className = "term-prompt-line";
    promptLine.innerHTML = `<span class="term-prompt" data-act="prompt">nimbus:${cwd}$</span><input class="term-input" autocomplete="off" spellcheck="false">`;
    root.appendChild(promptLine);
    const input = promptLine.querySelector("input");
    const promptEl = promptLine.querySelector('[data-act="prompt"]');

    const history = loadHistory();
    let histPos = history.length;

    // when set, println/printHTML push plain text into this array instead of
    // rendering to the DOM — this is what makes piping between commands work
    // for free, without every command needing to know about pipes.
    let captureBuffer = null;

    function println(text, cls) {
      if (captureBuffer) { captureBuffer.push(text); return; }
      const line = document.createElement("div");
      line.className = "term-line" + (cls ? " " + cls : "");
      line.textContent = text;
      output.insertBefore(line, promptLine);
    }
    function printHTML(html) {
      if (captureBuffer) { captureBuffer.push(html.replace(/<[^>]+>/g, "")); return; }
      const line = document.createElement("div");
      line.className = "term-line";
      line.innerHTML = html;
      output.insertBefore(line, promptLine);
    }

    function banner() {
      printHTML(`<span style="color:#6ee7d8;font-weight:600;">NimbusOS Terminal</span>  <span class="term-dim">type 'help' · Tab completes · pipes "|" and "&&" work</span>`);
    }

    function resolvePath(p) { return FS.normalize(p, cwd); }

    function linesFromStdinOrFile(args, stdin, argIndex) {
      if (stdin) return stdin;
      const file = args[argIndex];
      if (!file) return null;
      const content = FS.readFile(resolvePath(file));
      return content === null ? null : content.split("\n");
    }

    const commands = {
      help() {
        println("Available commands:");
        [
          ["ls [path]", "list directory contents"],
          ["cd <path>", "change directory"],
          ["pwd", "print working directory"],
          ["cat <file>", "print file contents"],
          ["echo <text>", "print text (use > file to write, >> to append)"],
          ["mkdir <dir>", "create a directory"],
          ["touch <file>", "create an empty file"],
          ["rm <path>", "remove a file or empty directory"],
          ["mv <a> <b>", "rename, or move into a directory"],
          ["cp <a> <b>", "copy a file"],
          ["find <name>", "search the filesystem from cwd down"],
          ["grep <term> [file]", "filter lines containing term"],
          ["head [-n N] [file]", "first N lines (default 10)"],
          ["tail [-n N] [file]", "last N lines (default 10)"],
          ["sort [file]", "sort lines alphabetically"],
          ["uniq [file]", "collapse repeated consecutive lines"],
          ["wc [file]", "count lines, words, characters"],
          ["open <file>", "open file in Code Editor"],
          ["run <file.js>", "execute a JS file, console output printed here"],
          ["explorer [path]", "open File Explorer"],
          ["history", "show recent commands"],
          ["clear", "clear the terminal (or Ctrl+L)"],
          ["whoami", "print current user"],
          ["date", "print current date/time"],
          ["neofetch", "system info banner"],
        ].forEach(([c, d]) => println(`  ${c.padEnd(22)} ${d}`, "term-dim"));
        println("");
        println("Tips: pipe commands with |  e.g.  ls | grep js", "term-dim");
        println("      chain commands with &&  e.g.  mkdir x && cd x", "term-dim");
        println("      press Tab to complete commands and paths", "term-dim");
      },
      ls(args) {
        const p = resolvePath(args[0] || ".");
        const entries = FS.readDir(p);
        if (!entries) return println(`ls: cannot access '${args[0] || "."}': not a directory`, "term-err");
        if (entries.length === 0) return println("(empty)", "term-dim");
        entries.forEach(e => println(e.type === "dir" ? e.name + "/" : e.name));
      },
      cd(args) {
        const p = resolvePath(args[0] || "/");
        if (!FS.isDir(p)) return println(`cd: no such directory: ${args[0]}`, "term-err");
        cwd = p;
        promptEl.textContent = `nimbus:${cwd}$`;
      },
      pwd() { println(cwd); },
      cat(args) {
        if (!args[0]) return println("usage: cat <file>", "term-err");
        const p = resolvePath(args[0]);
        const content = FS.readFile(p);
        if (content === null) return println(`cat: ${args[0]}: no such file`, "term-err");
        content.split("\n").forEach(l => println(l));
      },
      echo(args) {
        const raw = args.join(" ");
        const appendIdx = raw.indexOf(">>");
        const writeIdx = raw.indexOf(">");
        if (appendIdx !== -1) {
          const text = raw.slice(0, appendIdx).trim();
          const file = raw.slice(appendIdx + 2).trim();
          if (!file) return println("echo: missing filename after '>>'", "term-err");
          const p = resolvePath(file);
          const existing = FS.readFile(p);
          FS.writeFile(p, existing === null ? text : existing + "\n" + text);
          return;
        }
        if (writeIdx !== -1) {
          const text = raw.slice(0, writeIdx).trim();
          const file = raw.slice(writeIdx + 1).trim();
          if (!file) return println("echo: missing filename after '>'", "term-err");
          FS.writeFile(resolvePath(file), text);
          return;
        }
        println(raw);
      },
      mkdir(args) {
        if (!args[0]) return println("usage: mkdir <dir>", "term-err");
        if (!FS.mkdir(resolvePath(args[0]))) println(`mkdir: cannot create '${args[0]}'`, "term-err");
      },
      touch(args) {
        if (!args[0]) return println("usage: touch <file>", "term-err");
        const p = resolvePath(args[0]);
        if (!FS.exists(p)) FS.writeFile(p, "");
      },
      rm(args) {
        if (!args[0]) return println("usage: rm <path>", "term-err");
        if (!FS.remove(resolvePath(args[0]))) println(`rm: cannot remove '${args[0]}'`, "term-err");
      },
      mv(args) {
        if (args.length < 2) return println("usage: mv <path> <destination>", "term-err");
        const src = resolvePath(args[0]);
        const destPath = resolvePath(args[1]);
        if (FS.isDir(destPath)) {
          if (!FS.move(src, destPath)) println(`mv: cannot move '${args[0]}' into '${args[1]}'`, "term-err");
        } else if (!FS.rename(src, args[1])) {
          println(`mv: cannot move '${args[0]}'`, "term-err");
        }
      },
      cp(args) {
        if (args.length < 2) return println("usage: cp <file> <destination>", "term-err");
        const src = resolvePath(args[0]);
        const node = FS.resolveNode(src);
        if (!node) return println(`cp: no such file: ${args[0]}`, "term-err");
        if (node.type !== "file") return println("cp: only files are supported", "term-err");
        let destPath = resolvePath(args[1]);
        if (FS.isDir(destPath)) destPath = (destPath === "/" ? "" : destPath) + "/" + node.name;
        if (!FS.writeFile(destPath, node.content)) println(`cp: cannot copy to '${args[1]}'`, "term-err");
      },
      find(args) {
        if (!args[0]) return println("usage: find <name>", "term-err");
        const term = args[0].toLowerCase();
        const results = [];
        (function walk(path) {
          const entries = FS.readDir(path) || [];
          entries.forEach(e => {
            const full = (path === "/" ? "" : path) + "/" + e.name;
            if (e.name.toLowerCase().includes(term)) results.push(full + (e.type === "dir" ? "/" : ""));
            if (e.type === "dir") walk(full);
          });
        })(cwd);
        if (results.length === 0) println(`find: no matches for '${args[0]}'`, "term-dim");
        else results.forEach(r => println(r));
      },
      grep(args, stdin) {
        if (!args[0]) return println("usage: grep <term> [file]", "term-err");
        const term = args[0].toLowerCase();
        const lines = linesFromStdinOrFile(args, stdin, 1);
        if (lines === null) return println(`grep: ${args[1] || "no input"}: no such file`, "term-err");
        const matches = lines.filter(l => l.toLowerCase().includes(term));
        if (matches.length === 0) println(`(no matches for '${args[0]}')`, "term-dim");
        else matches.forEach(l => println(l));
      },
      head(args, stdin) {
        let n = 10, rest = args;
        if (args[0] === "-n") { n = parseInt(args[1], 10) || 10; rest = args.slice(2); }
        const lines = linesFromStdinOrFile(rest, stdin, 0);
        if (lines === null) return println(`head: ${rest[0] || "no input"}: no such file`, "term-err");
        lines.slice(0, n).forEach(l => println(l));
      },
      tail(args, stdin) {
        let n = 10, rest = args;
        if (args[0] === "-n") { n = parseInt(args[1], 10) || 10; rest = args.slice(2); }
        const lines = linesFromStdinOrFile(rest, stdin, 0);
        if (lines === null) return println(`tail: ${rest[0] || "no input"}: no such file`, "term-err");
        lines.slice(-n).forEach(l => println(l));
      },
      sort(args, stdin) {
        const lines = linesFromStdinOrFile(args, stdin, 0);
        if (lines === null) return println(`sort: ${args[0] || "no input"}: no such file`, "term-err");
        [...lines].sort().forEach(l => println(l));
      },
      uniq(args, stdin) {
        const lines = linesFromStdinOrFile(args, stdin, 0);
        if (lines === null) return println(`uniq: ${args[0] || "no input"}: no such file`, "term-err");
        lines.forEach((l, i) => { if (i === 0 || l !== lines[i - 1]) println(l); });
      },
      wc(args, stdin) {
        const lines = linesFromStdinOrFile(args, stdin, 0);
        if (lines === null) return println(`wc: ${args[0] || "no input"}: no such file`, "term-err");
        const text = lines.join("\n");
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        println(`  ${lines.length} lines  ${words} words  ${text.length} chars`);
      },
      open(args) {
        if (!args[0]) return println("usage: open <file>", "term-err");
        const p = resolvePath(args[0]);
        if (!FS.exists(p)) return println(`open: no such file: ${args[0]}`, "term-err");
        CodeEditorApp.open(p);
      },
      run(args) {
        if (!args[0]) return println("usage: run <file.js>", "term-err");
        const p = resolvePath(args[0]);
        const content = FS.readFile(p);
        if (content === null) return println(`run: no such file: ${args[0]}`, "term-err");
        if (!p.toLowerCase().endsWith(".js")) return println("run: only .js files are supported", "term-err");
        const fmt = (a) => a.map(v => {
          try { return typeof v === "string" ? v : JSON.stringify(v); } catch (e) { return String(v); }
        }).join(" ");
        let wrote = false;
        const sandboxConsole = {
          log: (...a) => { wrote = true; println(fmt(a)); },
          info: (...a) => { wrote = true; println(fmt(a)); },
          warn: (...a) => { wrote = true; println(fmt(a), "term-err"); },
          error: (...a) => { wrote = true; println(fmt(a), "term-err"); },
        };
        try {
          const fn = new Function("console", content);
          fn(sandboxConsole);
          if (!wrote) println("(ran with no output)", "term-dim");
        } catch (e) {
          println("Uncaught " + e.message, "term-err");
        }
      },
      explorer(args) { FileExplorerApp.open(args[0] ? resolvePath(args[0]) : cwd); },
      history() {
        if (history.length === 0) return println("(no history yet)", "term-dim");
        history.forEach((h, i) => println(`  ${i + 1}  ${h}`, "term-dim"));
      },
      clear() { output.innerHTML = ""; },
      whoami() { println("nimbus-user"); },
      date() { println(new Date().toString()); },
      neofetch() {
        printHTML(
          `<span style="color:#6ee7d8">     .--.     </span>  <b>nimbus-user@NimbusOS</b>\n` +
          `<span style="color:#6ee7d8">   .'_\\/_'.   </span>  ------------------\n` +
          `<span style="color:#6ee7d8">   '. /\\ .'   </span>  OS: NimbusOS (Web Edition)\n` +
          `<span style="color:#6ee7d8">     "  "     </span>  Shell: nimbus-sh 2.0\n` +
          `                    Uptime: ${Math.floor(performance.now() / 1000)}s`
        );
      }
    };

    /* ---------------- execution: pipes + chaining ---------------- */
    function execStage(stageStr, stdin, capture) {
      const [cmd, ...args] = stageStr.trim().split(/\s+/);
      if (!commands[cmd]) {
        const msg = `command not found: ${cmd} (try 'help')`;
        if (capture) return [msg];
        println(msg, "term-err");
        return null;
      }
      if (capture) {
        const buffer = [];
        const prev = captureBuffer;
        captureBuffer = buffer;
        try { commands[cmd](args, stdin); } catch (e) { buffer.push("error: " + e.message); }
        captureBuffer = prev;
        return buffer;
      }
      try { commands[cmd](args, stdin); } catch (e) { println("error: " + e.message, "term-err"); }
      return null;
    }

    function execSegment(segment) {
      const stages = segment.split("|").map(s => s.trim()).filter(Boolean);
      if (stages.length === 0) return;
      let stdin = null;
      for (let i = 0; i < stages.length; i++) {
        const isLast = i === stages.length - 1;
        if (isLast) execStage(stages[i], stdin, false);
        else stdin = execStage(stages[i], stdin, true);
      }
    }

    function runLine(raw) {
      const trimmed = raw.trim();
      println(`nimbus:${cwd}$ ${raw}`, "term-dim");
      if (!trimmed) return;
      history.push(trimmed); histPos = history.length; saveHistory(history);
      trimmed.split("&&").map(s => s.trim()).filter(Boolean).forEach(execSegment);
    }

    /* ---------------- tab completion ---------------- */
    function getCompletions(text) {
      const parts = text.split(/\s+/);
      if (parts.length <= 1) {
        const prefix = parts[0] || "";
        return Object.keys(commands).filter(c => c.startsWith(prefix)).sort();
      }
      const last = parts[parts.length - 1];
      const slashIdx = last.lastIndexOf("/");
      const dirPart = slashIdx !== -1 ? last.slice(0, slashIdx + 1) : "";
      const namePart = slashIdx !== -1 ? last.slice(slashIdx + 1) : last;
      const lookupDir = dirPart ? resolvePath(dirPart) : cwd;
      const entries = FS.readDir(lookupDir) || [];
      return entries
        .filter(e => e.name.startsWith(namePart))
        .map(e => dirPart + e.name + (e.type === "dir" ? "/" : ""))
        .sort();
    }
    function commonPrefix(strs) {
      if (strs.length === 0) return "";
      let prefix = strs[0];
      for (const s of strs.slice(1)) {
        while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
      }
      return prefix;
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = input.value;
        input.value = "";
        runLine(val);
        root.scrollTop = root.scrollHeight;
      } else if (e.key === "ArrowUp") {
        if (histPos > 0) { histPos--; input.value = history[histPos]; }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (histPos < history.length - 1) { histPos++; input.value = history[histPos]; }
        else { histPos = history.length; input.value = ""; }
        e.preventDefault();
      } else if (e.key === "Tab") {
        e.preventDefault();
        const matches = getCompletions(input.value);
        if (matches.length === 1) {
          const parts = input.value.split(/\s+/);
          parts[parts.length - 1] = matches[0];
          input.value = parts.join(" ") + (matches[0].endsWith("/") ? "" : " ");
        } else if (matches.length > 1) {
          const prefix = commonPrefix(matches);
          const parts = input.value.split(/\s+/);
          const current = parts[parts.length - 1];
          if (prefix && prefix.length > current.length) {
            parts[parts.length - 1] = prefix;
            input.value = parts.join(" ");
          } else {
            println(matches.join("   "), "term-dim");
          }
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        output.innerHTML = "";
      } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        println(`nimbus:${cwd}$ ${input.value}^C`, "term-dim");
        input.value = "";
      }
    });
    root.addEventListener("click", () => input.focus());

    const winId = WM.createWindow({
      appId: "terminal:" + Date.now(),
      title: "Terminal",
      icon: ICONS.terminal,
      width: 640, height: 440,
      content: root,
      onFocus: () => setTimeout(() => input.focus(), 30)
    });

    banner();
    setTimeout(() => input.focus(), 60);
    return winId;
  }

  return { open };
})();
