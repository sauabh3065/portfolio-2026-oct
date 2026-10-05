# Saurabh Rawat — React portfolio

A responsive React + TypeScript portfolio with an interactive Three.js workspace, project details, career timeline, skills, LinkedIn and email links, and resume download.

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
- `app/room.tsx`: lazy-loaded Three.js scene, camera, lighting, mouse/touch/keyboard rotation.
- `app/layout.tsx`: title, description, favicon metadata.
- `public/Saurabh_Rawat_Resume.pdf`: downloadable resume.
- `public/models/room.glb`: model from the reference project (see ASSET_CREDITS.md).

Mobile navigation and project details are controlled with React state. Copy email uses the browser Clipboard API. Rendering pauses when the workspace is offscreen or the document is hidden. Intro animations respect reduced-motion preferences.

Work history and numerical achievements are taken from the supplied resume, including its current-role designation. Replace them here as your experience changes. Live project and GitHub profile URLs were not provided, so the portfolio uses project details instead of invented links. Project visuals are architecture concepts.

## Standalone Vite option

If you prefer a plain React/Vite static site, the included `standalone/` folder provides a separate entry and Vite configuration. Follow `standalone/README.md` to use the same components and assets without the hosting integration.
