(() => {
  "use strict";

  const app = document.getElementById("app");
  const gameCanvas = document.getElementById("game");
  const buildStrip = document.getElementById("build-strip");
  const hudTime = document.getElementById("hud-time");
  if (!app || !gameCanvas || !buildStrip) return;

  const canvas = document.createElement("canvas");
  canvas.id = "visual-layer";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute", inset: "0", width: "100%", height: "100%",
    zIndex: "1", pointerEvents: "none", mixBlendMode: "screen"
  });
  app.insertBefore(canvas, app.querySelector(".hud"));
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0, dpr = 1;
  let last = performance.now();
  const motes = Array.from({ length: 90 }, (_, i) => ({
    x: Math.random(), y: Math.random(), size: 0.5 + Math.random() * 2.2,
    drift: 0.015 + Math.random() * 0.045, phase: Math.random() * Math.PI * 2,
    layer: i % 3
  }));

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize); resize();

  function seconds() {
    const value = hudTime?.textContent || "00:00";
    const [m, s] = value.split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  }

  function mutations() {
    return [...buildStrip.querySelectorAll(".build-chip")].map(node => node.textContent.toLowerCase()).join(" ");
  }

  function biome(t) {
    if (t < 120) return { a: "#10263a", b: "#122018", glow: "#66d9ff", accent: "#77ffbd", name: "SUNKEN NURSERY" };
    if (t < 240) return { a: "#2b122f", b: "#1c0d20", glow: "#ff6fb7", accent: "#bf72ff", name: "VISCERAL FOUNDRY" };
    return { a: "#291c08", b: "#090d19", glow: "#ffd76a", accent: "#ff667a", name: "WARDEN'S NULL" };
  }

  function blob(x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2, "0"));
    g.addColorStop(1, color + "00");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function drawTerrain(now, bio) {
    const px = now * 0.006;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, bio.a + "52"); grad.addColorStop(0.55, "#00000000"); grad.addColorStop(1, bio.b + "66");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

    for (let layer = 0; layer < 3; layer++) {
      ctx.strokeStyle = layer === 0 ? bio.glow + "18" : bio.accent + (layer === 1 ? "12" : "0b");
      ctx.lineWidth = 1 + layer;
      const spacing = 120 + layer * 90;
      const off = (px * (layer + 1) * 11) % spacing;
      ctx.beginPath();
      for (let x = -spacing + off; x < w + spacing; x += spacing) {
        ctx.moveTo(x, 0);
        for (let y = 0; y <= h; y += 32) ctx.lineTo(x + Math.sin(y * 0.018 + now * 0.0005 + layer) * (12 + layer * 9), y);
      }
      ctx.stroke();
    }

    blob(w * 0.18 + Math.sin(now * 0.0002) * 80, h * 0.28, Math.min(w, h) * 0.42, bio.glow, 0.12);
    blob(w * 0.78 + Math.cos(now * 0.00017) * 90, h * 0.72, Math.min(w, h) * 0.46, bio.accent, 0.09);
    ctx.restore();
  }

  function drawMotes(now, bio) {
    ctx.save();
    for (const mote of motes) {
      const parallax = 0.35 + mote.layer * 0.25;
      let x = (mote.x * w + now * mote.drift * parallax) % (w + 30) - 15;
      let y = (mote.y * h + Math.sin(now * 0.0007 + mote.phase) * 25 * parallax + h) % h;
      ctx.globalAlpha = 0.12 + mote.layer * 0.08 + Math.sin(now * 0.002 + mote.phase) * 0.04;
      ctx.fillStyle = mote.layer === 2 ? bio.accent : bio.glow;
      ctx.beginPath(); ctx.arc(x, y, mote.size * (1 + mote.layer * 0.45), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawBodyMorph(now, text, bio) {
    const x = w / 2, y = h / 2;
    const pulse = 1 + Math.sin(now * 0.006) * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.75;

    if (text.includes("bone needles") || text.includes("dash spines")) {
      ctx.strokeStyle = "#eefdf8"; ctx.lineWidth = 2;
      const count = text.includes("orbiting spines") ? 10 : 7;
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2 + now * 0.0004;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 18); ctx.lineTo(Math.cos(a) * 42 * pulse, Math.sin(a) * 35 * pulse); ctx.stroke();
      }
    }

    if (text.includes("venom sac")) {
      for (let i = 0; i < 5; i++) blob(Math.cos(i * 1.7 + now * 0.001) * 28, Math.sin(i * 1.3 + now * 0.0014) * 20, 13, "#9dff7c", 0.22);
    }

    if (text.includes("voltaic node")) {
      ctx.strokeStyle = "#66d9ff"; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + now * 0.001;
        ctx.moveTo(Math.cos(a) * 23, Math.sin(a) * 17);
        ctx.lineTo(Math.cos(a + 0.18) * (34 + Math.sin(now * 0.012 + i) * 8), Math.sin(a + 0.18) * (28 + Math.cos(now * 0.01 + i) * 6));
      }
      ctx.stroke();
    }

    if (text.includes("twin heart") || text.includes("blood nova")) {
      ctx.strokeStyle = "#ff6fb7"; ctx.lineWidth = 3; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(0, 0, 31 + Math.sin(now * 0.01) * 5, 0, Math.PI * 2); ctx.stroke();
    }

    if (text.includes("glass core")) {
      ctx.rotate(now * 0.0006); ctx.strokeStyle = "#ffd76a"; ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const px = Math.cos(a) * 30, py = Math.sin(a) * 30; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke();
    }

    if (text.includes("predatory maw")) {
      ctx.strokeStyle = bio.accent; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(13, 0, 15, -0.75, 0.75); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBiomeLabel(t, bio) {
    if (t < 8 || (t > 118 && t < 127) || (t > 238 && t < 247)) {
      const phase = t < 8 ? t : t < 127 ? t - 118 : t - 238;
      const alpha = Math.sin(Math.min(1, phase / 8) * Math.PI);
      ctx.save(); ctx.globalAlpha = alpha * 0.55; ctx.textAlign = "center";
      ctx.fillStyle = bio.glow; ctx.font = "900 11px system-ui"; ctx.fillText("BIOME TRANSITION", w / 2, h * 0.18 - 18);
      ctx.fillStyle = "#eefdf8"; ctx.font = "1000 28px system-ui"; ctx.fillText(bio.name, w / 2, h * 0.18 + 14); ctx.restore();
    }
  }

  function frame(now) {
    const dt = Math.min(50, now - last); last = now;
    void dt;
    ctx.clearRect(0, 0, w, h);
    const t = seconds();
    const active = !document.getElementById("hud")?.classList.contains("hidden");
    if (active) {
      const bio = biome(t);
      drawTerrain(now, bio); drawMotes(now, bio); drawBodyMorph(now, mutations(), bio); drawBiomeLabel(t, bio);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();