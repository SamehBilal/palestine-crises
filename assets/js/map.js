
// ============================================
// MAP.HTML PAGE SPECIFIC FUNCTIONALITY
// ============================================
// Map region data with deaths
let mapRegions = [];
let selectedRegion = null;
// Initialize map colors and tooltips (getColorForDeaths is in app.js)
function initializeOriginalMap() {
    // Populate regions array from attacks data
    mapRegions = attacksManager.attacks.map(function (attack) {
        return {
            region_name: i18n.t(attack.region_name),
            region_code: 'PS-' + regionsManager.getSvgCode(attack.region_id),
            deaths: attack.total_deaths,
            injuries: attack.total_injuries,
            women: attack.women_deaths,
            children: attack.children_deaths,
            displaced: attack.total_displaced
        };
    });
    // Color each region
    mapRegions.forEach(function (region) {
        const element = document.querySelector('#' + region.region_code);
        if (element) {
            const color = getColorForDeaths(region.deaths);
            element.style.fill = color;
            element.setAttribute('data-region', JSON.stringify(region));
        }
    });
    // Add hover tooltips
    document.querySelectorAll('.palestine-map path').forEach(function (path) {
        path.addEventListener('mouseover', function (e) {
            const regionData = this.getAttribute('data-region');
            if (regionData) {
                const region = JSON.parse(regionData);
                const panel = document.createElement('div');
                panel.className = 'info_panel';
                fillRegionTooltip(panel, region.region_name, region.deaths);
                document.body.appendChild(panel);
            }
        });
        path.addEventListener('mouseleave', function () {
            document.querySelectorAll('.info_panel').forEach(p => p.remove());
        });

        path.addEventListener('mousemove', function (e) {
            const panel = document.querySelector('.info_panel');
            if (panel) {
                panel.style.top = (e.pageY - 50) + 'px';
                panel.style.left = (e.pageX - (panel.offsetWidth / 2)) + 'px';
            }
        });

        path.addEventListener('click', function () {
            const regionData = this.getAttribute('data-region');
            if (regionData) {
                const region = JSON.parse(regionData);
                displayRegionDetails(region);
            }
        });
    });
}
// Display region details in the info box
function displayRegionDetails(region) {
    selectedRegion = region;
    document.querySelector('.total-deaths').textContent = region.deaths.toLocaleString();
    document.querySelector('.total-injuries').textContent = region.injuries.toLocaleString();
    document.querySelector('.women-deaths').textContent = region.women.toLocaleString();
    document.querySelector('.children-deaths').textContent = region.children.toLocaleString();
    document.querySelector('.total-displaced').textContent = region.displaced.toLocaleString();
}
// Populate region select dropdown
function populateRegionSelect() {
    const select = document.getElementById('region-select');
    if (!select) return;
    select.innerHTML = '';
    mapRegions.forEach(function (region) {
        const option = document.createElement('option');
        option.value = region.region_code;
        option.textContent = region.region_name;
        option.setAttribute('data-image', 'assets/img/palestine.webp');
        select.appendChild(option);
    });
    // Initialize Select2 if available
    if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
        function formatState(opt) {
            if (!opt.id) return opt.text;
            const optimage = jQuery(opt.element).attr('data-image');
            if (!optimage) return opt.text;
            const option = flagOption(optimage, opt.text);
            option.find('img').css({ width: '30px', marginInlineEnd: '10px' });
            return option;
        }
        jQuery(select).select2({
            templateSelection: formatState,
            templateResult: formatState
        });

        jQuery(select).on('change', function () {
            const regionCode = jQuery(this).val();
            const region = mapRegions.find(r => r.region_code === regionCode);
            if (region) {
                displayRegionDetails(region);
            }
        });
    }
    // Display first region by default
    if (mapRegions.length > 0) {
        displayRegionDetails(mapRegions[0]);
    }
}
// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', async function () {
    // Shared data (translations, tracker, regions, attacks) from app.js
    await appReady;
    initializeOriginalMap();
    populateRegionSelect();
    // Apply translations
    if (typeof i18n !== 'undefined') {
        i18n.applyTranslations();
    }
});
