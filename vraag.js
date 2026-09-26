// Offline question search over vragen.json: keywords, crude Dutch stemming and synonyms (no AI).
(function (root) {
  const STOP = new Set(('aan al als ben bij dan dat de deze die dit doe doen doet door een en er ga gaat hebben heb heeft het hoe hoeveel ' +
    'ik in is je jij kan kun kunnen maar me meer met mij mijn moet moeten na naar niet nog of om ook op over te tijdens tot u uit ' +
    'van veel voor waarom wanneer wat welke wel wie wij wil worden wordt ze zich zij zijn zo zou zoveel beter best goed echt eigenlijk ' +
    'iets manier mag nodig vaak lang keer beste slim slecht erg the what how is are why').split(' '));
  // Stem -> one or more canonical tokens. Compounds split into their parts so "kniepijn" meets "pijn in je knie".
  const SYN = {
    stijf: 'spierpijn', doms: 'spierpijn', spierpijnt: 'spierpijn',
    hypertrofie: 'spiergroei', spiermassa: 'spiergroei', massa: 'spiergroei', groter: 'spiergroei', groei: 'spiergroei', groeien: 'spiergroei', bulk: 'spiergroei', spieropbouw: 'spiergroei', gespierd: 'spiergroei',
    proteine: 'eiwit', protein: 'eiwit', eiwitshake: ['eiwit', 'shake'], whey: 'eiwit',
    rekk: 'stretch', rek: 'stretch', stretching: 'stretch', lenig: 'lenigheid', flexibiliteit: 'lenigheid', flexibel: 'lenigheid', soepel: 'lenigheid', mobiliteit: 'lenigheid',
    ben: 'been', benen: 'been', knieen: 'knie', kniepijn: ['knie', 'pijn'], rugpijn: ['rug', 'pijn'], onderrugpijn: ['onderrug', 'pijn'], schouderpijn: ['schouder', 'pijn'], nekpijn: ['nek', 'pijn'],
    zeer: 'pijn', pijnlijk: 'pijn', ongemak: 'pijn', klacht: 'pijn', blessur: 'blessure', geblesseerd: 'blessure', letsel: 'blessure',
    hamstr: 'hamstring', hamstringblessure: ['hamstring', 'blessure'], lies: 'lies', liesblessure: ['lies', 'blessure'], adductor: 'lies',
    achilles: 'achillespees', achillespez: 'achillespees', pez: 'pees', peesblessure: ['pees', 'blessure'], tendinopathie: 'pees', tendinitis: 'pees', peesontsteking: ['pees', 'pijn'],
    enkelverstuiking: ['enkel', 'verstuiking'], verzwikt: 'verstuiking', verzwikk: 'verstuiking', omgeslag: 'verstuiking',
    slap: 'slaap', slapen: 'slaap', nachtrust: 'slaap',
    lop: 'loop', hardlop: ['loop', 'hardlopen'], hardlopen: ['loop', 'hardlopen'], rennen: ['loop', 'hardlopen'], ren: ['loop', 'hardlopen'], cardio: 'conditie', uithoudingsvermogen: 'conditie',
    sprong: 'springen', spring: 'springen', jump: 'springen', plyometrie: 'springen', plyometrisch: 'springen', explosief: 'explosiviteit', explosiev: 'explosiviteit', snelkracht: 'explosiviteit',
    sterker: 'kracht', sterk: 'kracht', strength: 'kracht', maximaal: 'kracht',
    rust: 'rust', pauz: 'rust', pauze: 'rust',
    herhaling: 'herhaling', rep: 'herhaling', reps: 'herhaling',
    falen: 'falen', failure: 'falen', uitputting: 'falen',
    opwarm: 'warmingup', opwarmen: 'warmingup', warm: 'warmingup', warming: 'warmingup', warmup: 'warmingup',
    afvall: 'afvallen', afvallen: 'afvallen', vetverlies: ['vet', 'afvallen'], cutt: 'afvallen', cut: 'afvallen', droogtrain: 'afvallen', gewichtsverlies: 'afvallen',
    koffie: 'cafeine', caffeine: 'cafeine', preworkout: 'cafeine',
    creatin: 'creatine', kreatine: 'creatine',
    ijsbad: ['koud', 'ijsbad'], ijs: 'koud', koude: 'koud', kou: 'koud', coldplunge: ['koud', 'ijsbad'],
    ibuprofen: 'ontstekingsremmer', nsaid: 'ontstekingsremmer', pijnstiller: 'ontstekingsremmer', diclofenac: 'ontstekingsremmer', naproxen: 'ontstekingsremmer',
    foamroll: 'foamroller', foamroller: 'foamroller', rollen: 'foamroller', massage: 'massage', masseren: 'massage',
    oud: 'leeftijd', ouder: 'leeftijd', ouderen: 'leeftijd', leeftijd: 'leeftijd', veroudering: 'leeftijd',
    bot: 'bot', botten: 'bot', botdichtheid: 'bot', osteoporose: 'bot',
    alcohol: 'alcohol', bier: 'alcohol', drank: 'alcohol', drink: 'alcohol',
    testosteron: 'hormoon', groeihormoon: 'hormoon', hormon: 'hormoon',
    trainingsfrequentie: 'frequentie', vaak: 'frequentie', frequent: 'frequentie', keer: 'frequentie',
    schema: 'schema', programma: 'schema', periodisering: 'periodisering', deload: 'deload', rustweek: 'deload',
    overtraind: 'overtraining', overtrain: 'overtraining', vermoeid: 'moe', vermoeidheid: 'moe', uitgeput: 'moe',
    pols: 'pols', elleboog: 'elleboog', tenniselleboog: ['elleboog', 'pijn'], golferselleboog: ['elleboog', 'pijn'],
    schouder: 'schouder', rotator: 'schouder', cuff: 'schouder', impingement: ['schouder', 'pijn'],
    knie: 'knie', patella: 'knie', knieschijf: 'knie', runnersknee: ['knie', 'pijn'], jumpersknee: ['knie', 'pees'],
    heup: 'heup', bil: 'bil', billen: 'bil', glute: 'bil', glutes: 'bil',
    kuit: 'kuit', kuiten: 'kuit', calf: 'kuit', rugspier: 'rug', lat: 'rug', lats: 'rug',
    buik: 'buik', core: 'buik', sixpack: 'buik', buikspier: 'buik', abs: 'buik',
    borst: 'borst', chest: 'borst', bench: 'bankdrukken', benchpress: 'bankdrukken',
    arm: 'arm', armen: 'arm', biceps: 'arm', triceps: 'arm',
    vezel: 'spiervezel', spiervezels: 'spiervezel',
    calisthenics: 'lichaamsgewicht', bodyweight: 'lichaamsgewicht', pushup: 'opdrukken', push: 'opdrukken',
    rom: 'bewegingsuitslag', range: 'bewegingsuitslag', diep: 'bewegingsuitslag', diept: 'bewegingsuitslag', halve: 'bewegingsuitslag', partial: 'bewegingsuitslag', partials: 'bewegingsuitslag',
    tempo: 'tempo', langzaam: 'tempo', snelheid: 'tempo', excentrisch: 'excentrisch', negatief: 'excentrisch', negatiev: 'excentrisch',
    stappen: 'stap', lopen: 'loop', wandelen: ['loop', 'wandelen'],
    hartslag: 'hart', hart: 'hart', bloeddruk: 'bloeddruk', vo2max: 'conditie', zone2: 'conditie',
    depressie: 'stemming', somber: 'stemming', angst: 'stemming', stress: 'stemming', mentaal: 'stemming',
    supplement: 'supplement', supplementen: 'supplement', vitamine: 'supplement',
    ontbijt: 'eten', maaltijd: 'eten', voeding: 'eten', dieet: 'eten', calorie: 'calorie', calorieen: 'calorie', kcal: 'calorie',
    water: 'vocht', drinken: 'vocht', hydratatie: 'vocht', dorst: 'vocht',
  };

  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  function stem(w) {
    if (w.length > 4 && w.endsWith('en')) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith('s')) w = w.slice(0, -1);
    if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
    return w.replace(/([bdfgklmnprst])\1$/, '$1'); // eiwitten -> eiwitt -> eiwit
  }
  function tokens(text) {
    const out = [];
    for (const w of norm(text).split(' ')) {
      if (!w || STOP.has(w)) continue;
      const s = SYN[w] ?? SYN[stem(w)] ?? stem(w);
      for (const t of [].concat(s)) if (!STOP.has(t)) out.push(t);
    }
    return out;
  }

  const FIELDS = [['q', 3], ['alt', 3], ['tags', 2], ['a', 1], ['doen', 1]];
  function index(items) {
    const docs = items.map((item) => {
      const w = new Map();
      for (const [f, weight] of FIELDS) for (const t of tokens([].concat(item[f] || []).join(' '))) w.set(t, Math.max(w.get(t) || 0, weight));
      return { item, w };
    });
    const df = new Map();
    for (const d of docs) for (const t of d.w.keys()) df.set(t, (df.get(t) || 0) + 1);
    const idf = new Map([...df].map(([t, n]) => [t, Math.log(1 + docs.length / n)]));
    return { docs, idf };
  }

  // ponytail: prefix matching catches Dutch compounds ("spiergroeitraining"); a real decompounder if it misfires.
  const MIN = 1.2;
  function search(idx, text, n = 3) {
    const q = [...new Set(tokens(text))];
    if (!q.length) return [];
    const res = [];
    for (const d of idx.docs) {
      let s = 0;
      for (const t of q) {
        let w = d.w.get(t) || 0, idf = idx.idf.get(t) || 0;
        if (!w && t.length >= 5) for (const [k, kw] of d.w) if (k.length >= 5 && (k.startsWith(t) || t.startsWith(k))) { w = Math.max(w, kw / 2); idf = Math.max(idf, idx.idf.get(k)); }
        s += w * idf;
      }
      s /= Math.sqrt(q.length);
      if (s >= MIN) res.push({ item: d.item, score: s });
    }
    return res.sort((a, b) => b.score - a.score).slice(0, n);
  }

  const api = { tokens, index, search };
  root.Vraag = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
