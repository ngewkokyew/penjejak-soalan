/**
 * normalize_data.js
 * Fixes constituency names (PDF parsing artifacts) and minister names (typos/duplicates).
 * Reads questions_all_clean.json, writes public/data/dewan-rakyat.json.
 */

const fs = require('fs');
const path = require('path');

// Manual overrides from human review (members_review.csv)
const MANUAL_REP_OVERRIDES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'manual_rep_overrides.json'), 'utf8')
);
// Constituency fixes for records whose seat was empty/BERSARA in source data
const MANUAL_CONST_OVERRIDES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'manual_const_overrides.json'), 'utf8')
);

// ── Constituency normalisation ─────────────────────────────────────────────

// Remove all whitespace for grouping
function noSpace(s) {
  return s.replace(/\s+/g, '').toUpperCase();
}

// Canonical form for each no-space key.
// Built from the data: when multiple spellings map to same no-space key,
// we specify the correct one here. Any unlisted key keeps the most-common form.
const CANONICAL_NOSP = {
  // Bukit Bintang (mixed case vs all-caps)
  'BUKITBINTANG': 'BUKIT BINTANG',
  // Gerik
  'GERIK': 'GERIK',
  // Kampar (K AMPAR / KAMPA R / KAMPAR)
  'KAMPAR': 'KAMPAR',
  // Kuala Krau (K UALA KRAU / KUALA K RAU / KUALA KRAU)
  'KUALAKRAU': 'KUALA KRAU',
  // Kulim-Bandar Bharu
  'KULIM-BANDARBHARU': 'KULIM-BANDAR BAHARU',
  // Hulu Selangor (HU LU / HULU S ELANGOR / HULU SELANGOR)
  'HULUSELANGOR': 'HULU SELANGOR',
  // Segamat (SE GAMAT / SEGAMA T / SEGAMAT)
  'SEGAMAT': 'SEGAMAT',
  // Paya Besar (P AYA / PAY A / PAYA)
  'PAYABESAR': 'PAYA BESAR',
  // Pasir Puteh (PA SIR PUTEH / PASIR PUT E H / PASIR PUTEH)
  'PASIRPUTEH': 'PASIR PUTEH',
  // Tapah
  'TAPAH': 'TAPAH',
  // Tanjung Piai (T ANJUN G PIAI)
  'TANJUNGPIAI': 'TANJUNG PIAI',
  // Tanjong Manis
  'TANJONGMANIS': 'TANJONG MANIS',
};

// Manual fixes: exact string → correct string
// Covers cases where broken names don't share a no-space key with the correct form
const MANUAL_CONSTITUENCY = {
  // Typos / different spellings that differ after removing spaces
  'KUALA KERAI': 'KUALA KRAI',
  'K UALA KRAI': 'KUALA KRAI',
  'IPOH TIMUR': 'IPOH TIMOR',       // EC official spelling is TIMOR (not TIMUR)
  'TANJUNG KARANG': 'TANJONG KARANG', // official EC spelling uses TANJONG
  'TANJONG PIAI': 'TANJUNG PIAI',    // official EC spelling uses TANJUNG
  'PASER PUTEH': 'PASIR PUTEH',
  'KALABKAAN': 'KALABAKAN',
  'KULIM - BANDAR BHARU': 'KULIM-BANDAR BAHARU',
  'KULIM- BANDAR BHARU': 'KULIM-BANDAR BAHARU',
  'KULIM-BANDAR BHARU': 'KULIM-BANDAR BAHARU',
  'KULIM BANDAR BAHARU': 'KULIM-BANDAR BAHARU',
  'BERSARA': '',                      // "retired" — not a constituency
  // Casing
  'Bukit Bintang': 'BUKIT BINTANG',
  'Gerik': 'GERIK',
};

// Build auto-canonical map from data (pick the all-caps, no-weird-space form)
function buildAutoCanonical(questions) {
  const groups = {};
  for (const q of questions) {
    const c = q.constituency;
    if (!c) continue;
    const key = noSpace(c);
    if (!groups[key]) groups[key] = {};
    groups[key][c] = (groups[key][c] || 0) + 1;
  }
  const auto = {};
  for (const [key, forms] of Object.entries(groups)) {
    if (CANONICAL_NOSP[key]) {
      auto[key] = CANONICAL_NOSP[key];
      continue;
    }
    // Pick form with no single-char tokens, all uppercase, most common
    const ranked = Object.entries(forms).sort((a, b) => {
      const scoreA = isClean(a[0]) ? 1000 + a[1] : a[1];
      const scoreB = isClean(b[0]) ? 1000 + b[1] : b[1];
      return scoreB - scoreA;
    });
    auto[key] = ranked[0][0];
  }
  return auto;
}

function isClean(s) {
  if (s !== s.toUpperCase()) return false;
  const tokens = s.split(/\s+/);
  return !tokens.some(t => t.length === 1);
}

function normaliseConstituency(raw, autoCanonical) {
  if (!raw) return raw;
  // Manual override first
  if (MANUAL_CONSTITUENCY[raw] !== undefined) return MANUAL_CONSTITUENCY[raw];
  // Auto canonical via no-space key
  const key = noSpace(raw);
  return autoCanonical[key] || raw;
}

// ── Minister normalisation ─────────────────────────────────────────────────

// Canonical minister names (official Malay names per Wikipedia / cabinet list).
// Commas and hyphens are significant for matching but spaces are not (PDF artifact).
const CANONICAL_MINISTERS = [
  'PERDANA MENTERI',
  'MENTERI BELIA DAN SUKAN',
  'MENTERI DALAM NEGERI',
  'MENTERI DIGITAL',
  'MENTERI EKONOMI',
  'MENTERI KEMAJUAN DESA DAN WILAYAH',
  'MENTERI KERJA RAYA',
  'MENTERI KESIHATAN',
  'MENTERI KEWANGAN',
  'MENTERI KOMUNIKASI',
  'MENTERI KOMUNIKASI DAN DIGITAL',   // old combined ministry
  'MENTERI LUAR NEGERI',
  'MENTERI PEMBANGUNAN DAN KERAJAAN TEMPATAN',
  'MENTERI PEMBANGUNAN KERAJAAN TEMPATAN',
  'MENTERI PEMBANGUNAN USAHAWAN DAN KOPERASI',
  'MENTERI PEMBANGUNAN WANITA, KELUARGA DAN MASYARAKAT',
  'MENTERI PENDIDIKAN',
  'MENTERI PENDIDIKAN TINGGI',
  'MENTERI PENGANGKUTAN',
  'MENTERI PERALIHAN TENAGA DAN TRANSFORMASI AIR',
  'MENTERI PERDAGANGAN DALAM NEGERI DAN KOS SARA HIDUP',
  'MENTERI PELABURAN, PERDAGANGAN DAN INDUSTRI',
  'MENTERI PELANCONGAN, SENI DAN BUDAYA',
  'MENTERI PERLADANGAN DAN KOMODITI',
  'MENTERI PERPADUAN NEGARA',
  'MENTERI PERTAHANAN',
  'MENTERI PERTANIAN DAN KETERJAMINAN MAKANAN',
  'MENTERI PERUMAHAN DAN KERAJAAN TEMPATAN',
  'MENTERI SAINS, TEKNOLOGI DAN INOVASI',
  'MENTERI SUMBER ASLI DAN KELESTARIAN ALAM',
  'MENTERI SUMBER ASLI, ALAM SEKITAR DAN PERUBAHAN IKLIM',  // old ministry name
  'MENTERI SUMBER MANUSIA',
];

// Strip spaces (and optionally commas) for fuzzy matching
function noSpaceMin(s) {
  return s.replace(/[\s,]/g, '').toUpperCase();
}

// Build lookup: noSpaceMin(canonical) → canonical
const _minLookup = {};
for (const m of CANONICAL_MINISTERS) {
  _minLookup[noSpaceMin(m)] = m;
}

// Manual overrides for names that still don't match after stripping spaces+commas
const MINISTER_MANUAL = {
  'MENTERI DALAM': 'MENTERI DALAM NEGERI',
  'MENTERI EKONOMI EKONOMI': 'MENTERI EKONOMI',
  'MENTERI PERTANIAN DAN KETERJAMINAN MAKAN': 'MENTERI PERTANIAN DAN KETERJAMINAN MAKANAN',
  'MENTERI PERTANIAN DAN KERTERJAMINAN MAKANAN': 'MENTERI PERTANIAN DAN KETERJAMINAN MAKANAN',
  'MENTERI SUMBER ASLI,ALAM SEKITAR DAN PERUBAHAN IKLIM': 'MENTERI SUMBER ASLI DAN KELESTARIAN ALAM',
  'MENTERI SUMBER ASLI, ALAM SEKITAR DAN PERUBAHAN IKLIM': 'MENTERI SUMBER ASLI DAN KELESTARIAN ALAM',
  'MENTERI PEMBANGUNAN DAN KERAJAAN TEMPATAN': 'MENTERI PERUMAHAN DAN KERAJAAN TEMPATAN',
  'MENTERI PEMBANGUNAN KERAJAAN TEMPATAN': 'MENTERI PERUMAHAN DAN KERAJAAN TEMPATAN',
};

function normaliseMinister(raw) {
  if (!raw) return raw;
  if (MINISTER_MANUAL[raw]) return MINISTER_MANUAL[raw];
  const key = noSpaceMin(raw);
  return _minLookup[key] || raw;
}

// ── Representative name normalisation ─────────────────────────────────────

// Fix encoding mojibake: â€™ (misread UTF-8 right-quote) → plain apostrophe
// Also strips PDF parsing artifacts like ": LISAN " / ": BERTULIS " prefixes
function fixEncoding(s) {
  if (!s) return s;
  // â€™ is U+2019 (') read as Windows-1252 then stored as UTF-8
  s = s.replace(/â€™/g, "'").replace(/â€˜/g, "'");
  // Strip ": LISAN" / ": BERTULIS" (question-type labels mixed into name by PDF parser)
  s = s.replace(/^:\s*(LISAN|BERTULIS)\s*/i, '');
  return s.trim();
}

function isCleanName(s) {
  const tokens = s.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    if (/^[A-Z]$/.test(tokens[i])) {
      // Allow single letter after A/L or A/P — it's a legitimate father's initial
      if (i > 0 && /^A\/(L|P)$/i.test(tokens[i - 1])) continue;
      return false;
    }
  }
  return true;
}

// Core grouping key for representative names.
// Strategy: strip ALL non-letter chars first (collapses spaces AND "Y.B." dots),
// then remove honorific/patronymic strings. Result: two spellings of the same
// person produce the same key, regardless of title or PDF space artifacts.
function repCoreKey(s) {
  let t = s.toUpperCase().replace(/[^A-Z]/g, ''); // "Y.B. TUAN MORDI" → "YBTUANMORDI"
  // Strip leading prefixes (now pure letters, easy to match)
  t = t.replace(/^(YAB|YB)+/, '');        // YB, YAB
  t = t.replace(/^(TUAN|PUAN)+/, '');     // TUAN, PUAN
  t = t.replace(/^(KAPTEN|IR|TS)+/, '');  // KAPTEN, IR., TS.
  // Strip embedded patronymics (anywhere)
  t = t.replace(/BIN|BINTI|ANAK/g, '');
  // Strip Islamic titles embedded in names
  t = t.replace(/HAJI|HAJAH/g, '');
  // Strip civil/noble title combos (order: longest first to avoid partial matches)
  t = t.replace(/TANSRI|DATOSRI|DATUKSERI|DATUKWIRA/g, '');
  t = t.replace(/DATO|DATUK|DATU|DR/g, '');
  t = t.replace(/PANGLIMA/g, '');
  return t;
}

// Title rank — prefer higher-ranking titles as the canonical display form
function titleRank(s) {
  if (/TAN SRI/i.test(s)) return 5;
  if (/DATO' SRI|DATO SRI/i.test(s)) return 4;
  if (/DATO'|DATO /i.test(s)) return 3;
  if (/DATUK/i.test(s)) return 2;
  if (/DR\./i.test(s)) return 1;
  return 0;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function buildRepCanonical(questions) {
  // Pre-process: fix encoding only (no stripping — repCoreKey handles titles)
  const prepped = questions.map(q => ({
    ...q,
    representative: fixEncoding(q.representative || '').trim(),
  }));

  // Step 1: Group by exact (coreKey, constituency)
  const exactGroups = {};
  for (const q of prepped) {
    const name = q.representative;
    const seat = q.constituency || '';
    if (!name) continue;
    const key = repCoreKey(name) + '|' + seat;
    if (!exactGroups[key]) exactGroups[key] = {};
    exactGroups[key][name] = (exactGroups[key][name] || 0) + 1;
  }

  // Step 2: Within each constituency, fuzzy-merge groups whose coreKeys differ by ≤ 1
  // Group exact-keys by constituency
  const bySeat = {};
  for (const key of Object.keys(exactGroups)) {
    const seat = key.slice(key.lastIndexOf('|') + 1);
    if (!bySeat[seat]) bySeat[seat] = [];
    bySeat[seat].push(key);
  }

  // Union-find helpers
  const parent = {};
  function find(x) {
    if (!parent[x]) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(x, y) {
    parent[find(x)] = find(y);
  }

  for (const keys of Object.values(bySeat)) {
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const coreA = keys[i].slice(0, keys[i].lastIndexOf('|'));
        const coreB = keys[j].slice(0, keys[j].lastIndexOf('|'));
        if (levenshtein(coreA, coreB) <= 1) {
          union(keys[i], keys[j]);
        }
      }
    }
  }

  // Collect merged groups
  const merged = {};
  for (const key of Object.keys(exactGroups)) {
    const root = find(key);
    if (!merged[root]) merged[root] = {};
    for (const [name, cnt] of Object.entries(exactGroups[key])) {
      merged[root][name] = (merged[root][name] || 0) + cnt;
    }
  }

  // Step 3: Pick the best display name per merged group
  // Map every original exact key → canonical name
  const groupKeyToCanon = {};
  for (const [root, forms] of Object.entries(merged)) {
    const ranked = Object.entries(forms).sort((a, b) => {
      const sa = (isCleanName(a[0]) ? 10000 : 0) + titleRank(a[0]) * 1000 + a[1];
      const sb = (isCleanName(b[0]) ? 10000 : 0) + titleRank(b[0]) * 1000 + b[1];
      return sb - sa;
    });
    const canon = ranked[0][0];
    // Map all keys in this cluster to the canonical name
    for (const key of Object.keys(exactGroups)) {
      if (find(key) === find(root)) {
        groupKeyToCanon[key] = canon;
      }
    }
  }
  return groupKeyToCanon;
}

function normaliseRep(raw, constituency, repCanon) {
  if (!raw) return raw;
  const enc = fixEncoding(raw).trim();
  // Step 1: automatic coreKey grouping
  const coreKey = repCoreKey(enc) + '|' + (constituency || '');
  const auto = repCanon[coreKey] || enc;
  // Step 2: manual override from human review (applied on the auto-normalized form)
  const manualKey = auto + '|' + (constituency || '');
  return MANUAL_REP_OVERRIDES[manualKey] || auto;
}

// ── Question text cleanup ──────────────────────────────────────────────────
// Strip the answer portion (everything from "JAWAPAN" onward) and trailing
// "NO SOALAN : XX" artifacts left by the PDF parser.
function cleanQuestion(text) {
  if (!text) return text;
  // Cut off at JAWAPAN (answer section included in same PDF block)
  const jawapanIdx = text.search(/\bJAWAPAN\b/i);
  if (jawapanIdx !== -1) text = text.slice(0, jawapanIdx);
  // Strip "NO SOALAN : <number>" and any trailing metadata
  text = text.replace(/\s*NO SOALAN\s*:.*$/i, '');
  return text.trim();
}

// ── Date correction ────────────────────────────────────────────────────────
// Some PDFs have a typo in the printed year (e.g. "20 MAC 2022" in a file
// clearly named JDR20032023.pdf). Correct the year using the sourceFile name.
function correctDate(date, sourceFile) {
  if (!date || !sourceFile) return { date, dateCorrected: false };
  const fileYear = sourceFile.match(/(\d{4})\.pdf$/i);
  if (!fileYear) return { date, dateCorrected: false };
  const correctYear = fileYear[1];
  const dateYear = date.match(/\b(\d{4})\b/);
  if (!dateYear || dateYear[1] === correctYear) return { date, dateCorrected: false };
  return { date: date.replace(dateYear[1], correctYear), dateCorrected: true };
}

// ── Main ───────────────────────────────────────────────────────────────────

const srcPath = path.join(__dirname, 'questions_all_clean.json');
const outPath = path.join(__dirname, 'public', 'data', 'dewan-rakyat.json');

const data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
console.log(`Loaded ${data.questions.length} questions from ${srcPath}`);

const autoCanonical = buildAutoCanonical(data.questions);

// Pass 1: fix constituency + minister (so rep grouping uses clean seat names)
let fixedConst = 0, fixedMin = 0, fixedRep = 0;
const pass1 = data.questions.map(q => {
  let newConst = normaliseConstituency(q.constituency, autoCanonical);
  const newMin = normaliseMinister(q.minister);
  // If constituency is still empty, fix via manual override keyed by rep name
  if (!newConst) {
    const repEnc = fixEncoding(q.representative || '').trim();
    newConst = MANUAL_CONST_OVERRIDES[repEnc] || '';
    // Fallback: strip parentheticals (embedded seat names) then match by coreKey
    if (!newConst) {
      const stripped = repEnc.replace(/\s*\([^)]+\)/g, '').trim();
      const ck = repCoreKey(stripped);
      for (const [k, v] of Object.entries(MANUAL_CONST_OVERRIDES)) {
        if (repCoreKey(k) === ck) { newConst = v; break; }
      }
    }
  }
  if (newConst !== q.constituency) fixedConst++;
  if (newMin   !== q.minister)     fixedMin++;
  return { ...q, constituency: newConst, minister: newMin };
});

// Pass 2: build rep canonical with clean seat names, then apply + correct dates
const repCanonical = buildRepCanonical(pass1);
let fixedDate = 0;
const normalised = pass1.map(q => {
  const newRep = normaliseRep(q.representative, q.constituency, repCanonical);
  if (newRep !== q.representative) fixedRep++;
  const { date, dateCorrected } = correctDate(q.date, q.sourceFile);
  if (dateCorrected) fixedDate++;
  const question = cleanQuestion(q.question);
  return { ...q, representative: newRep, date, question, ...(dateCorrected && { dateCorrected: true }) };
});

const out = { ...data, questions: normalised };
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

// ── Report ─────────────────────────────────────────────────────────────────
console.log(`Fixed constituencies : ${fixedConst}`);
console.log(`Fixed ministers      : ${fixedMin}`);
console.log(`Fixed representatives: ${fixedRep}`);
console.log(`Fixed dates (typo yr): ${fixedDate}`);

const finalConst = new Set(normalised.map(q => q.constituency).filter(Boolean));
const finalMin   = new Set(normalised.map(q => q.minister).filter(Boolean));
const finalReps  = new Set(normalised.map(q => q.representative).filter(Boolean));
console.log(`Unique constituencies after: ${finalConst.size}`);
console.log(`Unique ministers after     : ${finalMin.size}`);
console.log(`Unique representative names: ${finalReps.size}`);

// Unique (rep, constituency) groups — what the UI sidebar shows
const repGroups = new Map();
for (const q of normalised) {
  const k = q.representative + '__' + q.constituency;
  if (!repGroups.has(k)) repGroups.set(k, 0);
  repGroups.set(k, repGroups.get(k) + 1);
}
console.log(`Unique (rep, constituency) groups: ${repGroups.size}  ← sidebar count`);

// Show remaining constituency duplicates
const constGroups = {};
for (const c of finalConst) {
  const k = noSpace(c);
  if (!constGroups[k]) constGroups[k] = [];
  constGroups[k].push(c);
}
const dups = Object.values(constGroups).filter(g => g.length > 1);
if (dups.length) {
  console.log('\nREMAINING CONSTITUENCY DUPLICATES:');
  dups.forEach(g => console.log(' ', g.join(' | ')));
} else {
  console.log('\nNo remaining constituency duplicates.');
}

console.log('\nAll ministers:');
[...finalMin].sort().forEach(m => console.log(' ', m));
