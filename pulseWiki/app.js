import * as FirebaseUtils from "./firebaseUtils.js"
import { Editor, Node, mergeAttributes, nodeInputRule, InputRule } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';
import * as TiptapAddons from "./tiptapAddons.js"


// 1. GLOBALS
let sitePages = {};
const mainContainer = document.getElementById("main-container");
const titleElement = document.getElementById("title");
let lastPage = null;
let currentPageKey = null;
let user = null;
let userData = null;
let isAdmin = false;
let needSave = false;

// 2. WIKI LINK PROCESSOR
function processWikiLinks(rawText) {
    // Use window.renderPage so it works from the generated HTML strings
    return rawText.replace(/\[\[(.*?)\]\]/g, (match, slug) => {
        const encodedSlug = encodeURIComponent(slug.trim());
        return `<a class="clickable" onclick="window.renderPage('${encodedSlug}')">${slug}</a>`;
    });
}

// 3. RENDER PAGE
// We attach this to 'window' so the [[]] links can click it
let activeEditors = [];


window.renderPage = async function (pageKey) {
    if (!pageKey) return;
    pageKey = decodeURIComponent(pageKey);

    // Update history for Back button
    if (currentPageKey && currentPageKey !== pageKey) {
        lastPage = currentPageKey;
    }
    currentPageKey = pageKey;


    activeEditors.forEach(ed => ed.destroy());
    activeEditors = [];
    mainContainer.innerHTML = "";


    // Clear container and show loading state
    activeEditors.forEach((val) => {
        val.commands.setContent('<p>Loading lore...</p>');
    }
    )
    let page = await FirebaseUtils.getDocument(`lore/${pageKey}`);
    /*
                if (!page) {
                    alert(`<p>The page "<strong>${pageKey}</strong>" does not exist yet. <button onclick="alert('Editor coming soon!')">Create it?</button></p>`);
                    titleElement.textContent = "Unknown Fragment";
                    return;
                }
    */
    // Setup Page Meta
    //    mainContainer.innerHTML = ""; // Clear "Loading..."

    let combinedHtml = "";
    const sectionWrapper = document.createElement("div");
    sectionWrapper.className = "line-container section-editor-wrapper";
    mainContainer.appendChild(sectionWrapper);

    function checkEmpty (editor){
        if (editor.innerHtml === `<p><br class="ProseMirror-trailingBreak"></p>`) {
            editor.commands.setContent(`<p>Start writing</P>`)
        }
    }

    const sectionEditor = new Editor({
        element: sectionWrapper,
        extensions: [StarterKit, TiptapAddons.SortableItem, TiptapAddons.WikiLink, TiptapAddons.SortableList],
        //   content: marked.parse(processWikiLinks(content)),
        editable: isAdmin, // Only editable if admin
        editorProps: {
            attributes: { class: 'wiki-editor-styles' },
        },
        onFocus({ event }) {
            needSave = true;
        },
        onBlur({ event, editor }) {
            saveData(event.target)
            checkEmpty(editor)
        }
    });


    if (page) {
        titleElement.textContent = page.title || pageKey;
        const pageBody = Array.isArray(page.body) ? page.body : [page.body];
        if (Array.isArray(pageBody)) {

            activeEditors.push(sectionEditor);

            if (pageBody.length !== 0) {
                pageBody.forEach((section) => {
                    // Handle if section is a string or an object with .content
                    const content = typeof section === 'string' ? section : section.content;



                    // Handle Campaign Visibility if section is an object
                    if (section.visibility && section.visibility !== "all") {
                        if (!user || user.campaign !== section.visibility) return;
                    }

                    const firstPass = processWikiLinks(content);
                    const finalHtml = marked.parse(firstPass);

                    const sectionDiv = document.createElement("div");
                    sectionDiv.className = "line-container"; // Keeps your styling
                    sectionDiv.innerHTML = finalHtml;
                    sectionDiv.addEventListener('click', () => {
                        // 1. Focus the element
                        editableDiv.focus();

                        // 2. Create a 'Range' and 'Selection' to move the cursor
                        const range = document.createRange();
                        const sel = window.getSelection();

                        // Set the range to the start of the div
                        // (Node: editableDiv, Offset: 0)
                        range.setStart(editableDiv, 0);
                        range.collapse(true);

                        // Remove any existing selections and apply our new range
                        sel.removeAllRanges();
                        sel.addRange(range);
                    });
                    combinedHtml += `<div class="line-container">${finalHtml}</div>`;
                });
            } else {
                // console.log("Array is 0, displaying placeholder")
                combinedHtml = `<div class="line-container"><p>No content yet.</p></div>`;
            }

        }

        // Apply Background Style
        if (page.style) {
            page.style.split(";").forEach(aspect => {
                if (aspect.trim().startsWith("background:")) {
                    const src = aspect.split("background:")[1].trim();
                    document.body.style.backgroundImage = `url(resources/${src})`;
                }
            });
        }
    } else {
        titleElement.textContent = pageKey;
        combinedHtml = `<div class="line-container"><p>No content yet.</p></div>`;
    }
    sectionEditor.commands.setContent(combinedHtml);
    checkEmpty(sectionEditor)


    // Update URL
    try {
        history.pushState({ pageKey }, "", `?page=${encodeURIComponent(pageKey)}`);
    } catch (e) { }
}

// 4. NAVIGATION
window.backPage = function () {
    if (lastPage) window.renderPage(lastPage);
};

window.addEventListener("popstate", (ev) => {
    if (ev.state && ev.state.pageKey) window.renderPage(ev.state.pageKey);
});

// 5. AUTH & INIT
document.getElementById("logiBttn").addEventListener("click", async () => {
    if (user !== null) return
    let userDataLogin = await FirebaseUtils.loginGoogle();
    if (userDataLogin) {
        user = userDataLogin.user;
        if (userDataLogin.isNew) {
            document.getElementById("chooseUseCase").style.display = "block";
            document.getElementById("logiBttn").style.display = "none";
        } else {
            document.getElementById("loginPopup").classList.remove("show");
            location.reload(); // Refresh to update visible sections
        }
        getUserData()
    }


});

document.getElementById("selectuseCase").addEventListener("click", async () => {
    const campaign = document.querySelector('select[name="choose"]').value;
    if (user) {
        await FirebaseUtils.setDocument(`users/${user.uid}`, {
            username: user.displayName,
            campaign: campaign,
            role: "player"
        });
        document.getElementById("loginPopup").classList.remove("show");
        window.renderPage(currentPageKey); // Re-render to show restricted content
    }
});

// Login UI Toggles
document.getElementById("login").onclick = () => document.getElementById("loginPopup").classList.toggle("show");
document.getElementById("loginExit").onclick = () => document.getElementById("loginPopup").classList.remove("show");

// Initialize Site
async function init() {
    // Check if user is already logged in
    user = await FirebaseUtils.getUserOnLoad();
    if (user) {
        await getUserData()
        document.getElementById("login").disabled = true;
        document.getElementById("login").innerText = `Logged in - ${userData.username}`
    }

    const params = new URLSearchParams(window.location.search);
    const startPage = params.get("page") || "home";
    window.renderPage(startPage);
}

async function getUserData() {
    userData = await FirebaseUtils.getDocument(`users/${user.uid}`)
    isAdmin = userData.admin
    //console.log(userData)
}

async function saveData(element) {
    const path = `/lore/${currentPageKey}`
    const bodytext = element.innerHTML
    const response = await FirebaseUtils.updateDocument(path, { body: bodytext })
    if (!response) {
        FirebaseUtils.setDocument(path, {
            title: currentPageKey,
            body: bodytext,
            randomVal: Math.random()
        })
    }
    //currentPageKey
}

init();