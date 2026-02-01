
// ============================================
// LIVE.HTML PAGE SPECIFIC FUNCTIONALITY
// ============================================
// Initialize map colors and interaction
function initializePalestineMap() {
    const regions = []; // Will be populated from attacks data
    // Map region IDs to SVG path IDs
    const regionIdMap = {
        1: 'RBH',  // West Bank -> Ramallah (aggregate)
        4: 'NBS',  // Nablus
        5: 'RBH',  // Ramallah
        9: 'JEN',  // Jenin
        10: 'BTH', // Bethlehem
        12: 'TKM', // Tulkarm
        16: 'HBN', // Hebron
        20: 'GZA', // Gaza (main)
        22: 'JEM', // Jerusalem
        23: 'JRH', // Jericho
        24: 'SLT', // Salfit
        25: 'TBS', // Tubas
        26: 'QQA', // Qalqilya
        // ADD THESE 4 LINES:
        18: 'KYS', // Khan Yunis
        27: 'DEB', // Deir El Balah
        28: 'NGZ', // North Gaza
        29: 'RFH'  // Rafah
    };
    // Populate regions array from attacksManager
    attacksManager.attacks.forEach(function (attack) {
        const svgCode = regionIdMap[attack.region_id] || attack.region_id;
        regions.push({
            region_name: attack.region_name,
            region_code: svgCode,
            deaths: attack.total_deaths
        });
    });
    // Color function based on death count
    function getColorForDeaths(deaths) {
        if (deaths < 10) {
            return '#1C202B'; // Less than 10
        } else if (deaths >= 10 && deaths < 100) {
            return '#163957'; // Between 10 and 100
        } else if (deaths >= 100 && deaths < 1000) {
            return '#0B68AA'; // Between 100 and 1000
        } else {
            return '#0B68AA'; // 1000 and above (same as 100-1000)
        }
    }
    // Color the map regions based on deaths
    regions.forEach(function (region) {
        const regionElement = document.querySelector('#PS-' + region.region_code);
        if (regionElement) {
            const color = getColorForDeaths(region.deaths);
            regionElement.style.fill = color;
            regionElement.style.stroke = '#fff';
            regionElement.style.strokeWidth = '0.5px';
            regionElement.setAttribute('data-region-name', region.region_name);
            regionElement.setAttribute('data-deaths', region.deaths);
            console.log('Colored region:', region.region_name, 'Deaths:', region.deaths, 'Color:', color);
        } else {
            console.warn('SVG element not found for region:', region.region_code, '(', region.region_name, ')');
        }
    });
    // Map hover functionality with improved styling
    document.querySelectorAll('.palestine-map path').forEach(function (path) {
        path.addEventListener('mouseover', function (e) {
            const regionName = this.getAttribute('data-region-name');
            const deaths = this.getAttribute('data-deaths');
            if (regionName && deaths) {
                // Highlight the region
                this.style.opacity = '0.8';
                this.style.strokeWidth = '1.5px';

                const infoPanel = document.createElement('div');
                infoPanel.className = 'info_panel';
                infoPanel.innerHTML = '<strong>' + regionName + '</strong><br>' +
                    i18n.t('Deaths') + ': <span style="color: #ff6b6b; font-weight: bold;">' +
                    parseInt(deaths).toLocaleString() + '</span>';

                infoPanel.style.position = 'absolute';
                infoPanel.style.background = 'rgba(0, 0, 0, 0.9)';
                infoPanel.style.color = 'white';
                infoPanel.style.padding = '12px 16px';
                infoPanel.style.borderRadius = '8px';
                infoPanel.style.pointerEvents = 'none';
                infoPanel.style.zIndex = '9999';
                infoPanel.style.fontSize = '14px';
                infoPanel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                infoPanel.style.border = '1px solid rgba(255,255,255,0.2)';

                document.body.appendChild(infoPanel);
            }
        });

        path.addEventListener('mouseleave', function () {
            // Reset region appearance
            this.style.opacity = '1';
            this.style.strokeWidth = '0.5px';

            const panels = document.querySelectorAll('.info_panel');
            panels.forEach(function (panel) {
                panel.remove();
            });
        });

        path.addEventListener('mousemove', function (e) {
            const panel = document.querySelector('.info_panel');
            if (panel) {
                panel.style.top = (e.pageY - 60) + 'px';
                panel.style.left = (e.pageX - (panel.offsetWidth / 2)) + 'px';
            }
        });
    });
    console.log('Palestine map initialized with', regions.length, 'regions');
}
// Populate region list sidebar
function populateRegionList() {
    const regionList = document.getElementById('region-list');
    if (!regionList) return;
    const sortedRegions = attacksManager.getRegionsByDeaths();
    // Add "All Regions" option
    const allRegionsLi = document.createElement('li');
    allRegionsLi.className = 'country-search';
    allRegionsLi.innerHTML = '<h6 class="country-name" data-i18n="All Regions">All Regions</h6>' +
        '<span class="cases-no infected">' + attacksManager.getTotalDeaths().toLocaleString() + '</span>';
    allRegionsLi.addEventListener('click', function () {
        filterTableByRegion('All Regions');
    });
    regionList.appendChild(allRegionsLi);
    // Add each region
    sortedRegions.forEach(function (attack, index) {
        const li = document.createElement('li');
        li.className = 'country-search' + (index > 10 ? ' region-disabled' : '');
        li.style.display = index > 10 ? 'none' : 'flex';
        li.innerHTML = '<h6 class="country-name">' + attack.region_name + '</h6>' +
            '<span class="cases-no infected">' + attack.total_deaths.toLocaleString() + '</span>';
        li.addEventListener('click', function () {
            filterTableByRegion(attack.region_name);
        });
        regionList.appendChild(li);
    });
    // Apply translations
    i18n.applyTranslations();
}
// Populate regions table
function populateRegionsTable() {
    const tableBody = document.getElementById('regions-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    attacksManager.attacks.forEach(function (attack) {
        const deathRate = attack.total_injuries ?
            ((attack.total_deaths / attack.total_injuries) * 100).toFixed(2) : 100;
        const tr = document.createElement('tr');
        tr.className = 'country-item';
        tr.innerHTML = '<td>' +
            '<img src="assets/img/palestine.webp" alt="Palestine" style="width: 30px; margin-right: 10px;">' +
            attack.region_name +
            '</td>' +
            '<td>' + attack.total_injuries.toLocaleString() + '</td>' +
            '<td>' + attack.total_deaths.toLocaleString() + '</td>' +
            '<td>' + attack.women_deaths.toLocaleString() + '</td>' +
            '<td>' + attack.children_deaths.toLocaleString() + '</td>' +
            '<td>' + attack.elders_deaths.toLocaleString() + '</td>' +
            '<td>' + deathRate + '%</td>' +
            '<td>' + attack.total_destroyed_residential_units.toLocaleString() + '</td>' +
            '<td>' + attack.total_displaced.toLocaleString() + '</td>';
        tableBody.appendChild(tr);
    });
}
// Filter table by region
let dataTable = null;
function filterTableByRegion(regionName) {
    if (dataTable) {
        if (regionName === 'All Regions' || regionName === 'كل المناطق') {
            dataTable.search('').draw();
        } else {
            dataTable.search(regionName).draw();
        }
    }
}
// Populate region select dropdown
function populateRegionSelect() {
    const select = document.getElementById('select1');
    if (!select) return;
    select.innerHTML = '';
    attacksManager.attacks.forEach(function (attack) {
        const option = document.createElement('option');
        option.value = attack.region_id;
        option.className = attack.region_name;
        option.setAttribute('data-image', 'assets/img/palestine.webp');
        option.textContent = attack.region_name;
        select.appendChild(option);
    });
    // Initialize Select2 if available
    if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
        function formatState(opt) {
            if (!opt.id) return opt.text;
            var optimage = jQuery(opt.element).attr('data-image');
            if (!optimage) return opt.text;

            var span = jQuery('<span><img src="' + optimage + '" class="img-flag" />' + opt.text + '</span>');
            return span;
        }

        jQuery(select).select2({
            templateSelection: formatState,
            templateResult: formatState
        });

        // Handle select change to highlight map region
        jQuery(select).on('change', function () {
            var regionId = parseInt(jQuery(this).val());

            // Map to get SVG code
            const regionIdMap = {
                1: 'RBH', 4: 'NBS', 5: 'RBH', 9: 'JEN', 10: 'BTH',
                12: 'TKM', 16: 'HBN', 20: 'GZA', 22: 'JEM', 23: 'JRH',
                24: 'SLT', 25: 'TBS', 26: 'QQA', 18: 'KYS', 27: 'DEB',
                28: 'NGZ', 29: 'RFH'
            };

            var svgCode = regionIdMap[regionId];

            // Reset all regions to their original colors
            document.querySelectorAll('.map-dashboard path').forEach(function (path) {
                var deaths = parseInt(path.getAttribute('data-deaths')) || 0;

                if (deaths < 10) {
                    path.style.fill = '#1C202B';
                } else if (deaths >= 10 && deaths < 100) {
                    path.style.fill = '#163957';
                } else {
                    path.style.fill = '#0B68AA';
                }
            });

            // Highlight selected region with red fill
            var selectedPath = document.querySelector('#PS-' + svgCode);
            if (selectedPath) {
                selectedPath.style.fill = 'red';
            } else {
                console.log('Path not found for:', svgCode, '(region ID:', regionId, ')');
            }
        });
    }
}
// Show all/less regions button
function initializeShowAllButton() {
    const btnShowAll = document.querySelector('.btn-show-all');
    if (!btnShowAll) return;
    btnShowAll.addEventListener('click', function () {
        const type = this.getAttribute('data-display');
        const disabledRegions = document.querySelectorAll('.region-disabled');
        if (type === 'all') {
            disabledRegions.forEach(function (region) {
                region.style.display = 'flex';
            });
            this.textContent = i18n.t('View less Regions');
            this.setAttribute('data-display', 'less');
        } else {
            disabledRegions.forEach(function (region) {
                region.style.display = 'none';
            });
            this.textContent = i18n.t('View all Regions');
            this.setAttribute('data-display', 'all');
        }
    });
}
// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', async function () {
    // Wait for all managers to load
    await new Promise(function (resolve) {
        const checkLoaded = setInterval(function () {
            if (liveTracker.data && attacksManager.attacks.length > 0) {
                clearInterval(checkLoaded);
                resolve();
            }
        }, 100);
    });
    console.log('Initializing live page...');
    // Populate all elements
    populateRegionList();
    populateRegionsTable();
    populateRegionSelect();
    initializePalestineMap();
    initializeShowAllButton();
    // Initialize DataTables
    if (typeof jQuery !== 'undefined' && jQuery.fn.DataTable) {
        const table = jQuery('.list-view__table');
        dataTable = table.DataTable({
            order: false,
            searching: true,
            language: {
                search: i18n.t('Search'),
                lengthMenu: i18n.t('Show MENU entries'),
                info: i18n.t('Showing START to END of TOTAL entries'),
                infoEmpty: i18n.t('Showing 0 to 0 of 0 entries'),
                infoFiltered: i18n.t('(filtered from MAX total entries)'),
                paginate: {
                    first: i18n.t('First'),
                    last: i18n.t('Last'),
                    next: i18n.t('Next'),
                    previous: i18n.t('Previous')
                }
            }
        });
        // Search on enter
        jQuery("#list-view_filter").find('input').keypress(function (e) {
            if (e.which === 13) {
                e.preventDefault();
                dataTable.search(jQuery(this).val()).draw();
            }
        });
    }
    console.log('Live page initialized successfully!');
});