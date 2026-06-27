const BOOKMARK_KEY = 'tr_bookmarks';

function injectBookmarkButtons(sectionsContainer) {
    // Fix #4: idempotency guard — matches injectSortBar pattern
    if (sectionsContainer.querySelector('.tr-bookmark-btn')) return;

    const sections = Array.from(sectionsContainer.getElementsByClassName('section-info-container'));
    // Fix #3: use .course class, not generic [id], so intermediate elements with ids don't intercept
    const courseEl = sectionsContainer.closest('.course');
    const courseId = courseEl?.id ?? '';
    const semester = document.getElementById('term-id-input')?.value ?? '';

    sections.forEach(section => injectBookmarkButton(section, courseId, semester));
    loadBookmarkStates(sections, courseId);
}

function injectBookmarkButton(sectionEl, courseId, semester) {
    const sectionIdContainer = sectionEl.querySelector('.section-id-container');
    if (!sectionIdContainer || sectionIdContainer.querySelector('.tr-bookmark-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'tr-bookmark-btn';
    btn.title = 'Bookmark this section';
    btn.textContent = '☆';

    btn.addEventListener('click', async () => {
        const sectionId = sectionEl.querySelector('.section-id')?.textContent?.trim() ?? '';
        const instructorName = sectionEl.querySelector('.section-instructor')?.textContent?.trim() ?? 'Unknown';
        const rating = sectionEl.getAttribute('data-tr-rating') ?? null;
        const openSeats = sectionEl.querySelector('.open-seats-count')?.textContent?.trim() ?? '?';

        const key = `${courseId}|${sectionId}`;
        const result = await toggleBookmark({ key, courseId, sectionId, instructorName, rating, openSeats, semester });
        if (result.error) return; // Fix #1: leave UI unchanged if storage write failed
        btn.textContent = result.isBookmarked ? '★' : '☆';
        btn.classList.toggle('tr-bookmark-active', result.isBookmarked);
    });

    sectionIdContainer.appendChild(btn);
}

function toggleBookmark({ key, courseId, sectionId, instructorName, rating, openSeats, semester }) {
    return new Promise(resolve => {
        chrome.storage.local.get(BOOKMARK_KEY, result => {
            const bookmarks = result[BOOKMARK_KEY] ?? {};
            const isBookmarked = !bookmarks[key];
            if (isBookmarked) {
                bookmarks[key] = { courseId, sectionId, instructorName, rating, openSeats, semester };
            } else {
                delete bookmarks[key];
            }
            // Fix #1: check chrome.runtime.lastError; resolve with error flag on failure
            chrome.storage.local.set({ [BOOKMARK_KEY]: bookmarks }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Terp Rater: bookmark save failed —', chrome.runtime.lastError.message);
                    resolve({ isBookmarked: !isBookmarked, error: true });
                    return;
                }
                resolve({ isBookmarked });
            });
        });
    });
}

function loadBookmarkStates(sections, courseId) {
    chrome.storage.local.get(BOOKMARK_KEY, result => {
        const bookmarks = result[BOOKMARK_KEY] ?? {};
        sections.forEach(section => {
            const sectionId = section.querySelector('.section-id')?.textContent?.trim() ?? '';
            const key = `${courseId}|${sectionId}`;
            if (bookmarks[key]) {
                const btn = section.querySelector('.section-id-container .tr-bookmark-btn');
                if (btn) {
                    btn.textContent = '★';
                    btn.classList.add('tr-bookmark-active');
                }
            }
        });
    });
}
