// Krachtkaart (standalone): data on this phone, day choice, set-by-set training, Dutch speech input.
// Needs Score (score.js), Body (body.js), Parse (parse.js) and Plan (plan.js).
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAY = 864e5;
  const fmtDay = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtDate = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const safeUrl = (u) => /^https?:\/\//i.test(String(u || ''));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const nlNum = (v) => (+v).toLocaleString('nl-NL');
  const KIND_NL = { gewicht: 'Gewicht', lichaamsgewicht: 'Lichaamsgewicht', explosief: 'Explosief', skill: 'Calisthenics', stretch: 'Stretch' };
  const dayLabel = (id) => Plan.dayById(id)?.label || 'Training';

  function ago(iso) {
    if (!iso) return 'nog nooit';
    const a = new Date(); a.setHours(0, 0, 0, 0);
    const b = new Date(iso); b.setHours(0, 0, 0, 0);
    const n = Math.round((a - b) / DAY);
    return n <= 0 ? 'vandaag' : n === 1 ? 'gisteren' : n + ' dagen geleden';
  }

  // ---------- storage (this phone only) ----------
  const KEY = 'krachtkaart.v1';
  // mine = the exercises the app may use; seen = names already shown in Mijn oefeningen (null until kennis.json loads once).
  const blank = () => ({ workouts: [], profile: null, notes: [], active: null, lastBackup: null, seen: null, custom: [] });
  // Older saves had an archive instead: everything ever logged goes on, minus what was archived (squat and deadlift by default).
  function migrate(s) {
    if (!Array.isArray(s.mine)) {
      const arch = s.archived || ['Squat', 'Deadlift'];
      const logged = s.workouts.flatMap((w) => (w.entries || []).map((e) => Score.findExercise(e.exercise)?.name || e.exercise));
      s.mine = [...new Set(logged)].filter((n) => !arch.includes(n));
    }
    delete s.archived;
    return s;
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      return migrate(d && Array.isArray(d.workouts) ? { ...blank(), ...d } : blank());
    } catch { return migrate(blank()); }
  }
  let S = load();
  let persistAsked = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {
      toast('Opslaan op deze telefoon lukte niet. Maak een back-up bij Profiel.');
      return false;
    }
    if (!persistAsked && navigator.storage?.persist) { persistAsked = true; navigator.storage.persist().catch(() => {}); }
    return true;
  }
  const U = { mode: 'kracht', sel: null, day: null, picks: new Set(), extra: [], ex: null, restore: null, tab: 'vandaag', back: null, fresh: new Set(), theme: null, editC: null };

  // Shown on Vandaag and Voortgang until the first real training; never saved.
  const EXAMPLE = (() => {
    const at = (days) => new Date(Date.now() - days * DAY).toISOString();
    const rep = (n, s) => Array.from({ length: n }, () => ({ ...s }));
    const E = (exercise, kind, sets, primary) => ({ exercise, kind, sets, muscles: { primary: primary || [], secondary: [] } });
    return [
      { id: 'v1', dayType: 'push', at: at(1), raw: '', entries: [
        E('Bankdrukken', 'gewicht', rep(4, { reps: 8, kg: 70 })), E('Dips', 'lichaamsgewicht', rep(3, { reps: 8, kg: 32.5 })),
        E('Overhead press', 'gewicht', rep(3, { reps: 8, kg: 42.5 })), E('Triceps pushdown', 'gewicht', rep(3, { reps: 12, kg: 25 })),
        E('Borst stretch', 'stretch', [{}], ['borst'])] },
      { id: 'v2', dayType: 'benen', at: at(2), raw: '', entries: [
        E('Box jump', 'explosief', rep(4, { reps: 5 })), E('Bulgarian split squat', 'gewicht', rep(3, { reps: 8, kg: 20 })),
        E('Romanian deadlift', 'gewicht', rep(3, { reps: 8, kg: 80 })), E('Calf raise', 'gewicht', rep(3, { reps: 12, kg: 60 })),
        E('Hamstring stretch', 'stretch', [{}], ['hamstrings'])] },
      { id: 'v3', dayType: 'pull', at: at(4), raw: '', entries: [
        E('Pull-up', 'lichaamsgewicht', rep(4, { reps: 6, kg: 15 })), E('Barbell row', 'gewicht', rep(4, { reps: 8, kg: 65 })),
        E('Biceps curl', 'gewicht', rep(3, { reps: 10, kg: 32.5 })), E('Front lever', 'skill', rep(3, { step: 1, sec: 10 }))] },
      { id: 'v4', dayType: 'lower', at: at(6), raw: '', entries: [
        E('Leg curl', 'gewicht', rep(3, { reps: 10, kg: 50 })), E('Hip thrust', 'gewicht', rep(3, { reps: 10, kg: 100 })),
        E('Handstand', 'skill', rep(3, { step: 2, sec: 45 }))] },
      { id: 'v5', dayType: 'push', at: at(8), raw: '', entries: [E('Bankdrukken', 'gewicht', rep(4, { reps: 8, kg: 67.5 }))] },
      { id: 'v6', dayType: 'push', at: at(15), raw: '', entries: [E('Bankdrukken', 'gewicht', rep(4, { reps: 8, kg: 65 }))] },
      { id: 'v7', dayType: 'push', at: at(22), raw: '', entries: [E('Bankdrukken', 'gewicht', rep(4, { reps: 8, kg: 62.5 }))] },
    ].map((w) => ({ ...w, date: w.at.slice(0, 10) }));
  })();
  const isExample = () => !S.workouts.length;
  const data = () => isExample() ? EXAMPLE : S.workouts;
  const bw = () => +S.profile?.bodyweight || 80;
  const sex = () => S.profile?.sex === 'v' ? 'v' : 'm';

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }
  function status(el, msg, isErr) { el.className = 'status' + (isErr ? ' err' : ''); el.textContent = msg; }

  // ---------- knowledge file ----------
  let K = { sources: [], exercises: [], records: [], updated: null, failed: false };
  let Q = { themes: [], items: [], idx: null, failed: false };
  const EIGEN = 'eigen';
  const sourceTitle = (id) => id === EIGEN ? 'je eigen oefeningen' : K.sources.find((s) => s.id === id)?.title || id;
  function useCustom(prev, next) {
    for (const c of prev) Score.removeExercise(c.name);
    Score.addExercises(next.map((c) => ({ ...c, source: EIGEN })));
  }
  async function loadVragen() {
    try {
      const res = await fetch('vragen.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      const d = await res.json();
      const items = Array.isArray(d.items) ? d.items : [];
      Q = { themes: Array.isArray(d.themes) ? d.themes : [], items, idx: Vraag.index(items), failed: false };
    } catch { Q.failed = true; }
  }
  async function loadKennis() {
    const vragen = loadVragen();
    try {
      const res = await fetch('kennis.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      const d = await res.json();
      K = { sources: Array.isArray(d.sources) ? d.sources : [], exercises: Array.isArray(d.exercises) ? d.exercises : [],
        records: Array.isArray(d.records) ? d.records : [], updated: d.updated || null, failed: false };
      Score.addExercises(K.exercises);
      Score.setRecords(K.records);
      if (!Array.isArray(S.seen)) { S.seen = listable().filter((e) => !isResearch(e)).map((e) => e.name); save(); }
    } catch { K.failed = true; }
    await vragen;
    fillDatalist();
    renderAll();
  }
  // Everything you can switch on: the generic "Stretchen" has no muscles and stays out.
  const listable = () => Score.CATALOG.filter((e) => e.kind !== 'stretch' || e.muscles.primary.length);
  const isResearch = (e) => K.sources.find((s) => s.id === e.source)?.type === 'onderzoek';
  const newNames = () => Array.isArray(S.seen) ? listable().map((e) => e.name).filter((n) => !S.seen.includes(n)) : [];
  function setMine(n, on) {
    S.mine = on ? [...new Set([...S.mine, n])] : S.mine.filter((x) => x !== n);
    save();
  }
  function fillDatalist() {
    $('#all-ex').innerHTML = listable()
      .map((e) => e.name).sort((a, b) => a.localeCompare(b, 'nl')).map((n) => `<option value="${esc(n)}"></option>`).join('');
  }

  // ---------- formatting ----------
  function fmtSet(entry, s) {
    const w = s.kg ? (entry.kind === 'lichaamsgewicht' ? '+' : '') + nlNum(s.kg) + ' kg' : '';
    const bits = [];
    if (s.step) { const lad = Score.findExercise(entry.exercise)?.ladder; bits.push('stap ' + s.step + (lad ? ` (${lad[s.step - 1]})` : '')); }
    if (s.reps) bits.push(w ? `${s.reps} × ${w}` : `${s.reps} herh.`); else if (w) bits.push(w);
    if (s.sec) bits.push(s.sec + ' s');
    return bits.join(', ') || 'gedaan';
  }
  function fmtSets(entry) {
    const groups = [];
    for (const s of entry.sets || []) {
      const t = fmtSet(entry, s), g = groups[groups.length - 1];
      if (g && g.t === t) g.n++; else groups.push({ t, n: 1 });
    }
    return groups.map((g) => g.n > 1 ? `${g.n} sets van ${g.t}` : g.t).join('; ');
  }
  function entryLine(e) {
    const ms = e.kind === 'stretch' ? (e.muscles?.primary || []).map((m) => Score.MUSCLES[m]).filter(Boolean).join(', ') : '';
    return [fmtSets(e), ms].filter(Boolean).join(', ') || 'gedaan';
  }
  function targetText(t, kind) {
    if (kind === 'stretch') return `${t.sets > 1 ? t.sets + ' × ' : ''}${t.sec} s`;
    if (kind === 'skill') return `${t.sets} × stap ${t.step}${t.sec ? `, ${t.sec} s` : t.reps ? `, ${t.reps} herh.` : ''}`;
    if (t.sec != null && t.reps == null) return `${t.sets} × ${t.sec} s`;
    return `${t.sets} × ${t.reps}${t.kg ? ` met ${kind === 'lichaamsgewicht' ? '+' : ''}${nlNum(t.kg)} kg` : ''}`;
  }
  const doseText = (d) => [d.sets && `${d.sets} sets`, d.reps && `${d.reps} herh.`, d.sec && `${d.sec} s`, d.step && `stap ${d.step}`].filter(Boolean).join(', ');
  const listBlock = (title, arr) => Array.isArray(arr) && arr.length
    ? `${title ? `<h4>${title}</h4>` : ''}<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';

  // ---------- navigation ----------
  function go(tab) {
    if (tab === 'oefeningen' && U.tab !== 'oefeningen') { U.back = U.tab; openMine(); }
    U.tab = tab;
    const lit = tab === 'oefeningen' ? 'profiel' : tab;
    for (const b of $$('.tabs button')) b.dataset.tab === lit ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
    for (const v of $$('.view[id^="v-"]')) v.hidden = v.id !== 'v-' + tab;
    if (tab === 'training') renderTraining();
    if (tab === 'vandaag') renderToday();
    window.scrollTo(0, 0);
  }

  // ---------- Vandaag ----------
  const PLATE_W = [0, 7, 10, 13, 16, 19];
  function renderLegend() {
    $('#legend').innerHTML = U.mode === 'kracht'
      ? `<div class="plates">${[1, 2, 3, 4, 5].map((l) => `<div class="plate-item"><i class="plate" style="--c:var(--p${l});--w:${PLATE_W[l]}px"></i><b>${Score.LEVELS[l]}</b><span>${Score.PLATES[l]}</span></div>`).join('')}</div>
         <p class="legend-note"><span><i class="sw hatch"></i>Nog geen data</span><span><i class="sw" style="background:var(--iron)"></i>Getraind, geen krachtnorm</span><span><i class="sw dash"></i>Gestretcht deze week</span></p>`
      : `<div class="rec-scale">${Score.RECOVERY.map((r, i) => `<div><i style="--c:var(--r${i})"></i>${r}</div>`).join('')}</div>
         <p class="legend-note"><span>Op basis van je harde sets van de afgelopen 72 uur. Recente sets tellen zwaarder.</span></p>`;
  }

  function renderDetail(levels, rec, dates) {
    const box = $('#detail'), m = U.sel;
    if (!m) { box.hidden = true; return; }
    const lv = levels[m], r = Score.recoveryStatus(rec[m] || 0);
    const hits = (b) => b.muscles.primary.includes(m) ? 2 : b.muscles.secondary.includes(m) ? 1 : 0;
    const best = Object.values(Score.bestPerExercise(data(), bw(), sex()))
      .filter((b) => hits(b) && (b.e1rm || b.step))
      .sort((a, b) => hits(b) - hits(a) || (b.level || 0) - (a.level || 0) || b.e1rm - a.e1rm)
      .slice(0, 3);
    box.hidden = false;
    box.innerHTML = `
      <div class="head-row"><h3>${Score.MUSCLES[m]}</h3><button class="link" type="button" id="detail-close">Sluit</button></div>
      <dl class="facts">
        <dt>Niveau</dt><dd>${lv ? `<i class="sw" style="background:var(--p${lv.level})"></i>${Score.LEVELS[lv.level]}, via ${esc(lv.from)}` : dates.trained[m] ? 'Getraind, maar nog zonder krachtnorm' : 'Nog geen data'}</dd>
        <dt>Herstel</dt><dd><i class="sw" style="background:var(--r${r})"></i>${Score.RECOVERY[r]}</dd>
        <dt>Getraind</dt><dd>${ago(dates.trained[m])}</dd>
        <dt>Gestretcht</dt><dd>${ago(dates.stretched[m])}</dd>
      </dl>
      ${best.length ? `<div><h4>Beste prestaties</h4><ul class="lifts">${best.map((b) => `<li><span>${esc(b.name)}</span><span class="num">${b.kind === 'skill' ? 'stap ' + b.step : Math.round(b.e1rm) + ' kg'}</span></li>`).join('')}</ul>
      <p class="small" style="margin-top:8px">Kilo's zijn je geschatte max voor één herhaling. Bij pull-ups en dips telt je lichaamsgewicht mee.</p></div>` : ''}`;
    $('#detail-close').onclick = () => { U.sel = null; renderToday(); };
  }

  function renderTodayCard() {
    const box = $('#today-card');
    if (S.active) {
      const all = S.active.items.flatMap((i) => i.sets), done = all.filter((s) => s.done).length;
      box.innerHTML = `<h4>${S.active.editOf ? 'Training aanpassen' : 'Training bezig'}</h4><p class="day-name">${esc(dayLabel(S.active.dayType))}</p>
        <p class="muted">${done} van ${all.length} sets afgevinkt.</p><div class="row"><button class="btn" type="button" data-go="training">Ga verder</button></div>`;
      return;
    }
    const r = Plan.recommendDay(S.workouts, Date.now());
    box.innerHTML = `<h4>Aanbevolen vandaag</h4><p class="day-name">${esc(r.label)}</p><p class="muted">${esc(r.reason)}</p>
      <div class="row"><button class="btn" type="button" data-choose="${r.id}">Kies oefeningen</button></div>`;
  }

  function renderToday() {
    const W = data(), now = Date.now();
    $('#example-note').hidden = !isExample();
    $$('.example-flag').forEach((e) => { e.hidden = !isExample(); });
    $('#profile-note').hidden = !!S.profile;
    const nn = newNames().length;
    $('#new-note').hidden = !nn;
    if (nn) $('#new-note').innerHTML = `${nn} ${nn === 1 ? 'nieuwe oefening' : 'nieuwe oefeningen'} om te bekijken. <button class="link" type="button" data-go="oefeningen">Bekijken</button>`;
    const stale = S.workouts.length && (!S.lastBackup || now - Date.parse(S.lastBackup) > 14 * DAY);
    const bn = $('#backup-note');
    bn.hidden = !stale;
    if (stale) bn.innerHTML = `${S.lastBackup ? `Je laatste back-up is van ${esc(ago(S.lastBackup))}.` : 'Je hebt nog geen back-up.'} Je trainingen staan alleen op deze telefoon. <button class="link" type="button" data-go="profiel">Back-up maken</button>`;
    const ws = Score.weekStats(W, now);
    $('#week').innerHTML = `Deze week <span class="num">${ws.sessions}</span> ${ws.sessions === 1 ? 'training' : 'trainingen'} en <span class="num">${ws.hardSets}</span> harde sets.`;
    const levels = Score.muscleLevels(W, bw(), sex());
    const rec = Score.recovery(W, now);
    const dates = Score.muscleDates(W);
    for (const p of $$('.m')) {
      const m = p.dataset.m;
      if (U.mode === 'kracht') {
        delete p.dataset.r;
        // 0 = trained, but only with exercises that have no strength standard.
        if (levels[m]) p.dataset.l = levels[m].level; else if (dates.trained[m]) p.dataset.l = 0; else delete p.dataset.l;
      } else {
        delete p.dataset.l;
        p.dataset.r = Score.recoveryStatus(rec[m] || 0);
      }
      p.classList.toggle('stretched', U.mode === 'kracht' && !!dates.stretched[m] && now - Date.parse(dates.stretched[m]) < 7 * DAY);
      p.classList.toggle('sel', U.sel === m);
    }
    $('#mode-kracht').setAttribute('aria-pressed', String(U.mode === 'kracht'));
    $('#mode-herstel').setAttribute('aria-pressed', String(U.mode === 'herstel'));
    renderLegend();
    renderDetail(levels, rec, dates);
    renderTodayCard();
  }

  function pickMuscle(m) {
    U.sel = U.sel === m ? null : m;
    renderToday();
    if (U.sel) $('#detail').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  // ---------- Training: choose ----------
  function resetPicks() {
    U.picks = new Set(U.day === 'mobility' ? [] : Plan.pool(U.day, S.workouts, Date.now(), S.mine).slice(0, 5).map((x) => x.name));
    U.extra = [];
  }
  // Named stretches are a checklist during the training, not sets. The generic "Stretchen" keeps its muscles as an item.
  const namedStretch = (n) => { const e = Score.findExercise(n); return e?.kind === 'stretch' && e.muscles.primary.length ? e.name : null; };
  const splitEntries = (entries) => ({
    stretches: [...new Set(entries.map((e) => namedStretch(e.exercise)).filter(Boolean))],
    rest: entries.filter((e) => !namedStretch(e.exercise)),
  });
  const OFF_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M8.5 12h7"></path></svg>';
  const offBtn = (n) => `<button class="arch" type="button" data-confirm="off" data-name="${esc(n)}" aria-label="${esc(n)} uitzetten" title="Uitzetten">${OFF_ICON}</button>`;
  function pickRow(x) {
    const t = Plan.target(x.name, S.workouts);
    const when = x.lastAt ? ago(x.lastAt) : 'nog nooit gedaan';
    return `<li><label><input type="checkbox" data-pick="${esc(x.name)}"${U.picks.has(x.name) ? ' checked' : ''}>
      <span class="name">${esc(x.name)}</span><span class="dose">${esc(targetText(t, x.kind))}</span>
      <span class="meta">${esc(cap(when))}${x.source ? `, <span class="from">uit ${esc(sourceTitle(x.source))}</span>` : ''}</span></label>${offBtn(x.name)}</li>`;
  }
  function startLabel() {
    const n = $$('#chooser [data-pick]:checked').length;
    const b = $('#btn-start');
    if (b) { b.disabled = !n && U.day !== 'mobility'; b.textContent = n ? `Start training (${n} ${n === 1 ? 'oefening' : 'oefeningen'})` : 'Start training'; }
  }
  function renderChooser() {
    const now = Date.now();
    const rec = Plan.recommendDay(S.workouts, now);
    if (!U.day) { U.day = rec.id; resetPicks(); }
    const main = U.day === 'mobility' ? [] : Plan.pool(U.day, S.workouts, now, S.mine);
    const last = Plan.lastDone(S.workouts);
    const extras = U.extra.filter((n) => !main.some((x) => x.name === n))
      .map((n) => { const e = Score.findExercise(n); return { name: e?.name || n, kind: e?.kind || 'gewicht', lastAt: last[e?.name || n] || null, source: e?.source || null }; });
    $('#chooser').innerHTML = `<div class="view" style="padding-top:0">
      <div><h2>Training</h2><p class="muted" style="margin-top:6px">Aanbevolen: <b>${esc(rec.label)}</b>. ${esc(rec.reason)}</p></div>
      <div class="daychips" role="group" aria-label="Dagtype">${Plan.DAYS.map((d) => `<button type="button" data-day="${d.id}" aria-pressed="${d.id === U.day}"${d.id === rec.id ? ' data-rec title="Aanbevolen"' : ''}>${esc(d.label)}</button>`).join('')}</div>
      <div><h3>Oefeningen</h3><p class="small">${U.day === 'mobility' ? 'Je stretches vink je aan tijdens de training.' : 'Oefeningen uit je kennis eerst, daarna wat je het langst niet hebt gedaan. Stretches vink je aan tijdens de training.'}</p>
        ${extras.length || main.length ? `<ul class="picks">${[...extras, ...main].map(pickRow).join('')}</ul>`
          : U.day === 'mobility' ? '' : '<p class="muted">Voor deze dag staat nog niets aan. <button class="link" type="button" data-go="oefeningen">Oefeningen kiezen</button></p>'}</div>
      <div class="row"><input list="all-ex" id="add-pick" placeholder="Andere oefening toevoegen" aria-label="Andere oefening toevoegen"><button class="btn ghost" type="button" id="btn-add-pick">Voeg toe</button></div>
      <button class="btn wide" type="button" id="btn-start"></button>
    </div>`;
    startLabel();
  }

  // ---------- Training: active ----------
  const FIELD = { reps: { label: 'Herh.', step: 1 }, kg: { label: 'Kg', step: 2.5 }, sec: { label: 'Sec', step: 15 }, step: { label: 'Stap', step: 1 } };
  const fieldLabel = (k, kind) => k === 'kg' && kind === 'lichaamsgewicht' ? '+kg' : FIELD[k].label;
  function fieldsFor(it) {
    if (it.kind === 'stretch') return ['sec'];
    if (it.kind === 'skill') return ['step', it.target?.sec != null || it.sets.some((s) => s.sec) ? 'sec' : 'reps'];
    if (it.target?.sec != null || it.sets.some((s) => s.sec)) return ['sec'];
    return ['reps', 'kg'];
  }
  function makeItem(name, fromParse) {
    const e = Score.findExercise(name);
    const kind = fromParse?.kind || e?.kind || 'gewicht';
    const base = { exercise: e?.name || name, kind, source: e?.source || null, note: e?.note || '',
      muscles: fromParse?.muscles || (e ? { primary: [...e.muscles.primary], secondary: [...e.muscles.secondary] } : { primary: [], secondary: [] }) };
    if (fromParse) return { ...base, target: null, sets: fromParse.sets.length ? fromParse.sets.map((s) => ({ ...s, done: true })) : [{ done: false }] };
    const t = Plan.target(name, S.workouts);
    const row = {};
    for (const k of ['reps', 'kg', 'sec', 'step']) if (t[k] != null) row[k] = t[k];
    return { ...base, target: t, sets: Array.from({ length: t.sets }, () => ({ ...row, done: false })) };
  }
  const stepper = (k, v, i, j, it) => `<div class="stp">
    <button type="button" data-act="dec" data-f="${k}" data-i="${i}" data-j="${j}" aria-label="${fieldLabel(k, it.kind)} lager">−</button>
    <input type="text" inputmode="decimal" data-f="${k}" data-i="${i}" data-j="${j}" value="${v == null ? '' : esc(nlNum(v))}" aria-label="${fieldLabel(k, it.kind)}, set ${j + 1}">
    <button type="button" data-act="inc" data-f="${k}" data-i="${i}" data-j="${j}" aria-label="${fieldLabel(k, it.kind)} hoger">+</button></div>`;
  function exBlock(it, i) {
    const f = fieldsFor(it), cls = f.length === 1 ? ' f1' : '';
    const lad = Score.findExercise(it.exercise)?.ladder;
    const info = [it.target && `Doel: ${targetText(it.target, it.kind)}`, it.source && `uit ${sourceTitle(it.source)}`].filter(Boolean).join(', ');
    return `<section class="ex">
      <header><h3>${esc(it.exercise)}<span class="chip">${KIND_NL[it.kind] || ''}</span></h3>
        <button class="link" type="button" data-confirm="rm-ex" data-i="${i}">Verwijder</button></header>
      ${info || it.note ? `<p class="small">${esc(info)}${it.note ? `${info ? '<br>' : ''}${esc(it.note)}` : ''}</p>` : ''}
      <div class="sets">
        <div class="set-row set-head${cls}"><span>Set</span>${f.map((k) => `<span>${fieldLabel(k, it.kind)}</span>`).join('')}<span>Klaar</span></div>
        ${it.sets.map((s, j) => `<div class="set-row${cls}${s.done ? ' done' : ''}">
          <span class="n">${j + 1}</span>${f.map((k) => stepper(k, s[k], i, j, it)).join('')}
          <button class="check" type="button" data-act="done" data-i="${i}" data-j="${j}" aria-pressed="${!!s.done}" aria-label="Set ${j + 1} klaar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg></button>
          ${f.includes('step') && lad && s.step ? `<span class="step-name">${esc(lad[s.step - 1] || '')}</span>` : ''}
        </div>`).join('')}
      </div>
      <div><button class="link" type="button" data-act="add-set" data-i="${i}">+ Set</button></div>
    </section>`;
  }
  // Every named stretch, grouped by its main muscle; the day's muscles first and open.
  function stretchList(a) {
    const ticked = new Set(a.stretches || []), last = Plan.lastDone(S.workouts);
    const dayM = Plan.dayById(a.dayType)?.muscles || [];
    const all = Score.CATALOG.filter((e) => e.kind === 'stretch' && e.muscles.primary.length && S.mine.includes(e.name));
    if (!all.length) return '<p class="muted">Er staan nog geen stretches aan. <button class="link" type="button" data-go="oefeningen">Stretches kiezen</button></p>';
    return [...dayM, ...Object.keys(Score.MUSCLES).filter((m) => !dayM.includes(m))].map((m) => {
      const list = all.filter((e) => e.muscles.primary[0] === m).sort((x, y) => x.name.localeCompare(y.name, 'nl'));
      if (!list.length) return '';
      const open = a.dayType === 'mobility' || dayM.includes(m) || list.some((e) => ticked.has(e.name));
      return `<details class="stretch-group"${open ? ' open' : ''}><summary>${Score.MUSCLES[m]}</summary><ul class="picks">${list.map((e) => `<li><label>
        <input type="checkbox" data-stretch="${esc(e.name)}"${ticked.has(e.name) ? ' checked' : ''}><span class="name">${esc(e.name)}</span>
        <span class="meta">${esc(cap(last[e.name] ? ago(last[e.name]) : 'nog nooit gedaan'))}</span></label>${offBtn(e.name)}</li>`).join('')}</ul></details>`;
    }).join('');
  }
  function renderActive() {
    const a = S.active;
    $('#active').hidden = !a;
    $('#chooser').hidden = !!a;
    $('#speak').hidden = !!a;
    if (!a) return;
    const all = a.items.flatMap((it) => it.sets), done = all.filter((s) => s.done).length;
    $('#active').innerHTML = `<div class="view" style="padding-top:0">
      <div><h4>${a.editOf ? 'Training aanpassen' : 'Training bezig'}</h4><p class="day-name">${esc(dayLabel(a.dayType))}</p></div>
      <div class="row">
        <label style="flex:1 1 150px">Dagtype<select id="a-day">${Plan.DAYS.map((d) => `<option value="${d.id}"${d.id === a.dayType ? ' selected' : ''}>${esc(d.label)}</option>`).join('')}</select></label>
        <label style="flex:1 1 150px">Datum<input type="date" id="a-date" value="${esc(a.date)}" max="${todayISO()}"></label>
      </div>
      <p class="muted">${done} van ${all.length} sets afgevinkt.</p>
      ${a.unknown?.length ? `<p class="notice">Niet herkend: ${a.unknown.map(esc).join('; ')}. Voeg die oefeningen hieronder toe.</p>` : ''}
      ${a.items.map(exBlock).join('')}
      <div class="row"><input list="all-ex" id="add-active" placeholder="Oefening toevoegen" aria-label="Oefening toevoegen"><button class="btn ghost" type="button" id="btn-add-active">Voeg toe</button></div>
      <div><h3>Stretchen</h3><p class="small">Vink aan wat je doet.</p>${stretchList(a)}</div>
      <button class="btn wide" type="button" id="btn-finish">${a.editOf ? 'Wijzigingen opslaan' : 'Training afronden'}</button>
      <p class="status" id="a-status" role="status"></p>
      <div class="row" style="justify-content:center"><button class="link danger" type="button" data-confirm="stop">${a.editOf ? 'Aanpassen stoppen' : 'Training stoppen'}</button></div>
    </div>`;
  }
  function renderTraining() {
    if (!S.active) renderChooser();
    renderActive();
  }

  function startTraining() {
    const names = $$('#chooser [data-pick]:checked').map((i) => i.dataset.pick);
    if (!names.length && U.day !== 'mobility') return;
    S.active = { dayType: U.day, date: todayISO(), startedAt: new Date().toISOString(),
      stretches: names.map(namedStretch).filter(Boolean), items: names.filter((n) => !namedStretch(n)).map((n) => makeItem(n)) };
    save();
    renderTraining();
    window.scrollTo(0, 0);
  }

  const cleanSet = (s) => {
    const o = {};
    for (const k of ['reps', 'kg', 'sec', 'step']) if (+s[k] > 0) o[k] = +s[k];
    return o;
  };
  function finish() {
    const a = S.active;
    const stretches = (a.stretches || []).map((n) => Score.findExercise(n)).filter(Boolean)
      .map((e) => ({ exercise: e.name, kind: 'stretch', muscles: { primary: [...e.muscles.primary], secondary: [...e.muscles.secondary] }, sets: [{}] }));
    const entries = [...a.items.map((it) => ({ exercise: it.exercise, kind: it.kind, muscles: it.muscles, sets: it.sets.filter((s) => s.done).map(cleanSet) }))
      .filter((e) => e.sets.length), ...stretches];
    if (!entries.length) return status($('#a-status'), 'Vink eerst minstens één set of stretch af.', true);
    const date = a.date || todayISO();
    const at = a.editOf && a.origDate === date ? a.at
      : date === todayISO() ? new Date().toISOString() : new Date(date + 'T12:00:00').toISOString();
    const w = { id: a.editOf || uid(), date, at, dayType: a.dayType, raw: a.raw || '', entries };
    S.workouts = [...S.workouts.filter((x) => x.id !== w.id), w];
    S.mine = [...new Set([...S.mine, ...entries.map((e) => Score.findExercise(e.exercise)?.name || e.exercise)])];
    S.active = null;
    if (!save()) return;
    toast(a.editOf ? 'Training aangepast' : 'Training opgeslagen');
    U.day = null;
    renderAll();
    go('vandaag');
  }

  function editWorkout(id) {
    if (S.active) return toast('Rond eerst je huidige training af of stop hem.');
    const w = S.workouts.find((x) => x.id === id);
    if (!w) return;
    const { stretches, rest } = splitEntries(w.entries || []);
    S.active = {
      editOf: id, at: w.at, origDate: w.date, date: w.date || w.at.slice(0, 10), dayType: w.dayType || Plan.guessDay(w.entries || []),
      raw: w.raw || '', startedAt: new Date().toISOString(), stretches,
      items: rest.map((e) => makeItem(e.exercise, { kind: e.kind, muscles: e.muscles || { primary: [], secondary: [] }, sets: e.sets || [] })),
    };
    save();
    go('training');
  }

  // ---------- speech ----------
  let listening = null;
  // A question replaces the field and stops by itself; a spoken workout keeps adding until you press Stop.
  function toggleMic(btn, ta, st, question) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (listening) { listening.stop(); return; }
    const rec = new SR();
    rec.lang = 'nl-NL'; rec.continuous = !question; rec.interimResults = true;
    const before = !question && ta.value.trim() ? ta.value.trim() + ' ' : '';
    rec.onresult = (ev) => { ta.value = before + Array.from(ev.results, (r) => r[0].transcript).join(' '); ta.dispatchEvent(new Event('input')); };
    rec.onerror = (ev) => {
      status(st, ev.error === 'not-allowed' || ev.error === 'service-not-allowed'
        ? 'Geef de app toegang tot je microfoon, of gebruik de microfoon van je toetsenbord.'
        : ev.error === 'no-speech' ? 'Ik hoorde niets. Probeer het nog eens.' : 'Inspreken lukte niet. Gebruik de microfoon van je toetsenbord.', true);
    };
    const label = btn.querySelector('span');
    rec.onend = () => { listening = null; btn.classList.remove('rec'); if (label) label.textContent = 'Inspreken'; };
    try { rec.start(); } catch { return; }
    listening = rec;
    btn.classList.add('rec');
    if (label) label.textContent = 'Stop';
    status(st, '');
  }

  function parseSpoken() {
    const text = $('#sp-text').value.trim(), st = $('#sp-status');
    if (!text) return status(st, 'Vertel of typ eerst wat je hebt gedaan.', true);
    if (S.active) return status(st, 'Rond eerst je huidige training af of stop hem.', true);
    const r = Parse.workout(text, { today: todayISO() });
    if (!r.entries.length) {
      return status(st, 'Ik herkende geen oefeningen. Noem de oefening met sets, herhalingen en kilo\'s, bijvoorbeeld: 3 sets squat 5 keer 100 kilo.', true);
    }
    const { stretches, rest } = splitEntries(r.entries);
    S.active = {
      dayType: Plan.guessDay(r.entries), date: r.date || $('#sp-date').value || todayISO(), raw: text,
      startedAt: new Date().toISOString(), unknown: r.unknown, stretches, items: rest.map((e) => makeItem(e.exercise, e)),
    };
    save();
    $('#sp-text').value = '';
    status(st, '');
    renderTraining();
    window.scrollTo(0, 0);
  }

  // ---------- Voortgang ----------
  const UNIT_NOTE = {
    kg: 'Geschat max voor één herhaling in kg, beste set per training. Bij pull-ups en dips telt je lichaamsgewicht mee.',
    trede: 'Hoogste stap per training.',
    reps: 'Meeste herhalingen in één set per training.',
    s: 'Langste tijd in seconden per training.',
  };
  function chartSVG(series) {
    if (!series.length) return '<p class="muted">Nog geen gegevens voor deze oefening.</p>';
    const W = 340, H = 200, L = 34, R = 18, T = 34, B = 26;
    const xs = series.map((p) => Date.parse(p.at)), ys = series.map((p) => p.value);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.15; lo = Math.max(0, lo - pad); hi += pad;
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const X = (t) => x1 === x0 ? L + (W - L - R) / 2 : L + (t - x0) / (x1 - x0) * (W - L - R);
    const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const tick = (v) => hi - lo < 6 ? nlNum(Math.round(v * 10) / 10) : Math.round(v);
    const pts = series.map((p, i) => [X(xs[i]), Y(p.value)].map((n) => +n.toFixed(1)));
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p.join(',')).join('');
    const last = pts[pts.length - 1], unit = series[0].unit;
    const suffix = { kg: ' kg', trede: '', reps: ' herh.', s: ' s' }[unit];
    const lastVal = (unit === 'trede' ? 'stap ' : '') + nlNum(Math.round(series[series.length - 1].value * 10) / 10) + suffix;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(U.ex)}: nu ${esc(lastVal)}">
      ${[lo, (lo + hi) / 2, hi].map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"></line><text class="axis" x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${tick(v)}</text>`).join('')}
      ${pts.length > 1 ? `<path class="area" d="${line}L${last[0]},${H - B}L${pts[0][0]},${H - B}Z"></path>` : ''}
      <path class="line" d="${line}"></path>
      ${pts.slice(0, -1).map((p) => `<circle class="dot" cx="${p[0]}" cy="${p[1]}" r="3"></circle>`).join('')}
      <circle class="end" cx="${last[0]}" cy="${last[1]}" r="5"></circle>
      <text class="endlabel" x="${last[0]}" y="${last[1] - 11}" text-anchor="${pts.length > 1 ? 'end' : 'middle'}">${esc(lastVal)}</text>
      <text class="axis" x="${X(x0)}" y="${H - 6}" text-anchor="${x1 === x0 ? 'middle' : 'start'}">${fmtShort.format(x0)}</text>
      ${x1 !== x0 ? `<text class="axis" x="${X(x1)}" y="${H - 6}" text-anchor="end">${fmtShort.format(x1)}</text>` : ''}
    </svg>`;
  }
  function renderHistory(W) {
    // ponytail: shows the latest 60 sessions; add paging when the history outgrows that.
    const list = [...W].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
    $('#history').innerHTML = list.map((w) => `<article class="day">
      <header><h3>${cap(fmtDay.format(new Date(w.at)))}<span class="chip">${esc(dayLabel(w.dayType))}</span></h3>
        ${isExample() ? '' : `<div class="row" style="gap:2px"><button class="link" type="button" data-edit="${esc(w.id)}">Aanpassen</button>
        <button class="link danger" type="button" data-confirm="del-w" data-id="${esc(w.id)}">Verwijder</button></div>`}</header>
      <ul>${(w.entries || []).map((e) => `<li>${esc(e.exercise)}: ${esc(entryLine(e))}</li>`).join('')}</ul>
      ${w.raw ? `<details><summary class="small">Wat je zei</summary><p><i>${esc(w.raw)}</i></p></details>` : ''}
    </article>`).join('') || '<p class="muted">Nog geen trainingen.</p>';
  }
  function renderProgress() {
    const W = data(), best = Score.bestPerExercise(W, bw(), sex());
    const recs = K.records.map((r) => best[Score.findExercise(r.exercise)?.name]).filter(Boolean);
    $('#maxes').innerHTML = recs.length ? `<h3>Maxen</h3><ul class="lifts">${recs.map((b) => `<li><span>${esc(b.name)}${b.level ? `, ${Score.LEVELS[b.level].toLowerCase()}` : ''}</span>
      <span class="num">${nlNum(Math.round(b.e1rm))} kg</span></li>`).join('')}</ul>` : '';
    // Maxes without a logged set have no history to chart.
    const names = Object.values(best).filter((b) => b.at).map((b) => b.name).sort((a, b) => a.localeCompare(b, 'nl'));
    if (!names.includes(U.ex)) U.ex = names.includes('Bankdrukken') ? 'Bankdrukken' : names[0] || null;
    $('#ex-select').innerHTML = names.map((n) => `<option${n === U.ex ? ' selected' : ''}>${esc(n)}</option>`).join('');
    const series = U.ex ? Score.exerciseSeries(W, U.ex, bw()) : [];
    $('#chart').innerHTML = chartSVG(series);
    $('#chart-note').textContent = series.length ? UNIT_NOTE[series[0].unit] : '';
    renderHistory(W);
  }

  // ---------- Kennis ----------
  const BEWIJS = { sterk: 'Sterk bewijs', redelijk: 'Redelijk bewijs', beperkt: 'Beperkt bewijs' };
  const themeLabel = (id) => Q.themes.find((t) => t.id === id)?.label || '';
  // Answer text: blank line = new paragraph, lines starting with "- " = a list.
  const richText = (a) => String(a).split(/\n\s*\n/).map((block) => {
    const lines = block.split('\n'), items = lines.filter((l) => l.startsWith('- '));
    const lead = lines.filter((l) => !l.startsWith('- ')).join(' ');
    return (lead ? `<p>${esc(lead)}</p>` : '') + (items.length ? `<ul>${items.map((l) => `<li>${esc(l.slice(2))}</li>`).join('')}</ul>` : '');
  }).join('');
  function answerBody(it) {
    const exs = (it.exercises || []).map((n) => Score.findExercise(n)?.name).filter(Boolean);
    return `${richText(it.a)}
      ${listBlock('Wat je ermee doet', it.doen)}
      ${exs.length ? `<h4>Oefeningen</h4><ul class="lifts">${exs.map((n) => `<li><span>${esc(n)}</span>
        <button class="link" type="button" data-on="${esc(n)}">${S.mine.includes(n) ? 'Staat aan' : 'Zet aan'}</button></li>`).join('')}</ul>` : ''}
      <details><summary class="small">Bronnen (${it.bronnen.length})</summary><ul>${it.bronnen.map((b) => `<li>${safeUrl(b.url)
        ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.auteurs)} (${esc(b.jaar)})</a>` : `${esc(b.auteurs)} (${esc(b.jaar)})`}, ${esc(b.soort)}. ${esc(b.titel)}</li>`).join('')}</ul></details>`;
  }
  const answerType = (it) => `<span class="k-type">${esc(themeLabel(it.theme))}, ${esc(BEWIJS[it.bewijs] || '')}</span>`;
  const folded = (it) => `<details class="stretch-group"><summary>${esc(it.q)}</summary>
    <div class="k-item" style="border:0;padding-top:0">${answerType(it)}${answerBody(it)}</div></details>`;
  // Typed question: the best answer open and up to two more folded, themes hidden. Otherwise the chosen theme's questions, folded.
  function renderAsk() {
    const text = $('#q-in').value.trim();
    $('#q-themes').hidden = !!text;
    $('#q-themes').innerHTML = Q.themes.map((t) => `<button type="button" data-theme="${esc(t.id)}" aria-pressed="${!text && U.theme === t.id}">${esc(t.label)}</button>`).join('');
    if (Q.failed) return void ($('#q-res').innerHTML = '<p class="muted">De kennisbank kon niet geladen worden. Open de app een keer met internet.</p>');
    if (text) {
      const hits = Q.idx ? Vraag.search(Q.idx, text) : [];
      const [best, ...more] = hits.map((h) => h.item);
      $('#q-res').innerHTML = best ? `<article class="k-item">${answerType(best)}<h3>${esc(best.q)}</h3>${answerBody(best)}</article>
        ${more.length ? `<h4 style="margin-top:18px">Ook relevant</h4>${more.map(folded).join('')}` : ''}`
        : '<p class="muted">Dit staat nog niet in je kennisbank. Vraag het Claude, dan komt het erbij.</p>';
      return;
    }
    const list = Q.items.filter((it) => it.theme === U.theme);
    $('#q-res').innerHTML = list.map(folded).join('');
  }
  function renderKennis() {
    renderAsk();
    $('#k-meta').textContent = K.failed ? 'Je kennisbestand kon niet geladen worden. Open de app een keer met internet.'
      : K.updated ? `Bijgewerkt op ${fmtDate.format(new Date(K.updated))}.` : '';
    $('#k-list').innerHTML = K.sources.map((s) => {
      const exs = K.exercises.filter((x) => x.source === s.id);
      return `<article class="k-item">
        <span class="k-type">${s.type === 'video' ? 'Video' : 'Onderzoek'}${s.source ? ', ' + esc(s.source) : ''}</span>
        <h3>${esc(s.title)}</h3>
        ${s.days?.length ? `<p class="small">Voor: ${esc(s.days.map(dayLabel).join(', '))}</p>` : ''}
        ${s.whenToUse ? `<p class="muted">${esc(s.whenToUse)}</p>` : ''}
        ${safeUrl(s.url) ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${s.type === 'video' ? 'Bekijk de video' : 'Open de bron'}</a>` : ''}
        ${listBlock('Praktische regels', s.rules)}
        ${exs.length ? `<h4>Oefeningen</h4><ul>${exs.map((x) => `<li>${esc(x.name)}${x.dose ? ': ' + esc(doseText(x.dose)) : ''}${S.mine.includes(Score.findExercise(x.name)?.name) ? ' <span class="chip">aan</span>' : ''}</li>`).join('')}</ul>` : ''}
        ${s.keyPoints?.length ? `<details><summary class="small">Kernpunten</summary>${listBlock('', s.keyPoints)}</details>` : ''}
      </article>`;
    }).join('') || (K.failed ? '' : '<p class="muted">Nog leeg. Stuur Claude een YouTube-link of een onderzoek, dan verschijnt het hier met de oefeningen.</p>');
    $('#k-count').textContent = K.sources.length ? `(${K.sources.length})` : '';
    $('#n-count').textContent = S.notes.length ? `(${S.notes.length})` : '';
    $('#n-list').innerHTML = [...S.notes].reverse().map((n) => `<article class="k-item">
      <h3>${esc(n.title)}</h3>${n.text ? `<p>${esc(n.text)}</p>` : ''}
      ${safeUrl(n.url) ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">Open de link</a>` : ''}
      <div><button class="link danger" type="button" data-confirm="del-n" data-id="${esc(n.id)}">Verwijder</button></div>
    </article>`).join('');
  }

  // ---------- Profiel ----------
  function renderProfile() {
    if (!document.activeElement?.closest?.('#p-form')) {
      $('#p-bw').value = S.profile?.bodyweight ?? '';
      $('#p-sex').value = sex();
      $('#p-goals').value = S.profile?.goals ?? '';
    }
    const on = S.mine.length;
    $('#mine-info').textContent = on ? `${on} ${on === 1 ? 'oefening of stretch staat' : 'oefeningen en stretches staan'} aan. Alleen die komen in je trainingen.`
      : 'Er staat nog niets aan. Kies de oefeningen en stretches die je echt doet.';
    $('#b-info').textContent = `Je trainingen staan alleen op deze telefoon. Laatste back-up: ${S.lastBackup ? ago(S.lastBackup) : 'nog nooit'}.`;
  }

  // ---------- Mijn oefeningen ----------
  const REGION = { borst: 'Borst', rug: 'Rug', trapezius: 'Rug', onderrug: 'Rug', schouders: 'Schouders', biceps: 'Armen', triceps: 'Armen', onderarmen: 'Armen', buik: 'Buik', schuine: 'Buik' };
  const GROUPS = ['Eigen', 'Nieuw', 'Borst', 'Rug', 'Schouders', 'Armen', 'Buik', 'Benen', 'Explosief', 'Calisthenics', 'Stretches'];
  const groupOf = (e) => e.source === EIGEN ? 'Eigen' : U.fresh.has(e.name) ? 'Nieuw' : e.kind === 'stretch' ? 'Stretches' : e.kind === 'skill' ? 'Calisthenics'
    : e.kind === 'explosief' ? 'Explosief' : REGION[e.muscles.primary[0]] || 'Benen';
  // New names are shown under Nieuw for this visit, then count as seen.
  function openMine() {
    U.fresh = new Set(newNames());
    if (Array.isArray(S.seen)) { S.seen = listable().map((e) => e.name); save(); }
    $('#o-q').value = '';
    $('#c-form').hidden = true;
    renderMine();
  }
  const countText = (on, n) => `${on} van ${n} aan`;
  function renderMine() {
    const q = $('#o-q').value.trim().toLowerCase();
    const hit = (e) => !q || [e.name, ...(e.aliases || [])].some((n) => n.toLowerCase().includes(q));
    const all = listable().filter(hit).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    $('#o-list').innerHTML = GROUPS.map((g) => {
      const list = all.filter((e) => groupOf(e) === g);
      if (!list.length) return '';
      return `<details class="stretch-group"${q || g === 'Nieuw' || g === 'Eigen' ? ' open' : ''}><summary>${g} <span class="small" data-count>${countText(list.filter((e) => S.mine.includes(e.name)).length, list.length)}</span></summary>
        <ul class="picks">${list.map((e) => `<li><label><input type="checkbox" data-mine="${esc(e.name)}"${S.mine.includes(e.name) ? ' checked' : ''}>
          <span class="name">${esc(e.name)}</span><span class="meta">${e.source && e.source !== EIGEN ? `uit ${esc(sourceTitle(e.source))}` : esc(e.muscles.primary.map((m) => Score.MUSCLES[m]).join(', '))}</span></label>
          ${e.source === EIGEN ? `<button class="link" type="button" data-edit-c="${esc(e.name)}">Wijzig</button>` : ''}</li>`).join('')}</ul></details>`;
    }).join('') || '<p class="muted">Geen oefening gevonden.</p>';
  }

  // ---------- Eigen oefeningen ----------
  const chipBoxes = (sel, pairs) => { $(sel).innerHTML = pairs.map(([v, l]) => `<label class="chk"><input type="checkbox" value="${esc(v)}"><span>${esc(l)}</span></label>`).join(''); };
  const ticked = (sel) => $$(`${sel} input:checked`).map((i) => i.value);
  const tick = (sel, vals) => $$(`${sel} input`).forEach((i) => { i.checked = vals.includes(i.value); });
  // Stretches need no days or target: they are ticked per muscle after the training.
  function kindUI() {
    const k = $('#c-kind').value;
    $('#c-days-f').hidden = $('#c-dose').hidden = k === 'stretch';
    $('#c-reps-l').firstChild.textContent = k === 'hold' ? 'Seconden' : 'Herhalingen';
    $('#c-reps').placeholder = k === 'hold' ? 'bijv. 30' : 'bijv. 8-12';
  }
  function openCustom(name) {
    const c = S.custom.find((x) => x.name === name);
    U.editC = c ? c.name : null;
    $('#c-title').textContent = c ? 'Eigen oefening aanpassen' : 'Eigen oefening';
    $('#c-name').value = c?.name || '';
    $('#c-kind').value = c ? (c.hold ? 'hold' : c.kind) : 'gewicht';
    tick('#c-prim', c?.muscles.primary || []);
    tick('#c-sec', c?.muscles.secondary || []);
    tick('#c-days', c?.days || []);
    $('#c-sets').value = c?.dose?.sets || '';
    $('#c-reps').value = c?.dose?.sec || c?.dose?.reps || '';
    $('#c-note').value = c?.note || '';
    $('#btn-c-del').hidden = !c;
    status($('#c-status'), '');
    kindUI();
    $('#c-form').hidden = false;
    $('#c-form').scrollIntoView({ block: 'start' });
  }
  function saveCustom() {
    const st = $('#c-status'), k = $('#c-kind').value, old = U.editC;
    const name = $('#c-name').value.trim().replace(/\s+/g, ' ').slice(0, 60);
    const primary = ticked('#c-prim'), secondary = ticked('#c-sec').filter((m) => !primary.includes(m));
    if (!name) return status(st, 'Geef je oefening een naam.', true);
    const clash = Score.findExercise(name);
    if (clash && clash.name !== old) return status(st, `${clash.name} bestaat al. Zet hem aan in de lijst hieronder.`, true);
    if (!primary.length) return status(st, 'Kies minstens één hoofdspier.', true);
    const amount = $('#c-reps').value.trim(), sets = Math.round(+$('#c-sets').value) || (amount ? 3 : 0);
    const dose = k !== 'stretch' && sets > 0 ? { sets: Math.min(sets, 10), ...(amount && (k === 'hold' ? { sec: parseInt(amount, 10) || 30 } : { reps: amount.slice(0, 10) })) } : null;
    const note = $('#c-note').value.trim().slice(0, 500);
    const c = { name, kind: k === 'hold' ? 'lichaamsgewicht' : k, ...(k === 'hold' && { hold: true }), muscles: { primary, secondary },
      days: k === 'stretch' ? [] : ticked('#c-days'), ...(dose && { dose }), ...(note && { note }) };
    const next = [...S.custom.filter((x) => x.name !== old), c];
    useCustom(S.custom, next);
    S.custom = next;
    // A new name keeps the history together.
    if (old && old !== name) for (const w of S.workouts) for (const e of w.entries || []) if (e.exercise === old) e.exercise = name;
    S.mine = [...new Set([...S.mine.filter((n) => n !== old), name])];
    save();
    fillDatalist();
    $('#c-form').hidden = true;
    renderMine();
    toast(old ? `${name} aangepast` : `${name} staat erin en staat aan`);
  }

  async function makeBackup() {
    const payload = JSON.stringify({ app: 'krachtkaart', version: 1, exportedAt: new Date().toISOString(), workouts: S.workouts, profile: S.profile, notes: S.notes, mine: S.mine, seen: S.seen, custom: S.custom });
    const name = `krachtkaart-backup-${todayISO()}.json`;
    const file = new File([payload], name, { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Krachtkaart back-up' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file); a.download = name;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      }
      S.lastBackup = new Date().toISOString();
      save();
      renderProfile(); renderToday();
      status($('#b-status'), 'Back-up gemaakt. Bewaar het bestand op een veilige plek, bijvoorbeeld in Google Drive of iCloud.');
    } catch (e) {
      if (e?.name !== 'AbortError') status($('#b-status'), 'Back-up maken lukte niet. Probeer het opnieuw.', true);
    }
  }

  async function readRestore(file) {
    const box = $('#restore-confirm');
    try {
      const d = JSON.parse(await file.text());
      if (d?.app !== 'krachtkaart' || !Array.isArray(d.workouts)) throw new Error('not a backup');
      const workouts = d.workouts.filter((w) => w && typeof w.at === 'string' && Array.isArray(w.entries)).map((w) => ({ ...w, id: w.id || uid() }));
      U.restore = { workouts, profile: d.profile && typeof d.profile === 'object' ? d.profile : null, notes: Array.isArray(d.notes) ? d.notes : [],
        ...(Array.isArray(d.archived) && { archived: d.archived.map(String) }),
        ...(Array.isArray(d.mine) && { mine: d.mine.map(String) }), ...(Array.isArray(d.seen) && { seen: d.seen.map(String) }),
        ...(Array.isArray(d.custom) && { custom: d.custom.filter((c) => c && typeof c.name === 'string' && c.muscles) }) };
      box.hidden = false;
      box.innerHTML = `<p>Back-up van ${esc(d.exportedAt ? fmtDay.format(new Date(d.exportedAt)) : 'onbekende datum')} met ${workouts.length} ${workouts.length === 1 ? 'training' : 'trainingen'}. Terugzetten vervangt alles wat nu op deze telefoon staat.</p>
        <div class="row"><button class="btn" type="button" id="btn-restore-go">Terugzetten</button><button class="link" type="button" id="btn-restore-no">Annuleer</button></div>`;
      status($('#b-status'), '');
    } catch {
      box.hidden = true;
      status($('#b-status'), 'Dit bestand is geen Krachtkaart-back-up.', true);
    }
  }

  function renderAll() {
    renderToday(); renderTraining(); renderProgress(); renderKennis(); renderProfile();
  }

  // ---------- events ----------
  function arm(t) {
    t.dataset.label = t.innerHTML;
    t.classList.add('armed');
    t.textContent = 'Zeker?';
    setTimeout(() => { if (t.isConnected && t.classList.contains('armed')) { t.classList.remove('armed'); t.innerHTML = t.dataset.label; } }, 3000);
  }
  function confirmed(t) {
    const kind = t.dataset.confirm;
    if (kind === 'stop') { S.active = null; save(); U.day = null; renderAll(); }
    if (kind === 'rm-ex') { S.active.items.splice(+t.dataset.i, 1); save(); renderActive(); }
    if (kind === 'del-w') { S.workouts = S.workouts.filter((w) => w.id !== t.dataset.id); save(); renderAll(); toast('Training verwijderd'); }
    if (kind === 'del-n') { S.notes = S.notes.filter((n) => n.id !== t.dataset.id); save(); renderKennis(); }
    if (kind === 'del-c') {
      const n = U.editC, next = S.custom.filter((x) => x.name !== n);
      useCustom(S.custom, next);
      S.custom = next;
      S.mine = S.mine.filter((x) => x !== n);
      save(); fillDatalist();
      $('#c-form').hidden = true;
      renderMine();
      toast(`${n} is verwijderd. Je gelogde trainingen blijven staan.`);
    }
    if (kind === 'off') {
      const n = t.dataset.name;
      U.picks.delete(n);
      if (S.active) S.active.stretches = (S.active.stretches || []).filter((x) => x !== n);
      setMine(n, false); renderAll(); toast(`${n} staat uit. Aanzetten kan bij Profiel, Mijn oefeningen.`);
    }
  }

  // A new value also fills the later, unticked sets that still had the old value, so you enter a weight once.
  function setValue(it, j, k, v) {
    const old = it.sets[j][k];
    for (let x = j; x < it.sets.length; x++) {
      const s = it.sets[x];
      if (x > j && (s.done || (s[k] != null && s[k] !== old))) continue;
      if (v > 0) s[k] = v; else delete s[k];
    }
  }

  function onActiveAction(t) {
    const a = S.active, i = +t.dataset.i, j = +t.dataset.j, it = a.items[i];
    if (t.dataset.act === 'done') it.sets[j].done = !it.sets[j].done;
    if (t.dataset.act === 'add-set') { const lastSet = it.sets[it.sets.length - 1] || {}; it.sets.push({ ...lastSet, done: false }); }
    if (t.dataset.act === 'inc' || t.dataset.act === 'dec') {
      const k = t.dataset.f, dir = t.dataset.act === 'inc' ? 1 : -1;
      let v = Math.max(0, (+it.sets[j][k] || 0) + dir * FIELD[k].step);
      if (k === 'step') v = Math.min(5, Math.max(1, v));
      setValue(it, j, k, Math.round(v * 100) / 100);
    }
    save();
    renderActive();
  }

  function addByName(input) {
    const v = input.value.trim();
    if (!v) return null;
    input.value = '';
    return Score.findExercise(v)?.name || v.slice(0, 60);
  }

  function wire() {
    $('#mode-kracht').onclick = () => { U.mode = 'kracht'; renderToday(); };
    $('#mode-herstel').onclick = () => { U.mode = 'herstel'; renderToday(); };
    $('#bodies').addEventListener('click', (ev) => { const p = ev.target.closest('.m'); if (p) pickMuscle(p.dataset.m); });
    $('#bodies').addEventListener('keydown', (ev) => {
      const p = ev.target.closest('.m');
      if (p && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); pickMuscle(p.dataset.m); }
    });
    $('#ex-select').onchange = (ev) => { U.ex = ev.target.value; renderProgress(); };
    $('#btn-parse').onclick = parseSpoken;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      $('#btn-mic').onclick = () => toggleMic($('#btn-mic'), $('#sp-text'), $('#sp-status'));
      $('#q-mic').onclick = () => toggleMic($('#q-mic'), $('#q-in'), $('#q-status'), true);
    } else { $('#btn-mic').hidden = true; $('#q-mic').hidden = true; $('#mic-hint').hidden = false; }
    let askTimer;
    $('#q-in').addEventListener('input', () => { clearTimeout(askTimer); askTimer = setTimeout(renderAsk, 250); });
    $('#sp-date').value = todayISO();
    $('#sp-date').max = todayISO();

    document.addEventListener('click', (ev) => {
      const t = ev.target.closest('button');
      if (!t) return;
      if (t.dataset.tab) go(t.dataset.tab);
      if (t.dataset.go) go(t.dataset.go);
      if (t.dataset.theme) { U.theme = U.theme === t.dataset.theme ? null : t.dataset.theme; $('#q-in').value = ''; renderAsk(); }
      if (t.dataset.on) { const n = t.dataset.on, on = !S.mine.includes(n); setMine(n, on); renderAll(); toast(on ? `${n} staat aan` : `${n} staat uit`); }
      if (t.id === 'btn-c-new') openCustom(null);
      if (t.dataset.editC !== undefined) openCustom(t.dataset.editC);
      if (t.id === 'btn-c-cancel') $('#c-form').hidden = true;
      if (t.id === 'btn-mine-done') { if (U.day && !S.active) resetPicks(); renderAll(); go(U.back || 'profiel'); }
      if (t.dataset.choose) { U.day = t.dataset.choose; resetPicks(); go('training'); }
      if (t.dataset.day) { U.day = t.dataset.day; resetPicks(); renderChooser(); }
      if (t.dataset.edit) editWorkout(t.dataset.edit);
      if (t.dataset.act) onActiveAction(t);
      if (t.dataset.confirm) { if (t.classList.contains('armed')) confirmed(t); else arm(t); }
      if (t.id === 'btn-start') startTraining();
      if (t.id === 'btn-finish') finish();
      if (t.id === 'btn-add-pick') {
        const n = addByName($('#add-pick'));
        if (n) { U.extra = [n, ...U.extra.filter((x) => x !== n)]; U.picks.add(n); renderChooser(); }
      }
      if (t.id === 'btn-add-active') {
        const n = addByName($('#add-active'));
        if (n) {
          const st = namedStretch(n);
          if (st) S.active.stretches = [...new Set([...(S.active.stretches || []), st])]; else S.active.items.push(makeItem(n));
          save(); renderActive();
        }
      }
      if (t.id === 'btn-restore-go' && U.restore) {
        const prev = S.custom;
        S = migrate({ ...blank(), seen: S.seen, ...U.restore, lastBackup: S.lastBackup });
        useCustom(prev, S.custom);
        fillDatalist();
        U.restore = null;
        $('#restore-confirm').hidden = true;
        if (save()) { renderAll(); toast('Back-up teruggezet'); }
      }
      if (t.id === 'btn-restore-no') { U.restore = null; $('#restore-confirm').hidden = true; }
    });

    document.addEventListener('change', (ev) => {
      const t = ev.target;
      if (t.dataset.pick !== undefined) {
        t.checked ? U.picks.add(t.dataset.pick) : U.picks.delete(t.dataset.pick);
        startLabel();
      }
      // No re-render, so the groups you opened stay open.
      if (t.dataset.mine !== undefined) {
        setMine(t.dataset.mine, t.checked);
        const g = t.closest('details');
        g.querySelector('[data-count]').textContent = countText(g.querySelectorAll('input[data-mine]:checked').length, g.querySelectorAll('input[data-mine]').length);
      }
      if (t.dataset.stretch !== undefined) {
        const st = new Set(S.active.stretches || []);
        t.checked ? st.add(t.dataset.stretch) : st.delete(t.dataset.stretch);
        S.active.stretches = [...st];
        save();
      }
      if (t.matches('#active input[data-f]')) {
        const k = t.dataset.f, v = parseFloat(t.value.replace(',', '.'));
        setValue(S.active.items[+t.dataset.i], +t.dataset.j, k, k === 'step' ? Math.min(5, Math.round(v)) : v);
        save();
        renderActive();
      }
      if (t.id === 'a-day') { S.active.dayType = t.value; save(); renderActive(); }
      if (t.id === 'a-date') { S.active.date = t.value || todayISO(); save(); }
    });

    $('#o-q').addEventListener('input', renderMine);
    chipBoxes('#c-prim', Object.entries(Score.MUSCLES));
    chipBoxes('#c-sec', Object.entries(Score.MUSCLES));
    chipBoxes('#c-days', Plan.DAYS.filter((d) => d.id !== 'mobility').map((d) => [d.id, d.label]));
    $('#c-kind').onchange = kindUI;
    $('#c-form').addEventListener('submit', (ev) => { ev.preventDefault(); saveCustom(); });
    $('#btn-backup').onclick = makeBackup;
    $('#btn-restore').onclick = () => $('#restore-file').click();
    $('#restore-file').onchange = (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) readRestore(f); };

    $('#p-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const st = $('#p-status');
      const v = parseFloat(String($('#p-bw').value).replace(',', '.'));
      if (!(v >= 30 && v <= 250)) return status(st, 'Vul een lichaamsgewicht tussen 30 en 250 kg in.', true);
      S.profile = { bodyweight: Math.round(v * 10) / 10, sex: $('#p-sex').value, goals: $('#p-goals').value.trim().slice(0, 1000) };
      if (!save()) return;
      document.activeElement?.blur?.();
      status(st, 'Profiel opgeslagen.');
      renderAll();
    });

    $('#n-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const title = $('#n-title').value.trim();
      if (!title) return;
      const url = $('#n-url').value.trim();
      S.notes.push({ id: uid(), title: title.slice(0, 200), url: safeUrl(url) ? url : '', text: $('#n-text').value.trim().slice(0, 5000), createdAt: new Date().toISOString() });
      if (!save()) return;
      $('#n-form').reset();
      renderKennis();
      toast('Notitie opgeslagen');
    });
  }

  // ---------- boot ----------
  $('#today').textContent = cap(fmtDay.format(new Date()));
  Body.render($('#fig-voor'), 'voor');
  Body.render($('#fig-achter'), 'achter');
  useCustom([], S.custom);
  wire();
  fillDatalist();
  renderAll();
  setTimeout(() => $('#bodies').classList.remove('loading'), 2000);
  loadKennis();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
