// Fix #2: track active sort state per container so late-loading ratings can trigger a re-sort
const _activeSorts = new WeakMap();

function injectSortBar(sectionsContainer) {
    if(sectionsContainer.querySelector('.tr-sort-bar')) return;

    const sortBar = document.createElement('div');
    sortBar.className = 'tr-sort-bar';

    let activeKey = 'default';
    let activeDir = 1;
    let hideFull = false;

    // Fix #2: initialise state in map
    _activeSorts.set(sectionsContainer, { key: 'default', dir: 1, hideFull: false });

    const allBtns = [];

    function updateButtonLabels() {
        ratingBtn.textContent = activeKey === 'rating'
            ? `★ Rating ${activeDir === -1 ? '↓' : '↑'}`
            : '★ Rating';
        seatsBtn.textContent = activeKey === 'seats'
            ? `Seats ${activeDir === -1 ? '↓' : '↑'}`
            : 'Seats';
    }

    function setActive(btn, key, dir) {
        allBtns.forEach(b => b.classList.remove('tr-sort-active'));
        btn.classList.add('tr-sort-active');
        activeKey = key;
        activeDir = dir;
        // Fix #2: keep map in sync so notifyRatingLoaded can re-sort
        _activeSorts.set(sectionsContainer, { key, dir, hideFull });
        updateButtonLabels();
    }

    const defaultBtn = document.createElement('button');
    defaultBtn.className = 'tr-sort-btn tr-sort-active';
    defaultBtn.textContent = 'Default';
    defaultBtn.addEventListener('click', () => {
        setActive(defaultBtn, 'default', 1);
        sortSections(sectionsContainer, 'default', 1);
        applyFilter(sectionsContainer, hideFull);
    });

    const ratingBtn = document.createElement('button');
    ratingBtn.className = 'tr-sort-btn';
    ratingBtn.textContent = '★ Rating';
    ratingBtn.addEventListener('click', () => {
        const newDir = activeKey === 'rating' ? -activeDir : -1;
        setActive(ratingBtn, 'rating', newDir);
        sortSections(sectionsContainer, 'rating', newDir);
        applyFilter(sectionsContainer, hideFull);
    });

    const seatsBtn = document.createElement('button');
    seatsBtn.className = 'tr-sort-btn';
    seatsBtn.textContent = 'Seats';
    seatsBtn.addEventListener('click', () => {
        const newDir = activeKey === 'seats' ? -activeDir : -1;
        setActive(seatsBtn, 'seats', newDir);
        sortSections(sectionsContainer, 'seats', newDir);
        applyFilter(sectionsContainer, hideFull);
    });

    allBtns.push(defaultBtn, ratingBtn, seatsBtn);

    const hideFullLabel = document.createElement('label');
    hideFullLabel.className = 'tr-sort-hide-full';
    const hideFullCheckbox = document.createElement('input');
    hideFullCheckbox.type = 'checkbox';
    hideFullCheckbox.addEventListener('change', () => {
        hideFull = hideFullCheckbox.checked;
        // Fix #2: keep map in sync
        _activeSorts.set(sectionsContainer, { key: activeKey, dir: activeDir, hideFull });
        applyFilter(sectionsContainer, hideFull);
    });
    hideFullLabel.appendChild(hideFullCheckbox);
    hideFullLabel.append(' Hide full');

    const labelEl = document.createElement('span');
    labelEl.className = 'tr-sort-label';
    labelEl.textContent = 'Sort:';

    sortBar.appendChild(labelEl);
    sortBar.appendChild(defaultBtn);
    sortBar.appendChild(ratingBtn);
    sortBar.appendChild(seatsBtn);
    sortBar.appendChild(hideFullLabel);

    sectionsContainer.prepend(sortBar);
}

// Fix #2: called by tag.js after data-tr-rating is written; re-sorts if rating sort is active
function notifyRatingLoaded(sectionsContainer) {
    const state = _activeSorts.get(sectionsContainer);
    if (!state || state.key !== 'rating') return;
    sortSections(sectionsContainer, 'rating', state.dir);
    applyFilter(sectionsContainer, state.hideFull);
}

// Actual sortable units are div.section elements inside div.sections
function getSectionEls(sectionsContainer) {
    const grid = sectionsContainer.querySelector('.sections');
    if (!grid) return [];
    return Array.from(grid.children).filter(el => el.classList.contains('section'));
}

function sortSections(sectionsContainer, key, dir) {
    const grid = sectionsContainer.querySelector('.sections');
    if (!grid) return;

    const sections = getSectionEls(sectionsContainer);

    sections.sort((a, b) => {
        if (key === 'default') {
            const idA = a.querySelector('.section-id')?.textContent?.trim() ?? '';
            const idB = b.querySelector('.section-id')?.textContent?.trim() ?? '';
            return idA.localeCompare(idB);
        }
        if (key === 'rating') {
            const rA = parseFloat(a.querySelector('.section-info-container')?.getAttribute('data-tr-rating') ?? '-1');
            const rB = parseFloat(b.querySelector('.section-info-container')?.getAttribute('data-tr-rating') ?? '-1');
            return (rA - rB) * dir;
        }
        if (key === 'seats') {
            const sA = parseInt(a.querySelector('.open-seats-count')?.textContent ?? '0') || 0;
            const sB = parseInt(b.querySelector('.open-seats-count')?.textContent ?? '0') || 0;
            return (sA - sB) * dir;
        }
        return 0;
    });

    // Fix #5: batch all DOM moves into one fragment to avoid per-element reflows
    const frag = document.createDocumentFragment();
    sections.forEach(el => frag.appendChild(el));
    grid.appendChild(frag);
}

function applyFilter(sectionsContainer, hideFull) {
    getSectionEls(sectionsContainer).forEach(section => {
        const openSeats = parseInt(section.querySelector('.open-seats-count')?.textContent) || 0;
        section.style.display = (hideFull && openSeats === 0) ? 'none' : '';
    });
}
