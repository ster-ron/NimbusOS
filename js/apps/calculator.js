/* ========================= Calculator App =========================
   A real accumulator-based calculator (no eval() of arbitrary strings —
   every operation is plain JS arithmetic). Basic mode plus a Scientific
   mode: sin/cos/tan/log/ln/sqrt/square/cube/reciprocal/pi, memory
   (MC/MR/M+/M-), and a Deg/Rad toggle for trig.
====================================================================== */
const CalculatorApp = (() => {

  function open() {
    const existing = WM.findByAppId("calculator");
    if (existing) { WM.focusWindow(existing.meta.id); return existing.meta.id; }

    let acc = null;          // stored left operand
    let op = null;           // pending operator: '+' '-' '×' '÷'
    let current = "0";       // string currently shown/being typed
    let overwrite = true;    // next digit press starts a fresh number
    let memory = 0;
    let angleMode = "deg";   // 'deg' | 'rad'
    let sciOpen = false;

    const root = document.createElement("div");
    root.className = "app-root calc-root";
    root.tabIndex = 0;
    root.innerHTML = `
      <div class="calc-display">
        <div class="calc-expr" data-act="expr"></div>
        <div class="calc-result" data-act="result">0</div>
      </div>
      <div class="calc-sci" data-act="sci" style="display:none;">
        <button class="calc-btn calc-sci-btn" data-fn="sin">sin</button>
        <button class="calc-btn calc-sci-btn" data-fn="cos">cos</button>
        <button class="calc-btn calc-sci-btn" data-fn="tan">tan</button>
        <button class="calc-btn calc-sci-btn" data-fn="log">log</button>
        <button class="calc-btn calc-sci-btn" data-fn="ln">ln</button>
        <button class="calc-btn calc-sci-btn" data-fn="sqrt">√</button>
        <button class="calc-btn calc-sci-btn" data-fn="sq">x²</button>
        <button class="calc-btn calc-sci-btn" data-fn="cube">x³</button>
        <button class="calc-btn calc-sci-btn" data-fn="inv">1/x</button>
        <button class="calc-btn calc-sci-btn" data-fn="pi">π</button>
        <button class="calc-btn calc-sci-btn" data-act="mc">MC</button>
        <button class="calc-btn calc-sci-btn" data-act="mr">MR</button>
        <button class="calc-btn calc-sci-btn" data-act="mplus">M+</button>
        <button class="calc-btn calc-sci-btn" data-act="mminus">M−</button>
        <button class="calc-btn calc-sci-btn" data-act="angle">${"deg" === angleMode ? "DEG" : "RAD"}</button>
      </div>
      <div class="calc-grid">
        <button class="calc-btn calc-fn" data-act="clear">C</button>
        <button class="calc-btn calc-fn" data-act="back">⌫</button>
        <button class="calc-btn calc-fn" data-act="percent">%</button>
        <button class="calc-btn calc-op" data-op="÷">÷</button>

        <button class="calc-btn" data-d="7">7</button>
        <button class="calc-btn" data-d="8">8</button>
        <button class="calc-btn" data-d="9">9</button>
        <button class="calc-btn calc-op" data-op="×">×</button>

        <button class="calc-btn" data-d="4">4</button>
        <button class="calc-btn" data-d="5">5</button>
        <button class="calc-btn" data-d="6">6</button>
        <button class="calc-btn calc-op" data-op="-">−</button>

        <button class="calc-btn" data-d="1">1</button>
        <button class="calc-btn" data-d="2">2</button>
        <button class="calc-btn" data-d="3">3</button>
        <button class="calc-btn calc-op" data-op="+">+</button>

        <button class="calc-btn calc-fn" data-act="sign">±</button>
        <button class="calc-btn" data-d="0">0</button>
        <button class="calc-btn" data-d=".">.</button>
        <button class="calc-btn calc-eq" data-act="equals">=</button>
      </div>
    `;

    const exprEl = root.querySelector('[data-act="expr"]');
    const resultEl = root.querySelector('[data-act="result"]');
    const sciPanel = root.querySelector('[data-act="sci"]');
    const angleBtn = root.querySelector('[data-act="angle"]');

    function formatNum(n) {
      if (!Number.isFinite(n)) return "Error";
      if (Math.abs(n) > 1e15) return n.toExponential(6);
      if (Number.isInteger(n)) return n.toLocaleString("en-US");
      let s = parseFloat(n.toPrecision(12)).toString();
      const parts = s.split(".");
      parts[0] = parseFloat(parts[0]).toLocaleString("en-US");
      return parts.join(".");
    }

    function updateDisplay() {
      resultEl.textContent = current;
      exprEl.textContent = (acc !== null && op) ? `${formatNum(acc)} ${op}` : "";
    }

    function inputDigit(d) {
      if (current === "Error") { current = "0"; overwrite = true; }
      if (overwrite) { current = (d === ".") ? "0." : d; overwrite = false; }
      else if (d === "." ) { if (!current.includes(".")) current += "."; }
      else if (current === "0") { current = d; }
      else { current += d; }
      updateDisplay();
    }

    function compute(a, b, o) {
      switch (o) {
        case "+": return a + b;
        case "-": return a - b;
        case "×": return a * b;
        case "÷": return b === 0 ? NaN : a / b;
        default: return b;
      }
    }

    function applyOp(nextOp) {
      const val = parseFloat(current);
      if (acc === null) acc = val;
      else if (op) acc = compute(acc, val, op);
      op = nextOp;
      overwrite = true;
      current = formatNum(acc);
      updateDisplay();
    }

    function equals() {
      if (op === null) return;
      const val = parseFloat(current);
      const result = compute(acc, val, op);
      acc = null; op = null; overwrite = true;
      current = formatNum(result);
      updateDisplay();
    }

    function clearAll() { acc = null; op = null; current = "0"; overwrite = true; updateDisplay(); }
    function backspace() {
      if (overwrite || current === "Error") return;
      current = current.length > 1 ? current.slice(0, -1) : "0";
      updateDisplay();
    }
    function toggleSign() {
      if (current === "0" || current === "Error") return;
      current = current.startsWith("-") ? current.slice(1) : "-" + current;
      updateDisplay();
    }
    function percent() {
      if (current === "Error") return;
      current = formatNum(parseFloat(current) / 100);
      updateDisplay();
    }

    function applyUnary(fn) {
      const val = parseFloat(current);
      let result;
      const toRad = (x) => angleMode === "deg" ? x * Math.PI / 180 : x;
      switch (fn) {
        case "sin": result = Math.sin(toRad(val)); break;
        case "cos": result = Math.cos(toRad(val)); break;
        case "tan": result = Math.tan(toRad(val)); break;
        case "log": result = val > 0 ? Math.log10(val) : NaN; break;
        case "ln": result = val > 0 ? Math.log(val) : NaN; break;
        case "sqrt": result = val >= 0 ? Math.sqrt(val) : NaN; break;
        case "sq": result = val * val; break;
        case "cube": result = val * val * val; break;
        case "inv": result = val !== 0 ? 1 / val : NaN; break;
        case "pi": result = Math.PI; break;
      }
      current = formatNum(result);
      overwrite = true;
      updateDisplay();
    }

    root.querySelectorAll("[data-d]").forEach(b => b.addEventListener("click", () => inputDigit(b.dataset.d)));
    root.querySelectorAll("[data-op]").forEach(b => b.addEventListener("click", () => applyOp(b.dataset.op)));
    root.querySelector('[data-act="clear"]').addEventListener("click", clearAll);
    root.querySelector('[data-act="back"]').addEventListener("click", backspace);
    root.querySelector('[data-act="percent"]').addEventListener("click", percent);
    root.querySelector('[data-act="sign"]').addEventListener("click", toggleSign);
    root.querySelector('[data-act="equals"]').addEventListener("click", equals);
    root.querySelectorAll("[data-fn]").forEach(b => b.addEventListener("click", () => applyUnary(b.dataset.fn)));
    root.querySelector('[data-act="mc"]').addEventListener("click", () => { memory = 0; });
    root.querySelector('[data-act="mr"]').addEventListener("click", () => { current = formatNum(memory); overwrite = true; updateDisplay(); });
    root.querySelector('[data-act="mplus"]').addEventListener("click", () => { memory += parseFloat(current) || 0; });
    root.querySelector('[data-act="mminus"]').addEventListener("click", () => { memory -= parseFloat(current) || 0; });
    angleBtn.addEventListener("click", () => {
      angleMode = angleMode === "deg" ? "rad" : "deg";
      angleBtn.textContent = angleMode.toUpperCase();
    });

    root.addEventListener("keydown", (e) => {
      if (e.key >= "0" && e.key <= "9") inputDigit(e.key);
      else if (e.key === ".") inputDigit(".");
      else if (e.key === "+" || e.key === "-") applyOp(e.key);
      else if (e.key === "*") applyOp("×");
      else if (e.key === "/") { e.preventDefault(); applyOp("÷"); }
      else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); equals(); }
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") clearAll();
      else if (e.key === "%") percent();
    });

    const winId = WM.createWindow({
      appId: "calculator", title: "Calculator", icon: ICONS.calculator,
      width: 320, height: 480, resizable: false, content: root
    });

    // toolbar-less toggle: a small pill in the display header switches Scientific mode
    const sciToggle = document.createElement("button");
    sciToggle.className = "calc-sci-toggle";
    sciToggle.textContent = "Scientific";
    sciToggle.addEventListener("click", () => {
      sciOpen = !sciOpen;
      sciPanel.style.display = sciOpen ? "grid" : "none";
      sciToggle.classList.toggle("active", sciOpen);
      const body = WM.getBody(winId);
      if (body) body.parentElement.style.height = sciOpen ? "580px" : "480px";
    });
    root.querySelector(".calc-display").appendChild(sciToggle);

    updateDisplay();
    setTimeout(() => root.focus(), 50);
    return winId;
  }

  return { open };
})();