// ============================================
// DATA MANAGERS - Import all our managers
// ============================================
// Base path for JSON files
const DATA_PATH = 'data/';
// Language state: ?lang=ar|en in the URL wins (shareable links), then the saved choice
const SUPPORTED_LANGS = ['en', 'ar'];
let currentLang = (function () {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (SUPPORTED_LANGS.includes(fromUrl)) {
        localStorage.setItem('language', fromUrl);
        return fromUrl;
    }
    const saved = localStorage.getItem('language');
    return SUPPORTED_LANGS.includes(saved) ? saved : 'en';
})();
// Locale for numbers/dates; Arabic keeps Latin digits to match the rest of the site
function getLocale() {
    return currentLang === 'ar' ? 'ar-u-nu-latn' : 'en-US';
}
// Numbers in the page's locale; a figure we don't have (null/undefined) shows as a dash
function formatNumber(value) {
    return typeof value === 'number' ? value.toLocaleString(getLocale()) : '—';
}
// Fill a map tooltip with a region's name and death count. Built as text nodes because
// names come from the data files.
function fillRegionTooltip(panel, regionName, deaths) {
    const name = document.createElement('strong');
    name.textContent = regionName;
    const count = document.createElement('span');
    count.className = 'info_panel-deaths';
    count.textContent = formatNumber(Number(deaths));
    panel.append(name, document.createElement('br'), i18n.t('Deaths') + ': ', count);
    return panel;
}
// Select2 option with a flag image, built as elements rather than an HTML string
function flagOption(imageSrc, text) {
    return jQuery('<span>')
        .append(jQuery('<img class="img-flag">').attr('src', imageSrc))
        .append(document.createTextNode(text));
}
// Map fill for a region's death count; keep in step with the legend in live.html (<10, 10-99, 100+)
function getColorForDeaths(deaths) {
    if (deaths < 10) {
        return '#1C202B';
    } else if (deaths < 100) {
        return '#163957';
    }
    return '#0B68AA';
}
// ============================================
// TRANSLATION MANAGER
// ============================================
class TranslationManager {
    constructor() {
        this.translations = {};
        this.currentLang = currentLang;
    }
    async loadTranslations() {
        try {
            const response = await fetch(DATA_PATH + 'translations.json');
            this.translations = await response.json();
            this.applyTranslations();
            this.updateDirection();
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }
    translate(key) {
        return this.translations[this.currentLang]?.[key] || key;
    }
    t(key) {
        return this.translate(key);
    }
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            currentLang = lang;
            localStorage.setItem('language', lang);
            this.applyTranslations();
            this.updateDirection();
        }
    }
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.translate(key);
        });
        document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
            element.setAttribute('aria-label', this.translate(element.getAttribute('data-i18n-aria-label')));
        });
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            element.title = this.translate(element.getAttribute('data-i18n-title'));
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.translate(key);
        });
    }
    updateDirection() {
        const html = document.documentElement;
        const isArabic = this.currentLang === 'ar';
        html.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
        html.setAttribute('lang', isArabic ? 'ar' : 'en');
        // The language link always offers the other language
        document.querySelectorAll('.language-link').forEach(link => {
            link.setAttribute('data-lang', isArabic ? 'en' : 'ar');
            link.textContent = isArabic ? 'EN' : 'AR';
        });
    }
    getCurrentLanguage() {
        return this.currentLang;
    }
}
// ============================================
// LIVE TRACKER MANAGER
// ============================================
class LiveTrackerManager {
    constructor() {
        this.data = null;
    }
    async loadData() {
        try {
            const response = await fetch(DATA_PATH + 'livetracker.json');
            this.data = await response.json();
            return this.data;
        } catch (error) {
            console.error('Error loading live tracker data:', error);
        }
    }
    getLastUpdateTime() {
        if (!this.data) return '';
        const lastUpdate = new Date(this.data.last_update);
        const now = new Date();
        const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));

        return diffMinutes;
    }
    insertData(selectorID) {
        if (!this.data) return;
        // A figure we don't have (null) shows as a dash; an unknown increase hides its "(+…)" wrapper
        const dataToDOM = (selector, value) => {
            selectorID.querySelectorAll(selector).forEach(elem => {
                const known = typeof value === 'number';
                elem.textContent = formatNumber(value);
                if (elem.classList.contains('increase')) {
                    const wrap = elem.closest('.new-no, .new-no-new');
                    if (wrap) wrap.hidden = !known;
                }
            });
        };

        // Insert data
        dataToDOM('.total-deaths', this.data.total_deaths);
        dataToDOM('.increase-total-deaths', this.data.increase_total_deaths);
        dataToDOM('.women-deaths', this.data.women_deaths);
        dataToDOM('.increase-women-deaths', this.data.increase_women_deaths);
        dataToDOM('.children-deaths', this.data.children_deaths);
        dataToDOM('.increase-children-deaths', this.data.increase_children_deaths);
        dataToDOM('.elders-deaths', this.data.elders_deaths);
        dataToDOM('.increase-elders-deaths', this.data.increase_elders_deaths);
        dataToDOM('.total-injuries', this.data.total_injuries);
        dataToDOM('.increase-total-injuries', this.data.increase_total_injuries);
        dataToDOM('.total-displaced', this.data.total_displaced);
        dataToDOM('.increase-total-displaced', this.data.increase_total_displaced);
        dataToDOM('.destroyed-units', this.data.total_destroyed_residential_units);
        dataToDOM('.increase-destroyed-units', this.data.increase_total_destroyed_residential_units);
        dataToDOM('.medical-deaths', this.data.total_medical_deaths);
        dataToDOM('.medical-injured', this.data.total_medical_injured);
        dataToDOM('.hospitals-broken', this.data.total_hospitals_broken);
        dataToDOM('.clinics-broken', this.data.total_clinics_broken);
        dataToDOM('.total_hospitals', this.data.total_hospitals);
        dataToDOM('.total_clinics', this.data.total_clinics);
        dataToDOM('.ambulances-broken', this.data.total_ambulances_broken);
        dataToDOM('.ambulances-semi-broken', this.data.total_ambulances_semi_broken);

        // Update last update time
        /* const lastUpdateElements = selectorID.querySelectorAll('.last-update');
        lastUpdateElements.forEach(elem => {
            elem.textContent = this.getLastUpdateTime();
        }); */
    }
}
// ============================================
// REGIONS MANAGER
// ============================================
class RegionsManager {
    constructor() {
        this.regions = [];
    }
    async loadRegions() {
        try {
            const response = await fetch(DATA_PATH + 'regions.json');
            this.regions = await response.json();
            return this.regions;
        } catch (error) {
            console.error('Error loading regions:', error);
        }
    }
    getRegion(id) {
        return this.regions.find(region => region.id === id);
    }
    getRegionByName(name) {
        return this.regions.find(region =>
            region.name.toLowerCase() === name.toLowerCase()
        );
    }
    // SVG path id suffix for a region, e.g. 5 (Ramallah) -> 'RBH' for <path id="PS-RBH">
    getSvgCode(id) {
        const region = this.getRegion(id);
        return region ? region.code.replace(/^PS-/, '') : null;
    }
}
// ============================================
// ATTACKS MANAGER
// ============================================
class AttacksManager {
    constructor() {
        this.attacks = [];
    }
    async loadAttacks() {
        try {
            const response = await fetch(DATA_PATH + 'attacks.json');
            this.attacks = await response.json();
            return this.attacks;
        } catch (error) {
            console.error('Error loading attacks:', error);
        }
    }
    getAttackByRegion(regionId) {
        return this.attacks.find(attack => attack.region_id === regionId);
    }
    getAttackByRegionName(regionName) {
        return this.attacks.find(attack =>
            attack.region_name.toLowerCase() === regionName.toLowerCase()
        );
    }
    // Rows to sum for totals. "West Bank" and "Gaza" are aggregates of their governorates
    // (flagged is_aggregate in attacks.json), so summing every row would count deaths twice.
    getTotalsRows() {
        const aggregates = this.attacks.filter(attack => attack.is_aggregate);
        return aggregates.length > 0 ? aggregates : this.attacks;
    }
    sumField(field) {
        return this.getTotalsRows().reduce((sum, attack) => sum + attack[field], 0);
    }
    getTotalDeaths() {
        return this.sumField('total_deaths');
    }
    getTotalChildrenDeaths() {
        return this.sumField('children_deaths');
    }
    getTotalWomenDeaths() {
        return this.sumField('women_deaths');
    }
    getTotalInjuries() {
        return this.sumField('total_injuries');
    }
    getTotalDisplaced() {
        return this.sumField('total_displaced');
    }
    // One row per map shape. Governorates with no figures of their own (part_of in regions.json, e.g. the
    // Gaza Strip's) take their parent's row, so the map shows the whole-Gaza figure under the name "Gaza"
    // rather than a made-up per-governorate number.
    getMapRows() {
        const own = new Set(this.attacks.map(attack => attack.region_id));
        const rows = this.attacks.map(attack => ({ attack, svgCode: regionsManager.getSvgCode(attack.region_id), inherited: false }));
        regionsManager.regions.forEach(region => {
            const parent = region.part_of && !own.has(region.id) && this.getAttackByRegion(region.part_of);
            if (parent) rows.push({ attack: parent, svgCode: region.code.replace(/^PS-/, ''), inherited: true });
        });
        return rows;
    }
    getRegionsByDeaths() {
        return [...this.attacks].sort((a, b) => b.total_deaths - a.total_deaths);
    }
}
// ============================================
// PIE CHART FOR TODAY'S VIEW
// ============================================
const worldwideWithPieChart = async (liveData) => {
    const totalDeaths = liveData.total_deaths;
    const elderRate = typeof liveData.elders_deaths === 'number' ? (liveData.elders_deaths * 100) / totalDeaths : null;
    const childrenRate = (liveData.children_deaths * 100) / totalDeaths;
    const womenRate = (liveData.women_deaths * 100) / totalDeaths;
    const percents = [
        {
            title: i18n.t("Women") + " " + Math.floor(womenRate) + '%',
            value: womenRate
        },
        {
            title: i18n.t("Children") + " " + Math.floor(childrenRate) + '%',
            value: childrenRate
        },
        elderRate === null ? null : {
            title: i18n.t("Elders") + " " + Math.floor(elderRate) + '%',
            value: elderRate
        }
    ];
    const charts = document.querySelectorAll('.chart');
    charts.forEach((elem, indx) => {
        if (percents[indx]) {
            elem.title = percents[indx].title;
            elem.dataset.percent = percents[indx].value;
            if (typeof jQuery !== 'undefined' && jQuery.fn.easyPieChart) {
                jQuery(elem).easyPieChart({
                    scaleColor: false,
                    lineWidth: 25
                });
            }
        }
    });
};

// ============================================
// LINE CHART FOR TOTAL GRAPH VIEW
// ============================================
const chartReport = async (selectorId) => {
    // data/history.json: the total death toll at each update since 7 October 2023
    let history = [];
    try {
        history = await (await fetch(DATA_PATH + 'history.json')).json();
    } catch (error) {
        console.error('Error loading history:', error);
        return;
    }
    const start = Date.UTC(2023, 9, 7);
    const reports = history.map(point => point.total_deaths);
    const dates = history.map(point => point.date);
    const labels = dates.map(date => i18n.t('Day') + ' ' + (Math.round((Date.parse(date) - start) / 864e5) + 1));
    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '',
                backgroundColor: '#AEBEFF',
                borderColor: '#AEBEFF',
                borderWidth: '5',
                data: reports,
                fill: false,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#fff',
                pointBorderWidth: 5
            }]
        },
        options: {
            height: 450,
            responsive: true,
            legend: {
                display: false
            },
            title: {
                display: false
            },
            tooltips: {
                displayColors: false,
                backgroundColor: '#fff',
                titleFontColor: '#354150',
                bodyFontColor: '#354150',
                bodyFontSize: 14,
                xPadding: 10,
                yPadding: 10,
                callbacks: {
                    title: function (tooltipItems) {
                        const index = Number(tooltipItems[0].index);
                        const date = new Date(dates[index] + 'T00:00:00Z').toLocaleDateString(getLocale(), {
                            year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
                        });
                        return labels[index] + ", " + date;
                    },
                    label: function (tooltipItem) {
                        return i18n.t("Deaths") + ": " + Number(tooltipItem.yLabel).toLocaleString(getLocale()) + "+";
                    }
                }
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            layout: {
                padding: {
                    left: 15,
                    right: 15,
                    top: 30,
                    bottom: 15
                }
            },
            scales: {
                xAxes: [{
                    gridLines: {
                        color: "rgba(0, 0, 0, 0)",
                    }
                }]
            }
        }
    };
    const canvas = selectorId.querySelector('canvas');
    if (canvas && typeof Chart !== 'undefined') {
        const ctx = canvas.getContext('2d');
        canvas.height = 450;
        window.myLine = new Chart(ctx, config);
    }
};
// ============================================
// INITIALIZE ALL MANAGERS
// ============================================
const i18n = new TranslationManager();
const liveTracker = new LiveTrackerManager();
const regionsManager = new RegionsManager();
const attacksManager = new AttacksManager();
// ============================================
// MAIN INITIALIZATION
// ============================================
// Apply direction and stylesheet right away so Arabic pages don't flash in LTR while data loads
i18n.updateDirection();
// Language switcher. Charts, tables and brand names are rendered from data in the current
// language, so switching saves the choice and reloads without any ?lang= that would override it.
document.addEventListener('click', event => {
    const link = event.target.closest('.language-link');
    if (!link) return;
    event.preventDefault();
    localStorage.setItem('language', link.getAttribute('data-lang'));
    const url = new URL(window.location.href);
    url.searchParams.delete('lang');
    url.hash = '';
    window.location.href = url.toString();
});
// Header "Updated …" line on every page: how long ago the figures were updated, in the page
// language ("5 minutes ago", or the date and "994 days ago" once it's over a day)
function updateLastUpdateLines() {
    if (!liveTracker.data) return;
    const minutes = liveTracker.getLastUpdateTime();
    const locale = getLocale();
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
    let text;
    if (minutes >= 1440) {
        const date = new Date(liveTracker.data.last_update);
        text = date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) + ' (' +
            relative.format(-Math.floor(minutes / 1440), 'day') + ')';
    } else if (minutes >= 60) {
        text = relative.format(-Math.floor(minutes / 60), 'hour');
    } else {
        text = relative.format(-Math.max(minutes, 0), 'minute');
    }
    document.querySelectorAll('.last-update').forEach(elem => {
        elem.textContent = text;
        // the relative time above already says "ago"
        const p = elem.closest('p');
        const ago = p && p.querySelector('[data-i18n="minutes ago"]');
        if (ago) ago.hidden = true;
    });
}
// Footer year
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.current-year').forEach(elem => { elem.textContent = new Date().getFullYear(); });
});
// Resolves once all shared data has loaded. Page scripts (live.js, map.js, active.js) await this
// instead of polling. Each loader catches its own errors, so this resolves even if a file fails.
const appReady = Promise.all([
    i18n.loadTranslations(),
    liveTracker.loadData(),
    regionsManager.loadRegions(),
    attacksManager.loadAttacks()
]);
document.addEventListener('DOMContentLoaded', async () => {
    i18n.updateDirection();
    try {
        await appReady;
        // Translate anything parsed after the translations arrived
        i18n.applyTranslations();
        updateLastUpdateLines();
        setInterval(updateLastUpdateLines, 60000);
        if (!liveTracker.data) return;

        // Insert live tracker data, unless the page shows its own numbers in the same
        // elements (map.html shows per-region details there)
        if (document.body.dataset.trackerStats !== 'off') {
            const mainContainer = document.querySelector('.main-container') || document.body;
            liveTracker.insertData(mainContainer);
        }

        // Render pie charts if element exists
        if (document.querySelector('.chart')) {
            await worldwideWithPieChart(liveTracker.data);
        }

        // Render line chart if element exists
        const chartContainer = document.querySelector('#chart-report');
        if (chartContainer) {
            await chartReport(chartContainer);
        }

    } catch (error) {
        console.error('Error initializing Palestine Crisis tracker:', error);
    }
});
// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        i18n,
        liveTracker,
        regionsManager,
        attacksManager
    };
}
