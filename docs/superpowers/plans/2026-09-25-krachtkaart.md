# Krachtkaart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A phone-first workout tracker, published as a private claude.ai artifact. You log Dutch speech via keyboard dictation, Claude parses it into sets, and a faceted body map shows strength (plate colours) and recovery.

**Architecture:**
- `index.html` holds markup, CSS and tabs.
- Three plain scripts, no framework, no build:
  - `score.js`: pure scoring logic, also loaded by Node tests.
  - `body.js`: the SVG figure.
  - `app.js`: state, `db`, `sample` and rendering.
- Data lives in the artifact `db`; Claude runs through `sample`.

**Tech Stack:**
- Vanilla JS (ES2020) and inline SVG.
- Google Fonts Archivo (wdth 62–125, wght 100–900).
- claude.ai runtime capabilities `db` and `sample` (contract 0.2.58).
- `node:assert` for tests (Node 24).

**Spec:** `docs/superpowers/specs/2026-09-25-krachtkaart-design.md`

## Global Constraints

- All UI copy in Dutch, sentence case, no all-caps labels, no em-dash asides, no emoji.
- Light theme only; `body` background `var(--ground)`; `color-scheme: light`.
- Tokens:
  - `--ground #EEF1F2`, `--surface #FFFFFF`, `--ink #1B2228`, `--steel #5B6770`, `--line #D5DBDF`.
  - Plates: `--p1 #FFFFFF` (Beginner), `--p2 #1E8A4B`, `--p3 #EFB21F`, `--p4 #1D5DB5`, `--p5 #D3302E`.
- No data on a muscle = hatch pattern. (Deviation from spec: a hatch instead of a dashed line, because dashed lines on small polygons read as noise.)
- Recovery tones: `--r0 #E3EBF1` Fris, `--r1 #8EA8BE` Herstellend, `--r2 #2E4A66` Moe.
- Scripts only from own files or cdnjs; no browser storage for data.
- Every `claude.use()` result may be `null`: hide AI buttons and show the db-less notice, never crash.
- Works at 360–430 px width, 16 px side gutter, bottom tab bar padded by `env(safe-area-inset-bottom)`.
- `prefers-reduced-motion`: no load animation.

## File structure

- `index.html`: title, font link, `<style>` tokens and layout, the five views, tab bar, hatch `<defs>`, script tags.
- `score.js`: catalog (exercises, standards, ladders, muscles) and pure functions. Exposes `window.Score` and `module.exports`.
- `score.test.js`: Node asserts on `score.js`.
- `body.js`: `Body.render(svg, view)` draws silhouette and muscle paths with `data-m` ids.
- `app.js`: boot, state, db subscriptions, `sample` prompts, per-view render functions.

---

### Task 1: Scoring logic (TDD)

**Files:** Create `score.js`, `score.test.js`

**Interfaces (produced):**
- `Score.MUSCLES`: `{id: label}` for 15 ids: `borst schouders biceps triceps onderarmen buik schuine trapezius rug onderrug billen quadriceps hamstrings kuiten adductoren`.
- `Score.LEVELS = ['', 'Beginner','Novice','Gemiddeld','Gevorderd','Elite']` (index = level).
- `Score.CATALOG`: `[{name, aliases[], kind, muscles:{primary[],secondary[]}, std?:[novice,gemiddeld,gevorderd,elite], region?:'boven'|'onder', ladder?:[5 step names]}]`.
- `Score.findExercise(name) → entry|null`. Normalizes: lowercase, strip leading `weighted`/`gewogen`, strip non-alphanumerics, strip trailing `s`.
- `Score.e1rm(load, reps) → number`: `reps<=0 → 0`, `reps===1 → load`, else `load*(1+min(reps,15)/30)`.
- `Score.levelFor(ratio, t) → 1..5`: `1 + t.filter(x => ratio >= x).length`.
- `Score.thresholds(ex, sex)`: `std`, scaled ×0.6 (boven) or ×0.75 (onder) when `sex==='v'`.
- `Score.bestPerExercise(workouts, bw, sex) → {name: {name, kind, muscles, e1rm, step, level|null, at}}`.
- `Score.muscleLevels(workouts, bw, sex) → {muscleId: {level, from}}`. Primary gets the level; secondary gets `max(1, level-1)`.
- `Score.recovery(workouts, now) → {muscleId: score}`. Each non-stretch set counts primary 1 and secondary 0.5, times `max(0, 1 - ageH/72)`.
- `Score.recoveryStatus(score) → 0|1|2`: `<3 → 0`, `<=8 → 1`, else `2`. `Score.RECOVERY = ['Fris','Herstellend','Moe']`.
- `Score.muscleDates(workouts) → {trained:{m: iso}, stretched:{m: iso}}`.
- `Score.exerciseSeries(workouts, name, bw) → [{at, value, unit}]`, ascending. `unit` is `'kg'` (e1RM), `'trede'` or `'reps'`/`'s'`.
- `Score.weekStats(workouts, now) → {sessions, hardSets}` over the last 7 days.
- Workout shape: `{at: ISO, date: 'YYYY-MM-DD', raw, entries:[{exercise, kind, muscles, sets:[{reps?,kg?,sec?,step?}]}]}`.

- [ ] **Step 1: Write the failing tests** in `score.test.js`:

```js
const assert = require('node:assert/strict');
const S = require('./score.js');
const now = Date.parse('2026-09-25T12:00:00Z');
const w = (hoursAgo, entries) => ({ at: new Date(now - hoursAgo * 3600e3).toISOString(), entries });
const set = (reps, kg) => ({ reps, kg });

assert.equal(S.e1rm(100, 1), 100);
assert.equal(S.e1rm(100, 0), 0);
assert.ok(Math.abs(S.e1rm(100, 5) - 116.667) < 0.01);

assert.equal(S.findExercise('bench press').name, 'Bankdrukken');
assert.equal(S.findExercise('Weighted pull-ups').name, 'Pull-up');
assert.equal(S.findExercise('iets onbekends'), null);

assert.equal(S.levelFor(0.3, [0.75, 1, 1.5, 2]), 1);
assert.equal(S.levelFor(1.0, [0.75, 1, 1.5, 2]), 3);
assert.equal(S.levelFor(2.5, [0.75, 1, 1.5, 2]), 5);

// bench 80x5 @ bw 80 -> ratio 1.167 -> Gemiddeld; triceps secondary -> Novice
let lv = S.muscleLevels([w(1, [{ exercise: 'Bankdrukken', kind: 'gewicht', sets: [set(5, 80)] }])], 80, 'm');
assert.equal(lv.borst.level, 3);
assert.equal(lv.triceps.level, 2);

// weighted pull-up: (80+20) x5 -> 1.458 -> Gemiddeld on rug
lv = S.muscleLevels([w(1, [{ exercise: 'pull-ups', kind: 'lichaamsgewicht', sets: [set(5, 20)] }])], 80, 'm');
assert.equal(lv.rug.level, 3);

// female scaling: bench 50x1 @ 60 -> 0.833 vs [0.45,0.6,0.9,1.2] -> Gemiddeld
lv = S.muscleLevels([w(1, [{ exercise: 'Bankdrukken', kind: 'gewicht', sets: [set(1, 50)] }])], 60, 'v');
assert.equal(lv.borst.level, 3);

// skill ladder: front lever step 2 -> level 2 on rug and buik
lv = S.muscleLevels([w(1, [{ exercise: 'Front lever', kind: 'skill', sets: [{ step: 2, sec: 8 }] }])], 80, 'm');
assert.equal(lv.rug.level, 2);

// recovery decay; stretch ignored
const bench1 = { exercise: 'Bankdrukken', kind: 'gewicht', sets: [set(5, 80)] };
assert.equal(S.recovery([w(0, [bench1])], now).borst, 1);
assert.equal(S.recovery([w(36, [bench1])], now).borst, 0.5);
assert.equal(S.recovery([w(80, [bench1])], now).borst ?? 0, 0);
assert.equal(S.recovery([w(1, [{ exercise: 'Stretchen', kind: 'stretch', muscles: { primary: ['hamstrings'], secondary: [] }, sets: [{ sec: 60 }] }])], now).hamstrings ?? 0, 0);
assert.deepEqual([2, 5, 9].map(S.recoveryStatus), [0, 1, 2]);

// series ascending, e1rm values
const ser = S.exerciseSeries([w(1, [bench1]), w(50, [{ exercise: 'bench', kind: 'gewicht', sets: [set(5, 70)] }])], 'Bankdrukken', 80);
assert.equal(ser.length, 2);
assert.ok(ser[0].value < ser[1].value);
assert.equal(ser[1].unit, 'kg');

console.log('score.js: all checks passed');
```

- [ ] **Step 2:** Run `node score.test.js` and expect `Cannot find module './score.js'`.
- [ ] **Step 3:** Implement `score.js` to the interfaces above.
  - Wrap it in an IIFE that assigns `root.Score` and `module.exports` when `module` exists.
  - Catalog: standards from the spec. Male ×BW thresholds:
    - Bankdrukken [0.75,1,1.5,2]
    - Schuine bankdrukken [0.65,0.9,1.25,1.65]
    - Squat [1.25,1.5,2.25,2.75]
    - Deadlift [1.5,2,2.5,3]
    - Overhead press [0.55,0.75,1,1.25]
    - Barbell row [0.75,1,1.5,1.75]
    - Pull-up and Chin-up [1.15,1.35,1.65,2]
    - Dips [1.15,1.4,1.75,2.1]
    - Romanian deadlift [1,1.4,1.9,2.4]
    - Hip thrust [1,1.5,2.25,3]
    - Leg press [1.75,2.5,3.5,4.5]
    - Bulgarian split squat [0.5,0.8,1.1,1.4]
    - Biceps curl [0.4,0.6,0.85,1.15]
    - Lat pulldown [0.75,1,1.3,1.6]
    - Power clean [0.75,1,1.3,1.6]
  - Ladders: Front lever, Planche, Handstand, Muscle-up, Pistol squat, L-sit.
- [ ] **Step 4:** Run `node score.test.js` and expect `score.js: all checks passed`.
- [ ] **Step 5:** Commit `feat: scoring logic`.

### Task 2: Body figure

**Files:** Create `body.js`

**Interfaces:**
- Produces `Body.render(svgEl, 'voor'|'achter')`. It fills an `<svg viewBox="0 0 200 460">` with:
  - `path.skin`: the silhouette, left half mirrored at x=200−x.
  - One `path.m[data-m=<muscleId>]` per muscle (both sides in one path).
  - `style="--d:<ms>"`: load-animation delay from the polygon's lowest y (feet first).
- Consumes `Score.MUSCLES` ids.
- Front: trapezius, schouders, borst, biceps, onderarmen, buik (3×2 facets), schuine, quadriceps, adductoren, kuiten.
- Back: trapezius, schouders, triceps, onderarmen, rug, onderrug, billen, hamstrings, kuiten.

- [ ] **Step 1:** Write `body.js` with left-half polygon tables per view plus a `mirror()` helper.
- [ ] **Step 2:** Verify in Task 8's single look that every muscle sits inside the silhouette and no two polygons overlap.
- [ ] **Step 3:** Commit `feat: faceted body figure`.

### Task 3: Shell, Vandaag view, example data

**Files:** Create `index.html`, `app.js`

**Interfaces:**
- `app.js` state: `S = {workouts, profile:{bodyweight, sex, goals}|null, kennis, plan, mode:'kracht'|'herstel', parsed}`.
- `use(name)` wraps `window.claude?.use` and returns `null` outside a viewer.
- `EXAMPLE` workouts (4 sessions in the past week) render while `S.workouts` is empty, with a "Voorbeeld" notice.
- `renderToday()`:
  - Colours `path.m` via `data-l` (level 1–5, absent = hatch) or `data-r` (0–2).
  - Adds `.stretched` when a muscle was stretched in the last 7 days.
  - Renders the plate legend.
  - Shows the week line from `Score.weekStats`.
- Tapping a muscle opens a detail sheet: level, recovery, top 3 lifts for that muscle, last trained, last stretched.

- [ ] Steps: build `index.html` (tokens, type scale, tab bar, five views, hatch defs), then `app.js` with boot, tabs and `renderToday`. Commit `feat: shell and body map`.

### Task 4: Loggen

- Textarea `#log-text` with a keyboard-mic hint, and `#log-date` (default today).
- **Verwerk** calls `sample.json(parsePrompt(text), {modelTier:'quick'})`, then `normalizeEntries()`, which maps to catalog names, filters muscle ids and coerces numbers.
- The preview shows each entry with a remove button. Fixes happen by editing the text and pressing Verwerk again (no per-field editors).
- **Opslaan** calls `db.collection('workouts').add({date, at, raw, entries, createdAt})`.
- **Alleen tekst opslaan** is always available and saves `entries: []` with `unparsed: true`.
- Errors: `not_granted` or `sampling_disabled` hides Verwerk; `rate_limited` shows "Even wachten…"; `invalid_json` shows "Probeer opnieuw"; a db error shows a toast and keeps the text.
- Commit `feat: voice log flow`.

### Task 5: Voortgang

- `#ex-select` lists exercises seen in the workouts.
- An SVG line chart (`Score.exerciseSeries`) with min/max gridlines, end-point label and unit.
- A history list per day showing the raw text in `<details>` and a two-tap delete (`Verwijder` → `Zeker?`) calling `db.doc('workouts/'+id).delete()`.
- Commit `feat: progress view`.

### Task 6: Kennis

- Cards from `kennis` (type chip, title, source link, keyPoints, rules, whenToUse), each in a `<details>`, with a two-tap delete.
- **+ Onderzoek** opens a form (title, link, pasted text sliced to 50,000 chars with a notice), then `sample.json(kennisPrompt)` and a review. Save with `db.collection('kennis').add`.
- Empty state invites sending links to Claude in the chat.
- Commit `feat: knowledge view`.

### Task 7: Profiel and Voorstel

- The profile form saves `db.doc('profile/me').set({bodyweight, sex, goals})`. Without a profile, Vandaag shows "Vul je lichaamsgewicht in".
- **Maak voorstel** calls `sample.json(planPrompt, {cache:false})`. Input: recovery statuses, levels, 14-day log, goals and kennis summaries (sliced to about 30,000 chars). Output: `{title, why, blocks:[{name, items:[{exercise, dose, tip, source}]}]}`.
- The result is saved to `plan/latest` and rendered as a board. The last plan loads on open.
- Commit `feat: profile and plan`.

### Task 8: Look once, publish, verify

- One local screenshot at 390 px; fix what it shows.
- Publish `index.html` with `files: {score.js, body.js, app.js}`, `capabilities: {db:{}, sample:{}}`, and icon `dumbbell`.
- One `ArtifactData list` of `workouts`, `kennis` and `profile` (empty is expected).
- Commit `chore: publish`.
