// A small headless-Chrome driver over the DevTools protocol, shared by the build tools.
// Needs Node 22+ (built-in WebSocket). Set CHROME=path/to/chrome if it isn't in the usual place.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROME || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium'
].find(p => fs.existsSync(p));

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

// Start Chrome; returns { cdp, page(), close() }. page() opens a tab in its own browser context
// (no storage or service worker shared between tabs) and returns helpers bound to it.
async function launch() {
    if (!CHROME) throw new Error('Chrome or Edge not found; set CHROME=path/to/chrome');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-chrome-'));
    const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank']);
    const wsUrl = await new Promise((resolve, reject) => {
        let err = '';
        chrome.stderr.on('data', d => {
            err += d;
            const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
            if (m) resolve(m[1]);
        });
        chrome.on('exit', code => reject(new Error(`Chrome exited (${code}): ${err}`)));
    });
    const cdp = await connect(wsUrl);

    async function page() {
        const { browserContextId } = await cdp.send('Target.createBrowserContext');
        const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
        const send = (m, p) => cdp.send(m, p, sessionId);
        await send('Page.enable');
        return {
            send,
            async goto(url, wait = 0) {
                const loaded = cdp.once('Page.loadEventFired', sessionId);
                await send('Page.navigate', { url });
                await Promise.race([loaded, sleep(20000)]);
                if (wait) await sleep(wait);
            },
            // Run an expression in the page (awaits promises) and return its JSON value
            async evaluate(expression) {
                const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
                if (exceptionDetails) throw new Error((exceptionDetails.exception || {}).description || exceptionDetails.text);
                return result.value;
            },
            async close() {
                await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
                await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
            }
        };
    }

    async function close() {
        cdp.close();
        chrome.kill();
        await sleep(500);
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    }
    return { cdp, page, close };
}

module.exports = { launch, sleep };
