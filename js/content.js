addSectionObservers();
addCourseTags();

function addSectionObservers(){
    let courseSectionsLoaded = 0;

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
        if(courseSectionsLoaded >= courseElements.length){
            observer.disconnect();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}