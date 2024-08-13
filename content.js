const instructors = new Set();
const loadedInstructors = new Map();
const basePTApi = "https://planetterp.com/api/v1/";
const baseSocUrl = "https://app.testudo.umd.edu/soc/";
const domParser = new DOMParser();

const semester = document.getElementById("term-id-input")?.value;
if(!semester){
    console.warn("Semester not found.");
}

const courses = document.body.getElementsByClassName("course");
let courseSectionsLoaded = 0;

processCourses();

const observer = new MutationObserver((mutationRecords) => {
    for(const record of mutationRecords){
        const added = record.addedNodes;

        if(added.length > 0 && added[0].className==="sections-container"){
            const sectionContainer = added[0];
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

async function processCourses(){
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

            const info = document.createElement("div");

            const sectionData = await getSectionsData(course);
            if(!sectionData){
                console.warn(`Failed to get section data for ${course.id}`);
            }

            for(const stat in sectionData.stats){
                const statElement = document.createElement("span");
                statElement.textContent = `${stat}: ${sectionData.stats[stat]}`;
                info.appendChild(statElement);
            }
            
            description.appendChild(info);

            const instructorss = course.getElementsByClassName("section-instructor");
            rateInstructors(instructorss);

        }catch(e){
            console.error(`Error processing ${course.id}`)
        }
        
    }
    
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

        const ratingElement = document.createElement("span");
        ratingElement.className="tr-rating";

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
                        
                    
                    ratingElement.textContent = rating != null ? `\t${rating}⭐(${reviewCount})` : `\tNo reviews`;

                    
                }
                
            }catch(e){
                loadedInstructors.set(instructorName,
                    {
                        rating: null
                    }
                )
                ratingElement.textContent = "\tN/A";
                console.warn(`Unable to find a record for ${instructorName}`);
            }
        }else{
            const instructorRecord = loadedInstructors.get(instructorName);
            ratingElement.textContent = instructorRecord.rating != null ? `\t${instructorRecord.rating}⭐(${instructorRecord.reviewCount})` : `\tN/A`;
        }

        instructor.insertAdjacentElement("afterend", ratingElement);

    }
}
    
//ALLOW FILTER HANDLING (Blended options, hybrid, etc.)
async function getSectionsData(course){
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
            const sectionInstructors = section.getElementsByClassName("section-instructor");
            for(const instructor of sectionInstructors){
                instructors.add(instructor.textContent);
            }

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
            stats: {
                "Total Seats": totalSeats, 
                "Open Seats": totalOpen, 
                "Waitlisted": totalWaitlisted
            }
        };

    }catch(e){
        console.error(`Error fetching course data for ${course.id}.6`)
        return null;
    }
}
