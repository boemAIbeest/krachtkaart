// Krachtkaart scoring: pure functions, no DOM. Loaded by the page (window.Score) and by node tests.
(function (root) {
  const MUSCLES = {
    borst: 'Borst', schouders: 'Schouders', biceps: 'Biceps', triceps: 'Triceps', onderarmen: 'Onderarmen',
    buik: 'Buikspieren', schuine: 'Schuine buikspieren', trapezius: 'Trapezius', rug: 'Brede rugspier',
    onderrug: 'Onderrug', billen: 'Bilspieren', quadriceps: 'Quadriceps', hamstrings: 'Hamstrings',
    kuiten: 'Kuiten', adductoren: 'Adductoren',
  };
  const LEVELS = ['', 'Beginner', 'Novice', 'Gemiddeld', 'Gevorderd', 'Elite'];
  const PLATES = ['', '5 kg', '10 kg', '15 kg', '20 kg', '25 kg'];
  const RECOVERY = ['Fris', 'Herstellend', 'Moe'];
  const KINDS = ['gewicht', 'lichaamsgewicht', 'explosief', 'skill', 'stretch'];

  const ex = (name, kind, primary, secondary, extra = {}) =>
    ({ name, kind, muscles: { primary, secondary }, aliases: [], ...extra });

  // std = male e1RM / bodyweight thresholds for Novice, Gemiddeld, Gevorderd, Elite (any data = Beginner).
  // ponytail: rough consensus of public strength-standard tables; per-lift tuning is a data edit, not code.
  const CATALOG = [
    ex('Bankdrukken', 'gewicht', ['borst'], ['triceps', 'schouders'], { std: [0.75, 1, 1.5, 2], region: 'boven', aliases: ['bench press', 'bench', 'bankdruk', 'barbell bench press'] }),
    ex('Schuine bankdrukken', 'gewicht', ['borst', 'schouders'], ['triceps'], { std: [0.65, 0.9, 1.25, 1.65], region: 'boven', aliases: ['incline bench', 'incline bench press', 'schuin bankdrukken'] }),
    ex('Dumbbell bankdrukken', 'gewicht', ['borst'], ['triceps', 'schouders'], { aliases: ['dumbbell bench press', 'db bench'] }),
    ex('Push-up', 'lichaamsgewicht', ['borst'], ['triceps', 'schouders', 'buik'], { aliases: ['pushup', 'opdrukken', 'push ups'] }),
    ex('Dips', 'lichaamsgewicht', ['triceps', 'borst'], ['schouders'], { std: [1.15, 1.4, 1.75, 2.1], region: 'boven', aliases: ['dip', 'weighted dips'] }),
    ex('Overhead press', 'gewicht', ['schouders'], ['triceps', 'trapezius'], { std: [0.55, 0.75, 1, 1.25], region: 'boven', aliases: ['ohp', 'military press', 'shoulder press', 'schouderdrukken'] }),
    ex('Lateral raise', 'gewicht', ['schouders'], [], { aliases: ['side raise', 'zijwaarts heffen'] }),
    ex('Face pull', 'gewicht', ['schouders'], ['trapezius'], { aliases: ['facepull'] }),
    ex('Pull-up', 'lichaamsgewicht', ['rug'], ['biceps', 'onderarmen', 'trapezius'], { std: [1.15, 1.35, 1.65, 2], region: 'boven', aliases: ['pullup', 'optrekken'] }),
    ex('Chin-up', 'lichaamsgewicht', ['rug', 'biceps'], ['onderarmen'], { std: [1.15, 1.35, 1.65, 2], region: 'boven', aliases: ['chinup'] }),
    ex('Lat pulldown', 'gewicht', ['rug'], ['biceps'], { std: [0.75, 1, 1.3, 1.6], region: 'boven', aliases: ['pulldown', 'lat pull down'] }),
    ex('Barbell row', 'gewicht', ['rug'], ['trapezius', 'biceps', 'onderrug'], { std: [0.75, 1, 1.5, 1.75], region: 'boven', aliases: ['row', 'bent over row', 'roeien', 'barbell rows'] }),
    ex('Shrugs', 'gewicht', ['trapezius'], ['onderarmen'], { aliases: ['shrug', 'schouderophalen'] }),
    ex('Squat', 'gewicht', ['quadriceps', 'billen'], ['adductoren', 'onderrug', 'hamstrings'], { std: [1.25, 1.5, 2.25, 2.75], region: 'onder', aliases: ['back squat', 'kniebuiging', 'barbell squat'] }),
    ex('Front squat', 'gewicht', ['quadriceps'], ['billen', 'buik'], {}),
    ex('Deadlift', 'gewicht', ['hamstrings', 'billen', 'onderrug'], ['trapezius', 'quadriceps', 'onderarmen', 'rug'], { std: [1.5, 2, 2.5, 3], region: 'onder', aliases: ['doodgewicht', 'conventional deadlift'] }),
    ex('Romanian deadlift', 'gewicht', ['hamstrings'], ['billen', 'onderrug'], { std: [1, 1.4, 1.9, 2.4], region: 'onder', aliases: ['rdl', 'roemeense deadlift'] }),
    ex('Hip thrust', 'gewicht', ['billen'], ['hamstrings'], { std: [1, 1.5, 2.25, 3], region: 'onder', aliases: ['hipthrust', 'barbell hip thrust'] }),
    ex('Leg press', 'gewicht', ['quadriceps'], ['billen'], { std: [1.75, 2.5, 3.5, 4.5], region: 'onder', aliases: ['legpress', 'beenpers'] }),
    ex('Bulgarian split squat', 'gewicht', ['quadriceps', 'billen'], ['adductoren'], { std: [0.5, 0.8, 1.1, 1.4], region: 'onder', aliases: ['bss', 'split squat'] }),
    ex('Lunges', 'gewicht', ['quadriceps', 'billen'], ['hamstrings'], { aliases: ['lunge', 'uitvalspas'] }),
    ex('Leg curl', 'gewicht', ['hamstrings'], [], { aliases: ['hamstring curl'] }),
    ex('Leg extension', 'gewicht', ['quadriceps'], [], { aliases: ['beenstrekker'] }),
    ex('Calf raise', 'gewicht', ['kuiten'], [], { aliases: ['kuitheffen', 'calf raises'] }),
    ex('Biceps curl', 'gewicht', ['biceps'], ['onderarmen'], { std: [0.4, 0.6, 0.85, 1.15], region: 'boven', aliases: ['curl', 'barbell curl', 'bicep curl'] }),
    ex('Hammer curl', 'gewicht', ['biceps', 'onderarmen'], [], {}),
    ex('Triceps pushdown', 'gewicht', ['triceps'], [], { aliases: ['pushdown', 'tricep pushdown'] }),
    ex('Hanging leg raise', 'lichaamsgewicht', ['buik'], ['onderarmen'], { aliases: ['leg raise', 'benen heffen'] }),
    ex('Plank', 'lichaamsgewicht', ['buik'], ['schuine'], {}),
    ex('Ab wheel', 'lichaamsgewicht', ['buik'], ['schuine'], { aliases: ['ab roller'] }),
    ex('Power clean', 'gewicht', ['billen', 'hamstrings', 'quadriceps'], ['trapezius', 'onderrug'], { std: [0.75, 1, 1.3, 1.6], region: 'onder', aliases: ['clean'] }),
    ex('Box jump', 'explosief', ['quadriceps', 'billen'], ['kuiten'], { aliases: ['boxjump', 'box jumps'] }),
    ex('Broad jump', 'explosief', ['quadriceps', 'billen'], ['hamstrings', 'kuiten'], { aliases: ['verspringen'] }),
    ex('Jump squat', 'explosief', ['quadriceps', 'billen'], ['kuiten'], { aliases: ['squat jump', 'sprongsquat'] }),
    ex('Sprint', 'explosief', ['hamstrings', 'billen', 'quadriceps'], ['kuiten'], { aliases: ['sprinten', 'sprints'] }),
    ex('Kettlebell swing', 'explosief', ['billen', 'hamstrings'], ['onderrug', 'schouders'], { aliases: ['kb swing'] }),
    ex('Front lever', 'skill', ['rug', 'buik'], ['biceps'], { ladder: ['Tuck', 'Advanced tuck', 'Eén been', 'Straddle', 'Volledig'] }),
    ex('Planche', 'skill', ['schouders', 'borst'], ['triceps', 'buik'], { ladder: ['Planche lean', 'Tuck', 'Advanced tuck', 'Straddle', 'Volledig'] }),
    ex('Handstand', 'skill', ['schouders'], ['triceps', 'trapezius'], { ladder: ['Tegen de muur', 'Buik naar de muur, 60 s', 'Vrij, 10 s', 'Vrij, 30 s', 'Vrije handstand push-up'] }),
    ex('Muscle-up', 'skill', ['rug', 'triceps'], ['borst', 'biceps'], { ladder: ['Explosieve pull-up tot de borst', 'Negatieve muscle-up', 'Eén muscle-up', 'Vijf muscle-ups', 'Tien strikte muscle-ups'] }),
    ex('Pistol squat', 'skill', ['quadriceps', 'billen'], ['kuiten'], { ladder: ['Op een box', 'Met hulp', 'Eén pistol', 'Vijf per been', 'Met gewicht'] }),
    ex('L-sit', 'skill', ['buik'], ['triceps'], { ladder: ['Tuck, 10 s', 'L-sit, 10 s', 'L-sit, 30 s', 'V-sit', 'Manna-progressie'] }),
    // Stretches: "Stretchen" is the generic one; the parser fills in which muscles.
    ex('Stretchen', 'stretch', [], [], { aliases: ['stretch', 'rekken', 'gestretcht'] }),
    ex('Hamstring stretch', 'stretch', ['hamstrings'], [], { aliases: ['hamstrings stretchen', 'hamstring rekken'] }),
    ex('Quad stretch', 'stretch', ['quadriceps'], [], { aliases: ['quadriceps stretch', 'quads stretchen'] }),
    ex('Heupflexor stretch', 'stretch', ['quadriceps'], ['billen'], { aliases: ['hip flexor stretch', 'couch stretch', 'heup stretch'] }),
    ex('Duivenhouding', 'stretch', ['billen'], [], { aliases: ['pigeon stretch', 'pigeon pose'] }),
    ex('Borst stretch', 'stretch', ['borst'], ['schouders'], { aliases: ['chest stretch', 'borststretch'] }),
    ex('Lat stretch', 'stretch', ['rug'], [], { aliases: ['rug stretch'] }),
    ex('Kuit stretch', 'stretch', ['kuiten'], [], { aliases: ['calf stretch', 'kuitstretch'] }),
    ex('Butterfly', 'stretch', ['adductoren'], [], { aliases: ['butterfly stretch'] }),
    ex('Pancake', 'stretch', ['hamstrings', 'adductoren'], [], { aliases: ['pancake stretch'] }),
    ex('Spagaat', 'stretch', ['hamstrings', 'adductoren', 'quadriceps'], [], { aliases: ['splits'] }),
    ex('Jefferson curl', 'stretch', ['onderrug', 'hamstrings'], [], {}),
    ex('Schouder dislocates', 'stretch', ['schouders'], ['borst'], { aliases: ['shoulder dislocates', 'dislocates'] }),
    ex('Polsstretch', 'stretch', ['onderarmen'], [], { aliases: ['wrist stretch', 'pols stretch'] }),
    ex('Cat-cow', 'stretch', ['onderrug'], [], { aliases: ['cat cow', 'kat koe'] }),
  ];
  // Dutch everyday names the speech parser will hear.
  const EXTRA_ALIASES = { 'Pull-up': ['optrekken', 'pull ups'], 'Push-up': ['push ups'], 'Squat': ['kniebuigingen', 'squats'], 'Deadlift': ['deadlifts'] };
  for (const e of CATALOG) e.aliases.push(...(EXTRA_ALIASES[e.name] || []));

  const norm = (s) => String(s || '').toLowerCase().replace(/^\s*(weighted|gewogen)\s+/, '')
    .replace(/[^a-z0-9]/g, '').replace(/s$/, '');
  const INDEX = new Map();
  for (const e of CATALOG) for (const n of [e.name, ...e.aliases]) INDEX.set(norm(n), e);
  const findExercise = (name) => INDEX.get(norm(name)) || null;

  const e1rm = (load, reps) => (reps <= 0 || load <= 0) ? 0 : reps === 1 ? load : load * (1 + Math.min(reps, 15) / 30);
  const levelFor = (ratio, t) => 1 + t.filter((x) => ratio >= x).length;
  const thresholds = (e, sex) => e.std.map((x) => sex === 'v' ? x * (e.region === 'onder' ? 0.75 : 0.6) : x);

  const strs = (a) => (Array.isArray(a) ? a : []).map(String);
  // Exercises from kennis.json: known names gain days/dose/source, new names join the catalog.
  function addExercises(list) {
    for (const raw of Array.isArray(list) ? list : []) {
      if (!raw || !raw.name) continue;
      const extra = { fromKennis: true, days: strs(raw.days), ...(raw.dose && { dose: raw.dose }), ...(raw.source && { source: String(raw.source) }), ...(raw.note && { note: String(raw.note) }) };
      let e = findExercise(raw.name);
      if (e) {
        Object.assign(e, extra, { days: [...new Set([...(e.days || []), ...extra.days])] });
      } else {
        const m = cleanMuscles(raw.muscles);
        e = ex(String(raw.name), KINDS.includes(raw.kind) ? raw.kind : 'gewicht', m.primary, m.secondary, extra);
        if (Array.isArray(raw.ladder) && raw.ladder.length === 5) e.ladder = strs(raw.ladder);
        CATALOG.push(e);
        INDEX.set(norm(e.name), e);
      }
      for (const a of strs(raw.aliases)) { e.aliases.push(a); INDEX.set(norm(a), e); }
    }
  }

  const cleanMuscles = (m) => ({
    primary: (m?.primary || []).filter((x) => x in MUSCLES),
    secondary: (m?.secondary || []).filter((x) => x in MUSCLES),
  });
  // The catalog wins over whatever the parser guessed, so scoring stays consistent.
  const resolve = (entry) => {
    const e = findExercise(entry.exercise);
    return e ? { key: e.name, ex: e, kind: e.kind, muscles: e.muscles }
      : { key: entry.exercise || 'Onbekend', ex: null, kind: KINDS.includes(entry.kind) ? entry.kind : 'gewicht', muscles: cleanMuscles(entry.muscles) };
  };
  const loadOf = (kind, s, bw) => kind === 'lichaamsgewicht' ? bw + (+s.kg || 0) : (+s.kg || 0);
  const ageHours = (at, now) => Math.max(0, (now - Date.parse(at)) / 3600e3);

  function bestPerExercise(workouts, bw, sex) {
    const out = {};
    for (const w of workouts) for (const entry of w.entries || []) {
      const r = resolve(entry);
      const b = out[r.key] || (out[r.key] = { name: r.key, kind: r.kind, muscles: r.muscles, e1rm: 0, step: 0, level: null, at: null });
      for (const s of entry.sets || []) {
        if (r.kind === 'skill') {
          const step = Math.min(5, Math.max(0, Math.round(+s.step || 0)));
          if (step > b.step) { b.step = step; b.at = w.at; }
        } else if (r.kind !== 'stretch') {
          const v = e1rm(loadOf(r.kind, s, bw), +s.reps || 0);
          if (v > b.e1rm) { b.e1rm = v; b.at = w.at; }
        }
      }
      if (r.ex?.std && b.e1rm && bw) b.level = levelFor(b.e1rm / bw, thresholds(r.ex, sex));
      if (r.ex?.ladder && b.step) b.level = b.step;
    }
    return out;
  }

  function muscleLevels(workouts, bw, sex) {
    const out = {};
    const bump = (m, level, from) => { if (!out[m] || level > out[m].level) out[m] = { level, from }; };
    for (const b of Object.values(bestPerExercise(workouts, bw, sex))) {
      if (!b.level) continue;
      b.muscles.primary.forEach((m) => bump(m, b.level, b.name));
      b.muscles.secondary.forEach((m) => bump(m, Math.max(1, b.level - 1), b.name));
    }
    return out;
  }

  function recovery(workouts, now) {
    const out = {};
    for (const w of workouts) {
      const f = 1 - ageHours(w.at, now) / 72;
      if (f <= 0) continue;
      for (const entry of w.entries || []) {
        const r = resolve(entry);
        if (r.kind === 'stretch') continue;
        const n = (entry.sets || []).length;
        r.muscles.primary.forEach((m) => { out[m] = (out[m] || 0) + n * f; });
        r.muscles.secondary.forEach((m) => { out[m] = (out[m] || 0) + n * f * 0.5; });
      }
    }
    return out;
  }
  const recoveryStatus = (score) => score < 3 ? 0 : score <= 8 ? 1 : 2;

  function muscleDates(workouts) {
    const out = { trained: {}, stretched: {} };
    for (const w of workouts) for (const entry of w.entries || []) {
      const r = resolve(entry);
      const bucket = r.kind === 'stretch' ? out.stretched : out.trained;
      for (const m of [...r.muscles.primary, ...r.muscles.secondary]) if (!bucket[m] || w.at > bucket[m]) bucket[m] = w.at;
    }
    return out;
  }

  const UNITS = ['kg', 'trede', 'reps', 's'];
  function metric(r, s, bw) {
    if (r.kind === 'skill' && +s.step) return { v: +s.step, u: 'trede' };
    if (r.kind === 'gewicht' || r.ex?.std) {
      const v = e1rm(loadOf(r.kind, s, bw), +s.reps || 0);
      if (v) return { v: Math.round(v * 10) / 10, u: 'kg' };
    }
    if (+s.reps) return { v: +s.reps, u: 'reps' };
    if (+s.sec) return { v: +s.sec, u: 's' };
    return null;
  }

  // One point per session: the best set, in the most meaningful unit present across the series.
  function exerciseSeries(workouts, name, bw) {
    const key = findExercise(name)?.name || name;
    const points = [];
    for (const w of workouts) for (const entry of w.entries || []) {
      const r = resolve(entry);
      if (r.key !== key) continue;
      for (const s of entry.sets || []) { const m = metric(r, s, bw); if (m) points.push({ at: w.at, ...m }); }
    }
    const unit = UNITS.find((u) => points.some((p) => p.u === u));
    const best = new Map();
    for (const p of points) if (p.u === unit && (!best.has(p.at) || p.v > best.get(p.at))) best.set(p.at, p.v);
    return [...best].map(([at, value]) => ({ at, value, unit })).sort((a, b) => a.at.localeCompare(b.at));
  }

  function weekStats(workouts, now) {
    const recent = workouts.filter((w) => ageHours(w.at, now) <= 168);
    const hardSets = recent.reduce((n, w) => n + (w.entries || [])
      .filter((e) => resolve(e).kind !== 'stretch')
      .reduce((k, e) => k + (e.sets || []).length, 0), 0);
    return { sessions: recent.length, hardSets };
  }

  const api = {
    MUSCLES, LEVELS, PLATES, RECOVERY, KINDS, CATALOG, findExercise, addExercises, norm, e1rm, levelFor, thresholds, resolve,
    bestPerExercise, muscleLevels, recovery, recoveryStatus, muscleDates, exerciseSeries, weekStats,
  };
  root.Score = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
