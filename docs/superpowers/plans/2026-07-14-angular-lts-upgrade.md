# Angular 8 → 21 LTS Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade this Angular 8.2.14 app to Angular 21 (the current LTS release, supported through May 2027), replace deprecated tooling (TSLint, Protractor), and modernize the code to standalone components, the built-in `@if`/`@for` control-flow syntax, and the esbuild/vite application builder.

**Architecture:** Angular does not support skipping majors — `ng update` only moves one major version at a time and each hop can carry its own breaking changes. The plan walks the dependency tree sequentially (8→9→10→11→12→13→14→15→16→17→18→19→20→21), verifying `build` + `test` + `lint` after every hop so a broken step is caught immediately and can be bisected. Tooling swaps (Protractor→Playwright, TSLint→ESLint) and modernization (standalone components, control flow, esbuild builder) are isolated into their own tasks so a version-bump failure is never entangled with a refactor.

**Tech Stack:** Angular 21, TypeScript (version managed by `ng update`), RxJS 7, Karma + Jasmine (unit tests, unchanged), Playwright (e2e, replacing Protractor), ESLint (replacing TSLint), npm.

## Global Constraints

- Upgrade one Angular major version at a time via `ng update @angular/core@N @angular/cli@N` — never skip a major.
- After every task: `npm run build` and `npm test -- --watch=false --browsers=ChromeHeadless` must both pass before committing.
- Target final version: Angular 21.x (latest patch resolved by npm at execution time — do not pin below `21.0.0`).
- Node.js in this environment is v24.14.0 — confirmed compatible with every version in the chain, no Node upgrade needed.
- Package manager is npm (`package-lock.json` present) — always use `ng update`/`npm`, not `yarn`.
- RxJS moves from `~6.4.0` to `^7.8.0` at the Angular 13 hop (Task 7) — fix the one deprecated multi-argument `combineLatest` call when this happens.
- TSLint is replaced by `@angular-eslint` at the Angular 12 hop (Task 6) — do not run `tslint`/`codelyzer` after that task.
- Protractor is replaced by Playwright (Task 2) before any core version bump begins, so no interim `ng update` step has to reconcile a deprecated e2e builder.
- Standalone components, `@if`/`@for` control flow, and the esbuild/vite application builder are deferred to dedicated tasks (16–18) after Angular 21 is reached — never mixed into a version-bump task.
- Karma/Jasmine stays as the unit test runner — do not migrate to Vitest.
- Every task ends in its own commit. Never batch two tasks into one commit.

---

## Task 1: Fix the pre-existing broken baseline test, verify, commit

The unit spec currently asserts markup (`.content span` with "... app is running!") that does not exist in [app.component.html](src/app/app.component.html) — the real template is just the filter input and list. This test already fails on `master`, before any upgrade work starts. It must be fixed first, or every later "run tests to verify the hop didn't break anything" step in this plan is meaningless (a already-red suite can't tell you anything new broke).

**Files:**
- Modify: `src/app/app.component.spec.ts`

**Steps:**

- [ ] **Step 1: Confirm the test currently fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: The suite runs and `AppComponent > should render title` FAILS (its `.content span` selector returns `null`).

- [ ] **Step 2: Rewrite the spec to match the real component**

Replace the full contents of `src/app/app.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [ReactiveFormsModule],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'Angular-Dynamic-Filtering-rxjs'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('Angular-Dynamic-Filtering-rxjs');
  });

  it('should render the filter input', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.placeholder).toBe('Filter states...');
  });

  it('should render all states with an empty filter', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('li').length).toBe(56);
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS, 4 specs, 0 failures.

- [ ] **Step 4: Verify build still works**

Run: `npm run build`
Expected: Build succeeds, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/app.component.spec.ts
git commit -m "test: fix app.component.spec to match actual template

The spec asserted default CLI-scaffolded markup (.content span) that
was removed from app.component.html. This gives the upgrade a clean,
truthful test baseline to bisect against."
```

---

## Task 2: Replace Protractor e2e with Playwright

Protractor has been deprecated by the Angular team since 2022 and has no path forward through this upgrade. Doing this swap now (before any core version bump) means no later `ng update` step has to reconcile a broken `e2e` builder target in `angular.json`.

**Files:**
- Delete: `e2e/` (entire directory: `protractor.conf.js`, `src/app.e2e-spec.ts`, `src/app.po.ts`, `tsconfig.json`)
- Modify: `package.json` (remove `protractor`, `e2e` script; add Playwright)
- Modify: `angular.json` (remove the `e2e` architect target)
- Create: `playwright.config.ts`
- Create: `e2e/app.spec.ts`

**Steps:**

- [ ] **Step 1: Remove Protractor**

```bash
git rm -r e2e
npm uninstall protractor @types/jasminewd2
```

- [ ] **Step 2: Remove the `e2e` architect target from angular.json**

In `angular.json`, delete this whole block from `architect`:

```json
        "e2e": {
          "builder": "@angular-devkit/build-angular:protractor",
          "options": {
            "protractorConfig": "e2e/protractor.conf.js",
            "devServerTarget": "Angular-Dynamic-Filtering-rxjs:serve"
          },
          "configurations": {
            "production": {
              "devServerTarget": "Angular-Dynamic-Filtering-rxjs:serve:production"
            }
          }
        }
```

Also remove `"e2e/tsconfig.json"` from the `lint.options.tsConfig` array in the same file.

- [ ] **Step 3: Install Playwright**

```bash
npm init playwright@latest -- --quiet --browser=chromium --gitignore=false
```

When prompted, choose: TypeScript, tests folder `e2e`, do not add a GitHub Actions workflow (out of scope here), do not install browsers if it asks (run the explicit install in Step 4).

- [ ] **Step 4: Install the Playwright browser binary**

Run: `npx playwright install chromium`
Expected: Chromium downloads successfully.

- [ ] **Step 5: Point Playwright at `ng serve` and write the equivalent test**

Replace the generated `playwright.config.ts` with:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:4200',
  },
});
```

Replace `e2e/app.spec.ts` (delete any other generated example spec files in `e2e/`) with:

```ts
import { test, expect } from '@playwright/test';

test('filters the state list as the user types', async ({ page }) => {
  await page.goto('/');

  const items = page.locator('li');
  await expect(items).toHaveCount(56);

  await page.getByPlaceholder('Filter states...').fill('New');
  await expect(items).toHaveCount(4); // New Hampshire, New Jersey, New Mexico, New York
});
```

- [ ] **Step 6: Add an `e2e` npm script**

In `package.json`, replace `"e2e": "ng e2e"` with:

```json
    "e2e": "playwright test"
```

- [ ] **Step 7: Run the e2e test**

Run: `npm run e2e`
Expected: 1 passed.

- [ ] **Step 8: Run unit tests and build to confirm nothing else broke**

Run: `npm test -- --watch=false --browsers=ChromeHeadless && npm run build`
Expected: both succeed.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "test: replace deprecated Protractor e2e with Playwright"
```

---

## Task 3: Angular 8 → 9 (Ivy renderer)

Angular 9 makes the Ivy compiler/renderer the default. This is normally a transparent upgrade for app code; watch for template type-checking becoming stricter.

**Files:**
- Modify: `package.json`, `package-lock.json`, `angular.json`, `tsconfig*.json` (all touched automatically by the CLI's migration schematics)

**Steps:**

- [ ] **Step 1: Run the update**

Run: `ng update @angular/core@9 @angular/cli@9`
Expected: Completes, applying any bundled migration schematics automatically. Read its console output for manual-follow-up notes.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds. If template type-check errors appear, fix them in the flagged files (this app's only template is `app.component.html`).

- [ ] **Step 3: Test**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: 4 specs pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v9 (Ivy)"
```

---

## Task 4: Angular 9 → 10

TypeScript bumps to ~3.9, `tsconfig` gains stricter defaults, browserslist config updated. No app-code impact expected for this codebase.

**Steps:**

- [ ] **Step 1:** `ng update @angular/core@10 @angular/cli@10`
- [ ] **Step 2:** `npm run build` — expect success.
- [ ] **Step 3:** `npm test -- --watch=false --browsers=ChromeHeadless` — expect 4 passing specs.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v10"
```

---

## Task 5: Angular 10 → 11

TypeScript ~4.0, component test harnesses stabilize. No expected app-code impact.

**Steps:**

- [ ] **Step 1:** `ng update @angular/core@11 @angular/cli@11`
- [ ] **Step 2:** `npm run build` — expect success.
- [ ] **Step 3:** `npm test -- --watch=false --browsers=ChromeHeadless` — expect 4 passing specs.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v11"
```

---

## Task 6: Angular 11 → 12, and TSLint → ESLint

Angular 12 is the last major where TSLint/Codelyzer are still functional; the Angular team had already deprecated TSLint and stopped shipping it in new-project schematics. Do the ESLint migration in the same task since `angular-eslint`'s official conversion schematic is designed to run against a still-TSLint-configured project.

**Files:**
- Modify: `package.json`, `angular.json`
- Delete: `tslint.json`
- Create: `.eslintrc.json` (generated by the schematic)

**Steps:**

- [ ] **Step 1: Update Angular core/cli**

Run: `ng update @angular/core@12 @angular/cli@12`

- [ ] **Step 2: Build and test**

Run: `npm run build && npm test -- --watch=false --browsers=ChromeHeadless`
Expected: both succeed.

- [ ] **Step 3: Add ESLint and convert from TSLint**

```bash
ng add @angular-eslint/schematics
ng g @angular-eslint/schematics:convert-tslint-to-eslint --remove-tslint-if-no-more-tslint-targets
```

- [ ] **Step 4: Remove leftover TSLint packages if the schematic didn't**

Run: `npm uninstall tslint codelyzer` (skip if already removed by Step 3)

- [ ] **Step 5: Run the new lint target**

Run: `ng lint`
Expected: succeeds (fix any reported issues — this codebase is small enough that none are expected beyond formatting).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v12; replace TSLint with ESLint"
```

---

## Task 7: Angular 12 → 13, and RxJS 6 → 7

Angular 13 drops View Engine entirely (this app has been Ivy-only since Task 3, so no impact), removes IE11 support (informational only), and is the first version whose peer deps accept RxJS 7. Bump RxJS now and fix the one deprecated call site.

**Files:**
- Modify: `package.json`, `src/app/app.component.ts`

**Steps:**

- [ ] **Step 1: Update Angular core/cli and RxJS together**

Run: `ng update @angular/core@13 @angular/cli@13 rxjs@^7.8.0`

- [ ] **Step 2: Fix the deprecated multi-argument `combineLatest` call**

In `src/app/app.component.ts`, change:

```ts
    this.filteredStates$ = combineLatest(this.states$, this.filter$).pipe(
```

to:

```ts
    this.filteredStates$ = combineLatest([this.states$, this.filter$]).pipe(
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds with no RxJS deprecation warnings.

- [ ] **Step 4: Test**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: 4 specs pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v13; bump rxjs to ^7.8.0

combineLatest's multi-argument overload is deprecated in rxjs 7 —
switched to the array-argument form."
```

---

## Task 8: Angular 13 → 14

Reactive forms become generically typed by default for newly-created controls (`new FormControl('')` now infers `FormControl<string | null>`). Existing code keeps compiling because types are inferred, not required — this task exists to catch any new strictness errors early.

**Steps:**

- [ ] **Step 1:** `ng update @angular/core@14 @angular/cli@14`
- [ ] **Step 2:** `npm run build` — if a type error appears on `this.filter = new FormControl('')` or its usage, it means TypeScript inferred `FormControl<string>` and something downstream assumed `string | null`; fix by adjusting the affected expression's type, not by reintroducing `UntypedFormControl`.
- [ ] **Step 3:** `npm test -- --watch=false --browsers=ChromeHeadless` — expect 4 passing specs.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v14"
```

---

## Task 9: Angular 14 → 15

Standalone APIs stabilize (not adopted yet — deferred to Task 16), `NgOptimizedImage` ships (unused here), MDC-based Material lands (Material isn't a dependency of this app). No expected app-code impact.

**Steps:**

- [ ] **Step 1:** `ng update @angular/core@15 @angular/cli@15`
- [ ] **Step 2:** `npm run build` — expect success.
- [ ] **Step 3:** `npm test -- --watch=false --browsers=ChromeHeadless` — expect 4 passing specs.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v15"
```

---

## Task 10: Angular 15 → 16

Required `@Input()`s, Router functional guards, signals land as a developer preview (not adopted yet). No expected app-code impact since this app declares no inputs or routes.

**Steps:**

- [ ] **Step 1:** `ng update @angular/core@16 @angular/cli@16`
- [ ] **Step 2:** `npm run build` — expect success.
- [ ] **Step 3:** `npm test -- --watch=false --browsers=ChromeHeadless` — expect 4 passing specs.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v16"
```

---

## Task 11: Angular 16 → 17

The biggest hop in the chain: the esbuild/vite-based application builder and the `@if`/`@for`/`@switch` control-flow syntax both become available. **Do not adopt either yet** — Tasks 17 and 18 handle those deliberately once the version chain is finished. This task is only the dependency bump.

**Steps:**

- [ ] **Step 1:** `ng update @angular/core@17 @angular/cli@17`
Expected: the CLI may ask whether to migrate the build system now — answer **no**/skip if prompted, since that migration is handled explicitly in Task 18.
- [ ] **Step 2:** `npm run build` — expect success.
- [ ] **Step 3:** `npm test -- --watch=false --browsers=ChromeHeadless` — expect 4 passing specs.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v17"
```

---

## Task 12: Angular 17 → 18

Zoneless change detection ships as experimental (not adopted). Check `ng update`'s output for this specific hop against https://update.angular.io/?v=17.0-18.0 since some automatic migrations run here (e.g. `provideClientHydration` shape changes) that don't affect an app with no SSR/hydration setup, but confirm nothing else is flagged.

**Steps:**

- [ ] **Step 1:** `ng update @angular/core@18 @angular/cli@18`
- [ ] **Step 2:** `npm run build` — expect success.
- [ ] **Step 3:** `npm test -- --watch=false --browsers=ChromeHeadless` — expect 4 passing specs.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v18"
```

---

## Task 13: Angular 18 → 19

Standalone becomes the default for newly-generated code (irrelevant to existing NgModule-based code until Task 16). Check https://update.angular.io/?v=18.0-19.0 for this specific hop's automatic migrations and apply/verify them.

**Steps:**

- [ ] **Step 1:** `ng update @angular/core@19 @angular/cli@19`
- [ ] **Step 2:** `npm run build` — expect success.
- [ ] **Step 3:** `npm test -- --watch=false --browsers=ChromeHeadless` — expect 4 passing specs.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v19"
```

---

## Task 14: Angular 19 → 20

Check https://update.angular.io/?v=19.0-20.0 for this hop's specifics before running — the update guide is the source of truth for anything released after this plan was written.

**Steps:**

- [ ] **Step 1:** `ng update @angular/core@20 @angular/cli@20`
- [ ] **Step 2:** `npm run build` — expect success.
- [ ] **Step 3:** `npm test -- --watch=false --browsers=ChromeHeadless` — expect 4 passing specs.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v20"
```

---

## Task 15: Angular 20 → 21 (final core version — LTS target reached)

Check https://update.angular.io/?v=20.0-21.0 for this hop's specifics before running. After this task the app is on the target LTS major; Tasks 16–18 are modernization on top of it, not further version bumps.

**Steps:**

- [ ] **Step 1:** `ng update @angular/core@21 @angular/cli@21`
- [ ] **Step 2:** `npm run build` — expect success.
- [ ] **Step 3:** `npm test -- --watch=false --browsers=ChromeHeadless` — expect 4 passing specs.
- [ ] **Step 4:** `npm run e2e` — expect the Playwright spec from Task 2 to still pass.
- [ ] **Step 5:** Confirm `package.json` now resolves `@angular/core` to `^21.x`: `npm ls @angular/core`
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: upgrade Angular core/cli to v21 (LTS)"
```

---

## Task 16: Modernize — convert to standalone components

**Files:**
- Modify: `src/app/app.component.ts`, `src/main.ts`
- Delete: `src/app/app.module.ts`
- Modify: `src/app/app.component.spec.ts` (drop the now-unnecessary `declarations`/`imports` split)

**Steps:**

- [ ] **Step 1: Convert `AppComponent` to standalone**

In `src/app/app.component.ts`, change the decorator to:

```ts
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Observable, of, combineLatest } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { State, states } from './shared/State';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Angular-Dynamic-Filtering-rxjs';
  states$: Observable<State[]>;
  filteredStates$: Observable<State[]>;
  filter: FormControl;
  filter$: Observable<string>;

  constructor() {
    this.states$ = of(states);
    this.filter = new FormControl('');
    this.filter$ = this.filter.valueChanges.pipe(startWith(''));
    this.filteredStates$ = combineLatest([this.states$, this.filter$]).pipe(
      map(([statesList, filterString]) => statesList.filter(state => state.name.indexOf(filterString) !== -1))
    );
  }
}
```

(Note: `FormControl` still needs importing from `@angular/forms` — add it back to the import line: `import { FormControl, ReactiveFormsModule } from '@angular/forms';`.)

- [ ] **Step 2: Bootstrap without NgModule**

Replace `src/main.ts` with:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent)
  .catch(err => console.error(err));
```

- [ ] **Step 3: Delete the NgModule**

```bash
git rm src/app/app.module.ts
```

- [ ] **Step 4: Update the spec to test the standalone component directly**

In `src/app/app.component.spec.ts`, change the `TestBed.configureTestingModule` call from:

```ts
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [ReactiveFormsModule],
    }).compileComponents();
```

to:

```ts
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
```

(and drop the now-unused `ReactiveFormsModule` import from the spec file).

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: succeeds with no references to `AppModule` remaining anywhere (`grep -r AppModule src/` should return nothing).

- [ ] **Step 6: Test**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: 4 specs pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: convert AppComponent to standalone, drop AppModule"
```

---

## Task 17: Modernize — new `@for` control-flow syntax

**Files:**
- Modify: `src/app/app.component.html`

**Steps:**

- [ ] **Step 1: Replace `*ngFor` with `@for`**

Replace the contents of `src/app/app.component.html`:

```html
<input type="text" [formControl]="filter" placeholder="Filter states...">

<ul>
  @for (state of filteredStates$ | async; track state.abbreviation) {
    <li>{{state.name}}</li>
  }
</ul>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Test**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: 4 specs pass (the `querySelectorAll('li').length === 56` assertion from Task 1 still holds — `@for` renders the same DOM shape as `*ngFor`).

- [ ] **Step 4: Run e2e**

Run: `npm run e2e`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: replace *ngFor with the built-in @for control-flow syntax"
```

---

## Task 18: Modernize — esbuild/vite application builder

**Files:**
- Modify: `angular.json`

**Steps:**

- [ ] **Step 1: Attempt the automatic migration**

Run: `ng update @angular/cli@21 --migrate-only --from=20`
Expected: if not already applied, this may switch the `build`/`serve` architect targets. Check `angular.json` afterward.

- [ ] **Step 2: If `angular.json` still uses `@angular-devkit/build-angular:browser`, migrate it manually**

Replace the `architect.build` and `architect.serve` blocks in `angular.json` with the unified application builder:

```json
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/Angular-Dynamic-Filtering-rxjs",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": ["src/polyfills.ts"],
            "tsConfig": "tsconfig.app.json",
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "src/styles.css"
            ],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "2mb",
                  "maximumError": "5mb"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "6kb",
                  "maximumError": "10kb"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true,
              "namedChunks": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "Angular-Dynamic-Filtering-rxjs:build:production"
            },
            "development": {
              "buildTarget": "Angular-Dynamic-Filtering-rxjs:build:development"
            }
          },
          "defaultConfiguration": "development"
        },
```

Remove the old top-level `fileReplacements`/`aot`/`optimization`/etc. keys from the previous `build.options`/`build.configurations.production` if they're now duplicated by the block above — the `application` builder's schema differs slightly from `browser`'s, so let `ng build --configuration=production` surface any unknown-option errors and delete whatever it flags.

- [ ] **Step 3: Build (dev and prod)**

Run: `npm run build -- --configuration=development && npm run build -- --configuration=production`
Expected: both succeed.

- [ ] **Step 4: Serve smoke check**

Run: `npm start` (in background), then `curl -sf http://localhost:4200 | grep -q app-root` to confirm the dev server serves the app; stop the server afterward.

- [ ] **Step 5: Test**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: 4 specs pass (Karma/Jasmine is untouched by this builder change).

- [ ] **Step 6: Run e2e**

Run: `npm run e2e`
Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "build: migrate to the esbuild/vite application builder"
```

---

## Task 19: Final full verification pass

**Steps:**

- [ ] **Step 1: Clean install from lockfile**

Run: `rm -rf node_modules && npm ci`
Expected: succeeds with no peer-dependency warnings referencing anything below Angular 21.

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: succeeds, production configuration is the default (per Task 18).

- [ ] **Step 3: Full unit test run**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: 4 specs, 0 failures.

- [ ] **Step 4: Lint**

Run: `ng lint`
Expected: 0 errors.

- [ ] **Step 5: E2e**

Run: `npm run e2e`
Expected: 1 passed.

- [ ] **Step 6: Confirm final versions**

Run: `npm ls @angular/core @angular/cli rxjs`
Expected: `@angular/core` and `@angular/cli` both resolve to `21.x`, `rxjs` resolves to `7.x`.

- [ ] **Step 7: Update README if it references old commands/versions**

Read `README.md`; if it mentions `ng e2e`/Protractor or an old Angular version number, update it to reflect Playwright (`npm run e2e`) and Angular 21.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: final verification pass after Angular 8→21 LTS upgrade"
```
