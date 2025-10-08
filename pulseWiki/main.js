let pagesData = [];
let container = document.getElementById("wikiContainer");

// FIX 1: Renamed function from "rederPage" to "renderPage"
function renderPage(id) {
    // FIX 2: Corrected the logic to compare page.id with the function's 'id' parameter
    let pageToDisplay = pagesData.find(page => page.id === id);

    // It's good practice to check if the page was found
    if (!pageToDisplay) {
        container.innerHTML = `<h1>Error</h1><p>Page with ID "${id}" not found.</p>`;
        return; 
    }

    // FIX 3: Corrected typo from ".conent" to ".content"
    let processedContent = parseWikiLinks(pageToDisplay.content);

    container.innerHTML = `
        <h1>${pageToDisplay.title}</h1>
        <div>${processedContent}</div>
    `;

    // Assuming addClickListenersToLinks() is defined elsewhere in your code
    addClickListenersToLinks(); 
}

function parseWikiLinks(textContent) {
    // This regex looks for text between double square brackets, like [[PageName]]
    const linkRegex = /\[\[(.*?)\]\]/g; 

    // The 'linkRegex' variable is correctly used here.
    return textContent.replace(linkRegex, (fullMatch, pageId) => {
        // Creates an anchor tag that can be used for client-side routing
        return `<a href="#${pageId}" class="wiki-link">${pageId}</a>`;
    });
}