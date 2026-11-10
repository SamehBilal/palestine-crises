// Builds the app icons and the store screenshots listed in manifest.json (wide-live.jpg is also the
// share image in every page's og:image), by driving headless Chrome against tools/serve.js.
// Run from anywhere:  node tools/build-pwa.js [icons|screens]
const fs = require('fs');
const path = require('path');
const { launch, sleep } = require('./cdp');

const ROOT = path.resolve(__dirname, '..');
const server = require('./serve')(ROOT);
const PORT = 8181;
const BASE = `http://localhost:${PORT}/`;

const ICONS = [
    // [file, size, tools/icon.html query]
    ['images/icons/icon-192.png', 192, ''],
    ['images/icons/icon-512.png', 512, ''],
    ['images/icons/maskable-192.png', 192, 'bg=1&pad=0.66'],
    ['images/icons/maskable-512.png', 512, 'bg=1&pad=0.66'],
    ['images/icons/apple-touch-icon.png', 180, 'bg=1&pad=0.8']
];

// [file, width, height, page, element to scroll to the top]. Keep in step with "screenshots" in manifest.json
const SCREENS = [
    ['images/screens/wide-live.jpg', 1280, 720, 'live.html?lang=en'],
    ['images/screens/wide-map.jpg', 1280, 720, 'map.html?lang=en'],
    ['images/screens/wide-support.jpg', 1280, 720, 'brands.html?lang=en', '#letter-filters'],
    ['images/screens/narrow-live.jpg', 412, 915, 'live.html?lang=en'],
    ['images/screens/narrow-live-ar.jpg', 412, 915, 'live.html?lang=ar'],
    ['images/screens/narrow-map.jpg', 412, 915, 'map.html?lang=en']
];

async function shoot(chrome, { url, file, w, h, transparent, scrollTo, wait = 4000 }) {
    const page = await chrome.page();
    try {
        // mobile: a phone's layout viewport (honours <meta viewport>), not a cropped desktop window
        await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
        if (w < 768) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        if (transparent) await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
        await page.goto(url, wait); // data, charts and fonts settle
        if (scrollTo) {
            await page.evaluate(`document.querySelector(${JSON.stringify(scrollTo)}).scrollIntoView({ block: 'start' })`);
            await sleep(1500);
        }
        const jpeg = file.endsWith('.jpg');
        const { data } = await page.send('Page.captureScreenshot', { format: jpeg ? 'jpeg' : 'png', quality: jpeg ? 82 : undefined });
        const out = path.join(ROOT, file);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(data, 'base64'));
        console.log(`${file}  ${w}x${h}  ${Math.round(fs.statSync(out).size / 1024)} KB`);
    } finally {
        await page.close();
    }
}

async function main() {
    const what = process.argv[2];
    await new Promise(r => server.listen(PORT, r));
    const chrome = await launch();
    try {
        if (what !== 'screens') for (const [file, size, q] of ICONS) {
            await shoot(chrome, { url: `${BASE}tools/icon.html?s=${size}&${q}`, file, w: size, h: size, transparent: !q.includes('bg=1'), wait: 300 });
        }
        if (what !== 'icons') for (const [file, w, h, page, scrollTo] of SCREENS) {
            await shoot(chrome, { url: BASE + page, file, w, h, scrollTo });
        }
    } finally {
        await chrome.close();
        server.close();
    }
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
