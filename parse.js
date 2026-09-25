// Dutch workout text -> entries, with fixed patterns (no AI). Needs window.Score / globalThis.Score.
(function (root) {
  const UNITS = { een: 1, 'één': 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9 };
  const TEENS = { tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17, achttien: 18, negentien: 19 };
  const TENS = { twintig: 20, dertig: 30, veertig: 40, vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90 };

  function under100(w) {
    if (w in TEENS) return TEENS[w];
    if (w in TENS) return TENS[w];
    if (w in UNITS && w !== 'een') return UNITS[w]; // bare "een" is usually the article
    const m = w.match(/^(een|één|twee|drie|vier|vijf|zes|zeven|acht|negen)(?:en|ën)(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/);
    return m ? UNITS[m[1]] + TENS[m[2]] : null;
  }
  function wordToNum(w) {
    const m = w.match(/^(twee|drie|vier|vijf|zes|zeven|acht|negen)?honderd(.*)$/);
    if (!m) return under100(w);
    const base = (m[1] ? UNITS[m[1]] : 1) * 100;
    if (!m[2]) return base;
    const rest = under100(m[2]) ?? UNITS[m[2]] ?? null;
    return rest == null ? null : base + rest;
  }

  function numbersNl(text) {
    return String(text).toLowerCase()
      .replace(/\banderhalve?\b/g, '1.5')
      .replace(/\b(?:een\s+)?halve\s+minuut\b/g, '30 seconden')
      .replace(/[a-zëéïöü]+/g, (w) => { const n = wordToNum(w); return n == null ? w : String(n); })
      .replace(/\b(?:een|één)\s+(set|minuut|keer|herhaling)\b/g, '1 $1')
      .replace(/(\d+)\s+en\s+een\s+half\b/g, (_, n) => String(+n + 0.5))
      .replace(/(\d+),(\d+)/g, '$1.$2')
      .replace(/(\d+)\s+komma\s+(\d+)/g, '$1.$2');
  }

  const MUSCLE_WORDS = {
    borst: 'borst', schouder: 'schouders', schouders: 'schouders', biceps: 'biceps', triceps: 'triceps',
    onderarm: 'onderarmen', onderarmen: 'onderarmen', pols: 'onderarmen', polsen: 'onderarmen',
    buik: 'buik', buikspieren: 'buik', core: 'buik', schuine: 'schuine', trapezius: 'trapezius', nek: 'trapezius',
    rug: 'rug', lats: 'rug', onderrug: 'onderrug', billen: 'billen', bil: 'billen', heup: 'billen', heupen: 'billen',
    quadriceps: 'quadriceps', quads: 'quadriceps', bovenbenen: 'quadriceps', hamstring: 'hamstrings', hamstrings: 'hamstrings',
    kuit: 'kuiten', kuiten: 'kuiten', adductoren: 'adductoren', lies: 'adductoren', liezen: 'adductoren',
  };
  const FILLER = new Set(['daarna', 'daarnaast', 'vervolgens', 'gedaan', 'getraind', 'training', 'vandaag', 'gisteren', 'eergisteren', 'beetje', 'lekker', 'zwaar', 'goed']);

  // Speech text is lowercase, maybe without punctuation. Decimals become "§" so "." can split sentences.
  const clean = (s) => s.replace(/×/g, 'x').replace(/[-_/+']/g, ' ').replace(/[^a-z0-9§ëéïöü ]/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const N = '(\\d+(?:§\\d+)?)';
  const num = (s) => parseFloat(s.replace('§', '.'));

  function phrases() {
    const list = [];
    for (const e of root.Score.CATALOG) for (const n of [e.name, ...e.aliases]) {
      const p = clean(String(n).toLowerCase());
      if (p.length >= 3) list.push({ re: new RegExp('(?:^| )(' + esc(p) + 's?)(?= |$)', 'g'), e, len: p.length });
    }
    return list.sort((a, b) => b.len - a.len);
  }

  // Non-overlapping exercise mentions in a piece, longest phrase wins.
  function mentions(text, list) {
    const found = [];
    for (const { re, e } of list) {
      re.lastIndex = 0;
      for (let m; (m = re.exec(text));) {
        const start = m.index + m[0].indexOf(m[1]), end = start + m[1].length;
        if (!found.some((f) => start < f.end && end > f.start)) found.push({ start, end, e });
      }
    }
    return found.sort((a, b) => a.start - b.start);
  }

  function take(state, re, fn) {
    const m = re.exec(state.s);
    if (!m) return false;
    fn(m);
    state.s = state.s.slice(0, m.index) + ' ' + state.s.slice(m.index + m[0].length);
    return true;
  }

  function setsFrom(text, e) {
    const st = { s: ' ' + text + ' ' };
    const o = {};
    let sets;
    take(st, new RegExp(N + '\\s*(?:x|keer|maal)\\s*' + N + '(\\s*(?:kilogram|kilo s|kilos|kilo|kg|seconden|seconde|sec|s|minuten|minuut|min)\\b)?'), (m) => {
      const unit = (m[3] || '').trim();
      if (/^(kilo|kg)/.test(unit)) { o.reps = num(m[1]); o.kg = num(m[2]); }
      else if (/^(sec|s)/.test(unit)) { sets = num(m[1]); o.sec = num(m[2]); }
      else if (/^min/.test(unit)) { sets = num(m[1]); o.sec = num(m[2]) * 60; }
      else { sets = num(m[1]); o.reps = num(m[2]); }
    });
    take(st, /(\d+)\s*(?:sets|set|series|serie|rondes|ronde)\b/, (m) => { sets = sets || +m[1]; });
    if (o.sec == null) take(st, new RegExp(N + '\\s*(?:minuten|minuut|min)\\b'), (m) => { o.sec = num(m[1]) * 60; });
    if (o.sec == null) take(st, /(\d+)\s*(?:seconden|seconde|sec|s)\b/, (m) => { o.sec = +m[1]; });
    if (o.kg == null) take(st, new RegExp(N + '\\s*(?:kilogram|kilo s|kilos|kilo|kg)\\b'), (m) => { o.kg = num(m[1]); });
    if (o.kg == null) take(st, new RegExp('\\b(?:met|op)\\s+' + N + '\\b(?!\\s*(?:keer|herhalingen|herhaling|reps|rep|x|sets|set|seconden|sec|minuten|min))'), (m) => { o.kg = num(m[1]); });
    if (o.reps == null) take(st, /(\d+)\s*(?:keer|herhalingen|herhaling|reps|rep|x)\b/, (m) => { o.reps = +m[1]; });
    if (o.reps == null) take(st, /\bvan\s+(\d+)\b/, (m) => { o.reps = +m[1]; });
    if (e.ladder) {
      take(st, /\bstap\s*(\d)\b/, (m) => { o.step = Math.min(5, +m[1]); });
      if (o.step == null) {
        const steps = e.ladder.map((name, i) => ({ p: clean(name.toLowerCase()), i })).sort((a, b) => b.p.length - a.p.length);
        const hit = steps.find(({ p }) => new RegExp('(?:^| )' + esc(p) + '(?= |$)').test(st.s));
        if (hit) o.step = hit.i + 1;
      }
    }
    if (o.reps == null && o.sec == null && e.kind !== 'stretch') take(st, /\b(\d+)\b/, (m) => { o.reps = +m[1]; });
    for (const k of Object.keys(o)) if (!(o[k] > 0)) delete o[k];
    if (!Object.keys(o).length) return [];
    return Array.from({ length: Math.min(sets || 1, 20) }, () => ({ ...o }));
  }

  function musclesFrom(text) {
    const out = [];
    for (const w of text.split(' ')) { const m = MUSCLE_WORDS[w]; if (m && !out.includes(m)) out.push(m); }
    return out;
  }

  function shiftDate(today, days) {
    const d = new Date(today + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  function workout(text, opts = {}) {
    const today = opts.today || new Date().toISOString().slice(0, 10);
    const t = numbersNl(text).replace(/(\d)\.(\d)/g, '$1§$2');
    const date = /\beergisteren\b/.test(t) ? shiftDate(today, 2) : /\bgisteren\b/.test(t) ? shiftDate(today, 1) : null;
    const list = phrases();
    const entries = [], unknown = [];

    for (const sentence of t.split(/[.;!?\n]+|\b(?:daarna|toen|vervolgens|daarnaast|dan)\b/)) {
      const groups = [];
      let pending = [];
      let any = false;
      for (const rawPiece of sentence.split(',')) {
        const piece = clean(rawPiece);
        if (!piece) continue;
        const ms = mentions(piece, list);
        if (!ms.length) {
          if (/\d/.test(piece)) (groups.length ? groups[groups.length - 1].texts : pending).push(piece);
          continue;
        }
        any = true;
        // Split before each later mention; "3 sets" right before a name belongs to that name.
        const cuts = ms.map((m, i) => {
          if (i === 0) return 0;
          const before = piece.slice(0, m.start).match(/(\d+\s*(?:sets|set|series|serie|rondes|ronde)\s*(?:van\s*)?)$/);
          return before ? m.start - before[1].length : m.start;
        });
        ms.forEach((m, i) => {
          const part = piece.slice(cuts[i], i + 1 < ms.length ? cuts[i + 1] : piece.length);
          groups.push({ e: m.e, texts: i === 0 ? [...pending, part] : [part] });
          pending = [];
        });
      }
      for (const g of groups) {
        const joined = g.texts.join(' ');
        const generic = g.e.kind === 'stretch' && !g.e.muscles.primary.length;
        entries.push({
          exercise: g.e.name,
          kind: g.e.kind,
          muscles: generic ? { primary: musclesFrom(joined), secondary: [] } : { primary: [...g.e.muscles.primary], secondary: [...g.e.muscles.secondary] },
          sets: setsFrom(joined, g.e),
        });
      }
      const words = clean(sentence).split(' ').filter(Boolean);
      if (!any && (words.some((w) => /\d/.test(w)) || words.some((w) => w.length >= 5 && !FILLER.has(w)))) {
        unknown.push(clean(sentence).replace(/§/g, ','));
      }
    }
    return { date, entries, unknown };
  }

  const api = { numbersNl, workout };
  root.Parse = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
