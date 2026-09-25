# Krachtkaart los — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn Krachtkaart into a standalone offline PWA on GitHub Pages: local storage, a Dutch rule-based parser, day-type recommendation, and a set-by-set training editor.

**Architecture:** Plain scripts, no build step.
- Pure logic, testable in Node: `score.js` (extended), `parse.js`, `plan.js`.
- DOM: `body.js` (unchanged) and `app.js` (rewritten for local storage).
- Offline: `sw.js` and `manifest.webmanifest`.
- Knowledge: `kennis.json`, fetched and merged into the catalog.

**Tech Stack:** Vanilla JS, localStorage, Web Speech API, Service Worker, `node:assert`.

**Spec:** `docs/superpowers/specs/2026-09-25-krachtkaart-standalone-design.md`

## Global Constraints

- Dutch UI, light theme, same tokens and plate colours as v1.
- No AI and no network apart from Google Fonts and `kennis.json`.
- Every localStorage access is wrapped in try/catch.
- Kind id `skill` stays internal; the UI shows "Calisthenics" and "stap".

---

### Task 1: Catalog extension (`score.js`)
- Add stretch exercises: Hamstring stretch, Quad stretch, Heupflexor stretch, Duivenhouding, Borst stretch, Lat stretch, Kuit stretch, Butterfly, Pancake, Spagaat, Jefferson curl, Schouder dislocates, Polsstretch, and a generic Stretchen.
- Add aliases: optrekken, opdrukken, kniebuigingen.
- `Score.addExercises(list)`: merges by normalized name. An existing entry gains `days`, `dose`, `source`, `note` and extra aliases; a new entry is appended with cleaned muscles.
- Test: add "Scapula pull-up", then find it by alias; merging a dose onto Bankdrukken keeps its std.

### Task 2: Parser (`parse.js`, TDD)
- `Parse.numbersNl(text) → text` (number words to digits, halves, commas).
- `Parse.workout(text, {today}) → {date|null, entries[], unknown[]}`, following the spec rules.
- Tests on about 12 real sentences: sets/reps/kg, `4x8`, weighted dips, skill step, minutes stretch with muscles, two exercises in one sentence, a number clause before the name, "gisteren", number words, unknown sentence.

### Task 3: Planner (`plan.js`, TDD)
- `Plan.DAYS`: `[{id, label, muscles[], defaults[]}]`, 10 items.
- `Plan.recommendDay(workouts, now) → {id, reason}`.
- `Plan.pool(dayId, workouts, now) → [{name, kind, fromKennis, source, lastAt, days, dose}]`, sorted.
- `Plan.stretchPool(dayId, workouts, now)`.
- `Plan.target(name, workouts, bw) → {sets, reps?, kg?, sec?, step?}`.
- `Plan.guessDay(entries) → dayId`.
- Tests: recommendation avoids tired muscles, pool ordering (kennis first, then longest rested), progression +2.5/+5, guessDay.

### Task 4: App shell (`index.html`, `app.js`)
- Full HTML document with manifest, iconen and theme-color.
- Views and tabs, and the store (load/save/persist).
- Vandaag card, Training chooser and editor, speech (mic plus parser), Voortgang (Aanpassen via the editor), Kennis (json plus notes), Profiel (backup via share/download, restore).

### Task 5: PWA
- `manifest.webmanifest`, `sw.js`, PNG iconen generated with System.Drawing.
- Registration in `app.js` (only over http(s)).

### Task 6: Verify and deploy
- All node tests pass; one preview look at 375 px.
- The user sets up GitHub (account, `gh auth login`). Then: noreply author, `gh repo create --public --push`, and enable Pages.
