
// ============================================
// BRANDS.HTML PAGE SPECIFIC FUNCTIONALITY
// ============================================
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
                const firstLetter = brand.first_letter.toUpperCase();
                lettersSet.add(firstLetter);
            }
        });
        this.letters = Array.from(lettersSet).sort();
    }
    getBrandsByLetter(letter) {
        return this.brands.filter(brand => {
            // Only show main brands (not alternatives)
            return brand.alternative_id !== 0 &&
                brand.first_letter.toUpperCase() === letter.toUpperCase();
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
            styles += '.card-title-' + brand.id + ':hover span { display: none; }';
            styles += '.card-title-' + brand.id + ':hover p:before {';
            styles += '  content: "' + alternative.name.replace(/"/g, '\\"') + '";';
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
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
    console.log('Generated styles for', brandsManager.brands.filter(b => b.alternative_id !== 0).length, 'brands');
}
// Populate letter filter buttons
function populateLetterFilters() {
    const container = document.getElementById('letter-filters');
    if (!container) return;
    // A-Z button already exists in HTML
    brandsManager.letters.forEach(function (letter) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-small btn-secondary btn-glossary-filter';
        btn.setAttribute('data-filter', letter.toUpperCase());
        btn.textContent = letter.toUpperCase();
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
        headerDiv.className = 'col-12 glossary-item glossary-filter_A-Z glossary-filter_' + letter.toUpperCase();
        headerDiv.innerHTML = '<h2>' + letter.toUpperCase() + '</h2>';
        grid.appendChild(headerDiv);

        // Brands for this letter
        const brandsDiv = document.createElement('div');
        brandsDiv.className = 'col-12 glossary-item glossary-filter_A-Z glossary-filter_' + letter.toUpperCase();
        brandsDiv.setAttribute('dir', 'ltr');

        const ul = document.createElement('ul');
        ul.className = 'ch-grid';

        brandsForLetter.forEach(function (brand) {
            const alternative = brandsManager.getAlternative(brand);

            const li = document.createElement('li');
            li.className = 'card-title-' + brand.id;

            li.innerHTML = '<div class="ch-item">' +
                '<div class="ch-info">' +
                '<div class="ch-info-front ch-img-' + brand.id + '"></div>' +
                '<div class="ch-info-back ch-img-back-' + brand.id + '"></div>' +
                '</div>' +
                '</div>' +
                '<p class="card-title card-front"><span>' + brand.name + '</span></p>';

            ul.appendChild(li);

            // Log for debugging
            if (alternative) {
                console.log('Brand:', brand.name, '→ Alternative:', alternative.name);
            }
        });

        brandsDiv.appendChild(ul);
        grid.appendChild(brandsDiv);
    });
    console.log('Populated brands grid with', brandsManager.letters.length, 'letter groups');
}
// Initialize Isotope for filtering
function initializeIsotope() {
    const grid = jQuery("#glossary-grid");
    grid.isotope({
        itemSelector: ".glossary-item",
        layoutMode: "fitRows",
        filter: ".glossary-item:not(.hide-this-item)"
    });
    // Letter filter buttons
    jQuery(".btn-glossary-filter").on("click", function (evt) {
        const filter = jQuery(this).attr('data-filter');
        grid.isotope({
            filter: ".glossary-filter_" + filter + ":not(.hide-this-item)",
            layoutMode: "fitRows"
        });
    });
    // Search functionality
    jQuery("#glossary-search-exp").on("keyup", function (evt) {
        const searchExp = jQuery(this).val();
        jQuery(".glossary-item").each(function (index) {
            jQuery(this).removeClass("hide-this-item");

            const cardTitle = jQuery(this).find(".card-title").text();

            if (cardTitle.toLowerCase().indexOf(searchExp.toLowerCase()) >= 0) {
                // Match found
            } else {
                jQuery(this).addClass("hide-this-item");
            }
        });

        grid.isotope({
            itemSelector: ".glossary-item",
            layoutMode: "fitRows",
            filter: ".glossary-item:not(.hide-this-item)"
        });
    });
}
// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Initializing brands page...');
    // Wait for brands manager to load
    await brandsManager.loadBrands();
    const mainBrands = brandsManager.brands.filter(b => b.alternative_id !== 0);
    const alternativeBrands = brandsManager.brands.filter(b => b.alternative_id === 0);
    console.log('Total brands:', brandsManager.brands.length);
    console.log('Main brands (to boycott):', mainBrands.length);
    console.log('Alternative brands (replacements):', alternativeBrands.length);
    console.log('Letters:', brandsManager.letters.join(', '));
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
    console.log('Brands page initialized successfully!');
});
