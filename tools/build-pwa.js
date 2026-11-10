// Builds the app icons and the store screenshots listed in manifest.json, by driving headless
// Chrome (or Edge) over the DevTools protocol against tools/serve.js. Needs Node 22+ (built-in WebSocket).
// Run from anywhere:  node tools/build-pwa.js [icons|screens]
// Set CHROME=path/to/chrome if it isn't in the usual place.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const server = require('./serve')(ROOT);
const PORT = 8181;
const BASE = `http://localhost:${PORT}/`;
const CHROME = process.env.CHROME || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium'
].find(p => fs.existsSync(p));

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

const sleep = ms => new Promise(r => setTimeout(r, ms));

function launch(profile) {
    const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank']);
    return new Promise((resolve, reject) => {
        let err = '';
        chrome.stderr.on('data', d => {
            err += d;
            const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
            if (m) resolve({ chrome, ws: m[1] });
        });
        chrome.on('exit', code => reject(new Error(`Chrome exited (${code}): ${err}`)));
    });
}

function connect(url) {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map(), listeners = [];
    ws.onmessage = ev => {
        const msg = JSON.parse(ev.data);
        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
        } else listeners.forEach(fn => fn(msg));
    };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
        pending.set(++id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const once = (method, sessionId) => new Promise(resolve => {
        const fn = msg => { if (msg.method === method && msg.sessionId === sessionId) { listeners.splice(listeners.indexOf(fn), 1); resolve(msg.params); } };
        listeners.push(fn);
    });
    return new Promise((resolve, reject) => {
        ws.onopen = () => resolve({ send, once, close: () => ws.close() });
        ws.onerror = reject;
    });
}

async function shoot(cdp, { url, file, w, h, transparent, scrollTo, wait = 4000 }) {
    // Each shot in its own browser context: no saved language or service worker carries over
    const { browserContextId } = await cdp.send('Target.createBrowserContext');
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    try {
        await s('Page.enable');
        // mobile: a phone's layout viewport (honours <meta viewport>), not a cropped desktop window
        await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
        if (w < 768) await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        if (transparent) await s('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
        const loaded = cdp.once('Page.loadEventFired', sessionId);
        await s('Page.navigate', { url });
        await Promise.race([loaded, sleep(20000)]);
        await sleep(wait); // data, charts and fonts settle
        if (scrollTo) {
            await s('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(scrollTo)}).scrollIntoView({ block: 'start' })` });
            await sleep(1500);
        }
        const jpeg = file.endsWith('.jpg');
        const { data } = await s('Page.captureScreenshot', { format: jpeg ? 'jpeg' : 'png', quality: jpeg ? 82 : undefined });
        const out = path.join(ROOT, file);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(data, 'base64'));
        console.log(`${file}  ${w}x${h}  ${Math.round(fs.statSync(out).size / 1024)} KB`);
    } finally {
        await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
        await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
    }
}

async function main() {
    if (!CHROME) throw new Error('Chrome or Edge not found; set CHROME=path/to/chrome');
    const what = process.argv[2];
    await new Promise(r => server.listen(PORT, r));
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-shot-'));
    const { chrome, ws } = await launch(profile);
    try {
        const cdp = await connect(ws);
        if (what !== 'screens') for (const [file, size, q] of ICONS) {
            await shoot(cdp, { url: `${BASE}tools/icon.html?s=${size}&${q}`, file, w: size, h: size, transparent: !q.includes('bg=1'), wait: 300 });
        }
        if (what !== 'icons') for (const [file, w, h, page, scrollTo] of SCREENS) {
            await shoot(cdp, { url: BASE + page, file, w, h, scrollTo });
        }
        cdp.close();
    } finally {
        chrome.kill();
        server.close();
        await sleep(500);
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    }
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
