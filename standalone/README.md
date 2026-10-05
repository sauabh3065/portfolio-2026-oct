# Plain React + Vite mode

Run these commands from the main project folder after installing dependencies:

```bash
pnpm dev:standalone
pnpm build:standalone
pnpm preview:standalone
```

This mode uses the same React components, styles, and public assets with a plain Vite entry. It has no server or hosting dependency at runtime. Upload the generated `standalone-dist/` directory to your chosen static host. The site uses root-relative assets, so deploy it at the domain root. No secrets or API keys are needed.
