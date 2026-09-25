# Krachtkaart — ontwerp

Datum: 2026-09-25
Status: ter review

## Doel

Een telefoon-app om workouts bij te houden door in het Nederlands te vertellen wat je deed, je kracht per spiergroep te zien op een lichaamsfiguur, en een voorstel voor de volgende training te krijgen op basis van je historie en je eigen kennisbank (YouTube-video's en onderzoeken).

Gebruiker: één persoon. Vooral gym met gewichten, plus explosief beenwerk, weighted pull-ups en dips, calisthenics-skills (in opbouw) en stretchen.

## Platform

- Privé claude.ai-artifact (één HTML-pagina, vanilla JS, geen framework).
- Op de telefoon: link openen terwijl je ingelogd bent op claude.ai, daarna "Zet op beginscherm".
- Capabilities:
  - `db`: alle opslag.
  - `sample`: Claude in de app, voor tekst naar sets, voorstellen en samenvattingen van onderzoek.
- Spraak: via de microfoonknop van het telefoontoetsenbord (Gboard/iOS-dicteren, nl-NL). De artifact-frame blokkeert de microfoon-API, dus een eigen mic-knop kan niet.
- YouTube kan niet ingesloten worden; video's zijn links die naar buiten openen.

## Schermen (UI in het Nederlands)

Onderin een tabbalk met vijf tabs.

1. **Vandaag**
   - Lichaam voor- en achterkant, met een schakelaar voor **Kracht** of **Herstel**.
   - Tik op een spier voor het detail: niveau, beste lifts en laatst getraind.
   - Kaart **Voorstel voor vandaag** met een knop; Claude maakt dan een sessie (warming-up, hoofdwerk, skill-werk, stretchen). Bij elke keuze staat de bron uit Kennis.
2. **Loggen**
   - Groot tekstveld met een hint om de mic van het toetsenbord te gebruiken.
   - **Verwerk** laat Claude de tekst omzetten naar een bewerkbare lijst met oefeningen en sets; daarna **Opslaan**.
   - De ruwe tekst wordt altijd mee bewaard.
3. **Voortgang**
   - Keuze per oefening, met een lijngrafiek van geschat max (e1RM), reps of skill-trede over tijd.
   - Daaronder de historie per dag, met een optie om te verwijderen.
4. **Kennis**
   - Video's en onderzoeken als kaarten: titel, bron-link, kernpunten, praktische regels en wanneer je het gebruikt.
   - **+ Onderzoek**: tekst plakken; Claude haalt de bevindingen eruit, jij controleert en slaat op.
5. **Profiel**
   - Lichaamsgewicht, geslacht (voor de krachtstandaarden) en doelen (vrije tekst, bijv. "front lever", "spagaat").

## Data (`db`)

- `workouts/<id>` bevat:
  - `date`, `raw` (ruwe tekst) en `createdAt`
  - `entries: [{ exercise, kind, muscles: {primary[], secondary[]}, sets: [{ reps?, kg?, sec?, step? }] }]`
  - `kind` is een van: `gewicht` | `lichaamsgewicht` | `explosief` | `skill` | `stretch`
  - Bij `lichaamsgewicht` is `kg` het extra gewicht bovenop je lichaamsgewicht.
- `profile/me` bevat `{ bodyweight, sex, goals }`.
- `kennis/<id>` bevat `{ type: video|onderzoek, title, source, url?, focus[], keyPoints[], rules[], exercises[], whenToUse }`.
  - Gevuld door Claude Code via ArtifactData (links en PDF's uit de chat) of in de app.
  - Niets hardcoded.
- Geen browseropslag voor data.
- Zolang er geen workouts zijn, toont de app voorbeelddata met het duidelijke label "Voorbeeld"; die data wordt nooit opgeslagen.

## Scores

- **e1RM (Epley):** `load × (1 + reps/30)`, waarbij `load` = kg, of lichaamsgewicht + extra kg bij pull-ups en dips.
- **Kracht per lift:** e1RM / lichaamsgewicht, vergeleken met richtwaarden (Beginner, Novice, Gemiddeld, Gevorderd, Elite) per bekende lift. Vrouwen: bovenlichaam ×0,6, onderlichaam ×0,75.
- **Niveau van een spier:** het beste niveau onder de oefeningen waarin die spier primair is.
- **Skills:** vaste ladders die op niveaus zijn gemapt (front lever, handstand, muscle-up, planche, pistol squat, L-sit).
- **Explosief:** telt mee voor herstel en volume, niet voor het krachtniveau.
- **Stretch:** houdt per spier "laatst gestretcht" bij en tekent een dunne contourlijn.
- **Herstel:** harde sets per spier in de laatste 72 uur. Primair telt 1, secundair 0,5, met lineair verval naar 0 op 72 uur. Uitkomst: Fris (< 3), Herstellend (3–8) of Moe (> 8).

## Claude in de app (`sample`)

- **Verwerk:** input is de tekst, de bekende oefeningen en je lichaamsgewicht; output is JSON volgens het `entries`-schema. Er wordt niets opgeslagen zonder bevestiging.
- **Voorstel:** input is herstel per spier, 14 dagen historie, doelen en de samenvattingen uit Kennis; output is een sessie met bronnen. Draait alleen na een tik.
- **Onderzoek toevoegen:** input is de geplakte tekst (afgekapt op ongeveer 60.000 tekens, met een melding); output is een Kennis-document ter controle.
- **Fouten:**
  - `not_granted` of niet beschikbaar: de AI-knoppen worden verborgen en de ruwe tekst wordt toch opgeslagen.
  - `rate_limited`: melding "Even wachten, probeer het over een minuut opnieuw".
  - Een fout bij het opslaan in `db` wordt getoond; het ingevoerde blijft in het formulier staan.

## Visuele richting

- **Thema:** alleen licht (op verzoek).
- **Kleuren:**
  - Magnesium #EEF1F2 (ondergrond, krijtwit met een koele tint)
  - Wit #FFFFFF (vlakken)
  - Gietijzer #1B2228 (tekst, primaire knoppen)
  - Staal #5B6770 (secundaire tekst)
  - Lijn #D5DBDF
- **Krachtniveaus = kleuren van wedstrijdschijven:** Beginner wit (grijze rand), Novice groen #1E8A4B, Gemiddeld geel #EFB21F, Gevorderd blauw #1D5DB5, Elite rood #D3302E. Nog geen data: lichtgrijs met een stippellijn. De legenda is een stang met schijven.
- **Herstel:** één tint, van licht (fris) naar diep gietijzer-blauw (moe).
- **Type:** Archivo (variabel, breedte-as).
  - Getallen en koppen in expanded en zwaar, zoals gestempelde schijven.
  - Labels in condensed, broodtekst in normale breedte.
  - Labels in gewone hoofdletters (geen all-caps).
- **Layout:**
  - Eén kolom met een tabbalk onderin.
  - Het lichaamsfiguur staat vrij op de ondergrond, zonder kaart. Alleen het voorstel en de formulieren krijgen een vlak.
- **Beweging:** één moment. Bij het openen vullen de spieren zich van onder naar boven, zoals een stang die geladen wordt. `prefers-reduced-motion` wordt gerespecteerd.
- **Lichaam:** eigen SVG, gestileerd en gefacetteerd (vlakken in plaats van realistische anatomie). Linkerhelft getekend en gespiegeld; grote tikvlakken.

## Buiten scope (later indien gewenst)

- PDF-upload in de app (nu tekst plakken; grote PDF's gaan via de chat).
- Donker thema.
- Meerdere gebruikers.

## Test

- Eén zelfcheck in de pagina: `selfTest()` met asserts op e1RM, niveau-mapping en herstelverval, die bij laden in de console draait.
- Na publicatie: één ArtifactData-`list` per collectie.
