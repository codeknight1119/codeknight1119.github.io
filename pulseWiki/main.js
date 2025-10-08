let pagesData = [];
let container = document.getElementById("wikiContainer")

function rederPage(id){
let pageToDisplay = pagesData.find(page => page.id === page)
let processedContent = parseWikiLinks(pageToDisplay.conent);
container.innerHTML =`
<h1>${pageToDisplay.title}</h1>
<div>${processedContent}</div>
`
addClickListenersToLinks()
}

parseWikiLinks(textContext){
    let linkRegex = /\[\[(.*?)\]\]/g;
    return textContext.replace(linkRegex, (fullMatch,pageId) => {
        return `<a href="#${pageId}" class="wiki-link">${pageId}</a>`;
    })
}
