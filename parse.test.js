// Run: node parse.test.js
const assert = require('node:assert/strict');
globalThis.Score = require('./score.js');
const P = require('./parse.js');
const one = (t) => P.workout(t, { today: '2026-09-25' });
const times = (n, s) => Array.from({ length: n }, () => s);

// number words
assert.equal(P.numbersNl('vier sets van acht keer tweeënzeventig en een half kilo'), '4 sets van 8 keer 72.5 kilo');
assert.equal(P.numbersNl('honderdvijftig kilo'), '150 kilo');
assert.equal(P.numbersNl('anderhalve minuut'), '1.5 minuut');
assert.equal(P.numbersNl('een minuut'), '1 minuut');
assert.equal(P.numbersNl('zeventig komma vijf'), '70.5');

// sets, reps, kg
let r = one('4 sets bankdrukken 8 keer 70 kilo');
assert.equal(r.entries.length, 1);
assert.equal(r.entries[0].exercise, 'Bankdrukken');
assert.deepEqual(r.entries[0].sets, times(4, { reps: 8, kg: 70 }));

// A x B, weight after "met", decimal comma
r = one('bankdrukken 4x8 met 72,5');
assert.deepEqual(r.entries[0].sets, times(4, { reps: 8, kg: 72.5 }));

// weighted dips, reps in a later clause
r = one('3 sets dips met 10 kilo extra, 8 herhalingen');
assert.equal(r.entries[0].exercise, 'Dips');
assert.deepEqual(r.entries[0].sets, times(3, { reps: 8, kg: 10 }));

// number clause before the name, number words
r = one('drie sets, pull ups acht keer met twintig kilo');
assert.equal(r.entries[0].exercise, 'Pull-up');
assert.deepEqual(r.entries[0].sets, times(3, { reps: 8, kg: 20 }));

// two exercises, split on "daarna"
r = one('squats 5 x 5 100 kilo en daarna romanian deadlift 3 x 8 80 kg');
assert.deepEqual(r.entries.map((e) => e.exercise), ['Squat', 'Romanian deadlift']);
assert.deepEqual(r.entries[0].sets, times(5, { reps: 5, kg: 100 }));
assert.deepEqual(r.entries[1].sets, times(3, { reps: 8, kg: 80 }));

// two exercises in one clause, no connector
r = one('4 sets bankdrukken 8 keer 70 kilo 3 sets dips 10 keer');
assert.deepEqual(r.entries.map((e) => e.exercise), ['Bankdrukken', 'Dips']);
assert.deepEqual(r.entries[1].sets, times(3, { reps: 10 }));

// calisthenics step + hold
r = one('front lever advanced tuck 3 keer 8 seconden');
assert.equal(r.entries[0].kind, 'skill');
assert.deepEqual(r.entries[0].sets, times(3, { step: 2, sec: 8 }));

// generic stretch with muscles and minutes
r = one('2 minuten hamstrings en kuiten stretchen');
assert.equal(r.entries[0].exercise, 'Stretchen');
assert.deepEqual(r.entries[0].muscles.primary, ['hamstrings', 'kuiten']);
assert.deepEqual(r.entries[0].sets, [{ sec: 120 }]);

// named stretch
r = one('duivenhouding 1 minuut per kant');
assert.deepEqual(r.entries[0].sets, [{ sec: 60 }]);

// reps only
r = one('push ups 3 sets van 20');
assert.deepEqual(r.entries[0].sets, times(3, { reps: 20 }));

// date words
assert.equal(one('gisteren 5 sets squat 5 keer 100 kilo').date, '2026-09-24');
assert.equal(one('bankdrukken 3x8 60 kilo').date, null);

// unknown sentence is reported, known one still parsed
r = one('bankdrukken 3x10 60 kilo. Daarna nog reverse flyes met de band.');
assert.equal(r.entries.length, 1);
assert.deepEqual(r.entries[0].sets, times(3, { reps: 10, kg: 60 }));
assert.equal(r.unknown.length, 1);
assert.match(r.unknown[0], /reverse flyes/);

// exercises from kennis.json are recognised too
Score.addExercises([{ name: 'Nordic curl', kind: 'lichaamsgewicht', muscles: { primary: ['hamstrings'] }, days: ['benen'] }]);
r = one('nordic curls 3 sets van 5');
assert.equal(r.entries[0].exercise, 'Nordic curl');
assert.deepEqual(r.entries[0].sets, times(3, { reps: 5 }));

console.log('parse.js: all checks passed');
