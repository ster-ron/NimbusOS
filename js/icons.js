/* ==========================================================================
   NimbusOS Icon Set
   Hand-drawn stroke icons (currentColor) used everywhere an emoji used to be:
   desktop icons, the dock, the launcher, and window titlebars.
   ========================================================================== */
const ICONS = (() => {
  const svg = (inner, vb = 24) =>
    `<svg viewBox="0 0 ${vb} ${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  return {
    explorer: svg(`<path d="M3 7.5a2 2 0 0 1 2-2h3.6l1.8 2H19a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5z"/>`),

    editor: svg(`<path d="M4 20h4L18.4 9.6a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.4 6.2l3 3"/>`),

    terminal: svg(`<rect x="3" y="4.5" width="18" height="15" rx="2.2"/><path d="M7.2 9.5l3 3-3 3"/><path d="M13 15.5h4"/>`),

    browser: svg(`<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.6 3.8 5.6 3.8 8.5s-1.4 5.9-3.8 8.5c-2.4-2.6-3.8-5.6-3.8-8.5s1.4-5.9 3.8-8.5z"/>`),

    music: svg(`<path d="M4 14v-3.2"/><path d="M8 17V7"/><path d="M12 19V5"/><path d="M16 16V8"/><path d="M20 13v-2"/>`),

    settings: svg(`<circle cx="12" cy="12" r="2.8"/><path d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.7 6.3l-1.7 1.7M8 16l-1.7 1.7M17.7 17.7L16 16M8 8 6.3 6.3"/>`),

    window: svg(`<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><path d="M3.5 9h17"/>`),

    folder: svg(`<path d="M3 7.5a2 2 0 0 1 2-2h3.6l1.8 2H19a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5z"/>`),

    file: svg(`<path d="M6.5 3.5h7l4 4v12.2a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M13.5 3.5V8h4.2"/>`),

    image: svg(`<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.7" cy="9.5" r="1.6"/><path d="M4 17l5-4.8 3.2 2.8L17 10l3 4.5"/>`),

    code: svg(`<path d="M8.5 8L4 12l4.5 4"/><path d="M15.5 8l4.5 4-4.5 4"/>`),

    add: svg(`<path d="M12 5v14"/><path d="M5 12h14"/>`),

    save: svg(`<path d="M5 4.5h11l3.5 3.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z"/><path d="M8 4.5V9h7V4.5"/><path d="M7.5 14.5h9V19h-9z"/>`),

    play: svg(`<path d="M7 5.2v13.6a1 1 0 0 0 1.55.83l10.4-6.8a1 1 0 0 0 0-1.66L8.55 4.37A1 1 0 0 0 7 5.2z"/>`),

    pause: svg(`<rect x="6.5" y="5" width="4.2" height="14" rx="1"/><rect x="13.3" y="5" width="4.2" height="14" rx="1"/>`),

    skipBack: svg(`<path d="M6 5v14"/><path d="M18.5 6.3 9 12l9.5 5.7z"/>`),

    skipForward: svg(`<path d="M18 5v14"/><path d="M5.5 6.3 15 12l-9.5 5.7z"/>`),

    volumeLow: svg(`<path d="M4 9.5v5h3.6L13 19V5L7.6 9.5z"/><path d="M16.5 10a3 3 0 0 1 0 4"/>`),

    volumeHigh: svg(`<path d="M4 9.5v5h3.6L13 19V5L7.6 9.5z"/><path d="M16.3 9a4.3 4.3 0 0 1 0 6"/><path d="M19 6.5a7.8 7.8 0 0 1 0 11"/>`),

    info: svg(`<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="0.35" fill="currentColor" stroke="none"/>`),

    palette: svg(`<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.7-.8 1.7-1.7 0-.45-.18-.85-.46-1.15-.28-.3-.46-.7-.46-1.15 0-.9.75-1.6 1.65-1.6H16a4.5 4.5 0 0 0 4.5-4.5c0-4-3.8-7-8.5-7z"/><circle cx="7.7" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="9.7" cy="7.3" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="16.8" cy="10.8" r="1" fill="currentColor" stroke="none"/>`),

    sliders: svg(`<path d="M5 6.5h14"/><path d="M5 12h14"/><path d="M5 17.5h14"/><circle cx="9" cy="6.5" r="1.7" style="fill:var(--panel-bg,#faf9ff)"/><circle cx="16" cy="12" r="1.7" style="fill:var(--panel-bg,#faf9ff)"/><circle cx="10.5" cy="17.5" r="1.7" style="fill:var(--panel-bg,#faf9ff)"/>`),

    sun: svg(`<circle cx="12" cy="12" r="4.2"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>`),

    moon: svg(`<path d="M20 14.3A8.4 8.4 0 0 1 9.7 4a8.4 8.4 0 1 0 10.3 10.3z"/>`),

    wave: svg(`<path d="M3.5 13v-2"/><path d="M6.7 15.5v-7"/><path d="M9.9 17.5v-11"/><path d="M13.1 15.5v-7"/><path d="M16.3 17.5v-11"/><path d="M19.5 13v-2"/>`),
  };
})();
