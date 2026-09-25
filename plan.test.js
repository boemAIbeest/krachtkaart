// Run: node plan.test.js
const assert = require('node:assert/strict');
globalThis.Score = require('./score.js');
const Plan = require('./plan.js');
const now = Date.parse('2026-09-25T12:00:00Z');
const w = (hoursAgo, dayType, entries) => ({ at: new Date(now - hoursAgo * 3600e3).toISOString(), dayType, entries });
const times = (n, s) => Array.from({ length: n }, () => ({ ...s }));

assert.equal(Plan.DAYS.length, 10);

// after a heavy push day yesterday, recommend something that doesn't hit the same muscles
const push = w(20, 'push', [
  { exercise: 'Bankdrukken', sets: times(5, { reps: 5, kg: 80 }) },
  { exercise: 'Dips', sets: times(4, { reps: 8, kg: 10 }) },
  { exercise: 'Overhead press', sets: times(4, { reps: 8, kg: 40 }) },
]);
const rec = Plan.recommendDay([push], now);
assert.ok(!['push', 'upper', 'borst-rug', 'armen-schouders'].includes(rec.id), rec.id);
assert.ok(rec.reason.length > 0);
// with no history the first day in the list wins
assert.equal(Plan.recommendDay([], now).id, 'push');

// pool: knowledge first, then longest rested (never done before older before recent)
Score.addExercises([{ name: 'Scapula pull-up', kind: 'lichaamsgewicht', muscles: { primary: ['rug'] }, days: ['pull'], dose: { sets: 3, reps: '8-12' }, source: 'Video A' }]);
const hist = [
  w(72, 'pull', [{ exercise: 'Pull-up', sets: [{ reps: 5, kg: 10 }] }]),
  w(240, 'pull', [{ exercise: 'Barbell row', sets: [{ reps: 8, kg: 60 }] }]),
];
const names = Plan.pool('pull', hist, now).map((x) => x.name);
assert.equal(names[0], 'Scapula pull-up');
assert.ok(names.indexOf('Lat pulldown') < names.indexOf('Barbell row'));
assert.ok(names.indexOf('Barbell row') < names.indexOf('Pull-up'));
assert.ok(Plan.pool('mobility', [], now).every((x) => x.kind === 'stretch'));
assert.ok(Plan.stretchPool('benen', [], now).length >= 2);

// targets: double progression with a rep range
Score.addExercises([{ name: 'Lateral raise', dose: { sets: 3, reps: '8-12' }, days: ['push'] }]);
let t = Plan.target('Lateral raise', [w(48, 'push', [{ exercise: 'Lateral raise', sets: times(3, { reps: 12, kg: 10 }) }])]);
assert.deepEqual(t, { sets: 3, reps: 8, kg: 12.5 });
t = Plan.target('Lateral raise', [w(48, 'push', [{ exercise: 'Lateral raise', sets: [{ reps: 12, kg: 10 }, { reps: 10, kg: 10 }, { reps: 9, kg: 10 }] }])]);
assert.deepEqual(t, { sets: 3, reps: 10, kg: 10 });
// no range, lower body: all sets hit -> +5 kg
t = Plan.target('Squat', [w(48, 'benen', [{ exercise: 'Squat', sets: times(5, { reps: 5, kg: 100 }) }])]);
assert.deepEqual(t, { sets: 5, reps: 5, kg: 105 });
assert.deepEqual(Plan.target('Hip thrust', []), { sets: 3, reps: 8 });
assert.deepEqual(Plan.target('Duivenhouding', []), { sets: 1, sec: 60 });
assert.deepEqual(Plan.target('Front lever', [w(48, 'calisthenics', [{ exercise: 'Front lever', sets: times(3, { step: 2, sec: 8 }) }])]), { sets: 3, step: 2, sec: 8 });
assert.deepEqual(Plan.target('Box jump', [w(48, 'benen', [{ exercise: 'Box jump', sets: times(4, { reps: 5 }) }])]), { sets: 4, reps: 5 });

// day guess for spoken workouts
const E = (exercise, kind) => ({ exercise, kind: kind || Score.findExercise(exercise).kind });
assert.equal(Plan.guessDay([E('Bankdrukken'), E('Overhead press'), E('Dips')]), 'push');
assert.equal(Plan.guessDay([E('Pull-up'), E('Barbell row'), E('Biceps curl')]), 'pull');
assert.equal(Plan.guessDay([E('Box jump'), E('Squat'), E('Romanian deadlift')]), 'benen');
assert.equal(Plan.guessDay([E('Squat'), E('Romanian deadlift'), E('Leg curl')]), 'lower');
assert.equal(Plan.guessDay([E('Bankdrukken'), E('Pull-up')]), 'borst-rug');
assert.equal(Plan.guessDay([E('Duivenhouding'), E('Spagaat')]), 'mobility');
assert.equal(Plan.guessDay([E('Front lever'), E('Handstand'), E('Pull-up')]), 'calisthenics');

console.log('plan.js: all checks passed');
