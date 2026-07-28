(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const hud = document.getElementById("hud");
  if (!canvas || !hud) return;

  const activeKeys = new Set();
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let startedAt = 0;
  let dragging = false;

  const keyForAxis = {
    left: ["KeyA", "a"],
    right: ["KeyD", "d"],
    up: ["KeyW", "w"],
    down: ["KeyS", "s"]
  };

  function dispatch(code, key, type) {
    window.dispatchEvent(new KeyboardEvent(type, {
      code,
      key,
      bubbles: true,
      cancelable: true
    }));
  }

  function setDirection(name, enabled) {
    const [code, key] = keyForAxis[name];
    if (enabled && !activeKeys.has(code)) {
      activeKeys.add(code);
      dispatch(code, key, "keydown");
    } else if (!enabled && activeKeys.has(code)) {
      activeKeys.delete(code);
      dispatch(code, key, "keyup");
    }
  }

  function releaseMovement() {
    for (const [name] of Object.entries(keyForAxis)) setDirection(name, false);
  }

  function updateMovement(x, y) {
    const dx = x - startX;
    const dy = y - startY;
    const distance = Math.hypot(dx, dy);
    const deadZone = 14;

    if (distance < deadZone) {
      releaseMovement();
      return;
    }

    dragging = true;
    const nx = dx / distance;
    const ny = dy / distance;
    const axisThreshold = 0.28;
    setDirection("left", nx < -axisThreshold);
    setDirection("right", nx > axisThreshold);
    setDirection("up", ny < -axisThreshold);
    setDirection("down", ny > axisThreshold);
  }

  function tapAction() {
    dispatch("Space", " ", "keydown");
    dispatch("Space", " ", "keyup");
    if (navigator.vibrate) navigator.vibrate(18);
  }

  function gameIsActive() {
    return !hud.classList.contains("hidden");
  }

  canvas.addEventListener("pointerdown", event => {
    if (!gameIsActive() || pointerId !== null) return;
    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    startY = lastY = event.clientY;
    startedAt = performance.now();
    dragging = false;
    canvas.setPointerCapture?.(pointerId);
    event.preventDefault();
  }, { passive: false });

  canvas.addEventListener("pointermove", event => {
    if (event.pointerId !== pointerId) return;
    lastX = event.clientX;
    lastY = event.clientY;
    updateMovement(lastX, lastY);
    event.preventDefault();
  }, { passive: false });

  function finish(event) {
    if (event.pointerId !== pointerId) return;
    const distance = Math.hypot(lastX - startX, lastY - startY);
    const duration = performance.now() - startedAt;
    releaseMovement();
    pointerId = null;
    if (!dragging && distance < 14 && duration < 320 && gameIsActive()) tapAction();
    event.preventDefault();
  }

  canvas.addEventListener("pointerup", finish, { passive: false });
  canvas.addEventListener("pointercancel", finish, { passive: false });
  window.addEventListener("blur", releaseMovement);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseMovement();
  });

  document.documentElement.classList.add("gesture-controls-ready");
})();
