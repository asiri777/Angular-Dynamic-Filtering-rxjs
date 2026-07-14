# AGENTS.md

## Cursor Cloud specific instructions

This is a single client-side **Angular 21** app (dynamic filtering of US states with RxJS). There is no backend, database, or external service — the only runtime is the Angular dev server.

### Node version (important)
Angular 21 requires Node.js `^20.19` || `^22.12` || `>=24`. Node 22 is installed via `nvm` and set as the nvm default (`nvm alias default 22`), so `node`/`npm` resolve to a compatible v22 automatically. If a command fails complaining about the Node version, confirm with `node --version` (should be `v22.x`) and re-select with `. "$HOME/.nvm/nvm.sh" && nvm use 22`. The update script re-establishes this on startup.

### Commands (npm scripts in `package.json`)
- Dev server: `npm start` (serves at `http://localhost:4200`). Use `npm start -- --host 0.0.0.0 --port 4200` when it must be reachable outside localhost.
- Build: `npm run build` (esbuild `@angular/build:application` builder; output in `dist/`).
- Lint: `npm run lint` (ESLint via `angular-eslint`, flat config in `eslint.config.js`).
- Unit tests: `npm test`. Uses Angular's `@angular/build:unit-test` builder backed by **Vitest** + jsdom — it runs headless in Node, so no browser/Chrome is required.

### Project conventions (modern Angular)
- Standalone components only (no `NgModule`); bootstrapped in `src/main.ts` via `bootstrapApplication` with `src/app/app.config.ts`.
- The root component is `src/app/app.ts` (class `App`, selector `app-root`) with `app.html` / `app.css`; state data lives in `src/app/shared/state.ts`.
- Templates use built-in control flow (`@for`/`@if`), not `*ngFor`/`*ngIf`.
- Static assets go in `public/` (served at the root), not `src/assets`.
