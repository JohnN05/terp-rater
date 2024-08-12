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
        console.warn("No courses available for processing.")
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

    loadInstructors();
    console.log(loadInstructors);
    
}

async function rateInstructors(instructorsToLoad){
    if(!instructorsToLoad){
        console.warn("No instructors provided.");
    }
   
    for(const instructor of instructorsToLoad){
        if(!instructor.innerText.includes("TBA")){
            
            // if(!loadInstructors.has(instructor.innerText)){
            //     console.error(`${instructor.innerText}'s data wasn't loaded.`)
            //     continue;
            // }

            // const instructorData = loadInstructors.get(instructor.innerText);

            // const ratingElement = document.createElement("span");
            // ratingElement.className="tr-rating";
            // ratingElement.textContent = instructorData.rating != null ? `\t${instructorData.rating}⭐(${instructorData.reviewCount})` : `\tN/A`;

            try{
                let rating=null;
                let reviewCount=0;

                const response = await fetch(`${basePTApi}professor?name=${instructor.innerText}&reviews=true`); 
                if(!response.ok){
                    console.error(`Failed to fetch rating for ${encodeURIComponent(instructor.innerText)}.  HTTP Status: ${response.status}`);
                }else{
                    const professorJson = await response.json();

                    if(professorJson && professorJson.average_rating){
                        rating = (Math.round(professorJson.average_rating*100)/100).toFixed(2);
                        reviewCount = professorJson.reviews ? professorJson.reviews.length : 0;
                    }else{
                        console.warn(`No valid data received for ${instructor.innerText}`);
                    }
                    
                }
                    
                const ratingElement = document.createElement("span");
                ratingElement.className="tr-rating";
                ratingElement.textContent = rating != null ? `\t${rating}⭐(${reviewCount})` : `\tN/A`;

                instructor.insertAdjacentElement("afterend", ratingElement);
    
                
            }catch(e){
                console.error(`Unable to find a rating for ${instructor.innerText}`);
            }
        }
        
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

//LEFT OFF CREATING A MAP FOR INSTRUCTORS
async function loadInstructors(){
    for(const instructor of instructors){
        if(!loadedInstructors.has(instructor)){

            try{
                let rating=null;
                let reviewCount=0;

                const response = await fetch(`${basePTApi}professor?name=${encodeURIComponent(instructor)}&reviews=true`); 
                if(!response.ok){
                    console.error(`Failed to fetch rating for ${instructor}.  HTTP Status: ${response.status}`);
                }else{
                    const instructorJson = await response.json();

                    if(instructorJson && instructorJson.average_rating){
                        rating = (Math.round(instructorJson.average_rating*100)/100).toFixed(2);
                        reviewCount = instructorJson.reviews ? instructorJson.reviews.length : 0;
                    }else{
                        console.warn(`No valid data received for ${instructor}`);
                    }
                    
                }
                    
                loadedInstructors.set(instructor, {
                    rating: rating,
                    reviewCount: reviewCount
                });
                
            }catch(e){
                console.error(`Unable to find a rating for ${instructor.innerText}`);
            }
        }
    }
}