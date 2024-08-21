const animationDelay = 300;

const tooltipContainer = document.createElement("span");
const tooltipBody = document.createElement("span");
const tooltipArrow = document.createElement("div");

tooltipContainer.className = "terp-rater-tooltip-container";
tooltipBody.className = "terp-rater-tooltip";
tooltipArrow.className = "terp-rater-tooltip-arrow";

const arrowShadow = tooltipArrow.cloneNode();
arrowShadow.classList.add("shadow");

function addTooltip(node, message){
    if(!node){
        return;
    }

    const body = tooltipBody.cloneNode();
    const arrow = tooltipArrow.cloneNode();
    const shadow = arrowShadow.cloneNode();
    

    body.textContent = message;

    const container = tooltipContainer.cloneNode();

    container.appendChild(body);
    container.appendChild(arrow);
    container.appendChild(shadow);
    container.appendChild(node);

    node.addEventListener("mouseover", () =>{
        body.style.visibility = "visible";
        arrow.style.visibility = "visible";
        shadow.style.visibility = "visible";
        body.classList.add('terp-rater-tooltip-visible');
        arrow.classList.add('terp-rater-tooltip-visible');
        shadow.classList.add('terp-rater-tooltip-visible');
    });
    node.addEventListener("mouseout", () => {
        setTimeout(() => {
            body.style.visibility = "hidden";
            arrow.style.visibility = "hidden";
            shadow.style.visibility = "hidden";
        }, animationDelay);
        body.classList.remove('terp-rater-tooltip-visible');
        arrow.classList.remove('terp-rater-tooltip-visible');
        shadow.classList.remove('terp-rater-tooltip-visible');
    });

    node.style.cursor = "pointer";



    return container;
}
