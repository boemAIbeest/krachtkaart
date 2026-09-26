# Krachtkaart: kennisbank uit onderzoek, vragen en Mijn oefeningen

Datum: 2026-09-26
Status: goedgekeurd in chat

## Doel

De app wordt personal trainer en fysio in één:

- Hij heeft een kennisbank over het lichaam en fitness die alleen op onderzoek steunt.
- Je kunt er in gewone taal vragen aan stellen.
- Jij bepaalt welke oefeningen de app gebruikt, zodat hij rustig blijft.

## Beslissingen (door gebruiker)

- **Vragen worden offline beantwoord uit een kennisbank**, zonder AI.
- **Jij kiest wat aan staat.** Alleen oefeningen die aanstaan komen in de training en de stretchlijst. Nieuwe oefeningen uit video's of onderzoek staan uit tot je ze aanzet.
- **De app moet rustig ogen:** weinig tegelijk op het scherm, en de rest dichtgeklapt.

## 1. Kennisbank: `vragen.json`

```json
{
  "updated": "2026-09-26",
  "themes": [{ "id": "spiergroei", "label": "Spiergroei" }],
  "items": [{
    "id": "volume-per-week",
    "theme": "spiergroei",
    "q": "Hoeveel sets per spiergroep per week?",
    "alt": ["hoeveel volume moet ik doen"],
    "tags": ["volume", "sets", "week"],
    "a": "Kort antwoord, 2 tot 5 zinnen.",
    "doen": ["Wat je ermee doet, 1 tot 3 punten."],
    "exercises": ["Nordic hamstring curl"],
    "bewijs": "sterk",
    "bronnen": [{
      "titel": "…",
      "auteurs": "Schoenfeld et al.",
      "jaar": 2017,
      "soort": "meta-analyse",
      "url": "https://pubmed.ncbi.nlm.nih.gov/<pmid>/"
    }]
  }]
}
```

Velden:

- **`themes`**: spiergroei, kracht, explosief, herstel, stretchen, pijn, voeding, cardio, lichaam.
- **`bewijs`**: `sterk` (meerdere meta-analyses of een grote meta-analyse), `redelijk` (één meta-analyse of meerdere RCT's) of `beperkt` (weinig of kleine studies; staat er alleen in als het antwoord dat eerlijk zegt).
- **`soort`**: `meta-analyse`, `systematische review`, `RCT`, `richtlijn` of `standpunt`.
- **`exercises`**: namen zoals ze in de catalogus staan. Bij het antwoord komt een knop "Zet aan" of "Staat aan".

Regels voor de inhoud:

- Alleen claims uit meta-analyses, systematische reviews, RCT's en officiële standpunten (ACSM, ISSN, NSCA, KNGF e.d.).
- Elke bron is gecontroleerd in PubMed: PMID, titel en jaar.
- Antwoorden zijn in het Nederlands en praktisch.
- Bij pijn staan er rode vlaggen in: wanneer je stopt en naar de huisarts of fysio gaat. De app stelt geen diagnose.
- De omvang is ongeveer 120 tot 150 items.

## 2. Oefeningen uit onderzoek: `kennis.json`

- Nieuwe `sources` met `type: "onderzoek"`: blessurepreventie, pezen, knie, schouder en spiergroei per oefening.
- Daaronder `exercises` in het bestaande formaat.
- Ze staan standaard uit en verschijnen onder "Nieuw".

## 3. Mijn oefeningen

Staat van de app:

- `S.mine`: de namen die aanstaan. Dit vervangt `S.archived`.
- `S.seen`: de namen die al eens in de lijst zijn getoond.

**Overstap** (als `S.mine` ontbreekt, ook na het terugzetten van een oude back-up):

- `mine` wordt alles wat ooit is gelogd, behalve wat gearchiveerd was.
- `seen` wordt de hele huidige catalogus, behalve oefeningen uit onderzoeksbronnen. Die zijn bij deze update nieuw.

**Lijst:**

- In Profiel komt een paneel "Mijn oefeningen: N aan" met een knop. Die opent een eigen scherm met groepen die je dichtklapt: Nieuw, Borst, Rug, Schouders, Armen, Buik, Benen, Explosief, Calisthenics en Stretches.
- Bovenaan elke groep staat "x van y aan".
- Per rij staan een vinkje, de naam en één regel met de bron.
- Een zoekveld filtert de lijst.
- Wie de lijst opent, heeft alles gezien: `seen` wordt bijgewerkt.

**Gedrag in de app:**

- `Plan.pool` en de stretchlijst tonen alleen wat in `mine` staat.
- De archiefknop wordt "Uitzetten".
- Wie een uitgezette oefening logt, zet hem daarmee aan.
- Heeft een dag niets dat aanstaat, dan zegt de chooser dat en linkt hij naar de lijst.
- Op Vandaag staat één stille regel als er nieuwe oefeningen zijn: "N nieuwe oefeningen om te bekijken".
- Back-up en terugzetten nemen `mine` en `seen` mee.

## 4. Kennis-tab

- Bovenaan een vraagveld (`type=search`) met een microfoonknop, die dezelfde spraakherkenning gebruikt als bij het loggen.
- **Met een vraag:** de beste 1 tot 3 antwoorden als kaart. Daarop staan de vraag, het antwoord, de doe-punten, de oefeningen met een aan-knop, de bewijslabel en de bronnen met link. Is er geen goed antwoord, dan zegt de app eerlijk dat het nog niet in de kennisbank staat.
- **Zonder vraag:** thema-chips. Tik je er een aan, dan zie je de vragen van dat thema als dichtgeklapte `<details>`.
- Daaronder, dichtgeklapt: "Video's en bronnen" (de huidige lijst) en "Eigen notities".
- Eén zin om te zeggen dat de app geen arts of fysio vervangt, onder het vraagveld.

## 5. Techniek

- **`vraag.js`** bestaat uit pure functies en draait in de browser (`window.Vraag`) en in node. Het werkt zo:
  - de tekst wordt genormaliseerd: kleine letters, geen accenten;
  - Nederlandse stopwoorden vallen weg;
  - woorden worden grof ingekort tot hun stam;
  - synoniemen worden samengevoegd tot één groep;
  - de score is de IDF van de woorden die overeenkomen, maal het gewicht van het veld: `q`/`alt` 3, `tags` 2, `a`/`doen` 1;
  - er is een minimale score; eronder geeft de app geen antwoord.
- **`vraag.test.js`**: ± 20 echte vragen moeten op het verwachte item uitkomen. Er is ook een test op een vraag die nergens over gaat, en die moet geen antwoord geven.
- **`plan.js`**: `pool(dayId, workouts, now, mine)`.
- **`sw.js`**: `vraag.js` en `vragen.json` staan in de shell. `vragen.json` wordt eerst van het netwerk gehaald, net als `kennis.json`. De cacheversie gaat omhoog.

## Niet in scope

- Aanpassingen aan de planner: dagkeuze, sets en gewichten blijven zoals ze zijn.
- Diagnoses.
- AI.
