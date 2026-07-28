# CHIMERA LOOP

A polished, no-build browser action roguelite about evolving deliberately broken builds.

## Play

Open `index.html`, or run a local static server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Controls

- **WASD / arrow keys** — move
- **Space** — dash
- **Esc** — pause
- **M** — mute
- Touch controls appear automatically on touch devices.

## Beta features

- Six-minute escalating runs and a final boss
- Three starting origins
- 21 rankable mutations
- Six apex fusions with prerequisite synergies
- Multiple genuinely different build families: projectile, poison, lightning, orbit, melee/dash, fungal sustain, blood nova, and summons
- Permanent Genome Lab metaprogression saved in `localStorage`
- Programmatic graphics, particles, screen effects, and Web Audio sound effects
- Responsive desktop/mobile UI
- GitHub Pages deployment workflow

## Design direction

The game targets the appeal of modern indie action roguelites: fast power growth, absurd build interactions, frequent meaningful choices, and enough permanent progression to make failed runs useful without replacing player skill.

## Debug smoke test

Visit `?autotest=1`. The game auto-starts and writes a live JSON snapshot into `#test-output`, which is useful for headless browser checks.
