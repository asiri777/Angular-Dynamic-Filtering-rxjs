# AGENTS.md

## Cursor Cloud specific instructions

This is a single client-side **Angular 8** app (dynamic filtering of US states with RxJS). There is no backend, database, or external service — the only runtime is the Angular dev server.

### Node version (important)
Angular 8 / its build tooling does **not** run on modern Node (the VM's default `node` is v22). Node 12 is installed via `nvm` and set as the nvm default (`nvm alias default 12`), so `node`/`npm` resolve to v12 automatically. If a command fails with cryptic build/OpenSSL errors, confirm you are on Node 12: `node --version` should print `v12.x`. Re-select it with `. "$HOME/.nvm/nvm.sh" && nvm use 12` if needed. The update script re-establishes this on startup.

### Commands (all via npm scripts in `package.json`)
- Run dev server: `npm start` (serves at `http://localhost:4200`). Use `npm start -- --host 0.0.0.0 --port 4200` when it must be reachable outside localhost.
- Build: `npm run build`.
- Lint: `npm run lint`.
- Unit tests: `npm test`. Karma is configured to launch `Chrome`, which does not exist headless-by-default in this container. Run headless with a no-sandbox launcher, e.g. `CHROME_BIN=/usr/bin/google-chrome-stable npm test -- --browsers=ChromeHeadless --watch=false` (add a `ChromeHeadlessNoSandbox` custom launcher with `--no-sandbox` flags if Chrome fails to start as root).

### Known pre-existing issues (NOT environment problems — do not "fix" as setup)
- `ng lint` reports style violations in `src/app/shared/state.ts` (quote style / unnecessary quotes).
- The default scaffolded specs in `src/app/app.component.spec.ts` fail: they still assert the CLI starter template ("app is running!") and don't import `ReactiveFormsModule` for the `formControl` binding. The test runner + headless Chrome themselves work correctly.
