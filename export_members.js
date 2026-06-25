const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'public/data/dewan-rakyat.json'), 'utf8'));

// Aggregate (rep, constituency) pairs with question count
const groups = new Map();
for (const q of data.questions) {
  const rep = q.representative || '';
  const seat = q.constituency || '';
  if (!rep) continue;
  const key = rep + '__' + seat;
  if (!groups.has(key)) groups.set(key, { representative: rep, constituency: seat, count: 0 });
  groups.get(key).count++;
}

// Sort by constituency then rep name
const rows = [...groups.values()].sort((a, b) => {
  const sc = a.constituency.localeCompare(b.constituency);
  return sc !== 0 ? sc : a.representative.localeCompare(b.representative);
});

// Write CSV
const escape = v => '"' + String(v).replace(/"/g, '""') + '"';
const header = ['No', 'Constituency', 'Representative', 'Questions', 'Group (manual)'];
const lines = [header.join(',')];
rows.forEach((r, i) => {
  lines.push([i + 1, escape(r.constituency), escape(r.representative), r.count, ''].join(','));
});

const outPath = path.join(__dirname, 'members_review.csv');
fs.writeFileSync(outPath, '﻿' + lines.join('\r\n'), 'utf8'); // BOM for Excel UTF-8
console.log(`Written ${rows.length} rows to ${outPath}`);
