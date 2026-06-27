const BOOKMARK_KEY = 'tr_bookmarks';

function semesterLabel(val) {
    if (!val) return '';
    const year = val.slice(0, 4);
    const month = val.slice(4, 6);
    const seasons = { '01': 'Spring', '05': 'Summer', '08': 'Fall', '12': 'Winter' };
    return `${seasons[month] ?? month} ${year}`;
}

function renderBookmarks(bookmarks) {
    const list = document.getElementById('bookmark-list');
    const entries = Object.entries(bookmarks);

    if (entries.length === 0) {
        list.innerHTML = '<p class="empty-state">No bookmarks yet — click ☆ on any section.</p>';
        return;
    }

    const byCourse = {};
    entries.forEach(([key, data]) => {
        if (!byCourse[data.courseId]) byCourse[data.courseId] = [];
        byCourse[data.courseId].push({ key, ...data });
    });

    list.innerHTML = '';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-all-btn';
    clearBtn.textContent = 'Clear all';
    clearBtn.addEventListener('click', () => {
        chrome.storage.local.remove(BOOKMARK_KEY, () => renderBookmarks({}));
    });
    list.appendChild(clearBtn);

    Object.entries(byCourse).forEach(([courseId, sections]) => {
        const group = document.createElement('div');
        group.className = 'course-group';

        const header = document.createElement('div');
        header.className = 'course-header';
        const courseIdEl = document.createElement('span');
        courseIdEl.className = 'course-id';
        courseIdEl.textContent = courseId;
        const semEl = document.createElement('span');
        semEl.className = 'semester';
        semEl.textContent = semesterLabel(sections[0].semester);
        header.appendChild(courseIdEl);
        header.appendChild(semEl);
        group.appendChild(header);

        sections.forEach(({ key, sectionId, instructorName, rating, openSeats }) => {
            const row = document.createElement('div');
            row.className = 'section-row';

            const secNumEl = document.createElement('span');
            secNumEl.className = 'section-num';
            secNumEl.textContent = `§ ${sectionId}`;

            const instrEl = document.createElement('span');
            instrEl.className = 'instructor';
            instrEl.textContent = instructorName;

            const ratingEl = document.createElement('span');
            ratingEl.className = 'rating';
            ratingEl.textContent = rating ? `★ ${rating}` : '—';

            const seatsEl = document.createElement('span');
            seatsEl.className = 'seats';
            seatsEl.textContent = `${openSeats} seats`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.title = 'Remove bookmark';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                chrome.storage.local.get(BOOKMARK_KEY, result => {
                    const bm = result[BOOKMARK_KEY] ?? {};
                    delete bm[key];
                    chrome.storage.local.set({ [BOOKMARK_KEY]: bm }, () => {
                        row.remove();
                        if (!group.querySelector('.section-row')) group.remove();
                        if (!list.querySelector('.course-group')) renderBookmarks({});
                    });
                });
            });

            row.appendChild(secNumEl);
            row.appendChild(instrEl);
            row.appendChild(ratingEl);
            row.appendChild(seatsEl);
            row.appendChild(removeBtn);
            group.appendChild(row);
        });

        list.appendChild(group);
    });
}

chrome.storage.local.get(BOOKMARK_KEY, result => {
    renderBookmarks(result[BOOKMARK_KEY] ?? {});
});
