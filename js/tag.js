function getTagColor(value, maxValue, grayZero){
    const clampedValue = Math.min(Math.max(value, 0), maxValue)
    if(grayZero && value == 0){
        return `grey`;
    }

    const hue = (clampedValue / maxValue) * 120;
    return `hsl(${hue}, 95%, 35%)`;
}

function createTagContainer(course){
    const courseTitle = course.querySelector(".course-title");
    const tagContainer = document.createElement("span");
    tagContainer.className = "terp-rater-tag-container";
    courseTitle.insertAdjacentElement("afterend", tagContainer);

    return tagContainer;
}

function createTag(textContent, backgroundColor){
    const tag = tagTemplate.cloneNode();
    tag.textContent = textContent;
    tag.style.backgroundColor = backgroundColor;
    return tag;
}

async function addGpaTag(course, tagContainer){
    const courseGpa = await getCourseGpa(course.id);

    if(courseGpa > 0){
        const gpaTag = createTag(`🎓 ${courseGpa}`, getTagColor(courseGpa - POOR_GPA_THRESHOLD, 4 - POOR_GPA_THRESHOLD, true));
        const gpaContainer = addTooltip(gpaTag, `Represents the average GPA earned by students in ${course.id}.`);
        tagContainer.append(gpaContainer);
    }
}

async function addSeatsTags(course, tagContainer){
    const sectionSeats = await getCourseSeats(course);
    if(!sectionSeats){
        console.warn(`Failed to get section data for ${course.id}`);
        return;
    }

    if(sectionSeats.total){
        appendOpenSeatsTag(sectionSeats, tagContainer, course.id);

        if(sectionSeats.waitlist > 0){
            appendWaitlistTag(sectionSeats, tagContainer);
        }
    }
}

function appendOpenSeatsTag(sectionSeats, tagContainer, courseId){
    const openSeatsText = sectionSeats.open > 1 ? `${sectionSeats.open} seats left` :
    sectionSeats.open === 1 ? "1 seat left" : "No seats left";

    const idealSeats = sectionSeats.open > IDEAL_OPENINGS ? sectionSeats.open : IDEAL_OPENINGS;

    const openSeatsTag = createTag(openSeatsText, getTagColor(sectionSeats.open, idealSeats, false));
    const openSeatsContainer = addTooltip(openSeatsTag, sectionSeats.open == 0 ? 
        `There are no open seats available throughout ${courseId}'s ${sectionSeats.totalSections} section(s).`:
        `${sectionSeats.open} open seats left among ${sectionSeats.openSections} section(s).`);
    
    tagContainer.append(openSeatsContainer);
}

function appendWaitlistTag(sectionSeats, tagContainer){
    const waitlistTag = createTag(`${sectionSeats.waitlist} waitlisted`, "#d5b60a");
    const waitlistContainer = addTooltip(waitlistTag, `${sectionSeats.waitlist} student(s) waitlisted throughout ${sectionSeats.waitlistedSections} section(s).`)
    tagContainer.appendChild(waitlistContainer);
}

function appendRatingTag(instructorRecord, instructorElement, instructorName){
    const ratingTag = tagTemplate.cloneNode();
    ratingTag.classList.add("rating");
    ratingTag.textContent = `\t${instructorRecord.rating}`;
    ratingTag.style.backgroundColor = getTagColor(instructorRecord.rating, 5, true);

    addRatingModal(ratingTag, instructorName, instructorRecord);
    instructorElement.insertAdjacentElement("afterend", ratingTag);
}