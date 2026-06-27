showPlanetTerpDownBanner(); // TODO: replace with real API status check
addSectionObservers();
addCourseTags();

function addSectionObservers(){
    let courseSectionsLoaded = 0;

    const observer = new MutationObserver((mutationRecords) => {
        for(const record of mutationRecords){
            const addedNodes = record.addedNodes;
    
            const sectionContainer = Array.from(addedNodes).find(
                node => node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('sections-container')
            );
            if(sectionContainer){
                const instructors = sectionContainer.getElementsByClassName("section-instructor");
                rateInstructors(instructors);
                injectSortBar(sectionContainer);
                injectBookmarkButtons(sectionContainer);
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