
// ============================================
// CELEBRITIES.HTML PAGE SPECIFIC FUNCTIONALITY
// ============================================
// Celebrities Manager
class CelebritiesManager {
    constructor() {
        this.celebrities = [];
        this.letters = [];
    }
    async loadCelebrities() {
        try {
            const response = await fetch('data/celebrities.json');
            this.celebrities = await response.json();
            this.extractLetters();
            return this.celebrities;
        } catch (error) {
            console.error('Error loading celebrities:', error);
            // Return empty array if file doesn't exist yet
            return [];
        }
    }
    extractLetters() {
        const lettersSet = new Set();
        this.celebrities.forEach(function (celebrity) {
            const firstLetter = celebrity.first_letter.toUpperCase();
            lettersSet.add(firstLetter);
        });
        this.letters = Array.from(lettersSet).sort();
    }
    getCelebritiesByLetter(letter) {
        return this.celebrities.filter(function (celebrity) {
            return celebrity.first_letter.toUpperCase() === letter.toUpperCase();
        });
    }
    searchCelebrities(query) {
        query = query.toLowerCase();
        return this.celebrities.filter(function (celebrity) {
            return celebrity.name.toLowerCase().includes(query);
        });
    }
}
// Initialize Celebrities Manager
const celebritiesManager = new CelebritiesManager();
// Populate letter filter buttons
function populateLetterFilters() {
    const container = document.getElementById('letter-filters');
    if (!container) return;
    // A-Z button already exists in HTML
    celebritiesManager.letters.forEach(function (letter) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-small btn-secondary btn-glossary-filter';
        btn.setAttribute('data-filter', letter.toUpperCase());
        btn.textContent = letter.toUpperCase();
        container.appendChild(btn);
    });
}
// Populate celebrities grid
function populateCelebritiesGrid() {
    const grid = document.getElementById('glossary-grid');
    if (!grid) return;
    grid.innerHTML = '';
    celebritiesManager.letters.forEach(function (letter) {
        const celebritiesForLetter = celebritiesManager.getCelebritiesByLetter(letter);
        if (celebritiesForLetter.length === 0) return; // Skip empty letters

        // Letter header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'col-12 glossary-item glossary-filter_A-Z glossary-filter_' + letter.toUpperCase();
        headerDiv.innerHTML = '<h2>' + letter.toUpperCase() + '</h2>';
        grid.appendChild(headerDiv);

        // Celebrities grid container
        const celebsDiv = document.createElement('div');
        celebsDiv.className = 'col-12 glossary-item glossary-filter_A-Z glossary-filter_' + letter.toUpperCase();

        // Create grid wrapper
        const mainWrapper = document.createElement('main');
        const gridWrap = document.createElement('div');
        gridWrap.className = 'grid-wrap';

        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid';

        // Add celebrities to grid
        celebritiesForLetter.forEach(function (celebrity, index) {
            const gridItem = document.createElement('a');
            gridItem.href = '#';
            gridItem.className = 'grid__item';
            gridItem.setAttribute('data-celeb-index', index);

            const bgDiv = document.createElement('div');
            bgDiv.className = 'grid__item-bg';

            const wrapDiv = document.createElement('div');
            wrapDiv.className = 'grid__item-wrap';

            const img = document.createElement('img');
            img.className = 'grid__item-img';
            img.src = 'assets/celebrities/img/' + celebrity.image;
            img.alt = celebrity.name;
            img.onerror = function () {
                this.src = 'assets/celebrities/img/placeholder.jpg'; // Fallback image
            };

            wrapDiv.appendChild(img);

            const title = document.createElement('h3');
            title.className = 'grid__item-title';
            title.textContent = celebrity.name;

            const number = document.createElement('h4');
            number.className = 'grid__item-number';
            number.textContent = celebrity.stance || 'N/A'; // Pro-Palestine / Neutral / Pro-Israel

            gridItem.appendChild(bgDiv);
            gridItem.appendChild(wrapDiv);
            gridItem.appendChild(title);
            gridItem.appendChild(number);

            gridContainer.appendChild(gridItem);
        });

        gridWrap.appendChild(gridContainer);
        mainWrapper.appendChild(gridWrap);

        // Create content sections for expanded view
        const content = document.createElement('div');
        content.className = 'content';

        celebritiesForLetter.forEach(function (celebrity) {
            const contentItem = document.createElement('div');
            contentItem.className = 'content__item';

            const intro = document.createElement('div');
            intro.className = 'content__item-intro';

            const img = document.createElement('img');
            img.className = 'content__item-img';
            img.src = 'assets/celebrities/img/' + celebrity.image;
            img.alt = celebrity.name;

            const titleH2 = document.createElement('h2');
            titleH2.className = 'content__item-title';
            titleH2.textContent = celebrity.name;

            intro.appendChild(img);
            intro.appendChild(titleH2);

            const subtitle = document.createElement('h3');
            subtitle.className = 'content__item-subtitle';
            subtitle.textContent = celebrity.subtitle || 'Their stance on Palestine';

            const textDiv = document.createElement('div');
            textDiv.className = 'content__item-text';
            textDiv.innerHTML = '<p>' + (celebrity.bio || 'Information about this celebrity will be added soon.') + '</p>';

            contentItem.appendChild(intro);
            contentItem.appendChild(subtitle);
            contentItem.appendChild(textDiv);

            content.appendChild(contentItem);
        });

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'content__close';
        closeBtn.textContent = i18n ? i18n.t('Close') : 'Close';
        content.appendChild(closeBtn);

        // Indicator SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'content__indicator icon icon--caret');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#icon-caret');
        svg.appendChild(use);
        content.appendChild(svg);

        mainWrapper.appendChild(content);
        celebsDiv.appendChild(mainWrapper);
        grid.appendChild(celebsDiv);
    });
    console.log('Populated celebrities grid with', celebritiesManager.letters.length, 'letter groups');
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

            const cardTitle = jQuery(this).find(".grid__item-title").text();

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
    console.log('Initializing celebrities page...');
    // Wait for celebrities manager to load
    await celebritiesManager.loadCelebrities();
    console.log('Total celebrities:', celebritiesManager.celebrities.length);
    console.log('Letters:', celebritiesManager.letters.join(', '));
    // Populate page elements
    populateLetterFilters();
    populateCelebritiesGrid();
    // Initialize Isotope (needs jQuery)
    if (typeof jQuery !== 'undefined') {
        initializeIsotope();
    }
    // Apply translations
    if (typeof i18n !== 'undefined') {
        i18n.applyTranslations();
    }
    console.log('Celebrities page initialized successfully!');
});
