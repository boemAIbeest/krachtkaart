# Krachtkaart los — ontwerp

Datum: 2026-09-25
Vervangt voor de dagelijkse app: `2026-09-25-krachtkaart-design.md` (claude.ai-versie blijft bevroren staan).

## Doel

Dezelfde Krachtkaart, maar als losse web-app zonder claude.ai en zonder AI:
- een eigen icoon op het beginscherm;
- werkt offline;
- data op de telefoon.

De app kiest de trainingsdag. Jij vinkt de oefeningen aan en vult tijdens het trainen makkelijk in wat je deed.

## Beslissingen (door gebruiker)

- **Geen AI:** vaste Nederlandse herkenner en vaste regels.
- **Opslag op de telefoon**, met back-up en terugzetten.
- **Hosting:** GitHub Pages. De repo is openbaar; trainingsdata staat nooit in de repo.
- **Geen rusttimer.**
- **Woorden:** "Calisthenics" in plaats van "skill", en "stap" in plaats van "trede".
- **Dagtypes:** Push, Pull, Benen (explosief), Mobility, Calisthenics, Upper, Lower, Borst & rug, Armen & schouders, Full body.
- **Voorkeur voor oefeningen uit filmpjes:** die staan in de lijst boven de standaardoefeningen.

## Schermen

Tabs: Vandaag, Training, Voortgang, Kennis, Profiel.

1. **Vandaag:** lichaamskaart (Kracht of Herstel, zoals nu) met detailpaneel. Daaronder een kaart die een van twee dingen toont:
   - **Aanbevolen vandaag: <dag>** met de reden en de knop **Kies oefeningen**;
   - of, als er een training bezig is: **Training bezig** met de voortgang en **Ga verder**.

   Plus een back-upherinnering als de laatste back-up ouder is dan 14 dagen.
2. **Training (niet bezig):**
   - Aanbevolen dag, plus tien dagknoppen om zelf te kiezen.
   - De oefeningenlijst van die dag met vinkjes. Oefeningen uit Kennis eerst, daarbinnen het langst niet gedaan eerst.
   - Per oefening: "x dagen geleden" of "nog nooit", de bron en het voorschrift.
   - De bovenste 5 zijn aangevinkt (bij Mobility de bovenste 6 stretches).
   - Een blok Stretchen: de 2 stretches die het langst niet gedaan zijn, aangevinkt.
   - **+ Andere oefening** (zoeken in alle oefeningen) en **Start training**.
   - **Inspreken of achteraf invullen:** tekstveld met een mic-knop (Web Speech API, nl-NL, met terugval op de toetsenbord-mic). **Verwerk** zet het om naar een training met afgevinkte sets.
3. **Training (bezig):**
   - Per oefening de setrijen met stappers: herhalingen (±1), kg (±2,5), seconden (±15), stap (±1), en een vinkje.
   - Per oefening **+ set** (kopieert de vorige) en **Verwijder oefening**.
   - Onderaan **+ Oefening** en **Training afronden**, die alleen afgevinkte sets opslaat.
   - **Stoppen** (twee tikken) gooit de training weg.
   - Alles wordt direct lokaal bewaard, dus afsluiten kan tussendoor.
4. **Voortgang:** grafiek per oefening en historie. **Aanpassen** opent een training in de editor; **Verwijder** werkt met twee tikken.
5. **Kennis:**
   - Bronnen uit `kennis.json` (alleen lezen), met hun oefeningen.
   - Eigen notities (titel, link, tekst), lokaal opgeslagen.
6. **Profiel:**
   - Lichaamsgewicht, krachtstandaard en doelen.
   - **Back-up maken**: via het deelmenu, anders als download.
   - **Back-up terugzetten**: bestand kiezen, dan bevestigen.
   - Datum van de laatste back-up.

## Data

- **localStorage** onder `krachtkaart.v1`:
  - `{workouts[], profile, notes[], active, lastBackup}`;
  - een workout is `{id, date, at, dayType, raw, entries[]}`, met entries zoals in de claude.ai-versie.
- Bij de eerste opslag: `navigator.storage.persist()`.
- **`kennis.json`** (door Claude onderhouden, online gezet via git push):
  - `sources`: `{id, type, title, source, url, days[], keyPoints[], rules[], whenToUse}`;
  - `exercises`: `{name, aliases[], kind, muscles, days[], dose:{sets, reps|sec|step}, ladder?, source, note}`;
  - kennisoefeningen worden bij het laden aan de catalogus toegevoegd (`Score.addExercises`), dus herkenner, lichaamskaart en voorstel kennen ze.

## Regels

- **Dagkeuze:**
  - `score = 10 × paraatheid + min(dagen sinds dit dagtype, 10) − 5 bij een Moe-spier`, met `paraatheid = gemiddelde van (1 − min(herstel, 10)/10)` over de spieren van de dag.
  - Mobility: `4 + 0,5 × min(dagen sinds, 10) + 0,5 × aantal spieren niet gestretcht in 7 dagen`.
  - Gelijke score: volgorde van de lijst.
- **Oefeningenpool per dag:** kennisoefeningen met die dag, plus standaardoefeningen van die dag, plus eerder op dat dagtype gelogde oefeningen (uniek).
- **Doel per oefening:**
  - Is het voorschrift gehaald (alle sets ≥ de bovenkant van het herhalingsbereik, anders ≥ de vorige herhalingen), dan kg + 2,5 (bovenlichaam) of + 5 (benen).
  - Anders blijft het gelijk.
  - Nog nooit gedaan: het voorschrift, of 3 × 8 met leeg gewicht.
  - Stretch 60 s; calisthenics: laatste stap.
- **Dagtype van een ingesproken training:** de dag met de meeste overlap tussen de primaire spieren van de training en de spieren van de dag.

## Herkenner (Nederlands)

- **Getallen:** getalwoorden naar cijfers (tot 999, inclusief "tweeënzeventig", "honderdvijftig", "en een half", "komma vijf", "anderhalve", "een minuut").
- **Opdelen:** stukken bij `. ; , \n` en bij "daarna", "toen", "vervolgens", "dan". Een stuk met twee oefeningen wordt bij de tweede gesplitst. Stukken zonder oefening horen bij de vorige oefening (of bij de volgende als er nog geen was).
- **Patronen:**
  - `N sets`, `A x B` / `A keer B` (sets × herhalingen, behalve als er kilo volgt: dan herhalingen × kg);
  - `N keer|herhalingen|reps`, `N kilo|kg`, `met N` (kg);
  - `N seconden`, `N minuten`, stapnamen of `stap N`.
- **Stretchen:** spierwoorden in het stuk bepalen welke spieren gestretcht zijn.
- **"gisteren" / "eergisteren"** zetten de datum.
- **Niet herkend:** zinnen zonder oefening worden apart getoond.

## PWA

- `manifest.webmanifest` en PNG-iconen (een stapel schijven in de schijfkleuren op gietijzer).
- `sw.js`: stale-while-revalidate voor de app-bestanden en fonts, network-first voor `kennis.json`.

## Test

- `node score.test.js`, `node parse.test.js`, `node plan.test.js`.
- Eén lokale blik via de preview.

## Buiten scope

- Sync tussen apparaten.
- Rusttimer.
- Inspreken per set tijdens de training.
