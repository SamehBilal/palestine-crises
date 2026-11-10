/* The site as an app: registers sw.js, adds an "Install app" link to the header menu (or the
   Add to Home Screen steps on iPhone/iPad), says when a new version is ready, and when the
   connection drops or comes back. Loaded on every page; works with or without app.js.
   Text follows the page language (<html lang>), which app.js sets from the saved choice. */
(function () {
    'use strict';
    var html = document.documentElement;
    var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var deferred = null;
    if (standalone) html.classList.add('is-app');
    function L(ar, en) { return html.lang === 'ar' ? ar : en; }

    /* ---------- toasts ---------- */
    var css = document.createElement('style');
    css.textContent =
        /* always bottom-left, in both languages: the Buy Me a Coffee bubble owns the bottom-right corner */
        '.pwa-toasts{position:fixed;left:16px;bottom:16px;z-index:100000;display:flex;flex-direction:column;gap:10px;max-width:calc(100vw - 112px);width:360px}' +
        '.pwa-toast{background:#1d1c26;color:#fff;border:1px solid #3b3a48;border-inline-start:4px solid #2a9446;border-radius:10px;padding:12px 40px 12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.35);font:14px/1.5 Roboto,Arial,sans-serif;position:relative;animation:pwa-in .2s ease-out}' +
        '[dir=rtl] .pwa-toast{padding:12px 14px 12px 40px}' +
        '.pwa-toast.warning{border-inline-start-color:#ee2a35}' +
        '.pwa-toast b{display:block;margin-bottom:2px}' +
        '.pwa-toast .pwa-x{position:absolute;top:6px;inset-inline-end:8px;background:none;border:0;color:#aaa;font-size:20px;line-height:1;cursor:pointer;padding:4px}' +
        '.pwa-toast .pwa-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}' +
        '.pwa-toast .pwa-act{background:#2a9446;color:#fff;border:0;border-radius:6px;padding:6px 12px;font:inherit;font-weight:500;cursor:pointer}' +
        '.pwa-toast .pwa-act.ghost{background:transparent;border:1px solid #555}' +
        '.pwa-toast :focus-visible{outline:2px solid #fff;outline-offset:2px}' +
        '@keyframes pwa-in{from{opacity:0;transform:translateY(8px)}}' +
        '@media (prefers-reduced-motion:reduce){.pwa-toast{animation:none}}' +
        '.install-app svg{vertical-align:-3px;margin-inline-end:4px}' +
        /* phones: the menu is already full, so just the icon */
        '@media (max-width:767px){.install-app .pwa-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.install-app svg{margin:0;width:18px;height:18px}}' +
        /* installed on a phone: keep clear of the status bar and home indicator */
        '.is-app body{padding-bottom:env(safe-area-inset-bottom)}';
    document.head.appendChild(css);
    var box = null;
    function toast(body, opts) {
        opts = opts || {};
        if (!box) {
            box = document.createElement('div');
            box.className = 'pwa-toasts';
            box.setAttribute('role', 'status');
            box.setAttribute('aria-live', 'polite');
            document.body.appendChild(box);
        }
        var el = document.createElement('div');
        el.className = 'pwa-toast' + (opts.type ? ' ' + opts.type : '');
        if (opts.title) { var t = document.createElement('b'); t.textContent = opts.title; el.appendChild(t); }
        var p = document.createElement('div');
        p.innerHTML = body; /* only ever our own strings */
        el.appendChild(p);
        if (opts.actions) {
            var row = document.createElement('div');
            row.className = 'pwa-actions';
            opts.actions.forEach(function (a) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'pwa-act' + (a.ghost ? ' ghost' : '');
                b.textContent = a.label;
                b.addEventListener('click', function () { dismiss(); a.run(); });
                row.appendChild(b);
            });
            el.appendChild(row);
        }
        var x = document.createElement('button');
        x.type = 'button';
        x.className = 'pwa-x';
        x.setAttribute('aria-label', L('إغلاق', 'Close'));
        x.textContent = '×';
        x.addEventListener('click', function () { dismiss(); if (opts.onClose) opts.onClose(); });
        el.appendChild(x);
        box.appendChild(el);
        var timer = opts.ttl === 0 ? 0 : setTimeout(dismiss, opts.ttl || 5000);
        function dismiss() { clearTimeout(timer); if (el.parentNode) el.parentNode.removeChild(el); }
        return { dismiss: dismiss, el: el };
    }

    /* ---------- install ---------- */
    var ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    /* headless browsers (tools/build-pwa.js taking the store screenshots) can't install anything */
    var headless = /HeadlessChrome/.test(navigator.userAgent);
    function canOffer() { return !standalone && !headless && (deferred || ios); }
    function placeButton() {
        var nav = document.querySelector('.menubar .nav');
        if (!nav) return;
        var li = nav.querySelector('.install-app-item');
        if (!canOffer()) { if (li) li.remove(); return; }
        var label = L('ثبّت التطبيق', 'Install app');
        if (!li) {
            li = document.createElement('li');
            li.className = 'install-app-item';
            li.innerHTML = '<a href="#" class="install-app"></a>';
            li.firstChild.addEventListener('click', function (ev) { ev.preventDefault(); install(); });
            /* before the language link, so AR/EN stays last */
            var lang = nav.querySelector('.language-link');
            nav.insertBefore(li, lang ? lang.closest('li') : null);
        }
        var a = li.firstChild;
        a.innerHTML = ICON + '<span class="pwa-label">' + label + '</span>';
        a.title = L('ثبّت الموقع كتطبيق على جهازك', 'Install this site as an app on your device');
    }
    function install() {
        if (deferred) {
            deferred.prompt();
            deferred.userChoice.then(function () { deferred = null; placeButton(); });
            return;
        }
        if (ios) {
            toast(L('في سفاري: اضغط زر المشاركة <b style="display:inline">⎋</b> ثم «إضافة إلى الشاشة الرئيسية».',
                'In Safari, tap Share <b style="display:inline">⎋</b>, then “Add to Home Screen”.'),
                { title: L('ثبّت التطبيق', 'Install the app'), ttl: 10000 });
        }
    }
    window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); deferred = ev; placeButton(); });
    window.addEventListener('appinstalled', function () {
        deferred = null; standalone = true; placeButton();
        toast(L('أُضيف التطبيق إلى جهازك.', 'The app has been added to your device.'));
    });
    /* app.js rewrites the language link when the language is applied; relabel with it */
    new MutationObserver(placeButton).observe(html, { attributes: true, attributeFilter: ['lang'] });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', placeButton); else placeButton();

    /* ---------- after a while: offer the app once ----------
       Time spent on the site (counted across pages and visits while a page is in view) adds up; after
       two minutes a card offers to install it, where the browser can. «Later» puts it off for two weeks. */
    var INVITE_AFTER = 2 * 60 * 1000, INVITE_PAUSE = 14 * 864e5;
    function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, String(v)); } catch (e) { return null; } }
    var invited = false;
    function invite() {
        if (invited || !canOffer() || document.visibilityState !== 'visible') return;
        if (Date.now() - (+store('pwa-invite-off') || 0) < INVITE_PAUSE) return;
        invited = true;
        var later = function () { store('pwa-invite-off', Date.now()); };
        toast(L('ثبّته على جهازك ليفتح كتطبيق بضغطة واحدة، وتبقى الصفحات التي زرتها متاحة دون إنترنت.',
            'Install it to open like an app in one tap; pages you have visited keep working offline.'),
            {
                title: L('تابع فلسطين من شاشتك الرئيسية', 'Follow Palestine from your home screen'), ttl: 0, onClose: later,
                actions: [{ label: L('ثبّت التطبيق', 'Install the app'), run: function () { later(); install(); } },
                    { label: L('لاحقًا', 'Later'), ghost: true, run: later }]
            });
    }
    if (!standalone) {
        var tick = 15000;
        setInterval(function () {
            if (document.visibilityState !== 'visible' || invited) return;
            var t = (+store('pwa-browse-ms') || 0) + tick;
            store('pwa-browse-ms', t);
            if (t >= INVITE_AFTER) invite();
        }, tick);
    }

    /* ---------- connection ---------- */
    window.addEventListener('offline', function () {
        toast(L('انقطع الاتصال. الصفحات التي فتحتها من قبل ما زالت تعمل.', 'You’re offline. Pages you’ve opened before still work.'), { type: 'warning', ttl: 6000 });
    });
    window.addEventListener('online', function () {
        toast(L('عاد الاتصال.', 'Back online.'), { ttl: 2500 });
    });

    /* ---------- service worker and updates ---------- */
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (reloading) location.reload(); });
    function offerUpdate(worker) {
        toast(L('نسخة أحدث من الموقع جاهزة.', 'A newer version of the site is ready.'), {
            title: L('تحديث', 'Update'), ttl: 0,
            actions: [{ label: L('حدّث الآن', 'Update now'), run: function () { reloading = true; worker.postMessage({ action: 'skipWaiting' }); } }]
        });
    }
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
            if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
            reg.addEventListener('updatefound', function () {
                var w = reg.installing;
                if (!w) return;
                w.addEventListener('statechange', function () {
                    /* only an update, not the first install */
                    if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
                });
            });
            /* look for a new version when the app comes back to the front */
            document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') reg.update().catch(function () {}); });
        }).catch(function () {});
    });
})();
