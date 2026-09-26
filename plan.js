// Training days, exercise lists and targets, with fixed rules. Needs Score (score.js).
(function (root) {
  const Sc = () => root.Score;
  const DAY = 864e5;
  const DAYS = [
    { id: 'push', label: 'Push', muscles: ['borst', 'schouders', 'triceps'], defaults: ['Bankdrukken', 'Schuine bankdrukken', 'Overhead press', 'Dips', 'Lateral raise', 'Triceps pushdown'] },
    { id: 'pull', label: 'Pull', muscles: ['rug', 'biceps', 'trapezius', 'onderarmen'], defaults: ['Pull-up', 'Barbell row', 'Lat pulldown', 'Face pull', 'Biceps curl', 'Hammer curl'] },
    { id: 'benen', label: 'Benen (explosief)', muscles: ['quadriceps', 'hamstrings', 'billen', 'kuiten', 'adductoren'], defaults: ['Box jump', 'Jump squat', 'Broad jump', 'Squat', 'Romanian deadlift', 'Bulgarian split squat', 'Calf raise'] },
    { id: 'mobility', label: 'Mobility', muscles: [], defaults: [] },
    { id: 'calisthenics', label: 'Calisthenics', muscles: ['rug', 'schouders', 'buik', 'triceps'], defaults: ['Front lever', 'Handstand', 'Muscle-up', 'L-sit', 'Planche', 'Pistol squat', 'Pull-up', 'Dips', 'Push-up'] },
    { id: 'upper', label: 'Upper', muscles: ['borst', 'rug', 'schouders', 'biceps', 'triceps'], defaults: ['Bankdrukken', 'Pull-up', 'Overhead press', 'Barbell row', 'Dips', 'Biceps curl'] },
    { id: 'lower', label: 'Lower', muscles: ['quadriceps', 'hamstrings', 'billen', 'kuiten'], defaults: ['Squat', 'Deadlift', 'Hip thrust', 'Leg curl', 'Leg extension', 'Calf raise'] },
    { id: 'borst-rug', label: 'Borst & rug', muscles: ['borst', 'rug'], defaults: ['Bankdrukken', 'Pull-up', 'Schuine bankdrukken', 'Barbell row', 'Dips', 'Lat pulldown'] },
    { id: 'armen-schouders', label: 'Armen & schouders', muscles: ['schouders', 'biceps', 'triceps', 'onderarmen'], defaults: ['Overhead press', 'Lateral raise', 'Face pull', 'Biceps curl', 'Triceps pushdown', 'Hammer curl'] },
    { id: 'fullbody', label: 'Full body', muscles: ['borst', 'rug', 'schouders', 'quadriceps', 'hamstrings', 'billen'], defaults: ['Squat', 'Bankdrukken', 'Pull-up', 'Romanian deadlift', 'Overhead press', 'Plank'] },
  ];
  const LEGS = ['quadriceps', 'hamstrings', 'billen', 'kuiten', 'adductoren'];
  const dayById = (id) => DAYS.find((d) => d.id === id);
  const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 1;
  const keyOf = (entry) => Sc().findExercise(entry.exercise)?.name || entry.exercise;
  const newestFirst = (ws) => [...ws].sort((a, b) => b.at.localeCompare(a.at));

  function daysSince(dayId, workouts, now) {
    const last = workouts.filter((w) => w.dayType === dayId).reduce((m, w) => (w.at > m ? w.at : m), '');
    return last ? (now - Date.parse(last)) / DAY : Infinity;
  }
  const sinceText = (d) => d === Infinity ? 'nog nooit gedaan' : d < 1 ? 'vandaag al gedaan' : Math.round(d) === 1 ? 'gisteren voor het laatst' : `${Math.round(d)} dagen geleden voor het laatst`;

  function recommendDay(workouts, now) {
    const S = Sc();
    const rec = S.recovery(workouts, now);
    const dates = S.muscleDates(workouts);
    let best = null;
    for (const d of DAYS) {
      const since = daysSince(d.id, workouts, now);
      let score, reason;
      if (d.id === 'mobility') {
        const loose = Object.keys(S.MUSCLES).filter((m) => !dates.stretched[m] || now - Date.parse(dates.stretched[m]) > 7 * DAY).length;
        score = 4 + 0.5 * Math.min(since, 10) + 0.5 * loose;
        reason = `${loose} spiergroepen zijn deze week niet gestretcht, ${sinceText(since)}.`;
      } else {
        const ready = mean(d.muscles.map((m) => 1 - Math.min(rec[m] || 0, 10) / 10));
        const tired = d.muscles.some((m) => S.recoveryStatus(rec[m] || 0) === 2);
        score = 10 * ready + Math.min(since, 10) - (tired ? 5 : 0);
        reason = `${ready > 0.8 ? 'Deze spieren zijn fris' : ready > 0.5 ? 'Deze spieren zijn grotendeels hersteld' : 'Deze spieren zijn nog aan het herstellen'}, ${sinceText(since)}.`;
      }
      if (!best || score > best.score) best = { id: d.id, label: d.label, score, reason };
    }
    return best;
  }

  function lastDone(workouts) {
    const out = {};
    for (const w of workouts) for (const e of w.entries || []) { const k = keyOf(e); if (!out[k] || w.at > out[k]) out[k] = w.at; }
    return out;
  }

  function item(e, dayId, last) {
    return {
      name: e.name, kind: e.kind, fromKennis: !!e.fromKennis && (e.days || []).includes(dayId),
      source: e.source || null, dose: e.dose || null, note: e.note || '', lastAt: last[e.name] || null,
    };
  }
  const age = (x, now) => x.lastAt ? now - Date.parse(x.lastAt) : 1e15;

  // Knowledge exercises for this day first, then the longest rested. Only names in `mine` (the switched-on list) come up.
  function pool(dayId, workouts, now, mine) {
    const S = Sc(), d = dayById(dayId), last = lastDone(workouts), seen = new Map();
    const stretchDay = dayId === 'mobility';
    const add = (e) => { if (e && !seen.has(e.name) && (!mine || mine.includes(e.name)) && (e.kind === 'stretch') === stretchDay && (!stretchDay || e.muscles.primary.length)) seen.set(e.name, e); };
    S.CATALOG.filter((e) => e.fromKennis && (e.days || []).includes(dayId)).forEach(add);
    (stretchDay ? S.CATALOG.filter((e) => e.kind === 'stretch') : d.defaults.map((n) => S.findExercise(n))).forEach(add);
    workouts.filter((w) => w.dayType === dayId).forEach((w) => (w.entries || []).forEach((en) => add(S.findExercise(en.exercise))));
    return [...seen.values()].map((e) => item(e, dayId, last))
      .sort((a, b) => (b.fromKennis - a.fromKennis) || (age(b, now) - age(a, now)));
  }

  function parseRange(r) {
    if (r == null) return null;
    const m = String(r).match(/(\d+)\s*(?:-|–|tot)\s*(\d+)/);
    if (m) return [+m[1], +m[2]];
    const n = parseFloat(r);
    return Number.isFinite(n) ? [n, n] : null;
  }
  const maxOf = (sets, k) => Math.max(0, ...sets.map((s) => +s[k] || 0));

  // What to aim for today, from the last time and the knowledge dose (double progression).
  function target(name, workouts) {
    const e = Sc().findExercise(name);
    const key = e?.name || name, kind = e?.kind || 'gewicht', dose = e?.dose || {};
    const range = parseRange(dose.reps);
    const last = newestFirst(workouts).flatMap((w) => w.entries || []).find((en) => keyOf(en) === key && (en.sets || []).length);
    const sets = +dose.sets || last?.sets.length || (kind === 'stretch' ? 1 : 3);
    if (kind === 'stretch') return { sets, sec: (last && maxOf(last.sets, 'sec')) || +dose.sec || 60 };
    if (kind === 'skill') {
      const t = { sets, step: (last && maxOf(last.sets, 'step')) || +dose.step || 1 };
      const sec = (last && maxOf(last.sets, 'sec')) || +dose.sec, reps = last && maxOf(last.sets, 'reps');
      if (sec) t.sec = sec; else if (reps) t.reps = reps;
      return t;
    }
    // Holds (plank, frog stand) are logged in seconds.
    if (e?.hold) return { sets, sec: (last && maxOf(last.sets, 'sec')) || +dose.sec || 20 };
    if (!last) return { sets, reps: range ? range[0] : 8 };
    const kg = maxOf(last.sets, 'kg');
    const top = last.sets.filter((s) => (+s.kg || 0) === kg);
    const minReps = Math.min(...top.map((s) => +s.reps || 0));
    const goal = range ? range[1] : maxOf(top, 'reps');
    const hit = minReps > 0 && minReps >= goal;
    if (kind === 'explosief') return kg ? { sets, reps: goal, kg } : { sets, reps: goal };
    if (!kg) return { sets, reps: hit ? goal + 1 : goal };
    if (hit) {
      const lower = e?.region === 'onder' || (e?.muscles.primary || []).some((m) => LEGS.includes(m));
      return { sets, reps: range ? range[0] : goal, kg: kg + (lower ? 5 : 2.5) };
    }
    return { sets, reps: range ? Math.min(range[1], minReps + 1) : goal, kg };
  }

  // Which day type a spoken workout most resembles.
  function guessDay(entries) {
    const S = Sc();
    if (!entries.length) return 'fullbody';
    const kinds = entries.map((e) => S.findExercise(e.exercise)?.kind || e.kind);
    if (kinds.every((k) => k === 'stretch')) return 'mobility';
    if (kinds.filter((k) => k === 'skill').length * 2 >= entries.length) return 'calisthenics';
    // Stretches say nothing about the day; exercises that belong to a day count double.
    const work = entries.filter((e, i) => kinds[i] !== 'stretch').map((e) => ({ e, ex: S.findExercise(e.exercise) }));
    const prim = new Set(work.flatMap(({ e, ex }) => ex?.muscles.primary || e.muscles?.primary || []));
    const explosive = kinds.includes('explosief');
    let best = null;
    for (const d of DAYS) {
      if (!d.muscles.length) continue;
      const members = work.filter(({ ex }) => ex && (d.defaults.includes(ex.name) || (ex.days || []).includes(d.id))).length;
      const hits = d.muscles.filter((m) => prim.has(m)).length;
      const miss = [...prim].filter((m) => !d.muscles.includes(m)).length;
      const score = 2 * members + hits - 0.5 * miss - 0.25 * (d.muscles.length - hits) + (explosive && d.id === 'benen' ? 1 : 0);
      if (!best || score > best.score) best = { id: d.id, score };
    }
    return best.id;
  }

  const api = { DAYS, dayById, recommendDay, pool, target, guessDay, lastDone };
  root.Plan = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
