const courseElements = document.body.getElementsByClassName("course");
const semesterValue = document.getElementById("term-id-input")?.value;
const tagTemplate = document.createElement("span");
tagTemplate.className = "terp-rater-tag"

if(!semesterValue){
    console.warn("Semester not found.");
}

const API_BASE_PLANET_TERP = "https://planetterp.com/api/v1/";
const API_BASE_SCHEDULE_OF_CLASSES = "https://app.testudo.umd.edu/soc/";

const loadedInstructors = new Map();
const domParser = new DOMParser();

const IDEAL_OPENINGS = 30;
const POOR_GPA_THRESHOLD = 2.0;

async function addCourseTags(){
    if(!courseElements || courseElements.length == 0){
        console.warn("No courses available for processing.");
        return;
    }

    for(const course of courseElements){
        try{
            const description = course.querySelector(".course-basic-info-container");
            if(!description){
                console.warn(`Description container not found for ${course.id}`);
                continue;
            }

            const tagContainer = createTagContainer(course);
            await addGpaTag(course, tagContainer);
            await addSeatsTags(course, tagContainer);

            const instructors = course.getElementsByClassName("section-instructor");
            rateInstructors(instructors);

        }catch(e){
            console.error(`Error processing ${course.id}: ${e}`)
        }   
    }
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

async function getCourseGpa(courseId){
    try{
        const response = await fetch(`${API_BASE_PLANET_TERP}course?name=${courseId}`); 
        if(!response.ok){
            return null;
        }else{
            const courseJson = await response.json();
            if(courseJson){
                const averageGPA = (Math.round(courseJson.average_gpa*100)/100).toFixed(2);
                return averageGPA;
            }
        }
    }catch(e){
        console.warn(`Unable to find a record for ${courseId}`);
        return null;
    }
}

async function rateInstructors(instructorsToLoad){

    if(!instructorsToLoad || instructorsToLoad.length === 0){
        console.warn("No instructors provided.");
        return;
    }
   
    for(const instructor of instructorsToLoad){
        const instructorName = instructor.innerText;

        if(instructorName && !instructorName.includes("TBA")){
            await processInstructor(instructorName, instructor);
        }
    }
}

async function processInstructor(instructorName, instructorElement){
    if(!loadedInstructors.has(instructorName)){
        await fetchInstructorData(instructorName);
    }

    const instructorRecord = loadedInstructors.get(instructorName);
    if(instructorRecord?.rating){
        appendRatingTag(instructorRecord, instructorElement, instructorName);
    }
}

async function fetchInstructorData(instructorName){
    try{
        const response = await fetch(`${API_BASE_PLANET_TERP}professor?name=${instructorName}&reviews=true`);
        if(!response.ok){
            throw new Error(`${instructorName} doesn't have a record on PlanetTerp.`);
        } 

        const professorJson = await response.json();
        const rating = professorJson?.average_rating 
        ? (Math.round(professorJson.average_rating*100)/100).toFixed(2)
        : null;
        const reviews = professorJson?.reviews || [];
        const slug = professorJson?.slug || "";

        loadedInstructors.set(instructorName, {rating, reviews, slug});

    }catch(error){
        loadedInstructors.set(instructorName, {rating: null});
        console.warn(`Unable to find a record for ${instructorName}`);
    }
}

function appendRatingTag(instructorRecord, instructorElement, instructorName){
    const ratingTag = tagTemplate.cloneNode();
    ratingTag.classList.add("rating");
    ratingTag.textContent = `\t${instructorRecord.rating}`;
    ratingTag.style.backgroundColor = getTagColor(instructorRecord.rating, 5, true);

    addRatingModal(ratingTag, instructorName, instructorRecord);
    instructorElement.insertAdjacentElement("afterend", ratingTag);
}
    
//ALLOW FILTER HANDLING (Blended options, hybrid, etc.)
async function getCourseSeats(course){
    if(!course){
        console.error('No course provided.')
        return null;
    }

    try{
        const courseData = await fetchCourseData(course.id);
        if(!courseData) return null;

        const sections = courseData.getElementsByClassName("section-info-container");
        return calculateSeatAvailability(sections);

    }catch(error){
        console.error(`Error fetching course data for ${course.id}.`)
        return null;
    }
}

async function fetchCourseData(courseId) {
    try{
        const response = await fetch(`${API_BASE_SCHEDULE_OF_CLASSES}${semesterValue}/sections?courseIds=${courseId}`);
        if(!response.ok){
            console.error(`HTTP Error: Status: ${response.status}`);
            return null;
        }

        const courseText = await response.text();
        return domParser.parseFromString(courseText, "text/html");

    }catch(error){
        console.error(`Failed to fetch course data for ${courseId}: ${error.message}`);
        return null;
    }
}

function calculateSeatAvailability(sections){
    
    let totalSeats = 0;
    let totalOpen = 0;
    let totalWaitlisted = 0;
    let openSections = 0;
    let waitlistedSections = 0;

    for(const section of sections){
        
        const sectionData = getSectionData(section);
        
        if(sectionData){
            totalSeats += sectionData.totalCount;
            totalOpen += sectionData.openCount;
            totalWaitlisted += sectionData.waitlistCount;

            if(sectionData.openCount > 0) openSections++;
            if(sectionData.waitlistCount > 0) waitlistedSections++;
            
        }else{
            const sectionId = section.querySelector(".section-id")?.textContent || "Unknown";
            console.warn(`Invalid data for section ${sectionId}.`);
        }
        
    }

    return {
        total: totalSeats,
        open: totalOpen,
        waitlist: totalWaitlisted,
        totalSections: sections.length,
        openSections,
        waitlistedSections
    }
}

function getSectionData(section){
    const totalCount = parseInt(section.querySelector(".total-seats-count")?.textContent) || 0;
    const openCount = parseInt(section.querySelector(".open-seats-count")?.textContent) || 0;
    
    let waitlistCount = 0;
    section.querySelectorAll(".waitlist-count").forEach(waitlistElement => {
        waitlistCount += parseInt(waitlistElement.innerText) || 0;
    });

    if(isNaN(totalCount) || isNaN(openCount) || isNaN(waitlistCount)) return null;

    return {totalCount, openCount, waitlistCount};
}



function getTagColor(value, maxValue, grayZero){
    const clampedValue = Math.min(Math.max(value, 0), maxValue)
    if(grayZero && value == 0){
        return `grey`;
    }

    const hue = (clampedValue / maxValue) * 120;
    return `hsl(${hue}, 95%, 35%)`;
}