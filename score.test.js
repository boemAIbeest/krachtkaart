// Run: node score.test.js
const assert = require('node:assert/strict');
const S = require('./score.js');
const now = Date.parse('2026-09-25T12:00:00Z');
const w = (hoursAgo, entries) => ({ at: new Date(now - hoursAgo * 3600e3).toISOString(), entries });
const set = (reps, kg) => ({ reps, kg });

assert.equal(S.e1rm(100, 1), 100);
assert.equal(S.e1rm(100, 0), 0);
assert.ok(Math.abs(S.e1rm(100, 5) - 116.667) < 0.01);

assert.equal(S.findExercise('bench press').name, 'Bankdrukken');
assert.equal(S.findExercise('Weighted pull-ups').name, 'Pull-up');
assert.equal(S.findExercise('iets onbekends'), null);

assert.equal(S.levelFor(0.3, [0.75, 1, 1.5, 2]), 1);
assert.equal(S.levelFor(1.0, [0.75, 1, 1.5, 2]), 3);
assert.equal(S.levelFor(2.5, [0.75, 1, 1.5, 2]), 5);

// bench 80x5 @ bw 80 -> ratio 1.167 -> Gemiddeld; triceps secondary -> Novice
let lv = S.muscleLevels([w(1, [{ exercise: 'Bankdrukken', kind: 'gewicht', sets: [set(5, 80)] }])], 80, 'm');
assert.equal(lv.borst.level, 3);
assert.equal(lv.triceps.level, 2);

// weighted pull-up: (80+20) x5 -> 1.458 -> Gemiddeld on rug
lv = S.muscleLevels([w(1, [{ exercise: 'pull-ups', kind: 'lichaamsgewicht', sets: [set(5, 20)] }])], 80, 'm');
assert.equal(lv.rug.level, 3);

// female scaling: bench 50x1 @ 60 -> 0.833 vs [0.45,0.6,0.9,1.2] -> Gemiddeld
lv = S.muscleLevels([w(1, [{ exercise: 'Bankdrukken', kind: 'gewicht', sets: [set(1, 50)] }])], 60, 'v');
assert.equal(lv.borst.level, 3);

// skill ladder: front lever step 2 -> level 2 on rug and buik
lv = S.muscleLevels([w(1, [{ exercise: 'Front lever', kind: 'skill', sets: [{ step: 2, sec: 8 }] }])], 80, 'm');
assert.equal(lv.rug.level, 2);
assert.equal(lv.buik.level, 2);

// recovery decay; stretch ignored
const bench1 = { exercise: 'Bankdrukken', kind: 'gewicht', sets: [set(5, 80)] };
assert.equal(S.recovery([w(0, [bench1])], now).borst, 1);
assert.equal(S.recovery([w(36, [bench1])], now).borst, 0.5);
assert.equal(S.recovery([w(80, [bench1])], now).borst ?? 0, 0);
assert.equal(S.recovery([w(1, [{ exercise: 'Stretchen', kind: 'stretch', muscles: { primary: ['hamstrings'], secondary: [] }, sets: [{ sec: 60 }] }])], now).hamstrings ?? 0, 0);
assert.deepEqual([2, 5, 9].map(S.recoveryStatus), [0, 1, 2]);

// series ascending, e1rm values
const ser = S.exerciseSeries([w(1, [bench1]), w(50, [{ exercise: 'bench', kind: 'gewicht', sets: [set(5, 70)] }])], 'Bankdrukken', 80);
assert.equal(ser.length, 2);
assert.ok(ser[0].value < ser[1].value);
assert.equal(ser[1].unit, 'kg');

// week stats: 2 sessions in last 7 days, stretch sets excluded
const ws = S.weekStats([w(1, [bench1]), w(30, [bench1, { exercise: 'Stretchen', kind: 'stretch', sets: [{ sec: 30 }] }]), w(200, [bench1])], now);
assert.deepEqual(ws, { sessions: 2, hardSets: 2 });

console.log('score.js: all checks passed');
