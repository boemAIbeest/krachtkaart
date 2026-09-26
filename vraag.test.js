// Run: node vraag.test.js
const assert = require('node:assert/strict');
const V = require('./vraag.js');

// matcher on a tiny fixture
const fixture = [
  { id: 'spierpijn', q: 'Waarom heb ik spierpijn na het trainen?', alt: [], tags: ['doms'], a: 'Spierpijn na ongewone belasting.' },
  { id: 'volume', q: 'Hoeveel sets per spiergroep per week?', alt: ['hoeveel volume'], tags: ['volume'], a: 'Tien of meer sets per week.' },
  { id: 'eiwit', q: 'Hoeveel eiwit heb ik nodig?', alt: [], tags: ['proteine'], a: '1,6 gram per kilo lichaamsgewicht.' },
];
const fx = V.index(fixture);
const top = (idx, t) => V.search(idx, t)[0]?.item.id;
assert.equal(top(fx, 'waarom ben ik zo stijf na het trainen'), 'spierpijn');
assert.equal(top(fx, 'hoeveel sets per week'), 'volume');
assert.equal(top(fx, 'hoeveel proteïne'), 'eiwit');
assert.deepEqual(V.search(fx, 'wat is de hoofdstad van frankrijk'), []);
assert.deepEqual(V.search(fx, ''), []);
assert.deepEqual(V.tokens('Spierpijn'), V.tokens('spierpijnen'));

// the real knowledge base: every item is well-formed, and real questions land on the right answer
const fs = require('node:fs');
if (fs.existsSync('./vragen.json')) {
  const Q = JSON.parse(fs.readFileSync('./vragen.json', 'utf8'));
  const themes = new Set(Q.themes.map((t) => t.id)), ids = new Set();
  for (const it of Q.items) {
    assert.ok(!ids.has(it.id), 'dubbel id ' + it.id); ids.add(it.id);
    assert.ok(themes.has(it.theme), it.id + ' thema');
    assert.ok(it.q && it.a, it.id + ' vraag/antwoord');
    assert.ok(['sterk', 'redelijk', 'beperkt'].includes(it.bewijs), it.id + ' bewijs');
    assert.ok(it.bronnen?.length, it.id + ' bronnen');
    for (const b of it.bronnen) assert.match(b.url, /^https:\/\/(pubmed\.ncbi\.nlm\.nih\.gov\/\d+\/|doi\.org\/)/, it.id + ' url');
  }
  const idx = V.index(Q.items);
  const CASES = require('./vraag.cases.json');
  const miss = CASES.filter(([text, id]) => !V.search(idx, text).slice(0, 3).some((r) => r.item.id === id))
    .map(([text, id]) => `${text} -> ${id} (kreeg ${V.search(idx, text).slice(0, 3).map((r) => r.item.id).join(', ') || 'niets'})`);
  assert.deepEqual(miss, []);
  const first = CASES.filter(([text, id]) => top(idx, text) === id).length;
  assert.ok(first / CASES.length >= 0.8, `maar ${first}/${CASES.length} als eerste antwoord`);
  assert.deepEqual(V.search(idx, 'wat is de hoofdstad van frankrijk'), []);
}

console.log('vraag.js: all checks passed');
