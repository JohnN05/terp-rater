const MAX_REVIEWS = 15;
const loadedModals = new Map();
const assetsPath = chrome.runtime.getURL("assets/");

const assets = {
    star: createImageElement("star.svg", "star"),
    emptyStar: createImageElement("empty-star.svg"),
    ptIcon: createImageElement("pt-logo.png", "PlanetTerp", {id:"terp-rater-pt-icon"}),
    exit: createImageElement("cross.svg", "Close", {id: "terp-rater-dialog-exit"})
}

function createImageElement(src, alt, attributes = {}){
    const img = document.createElement("img");
    img.src = `${assetsPath}${src}`;
    Object.assign(img, attributes);
    return img
}

function addRatingModal(node, name, record){
    if(!node || !name || !record) return;

    const dialog = loadedModals.get(name) || createDialogElement(name, record);
    loadedModals.set(name, dialog);

    node.addEventListener("click", () => dialog.showModal());
}

function createDialogElement(name, record){
    const dialog = document.createElement("dialog");
    dialog.className = "terp-rater-dialog";

    const exitButton = createExitButton(dialog);
    const overview = createInstructorOverviewElement(name, record);
    const reviewList = createReviewList(name, record);

    dialog.append(exitButton, overview, reviewList);
    document.body.insertAdjacentElement("afterbegin", dialog);

    dialog.addEventListener("click", (event) => {
        if(event.target === dialog) dialog.close();
    });

    return dialog;
}

function createExitButton(dialog){
    const exit = assets.exit.cloneNode();
    exit.addEventListener("click", () => dialog.close());
    return exit;
}

function createInstructorOverviewElement(name, record){
    const container = document.createElement("div");

    const headContainer = document.createElement("div");
    headContainer.className = "head-container";

    const heading = document.createElement("h");
    heading.textContent = name;

    const ptIcon = getPTIcon(record.slug);

    const subheading1 = createSubheading(`${record.reviews.length} review(s)`, "No reviews")
    const subheading2 = createSubheading(`Average rating: ${record.rating}`, "No ratings");
    
    headContainer.append(heading, ptIcon);
    container.append(headContainer, subheading1, subheading2);

    return container;
}

function createSubheading(textContent, fallback){
    const subheading = document.createElement("h2");
    subheading.textContent = textContent || fallback;
    return subheading;
}

function createReviewList(name, record){
    const reviewList = document.createElement("ol");
    const lastReviewIndex = Math.max(record.reviews.length - MAX_REVIEWS, 0);

    for(let i = record.reviews.length - 1; i >= lastReviewIndex; i--){
        reviewList.append(createReviewItem(record.reviews[i]));
    }

    if(record.reviews.length > MAX_REVIEWS){
        reviewList.append(createMoreReviewsLink(name, record.slug));
    }

    return reviewList;
}

function createReviewItem(review){
    const reviewContainer = document.createElement("li");
    const reviewMessage = document.createElement("div");

    reviewMessage.style.gridArea = "review";
    reviewMessage.textContent = review.review || "";
    
    const reviewInfo = createReviewInfo(review);

    reviewContainer.append(reviewInfo, reviewMessage);
    return reviewContainer;
}

function createReviewInfo(review){
    const reviewInfo = document.createElement("div");
    reviewInfo.className = "info";
    reviewInfo.style.gridArea = "info";

    const reviewedCourse = document.createElement("div");
    reviewedCourse.textContent = review.course || "N/A";

    const reviewRating = createRatingElement(review.rating);
    const expectedGrade = createExpectedGradeElement(review.expected_grade);
    const reviewDate = createReviewDateElement(review.created);

    reviewInfo.append(reviewedCourse, reviewRating, expectedGrade, reviewDate);
    return reviewInfo;
}

function createExpectedGradeElement(expectedGrade){
    const gradeElement = document.createElement("div");
    if(expectedGrade){
        const prefix = ["A", "E"].includes(expectedGrade.charAt(0) ? "an" : "a");
        gradeElement.textContent = `Expecting ${prefix} ${expectedGrade}`;
    }
    return gradeElement;
}

function createReviewDateElement(dateString){
    const dateElement = document.createElement("div");
    if(dateString){
        const date = new Date(dateString);
        dateElement.textContent = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;    
    }
    return dateElement;
}

function createMoreReviewsLink(name, slug){
    const reviewContainer = document.createElement("li");
    reviewContainer.id = "terp-rater-more-reviews";

    const ptLink = document.createElement("a");
    ptLink.href = `https://planetterp.com/professor/${slug}`;
    ptLink.target = "_blank";
    ptLink.rel = "noreferrer";

    const moreReviews = document.createElement("h3");
    moreReviews.textContent = `Want more reviews?  Check out ${name}'s PlanetTerp`;

    ptLink.append(moreReviews);
    reviewContainer.append(ptLink);

    return reviewContainer;
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

    iconLink.append(assets.ptIcon.cloneNode());
    return iconLink;
}

function createRatingElement(rating){
    const container = document.createElement("div");
    container.className = "starContainer";
    
    if(!rating){
        return document.createElement(container);
    }
    
    const ratingNum = parseInt(rating) || 0;

    for(let i = 0; i < 5; i++){
        container.append(i < ratingNum ? assets.star.cloneNode() : assets.emptyStar.cloneNode())
    }

    return container;
}