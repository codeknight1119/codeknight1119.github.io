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
let activeChat = null;
let activeFeature = null;


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

        const tokens =  await userCheck.getIdTokenResult(true);
        const noisePerms = tokens.claims
        const firebaseNoise = ["name","picture","iss","aud","auth_time","user_id","sub","iat","exp","email","email_verified","firebase"]

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

function hideFeatureHTML(){
    Array.from(document.getElementsByClassName("featureHTML")).forEach((val)=>{val.hidden = true})
}

async function getMyFeatures() {
    if (user !== null) {
        
        permissions.push("all")
        myFeatures = await FirebaseUtils.getDocuments("/features", undefined, { field: "priority" }, { field: "allowed", value: permissions })
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
                currentSelectedSidebar = currentSelectedSidebar
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
            activeFeature = data.id
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

async function newBoard(title, body){
    
    const newBoard = document.getElementById("board:template").content.cloneNode(true)
    const titleText = newBoard.querySelector(".board-title")
    const bodyText = newBoard.querySelector(".board-body")
    const delBtn = newBoard.querySelector(".board-delete")
    const isOfficer = permissions.includes("officer")
    titleText.contentEditable = bodyText.contentEditable = isOfficer
    delBtn.hidden = !isOfficer
    const newDocData =  await FirebaseUtils.addDocument(`/features/${activeFeature}/boards`, {title: title || "Title", body: body || "Type announcement"})
    const id = newDocData.id
    console.log(newDocData)
    const path =   `/features/${activeFeature}/boards/${id}`

    if(isOfficer){
        titleText.addEventListener("blur", async (event)=>{
            const payload = {
                title : event.target.innerText
            }
            await FirebaseUtils.updateDocument(path, payload)
        })

        bodyText.addEventListener("blur", async (event)=>{
            const payload = {
                body : event.target.innerText
            }
            await FirebaseUtils.updateDocument(path, payload)
        })
        delBtn.addEventListener("click", async ()=>{
            await FirebaseUtils.deleteDocument(path)
        })
    } 
    titleText.innerText = title || "Title"
    bodyText.innerText = body || "Type announcement"
    mainContentArea.prepend(newBoard)
}

document.getElementById("board:new").addEventListener("click", async ()=>{await newBoard()})

async function renderTool(id) {
    chatUI.hidden = true;
    const toolData = getFeatureById(id)

    const BOARD_COUNT = 15

    switch (toolData.toolType) {
        case ("board"):
            let boards;
            let canEdit = false;

            if(permissions.includes("officer")){
               canEdit = true;
               document.getElementById("board:new").hidden = false;
            }

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
            boards.forEach(async (board) => {
                const parsedBody = marked.parse(board.body)
               await newBoard(board.title, parsedBody)
            })

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

searchUserDropdown.addEventListener("change", (event)=>{
    const selectedValue = event.target.value;
    if(selectedValue === "searchName"){
        searchTermInput.hidden = false
    }else{
        searchTermInput.hidden = true
    }
})

document.getElementById("userSearchBttn").addEventListener("click", async ()=>{
    switch(searchUserDropdown.value){
        case("searchName"):
        if(searchTermInput.value === undefined || searchTermInput.value.trim() === ""){
            alert("No search term provided")
            return
        }
        const doc = await FirebaseUtils.getDocumentFeildIncludes("/users", "Real Name",searchTermInput.value)
        mainContentArea.replaceChildren()
        if(doc.length === 0){
            const newP = document.createElement("p")
            newP.innerText = "No Person Found with name " + searchTermInput.value + "."
            return
        }
        const searchedTemplate = document.getElementById("userSearchTemplate")
        doc.forEach((val)=>{
            const seachedRes = searchedTemplate.cloneNode(true)
            seachedRes.querySelector(".searched:Name").innerText = val["Real Name"]
            const permsHolder = seachedRes.querySelector(".searched-roles")
            val.permissions.forEach((role)=>{
                const newRoletext = document.createElement("p")
                newRoletext.innerText = role;
                permsHolder.appendChild(newRoletext)
            })
            mainContentArea.appendChild(seachedRes)
        })
        break
    }
})


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
console.log("I can see you")*/