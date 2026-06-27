const ANIMATION_DELAY = 300;
const TOOLTIP_CLASSES = {
    container: "terp-rater-tooltip-container",
    body: "terp-rater-tooltip",
    visible: "terp-rater-tooltip-visible"
}

function createElementWithClass(tag, className){
    const element = document.createElement(tag);
    element.className = className;
    return element;
}

const tooltipElements = {
    container: createElementWithClass("span", TOOLTIP_CLASSES.container),
    body: createElementWithClass("span", TOOLTIP_CLASSES.body),
};

function addTooltip(node, message){
    if(!node) return;

    const container = tooltipElements.container.cloneNode();
    const body = tooltipElements.body.cloneNode();

    body.textContent = message;
    container.append(body, node);
    setupTooltipEvents(body, node);
    return container;
}

function setupTooltipEvents(body, node){
    let hideTimeout;
    node.addEventListener("mouseover", () => {
        if(hideTimeout) clearTimeout(hideTimeout);
        showTooltip(body);
    });

    node.addEventListener("mouseleave", () => {
        body.classList.remove(TOOLTIP_CLASSES.visible);
        hideTimeout = setTimeout(() => hideTooltip(body), ANIMATION_DELAY);
    });
}

function showTooltip(body){
    body.style.visibility = "visible";
    body.classList.add(TOOLTIP_CLASSES.visible);
}

function hideTooltip(body){
    body.style.visibility = "hidden";
}
