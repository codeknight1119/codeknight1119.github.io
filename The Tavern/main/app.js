import * as FirebaseUtils from "../firebaseUtils.js"
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { Editor } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';
import { Markdown } from 'https://esm.sh/@tiptap/markdown';



//////////////////////////////////////////////////////////////////////
/////////////////////////GLOBAL VARS//////////////////////////////////
//////////////////////////////////////////////////////////////////////
let user = null;
let permissions = null;
let myFeatures = null;
let currentSelectedSidebar = null
const chatUI = document.getElementById("chatTools")
let ss_TOOLS = new Map()
let ss_CHATS = new Map()
let ss_CAMPAIGNS = new Map()
let activeChat = null;
let activeFeature = null;
let activeFeatureType = null;

const chatArea = document.getElementById("sendBar")

const messageInput = new Editor({
    element: chatArea,
    extensions: [StarterKit, Markdown.configure({
        transformPastedText: true, // Converts copied markdown into visual styles on paste
    }),],
    editorProps: {
        attributes: { class: 'message-input-styles' },
        handleKeyDown: (view, event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleChatMesage();
                return true;
            }
            return false
        }
    },
})

//////////////////////////////////////////////////////////////////////
/////////////////////////SITE UTILS///////////////////////////////////
//////////////////////////////////////////////////////////////////////

const toggleButton = document.getElementById("toggle-btn")
const sidebar = document.getElementById("sidebar")

toggleButton.addEventListener("click", (event) => {
    sidebar.classList.toggle("close")
    toggleButton.classList.toggle("rotate")
    Array.from(sidebar.getElementsByClassName("show")).forEach((ul) => {
        ul.classList.remove("show")
        ul.previousElementSibling.classList.remove("rotate")
    })
})

function toggleSubMenu(event) {
    this.nextElementSibling.classList.toggle("show")
    this.classList.toggle("rotate")
    if (sidebar.classList.contains("close")) {
        sidebar.classList.toggle("close")
        toggleButton.classList.toggle("rotate")
    }
}

const dropdowns = document.querySelectorAll('.dropdown-btn');

dropdowns.forEach((val) => {
    val.addEventListener("click", toggleSubMenu)
})

//////////////////////////////////////////////////////////////////////
/////////////////////////AUTH/////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
async function checkUser() {
    const userCheck = await FirebaseUtils.isSignedIn()
    if (!userCheck) {
        window.location.href = "https://codeknight1119.github.io/The%20Tavern"
    } else {

        user = await FirebaseUtils.getDocument(`users/${userCheck.uid}`)
        user.uid = userCheck.uid

        const tokens = await userCheck.getIdTokenResult(true);
        const noisePerms = tokens.claims
        const firebaseNoise = ["name", "picture", "iss", "aud", "auth_time", "user_id", "sub", "iat", "exp", "email", "email_verified", "firebase"]

        const cleanPerms = Object.keys(noisePerms)
            .filter(key => !firebaseNoise.includes(key))
            .reduce((obj, key) => {
                obj[key] = noisePerms[key];
                return obj;
            }, {});
        permissions = Object.keys(cleanPerms)

        await getMyFeatures()
    }
}
checkUser()

//////////////////////////////////////////////////////////////////////
/////////////////////////PAGE RENDERING///////////////////////////////
//////////////////////////////////////////////////////////////////////


function newFeatureButton(val) {
    const template = document.getElementById("sidebarTemplate")
    let fragment = template.content.cloneNode(true)
    const a = fragment.querySelector('.nav-btn')
    const text = fragment.querySelector('.sidebarText')
    const icon = fragment.querySelector(".ra")

    text.innerText = val.name
    if(!val.icon || val.icon.trim() !== ""){
    icon.classList.add(val.icon.trim())
    }
    a.dataset.id = val.id
    a.addEventListener("click", handleSidebarClick)

    return fragment
}

async function getMyFeatures() {
    if (user !== null) {
        permissions.push("all")
        myFeatures = await FirebaseUtils.getDocuments("/features", undefined, { field: "priority" }, { field: "allowed", value: permissions })
       
        const parentSidebar = document.getElementById("everySidebarParent")
        const reversedFeatures = myFeatures.toReversed()

        reversedFeatures.forEach((val, index) => {
            const fragment = newFeatureButton(val)
            if (index === (reversedFeatures.length - 1)) {
                const li = fragment.querySelector('li')
                currentSelectedSidebar = li;
                li.classList.add("active")
                loadSidebar(val)
            }
            parentSidebar.prepend(fragment)
        })
        if (user.campaigns) {
            user.campaigns.forEach(async (campaign) => {
                const campaignInfo = await  FirebaseUtils.getDocument(`/features/${campaign.id}`)
                campaignInfo.id = campaign.id
                myFeatures.push(campaignInfo)
                ss_CAMPAIGNS.set(campaign.id, campaignInfo)
                const fragment = newFeatureButton(campaignInfo)
                document.getElementById("personal-menu").prepend(fragment)
            })
        }
    }
}


function handleSidebarClick(event) {
    event.preventDefault()
    const targetAnchor = event.target.closest('.nav-btn')
    if (!targetAnchor) return
    const clickedLi = targetAnchor.parentElement
    if (clickedLi === currentSelectedSidebar) return

    const idVal = targetAnchor.dataset.id
    const pageData = getFeatureById(idVal)

    if (!pageData) return

    // Cleaned up class toggling
    if (currentSelectedSidebar) {
        currentSelectedSidebar.classList.remove("active")
    }

    clickedLi.classList.add("active")
    currentSelectedSidebar = clickedLi

    mainContentArea.replaceChildren();
    loadSidebar(pageData)
}

const campaignUI = document.getElementById("campaignUI")
function hideFeatureHTML() {
    Array.from(document.getElementsByClassName("featureHTML")).forEach((val) => { val.hidden = true })
    if(activeFeatureType === "campaign"){
        document.querySelector("main").appendChild(campaignUI)
        campaignUI.hiden = true
    }
}

function loadSidebar(data) {
    hideFeatureHTML()
    activeFeatureType = data.type;
    switch (data.type) {
        case "tool":
            activeFeature = data.id; // FIXED: Set the active ID BEFORE rendering the tool logic
            renderTool(data.id)
            break;

        case "chat":
            renderChat(data.id)
            break;
        case "campaign":
           // console.log("Loading campaign", data)
           mainContentArea.appendChild(campaignUI)
           campaignUI.hidden = false;
            break
    }
}

function getFeatureById(id) {
    return myFeatures.find((obj) => obj.id === id)
}

const mainContentArea = document.getElementById("mainContentArea")

// Add 'id' as an optional third parameter
async function newBoard(title, body, id = null) {
    const fragment = document.getElementById("board-template").content.cloneNode(true);

    // 1. Grab a direct reference to the root container element right away
    const boardRoot = fragment.firstElementChild;

    const titleText = fragment.querySelector(".board-title");
    const bodyText = fragment.querySelector(".board-body");
    const delBtn = fragment.querySelector(".board-delete");
    const isOfficer = permissions.includes("officer");

    titleText.contentEditable = bodyText.contentEditable = isOfficer;
    delBtn.hidden = !isOfficer;

    let finalId = id;

    // 2. ONLY add a new document to Firebase if we didn't pass an existing ID
    if (!finalId) {
        const newDocData = await FirebaseUtils.addDocument(`/features/${activeFeature}/boards`, {
            title: title || "Title",
            body: body || "Type announcement"
        });
        finalId = newDocData.id;

        if (ss_TOOLS.get(activeFeature)) {
            ss_TOOLS.get(activeFeature).unshift({ id: finalId, ...newDocData });
        }
    }

    console.log(finalId);
    const path = `/features/${activeFeature}/boards/${finalId}`;

    if (isOfficer) {
        titleText.addEventListener("blur", async (event) => {
            const payload = { title: event.target.innerText };
            await FirebaseUtils.updateDocument(path, payload);
        });

        bodyText.addEventListener("blur", async (event) => {
            const payload = { body: event.target.innerText };
            await FirebaseUtils.updateDocument(path, payload);
        });

        delBtn.addEventListener("click", async () => {
            await FirebaseUtils.deleteDocument(path);
            // 3. Use the direct reference we saved earlier to delete it from the UI
            boardRoot.remove();
        });
    }

    titleText.innerText = title || "Title";
    bodyText.innerHTML = body || "Type announcement";

    // Prepend the finished fragment to your page
    mainContentArea.prepend(fragment);
}

document.getElementById("board-new").addEventListener("click", async () => { await newBoard() })

async function renderTool(id) {
    chatUI.hidden = true;

    // FIXED: Reset visibility states so buttons don't bleed across different tool pages
    document.getElementById("board-new").hidden = true;
    document.getElementById("userPermsUI").hidden = true;

    const toolData = getFeatureById(id)
    const BOARD_COUNT = 15

    switch (toolData.toolType) {
        case ("board"):
            let boards;
            if (permissions.includes("officer")) {
                document.getElementById("board-new").hidden = false;
            }

            if (ss_TOOLS.get(id)) {
                boards = ss_TOOLS.get(id)
            } else {
                boards = await FirebaseUtils.getDocuments(`features/${id}/boards`, BOARD_COUNT)
                ss_TOOLS.set(id, boards)
            }

            // FIXED: Wipe the slate clean right before drawing to stop concurrent/stacked duplications
            mainContentArea.replaceChildren();

            if (boards.length === 0) {
                mainContentArea.innerHTML = `<h3>No Messages</h3>`
                return
            }

            // FIXED: Removed unnecessary async/await inside the array loop
            boards.forEach((board) => {
                const parsedBody = marked.parse(board.body)
                newBoard(board.title, parsedBody, board.id)
            })
            break

        case ("userPermissions"):
            const ui = document.getElementById("userPermsUI")
            ui.hidden = false
            mainContentArea.innerHTML = "<p><strong>Search to find users</strong></p>"
            break
    }
}

async function renderChat(id) {
    chatUI.hidden = false;
    activeChat = id;
    const messages = await FirebaseUtils.getDocuments(`features/${id}/messages`, 50, { field: "timestamp" })

    if (messages.length === 0) {
        mainContentArea.innerHTML = `<h3>No Messages</h3>`
        return
    }
    messages.forEach((val) => {
        renderMessage(val)
    });
}

function renderMessage(data) {
    const isMine = (user && data.uid === user.uid) ? "mine" : "notMine";

    const displayName = data.username || data.name;
    const parsedContent = marked.parse(data.content);
    const htmlText = `
        <div class="message ${isMine}">
            <strong><p>${displayName}:</p></strong>
            <div>${parsedContent}</div>
        </div>
        `;
    const messageEl = document.createElement("div")
    if (!ss_CHATS.get(currentSelectedSidebar)) {
        mainContentArea.innerHTML = ""
        ss_CHATS.set(currentSelectedSidebar, [data])
    } else {
        ss_CHATS.get(currentSelectedSidebar).push(data)
    }
    messageEl.innerHTML = htmlText
    mainContentArea.insertAdjacentHTML('beforeend', htmlText);
}

async function handleChatMesage() {
    if (activeChat === null) return

    const markdownContent = messageInput.getMarkdown();

    const sendData = {
        content: markdownContent ?? messageInput.getText(),
        username: user.name,
        uid: user.uid,
        timestamp: Date.now()
    }

    messageInput.commands.clearContent();
    if (!ss_CHATS.get(activeChat)) {
        ss_CHATS.set(activeChat, [sendData])
    } else {
        ss_CHATS.get(activeChat).push(sendData)
    }
    renderMessage(sendData)

    await FirebaseUtils.addDocument(`features/${activeChat}/messages`, sendData)

}

document.getElementById("sendBtn").addEventListener("click", handleChatMesage)


const searchUserDropdown = document.getElementById("filterDropdown")
const searchTermInput = document.getElementById("searchTermIn")
let currentSearchUpdates = {}
searchUserDropdown.addEventListener("change", (event) => {
    const selectedValue = event.target.value;
    if (selectedValue === "searchName") {
        searchTermInput.hidden = false
    } else {
        searchTermInput.hidden = true
    }
})

document.getElementById("userSearchBttn").addEventListener("click", async () => {
    let doc = null;
    switch (searchUserDropdown.value) {
        case ("searchName"):
            if (searchTermInput.value === undefined || searchTermInput.value.trim() === "") {
                alert("No search term provided")
                return
            }

            doc = await FirebaseUtils.getDocumentFeildIncludes("/users", "Real Name", searchTermInput.value)
            break
        case ("notAllowed"):
            doc = await FirebaseUtils.getDocuments("/users", 15, {field: "allowed"})
            break
    }

    mainContentArea.replaceChildren()
    if (doc.length === 0) {
        const newP = document.createElement("p")
        newP.innerText = "No Person Found with name " + searchTermInput.value + "."
        return
    }
    const searchedTemplate = document.getElementById("userSearchTemplate")
    doc.forEach((val) => {
        const searchedRes = searchedTemplate.content.cloneNode(true)
        searchedRes.querySelector(".searched-Name").innerText = val["Real Name"]
        const userUID = val.id
        currentSearchUpdates[userUID] = {}

        let rolesText = ""
        if (val.permissions && val.permissions.length > 0) {
            val.permissions.forEach((role) => {
                rolesText += role + ",";
            })
            rolesText[rolesText.length - 1] = "."
        } else {
            rolesText = "None."
        }

        searchedRes.querySelector(".searched-roles").innerText = rolesText
        const allowedEl = searchedRes.querySelector(".searched-allowed")
        allowedEl.value = String(val.allowed)

        allowedEl.addEventListener("change", (event) => {
            const value = event.target.value;
            currentSearchUpdates[userUID].allowed = value.toLowerCase() === "true";
        })

        function checkPermsArr() {
            if (!currentSearchUpdates[userUID].permissions) {
                currentSearchUpdates[userUID].permissions = []
            }
        }
        const selectNewPerms = searchedRes.querySelector(".searched-addRole-val")
        searchedRes.querySelector(".searched-revokeRole-btn").addEventListener("click", () => {
            checkPermsArr()
            const removeVal = selectNewPerms.value
            if (currentSearchUpdates[userUID].permissions.includes(removeVal)) {
                currentSearchUpdates[userUID].permissions = currentSearchUpdates[userUID].permissions.filter(val => val !== removeVal)
            }
        })

        searchedRes.querySelector(".searched-addRole-val", () => {
            checkPermsArr()
            const addVal = selectNewPerms.value
            if (!currentSearchUpdates[userUID].permissions.includes(addVal)) {
                currentSearchUpdates[userUID].permissions.push(addVal)
            }
        })

        searchedRes.querySelector(".searched-save").addEventListener("click", async () => {
            console.log(currentSearchUpdates[userUID])
            FirebaseUtils.updateDocument(`users/${userUID}`, currentSearchUpdates[userUID])
            currentSearchUpdates[userUID] = {}
            const time = new Date()
            FirebaseUtils.ALog("Change Permissions", {
                officer: user.uid,
                updated_user: userUID,
                data: JSON.stringify(currentSearchUpdates[userUID]),
                time: time.toLocaleString()
            })
        })
        mainContentArea.appendChild(searchedRes)
    })
})

const campaign_divider = document.getElementById("campaign-splitScreenDivide");
const campaign_rightSide = document.getElementById("campaign-right");
const campaign_leftSide = document.getElementById("campaign-left");
const campaign_UI = document.getElementById("campaignUI");


// Function to center the divider perfectly
function centerSplitScreen() {
    // Only center it if the split screen is actually visible
    if (!campaign_divider.hidden) {
        const parentWidth = campaign_UI.getBoundingClientRect().width;
        const middle = parentWidth / 2;

        // Position the elements exactly in the center
        campaign_leftSide.style.right = (parentWidth - middle) + 'px';
        campaign_divider.style.left = middle + 'px';
        campaign_rightSide.style.left = (middle + 4) + 'px'; // 4px accounts for divider width
    }
}

// Run the centering logic when the page first loads
document.addEventListener("DOMContentLoaded", () => {
    // If your split screen starts out HIDDEN, you don't need to center it yet.
    // But if it starts out VISIBLE, call the function right away:
    centerSplitScreen();
});


document.getElementById("campaign-enterSplitscreen").addEventListener("click", () => {
  const isOpening = campaign_divider.hidden;
  
  campaign_divider.hidden = campaign_rightSide.hidden = !isOpening;
  
  if (isOpening) {
    // Instead of hardcoding 200px, dynamically center it!
    centerSplitScreen();
  } else {
    campaign_leftSide.style.right = "0px";
  }
});

let startX = 0;
let startLeftWidth = 0;
let maxContainerWidth = 0;

campaign_divider.addEventListener('mousedown', function(event) {
    startX = event.clientX;
    startLeftWidth = campaign_leftSide.getBoundingClientRect().width;
    
    // Dynamically grab the parent's current width so we don't drag out of bounds
    maxContainerWidth = campaign_UI.getBoundingClientRect().width;

    document.addEventListener('mousemove', startResizing);
    document.addEventListener('mouseup', stopResizing);
    
    event.preventDefault(); 
});



function startResizing(event) {
    const deltaX = event.clientX - startX;
    let newWidth = startLeftWidth + deltaX;

    // Boundary constraints: Keep the divider inside the parent container
    if (newWidth < 50) newWidth = 50; // Minimum left panel size
    if (newWidth > maxContainerWidth - 50) newWidth = maxContainerWidth - 50; // Minimum right panel size

    // Apply synchronized positioning updates
    campaign_leftSide.style.right = (maxContainerWidth - newWidth) + 'px';
    campaign_divider.style.left = newWidth + 'px';
    campaign_rightSide.style.left = (newWidth + 4) + 'px'; 
}

function stopResizing() {
    document.removeEventListener('mousemove', startResizing);
    document.removeEventListener('mouseup', stopResizing);
}

/*
console.log(`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⣤⣶⣶⣶⣶⣶⣶⣶⣤⣤⣤⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣴⡶⠟⠛⠉⠛⠛⠉⠙⠿⢛⣫⣽⣿⣿⣿⣿⣿⣿⣷⣦⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣶⡿⠛⠉⠀⠀⢀⠀⠀⠀⠀⢀⣾⣿⠿⢛⣭⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣁⣤⡶⠂⣠⣴⠏⠀⠀⠤⠾⠟⠋⢁⣀⣛⣛⣻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣤⡀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢠⣾⣿⣿⣿⣿⣿⣿⣟⣭⡞⠀⠀⠀⠀⠀⠀⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡦⢹⣦⡀⠀⠀⠀⠀
⠀⠀⠀⠀⣰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠉⣽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⣿⣿⣷⡄⠀⠀⠀
⠀⠀⠀⣰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣀⠀⠀⠀⠀⠀⠀⠀⢘⣿⣿⣿⣿⣿⡿⠿⠿⠿⠿⣿⣿⢟⣿⣿⣿⣿⠀⠀⠀
⠀⠀⢠⣿⣿⣿⣿⣿⢿⣿⡿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣶⣶⣾⠿⠿⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠈⣻⣦⣿⣿⣿⣿⡆⠀⠀
⠀⠀⣿⣿⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿⣿⣷⠀⠀
⠀⠀⣿⣿⣿⣿⣿⠀⠀⠀⢀⣄⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠒⠒⠂⠀⣀⣀⣀⣀⣀⠀⠀⠘⣿⣿⣿⣿⣿⣿⠀⠀
⠀⠀⣿⣿⣿⣿⠇⠀⠀⣠⠤⢤⣤⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⠤⠴⠒⠛⢉⣉⡥⠤⠶⠬⣽⡢⠀⡘⣿⣿⣿⣿⣿⠀⠀
⠀⠀⣿⣿⣿⣿⠀⠀⠀⣠⡶⠶⠶⠤⣍⡙⠓⠶⢤⣄⣀⡀⠀⠀⠀⢀⣀⡤⠶⠚⢉⡤⠖⠋⢉⠓⠢⠙⠂⠸⣿⣿⣿⣿⡏⠀⠀
⢀⣀⣸⣿⣿⣿⠀⠀⠀⣥⣾⣷⣦⣄⡀⠉⠓⠲⢤⣀⠈⠉⠉⠉⠉⠉⠀⠀⠀⠀⢀⣠⣴⣾⣿⣿⣶⣄⠀⠀⢻⣿⣿⣿⣷⡦⡀
⢻⣧⡉⢿⣿⡏⠀⠀⣼⠟⠉⠙⠛⠿⣿⣷⣦⡀⠀⠈⠑⠀⠀⠀⠀⠀⠀⠀⣠⣶⣿⠿⠛⠉⠈⠉⠉⠻⡄⠀⠘⣿⣿⡿⢿⣷⡷
⠘⣿⡇⠸⣿⡇⠀⢠⡏⠀⠀⣠⠴⢶⣦⣌⡙⠻⢷⣄⠀⣀⣀⡀⣀⡬⣦⠾⠋⢁⣠⣶⣚⣻⣓⠲⣄⠀⠱⠀⠀⣿⣿⠖⢠⣿⠃
⠀⠘⣿⠀⣿⡇⠀⠈⠀⢀⣘⣿⠋⣽⣿⣿⠻⣶⣄⠈⢧⡀⠀⠀⠁⢀⣿⠀⣴⡿⢋⣿⣸⣶⠉⣷⣬⡀⠀⠀⠀⢿⡟⠀⣴⠁⠀
⠀⠀⠸⡇⠘⠃⠀⠀⠀⠀⡛⢯⣀⠻⠿⢟⣀⣾⠿⠂⠞⢳⡀⠀⠀⣿⣟⠈⠛⠃⣄⣛⣛⣋⣠⠵⢋⠀⠀⠀⠀⠀⣧⢸⡇⠀⠀
⠀⠀⠀⣷⠴⡇⠀⠀⣠⠴⠿⣷⣾⣷⣿⣛⣉⠁⠀⠀⠀⢸⡆⠀⠀⠈⠀⠀⠀⠀⠻⢶⣶⣶⡶⠶⠯⠝⠀⠀⠀⢰⠙⣾⠀⠀⠀
⠀⠀⠀⣧⠀⠑⠀⣸⠁⠀⠀⠀⠀⠀⠀⠉⠁⠀⢀⣀⠀⣼⡧⠀⠀⠀⠀⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⡟⢁⡏⠀⠀⠀
⠀⠀⠀⠻⣆⣀⣴⡏⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⠏⠉⠙⠏⠀⠀⠀⠀⠀⠛⠈⢹⣷⣄⠀⠀⠀⠀⠀⠓⠀⠀⢸⣧⠜⠁⠀⠀⠀
⠀⠀⠀⠀⠈⠉⢸⣇⠀⠀⠀⠀⠀⠀⢠⡾⠟⠙⢆⡀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣼⠛⠛⠷⣄⡀⠀⠀⠀⠀⠀⣾⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⢀⠀⠀⢰⣏⠀⠀⠀⠀⠉⠛⠳⢦⣀⠀⢀⡴⠛⠋⠀⠀⠀⠀⠀⠉⠢⡀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢸⢻⡇⠀⢸⡇⠀⠀⠹⢤⣄⣀⠀⠀⠀⠀⠀⠙⠟⠋⠀⠀⠀⣀⡤⠖⠛⠳⠀⠀⠉⣲⠀⢸⠇⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢸⡌⢷⡀⠀⢿⡄⠀⠀⠀⠀⢯⡛⢶⡲⠦⠤⠤⡤⠤⠴⠒⢋⡅⠀⠀⠀⠀⠀⠀⢠⠏⢠⡟⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠘⣧⠀⠻⣦⡀⠻⣶⡄⠀⠀⠀⠙⠦⣤⣄⣀⣀⣀⣠⡤⠾⠋⠀⠀⠀⠀⠀⠀⣠⠏⡰⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠙⣧⡀⠈⠻⣦⡈⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⠷⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⢷⣦⣜⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠿⢿⣿⣿⣿⣦⣤⣤⣀⣀⣀⣀⣀⣠⣤⣴⣾⡿⠟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠙⠛⠛⠛⠻⠿⠿⠿⠛⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`)
console.log(`I can see you`)*/