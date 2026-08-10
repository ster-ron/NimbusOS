/* ========================= Shared Context Menu =========================
   A single global right-click menu other modules can call into:
     ContextMenu.show(x, y, items)   items: {label, icon, danger?, action} | "-"
     ContextMenu.hide()
========================================================================= */
const ContextMenu = (() => {
  function show(x, y, items) {
    const cm = document.getElementById("context-menu");
    cm.innerHTML = items.map((it, i) =>
      it === "-"
        ? `<div class="cm-sep"></div>`
        : `<div class="cm-item${it.danger ? " cm-danger" : ""}" data-i="${i}">${it.icon || ""} ${it.label}</div>`
    ).join("");
    cm.style.left = Math.min(x, window.innerWidth - 220) + "px";
    cm.style.top = Math.min(y, window.innerHeight - items.length * 34 - 60) + "px";
    cm.classList.add("open");
    cm.querySelectorAll(".cm-item").forEach(el => {
      el.addEventListener("click", () => {
        const it = items[+el.dataset.i];
        if (it && it.action) it.action();
        hide();
      });
    });
  }

  function hide() {
    const cm = document.getElementById("context-menu");
    if (cm) cm.classList.remove("open");
  }

  document.addEventListener("mousedown", (e) => {
    const cm = document.getElementById("context-menu");
    if (cm && cm.classList.contains("open") && !cm.contains(e.target)) hide();
  });
  window.addEventListener("resize", hide);
  window.addEventListener("blur", hide);

  return { show, hide };
})();
