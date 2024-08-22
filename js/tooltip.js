const ANIMATION_DELAY = 300;
const TOOLTIP_CLASSES = {
    container: "terp-rater-tooltip-container",
    body: "terp-rater-tooltip",
    arrow: "terp-rater-tooltip-arrow",
    shadow: "shadow",
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
    arrow: createElementWithClass("div", TOOLTIP_CLASSES.arrow),
    arrowShadow: (() => {
        const shadow = createElementWithClass("div", TOOLTIP_CLASSES.arrow);
        shadow.classList.add(TOOLTIP_CLASSES.shadow);
        return shadow;
    })()
};

function addTooltip(node, message){
    if(!node) return;


    const container = tooltipElements.container.cloneNode();
    const body = tooltipElements.body.cloneNode();
    const arrow = tooltipElements.arrow.cloneNode();
    const shadow = tooltipElements.arrowShadow.cloneNode();
    
    body.textContent = message;
    container.append(body, arrow, shadow, node);
    setupTooltipEvents(body, arrow, shadow, node);
    return container;
}

function setupTooltipEvents(body, arrow, shadow, node){
    let hideTimeout;
    node.addEventListener("mouseover", () => {
        if(hideTimeout) clearTimeout(hideTimeout);

        showTooltip(body, arrow, shadow);
    });

    node.addEventListener("mouseout", () => {
        removeClass(body, arrow, shadow, TOOLTIP_CLASSES.visible);
        hideTimeout = setTimeout(() => hideTooltip(body, arrow, shadow), ANIMATION_DELAY);
    })
}

function showTooltip(body, arrow, shadow){
    setVisibility(body, arrow, shadow, "visible");
    addClass(body, arrow, shadow, TOOLTIP_CLASSES.visible);
}

function hideTooltip(body, arrow, shadow){
    setVisibility(body, arrow, shadow, "hidden");
}

function setVisibility(...elements){
    const visibility = arguments[arguments.length - 1];
    elements.slice(0, -1).forEach(element => {
        element.style.visibility = visibility;
    });
}

function addClass(...elements){
    const className = arguments[arguments.length - 1];
    elements.slice(0, -1).forEach(element => {
        element.classList.add(className);
    })
}

function removeClass(...elements){
    const className = arguments[arguments.length - 1];
    elements.slice(0, -1).forEach(element => {
        element.classList.remove(className);
    })
}