const instructorsLoaded = new Map();
const courses = document.getElementsByClassName("course");
let courseSectionsLoaded = 0;

if(courses.length > 0){
    for(const course of courses){
        const ratings = document.createElement("div");
        ratings.textContent = `This is for the course, ${course.id}`;

        const description = course.getElementsByClassName("course-basic-info-container")[0];
        description.insertAdjacentElement("afterend", ratings);

        const instructors = course.getElementsByClassName("section-instructor");
        rateInstructors(instructors);
    }
}

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

async function rateInstructors(instructors){
    if(instructors){
        for(const instructor of instructors){
            let rating;
            let reviewCount;

            const response = await fetch(`https://planetterp.com/api/v1/professor?name=${instructor.innerText}&reviews=true`); 
            if(response.ok){
                const details = await response.json();
                rating = (Math.round(details.average_rating*100)/100).toFixed(2);
                reviewCount = details.reviews.length;
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
    
    