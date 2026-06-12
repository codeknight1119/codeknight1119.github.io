import * as FirebaseUtils from "../firebaseUtils.js"
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { Editor } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';
import { Markdown } from 'https://esm.sh/@tiptap/markdown';



//////////////////////////////////////////////////////////////////////
/////////////////////////GLOBAL VARS//////////////////////////////////
//////////////////////////////////////////////////////////////////////
let user = null;
let myFeatures = null;
let currentSelectedSidebar = null
const chatUI = document.getElementById("chatTools")
let ss_TOOLS = new Map()
let ss_CHATS = new Map()
let activeChat = null;

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
        await getMyFeatures()
    }
}
checkUser()

//////////////////////////////////////////////////////////////////////
/////////////////////////PAGE RENDERING///////////////////////////////
//////////////////////////////////////////////////////////////////////

function hideFeatureHTML(){
    Array.from(document.getElementsByClassName("featureHTML")).forEach((val)=>{val.hidden = true})
}

async function getMyFeatures() {
    if (user !== null) {
        let permsArray = user.permissions.slice()
        permsArray.push("all")
        myFeatures = await FirebaseUtils.getDocuments("/features", undefined, { field: "priority" }, { field: "allowed", value: permsArray })
        const template = document.getElementById("sidebarTemplate")
        const parentSidebar = document.getElementById("everySidebarParent")

        const reversedFeatures = myFeatures.toReversed()

        reversedFeatures.forEach((val, index) => {
            let fragment = template.content.cloneNode(true)

            const li = fragment.querySelector('li')
            const a = fragment.querySelector('.nav-btn')
            const text = fragment.querySelector('.sidebarText')
            const icon = fragment.querySelector(".ra")

            text.innerText = val.name
            icon.classList.add(val.icon.trim())

            a.dataset.id = val.id
            a.addEventListener("click", handleSidebarClick)

            if (index === (reversedFeatures.length - 1)) {
                currentSelectedSidebar = li
                li.classList.add("active")
                loadSidebar(val)
            }

            parentSidebar.prepend(fragment)
        })

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

function loadSidebar(data) {
        hideFeatureHTML()
    switch (data.type) {
        case "tool":
            renderTool(data.id)
            break;

        case "chat":
            renderChat(data.id)
            break;
    }
}

function getFeatureById(id) {
    return myFeatures.find((obj) => obj.id === id)
}

const mainContentArea = document.getElementById("mainContentArea")

async function renderTool(id) {
    chatUI.hidden = true;
    const toolData = getFeatureById(id)

    const BOARD_COUNT = 15

    switch (toolData.toolType) {
        case ("board"):
            let boards;
            if (ss_TOOLS.get(id)) {
                boards = ss_TOOLS.get(id)
            } else {
                boards = await FirebaseUtils.getDocuments(`features/${id}/boards`, BOARD_COUNT)
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
    case("userPermissions"):
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
    console.log(messages)

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
    if(!ss_CHATS.get(currentSelectedSidebar)){
        mainContentArea.innerHTML = ""
        ss_CHATS.set(currentSelectedSidebar, [data])
    }else{
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

    Object.kets(sendData).forEach((val)=>{
        console.log(val +" : "+sendData[val])
    })

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

