// Makes the small WebP copies the pages show, from the original images (which stay as the source):
//  - every brand logo in data/brands.json -> assets/img/brands/thumbs/<name>.webp, 220×220 (cards are
//    ~110px circles with background-size: cover, so a centred square at 2× is all they need)
//  - the icons in UI_IMAGES -> .webp next to the original, at 2× their displayed size
// Resizing happens in headless Chrome's canvas (no image library needed). Only missing or out-of-date
// copies are made, so it's quick to re-run after adding brands:  node tools/build-images.js [--all]
const fs = require('fs');
const path = require('path');
const { launch } = require('./cdp');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8182;
const BASE = `http://localhost:${PORT}/`;
const server = require('./serve')(ROOT);

const BRAND_SIZE = 220;
const UI_IMAGES = [
    // [source, output, max width, max height]
    ['assets/img/people.png', 'assets/img/people.webp', 114, 114],
    ['assets/img/patient.png', 'assets/img/patient.webp', 114, 114],
    ['assets/img/man (2).png', 'assets/img/man-2.webp', 114, 114],
    ['assets/img/woman (3).png', 'assets/img/woman-3.webp', 114, 114],
    ['assets/img/palestine.webp', 'assets/img/palestine-flag.webp', 64, 64],
    ['assets/img/logo2.png', 'assets/img/logo2.webp', 480, 120]
];

const thumbName = logo => logo.replace(/\.[a-z]+$/i, '') + '.webp';

// In the page: load each image, draw it into a canvas (cover: centred square crop; fit: keep the
// whole image inside the box) and hand back WebP data
const resizeInPage = (jobs) => `Promise.all(${JSON.stringify(jobs)}.map(async ([src, w, h, mode]) => {
    try {
        const blob = await (await fetch(src)).blob();
        const img = await createImageBitmap(blob);
        let cw, ch, sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (mode === 'cover') {
            const side = Math.min(img.width, img.height);
            sx = (img.width - side) / 2; sy = (img.height - side) / 2; sw = sh = side;
            cw = ch = Math.min(w, side);
        } else {
            const scale = Math.min(1, w / img.width, h / img.height);
            cw = Math.round(img.width * scale); ch = Math.round(img.height * scale);
        }
        const c = new OffscreenCanvas(cw, ch);
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        const out = await c.convertToBlob({ type: 'image/webp', quality: 0.82 });
        const buf = new Uint8Array(await out.arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        return { ok: true, data: btoa(bin), w: cw, h: ch };
    } catch (e) {
        return { ok: false, error: String(e) };
    }
}))`;

function stale(src, out) {
    if (process.argv.includes('--all') || !fs.existsSync(out)) return true;
    return fs.statSync(src).mtimeMs > fs.statSync(out).mtimeMs;
}

async function main() {
    const brands = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/brands.json'), 'utf8'));
    fs.mkdirSync(path.join(ROOT, 'assets/img/brands/thumbs'), { recursive: true });
    const jobs = [];
    // SVG logos are already small and sharp at any size: the pages use them as they are
    for (const logo of [...new Set(brands.map(b => b.logo))].filter(l => !/\.svg$/i.test(l))) {
        const src = 'assets/img/brands/' + logo, out = 'assets/img/brands/thumbs/' + thumbName(logo);
        if (stale(path.join(ROOT, src), path.join(ROOT, out))) jobs.push([src, out, BRAND_SIZE, BRAND_SIZE, 'cover']);
    }
    for (const [src, out, w, h] of UI_IMAGES) {
        if (stale(path.join(ROOT, src), path.join(ROOT, out))) jobs.push([src, out, w, h, 'fit']);
    }
    if (!jobs.length) return console.log('All images are up to date.');

    await new Promise(r => server.listen(PORT, r));
    const chrome = await launch();
    let before = 0, after = 0, failed = 0;
    try {
        const page = await chrome.page();
        await page.goto(BASE + 'offline.html');
        for (let i = 0; i < jobs.length; i += 20) {
            const batch = jobs.slice(i, i + 20);
            const results = await page.evaluate(resizeInPage(batch.map(([src, , w, h, mode]) => [encodeURI(src), w, h, mode])));
            results.forEach((r, k) => {
                const [src, out] = batch[k];
                if (!r.ok) { failed++; return console.error(`  could not convert ${src}: ${r.error}`); }
                fs.writeFileSync(path.join(ROOT, out), Buffer.from(r.data, 'base64'));
                before += fs.statSync(path.join(ROOT, src)).size;
                after += fs.statSync(path.join(ROOT, out)).size;
            });
            process.stdout.write(`\r${Math.min(i + 20, jobs.length)} / ${jobs.length}`);
        }
        await page.close();
    } finally {
        await chrome.close();
        server.close();
    }
    console.log(`\n${jobs.length - failed} images: ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB` + (failed ? `, ${failed} failed` : ''));
    if (failed) process.exitCode = 1;
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
