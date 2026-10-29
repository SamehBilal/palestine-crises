
// ============================================
// BRANDS.HTML PAGE SPECIFIC FUNCTIONALITY
// ============================================
// Language helpers (currentLang comes from app.js)
function isArabic() {
    return typeof currentLang !== 'undefined' && currentLang === 'ar';
}
// Fold spelling variants so searches match: case, Arabic diacritics/tatweel, alef forms, ta marbuta, alef maqsura
function normalizeSearch(text) {
    return (text || '').toLowerCase()
        .replace(/[ً-ْـ]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .trim();
}
function brandName(brand) {
    return isArabic() && brand.ar_name ? brand.ar_name : brand.name;
}
// Letter group: first letter of the Arabic name in Arabic (derived, since first_ar_letter is unreliable)
function brandLetter(brand) {
    if (isArabic() && brand.ar_name) {
        return normalizeSearch(brand.ar_name).charAt(0);
    }
    return brand.first_letter.toUpperCase();
}
// Brands Manager
class BrandsManager {
    constructor() {
        this.brands = [];
        this.letters = [];
        this.brandsMap = {}; // Map of id -> brand for quick lookup
    }
    async loadBrands() {
        try {
            const response = await fetch('data/brands.json');
            this.brands = await response.json();
            // Create a map for quick lookups
            this.brands.forEach(brand => {
                this.brandsMap[brand.id] = brand;
            });

            this.extractLetters();
            return this.brands;
        } catch (error) {
            console.error('Error loading brands:', error);
        }
    }
    extractLetters() {
        const lettersSet = new Set();
        this.brands.forEach(function (brand) {
            // Only extract letters from main brands (not alternatives)
            if (brand.alternative_id !== 0) {
                lettersSet.add(brandLetter(brand));
            }
        });
        this.letters = Array.from(lettersSet).sort((a, b) => a.localeCompare(b, isArabic() ? 'ar' : 'en'));
    }
    getBrandsByLetter(letter) {
        return this.brands.filter(brand => {
            // Only show main brands (not alternatives)
            return brand.alternative_id !== 0 && brandLetter(brand) === letter;
        });
    }
    getAlternative(brand) {
        // Get the alternative brand by its ID
        if (brand.alternative_id && brand.alternative_id !== 0) {
            return this.brandsMap[brand.alternative_id];
        }
        return null;
    }
    searchBrands(query) {
        query = query.toLowerCase();
        return this.brands.filter(function (brand) {
            // Only search in main brands
            return brand.alternative_id !== 0 && brand.name.toLowerCase().includes(query);
        });
    }
}
// Initialize Brands Manager
const brandsManager = new BrandsManager();
// Generate dynamic CSS for brand images
function generateBrandStyles() {
    let styles = '';
    brandsManager.brands.forEach(function (brand) {
        // Only generate styles for main brands (those with alternative_id !== 0)
        if (brand.alternative_id === 0) return;
        const alternative = brandsManager.getAlternative(brand);

        // Front image (the brand to boycott - e.g., 7UP)
        styles += '.ch-img-' + brand.id + ' {';
        styles += '  background-image: url("assets/img/brands/' + brand.logo + '");';
        styles += '  background-position: center;';
        styles += '  background-repeat: no-repeat;';
        styles += '  background-size: cover;';
        styles += '}';

        // Back image (the alternative - e.g., Spiro Spathis)
        if (alternative) {
            styles += '.ch-img-back-' + brand.id + ' {';
            styles += '  background-image: url("assets/img/brands/' + alternative.logo + '");';
            styles += '  background-position: center;';
            styles += '  background-repeat: no-repeat;';
            styles += '  background-size: cover;';
            styles += '}';

            // Hover effect to show alternative name
            styles += '.card-title-' + brand.id + ':hover span, .card-title-' + brand.id + ':focus span { display: none; }';
            styles += '.card-title-' + brand.id + ':hover p:before, .card-title-' + brand.id + ':focus p:before {';
            styles += '  content: "' + brandName(alternative).replace(/["\\]/g, '\\$&') + '";';
            styles += '}';
        } else {
            // No alternative, just use same image for back
            styles += '.ch-img-back-' + brand.id + ' {';
            styles += '  background-image: url("assets/img/brands/' + brand.logo + '");';
            styles += '  background-position: center;';
            styles += '  background-repeat: no-repeat;';
            styles += '  background-size: cover;';
            styles += '}';
        }
    });
    // Inject styles
    const styleElement = document.createElement('style');
    styleElement.id = 'brand-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
}
// Populate letter filter buttons
function populateLetterFilters() {
    const container = document.getElementById('letter-filters');
    if (!container) return;
    // A-Z button already exists in HTML
    brandsManager.letters.forEach(function (letter) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-small btn-secondary btn-glossary-filter';
        btn.setAttribute('data-filter', letter);
        btn.textContent = letter;
        container.appendChild(btn);
    });
}
// Populate brands grid
function populateBrandsGrid() {
    const grid = document.getElementById('glossary-grid');
    if (!grid) return;
    grid.innerHTML = '';
    brandsManager.letters.forEach(function (letter) {
        const brandsForLetter = brandsManager.getBrandsByLetter(letter);
        if (brandsForLetter.length === 0) return; // Skip empty letters

        // Letter header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'col-12 glossary-item glossary-filter_A-Z glossary-filter_' + letter;
        headerDiv.setAttribute('data-letter', letter);
        const heading = document.createElement('h2');
        heading.textContent = letter;
        headerDiv.appendChild(heading);
        grid.appendChild(headerDiv);

        // Brands for this letter
        const brandsDiv = document.createElement('div');
        brandsDiv.className = 'col-12 glossary-item glossary-filter_A-Z glossary-filter_' + letter;
        brandsDiv.setAttribute('data-letter', letter);

        const ul = document.createElement('ul');
        ul.className = 'ch-grid';

        brandsForLetter.forEach(function (brand) {
            const alternative = brandsManager.getAlternative(brand);

            const li = document.createElement('li');
            li.className = 'card-title-' + brand.id;
            // Search matches the brand or its alternative, in either language
            li.setAttribute('data-search', normalizeSearch([
                brand.name, brand.ar_name,
                alternative && alternative.name, alternative && alternative.ar_name
            ].join(' ')));

            li.innerHTML = '<div class="ch-item">' +
                '<div class="ch-info">' +
                '<div class="ch-info-front ch-img-' + brand.id + '"></div>' +
                '<div class="ch-info-back ch-img-back-' + brand.id + '"></div>' +
                '</div>' +
                '</div>' +
                '<p class="card-title card-front"><span></span></p>';
            li.querySelector('.card-title span').textContent = brandName(brand);
            // Focusable so keyboard and touch users can flip the card to see the alternative
            // (style7.css flips on :focus as well as :hover); screen readers get it as a label
            li.tabIndex = 0;
            li.setAttribute('aria-label', alternative
                ? brandName(brand) + ' → ' + brandName(alternative)
                : brandName(brand));

            ul.appendChild(li);
        });

        brandsDiv.appendChild(ul);
        grid.appendChild(brandsDiv);
    });
}
// Initialize Isotope for filtering
function initializeIsotope() {
    const grid = jQuery("#glossary-grid");
    // Letter filter and search work together: hide non-matching brands, then hide any
    // letter group that is filtered out or has no brands left
    let activeLetter = 'A-Z';
    function applyFilters() {
        const query = normalizeSearch(jQuery("#glossary-search-exp").val());
        const visibleByLetter = {};
        grid.find('li[data-search]').each(function () {
            const matches = !query || this.getAttribute('data-search').includes(query);
            this.style.display = matches ? '' : 'none';
            if (matches) {
                const letter = jQuery(this).closest('.glossary-item').attr('data-letter');
                visibleByLetter[letter] = true;
            }
        });
        grid.isotope({
            itemSelector: ".glossary-item",
            layoutMode: "fitRows",
            filter: function (itemElem) {
                const letter = (itemElem || this).getAttribute('data-letter');
                return (activeLetter === 'A-Z' || letter === activeLetter) && visibleByLetter[letter] === true;
            }
        });
    }
    applyFilters();
    // Letter filter buttons
    jQuery(".btn-glossary-filter").on("click", function (evt) {
        activeLetter = jQuery(this).attr('data-filter');
        applyFilters();
    });
    // Search functionality
    jQuery("#glossary-search-exp").on("input", applyFilters);
}
// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', async function () {
    // Wait for brands manager to load
    await brandsManager.loadBrands();
    // Generate dynamic styles
    generateBrandStyles();
    // Populate page elements
    populateLetterFilters();
    populateBrandsGrid();
    // Initialize Isotope (needs jQuery)
    if (typeof jQuery !== 'undefined') {
        initializeIsotope();
    }
    // Apply translations
    if (typeof i18n !== 'undefined') {
        i18n.applyTranslations();
    }
});
