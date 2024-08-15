const loadedInstructors = new Map();
const basePTApi = "https://planetterp.com/api/v1/";
const baseSocUrl = "https://app.testudo.umd.edu/soc/";
const domParser = new DOMParser();

const tag = document.createElement("span");
tag.className = "terp-rater-tag"

const semester = document.getElementById("term-id-input")?.value;
if(!semester){
    console.warn("Semester not found.");
}

const courses = document.body.getElementsByClassName("course");
let courseSectionsLoaded = 0;

addCourseStats();

const observer = new MutationObserver((mutationRecords) => {
    for(const record of mutationRecords){
        const addedNodes = record.addedNodes;

        if(addedNodes.length > 0 && addedNodes[0].className==="sections-container"){
            const sectionContainer = addedNodes[0];
            const instructors = sectionContainer.getElementsByClassName("section-instructor");
            rateInstructors(instructors);
            courseSectionsLoaded++;
        }

    }
    if(courseSectionsLoaded >= courses.length){
        observer.disconnect();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

async function addCourseStats(){
    if(!courses || courses.length == 0){
        console.warn("No courses available for processing.");
        return;
    }

    for(const course of courses){
        try{
            const description = course.querySelector(".course-basic-info-container");
            if(!description){
                console.warn(`Description container not found for ${course.id}`);
            }

            const courseTitle = course.querySelector(".course-title");
            const tagContainer = document.createElement("span");
            tagContainer.className = "terp-rater-tag-container";
            courseTitle.insertAdjacentElement("afterend", tagContainer);
            
            if(courseTitle){
                const courseGPA = await getCourseGPA(course.id)
                if(courseGPA > 0){
                    const gpaTag = tag.cloneNode();
                    gpaTag.textContent = `🎓 ${courseGPA}`;
                    gpaTag.title="Average GPA";
                    gpaTag.style.backgroundColor = getTagColor(courseGPA == null ? 0 : courseGPA, 4, true);

                    tagContainer.appendChild(gpaTag);
                }
                
            }
            
            const sectionSeats = await getCourseSeats(course);
            if(!sectionSeats){
                console.warn(`Failed to get section data for ${course.id}`);
            }

            if(sectionSeats.total){
                const openSeatsTag = tag.cloneNode();

                if(sectionSeats.open > 1){
                    openSeatsTag.textContent = `${sectionSeats.open} seats left`;
                }else if(sectionSeats.open == 1){
                    openSeatsTag.textContent = `${sectionSeats.open} seat left`;
                }else{
                    openSeatsTag.textContent = "No seats left";
                }

                openSeatsTag.title="Seats remaining";
                openSeatsTag.style.backgroundColor = getTagColor(sectionSeats.open, sectionSeats.total/2, false);
                tagContainer.appendChild(openSeatsTag);

                if(sectionSeats.waitlist > 0){
                    const waitlistTag = tag.cloneNode();
                    waitlistTag.textContent = `${sectionSeats.waitlist} waitlisted`;
                    waitlistTag.title="Waitlisted";
                    waitlistTag.style.backgroundColor = "#d5b60a";
                    tagContainer.appendChild(waitlistTag);
                }
                
            }

            const instructors = course.getElementsByClassName("section-instructor");
            rateInstructors(instructors);

        }catch(e){
            console.error(`Error processing ${course.id}`)
        }   
    }
}

async function getCourseGPA(courseId){
    try{
        const response = await fetch(`${basePTApi}course?name=${courseId}`); 
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
    }
    return null;
    
}

async function rateInstructors(instructorsToLoad){

    if(!instructorsToLoad){
        console.warn("No instructors provided.");
    }
   
    for(const instructor of instructorsToLoad){
        const instructorName = instructor.innerText;

        if(instructorName.includes("TBA")){
            continue;
        }

        if(!loadedInstructors.has(instructorName)){
            try{
                let rating=null;
                let reviewCount=0;

                const response = await fetch(`${basePTApi}professor?name=${instructorName}&reviews=true`); 
                if(!response.ok){
                    throw new Error(`${instructorName} doesn't have a record on PlanetTerp.`);
                }else{
                    const professorJson = await response.json();

                    if(professorJson && professorJson.average_rating){
                        rating = (Math.round(professorJson.average_rating*100)/100).toFixed(2);
                        reviewCount = professorJson.reviews ? professorJson.reviews.length : 0;
                    }else{
                        console.warn(`Unable to find a rating for ${instructorName}`);
                    }
                        
                    loadedInstructors.set(instructorName, {
                        rating: rating,
                        reviewCount: reviewCount
                    })
                }
                
            }catch(e){
                loadedInstructors.set(instructorName,
                    {
                        rating: null
                    }
                )
                console.warn(`Unable to find a record for ${instructorName}`);
            }
        }

        const instructorRecord = loadedInstructors.get(instructorName);

        //ADD TOOLTIP WITH ADDITIONAL INFO SUCH AS AVERAGE GPA FOR SPECIFIC PROFESSOR
        if(instructorRecord.rating){
            const ratingTag = tag.cloneNode();
            ratingTag.title="Instructor Rating"
            ratingTag.textContent = `\t${instructorRecord.rating}⭐ (${instructorRecord.reviewCount})`;
            ratingTag.style.backgroundColor = getTagColor(instructorRecord.rating, 5, true);
            instructor.insertAdjacentElement("afterend", ratingTag);
        }
        
    }
}
    
//ALLOW FILTER HANDLING (Blended options, hybrid, etc.)
async function getCourseSeats(course){
    if(!course){
        console.error('No course provided.')
        return null;
    }

    try{
        const response = await fetch(`${baseSocUrl}${semester}/sections?courseIds=${course.id}`);

        if(!response.ok){
            console.error(`HTTP Error: Status: ${response.status}`);
            return null;
        }

        const courseText = await response.text();
        const requestHtml = domParser.parseFromString(courseText, "text/html");

        let totalSeats = 0;
        let totalOpen = 0;
        let totalWaitlisted = 0;
        const sections = requestHtml.getElementsByClassName("section-info-container");
        
        for(const section of sections){
            const sectionId = section.querySelector(".section-id")?.textContent || "Unknown";
            const totalCount = parseInt(section.querySelector(".total-seats-count")?.textContent) || 0;
            const openCount = parseInt(section.querySelector(".open-seats-count")?.textContent) || 0;
            
            let waitlistCount = 0;
            const waitlistElements = section.querySelectorAll(".waitlist-count");
            for(const waitlist of waitlistElements){
                waitlistCount += parseInt(waitlist.innerText) || 0;
            }

            if(!isNaN(openCount) && !isNaN(totalCount) && !isNaN(waitlistCount)){
                totalSeats += totalCount;
                totalOpen += openCount;
                totalWaitlisted += waitlistCount;
            }else{
                console.warn(`Invalid data for section ${sectionId}.`);
            }
        }

        return {
            total: totalSeats, 
            open: totalOpen, 
            waitlist: totalWaitlisted
        };

    }catch(e){
        console.error(`Error fetching course data for ${course.id}.`)
        return null;
    }
}

function getTagColor(value, maxValue, grayZero){
    const clampedValue = Math.min(Math.max(value, 0), maxValue)
    if(grayZero && value == 0){
        return `grey`;
    }

    const hue = (clampedValue / maxValue) * 120;
    return `hsl(${hue}, 80%, 35%)`;
}