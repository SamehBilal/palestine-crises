// API BASE URL
const BASE_URL = "https://corona.lmao.ninja/";

/**
 *  Function for Fetch Data
 * @param url
 * @returns {Promise<any>}
 */
async function getData(url) {
    let response = await fetch(url);
    return await response.json();
}

/**
 * Function for Generate Select Menu Option
 * @param select
 * @param selectedCountry
 * @returns {Promise<void>}
 */
const makeSelectOption = async (select, selectedCountry) => {
    let countries = await getData(BASE_URL + 'v2/countries/');
    let wwOptionDom = document.createElement('option');
    let location = window.location.href.split('/');
    const path = location.pop();
    wwOptionDom.value = 'all';
    wwOptionDom.innerHTML = 'Worldwide';
    wwOptionDom.dataset.image = location.join('/') + '/assets/img/global.png';
    wwOptionDom.selected = true;
    select.insertBefore(wwOptionDom, select.childNodes[0]);
    /* let countries = {

    } */

    countries.map((country) => {
        let optionDom = document.createElement('option');
        optionDom.value = `countries/${country.countryInfo.iso2}`;
        optionDom.classList.add(country.countryInfo.iso2);
        if (country.countryInfo.iso2 === selectedCountry || country.countryInfo.iso3 === selectedCountry || country.country.toLocaleLowerCase() === selectedCountry) {
            wwOptionDom.selected = false;
            optionDom.selected = true;
        }
        optionDom.dataset.image = country.countryInfo.flag;

        optionDom.text = country.country;
        select.append(optionDom);
    });


    function formatState(opt) {
        if (!opt.id) {
            return opt.text;
        }

        let optimage = jQuery(opt.element).attr('data-image');
        if (!optimage) {
            return opt.text;
        } else {
            let $opt = jQuery(
                `<span><img src=${optimage} class='img-flag' />${opt.text}</span>`
            );
            return $opt;
        }
    };

    jQuery(select).select2({
        templateSelection: formatState,
        templateResult: formatState
    });
};

let findSelect = document.querySelector('select[name=country]');

jQuery(findSelect).select2({
    templateSelection: formatState,
    templateResult: formatState
});

function formatState(opt) {
    if (!opt.id) {
        return opt.text;
    }

    let optimage = jQuery(opt.element).attr('data-image');
    if (!optimage) {
        return opt.text;
    } else {
        let $opt = jQuery(
            `<span><img src=${optimage} class='img-flag' />${opt.text}</span>`
        );
        return $opt;
    }
};


/* function formatState (opt) {
    if (!opt.id) {
        return opt.text.toUpperCase();
    }

    var optimage = $(opt.element).attr('data-image');
    console.log(optimage)
    if(!optimage){
       return opt.text.toUpperCase();
    } else {
        var $opt = $(
           '<span><img src="' + optimage + '" width="60px" /> ' + opt.text.toUpperCase() + '</span>'
        );
        return $opt;
    }
}; */


/**
 * Function for get last updated time
 * @param format
 * @param selectorID
 */
const getLastUpdatedTime = async (selectorID, format) => {
    const data = await getData(BASE_URL + `v2/all`);
    const diff_time = (dt2, dt1) => {
        let diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= (60);
        return Math.abs(Math.round(diff));
    };

    const lastUpdate = selectorID.querySelectorAll('.last-update');
    lastUpdate.forEach((item, index) => {
        const dt1 = new Date();
        const dt2 = new Date(data.updated);
        if (format === 'date') {
            item.innerHTML = dt2.toLocaleDateString() + " at " + dt2.toLocaleTimeString();
        } else {
            item.innerHTML = diff_time(dt2, dt1);
        }
    });
}

/**
 * Function for Insert DATA to DOM
 * @param selectorID
 * @param data
 * @param yesterdayData
 */

const insertData = (selectorID, data, yesterdayData) => {
    const totalInfected = selectorID.querySelectorAll('.infected');
    const totalDeaths = selectorID.querySelectorAll('.deaths');
    const totalRecovered = selectorID.querySelectorAll('.recovered');
    const todayInfected = selectorID.querySelectorAll('.today_infected');
    const todayDeaths = selectorID.querySelectorAll('.today_deaths');
    const todayRecovers = selectorID.querySelectorAll('.today_recovered');
    const todayActiveCases = selectorID.querySelectorAll('.today_active_cases');
    const currentCases = selectorID.querySelectorAll('.current_cases');
    const deathsRate = selectorID.querySelectorAll('.deaths-rate');
    const recoverRate = selectorID.querySelectorAll('.recover-rate');

    const dataToDOM = (selectors, value) => {
        selectors.forEach((item, index) => {
            item.innerHTML = value.toLocaleString();
        });
    }

    const deathRate = (data.deaths * 100) / data.cases;
    const recoveredRate = (data.recovered * 100) / data.cases;
    const todayRecovered = (data.recovered - yesterdayData.recovered);
    const todayActiveCased = (data.active - yesterdayData.active);

    dataToDOM(totalInfected, data.cases);
    dataToDOM(totalDeaths, data.deaths);
    dataToDOM(totalRecovered, data.recovered);
    dataToDOM(todayInfected, data.todayCases);
    dataToDOM(todayDeaths, data.todayDeaths);
    dataToDOM(todayRecovers, todayRecovered <= 0 ? '0,000' : todayRecovered);
    dataToDOM(todayActiveCases, todayActiveCased <= 0 ? '0,000' : todayActiveCased);
    dataToDOM(currentCases, data.active);
    dataToDOM(deathsRate, deathRate.toFixed(2));
    dataToDOM(recoverRate, recoveredRate.toFixed(2));
    getLastUpdatedTime(selectorID, 'minute');
}

/**
 * Function For Report with Dropdown Selector
 * @param selectorID
 * @param specificCountry
 * @returns {Promise<void>}
 */
const reportWithDropdown = async (selectorID, specificCountry) => {
    let findThisSelect = selectorID.querySelector('select[name=country]');
    await makeSelectOption(findThisSelect, specificCountry);
    let data, yesterdayData;
    data = await getData(BASE_URL + `v2/${findThisSelect.value || 'all'}`);
    yesterdayData = await getData(BASE_URL + `v2/${findThisSelect.value || 'all'}?yesterday=true`);

    insertData(selectorID, data, yesterdayData);

    jQuery(findThisSelect).on('change', async (e) => {
        data = await getData(BASE_URL + `v2/${e.target.value}`);
        yesterdayData = await getData(BASE_URL + `v2/${e.target.value}?yesterday=true`);
        insertData(selectorID, data, yesterdayData);
    });
};

/**
 * Function for Country Report
 * @param selectID
 * @param countryName
 * @returns {Promise<void>}
 */
const countryReport = async (selectID, countryName) => {
    let countryData = await getData(BASE_URL + `v2/countries/${countryName}`);
    let yesterdayCountryData = await getData(BASE_URL + `v2/countries/${countryName}?yesterday=true`);
    insertData(selectID, countryData, yesterdayCountryData);
};

/**
 * Function for Cases by Country
 * @returns {Promise<void>}
 */

const casesByCountry = async () => {
    const data = await getData(BASE_URL + 'v2/countries');
    let noListsShow = 11;
    const countryLists = document.querySelector('.cases-country-lists');
    const btnShowAll = document.querySelector('.btn-show-all');
    const btnCollapse = document.querySelector('.btn-collapse');

    const casesByCountriesData = (data) => {
        const countryItem = document.createElement('li');
        const countryName = document.createElement('h6');
        const infectedNo = document.createElement('span');

        countryName.classList.add('country-name');
        infectedNo.className = 'cases-no infected';
        countryName.innerHTML = data.country;
        infectedNo.innerHTML = data.cases;

        countryItem.appendChild(countryName);
        countryItem.appendChild(infectedNo);
        countryLists.appendChild(countryItem);
    }

    data.map(country => {
        casesByCountriesData(country);
    });
}

/**
 * Function for Worldwide Report
 * @param selectID
 * @returns {Promise<void>}
 */

const worldwideReport = async (selectID) => {
    let worldwideData = await getData(BASE_URL + 'v2/all');
    let yesterdayWorldwideData = await getData(BASE_URL + 'v2/all?yesterday=true');
    insertData(selectID, worldwideData, yesterdayWorldwideData);
};

/**
 * Function for List view Data
 * @returns {Promise<void>}
 */

const reportListView = async (selectorID, search) => {
    const listData = await getData(BASE_URL + 'v2/countries');

    function createListTableColumn(data, appendParent) {
        const td = document.createElement('td');
        td.innerHTML = data;
        appendParent.appendChild(td);
    }

    function countryNameWithFlag(name, flag, appendParent) {
        const td = document.createElement('td');
        const img = document.createElement('img');
        img.src = flag;
        img.alt = name;
        td.appendChild(img);
        td.innerHTML = td.innerHTML + name;
        appendParent.appendChild(td);
    }

    async function dataRow(data, world) {
        let listTable = selectorID.querySelector('.list-view__body');
        const deathRate = (data.deaths * 100) / data.cases;
        const recoveredRate = (data.recovered * 100) / data.cases;
        const tr = document.createElement('tr');
        tr.className = world ? 'worldwide-item' : 'country-item';
        countryNameWithFlag(data.country, data.countryInfo.flag, tr);
        createListTableColumn(data.cases, tr);
        createListTableColumn(`+${data.todayCases}`, tr);
        createListTableColumn(data.deaths, tr);
        createListTableColumn(`${deathRate.toFixed(2)}%`, tr);
        createListTableColumn(`+${data.todayDeaths}`, tr);
        createListTableColumn(data.recovered, tr);
        createListTableColumn(`${recoveredRate.toFixed(2)}%`, tr);
        createListTableColumn(data.active, tr);
        listTable.appendChild(tr);
    }

    listData.map(async (countryData) => {
        await dataRow(countryData, false);
    });

    let table = selectorID.querySelector('table');

    jQuery(table).DataTable({
        "searching": !!search,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/ar.json',
        },
        order: false
    });
}

let table = document.querySelector('table');

var otable = jQuery(table).DataTable({
    /* "searching": !!'gaza' */
    language: {
        url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/ar.json',
    },
    order: false
});

$('.country-search').click(function () {
    var region = $(this).find('.country-name').text();
    if(region != 'All Regions' && region != 'كل المناطق')
    {
        otable.search(region).draw();
    }else{
        otable.search('').draw();
    }
});

// EDIT: Capture enter press as well
$("#DataTables_Table_0_filter").find('input').keypress(function(e) {
    // You can use $(this) here, since this once again refers to your text input
    if(e.which === 13) {
        e.preventDefault(); // Prevent form submit
        otable.search($(this).val()).draw();
    }
});

/**
 * Function for Map Tracker
 * @param selector
 * @param countryName
 */
const mapReport = (selector, countryName = 'USA') => {
    const maps = selector.querySelector('#tracker-map');
    jQuery(maps).vectorMap({
        map: 'world_en',
        backgroundColor: '#F7F8FC',
        borderColor: '#fff',
        borderOpacity: 0.1,
        borderWidth: 1,
        enableZoom: false,
        hoverColor: null,
        hoverOpacity: null,
        normalizeFunction: 'linear',
        scaleColors: ['#b6d6ff', '#005ace'],
        selectedColor: null,
        selectedRegions: null,
        showTooltip: true,
        colors: {
            ru: '#F04946',
            ca: '#55bfbf',
            us: '#0e7272',
            mx: '#f14946',
            br: '#9aa44b',
            ar: '#55bfbf',
            pe: '#55bfbf',
            cl: '#f14946',
            ec: '#8363a4',
            co: '#0e7272',
            ve: '#f14946',
            gl: '#53ba9c',
            is: '#8562a4',
            gt: '#0e7272',
            bz: '#e8ebbe',
            sv: '#df9858',
            hn: '#7a5e91',
            ni: '#53ba9c',
            cr: '#0e7272',
            pa: '#9aa44e',
            cu: '#ecc3c1',
            bs: '#bed199',
            ht: '#e9d6ae',
            do: '#bed295',
            gy: '#f2972c',
            sr: '#0e7272',
            gf: '#8562a4',
            bo: '#f2972c',
            py: '#f14946',
            uy: '#f2972c',
            fk: '#3e8a8a',
            no: '#f2972c',
            se: '#0e7272',
            fi: '#8562a4',
            ee: '#9aa549',
            lv: '#8562a4',
            lt: '#1b6c6d',
            by: '#f2972c',
            ua: '#cf5bc8',
            pl: '#53ba9c',
            de: '#f14946',
            fr: '#8562a4',
            gb: '#f14946',
            ie: '#f2972c',
            es: '#bf4250',
            pt: '#9aa44b',
            ma: '#53ba9c',
            mr: '#f14946',
            dz: '#9aa44b',
            ml: '#53ba9c',
            ne: '#0e7270',
            ng: '#53ba9c',
            gh: '#f14946',
            bf: '#f2972c',
            sn: '#f2972c',
            gm: '#346649',
            gw: '#f14946',
            gn: '#0c7372',
            sl: '#f14948',
            lr: '#bf4250',
            ci: '#8562a4',
            tg: '#0e7272',
            bj: '#8562a4',
            cm: '#0e7272',
            ga: '#f2972c',
            gq: '#5c9d7d',
            cg: '#55bfbf',
            cd: '#f2972c',
            ao: '#0e7272',
            na: '#9aa44b',
            za: '#f14946',
            ls: '#9aa549',
            bw: '#cf5bc8',
            zm: '#bf4250',
            zw: '#55bfbf',
            mz: '#8562a4',
            mg: '#0e7272',
            sz: '#86923e',
            tz: '#55bfbf',
            mw: '#9aa44b',
            ke: '#f14a44',
            ug: '#0e7272',
            rw: '#98a54d',
            bi: '#85679b',
            so: '#9aa44d',
            et: '#0e7272',
            sd: '#9aa44b',
            ly: '#53ba9c',
            cf: '#8562a4',
            eg: '#0e7274',
            er: '#f2972c',
            td: '#f14946',
            tn: '#f2972c',
            it: '#f3982d',
            nl: '#f3982d',
            be: '#127072',
            dk: '#ffa944',
            mt: '#c6c78e',
            cz: '#0e7272',
            at: '#9aa44b',
            sk: '#e9993a',
            hu: '#8562a4',
            ch: '#0e7272',
            si: '#54bfa5',
            hr: '#53ba9c',
            ro: '#9aa44b',
            ba: '#0f7172',
            rs: '#f14946',
            bg: '#8562a2',
            mk: '#f2972c',
            al: '#bf4250',
            gr: '#0e7270',
            tr: '#f2972c',
            cy: '#bfd398',
            sy: '#b2fce3',
            iq: '#8562a4',
            il: '#e84d48',
            jo: '#53ba9c',
            lb: '#157071',
            sa: '#9aa44b',
            ye: '#8562a4',
            om: '#f2972c',
            ae: '#0e7272',
            qa: '#d15756',
            kw: '#c8dead',
            ir: '#55bfbf',
            am: '#9aa44b',
            az: '#53ba9c',
            kz: '#f3962c',
            uz: '#0e7272',
            ge: '#b1fde3',
            tm: '#f14946',
            af: '#8562a4',
            pk: '#f14946',
            in: '#f2972c',
            lk: '#9ba157',
            np: '#8562a4',
            bd: '#1e7013',
            la: '#53ba9c',
            th: '#ef4a46',
            bt: '#0a7273',
            mm: '#0e7272',
            vn: '#f2972c',
            kh: '#9aa44b',
            my: '#0c7372',
            id: '#55bfbf',
            au: '#f2972c',
            pg: '#f2972c',
            sb: '#dd524d',
            nc: '#117072',
            nz: '#f14946',
            ph: '#f2972c',
            jp: '#0e7274',
            kp: '#0e7272',
            kr: '#bf4250',
            tw: '#f14946',
            mn: '#0e7272',
            pf: '#EF0435',
            kg: '#FF0000',
            vu: '#5cb69a',
            tj: '#CC0000',
            jm: '#8d9075',
            md: '#f2972c',
            cn: '#52BA9A'
        },
        onRegionClick: async (element, code) => {
            const cdata = await getData(BASE_URL + `v2/countries/${code}`);
            let findThisSelect = selector.querySelector('select[name=country]');
            const findClickedCountryOption = findThisSelect.querySelector(`.${code.toUpperCase()}`);
            findClickedCountryOption.selected = true;
            const selectedCountry = document.querySelector(".select2-selection__rendered");
            selectedCountry.title = cdata.country;
            selectedCountry.innerHTML = `<span><img src=${cdata.countryInfo.flag} class='img-flag' />${cdata.country}</span>`;
            await countryReport(selector, code);
        },
        onLoad: async () => {
            await reportWithDropdown(selector, countryName);
        }
    });
}


const chartReport = async (selectorId) => {
    const selectMenu = selectorId.querySelector("select");
    /* const countries = await getData(BASE_URL + 'v2/countries/'); */
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Make Select option Dropdown Menu
    /* countries.map((country) => {
        let optionDom = document.createElement('option');
        optionDom.value = country.countryInfo.iso2;
        optionDom.classList.add(country.countryInfo.iso2);
        optionDom.text = country.country;
        selectMenu.append(optionDom);
    }); */

    function chartData(data) {
        let reports = [];
        let labels = [];
        let dates = [];

        reports.push(238);
        reports.push(428);
        reports.push(577);
        reports.push(923);
        reports.push(1128);
        reports.push(1571);
        reports.push(1951);
        reports.push(2270);
        reports.push(2385);
        reports.push(2809);
        reports.push(3061);
        reports.push(3543);
        reports.push(4221);
        reports.push(4741);
        reports.push(5182);
        reports.push(6504);
        reports.push(6954);
        reports.push(7415);
        reports.push(7761);
        reports.push(8069);
        reports.push(8382);
        reports.push(8610);
        reports.push(8850);
        reports.push(9159);
        reports.push(9299);
        reports.push(9883);
        reports.push(10678);
        reports.push(11208);
        reports.push(11667);
        reports.push(12918);
        reports.push(15455);
        reports.push(16060);
        reports.push(18175);
        reports.push(19754);
        reports.push(19968);
        reports.push(29496);
        labels.push(`اليوم 1`);
        labels.push(`اليوم 2`);
        labels.push(`اليوم 3`);
        labels.push(`اليوم 4`);
        labels.push(`اليوم 5`);
        labels.push(`اليوم 6`);
        labels.push(`اليوم 7`);
        labels.push(`اليوم 8`);
        labels.push(`اليوم 9`);
        labels.push(`اليوم 10`);
        labels.push(`اليوم 11`);
        labels.push(`اليوم 12`);
        labels.push(`اليوم 14`);
        labels.push(`اليوم 15`);
        labels.push(`اليوم 16`);
        labels.push(`اليوم 17`);
        labels.push(`اليوم 19`);
        labels.push(`اليوم 20`);
        labels.push(`اليوم 21`);
        labels.push(`اليوم 22`);
        labels.push(`اليوم 23`);
        labels.push(`اليوم 25`);
        labels.push(`اليوم 26`);
        labels.push(`اليوم 27`);
        labels.push(`اليوم 28`);
        labels.push(`اليوم 30`);
        labels.push(`اليوم 33`);
        labels.push(`اليوم 35`);
        labels.push(`اليوم 41`);
        labels.push(`اليوم 45`);
        labels.push(`اليوم 57`);
        labels.push(`اليوم 60`);
        labels.push(`اليوم 66`);
        labels.push(`اليوم 73`);
        labels.push(`اليوم 74`);
        labels.push(`اليوم 136`);
        dates.push(new Date("October 7, 2023").toDateString());
        dates.push(new Date("October 8, 2023").toDateString());
        dates.push(new Date("October 9, 2023").toDateString());
        dates.push(new Date("October 10, 2023").toDateString());
        dates.push(new Date("October 11, 2023").toDateString());
        dates.push(new Date("October 12, 2023").toDateString());
        dates.push(new Date("October 13, 2023").toDateString());
        dates.push(new Date("October 14, 2023").toDateString());
        dates.push(new Date("October 15, 2023").toDateString());
        dates.push(new Date("October 16, 2023").toDateString());
        dates.push(new Date("October 17, 2023").toDateString());
        dates.push(new Date("October 18, 2023").toDateString());
        dates.push(new Date("October 20, 2023").toDateString());
        dates.push(new Date("October 21, 2023").toDateString());
        dates.push(new Date("October 22, 2023").toDateString());
        dates.push(new Date("October 23, 2023").toDateString());
        dates.push(new Date("October 25, 2023").toDateString());
        dates.push(new Date("October 26, 2023").toDateString());
        dates.push(new Date("October 27, 2023").toDateString());
        dates.push(new Date("October 28, 2023").toDateString());
        dates.push(new Date("October 29, 2023").toDateString());
        dates.push(new Date("October 31, 2023").toDateString());
        dates.push(new Date("November 1, 2023").toDateString());
        dates.push(new Date("November 2, 2023").toDateString());
        dates.push(new Date("November 3, 2023").toDateString());
        dates.push(new Date("November 5, 2023").toDateString());
        dates.push(new Date("November 8, 2023").toDateString());
        dates.push(new Date("November 10, 2023").toDateString());
        dates.push(new Date("November 16, 2023").toDateString());
        dates.push(new Date("November 20, 2023").toDateString());
        dates.push(new Date("December 2, 2023").toDateString());
        dates.push(new Date("December 5, 2023").toDateString());
        dates.push(new Date("December 11, 2023").toDateString());
        dates.push(new Date("December 18, 2023").toDateString());
        dates.push(new Date("December 19, 2023").toDateString());
        dates.push(new Date("February 19, 2024").toDateString());

        /* data.map((item, index) => {
            const value = item.Confirmed - data[index > 0 ? (index - 1) : 0].Confirmed;
            reports.push(value < 0 ? data[index - 1] : value);
            labels.push(`Day ${index + 1}`);
            const d = new Date(item.Date);
            const day = d.getDate() < 10 ? `0${d.getDate()}` : d.getDate();
            const month = d.getMonth();
            const dateUSFormat = `${months[month]} ${day}`;
            dates.push(dateUSFormat);
        }) */

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
                            return "اليوم - " + labels[Number(tooltipItems[0].index)] + ", " + dates[Number(tooltipItems[0].index)];
                        },
                        label: function (tooltipItem) {
                            return "الوفيات: " + Number(tooltipItem.yLabel) + "+";
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
        const ctx = canvas.getContext('2d');
        canvas.height = 450;
        window.myLine = new Chart(ctx, config);
    }

    //const data = await getData('https://api.covid19api.com/total/dayone/country/' + selectMenu.options[selectMenu.selectedIndex].value);
    chartData('chart-canvas');
    /* jQuery(selectMenu).on('change', async function () {
        const data = await getData('https://api.covid19api.com/total/dayone/country/' + selectMenu.options[selectMenu.selectedIndex].value);
        chartData(data);
    }) */
}
/**
 * Function For Today's Activities
 * @returns {Promise<void>}
 */
const worldwidrWithPieChart = async () => {
    //const data = await getData(BASE_URL + 'v2/all');
    const deathRate = (695 * 100) / 29195;
    const recoveredRate = (12660 * 100) / 29195;
    const activeCasesRate = (8570 * 100) / 29195;
    const percents = [{
            title: "النساء "+ Math.floor(activeCasesRate) + '%',
            value: activeCasesRate
        },
        {
            title: "الأطفال "+ Math.floor(recoveredRate) + '%',
            value: recoveredRate
        },
        {
            title: "المسنين "+ Math.floor(deathRate) + '%',
            value: deathRate
        }
    ];
    const charts = document.querySelectorAll('.chart');
    charts.forEach((elem, indx) => {
        elem.title = percents[indx].title;
        elem.dataset.percent = percents[indx].value;
        jQuery(elem).easyPieChart({
            scaleColor: false,
            lineWidth: 25
        });
    })
}

/**
 * Function for mapStatus Report
 * @param {*} selectorID
 */

const mapStatus = async function (selectorID) {
    //const countriesData = await getData(BASE_URL + 'v2/countries');
    const map = selectorID.querySelector('#map-status');
    const mostCases = "#006491";
    const mediumCases = "#4A97B9";
    const minCases = "#ACCDDC";
    const mapColors = {
        ru: '#F04946',
        ca: '#55bfbf',
        us: '#0e7272',
        mx: '#f14946',
        br: '#9aa44b',
        ar: '#55bfbf',
        pe: '#55bfbf',
        cl: '#f14946',
        ec: '#8363a4',
        co: '#0e7272',
        ve: '#f14946',
        gl: '#53ba9c',
        is: '#8562a4',
        gt: '#0e7272',
        bz: '#e8ebbe',
        sv: '#df9858',
        hn: '#7a5e91',
        ni: '#53ba9c',
        cr: '#0e7272',
        pa: '#9aa44e',
        cu: '#ecc3c1',
        bs: '#bed199',
        ht: '#e9d6ae',
        do: '#bed295',
        gy: '#f2972c',
        sr: '#0e7272',
        gf: '#8562a4',
        bo: '#f2972c',
        py: '#f14946',
        uy: '#f2972c',
        fk: '#3e8a8a',
        no: '#f2972c',
        se: '#0e7272',
        fi: '#8562a4',
        ee: '#9aa549',
        lv: '#8562a4',
        lt: '#1b6c6d',
        by: '#f2972c',
        ua: '#cf5bc8',
        pl: '#53ba9c',
        de: '#f14946',
        fr: '#8562a4',
        gb: '#f14946',
        ie: '#f2972c',
        es: '#bf4250',
        pt: '#9aa44b',
        ma: '#53ba9c',
        mr: '#f14946',
        dz: '#9aa44b',
        ml: '#53ba9c',
        ne: '#0e7270',
        ng: '#53ba9c',
        gh: '#f14946',
        bf: '#f2972c',
        sn: '#f2972c',
        gm: '#346649',
        gw: '#f14946',
        gn: '#0c7372',
        sl: '#f14948',
        lr: '#bf4250',
        ci: '#8562a4',
        tg: '#0e7272',
        bj: '#8562a4',
        cm: '#0e7272',
        ga: '#f2972c',
        gq: '#5c9d7d',
        cg: '#55bfbf',
        cd: '#f2972c',
        ao: '#0e7272',
        na: '#9aa44b',
        za: '#f14946',
        ls: '#9aa549',
        bw: '#cf5bc8',
        zm: '#bf4250',
        zw: '#55bfbf',
        mz: '#8562a4',
        mg: '#0e7272',
        sz: '#86923e',
        tz: '#55bfbf',
        mw: '#9aa44b',
        ke: '#f14a44',
        ug: '#0e7272',
        rw: '#98a54d',
        bi: '#85679b',
        so: '#9aa44d',
        et: '#0e7272',
        sd: '#9aa44b',
        ly: '#53ba9c',
        cf: '#8562a4',
        eg: '#0e7274',
        er: '#f2972c',
        td: '#f14946',
        tn: '#f2972c',
        it: '#f3982d',
        nl: '#f3982d',
        be: '#127072',
        dk: '#ffa944',
        mt: '#c6c78e',
        cz: '#0e7272',
        at: '#9aa44b',
        sk: '#e9993a',
        hu: '#8562a4',
        ch: '#0e7272',
        si: '#54bfa5',
        hr: '#53ba9c',
        ro: '#9aa44b',
        ba: '#0f7172',
        rs: '#f14946',
        bg: '#8562a2',
        mk: '#f2972c',
        al: '#bf4250',
        gr: '#0e7270',
        tr: '#f2972c',
        cy: '#bfd398',
        sy: '#b2fce3',
        iq: '#8562a4',
        il: '#e84d48',
        jo: '#53ba9c',
        lb: '#157071',
        sa: '#9aa44b',
        ye: '#8562a4',
        om: '#f2972c',
        ae: '#0e7272',
        qa: '#d15756',
        kw: '#c8dead',
        ir: '#55bfbf',
        am: '#9aa44b',
        az: '#53ba9c',
        kz: '#f3962c',
        uz: '#0e7272',
        ge: '#b1fde3',
        tm: '#f14946',
        af: '#8562a4',
        pk: '#f14946',
        in: '#f2972c',
        lk: '#9ba157',
        np: '#8562a4',
        bd: '#1e7013',
        la: '#53ba9c',
        th: '#ef4a46',
        bt: '#0a7273',
        mm: '#0e7272',
        vn: '#f2972c',
        kh: '#9aa44b',
        my: '#0c7372',
        id: '#55bfbf',
        au: '#f2972c',
        pg: '#f2972c',
        sb: '#dd524d',
        nc: '#117072',
        nz: '#f14946',
        ph: '#f2972c',
        jp: '#0e7274',
        kp: '#0e7272',
        kr: '#bf4250',
        tw: '#f14946',
        mn: '#0e7272',
        pf: '#EF0435',
        kg: '#FF0000',
        vu: '#5cb69a',
        tj: '#CC0000',
        jm: '#8d9075',
        md: '#f2972c',
        cn: '#52BA9A'
    };

    /* countriesData.map(async (country) => {
        if (country.countryInfo.iso2) {
            const countryCode = country.countryInfo.iso2.toLowerCase();
            if (country.cases >= 0 && country.cases <= 50000) {
                mapColors[countryCode] = minCases;
            } else if (country.cases > 50000 && country.cases <= 100000) {
                mapColors[countryCode] = mediumCases;
            } else if (country.cases > 100000) {
                mapColors[countryCode] = mostCases;
            }
        }
    }) */

    jQuery(map).vectorMap({
        map: 'world_en',
        backgroundColor: null,
        hoverOpacity: 0.7,
        hoverColor: false,
        borderColor: '#fff',
        borderOpacity: 0.1,
        borderWidth: 1,
        enableZoom: false,
        normalizeFunction: 'polynomial',
        scaleColors: ['#b6d6ff', '#005ace'],
        selectedColor: null,
        selectedRegions: null,
        showTooltip: true,
        colors: mapColors,
       /*  onLabelShow: async function (event, label, code) {
            //const cdata = await getData(BASE_URL + `v2/countries/${code}`);
            //const ddd = `${cdata.country}: ${cdata.cases}`;
            const ddd = `Egypt: 500`;
            if (label.length) {
                label[0].innerText = ddd;
            } else {
                event.preventDefault();
            }
        }, */
        /* onRegionTipShow: function(e, el, code){
            el.html(el.html()+' (GDP - '+gdpData[code]+')');
          } */
    });
}


/**
 * Function for Monthly Chart
 * @param {*} canvas
 * @param {*} data
 */

const monthlyChart = (canvas, data) => {

    function chunkSum(arr, len) {
        let chunks = [];
        let i = 0;
        let n = arr.length;

        let chunk;

        while (i < n) {
            chunk = arr.slice(i, i += len);
            chunks.push(
                chunk.reduce((s, n) => s + n)
            );
        }

        return chunks;
    };

    const chartData = chunkSum(data, 30);
    const chartLabel = [];
    chartData.map((item, indx) => chartLabel.push(indx + 1 + ' month'));

    const config = {
        type: 'line',
        data: {
            labels: chartLabel,
            datasets: [{
                label: '',
                backgroundColor: '#EFF3F8',
                borderColor: '#BAD5FF',
                borderWidth: '2',
                data: chartData,
                fill: false,
                pointBackgroundColor: '#BAD5FF',
                pointBorderColor: '#BAD5FF',
                pointBorderWidth: 5
            }]
        },
        options: {
            height: 250,
            responsive: true,
            legend: {
                display: false
            },
            title: {
                display: false
            },
            layout: {
                padding: {
                    left: 10,
                    right: 0,
                    top: 20,
                    bottom: 10
                }
            },
            scales: {
                xAxes: [{
                    gridLines: {
                        color: "rgba(0, 0, 0, 0)",
                    }
                }],
                yAxes: [{
                    gridLines: {
                        color: "#DEDEDE",
                    }
                }]
            }
        }
    };

    const ctx = canvas.getContext('2d');
    canvas.height = 250;
    canvas.style.backgroundColor = "#fafefe";
    window.myLine = new Chart(ctx, config);
}


const miniChart = async () => {
    const data = await getData('https://api.covid19api.com/total/dayone/country/bd');
    const activeCases = [];
    const deaths = [];
    const recovered = [];
    data.map(item => activeCases.push(item.Active));
    data.map(item => deaths.push(item.Deaths));
    data.map(item => recovered.push(item.Recovered));

    const active_cases_chart = document.getElementById('active_cases_chart');
    active_cases_chart && monthlyChart(active_cases_chart, activeCases);


    const deaths_chart = document.getElementById('deaths_chart');
    deaths_chart && monthlyChart(deaths_chart, deaths);

    const recovered_chart = document.getElementById('recovered_chart');
    recovered_chart && monthlyChart(recovered_chart, recovered);
}
