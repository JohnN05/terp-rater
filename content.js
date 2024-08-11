const instructorsLoaded = new Map();
const basePTApi = "https://planetterp.com/api/v1/";
const baseSocUrl = "https://app.testudo.umd.edu/soc/";
const domParser = new DOMParser();

const semester = document.getElementById("term-id-input").value;
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
    if(courses){
        for(const course of courses){
            const description = course.getElementsByClassName("course-basic-info-container")[0];
            const info = document.createElement("div");
    
            const sectionData = await getSectionsData(course);
            for(stat in sectionData){
                const statElement = document.createElement("span");
                statElement.textContent = `${stat}: ${sectionData[stat]}`
                info.appendChild(statElement);
            }
            
            description.appendChild(info);
    
            const instructors = course.getElementsByClassName("section-instructor");
            rateInstructors(instructors);
        }
    }
}

async function rateInstructors(instructors){
    if(instructors){
        for(const instructor of instructors){
            let rating;
            let reviewCount;

            const response = await fetch(`${basePTApi}professor?name=${instructor.innerText}&reviews=true`); 
            if(response.ok){
                const professorJson = await response.json();
                rating = (Math.round(professorJson.average_rating*100)/100).toFixed(2);
                reviewCount = professorJson.reviews.length;
            }
             
            const ratingElement = document.createElement("span");
            ratingElement.className="tr-rating";

            if(rating >= 0){
                ratingElement.textContent = `\t${rating}⭐(${reviewCount})`;
            }else{
                ratingElement.textContent = `\tN/A`;
            }

            instructor.insertAdjacentElement("afterend", ratingElement);
        }
    }
}
    
//ALLOW FILTER HANDLING (Blended options, hybrid, etc.)
async function getSectionsData(course){
    if(course){
        const response = await fetch(`${baseSocUrl}${semester}/sections?courseIds=${course.id}`);
        if(response.ok){
            const courseText = await response.text();
            const requestHtml = domParser.parseFromString(courseText, "text/html");

            let totalSeats = 0;
            let totalOpen = 0;
            let totalWaitlisted = 0;
            const sectionSeats = requestHtml.getElementsByClassName("seats-info");
            
            //ADD MORE ERROR HANDLING
            for(const sectionSeat of sectionSeats){
                const totalCount = parseInt(sectionSeat.getElementsByClassName("total-seats-count")[0]?.textContent);
                const openCount = parseInt(sectionSeat.getElementsByClassName("open-seats-count")[0]?.textContent);
                
                let waitlistCount = 0;
                const waitlistElements = sectionSeat.getElementsByClassName("waitlist-count");
                for(const waitlist of waitlistElements){
                    waitlistCount+=parseInt(waitlist.innerText);
                }

                if(!isNaN(openCount) && !isNaN(totalCount) && !isNaN(waitlistCount)){
                    totalSeats+=totalCount;
                    totalOpen+=openCount;
                    totalWaitlisted+=waitlistCount;
                }
            }
            
            return {"Total Seats": totalSeats, "Open Seats": totalOpen, "Waitlisted": totalWaitlisted};
        }
    }
    return null;
}