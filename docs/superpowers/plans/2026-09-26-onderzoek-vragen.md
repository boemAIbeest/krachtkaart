# Kennisbank, vragen en Mijn oefeningen: implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De app beantwoordt offline vragen over lichaam en training uit een kennisbank met bronnen, en gebruikt alleen de oefeningen die de gebruiker aanzet.

**Architecture:**
- **`vraag.js`**: pure zoekfuncties, net als `parse.js`. Ze draaien in de browser als `window.Vraag` en in node als module.
- **`vragen.json`**: de kennisbank met onderzoeksbronnen.
- **`app.js`**: `S.archived` wordt vervangen door `S.mine` (wat aanstaat) en `S.seen` (wat al getoond is). `Plan.pool` filtert op `mine`.

**Tech Stack:** vanilla JS, geen dependencies, `node:assert` voor tests, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-26-onderzoek-vragen-design.md`

## Global Constraints

- Geen AI, geen nieuwe dependencies, werkt offline.
- UI-tekst in het Nederlands. "Calisthenics" en "stap", niet skill of trede. Licht thema.
- Alleen bronnen uit meta-analyses, systematische reviews, RCT's en standpunten, elk met een gecontroleerde PubMed-link.
- De app moet rustig ogen: dichtklappen boven uitspreiden.
- Nooit het zakelijke e-mailadres in deze openbare repo committen.

---

### Task 1: `vraag.js` (zoeken)

**Files:**
- Create: `vraag.js`, `vraag.test.js`

**Interfaces:**
- Produces:
  - `Vraag.index(items) -> idx`
  - `Vraag.search(idx, text, n = 3) -> [{ item, score }]`, leeg als er niets boven de drempel uitkomt
  - `Vraag.tokens(text) -> string[]`

- [ ] **Step 1: Failing test.** `vraag.test.js` maakt een index van drie fixture-items en controleert vier dingen:
  - "waarom ben ik zo stijf na het trainen" geeft het spierpijn-item;
  - "hoeveel sets per week" geeft het volume-item;
  - "wat is de hoofdstad van frankrijk" geeft niets;
  - "Spierpijn" en "spierpijnen" leveren dezelfde tokens op.
- [ ] **Step 2:** draai `node vraag.test.js`. Verwacht: een FAIL omdat de module ontbreekt.
- [ ] **Step 3: Implementatie.**
  - `norm`: NFD, accenten weg, kleine letters, alles wat geen `a-z0-9` is wordt een spatie.
  - `STOP`: een set Nederlandse stopwoorden.
  - `stem`: haal `en`, `s` of `e` van het eind als het woord langer dan 4 tekens is.
  - `SYN`: een map van stam naar groepsnaam, bijvoorbeeld `stijf` en `doms` naar `spierpijn`.
  - `tokens = norm → split → stop eruit → stem → syn`.
  - `index` bouwt per item de velden op met gewicht `q`/`alt` 3, `tags` 2 en `a`/`doen` 1, plus de IDF.
  - `search` telt per querytoken het hoogste veldgewicht × IDF op en deelt door `sqrt` van het aantal querytokens.
  - De drempel is `MIN = 1.2`, af te stellen met de tests.
- [ ] **Step 4:** `node vraag.test.js` geeft PASS.
- [ ] **Step 5:** commit met de boodschap `feat: offline question search`.

### Task 2: `Plan.pool` filtert op wat aanstaat

**Files:**
- Modify: `plan.js` (`pool`), `plan.test.js` (het archief-blok)

**Interfaces:**
- Produces: `Plan.pool(dayId, workouts, now, mine)`, waarbij `mine` een array van namen is. `undefined` betekent geen filter; dat is alleen voor de bestaande tests.

- [ ] **Step 1: Test.** Vervang het archief-blok door de volgende check:

  ```js
  const lowerNames = (mine) => Plan.pool('lower', [w(24, 'lower', [{ exercise: 'Squat', sets: [{ reps: 5, kg: 100 }] }])], now, mine).map((x) => x.name);
  assert.ok(lowerNames(undefined).includes('Squat'));
  assert.deepEqual(lowerNames(['Hip thrust', 'Leg curl']).sort(), ['Hip thrust', 'Leg curl']);
  assert.deepEqual(lowerNames([]), []);
  ```

- [ ] **Step 2:** de test faalt.
- [ ] **Step 3:** in `add` wordt `!archived.includes(e.name)` vervangen door `(!mine || mine.includes(e.name))`.
- [ ] **Step 4:** draai alle drie de bestaande tests en `node vraag.test.js`. Alles moet slagen.
- [ ] **Step 5:** commit.

### Task 3: Mijn oefeningen (`app.js`, `index.html`)

**Files:**
- Modify: `app.js` (opslag, chooser, stretchlijst, finish, archief, profiel, back-up), `index.html` (paneel en scherm)

- [ ] **Opslag.**
  - `blank()` krijgt `mine: []` en `seen: null`.
  - `load()` migreert, en de migratie wordt hergebruikt na het terugzetten van een back-up:

    ```js
    function migrate(s) {
      if (!Array.isArray(s.mine)) {
        const arch = s.archived || ['Squat', 'Deadlift'];
        const logged = s.workouts.flatMap((w) => (w.entries || []).map((e) => Score.findExercise(e.exercise)?.name || e.exercise));
        s.mine = [...new Set(logged)].filter((n) => !arch.includes(n));
      }
      delete s.archived;
      return s;
    }
    ```

  - `seen` wordt pas gevuld als `kennis.json` geladen is:

    ```js
    if (!Array.isArray(S.seen)) S.seen = Score.CATALOG.filter((e) => !isResearch(e)).map((e) => e.name);
    ```

    met `isResearch = (e) => K.sources.find((s) => s.id === e.source)?.type === 'onderzoek'`.
- [ ] **Filteren.**
  - `Plan.pool(..., S.mine)` in `resetPicks` en `renderChooser`.
  - `stretchList` filtert op `S.mine.includes(e.name)`.
  - Heeft een dag niets dat aanstaat, dan toont de chooser: "Voor deze dag staat nog niets aan." met een knop naar de lijst.
- [ ] **Uitzetten.**
  - `archBtn` wordt `offBtn`, met het label "Uitzetten" en `data-confirm="off"`.
  - `confirmed('off')` haalt de naam uit `S.mine` en toont de toast "X staat uit. Aanzetten kan bij Profiel, Mijn oefeningen."
- [ ] **Automatisch aan.** `finish()` doet `S.mine = [...new Set([...S.mine, ...entries.map((e) => Score.findExercise(e.exercise)?.name || e.exercise)])]`.
- [ ] **Scherm `#v-oefeningen`.** Het staat niet in de tabbalk; je komt er via `data-go="oefeningen"`.
  - Bovenaan een zoekveld `#o-q`.
  - Daaronder `<details>`-groepen: Nieuw, Borst, Rug, Schouders, Armen, Buik, Benen, Explosief, Calisthenics en Stretches, elk met "x van y aan".
  - Elke rij is `<label><input type=checkbox data-mine=NAME>naam<span class=meta>bron</span></label>`.
  - Bij het openen: `S.seen` = alle namen in de catalogus, met `save()`.
  - Groepsindeling:
    - `stretch` → Stretches, `skill` → Calisthenics, `explosief` → Explosief;
    - anders op de eerste primaire spier: borst → Borst, rug/trapezius/onderrug → Rug, schouders → Schouders, biceps/triceps/onderarmen → Armen, buik/schuine → Buik, en de rest → Benen.
- [ ] **Profiel.** Het Archief-paneel wordt vervangen door "Mijn oefeningen", met "N aan" en de knop "Oefeningen kiezen".
- [ ] **Vandaag.** Zijn er catalogusnamen die niet in `S.seen` staan, dan komt er een notice: "N nieuwe oefeningen om te bekijken" met een knop.
- [ ] **Back-up.** `makeBackup` neemt `mine` en `seen` mee, `readRestore` leest ze in, en daarna draait `migrate(...)`.
- [ ] **Kennis-lijst.** "(gearchiveerd)" wordt "(staat uit)".
- [ ] **Controleren.** Draai alle tests. Controleer in het preview-scherm:
  - de migratie met een oude save die `archived` heeft;
  - aan- en uitzetten;
  - de chooser en de stretchlijst.
- [ ] Commit.

### Task 4: Kennis-tab met vraagveld

**Files:**
- Modify: `index.html` (Kennis-sectie, `<script src="vraag.js">`), `app.js` (`loadKennis` laadt ook `vragen.json`; `renderKennis`), `sw.js` (shell, network-first, `krachtkaart-v2`)

- [ ] `loadKennis` haalt `vragen.json` erbij en bewaart het in `Q = { themes, items, idx: Vraag.index(items) }`. Mislukt dat, dan blijft `Q` leeg en toont de app "Kennisbank kon niet laden".
- [ ] Bovenaan staat een zoekveld `#q-in` (`type=search`) met een microknop. `toggleMic` wordt generiek: `toggleMic(btn, ta, st)`.
- [ ] Bij `input` (debounce van 250 ms) toont `#q-res` de resultaten van `Vraag.search`, of de melding "Dit staat nog niet in je kennisbank. Vraag het Claude, dan komt het erbij."
- [ ] Zonder vraag toont `#q-themes` chips per thema. Wie er een aantikt, krijgt `#q-res` met alle vragen van dat thema als `<details>`.
- [ ] De antwoordkaart laat het volgende zien:
  - de vraag;
  - het label voor het bewijs;
  - het antwoord;
  - de doe-punten;
  - de oefeningen, elk met een knop `data-on=NAME` ("Zet aan" of "Staat aan");
  - de bronnen: "Auteurs (jaar), soort" met een link.
- [ ] De video's en bronnen en de eigen notities staan in dichtgeklapte `<details>`.
- [ ] Onder het vraagveld staat een disclaimer in één regel.
- [ ] `sw.js`: `vraag.js` en `vragen.json` komen in de SHELL. `vragen.json` wordt eerst van het netwerk gehaald, net als `kennis.json`. `CACHE = 'krachtkaart-v2'`.
- [ ] Controleer in het preview-scherm zoeken, thema's, de mic-knop (verborgen zonder spraakherkenning) en "Zet aan". Commit.

### Task 5: Inhoud uit onderzoek

**Files:**
- Create: `vragen.json`
- Modify: `kennis.json` (bronnen en oefeningen van het type onderzoek), `vraag.test.js` (echte vragen)

- [ ] Zoek per thema de meta-analyses, RCT's en standpunten op. Controleer elke PMID via PubMed E-utilities (`esummary`): de titel en het jaar moeten kloppen.
- [ ] Schrijf ongeveer 130 items verdeeld over 9 thema's. Pijn-items krijgen rode vlaggen en de pijnmonitoringsregel.
- [ ] Zet de oefeningen uit onderzoek in `kennis.json` met `kind`, `muscles`, `days`, `dose`, `source` en `note`, en werk `updated` bij.
- [ ] Een check-script controleert:
  - dat elk `exercises[]` in `vragen.json` bestaat in de catalogus;
  - dat elk item een bron heeft;
  - dat elke URL een PubMed- of DOI-link is.
- [ ] `vraag.test.js`: ± 20 echte vragen moeten op het verwachte id uitkomen. Stel de synoniemen en de drempel bij tot alles slaagt.
- [ ] Commit.

### Task 6: Afronden

- [ ] Draai alle tests.
- [ ] Controleer in het preview-scherm op mobiele breedte.
- [ ] Doe `git push`, controleer de live site en werk het geheugenbestand van de Krachtkaart bij.
