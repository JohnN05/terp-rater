function addRatingModal(node, name, record){
    if(!node || !name || !record){
        return;
    }

    const dialog = document.createElement("dialog");
    const exitButton = getExitButton(dialog);
    const overview = getInstructorOverviewElement(name, record);
    const reviewList = document.createElement("ol");

    dialog.className = "terp-rater-dialog";

    for(const review of record.reviews){
        const reviewContainer = document.createElement("li");

        const reviewMessage = document.createElement("div");
        reviewMessage.style.gridArea = "review";
        reviewMessage.textContent = review.review ? review.review : "";
        
        const reviewInfo = getReviewInfoElement(review);

        reviewContainer.append(reviewInfo, reviewMessage);
        reviewList.prepend(reviewContainer);
    }

    dialog.append(exitButton, overview, reviewList);

    document.body.insertAdjacentElement("afterbegin", dialog);

    dialog.addEventListener("click", (event) => {
        if(event.target === dialog){
            dialog.close();
        }

    })

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
    const heading = document.createElement("h");
    const subheading1 = document.createElement("h2");
    const subheading2 = document.createElement("h2");

    heading.textContent = name;
    subheading1.textContent = record.reviewCount ? `${record.reviewCount} review(s)` : "No reviews";
    subheading2.textContent = record.rating ? `Average rating: ${record.rating}` : ""; 

    container.append(heading, subheading1, subheading2);
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

    const reviewRating = document.createElement("div");
    reviewRating.textContent = review.rating ? `${review.rating}⭐` : "N/A"

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