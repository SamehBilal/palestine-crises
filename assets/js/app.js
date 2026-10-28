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
        // style_rtl.css is a full mirrored copy of style.css, so swap one for the other
        const stylesheet = document.querySelector('link[href$="assets/css/style.css"], link[href$="assets/css/style_rtl.css"]');
        if (stylesheet) {
            stylesheet.setAttribute('href', 'assets/css/' + (isArabic ? 'style_rtl.css' : 'style.css'));
        }
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
        const dataToDOM = (selector, value) => {
            const elements = selectorID.querySelectorAll(selector);
            elements.forEach(elem => {
                elem.textContent = value.toLocaleString();
            });
        };

        // Calculate rates
        const deathRate = ((this.data.total_deaths * 100) / this.data.total_deaths).toFixed(2);
        const childrenRate = ((this.data.children_deaths * 100) / this.data.total_deaths).toFixed(2);
        const womenRate = ((this.data.women_deaths * 100) / this.data.total_deaths).toFixed(2);

        // Insert data
        dataToDOM('.total-deaths', this.data.total_deaths);
        dataToDOM('.previous_total_deaths', this.data.previous_total_deaths);
        dataToDOM('.women-deaths', this.data.women_deaths);
        dataToDOM('.previous_women_deaths', this.data.previous_women_deaths);
        dataToDOM('.children-deaths', this.data.children_deaths);
        dataToDOM('.previous_children_deaths', this.data.previous_children_deaths);
        dataToDOM('.elders-deaths', this.data.elders_deaths);
        dataToDOM('.previous_elders_deaths', this.data.previous_elders_deaths);
        dataToDOM('.total-injuries', this.data.total_injuries);
        dataToDOM('.previous_total_injuries', this.data.previous_total_injuries);
        dataToDOM('.total-displaced', this.data.total_displaced);
        dataToDOM('.previous_total_displaced', this.data.previous_total_displaced);
        dataToDOM('.destroyed-units', this.data.total_destroyed_residential_units);
        dataToDOM('.previous_destroyed_units', this.data.previous_total_destroyed_residential_units);
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
    getRegionsByDeaths() {
        return [...this.attacks].sort((a, b) => b.total_deaths - a.total_deaths);
    }
    renderAttacksTable(containerId, lang = 'en') {
        const container = document.getElementById(containerId);
        if (!container) return;
        const translations = {
            en: {
                region: 'Region',
                deaths: 'Deaths',
                children: 'Children',
                women: 'Women',
                injured: 'Injured',
                displaced: 'Displaced'
            },
            ar: {
                region: 'المنطقة',
                deaths: 'الوفيات',
                children: 'أطفال',
                women: 'نساء',
                injured: 'مصابين',
                displaced: 'نازحين'
            }
        };

        const t = translations[lang];

        let html = `
  <table class="attacks-table">
    <thead>
      <tr>
        <th>${t.region}</th>
        <th>${t.deaths}</th>
        <th>${t.children}</th>
        <th>${t.women}</th>
        <th>${t.injured}</th>
        <th>${t.displaced}</th>
      </tr>
    </thead>
    <tbody>
`;

        this.attacks.forEach(attack => {
            html += `
    <tr class="country-search" data-region="${attack.region_name}">
      <td>${attack.region_name}</td>
      <td class="number">${attack.total_deaths.toLocaleString()}</td>
      <td class="number">${attack.children_deaths.toLocaleString()}</td>
      <td class="number">${attack.women_deaths.toLocaleString()}</td>
      <td class="number">${attack.total_injuries.toLocaleString()}</td>
      <td class="number">${attack.total_displaced.toLocaleString()}</td>
    </tr>
  `;
        });

        html += `
    </tbody>
    <tfoot>
      <tr class="totals">
        <td><strong>Total</strong></td>
        <td class="number"><strong>${this.getTotalDeaths().toLocaleString()}</strong></td>
        <td class="number"><strong>${this.getTotalChildrenDeaths().toLocaleString()}</strong></td>
        <td class="number"><strong>${this.getTotalWomenDeaths().toLocaleString()}</strong></td>
        <td class="number"><strong>${this.getTotalInjuries().toLocaleString()}</strong></td>
        <td class="number"><strong>${this.getTotalDisplaced().toLocaleString()}</strong></td>
      </tr>
    </tfoot>
  </table>
`;

        container.innerHTML = html;
    }
}
// ============================================
// PIE CHART FOR TODAY'S VIEW
// ============================================
const worldwideWithPieChart = async (liveData) => {
    const totalDeaths = liveData.total_deaths;
    const elderRate = (liveData.elders_deaths * 100) / totalDeaths;
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
        {
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
    const reports = [
        238, 428, 577, 923, 1128, 1571, 1951, 2270, 2385, 2809,
        3061, 3543, 4221, 4741, 5182, 6504, 6954, 7415, 7761, 8069,
        8382, 8610, 8850, 9159, 9299, 9883, 10678, 11208, 11667, 12918,
        15455, 16060, 18175, 19754, 19968, 29496
    ];
    const dayNumbers = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 23, 25, 26, 27,
        28, 30, 33, 35, 41, 45, 57, 60, 66, 73, 74, 136
    ];
    const labels = dayNumbers.map(day => i18n.t('Day') + ' ' + day);
    const dates = [
        'Oct 7, 2023', 'Oct 8, 2023', 'Oct 9, 2023', 'Oct 10, 2023', 'Oct 11, 2023',
        'Oct 12, 2023', 'Oct 13, 2023', 'Oct 14, 2023', 'Oct 15, 2023', 'Oct 16, 2023',
        'Oct 17, 2023', 'Oct 18, 2023', 'Oct 20, 2023', 'Oct 21, 2023', 'Oct 22, 2023',
        'Oct 23, 2023', 'Oct 25, 2023', 'Oct 26, 2023', 'Oct 27, 2023', 'Oct 28, 2023',
        'Oct 29, 2023', 'Oct 31, 2023', 'Nov 1, 2023', 'Nov 2, 2023', 'Nov 3, 2023',
        'Nov 5, 2023', 'Nov 8, 2023', 'Nov 10, 2023', 'Nov 16, 2023', 'Nov 20, 2023',
        'Dec 2, 2023', 'Dec 5, 2023', 'Dec 11, 2023', 'Dec 18, 2023', 'Dec 19, 2023',
        'Feb 19, 2024'
    ];
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
                        const date = new Date(dates[index]).toLocaleDateString(getLocale(), {
                            year: 'numeric', month: 'short', day: 'numeric'
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
document.addEventListener('DOMContentLoaded', async () => {
    i18n.updateDirection();
    console.log('Palestine Crisis - Loading data...');
    try {
        // Load all data in parallel
        await Promise.all([
            i18n.loadTranslations(),
            liveTracker.loadData(),
            regionsManager.loadRegions(),
            attacksManager.loadAttacks()
        ]);
        console.log('All data loaded successfully!');

        // Insert live tracker data
        const mainContainer = document.querySelector('.main-container') || document.body;
        liveTracker.insertData(mainContainer);

        // Render pie charts if element exists
        if (document.querySelector('.chart')) {
            await worldwideWithPieChart(liveTracker.data);
        }

        // Render line chart if element exists
        const chartContainer = document.querySelector('#chart-report');
        if (chartContainer) {
            await chartReport(chartContainer);
        }

        // Render attacks table if element exists
        const tableContainer = document.querySelector('#attacks-table-container');
        if (tableContainer) {
            attacksManager.renderAttacksTable('attacks-table-container', currentLang);

            // Initialize DataTables if jQuery is available
            if (typeof jQuery !== 'undefined' && jQuery.fn.DataTable) {
                const table = jQuery('#attacks-table-container table');
                const dataTable = table.DataTable({
                    order: false,
                    searching: true
                });

                // Handle region clicks
                jQuery(document).on('click', '.country-search', function () {
                    const region = jQuery(this).data('region');
                    if (region && region !== 'All Regions' && region !== 'كل المناطق') {
                        dataTable.search(region).draw();
                    } else {
                        dataTable.search('').draw();
                    }
                });
            }
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
