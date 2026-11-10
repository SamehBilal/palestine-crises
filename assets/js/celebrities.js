// ============================================
// CELEBRITIES.HTML PAGE SPECIFIC FUNCTIONALITY
// ============================================
// A card per person from data/celebrities.json, grouped by first letter, in the page language.
// The letter buttons and the search box filter the cards; the bio opens in place (<details>).
const celebrityPhotoPath = 'assets/celebrities/img/';

function celebField(celebrity, field) {
    return currentLang === 'ar' && celebrity['ar_' + field] ? celebrity['ar_' + field] : celebrity[field];
}

function celebLetter(celebrity) {
    return (currentLang === 'ar' && celebrity.first_ar_letter ? celebrity.first_ar_letter : celebrity.first_letter).toUpperCase();
}

// Initials stand in for a photo we don't have, or one that fails to load
function initials(name) {
    return name.split(/\s+/).map(word => word[0]).slice(0, 2).join('');
}

function createCard(celebrity) {
    const card = document.createElement('article');
    card.className = 'celeb-card';
    card.dataset.search = [celebrity.name, celebrity.ar_name || ''].join(' ').toLowerCase();

    const photo = document.createElement('div');
    photo.className = 'celeb-photo';
    photo.setAttribute('aria-hidden', 'true');
    photo.textContent = initials(celebField(celebrity, 'name'));
    if (celebrity.image) {
        const img = document.createElement('img');
        img.src = celebrityPhotoPath + celebrity.image;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = function () { this.remove(); };
        photo.appendChild(img);
    }

    const body = document.createElement('div');
    body.className = 'celeb-body';
    const name = document.createElement('h3');
    name.textContent = celebField(celebrity, 'name');
    const stance = document.createElement('span');
    stance.className = 'celeb-stance' + (celebrity.stance === 'Pro-Palestine' ? ' is-pro' : '');
    stance.textContent = celebField(celebrity, 'stance') || i18n.t('Unknown');
    const subtitle = document.createElement('p');
    subtitle.className = 'celeb-subtitle';
    subtitle.textContent = celebField(celebrity, 'subtitle') || '';

    const more = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = i18n.t('Read more');
    const bio = document.createElement('p');
    bio.textContent = celebField(celebrity, 'bio') || '';
    more.append(summary, bio);

    body.append(name, stance, subtitle, more);
    card.append(photo, body);
    return card;
}

function renderCelebrities(celebrities) {
    const grid = document.getElementById('celeb-grid');
    const filters = document.getElementById('letter-filters');
    grid.innerHTML = '';
    filters.querySelectorAll('[data-filter]:not([data-filter="all"])').forEach(b => b.remove());

    const letters = [...new Set(celebrities.map(celebLetter))].sort((a, b) => a.localeCompare(b, currentLang));
    letters.forEach(letter => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-small btn-secondary btn-glossary-filter';
        btn.dataset.filter = letter;
        btn.textContent = letter;
        btn.setAttribute('aria-pressed', 'false');
        filters.appendChild(btn);

        const section = document.createElement('section');
        section.className = 'celeb-group';
        section.dataset.letter = letter;
        const heading = document.createElement('h2');
        heading.textContent = letter;
        const list = document.createElement('div');
        list.className = 'celeb-list';
        celebrities.filter(c => celebLetter(c) === letter)
            .sort((a, b) => celebField(a, 'name').localeCompare(celebField(b, 'name'), currentLang))
            .forEach(c => list.appendChild(createCard(c)));
        section.append(heading, list);
        grid.appendChild(section);
    });
}

// Show the cards that match both the chosen letter and the search text
function applyFilters() {
    const active = document.querySelector('#letter-filters [aria-pressed="true"]');
    const letter = active ? active.dataset.filter : 'all';
    const query = document.getElementById('glossary-search-exp').value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('.celeb-group').forEach(group => {
        let visible = 0;
        group.querySelectorAll('.celeb-card').forEach(card => {
            const match = (letter === 'all' || group.dataset.letter === letter) && (!query || card.dataset.search.includes(query));
            card.hidden = !match;
            if (match) visible++;
        });
        group.hidden = visible === 0;
        shown += visible;
    });
    document.getElementById('celeb-empty').hidden = shown > 0;
}

document.addEventListener('DOMContentLoaded', async function () {
    await appReady;
    let celebrities = [];
    try {
        celebrities = await (await fetch(DATA_PATH + 'celebrities.json')).json();
    } catch (error) {
        console.error('Error loading celebrities:', error);
    }
    renderCelebrities(celebrities);

    document.getElementById('letter-filters').addEventListener('click', function (e) {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        this.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        applyFilters();
    });
    document.getElementById('glossary-search-exp').addEventListener('input', applyFilters);
    applyFilters();
    i18n.applyTranslations();
});
