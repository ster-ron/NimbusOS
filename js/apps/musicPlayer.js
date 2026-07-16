/* ========================= Music App =========================
   Two kinds of tracks:
   - "synth"  : procedurally generated ambient loops (no copyrighted audio at all)
   - "file"   : the user's own local audio files, picked from their device
   Both are routed through one AnalyserNode so the visualizer works for either.
================================================================= */
const MusicApp = (() => {
  let ctx = null, analyser = null, masterGain = null;
  let current = null;      // {type:'synth', stop} | {type:'file', el}
  let playing = false;
  let currentIndex = 0;
  let vizRAF = null;
  let ui = null;            // cached DOM refs for the open window (single instance)

  const BUILTIN = [
    { id: "calm", title: "Nimbus Calm", artist: "Generative · Pad", kind: "pad",
      notes: [220, 277.18, 329.63, 415.30], tempo: 5200 },
    { id: "drift", title: "Cloud Drift", artist: "Generative · Arpeggio", kind: "arp",
      notes: [261.63, 329.63, 392.00, 493.88, 587.33, 493.88, 392.00, 329.63], tempo: 260 },
    { id: "night", title: "Night Static", artist: "Generative · Drone", kind: "drone",
      notes: [110, 164.81], tempo: 9000 },
  ];

  let playlist = BUILTIN.map(t => ({ ...t, type: "synth" }));

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.55;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
  }

  /* ---------------- synth engine ---------------- */
  function startSynth(track) {
    ensureCtx();
    const stopFlags = { stopped: false, timers: [] };
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;
    voiceGain.connect(masterGain);
    voiceGain.gain.linearRampToValueAtTime(track.kind === "drone" ? 0.5 : 0.35, ctx.currentTime + 1.2);

    function playNote(freq, dur, type) {
      if (stopFlags.stopped) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(1, ctx.currentTime + dur * 0.2);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      osc.connect(g); g.connect(voiceGain);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.05);
    }

    if (track.kind === "pad") {
      const loop = () => {
        if (stopFlags.stopped) return;
        track.notes.forEach((f, i) => setTimeout(() => playNote(f, track.tempo / 1000 * 1.6, "sine"), i * 60));
        stopFlags.timers.push(setTimeout(loop, track.tempo));
      };
      loop();
    } else if (track.kind === "arp") {
      let i = 0;
      const loop = () => {
        if (stopFlags.stopped) return;
        playNote(track.notes[i % track.notes.length], track.tempo / 1000 * 1.4, "triangle");
        i++;
        stopFlags.timers.push(setTimeout(loop, track.tempo));
      };
      loop();
    } else if (track.kind === "drone") {
      track.notes.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth"; osc.frequency.value = f;
        const filt = ctx.createBiquadFilter();
        filt.type = "lowpass"; filt.frequency.value = 400;
        osc.connect(filt); filt.connect(voiceGain);
        osc.start();
        stopFlags.timers.push(osc);
      });
      // slow filter/lfo movement via a repeating ramp
      const wobble = () => {
        if (stopFlags.stopped) return;
        voiceGain.gain.linearRampToValueAtTime(0.35 + Math.random() * 0.2, ctx.currentTime + 3);
        stopFlags.timers.push(setTimeout(wobble, 3000));
      };
      wobble();
    }

    return {
      type: "synth",
      stop() {
        stopFlags.stopped = true;
        stopFlags.timers.forEach(t => {
          if (typeof t === "number") clearTimeout(t);
          else { try { t.stop(); } catch (e) {} }
        });
        voiceGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        setTimeout(() => { try { voiceGain.disconnect(); } catch (e) {} }, 500);
      }
    };
  }

  /* ---------------- file engine ---------------- */
  const fileNodeCache = new WeakMap(); // audioEl -> MediaElementSourceNode

  function startFile(track) {
    ensureCtx();
    if (!track.el) {
      track.el = new Audio();
      track.el.src = track.url;
      track.el.crossOrigin = "anonymous";
    }
    if (!fileNodeCache.has(track.el)) {
      const node = ctx.createMediaElementSource(track.el);
      node.connect(masterGain);
      fileNodeCache.set(track.el, node);
    }
    track.el.currentTime = 0;
    track.el.play().catch(() => {});
    track.el.onended = () => next();
    return { type: "file", el: track.el };
  }

  /* ---------------- transport ---------------- */
  function play(index) {
    if (index != null) currentIndex = ((index % playlist.length) + playlist.length) % playlist.length;
    stop(false);
    ensureCtx();
    if (ctx.state === "suspended") ctx.resume();
    const track = playlist[currentIndex];
    current = track.type === "synth" ? startSynth(track) : startFile(track);
    playing = true;
    renderNowPlaying();
    renderPlaylist();
    startViz();
  }
  function stop(updateUI = true) {
    if (current) {
      if (current.type === "synth") current.stop();
      else if (current.type === "file") current.el.pause();
      current = null;
    }
    playing = false;
    if (updateUI) { renderNowPlaying(); renderPlaylist(); }
  }
  function togglePlay() { playing ? stop() : play(currentIndex); }
  function next() { play(currentIndex + 1); }
  function prev() { play(currentIndex - 1); }
  function setVolume(v) { ensureCtx(); masterGain.gain.value = v; }

  /* ---------------- import local files ---------------- */
  function importFiles(fileList) {
    Array.from(fileList).forEach(file => {
      if (!file.type.startsWith("audio/")) return;
      playlist.push({
        id: "file-" + Date.now() + Math.random().toString(36).slice(2, 6),
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: "Imported from your device",
        type: "file",
        url: URL.createObjectURL(file),
        el: null
      });
    });
    renderPlaylist();
  }

  /* ---------------- visualizer ---------------- */
  function startViz() {
    if (!ui) return;
    const canvas = ui.canvas, cctx = canvas.getContext("2d");
    const data = new Uint8Array(analyser.frequencyBinCount);
    cancelAnimationFrame(vizRAF);
    function draw() {
      vizRAF = requestAnimationFrame(draw);
      const w = canvas.width, h = canvas.height;
      cctx.clearRect(0, 0, w, h);
      if (!playing) return;
      analyser.getByteFrequencyData(data);
      const barW = w / data.length;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 255;
        const barH = v * h;
        const grad = cctx.createLinearGradient(0, h - barH, 0, h);
        grad.addColorStop(0, "#8b7fe8");
        grad.addColorStop(1, "#6ee7d8");
        cctx.fillStyle = grad;
        cctx.fillRect(i * barW, h - barH, barW - 1.5, barH);
      }
    }
    draw();
  }

  /* ---------------- rendering ---------------- */
  function fmtNowPlayingSub(track) {
    return track.type === "synth" ? "Live generative audio · loops forever" : track.artist;
  }

  function renderNowPlaying() {
    if (!ui) return;
    const track = playlist[currentIndex];
    ui.title.textContent = track.title;
    ui.artist.textContent = fmtNowPlayingSub(track);
    ui.playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
    ui.albumArt.innerHTML = track.type === "synth" ? ICONS.sliders : ICONS.wave;
    ui.progressWrap.style.visibility = track.type === "file" ? "visible" : "hidden";
  }

  function renderPlaylist() {
    if (!ui) return;
    ui.list.innerHTML = "";
    playlist.forEach((t, i) => {
      const row = document.createElement("div");
      row.className = "mus-row" + (i === currentIndex ? " active" : "");
      const rowIcon = (i === currentIndex && playing) ? ICONS.volumeHigh : (t.type === "synth" ? ICONS.sliders : ICONS.wave);
      row.innerHTML = `
        <span class="mus-row-icon">${rowIcon}</span>
        <span class="mus-row-text"><span class="mus-row-title">${t.title}</span><span class="mus-row-artist">${t.artist}</span></span>
      `;
      row.addEventListener("click", () => play(i));
      ui.list.appendChild(row);
    });
  }

  /* ---------------- progress bar (file tracks) ---------------- */
  function wireProgress() {
    setInterval(() => {
      if (!ui || !playing || !current || current.type !== "file") return;
      const el = current.el;
      if (!el.duration) return;
      const pct = (el.currentTime / el.duration) * 100;
      ui.progressFill.style.width = pct + "%";
      ui.timeLabel.textContent = `${fmtT(el.currentTime)} / ${fmtT(el.duration)}`;
    }, 400);
  }
  function fmtT(s) {
    s = Math.floor(s || 0);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  /* ---------------- window ---------------- */
  function open() {
    const existing = WM.findByAppId("music");
    if (existing) { WM.focusWindow(existing.meta.id); return existing.meta.id; }

    const root = document.createElement("div");
    root.className = "app-root mus-root";
    root.innerHTML = `
      <div class="mus-body">
        <div class="mus-sidebar">
          <div class="mus-sidebar-head">
            <span>Playlist</span>
            <button class="app-btn" data-act="import">${ICONS.add} Import</button>
            <input type="file" accept="audio/*" multiple style="display:none" data-act="file-input">
          </div>
          <div class="mus-list"></div>
        </div>
        <div class="mus-main">
          <canvas class="mus-canvas" width="480" height="160"></canvas>
          <div class="mus-art">${ICONS.sliders}</div>
          <div class="mus-title">—</div>
          <div class="mus-artist">—</div>
          <div class="mus-progress-wrap">
            <div class="mus-progress-track"><div class="mus-progress-fill"></div></div>
            <div class="mus-time">0:00 / 0:00</div>
          </div>
          <div class="mus-transport">
            <button class="mus-tbtn" data-act="prev">${ICONS.skipBack}</button>
            <button class="mus-tbtn mus-tbtn-main" data-act="play">${ICONS.play}</button>
            <button class="mus-tbtn" data-act="next">${ICONS.skipForward}</button>
          </div>
          <div class="mus-volume">
            <span>${ICONS.volumeLow}</span>
            <input type="range" min="0" max="1" step="0.01" value="0.55" data-act="volume">
            <span>${ICONS.volumeHigh}</span>
          </div>
        </div>
      </div>
    `;

    ui = {
      list: root.querySelector(".mus-list"),
      canvas: root.querySelector(".mus-canvas"),
      albumArt: root.querySelector(".mus-art"),
      title: root.querySelector(".mus-title"),
      artist: root.querySelector(".mus-artist"),
      playBtn: root.querySelector('[data-act="play"]'),
      progressWrap: root.querySelector(".mus-progress-wrap"),
      progressFill: root.querySelector(".mus-progress-fill"),
      timeLabel: root.querySelector(".mus-time"),
    };

    root.querySelector('[data-act="play"]').addEventListener("click", togglePlay);
    root.querySelector('[data-act="next"]').addEventListener("click", next);
    root.querySelector('[data-act="prev"]').addEventListener("click", prev);
    root.querySelector('[data-act="volume"]').addEventListener("input", (e) => setVolume(parseFloat(e.target.value)));
    root.querySelector('[data-act="import"]').addEventListener("click", () => root.querySelector('[data-act="file-input"]').click());
    root.querySelector('[data-act="file-input"]').addEventListener("change", (e) => importFiles(e.target.files));
    root.querySelector(".mus-progress-track").addEventListener("click", (e) => {
      if (!current || current.type !== "file") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      current.el.currentTime = pct * current.el.duration;
    });

    const winId = WM.createWindow({
      appId: "music", title: "Music", icon: ICONS.music,
      width: 640, height: 480, content: root,
      onClose: () => { stop(false); ui = null; cancelAnimationFrame(vizRAF); }
    });

    renderPlaylist();
    renderNowPlaying();
    wireProgress();
    return winId;
  }

  return { open };
})();
