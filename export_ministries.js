const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'public/data/dewan-rakyat.json'), 'utf8'));

const counts = {};
for (const q of data.questions) {
  const m = q.minister || '';
  if (!m) continue;
  counts[m] = (counts[m] || 0) + 1;
}

const rows = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));

const escape = v => '"' + String(v).replace(/"/g, '""') + '"';
const header = ['No', 'Ministry', 'Questions', 'Group (manual)'];
const lines = [header.join(',')];
rows.forEach(([m, c], i) => {
  lines.push([i + 1, escape(m), c, ''].join(','));
});

const outPath = path.join(__dirname, 'ministries_review.csv');
fs.writeFileSync(outPath, '﻿' + lines.join('\r\n'), 'utf8');
console.log(`Written ${rows.length} rows to ${outPath}`);
