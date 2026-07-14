# Angular 8 → 21 LTS Upgrade Implementation Plan (Rev 2: Fresh Scaffold + Port)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get this Angular 8.2.14 app onto Angular 21 (current LTS, supported through May 2027) by scaffolding a fresh Angular 21 project and porting the app's 6 source files into it, replacing all deprecated tooling (TSLint→ESLint, Protractor→Playwright, Karma→Vitest).

**Why Rev 2:** The original plan upgraded incrementally 8→9→…→21 via `ng update`. Execution of its first task surfaced two independent breakages of Angular 8's webpack-4-era tooling on Node 24 (OpenSSL-3 `createHash('md4')` rejection; a `SourceMapConsumer.with` API mismatch during ES5 differential loading). Each of the 13 hops risks more of the same. Since the app is ~6 source files, the user chose to pivot: scaffold Angular 21 fresh and port the code. The incremental history (Tasks 3–18 of Rev 1) is superseded.

**Architecture:** `ng new` (Angular 21 CLI, defaults: standalone components, esbuild application builder, Vitest, zoneless) into a scratch directory; swap the scaffold's project files into the repo root; port component/template/styles/data; port unit specs to Vitest; add Playwright e2e and angular-eslint. Git history is preserved (same repo, same branch — only the working tree contents change).

**Tech Stack:** Angular 21, TypeScript 5.9 (per scaffold), RxJS 7, Vitest (unit), Playwright (e2e), angular-eslint, npm.

## Global Constraints

- Target: latest Angular 21.x patch (resolved by npm at execution time; must satisfy `>=21.0.0 <22.0.0`).
- Node v24.14.0 is the environment — compatible with Angular 21 (requires `^20.19 || ^22.12 || ^24`). No Node changes.
- Package manager: npm.
- Scaffold with Angular CLI defaults for v21 (standalone, esbuild application builder, Vitest, zoneless) — do not opt back into NgModules, Karma, or zone.js.
- Preserve observable behavior of the app exactly: a text input filtering a 59-entry state list by case-sensitive substring match on `name` (`indexOf !== -1`). Do not "improve" the filter to case-insensitive.
- `src/app/shared/state.ts` has 59 entries (50 states + DC + 8 territories). All count assertions use 59.
- RxJS 7: `combineLatest` takes an array argument (`combineLatest([a$, b$])`) — the multi-arg form was removed.
- After every task: `npm run build` and `npm test` must pass before committing (plus `npm run e2e` where the task touches e2e, and `npm run lint` where it touches lint).
- Every task ends in its own commit. Never batch two tasks into one commit.
- Files to preserve at repo root through the swap: `.git/`, `docs/`, `README.md` (updated in Task D), `.claude/` and `.superpowers/` if present.

---

## Task A: Scaffold Angular 21 and swap it into the repo root

**Files:**
- Delete (old project files at repo root): `angular.json`, `package.json`, `package-lock.json`, `karma.conf.js`, `tslint.json`, `browserslist`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `e2e/` (whole dir), `src/` (whole dir), `node_modules/`
- Create (from scaffold): new `angular.json`, `package.json`, `package-lock.json`, `tsconfig*.json`, `src/`, `.editorconfig`, `.gitignore` (merge if repo already has one), `vitest.config.ts` or equivalent per scaffold output
- Preserve untouched: `.git/`, `docs/`, `README.md`, `.superpowers/`

**Steps:**

- [ ] **Step 1: Scaffold into a scratch directory**

From a scratch/temp directory (NOT the repo root):

```bash
npx --yes @angular/cli@21 new angular-dynamic-filtering-rxjs --directory=ng21-scaffold --style=css --routing=false --ssr=false --skip-git --package-manager=npm --defaults
```

`--defaults` suppresses interactive prompts (accepting v21 defaults: standalone, Vitest, zoneless, no AI config). If the command still prompts for anything, accept the default answer.

- [ ] **Step 2: Verify the scaffold works before swapping**

Inside the scaffold directory:

```bash
npm run build && npm test
```

Expected: build succeeds; the scaffold's generated spec passes under Vitest. Do not proceed if the pristine scaffold fails — report BLOCKED instead.

- [ ] **Step 3: Remove old project files from the repo root**

From the repo root, remove exactly: `angular.json`, `package.json`, `package-lock.json`, `karma.conf.js`, `tslint.json`, `browserslist`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `e2e/`, `src/`, `node_modules/`. Use `git rm -r` for tracked files so the deletions are staged. Do NOT touch `.git/`, `docs/`, `README.md`, `.superpowers/`, or any `.claude*` files.

- [ ] **Step 4: Copy scaffold contents into the repo root**

Copy everything from the scaffold directory (including dotfiles like `.editorconfig`, `.gitignore`, but excluding its `node_modules/`) into the repo root. If the repo already had a `.gitignore`, replace it with the scaffold's (the scaffold's is the correct one for the new toolchain).

- [ ] **Step 5: Install and verify in place**

From the repo root:

```bash
npm install
npm run build
npm test
```

Expected: all succeed (same result as Step 2, now in the repo).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat!: replace Angular 8 project shell with fresh Angular 21 scaffold

Incremental ng-update path (8->9->...->21) was abandoned after repeated
webpack-4-era tooling breakage on Node 24; the app's ~6 source files are
ported onto a clean v21 scaffold instead (standalone, esbuild, Vitest,
zoneless). App code is ported in the next commit."
```

Note: after this commit the app briefly shows scaffold placeholder content — that's expected; Task B ports the real app.

---

## Task B: Port the app code (component, template, styles, state data)

**Interfaces:**
- Consumes: the scaffold's generated `src/app/` (Angular 21 names files `app.ts`, `app.html`, `app.css`, `app.spec.ts` with class `App`).
- Produces: `App` class with public members `title: string`, `filteredStates$: Observable<State[]>`, `filter: FormControl<string>` — Task C's specs and Task D's e2e depend on the rendered DOM: one `input[type="text"]` with placeholder `Filter states...` and one `<li>` per matching state.

**Files:**
- Create: `src/app/shared/state.ts` (copied verbatim from the old project — 59-entry array + `State` interface; content is in git history at `src/app/shared/state.ts`, commit `a9b9e24`)
- Modify: `src/app/app.ts`, `src/app/app.html`, `src/app/app.css`, `src/app/app.spec.ts`

**Steps:**

- [ ] **Step 1: Restore the state data file from git history**

```bash
git show a9b9e24:src/app/shared/state.ts > src/app/shared/state.ts
```

(Create the `shared/` directory first if needed. Verify: the file exports `State` interface and `states` array with 59 entries — `grep -c '"name"' src/app/shared/state.ts` prints 59.)

- [ ] **Step 2: Port the component**

Replace the contents of `src/app/app.ts`:

```ts
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { State, states } from './shared/state';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'Angular-Dynamic-Filtering-rxjs';
  states$: Observable<State[]>;
  filteredStates$: Observable<State[]>;
  filter: FormControl<string>;
  filter$: Observable<string>;

  constructor() {
    this.states$ = of(states);
    this.filter = new FormControl('', { nonNullable: true });
    this.filter$ = this.filter.valueChanges.pipe(startWith(''));
    this.filteredStates$ = combineLatest([this.states$, this.filter$]).pipe(
      map(([statesList, filterString]) =>
        statesList.filter(state => state.name.indexOf(filterString) !== -1)
      )
    );
  }
}
```

Porting notes (behavior-preserving changes only):
- `combineLatest([...])` array form (RxJS 7).
- `FormControl<string>` with `{ nonNullable: true }` keeps `filter$` typed `Observable<string>` (v14+ typed forms); with a default `FormControl('')` the value type would be `string | null` and the `indexOf` call wouldn't compile.
- The old import `./shared/State` (capital S) worked only because Windows is case-insensitive; the port uses the real filename `./shared/state`.
- `AsyncPipe` must be imported explicitly — standalone components don't get `CommonModule` for free.

- [ ] **Step 3: Port the template with `@for`**

Replace the contents of `src/app/app.html`:

```html
<input type="text" [formControl]="filter" placeholder="Filter states...">

<ul>
  @for (state of filteredStates$ | async; track state.abbreviation) {
    <li>{{ state.name }}</li>
  }
</ul>
```

- [ ] **Step 4: Port the styles**

The old `src/app/app.component.css` was empty. Empty out the scaffold's `src/app/app.css` (delete any generated placeholder rules).

- [ ] **Step 5: Port the unit specs to Vitest**

Replace the contents of `src/app/app.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have as title 'Angular-Dynamic-Filtering-rxjs'`, () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.title).toBe('Angular-Dynamic-Filtering-rxjs');
  });

  it('should render the filter input', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.placeholder).toBe('Filter states...');
  });

  it('should render all 59 states with an empty filter', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('li').length).toBe(59);
  });

  it('should filter the list by substring as the filter value changes', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    fixture.componentInstance.filter.setValue('New');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const names = Array.from(compiled.querySelectorAll('li')).map(li => li.textContent?.trim());
    expect(names).toEqual(['New Hampshire', 'New Jersey', 'New Mexico', 'New York']);
  });
});
```

- [ ] **Step 6: Update `index.html` title if the scaffold set a different one**

In `src/index.html`, ensure `<title>` is `AngularDynamicFilteringRxjs` or similar scaffold output — leave as generated (no requirement binds it), just confirm the file parses.

- [ ] **Step 7: Build and test**

```bash
npm run build && npm test
```

Expected: build succeeds; 5 specs pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: port dynamic state-filter app onto the Angular 21 scaffold

Standalone App component, @for control flow, typed nonNullable
FormControl, RxJS 7 array-form combineLatest. Behavior unchanged:
case-sensitive substring filter over 59 states/territories."
```

---

## Task C: Playwright e2e

**Files:**
- Create: `playwright.config.ts`, `e2e/app.spec.ts`
- Modify: `package.json` (add `@playwright/test` devDependency and `e2e` script)

**Steps:**

- [ ] **Step 1: Install Playwright**

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

(Do not use `npm init playwright` — it scaffolds extras we don't want; the two files below are the whole setup.)

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:4200',
  },
});
```

- [ ] **Step 3: Create `e2e/app.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('filters the state list as the user types', async ({ page }) => {
  await page.goto('/');

  const items = page.locator('li');
  await expect(items).toHaveCount(59);

  await page.getByPlaceholder('Filter states...').fill('New');
  await expect(items).toHaveCount(4); // New Hampshire, New Jersey, New Mexico, New York

  await page.getByPlaceholder('Filter states...').fill('');
  await expect(items).toHaveCount(59);
});
```

- [ ] **Step 4: Add the npm script**

In `package.json` scripts: `"e2e": "playwright test"`.

- [ ] **Step 5: Exclude e2e specs from Vitest**

The scaffold's Vitest setup picks up `**/*.spec.ts`. Confirm `npm test` still runs only the 5 unit specs and does not try to execute `e2e/app.spec.ts` (Playwright tests crash under Vitest). If it does pick it up, scope the unit-test include pattern to `src/**/*.spec.ts` in the Vitest/angular.json test configuration.

- [ ] **Step 6: Run everything**

```bash
npm run e2e && npm test && npm run build
```

Expected: e2e 1 passed; unit 5 passed; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: add Playwright e2e covering the state filter flow"
```

---

## Task D: ESLint, README, final verification

**Files:**
- Create: `eslint.config.js` (generated by angular-eslint schematic)
- Modify: `package.json`, `angular.json` (lint target), `README.md`

**Steps:**

- [ ] **Step 1: Add angular-eslint**

```bash
ng add angular-eslint --skip-confirmation
```

- [ ] **Step 2: Lint and fix anything it reports**

```bash
npm run lint
```

Expected: 0 errors (fix any findings in the ported files; the component selector `app-root` and standalone patterns match the default rules).

- [ ] **Step 3: Update README**

Rewrite `README.md` to state: Angular 21, `npm start` (dev server), `npm test` (Vitest unit tests), `npm run e2e` (Playwright), `npm run lint` (ESLint), `npm run build`. Keep the project description (dynamic filtering with RxJS) from the old README if present.

- [ ] **Step 4: Clean-room verification**

```bash
rm -rf node_modules && npm ci
npm run build
npm test
npm run lint
npm run e2e
npm ls @angular/core rxjs typescript
```

Expected: all pass; `@angular/core` resolves to 21.x, `rxjs` to 7.x.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add angular-eslint, update README, final verification on Angular 21"
```
