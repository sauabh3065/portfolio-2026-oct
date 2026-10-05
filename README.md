# Saurabh Rawat — React portfolio

A responsive React + TypeScript portfolio with an interactive Three.js dragon battle, project details, career timeline, skills, LinkedIn and email links, and resume download.

## Run locally

Use Node.js 22.13 or newer and pnpm 11.

```bash
npm install -g pnpm@11
pnpm install
pnpm dev
```

Open the local URL printed by the development server. The hosted project uses Vinext (React with the Next.js App Router API) and Vite, with Cloudflare-compatible deployment support. No API keys are needed for the portfolio. The email button opens your mail application; no email server is configured or required.

```bash
pnpm build
```

## Edit

- `app/page.tsx`: professional content, projects, experience, skills, links.
- `app/globals.css`: responsive layout, colors, typography, transitions.
- `app/room.tsx`: grounded idle, Fight/Pause/Resume/Fight Again controls, winner announcement, loading/retry, and reduced-motion support.
- `lib/dragon-scene.ts`: arena, simulation clock, restrained breath effects, lighting, shadows, and rotation controls.
- `lib/dragon-model.ts`: rigged model, animation blending, grounded crouch IK, materials, and scale detail.
- `lib/dragon-flight.ts`: smooth crouch, wing opening, and takeoff.
- `lib/dragon-combat.ts`: seeded 39-second choreography, health, attack windows, fatigue, and permanent round resolution.
- `lib/dragon-combat-rig.ts`: skeletal attack targeting, contact checks, body separation, and landing.
- `public/models/dragon/`: rigged dragon and its CC BY-SA 4.0 attribution.
- `app/layout.tsx`: title, description, favicon metadata.
- `public/Saurabh_Rawat_Resume.pdf`: downloadable resume.
- `public/models/room.glb`: retained original room model; no longer loaded by the hero.

Mobile navigation and project details are controlled with React state. Copy email uses the browser Clipboard API. Rendering pauses when the dragon scene is offscreen or the document is hidden. Dragons stay grounded until Fight is pressed. Pause freezes the simulation clock and camera interaction; Resume continues the same timeline. Reduced motion suppresses idle animation and never auto-starts combat. Each round lasts approximately 39 seconds of active simulation, with either dragon cast in the winning role. Blocks and dodges do no damage; physical hits use deformed claw, tooth, and tail vertices against torso capsules, and breath uses the visible stream segment. A knockout disables further attacks, plays a landing/collapse and victory roar, then offers Fight Again. Replay creates fresh health, timing, effects, and poses.

Work history and numerical achievements are taken from the supplied resume, including its current-role designation. Replace them here as your experience changes. Live project and GitHub profile URLs were not provided, so the portfolio uses project details instead of invented links. Project visuals are architecture concepts.

## Standalone Vite option

If you prefer a plain React/Vite static site, the included `standalone/` folder provides a separate entry and Vite configuration. Follow `standalone/README.md` to use the same components and assets without the hosting integration.

Dragon choreography checks: `pnpm test:dragons` (takeoff, grounding, stable idle rig, out-of-range misses, real skeletal contacts, both winners, non-overlapping torso volumes, round duration, and reset).


pnpm dev:standalone