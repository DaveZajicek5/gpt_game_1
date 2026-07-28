(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const canvas = $("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const screens = [...document.querySelectorAll(".screen")];
  const SAVE_KEY = "chimera-loop-save-v2";
  const RUN_SECONDS = 360;
  const BOSS_TIME = 315;
  const TAU = Math.PI * 2;

  const els = {
    hud: $("hud"), time: $("hud-time"), level: $("hud-level"), kills: $("hud-kills"),
    hpFill: $("hp-fill"), hpLabel: $("hp-label"), xpFill: $("xp-fill"), xpLabel: $("xp-label"),
    buildStrip: $("build-strip"), geneCount: $("gene-count"), labGeneCount: $("lab-gene-count"),
    bestTime: $("best-time"), bestKills: $("best-kills"), bossKills: $("boss-kills"),
    originGrid: $("origin-grid"), labGrid: $("lab-grid"), choiceGrid: $("choice-grid"),
    rerollCount: $("reroll-count"), rerollButton: $("reroll-button"), muteButton: $("mute-button"),
    resultTime: $("result-time"), resultKills: $("result-kills"), resultLevel: $("result-level"),
    resultGenes: $("result-genes"), resultBuild: $("result-build"), resultTitle: $("result-title"),
    resultEyebrow: $("result-eyebrow"), resultSubtitle: $("result-subtitle"),
    touchControls: $("touch-controls"), joystick: $("joystick"), joystickKnob: $("joystick").querySelector("i"),
    testOutput: $("test-output"), toastLayer: $("toast-layer")
  };

  const ORIGINS = {
    razorborn: {
      icon: "🦷", name: "Razorborn", color: "#ff6f9f",
      desc: "A fast predatory body that rewards close positioning and critical bursts.",
      bonuses: ["+18% movement speed", "+12% critical chance", "Short-range bone volley"],
      hp: 92, speed: 245, damage: 18, fireRate: 0.56, projectiles: 1, crit: 0.12, range: 460
    },
    mycelial: {
      icon: "🍄", name: "Mycelial Host", color: "#9dff7c",
      desc: "A durable fungal chassis that poisons crowds and recycles dead tissue.",
      bonuses: ["+24 maximum health", "Poison on hit", "Small healing pickups"],
      hp: 124, speed: 195, damage: 15, fireRate: 0.68, projectiles: 1, crit: 0.05, range: 500, poison: 4
    },
    voltling: {
      icon: "⚡", name: "Voltling", color: "#66d9ff",
      desc: "An unstable electrical organism with rapid attacks and chain discharges.",
      bonuses: ["+28% attack speed", "Shots arc to a second target", "+1 starting reroll"],
      hp: 98, speed: 220, damage: 14, fireRate: 0.42, projectiles: 1, crit: 0.07, range: 540, chain: 1
    }
  };

  const META = {
    carapace: { icon: "⬡", name: "Reinforced Carapace", max: 10, base: 8, desc: r => `Start every run with +${r * 6} maximum health.` },
    tendons: { icon: "⌁", name: "Fast-Twitch Tendons", max: 10, base: 8, desc: r => `Start every run with +${r * 2}% movement speed.` },
    cortex: { icon: "◉", name: "Expanded Cortex", max: 10, base: 10, desc: r => `Gain +${r * 3}% biomass from every source.` },
    instinct: { icon: "✦", name: "Predator Instinct", max: 10, base: 11, desc: r => `Start every run with +${(r * 1.5).toFixed(1)}% critical chance.` },
    adaptation: { icon: "⟳", name: "Adaptive Memory", max: 6, base: 14, desc: r => `Start with ${Math.floor((r + 1) / 2)} mutation reroll${Math.floor((r + 1) / 2) === 1 ? "" : "s"}.` },
    recycling: { icon: "♻", name: "Efficient Recycling", max: 8, base: 12, desc: r => `Recover +${r * 5}% more genes after each run.` }
  };

  const MUTATIONS = {
    boneNeedles: { icon: "🗡", name: "Bone Needles", rarity: "common", tags: ["projectile", "bone"], max: 5, desc: r => `Fire ${r + 1} needle${r ? "s" : ""}; each rank adds spread and +12% damage.` },
    adrenalGland: { icon: "💨", name: "Adrenal Gland", rarity: "common", tags: ["speed", "dash"], max: 5, desc: r => `Move ${12 + r * 8}% faster and reduce dash cooldown.` },
    venomSac: { icon: "☠", name: "Venom Sac", rarity: "uncommon", tags: ["poison", "damage-over-time"], max: 5, desc: r => `Hits inflict ${5 + r * 4} poison damage per second.` },
    twinHeart: { icon: "♥", name: "Twin Heart", rarity: "common", tags: ["health", "sustain"], max: 5, desc: r => `Gain ${22 + r * 12} maximum health and heal immediately.` },
    glassCore: { icon: "◇", name: "Glass Core", rarity: "rare", tags: ["critical", "damage"], max: 4, desc: r => `Gain ${12 + r * 8}% critical chance and +25% critical damage.` },
    voltaicNode: { icon: "ϟ", name: "Voltaic Node", rarity: "uncommon", tags: ["lightning", "chain"], max: 4, desc: r => `Shots arc to ${1 + r} additional target${r ? "s" : ""}.` },
    orbitingSpines: { icon: "✺", name: "Orbiting Spines", rarity: "rare", tags: ["orbit", "melee"], max: 4, desc: r => `${2 + r} spines orbit the body and shred nearby enemies.` },
    hungryCortex: { icon: "◌", name: "Hungry Cortex", rarity: "common", tags: ["growth", "biomass"], max: 5, desc: r => `Collect biomass from farther away and gain ${15 + r * 10}% more XP.` },
    bloodNova: { icon: "✹", name: "Blood Nova", rarity: "rare", tags: ["health", "area"], max: 4, desc: r => `Every 6 seconds erupt for ${30 + r * 18} area damage.` },
    predatoryMaw: { icon: "🦈", name: "Predatory Maw", rarity: "uncommon", tags: ["sustain", "kill"], max: 4, desc: r => `Heal ${1 + r} health every ${5 - Math.min(r, 3)} kills.` },
    rapidSynapse: { icon: "⌁", name: "Rapid Synapse", rarity: "common", tags: ["attack-speed", "projectile"], max: 5, desc: r => `Attack ${15 + r * 10}% faster.` },
    dashSpines: { icon: "➤", name: "Dash Spines", rarity: "uncommon", tags: ["dash", "impact"], max: 4, desc: r => `Dashing damages enemies for ${32 + r * 24}.` }
  };

  function defaultSave() {
    return { genes: 0, meta: Object.fromEntries(Object.keys(META).map(key => [key, 0])), bestTime: 0, bestKills: 0, bossKills: 0, runs: 0, muted: false };
  }

  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
      const base = defaultSave();
      return { ...base, ...(raw || {}), meta: { ...base.meta, ...(raw?.meta || {}) } };
    } catch {
      return defaultSave();
    }
  }

  let save = loadSave();
  let game = null;
  let lastOrigin = "razorborn";
  let animationId = 0;
  let lastFrame = performance.now();
  let screenW = innerWidth;
  let screenH = innerHeight;
  let dpr = 1;
  const keys = new Set();
  const touchMove = { x: 0, y: 0, active: false, pointerId: null };

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
    refreshMenu();
  }

  function formatTime(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function rand(min = 0, max = 1) { return min + Math.random() * (max - min); }
  function pick(array) { return array[Math.floor(Math.random() * array.length)]; }
  function distanceSq(a, b) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }

  function showScreen(id = null) {
    for (const screen of screens) screen.classList.toggle("visible", screen.id === id);
  }

  function toast(text) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = text;
    els.toastLayer.appendChild(node);
    setTimeout(() => node.remove(), 1700);
  }

  function refreshMenu() {
    els.geneCount.textContent = `${save.genes} gene${save.genes === 1 ? "" : "s"}`;
    els.labGeneCount.textContent = save.genes;
    els.bestTime.textContent = formatTime(save.bestTime);
    els.bestKills.textContent = save.bestKills;
    els.bossKills.textContent = save.bossKills;
    els.muteButton.textContent = save.muted ? "×" : "♪";
  }

  function renderOrigins() {
    els.originGrid.innerHTML = Object.entries(ORIGINS).map(([id, origin]) => `
      <button class="origin-card" data-origin="${id}" style="--origin:${origin.color}">
        <div class="origin-icon">${origin.icon}</div>
        <div class="eyebrow">STARTING BODY</div>
        <h3>${origin.name}</h3>
        <p>${origin.desc}</p>
        <div class="origin-bonus">${origin.bonuses.map(item => `<span>${item}</span>`).join("")}</div>
      </button>`).join("");
    els.originGrid.querySelectorAll("[data-origin]").forEach(button => {
      button.addEventListener("click", () => startRun(button.dataset.origin));
    });
  }

  function metaCost(key, rank) { return Math.ceil(META[key].base * (1 + rank * 0.65)); }

  function renderLab() {
    els.labGeneCount.textContent = save.genes;
    els.labGrid.innerHTML = Object.entries(META).map(([key, item]) => {
      const rank = save.meta[key];
      const maxed = rank >= item.max;
      const cost = metaCost(key, rank);
      return `<article class="lab-card">
        <div class="lab-card-top"><span class="lab-card-icon">${item.icon}</span><span class="lab-rank">RANK ${rank}/${item.max}</span></div>
        <h3>${item.name}</h3><p>${item.desc(rank)}</p>
        <button data-meta="${key}" ${maxed || save.genes < cost ? "disabled" : ""}>${maxed ? "MAXIMUM" : `EVOLVE · ${cost} GENES`}</button>
      </article>`;
    }).join("");
    els.labGrid.querySelectorAll("[data-meta]").forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.meta;
      const rank = save.meta[key];
      const cost = metaCost(key, rank);
      if (rank >= META[key].max || save.genes < cost) return;
      save.genes -= cost;
      save.meta[key]++;
      persist();
      renderLab();
      toast(`${META[key].name} evolved`);
    }));
  }

  function makePlayer(originId) {
    const origin = ORIGINS[originId];
    const maxHp = origin.hp + save.meta.carapace * 6;
    return {
      x: 0, y: 0, radius: 18, hp: maxHp, maxHp, speed: origin.speed * (1 + save.meta.tendons * 0.02),
      damage: origin.damage, fireRate: origin.fireRate, fireTimer: 0.2, projectiles: origin.projectiles,
      crit: origin.crit + save.meta.instinct * 0.015, critMult: 1.8, range: origin.range,
      poison: origin.poison || 0, chain: origin.chain || 0, level: 1, xp: 0, xpNext: 12,
      mutations: {}, kills: 0, dashCooldown: 0, dashTime: 0, dashX: 0, dashY: 0,
      invuln: 0, novaTimer: 4, killHealCounter: 0, magnet: 120, xpMult: 1 + save.meta.cortex * 0.03,
      lastMoveX: 1, lastMoveY: 0
    };
  }

  function startRun(originId = lastOrigin) {
    lastOrigin = originId;
    const player = makePlayer(originId);
    game = {
      mode: "playing", origin: originId, player, time: 0, spawnTimer: 0.2, bossSpawned: false,
      bossDefeated: false, enemies: [], projectiles: [], pickups: [], particles: [], texts: [],
      camera: { x: 0, y: 0 }, screenShake: 0, rerolls: Math.floor((save.meta.adaptation + 1) / 2),
      currentChoices: [], nextEnemyId: 1
    };
    els.hud.classList.remove("hidden");
    els.touchControls.classList.toggle("active", matchMedia("(pointer: coarse)").matches);
    showScreen(null);
    updateHud(true);
    toast(`${ORIGINS[originId].name} awakened`);
  }

  function mutationRank(id) { return game?.player.mutations[id] || 0; }
  function hasMutation(id) { return mutationRank(id) > 0; }

  function availableMutations() {
    return Object.entries(MUTATIONS).filter(([id, item]) => mutationRank(id) < item.max);
  }

  function rollChoices() {
    const pool = availableMutations();
    const choices = [];
    while (pool.length && choices.length < 3) {
      const weighted = pool.flatMap(entry => {
        const rarity = entry[1].rarity;
        return Array(rarity === "common" ? 5 : rarity === "uncommon" ? 3 : 1).fill(entry);
      });
      const selected = pick(weighted);
      choices.push(selected);
      pool.splice(pool.findIndex(([id]) => id === selected[0]), 1);
    }
    game.currentChoices = choices;
    renderChoices();
  }

  function renderChoices() {
    els.rerollCount.textContent = `${game.rerolls} reroll${game.rerolls === 1 ? "" : "s"}`;
    els.rerollButton.disabled = game.rerolls <= 0;
    els.choiceGrid.innerHTML = game.currentChoices.map(([id, item]) => {
      const rank = mutationRank(id);
      return `<button class="choice-card" data-mutation="${id}">
        <div class="choice-icon">${item.icon}</div><div class="rarity">${item.rarity}</div>
        <h3>${item.name}</h3><p>${item.desc(rank)}</p>
        <div class="tag-list">${item.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
        <div class="rank-line">RANK ${rank} → ${rank + 1}</div>
      </button>`;
    }).join("");
    els.choiceGrid.querySelectorAll("[data-mutation]").forEach(button => button.addEventListener("click", () => chooseMutation(button.dataset.mutation)));
  }

  function chooseMutation(id) {
    const player = game.player;
    const oldRank = mutationRank(id);
    player.mutations[id] = oldRank + 1;
    if (id === "twinHeart") {
      const gain = 22 + oldRank * 12;
      player.maxHp += gain;
      player.hp += gain;
    }
    game.mode = "playing";
    showScreen(null);
    updateHud(true);
    toast(`${MUTATIONS[id].name} · rank ${oldRank + 1}`);
    if (player.xp >= player.xpNext) triggerLevelUp();
  }

  function triggerLevelUp() {
    if (!game || game.mode !== "playing") return;
    const player = game.player;
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = Math.floor(12 * Math.pow(1.28, player.level - 1));
    game.mode = "levelup";
    rollChoices();
    showScreen("level-screen");
    updateHud(true);
  }

  function spawnEnemy(type = null) {
    const p = game.player;
    const angle = rand(0, TAU);
    const distance = rand(Math.max(screenW, screenH) * 0.58, Math.max(screenW, screenH) * 0.82);
    const elapsed = game.time;
    let chosen = type;
    if (!chosen) {
      const roll = Math.random();
      chosen = elapsed > 150 && roll < 0.18 ? "brute" : elapsed > 70 && roll < 0.38 ? "dart" : "crawler";
    }
    const scale = 1 + elapsed / 190;
    const data = chosen === "brute"
      ? { radius: 28, hp: 75 * scale, speed: 62 + elapsed * 0.08, damage: 18, color: "#ff8f70", xp: 6 }
      : chosen === "dart"
        ? { radius: 13, hp: 24 * scale, speed: 155 + elapsed * 0.12, damage: 11, color: "#ffd76a", xp: 3 }
        : { radius: 17, hp: 34 * scale, speed: 92 + elapsed * 0.1, damage: 12, color: "#bf72ff", xp: 3 };
    game.enemies.push({ id: game.nextEnemyId++, type: chosen, x: p.x + Math.cos(angle) * distance, y: p.y + Math.sin(angle) * distance, maxHp: data.hp, ...data, poison: 0, poisonTime: 0, hitFlash: 0, dead: false });
  }

  function spawnBoss() {
    if (game.bossSpawned) return;
    game.bossSpawned = true;
    const p = game.player;
    game.enemies.push({ id: game.nextEnemyId++, type: "boss", x: p.x + 720, y: p.y, radius: 56, hp: 2400, maxHp: 2400, speed: 54, damage: 25, color: "#ff4b87", xp: 80, poison: 0, poisonTime: 0, hitFlash: 0, dead: false });
    toast("THE WARDEN HAS ENTERED");
  }

  function nearestEnemy(x, y, maxRange = Infinity, exclude = new Set()) {
    let best = null;
    let bestDist = maxRange * maxRange;
    for (const enemy of game.enemies) {
      if (enemy.dead || exclude.has(enemy.id)) continue;
      const d = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;
      if (d < bestDist) { best = enemy; bestDist = d; }
    }
    return best;
  }

  function fireVolley() {
    const p = game.player;
    const target = nearestEnemy(p.x, p.y, p.range);
    if (!target) return;
    const base = Math.atan2(target.y - p.y, target.x - p.x);
    const count = p.projectiles + Math.max(0, mutationRank("boneNeedles") - 1);
    const spread = 0.13;
    const damageMultiplier = 1 + mutationRank("boneNeedles") * 0.12;
    for (let i = 0; i < count; i++) {
      const angle = base + (i - (count - 1) / 2) * spread;
      game.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(angle) * 630, vy: Math.sin(angle) * 630, radius: 4, life: 1.25, damage: p.damage * damageMultiplier, pierce: 0, hit: new Set() });
    }
  }

  function dash() {
    if (!game || game.mode !== "playing") return;
    const p = game.player;
    if (p.dashCooldown > 0) return;
    let x = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0) + touchMove.x;
    let y = (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0) + touchMove.y;
    const length = Math.hypot(x, y);
    if (length < 0.1) { x = p.lastMoveX; y = p.lastMoveY; } else { x /= length; y /= length; }
    p.dashX = x; p.dashY = y; p.dashTime = 0.18; p.invuln = 0.28;
    p.dashCooldown = Math.max(0.55, 1.7 - mutationRank("adrenalGland") * 0.16);
    game.screenShake = 7;
  }

  function damageEnemy(enemy, amount, critical = false) {
    if (enemy.dead) return;
    enemy.hp -= amount;
    enemy.hitFlash = 0.08;
    game.texts.push({ x: enemy.x, y: enemy.y - enemy.radius, text: `${critical ? "✦ " : ""}${Math.round(amount)}`, life: 0.55, color: critical ? "#ffd76a" : "#eefdf8" });
    if (game.player.poison > 0 || hasMutation("venomSac")) {
      enemy.poison = Math.max(enemy.poison, game.player.poison + mutationRank("venomSac") * 4 + 1);
      enemy.poisonTime = 3;
    }
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    const p = game.player;
    p.kills++;
    p.killHealCounter++;
    const drops = enemy.type === "boss" ? 14 : enemy.type === "brute" ? 3 : 1;
    for (let i = 0; i < drops; i++) game.pickups.push({ x: enemy.x + rand(-18, 18), y: enemy.y + rand(-18, 18), xp: enemy.xp / drops, radius: 6, life: 20 });
    if (enemy.type === "boss") {
      game.bossDefeated = true;
      setTimeout(() => endRun(true), 600);
    }
    if (hasMutation("predatoryMaw")) {
      const every = Math.max(2, 5 - mutationRank("predatoryMaw"));
      if (p.killHealCounter >= every) { p.killHealCounter = 0; p.hp = Math.min(p.maxHp, p.hp + mutationRank("predatoryMaw") + 1); }
    }
    for (let i = 0; i < 8; i++) game.particles.push({ x: enemy.x, y: enemy.y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.25, 0.65), color: enemy.color, size: rand(2, 5) });
  }

  function damagePlayer(amount) {
    const p = game.player;
    if (p.invuln > 0 || game.mode !== "playing") return;
    p.hp -= amount;
    p.invuln = 0.55;
    game.screenShake = 12;
    if (p.hp <= 0) endRun(false);
  }

  function updatePlayer(dt) {
    const p = game.player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    let x = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0) + touchMove.x;
    let y = (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0) + touchMove.y;
    const length = Math.hypot(x, y);
    if (length > 0.05) { x /= length; y /= length; p.lastMoveX = x; p.lastMoveY = y; }
    const speedBoost = 1 + mutationRank("adrenalGland") * 0.08;
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashX * 760 * dt;
      p.y += p.dashY * 760 * dt;
      if (hasMutation("dashSpines")) {
        for (const enemy of game.enemies) if (!enemy.dead && distanceSq(p, enemy) < (p.radius + enemy.radius + 18) ** 2) damageEnemy(enemy, 8 + mutationRank("dashSpines") * 24);
      }
    } else {
      p.x += x * p.speed * speedBoost * dt;
      p.y += y * p.speed * speedBoost * dt;
    }

    const attackSpeed = 1 + mutationRank("rapidSynapse") * 0.1;
    p.fireTimer -= dt;
    if (p.fireTimer <= 0) { fireVolley(); p.fireTimer = p.fireRate / attackSpeed; }

    p.novaTimer -= dt;
    if (hasMutation("bloodNova") && p.novaTimer <= 0) {
      p.novaTimer = 6;
      const damage = 12 + mutationRank("bloodNova") * 18;
      for (const enemy of game.enemies) if (!enemy.dead && distanceSq(p, enemy) < 210 ** 2) damageEnemy(enemy, damage);
      game.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.5, color: "#ff6f9f", size: 90, ring: true });
    }

    const orbitRank = mutationRank("orbitingSpines");
    if (orbitRank) {
      const count = 1 + orbitRank;
      for (let i = 0; i < count; i++) {
        const angle = game.time * 2.2 + i / count * TAU;
        const ox = p.x + Math.cos(angle) * 72;
        const oy = p.y + Math.sin(angle) * 72;
        for (const enemy of game.enemies) if (!enemy.dead && (enemy.x - ox) ** 2 + (enemy.y - oy) ** 2 < (enemy.radius + 9) ** 2) damageEnemy(enemy, (8 + orbitRank * 3) * dt * 5);
      }
    }
  }

  function updateEnemies(dt) {
    const p = game.player;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      if (enemy.poisonTime > 0) {
        enemy.poisonTime -= dt;
        enemy.hp -= enemy.poison * dt;
        if (enemy.hp <= 0) { killEnemy(enemy); continue; }
      }
      const dx = p.x - enemy.x, dy = p.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      enemy.x += dx / length * enemy.speed * dt;
      enemy.y += dy / length * enemy.speed * dt;
      if (length < p.radius + enemy.radius) damagePlayer(enemy.damage);
    }
    game.enemies = game.enemies.filter(enemy => !enemy.dead);
  }

  function updateProjectiles(dt) {
    const p = game.player;
    for (const shot of game.projectiles) {
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
      for (const enemy of game.enemies) {
        if (enemy.dead || shot.hit.has(enemy.id)) continue;
        if ((enemy.x - shot.x) ** 2 + (enemy.y - shot.y) ** 2 < (enemy.radius + shot.radius) ** 2) {
          shot.hit.add(enemy.id);
          const critical = Math.random() < p.crit + mutationRank("glassCore") * 0.08;
          const amount = shot.damage * (critical ? p.critMult + mutationRank("glassCore") * 0.25 : 1);
          damageEnemy(enemy, amount, critical);
          let source = enemy;
          const chained = new Set([enemy.id]);
          for (let i = 0; i < p.chain + mutationRank("voltaicNode"); i++) {
            const next = nearestEnemy(source.x, source.y, 180, chained);
            if (!next) break;
            chained.add(next.id);
            damageEnemy(next, amount * 0.55, false);
            source = next;
          }
          shot.life = -1;
          break;
        }
      }
    }
    game.projectiles = game.projectiles.filter(shot => shot.life > 0);
  }

  function updatePickups(dt) {
    const p = game.player;
    p.magnet = 120 + mutationRank("hungryCortex") * 42;
    p.xpMult = (1 + save.meta.cortex * 0.03) * (1 + mutationRank("hungryCortex") * 0.1);
    for (const pickup of game.pickups) {
      pickup.life -= dt;
      const dx = p.x - pickup.x, dy = p.y - pickup.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < p.magnet) { pickup.x += dx / distance * 360 * dt; pickup.y += dy / distance * 360 * dt; }
      if (distance < p.radius + pickup.radius + 6) {
        pickup.life = -1;
        p.xp += pickup.xp * p.xpMult;
      }
    }
    game.pickups = game.pickups.filter(pickup => pickup.life > 0);
    if (p.xp >= p.xpNext && game.mode === "playing") triggerLevelUp();
  }

  function updateEffects(dt) {
    for (const particle of game.particles) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; }
    for (const text of game.texts) { text.y -= 34 * dt; text.life -= dt; }
    game.particles = game.particles.filter(item => item.life > 0);
    game.texts = game.texts.filter(item => item.life > 0);
  }

  function update(dt) {
    if (!game || game.mode !== "playing") return;
    game.time += dt;
    if (game.time >= BOSS_TIME) spawnBoss();
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0 && !game.bossDefeated) {
      const count = 1 + Math.floor(game.time / 95);
      for (let i = 0; i < count; i++) spawnEnemy();
      game.spawnTimer = Math.max(0.18, 0.82 - game.time / 700) * rand(0.75, 1.2);
    }
    updatePlayer(dt); updateEnemies(dt); updateProjectiles(dt); updatePickups(dt); updateEffects(dt);
    game.camera.x += (game.player.x - game.camera.x) * Math.min(1, dt * 8);
    game.camera.y += (game.player.y - game.camera.y) * Math.min(1, dt * 8);
    game.screenShake = Math.max(0, game.screenShake - dt * 24);
    updateHud();
  }

  function worldToScreen(x, y, shakeX = 0, shakeY = 0) {
    return { x: x - game.camera.x + screenW / 2 + shakeX, y: y - game.camera.y + screenH / 2 + shakeY };
  }

  function drawBackground(shakeX, shakeY) {
    ctx.fillStyle = "#070a14";
    ctx.fillRect(0, 0, screenW, screenH);
    const spacing = 72;
    const ox = ((-game.camera.x * 0.2) % spacing + spacing) % spacing + shakeX;
    const oy = ((-game.camera.y * 0.2) % spacing + spacing) % spacing + shakeY;
    ctx.strokeStyle = "rgba(119,255,189,.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ox; x < screenW; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, screenH); }
    for (let y = oy; y < screenH; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(screenW, y); }
    ctx.stroke();
  }

  function draw() {
    if (!game) { ctx.fillStyle = "#070a14"; ctx.fillRect(0, 0, screenW, screenH); return; }
    const shakeX = game.screenShake ? rand(-game.screenShake, game.screenShake) : 0;
    const shakeY = game.screenShake ? rand(-game.screenShake, game.screenShake) : 0;
    drawBackground(shakeX, shakeY);

    for (const pickup of game.pickups) {
      const s = worldToScreen(pickup.x, pickup.y, shakeX, shakeY);
      ctx.fillStyle = "#77ffbd"; ctx.shadowBlur = 12; ctx.shadowColor = "#77ffbd";
      ctx.beginPath(); ctx.arc(s.x, s.y, pickup.radius, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }

    for (const shot of game.projectiles) {
      const s = worldToScreen(shot.x, shot.y, shakeX, shakeY);
      ctx.fillStyle = "#d9fff3"; ctx.shadowBlur = 10; ctx.shadowColor = "#77ffbd";
      ctx.beginPath(); ctx.arc(s.x, s.y, shot.radius, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }

    for (const enemy of game.enemies) {
      const s = worldToScreen(enemy.x, enemy.y, shakeX, shakeY);
      ctx.save(); ctx.translate(s.x, s.y);
      ctx.fillStyle = enemy.hitFlash > 0 ? "#fff" : enemy.color;
      ctx.shadowBlur = enemy.type === "boss" ? 30 : 12; ctx.shadowColor = enemy.color;
      ctx.beginPath();
      const points = enemy.type === "boss" ? 12 : enemy.type === "brute" ? 8 : 6;
      for (let i = 0; i < points; i++) {
        const angle = i / points * TAU;
        const radius = enemy.radius * (i % 2 ? 0.78 : 1);
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#100812"; ctx.beginPath(); ctx.arc(enemy.radius * 0.25, -enemy.radius * 0.15, Math.max(2, enemy.radius * 0.11), 0, TAU); ctx.fill();
      ctx.restore();
      if (enemy.type === "boss" || enemy.type === "brute") {
        const width = enemy.type === "boss" ? 150 : 48;
        ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(s.x - width / 2, s.y - enemy.radius - 14, width, 5);
        ctx.fillStyle = enemy.type === "boss" ? "#ff4b87" : "#ffd76a"; ctx.fillRect(s.x - width / 2, s.y - enemy.radius - 14, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 5);
      }
    }

    const p = game.player;
    const ps = worldToScreen(p.x, p.y, shakeX, shakeY);
    const orbitRank = mutationRank("orbitingSpines");
    if (orbitRank) {
      const count = 1 + orbitRank;
      ctx.fillStyle = "#66d9ff";
      for (let i = 0; i < count; i++) {
        const angle = game.time * 2.2 + i / count * TAU;
        ctx.save(); ctx.translate(ps.x + Math.cos(angle) * 72, ps.y + Math.sin(angle) * 72); ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, 6); ctx.lineTo(-4, 0); ctx.lineTo(-7, -6); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    ctx.save(); ctx.translate(ps.x, ps.y); ctx.rotate(Math.atan2(p.lastMoveY, p.lastMoveX));
    ctx.globalAlpha = p.invuln > 0 && Math.floor(game.time * 20) % 2 ? 0.35 : 1;
    ctx.fillStyle = ORIGINS[game.origin].color; ctx.shadowBlur = 26; ctx.shadowColor = ORIGINS[game.origin].color;
    ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.2, p.radius * 0.88, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "#07110f"; ctx.beginPath(); ctx.arc(7, -5, 3.2, 0, TAU); ctx.arc(7, 5, 3.2, 0, TAU); ctx.fill(); ctx.restore();

    for (const particle of game.particles) {
      const s = worldToScreen(particle.x, particle.y, shakeX, shakeY);
      ctx.globalAlpha = clamp(particle.life * 2, 0, 1); ctx.strokeStyle = particle.color; ctx.fillStyle = particle.color;
      if (particle.ring) { ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(s.x, s.y, particle.size * (1 - particle.life + 0.3), 0, TAU); ctx.stroke(); }
      else { ctx.fillRect(s.x, s.y, particle.size, particle.size); }
    }
    ctx.globalAlpha = 1;
    for (const text of game.texts) {
      const s = worldToScreen(text.x, text.y, shakeX, shakeY);
      ctx.globalAlpha = clamp(text.life * 2, 0, 1); ctx.fillStyle = text.color; ctx.font = "800 13px system-ui"; ctx.textAlign = "center"; ctx.fillText(text.text, s.x, s.y);
    }
    ctx.globalAlpha = 1;
  }

  function updateHud(force = false) {
    if (!game) return;
    const p = game.player;
    els.time.textContent = formatTime(game.time);
    els.level.textContent = p.level;
    els.kills.textContent = p.kills;
    els.hpFill.style.width = `${clamp(p.hp / p.maxHp * 100, 0, 100)}%`;
    els.hpLabel.textContent = `${Math.ceil(Math.max(0, p.hp))} / ${Math.ceil(p.maxHp)}`;
    els.xpFill.style.width = `${clamp(p.xp / p.xpNext * 100, 0, 100)}%`;
    els.xpLabel.textContent = `${Math.floor(p.xp)} / ${p.xpNext}`;
    if (force) els.buildStrip.innerHTML = Object.entries(p.mutations).map(([id, rank]) => `<span class="build-chip">${MUTATIONS[id].icon} ${MUTATIONS[id].name} ${rank}</span>`).join("");
    if (location.search.includes("autotest=1")) els.testOutput.textContent = JSON.stringify({ mode: game.mode, time: game.time, level: p.level, enemies: game.enemies.length, hp: p.hp });
  }

  function endRun(victory) {
    if (!game || game.mode === "gameover") return;
    game.mode = "gameover";
    const p = game.player;
    const baseGenes = Math.max(1, Math.floor(p.kills / 10) + Math.floor(game.time / 25) + (victory ? 35 : 0));
    const genes = Math.floor(baseGenes * (1 + save.meta.recycling * 0.05));
    save.genes += genes; save.runs++; save.bestTime = Math.max(save.bestTime, game.time); save.bestKills = Math.max(save.bestKills, p.kills);
    if (victory) save.bossKills++;
    persist();
    els.resultTime.textContent = formatTime(game.time); els.resultKills.textContent = p.kills; els.resultLevel.textContent = p.level; els.resultGenes.textContent = `+${genes}`;
    els.resultEyebrow.textContent = victory ? "WARDEN DISASSEMBLED" : "BODY TERMINATED";
    els.resultTitle.textContent = victory ? "The lab has a new apex specimen." : "The loop remembers.";
    els.resultSubtitle.textContent = victory ? "You survived the incubation cycle and harvested the Warden." : "Useful organs were stripped and converted into permanent research.";
    els.resultBuild.innerHTML = Object.entries(p.mutations).map(([id, rank]) => `<span class="build-chip">${MUTATIONS[id].icon} ${MUTATIONS[id].name} ${rank}</span>`).join("");
    els.hud.classList.add("hidden"); els.touchControls.classList.remove("active");
    showScreen("gameover-screen");
  }

  function pause() {
    if (!game) return;
    if (game.mode === "playing") { game.mode = "paused"; showScreen("pause-screen"); }
    else if (game.mode === "paused") { game.mode = "playing"; showScreen(null); }
  }

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    screenW = innerWidth; screenH = innerHeight;
    canvas.width = Math.floor(screenW * dpr); canvas.height = Math.floor(screenH * dpr);
    canvas.style.width = `${screenW}px`; canvas.style.height = `${screenH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(now) {
    const dt = Math.min(0.033, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    update(dt); draw();
    animationId = requestAnimationFrame(frame);
  }

  $("play-button").addEventListener("click", () => { renderOrigins(); showScreen("origin-screen"); });
  $("lab-button").addEventListener("click", () => { renderLab(); showScreen("lab-screen"); });
  $("help-button").addEventListener("click", () => showScreen("help-screen"));
  $("close-help-button").addEventListener("click", () => showScreen("menu-screen"));
  document.querySelectorAll('[data-back="menu"]').forEach(button => button.addEventListener("click", () => showScreen("menu-screen")));
  $("pause-button").addEventListener("click", pause);
  $("resume-button").addEventListener("click", pause);
  $("restart-button").addEventListener("click", () => startRun(lastOrigin));
  $("quit-button").addEventListener("click", () => { if (game) game.mode = "menu"; els.hud.classList.add("hidden"); els.touchControls.classList.remove("active"); renderLab(); showScreen("lab-screen"); });
  $("again-button").addEventListener("click", () => startRun(lastOrigin));
  $("result-lab-button").addEventListener("click", () => { renderLab(); showScreen("lab-screen"); });
  $("result-menu-button").addEventListener("click", () => showScreen("menu-screen"));
  $("reroll-button").addEventListener("click", () => { if (game?.rerolls > 0) { game.rerolls--; rollChoices(); } });
  $("reset-save-button").addEventListener("click", () => { if (confirm("Reset all CHIMERA LOOP progress?")) { save = defaultSave(); persist(); renderLab(); } });
  els.muteButton.addEventListener("click", () => { save.muted = !save.muted; persist(); });

  addEventListener("keydown", event => {
    keys.add(event.code);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "Space" && !event.repeat) dash();
    if (event.code === "Escape" && !event.repeat) pause();
    if (event.code === "KeyM" && !event.repeat) { save.muted = !save.muted; persist(); }
  });
  addEventListener("keyup", event => keys.delete(event.code));
  addEventListener("resize", resize);
  addEventListener("blur", () => { if (game?.mode === "playing") pause(); });

  function updateJoystick(event) {
    const rect = els.joystick.getBoundingClientRect();
    let x = event.clientX - (rect.left + rect.width / 2);
    let y = event.clientY - (rect.top + rect.height / 2);
    const max = rect.width * 0.32;
    const length = Math.hypot(x, y) || 1;
    if (length > max) { x = x / length * max; y = y / length * max; }
    touchMove.x = x / max; touchMove.y = y / max;
    els.joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
  }
  els.joystick.addEventListener("pointerdown", event => { touchMove.active = true; touchMove.pointerId = event.pointerId; els.joystick.setPointerCapture(event.pointerId); updateJoystick(event); });
  els.joystick.addEventListener("pointermove", event => { if (touchMove.active && event.pointerId === touchMove.pointerId) updateJoystick(event); });
  const clearJoystick = event => { if (event.pointerId !== touchMove.pointerId) return; touchMove.active = false; touchMove.x = 0; touchMove.y = 0; touchMove.pointerId = null; els.joystickKnob.style.transform = "translate(0, 0)"; };
  els.joystick.addEventListener("pointerup", clearJoystick); els.joystick.addEventListener("pointercancel", clearJoystick);
  $("touch-dash").addEventListener("pointerdown", event => { event.preventDefault(); dash(); });

  resize(); refreshMenu(); renderOrigins(); renderLab(); showScreen("menu-screen");
  cancelAnimationFrame(animationId); animationId = requestAnimationFrame(frame);

  if (new URLSearchParams(location.search).has("autotest")) setTimeout(() => startRun("razorborn"), 50);
})();
