/**
 * parse_overrides.js
 * Reads members_review.csv and writes manual_rep_overrides.json.
 * The JSON maps "normalizedRep|constituency" → canonical name.
 */

const fs = require('fs');
const path = require('path');

const csv = fs.readFileSync(
  path.join(__dirname, 'members_review.csv'), 'utf8'
).replace(/^﻿/, ''); // strip BOM

// Simple CSV parser that handles double-quoted fields
function parseCSV(text) {
  const rows = [];
  for (const line of text.split('\r\n').filter(l => l.trim())) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let j = i + 1;
        let val = '';
        while (j < line.length) {
          if (line[j] === '"' && line[j + 1] === '"') { val += '"'; j += 2; }
          else if (line[j] === '"') { j++; break; }
          else { val += line[j++]; }
        }
        fields.push(val);
        if (line[j] === ',') j++;
        i = j;
      } else {
        let j = line.indexOf(',', i);
        if (j === -1) j = line.length;
        fields.push(line.slice(i, j));
        i = j + 1;
      }
    }
    rows.push(fields);
  }
  return rows;
}

const rows = parseCSV(csv);
const [header, ...dataRows] = rows;
// header: No, Constituency, Representative, Questions, Group (manual)

const repOverrides = {};   // (rep|constituency) → canonical rep name
const constOverrides = {}; // rep name → correct constituency (for empty-seat records)

for (const row of dataRows) {
  const constituency = (row[1] || '').trim();
  const representative = (row[2] || '').trim();
  const group = (row[4] || '').trim();

  if (!representative) continue;

  // Constituency override: store for every row that has a seat filled in
  // (applied only when the record's constituency is currently empty)
  if (constituency) constOverrides[representative] = constituency;

  // Rep name override: applied after auto-normalisation
  if (group && group !== representative) {
    const key = representative + '|' + constituency;
    repOverrides[key] = group;
  }
}

fs.writeFileSync(
  path.join(__dirname, 'manual_rep_overrides.json'),
  JSON.stringify(repOverrides, null, 2), 'utf8'
);
fs.writeFileSync(
  path.join(__dirname, 'manual_const_overrides.json'),
  JSON.stringify(constOverrides, null, 2), 'utf8'
);

console.log(`Written ${Object.keys(repOverrides).length} rep overrides to manual_rep_overrides.json`);
console.log(`Written ${Object.keys(constOverrides).length} const overrides to manual_const_overrides.json`);
