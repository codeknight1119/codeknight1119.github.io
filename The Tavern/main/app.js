import * as FirebaseUtils from "../firebaseUtils.js"
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { Editor } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';

//////////////////////////////////////////////////////////////////////
/////////////////////////GLOBAL VARS//////////////////////////////////
//////////////////////////////////////////////////////////////////////
let user = null;
let currentSelectedSidebar = null
const chatUI = document.getElementById("chatTools")
let ss_TOOLS = new Map()
let ss_CHATS = new Map()
let activeChat = null;

const chatArea = document.getElementById("sendBar")

const messageInput = new Editor({
    element: chatArea,
    extensions: [StarterKit],
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
        user = userCheck
        FirebaseUtils.ALog("User signed in", { uid: userCheck.uid, name: userCheck.displayName })
    }
}
checkUser()

//////////////////////////////////////////////////////////////////////
/////////////////////////PAGE RENDERING///////////////////////////////
//////////////////////////////////////////////////////////////////////

const everyonePages = [
    { name: "Guild Bulletin", type: "tool", id: "GB", icon: "ra-wooden-sign", toolType: "board" },
    { name: "Quest Board", type: "tool", id: "QB", icon: "ra-horn-call", toolType: "board" },
    { name: "Officer's Desk", type: "tool", id: "OD", icon: "ra-sheriff" },
    { name: "Tavern Talk", type: "chat", id: "TT", icon: "ra-speech-bubbles" },
]

const template = document.getElementById("sidebarTemplate")
const parentSidebar = document.getElementById("everySidebarParent")

const reversedEveryonePages = everyonePages.toReversed()

reversedEveryonePages.forEach((val, index) => {
    let fragment = template.content.cloneNode(true)

    const li = fragment.querySelector('li')
    const a = fragment.querySelector('.nav-btn')
    const text = fragment.querySelector('.sidebarText')
    const icon = fragment.querySelector(".ra")

    text.innerText = val.name
    icon.classList.add(val.icon)

    a.dataset.id = val.id
    a.addEventListener("click", handleSidebarClick)

    if (index === (reversedEveryonePages.length - 1)) {
        currentSelectedSidebar = li
        li.classList.add("active")
        loadSidebar(val)
    }

    parentSidebar.prepend(fragment)
})




function handleSidebarClick(event) {
    event.preventDefault()

    const targetAnchor = event.target.closest('.nav-btn')
    if (!targetAnchor) return
    const clickedLi = targetAnchor.parentElement
    if (clickedLi === currentSelectedSidebar) return

    const idVal = targetAnchor.dataset.id
    const pageData = everyonePages.find((obj) => obj.id === idVal)

    if (!pageData) return

    // Cleaned up class toggling
    if (currentSelectedSidebar) {
        currentSelectedSidebar.classList.remove("active")
    }

    clickedLi.classList.add("active")
    currentSelectedSidebar = clickedLi

    // Pass the entire pageData object directly
    loadSidebar(pageData)
}

function loadSidebar(data) {
    switch (data.type) {
        case "tool":
            renderTool(data.id)
            break;

        case "chat":
            renderChat(data.id)
            break;
    }
}

const mainContentArea = document.getElementById("mainContentArea")

async function renderTool(id) {
    chatUI.hidden = true;
    const toolData = everyonePages.find((obj) => obj.id === id)

    const BOARD_COUNT = 15

    switch (toolData.toolType) {
        case ("board"):
            let boards;
            if (ss_TOOLS.get(id)) {
                boards = ss_TOOLS.get(id)
            } else {
                boards = await FirebaseUtils.getDocuments(`tools/${id}/boards`, BOARD_COUNT)
                ss_TOOLS.set(id, boards)
            }
            if (boards.length === 0) {
                mainContentArea.innerHTML = `<h3>No Messages</h3>`
                return
            }
            let finalHTMLText = "";
            boards.forEach((board) => {
                const parsedBody = marked.parse(board.body)
                const htmlText = `
        <section class='boardMessage'>
        <h3 class="cinzel-title">${board.title}</h3>
        <p>${parsedBody}</p>
        </section>
        `
                finalHTMLText += htmlText
            })
            finalHTMLText = "<div>" + finalHTMLText + "</div>"
            mainContentArea.innerHTML = finalHTMLText
            break

    }
}

async function renderChat(id) {
    chatUI.hidden = false;
    activeChat = id;
    const messages = await FirebaseUtils.getDocuments(`rooms/${id}/messages`, 50, { field: "timestamp" })

    if (messages.length === 0) {
        mainContentArea.innerHTML = `<h3>No Messages</h3>`
        return
    }

    let finalChatHTML = "";

    messages.forEach((val) => {
        const isMine = (user && val.sender.uid === user.uid) ? "mine" : "notMine";

        const displayName = val.sender.name || val.sender.displayName;
        const parsedContent = marked.parse(val.content);
        const htmlText = `
        <div class="message ${isMine}">
            <strong><p>${displayName}:</p></strong>
            <div>${parsedContent}</div>
        </div>
        `;

        finalChatHTML += htmlText;
    });

    mainContentArea.innerHTML = finalChatHTML;
}


async function handleChatMesage() {
    if (activeChat === null) return
    const sendData = {
        content: messageInput.getText(),
        username: user.displayName,
        uid: user.uid,
        timestamp: Date.now()
    }
    messageInput.commands.clearContent();
    FirebaseUtils.addDocument(`conversations/${activeChat}`, sendData)
    if (!ss_CHATS.get(activeChat)) {
        ss_CHATS.set(activeChat, [sendData])
    } else {
        ss_CHATS.get(activeChat).push(sendData)
    }
    renderMessage(sendData)
}

document.getElementById("sendBtn").addEventListener("click", handleChatMesage)

