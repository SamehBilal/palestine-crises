// Checks the data files for mistakes before they reach the site. Run after every data update:
//   node tools/check-data.js
// Exits with code 1 and lists every problem it finds.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const problems = [];
const bad = msg => problems.push(msg);
// Things worth knowing that don't break the site
const warnings = [];
const warn = msg => warnings.push(msg);
function load(file) {
    try {
        return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
    } catch (e) {
        bad(`${file}: not valid JSON (${e.message})`);
        return null;
    }
}
const isCount = v => Number.isInteger(v) && v >= 0;
const exists = rel => fs.existsSync(path.join(ROOT, rel));

const live = load('livetracker.json');
const regions = load('regions.json') || [];
const attacks = load('attacks.json') || [];
const history = load('history.json') || [];
const translations = load('translations.json') || { en: {}, ar: {} };
const brands = load('brands.json') || [];
const celebrities = load('celebrities.json') || [];
const barcodes = load('barcodes.json') || [];

// livetracker.json: every figure is a count, or null when we don't have it.
// increase_X is how much X went up since the last update, so it can never be more than X.
if (live) {
    for (const [key, value] of Object.entries(live)) {
        if (key === 'id' || key === 'last_update') continue;
        if (value !== null && !isCount(value)) bad(`livetracker.json: ${key} = ${JSON.stringify(value)} is not a count or null`);
        if (key.startsWith('previous_')) bad(`livetracker.json: ${key} should be named increase_${key.slice(9)} (it holds the increase, not the previous total)`);
        if (key.startsWith('increase_')) {
            const total = live[key.slice(9)];
            if (!(key.slice(9) in live)) bad(`livetracker.json: ${key} has no matching ${key.slice(9)}`);
            else if (isCount(value) && isCount(total) && value > total) bad(`livetracker.json: ${key} (${value}) is more than ${key.slice(9)} (${total}) — the previous total would be negative`);
        }
    }
    const parts = ['women_deaths', 'children_deaths', 'elders_deaths'].reduce((s, k) => s + (live[k] || 0), 0);
    if (parts > live.total_deaths) bad(`livetracker.json: women + children + elders (${parts}) is more than total_deaths (${live.total_deaths})`);
    if (live.total_hospitals_broken > live.total_hospitals) bad('livetracker.json: more hospitals out of service than hospitals');
    if (live.total_clinics_broken > live.total_clinics) bad('livetracker.json: more clinics closed than clinics');
    if (Number.isNaN(Date.parse(live.last_update))) bad('livetracker.json: last_update is not a date');
    else if (Date.parse(live.last_update) > Date.now()) bad('livetracker.json: last_update is in the future');
}

// regions.json
const regionById = new Map(regions.map(r => [r.id, r]));
if (regionById.size !== regions.length) bad('regions.json: duplicate ids');
const codes = new Set();
for (const r of regions) {
    if (!/^PS-[A-Z]+$/.test(r.code || '')) bad(`regions.json: ${r.name} has an odd code ${r.code}`);
    if (codes.has(r.code)) bad(`regions.json: code ${r.code} used twice`);
    codes.add(r.code);
    if (r.part_of && !regionById.has(r.part_of)) bad(`regions.json: ${r.name} is part_of unknown region ${r.part_of}`);
    if (!translations.ar[r.name]) bad(`translations.json: no Arabic name for region "${r.name}"`);
}

// attacks.json: per-region figures
const fields = ['total_deaths', 'women_deaths', 'children_deaths', 'elders_deaths', 'total_injuries', 'total_displaced', 'total_destroyed_residential_units'];
const seenRegion = new Set();
for (const a of attacks) {
    const r = regionById.get(a.region_id);
    if (!r) { bad(`attacks.json: row ${a.id} points at unknown region ${a.region_id}`); continue; }
    if (r.name !== a.region_name) bad(`attacks.json: row ${a.id} says "${a.region_name}" but region ${a.region_id} is "${r.name}"`);
    if (seenRegion.has(a.region_id)) bad(`attacks.json: two rows for ${r.name}`);
    seenRegion.add(a.region_id);
    for (const f of fields) if (a[f] !== null && !isCount(a[f])) bad(`attacks.json: ${r.name} ${f} = ${JSON.stringify(a[f])}`);
    if (a.women_deaths + a.children_deaths + a.elders_deaths > a.total_deaths) bad(`attacks.json: ${r.name} women + children + elders is more than its total deaths`);
}
// A governorate can't have as many deaths as the whole area it belongs to, unless it's the only one with figures
for (const agg of attacks.filter(a => a.is_aggregate)) {
    const sameFigures = attacks.filter(a => !a.is_aggregate && a.region_id !== agg.region_id && a.total_deaths === agg.total_deaths && a.total_injuries === agg.total_injuries && agg.total_deaths > 0);
    sameFigures.forEach(a => bad(`attacks.json: ${a.region_name} repeats the ${agg.region_name} total (${agg.total_deaths} deaths) — copied rather than its own figures?`));
}
if (live && attacks.some(a => a.is_aggregate)) {
    const sum = attacks.filter(a => a.is_aggregate).reduce((s, a) => s + a.total_deaths, 0);
    if (sum > live.total_deaths) bad(`attacks.json: regions add up to ${sum} deaths, more than the overall total ${live.total_deaths}`);
}

// history.json: the death toll over time
let prev = null;
for (const point of history) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(point.date)) bad(`history.json: bad date ${point.date}`);
    if (!isCount(point.total_deaths)) bad(`history.json: ${point.date} total_deaths is not a count`);
    if (prev && point.date <= prev.date) bad(`history.json: ${point.date} is not after ${prev.date}`);
    if (prev && point.total_deaths < prev.total_deaths) bad(`history.json: the toll goes down on ${point.date}`);
    prev = point;
}
if (live && prev && prev.total_deaths !== live.total_deaths) bad(`history.json: last point (${prev.total_deaths}) doesn't match livetracker total_deaths (${live.total_deaths})`);
if (live && prev && prev.date !== String(live.last_update).slice(0, 10)) bad(`history.json: last point is ${prev.date} but livetracker was updated ${String(live.last_update).slice(0, 10)}`);

// translations.json: both languages have the same keys
for (const k of Object.keys(translations.en)) if (!(k in translations.ar)) bad(`translations.json: "${k}" has no Arabic`);
for (const k of Object.keys(translations.ar)) if (!(k in translations.en)) bad(`translations.json: "${k}" is only in Arabic`);

// brands.json
const brandIds = new Set();
for (const b of brands) {
    if (brandIds.has(b.id)) bad(`brands.json: id ${b.id} used twice`);
    brandIds.add(b.id);
    if (!b.ar_name) bad(`brands.json: ${b.name} has no Arabic name`);
    if (!exists('assets/img/brands/' + b.logo)) bad(`brands.json: ${b.name} logo ${b.logo} is missing`);
    if (b.first_letter !== b.name.trim()[0].toLowerCase()) bad(`brands.json: ${b.name} first_letter "${b.first_letter}"`);
    if (b.ar_name && b.first_ar_letter !== b.ar_name.trim()[0]) bad(`brands.json: ${b.ar_name} first_ar_letter "${b.first_ar_letter}"`);
}
for (const b of brands) if (b.alternative_id && !brandIds.has(b.alternative_id)) bad(`brands.json: ${b.name} alternative ${b.alternative_id} doesn't exist`);

// celebrities.json
for (const c of celebrities) {
    // no photo is fine: the card shows initials
    if (c.image && !exists('assets/celebrities/img/' + c.image)) warn(`celebrities.json: ${c.name} photo assets/celebrities/img/${c.image} not found (initials shown instead)`);
    for (const k of ['ar_name', 'ar_subtitle', 'ar_bio', 'ar_stance']) if (!c[k]) bad(`celebrities.json: ${c.name} has no ${k}`);
}

// barcodes.json
for (const b of barcodes) {
    if (!/^\d{1,3}$/.test(b.prefix)) bad(`barcodes.json: ${b.name} prefix "${b.prefix}"`);
    if (!b.ar_name) bad(`barcodes.json: ${b.name} has no Arabic name`);
}

if (warnings.length) console.log(`${warnings.length} note(s):\n` + warnings.map(w => '  · ' + w).join('\n'));
if (problems.length) {
    console.log(`${problems.length} problem(s) in data/:\n` + problems.map(p => '  - ' + p).join('\n'));
    process.exitCode = 1;
} else {
    console.log('data/ looks right');
}
