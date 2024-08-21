const maxReviews = 15;
const loadedModals = new Map();

const star = document.createElement("img");
star.src = chrome.runtime.getURL("assets/star.svg");
star.alt = "star";

const emptyStar = document.createElement("img");
emptyStar.src = chrome.runtime.getURL("assets/empty-star.svg");
emptyStar.alt = "empty star";

const ptIcon = document.createElement("img");
    ptIcon.id = "terp-rater-pt-icon";
    ptIcon.src = chrome.runtime.getURL("assets/pt-logo.png");
    ptIcon.alt = "PlanetTerp";

function addRatingModal(node, name, record){
    if(!node || !name || !record){
        return;
    }

    const dialog = loadedModals.has(name) ? loadedModals.get(name) : document.createElement("dialog");
    
    if(!loadedModals.has(name)){
        dialog.className = "terp-rater-dialog";

        const exitButton = getExitButton(dialog);
        const overview = getInstructorOverviewElement(name, record);
        const reviewList = getReviews(name, record);

        dialog.append(exitButton, overview, reviewList);
        loadedModals.set(name, dialog);

        document.body.insertAdjacentElement("afterbegin", dialog);

        dialog.addEventListener("click", (event) => {
            if(event.target === dialog){
                dialog.close();
            }
    
        });
    }

    node.addEventListener("click", () => {
        dialog.showModal();
    });
}

function getExitButton(dialog){
    const exit = document.createElement("img");
    exit.src = chrome.runtime.getURL("assets/cross.svg")
    exit.id = "terp-rater-dialog-exit"

    exit.addEventListener("click", () => {
        dialog.close();
    })

    return exit;
}

function getInstructorOverviewElement(name, record){
    const container = document.createElement("div");
    const headContainer = document.createElement("div");
    const heading = document.createElement("h");
    const ptIcon = getPTIcon(record.slug);
    const subheading1 = document.createElement("h2");
    const subheading2 = document.createElement("h2");

    headContainer.className = "head-container";
    heading.textContent = name;
    headContainer.append(heading, ptIcon);

    subheading1.textContent = record.reviews.length ? `${record.reviews.length} review(s)` : "No reviews";
    subheading2.textContent = record.rating ? `Average rating: ${record.rating}` : ""; 

    container.append(headContainer, subheading1, subheading2);
    return container;
}

function getReviewInfoElement(review){
    if(!review){
        return document.createElement("div");
    }

    const reviewInfo = document.createElement("div");
    reviewInfo.className = "info";
    reviewInfo.style.gridArea = "info";

    const reviewedCourse = document.createElement("div");
    reviewedCourse.textContent = review.course ? review.course : "N/A";

    const reviewRating = getRatingElement(review.rating);

    const expectedGrade = document.createElement("div");
    if(review.expected_grade){
        if(review.expected_grade.includes("A") || review.expected_grade.includes("E")){
            expectedGrade.textContent = `Expecting an ${review.expected_grade}`
        }else{
            expectedGrade.textContent = `Expecting a ${review.expected_grade}`;
        }
    }

    const reviewDate = document.createElement("div");
    if(review.created){
        const createdDate = new Date(review.created);
        reviewDate.textContent = `${createdDate.getMonth()+1}/${createdDate.getDate()}/${createdDate.getFullYear()}`;    
    }

    reviewInfo.append(reviewedCourse, reviewRating, expectedGrade, reviewDate);
    return reviewInfo;
}

function getReviews(name, record){
    if(!record){
        return;
    }

    const reviewList = document.createElement("ol");

    const lastReview = record.reviews.length > maxReviews ? 
    record.reviews.length - maxReviews: 0;
    for(let i = record.reviews.length-1; i >= lastReview; i--){
        const review = record.reviews[i];
        const reviewContainer = document.createElement("li");

        const reviewMessage = document.createElement("div");
        reviewMessage.style.gridArea = "review";
        reviewMessage.textContent = review.review ? review.review : "";
        
        const reviewInfo = getReviewInfoElement(review);

        reviewContainer.append(reviewInfo, reviewMessage);
        reviewList.append(reviewContainer);
    }

    if(record.reviews.length > maxReviews){
        const reviewContainer = document.createElement("li");
        reviewContainer.id = "terp-rater-more-reviews";
        const ptLink = document.createElement("a");
        ptLink.href = `https://planetterp.com/professor/${record.slug}`;
        ptLink.target = "_blank";
        ptLink.rel = "noreferrer";

        const moreReviews = document.createElement("h3");
        moreReviews.textContent = `Want more reviews?  Check out ${name}'s PlanetTerp`;
        ptLink.append(moreReviews);

        reviewContainer.append(ptLink);
        reviewList.append(reviewContainer);
    }

    return reviewList;
}

function getPTIcon(slug){
    if(!slug){
        return;
    }

    const iconLink = document.createElement("a");
    iconLink.id = "terp-rater-pt-link";
    iconLink.href = `https://planetterp.com/professor/${slug}`;
    iconLink.target = "_blank";
    iconLink.rel = "noreferrer";

    iconLink.append(ptIcon.cloneNode());
    return iconLink;
}

function getRatingElement(rating){
    const container = document.createElement("div");
    container.className = "starContainer";
    
    if(!rating){
        return document.createElement(container);
    }
    
    const ratingNum = parseInt(rating) || 0;

    for(let stars = 0; stars < ratingNum; stars++){
        container.append(star.cloneNode());
    }
    for(let stars = ratingNum; stars < 5; stars++){
        container.append(emptyStar.cloneNode());
    }

    return container;
}