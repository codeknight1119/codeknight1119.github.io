  import * as FirebaseUtils from "../firebaseUtils.js"

//////////////////////////////////////////////////////////////////////
/////////////////////////GLOBAL VARS//////////////////////////////////
//////////////////////////////////////////////////////////////////////
let user = null;
let currentSelectedSidebar = null 

//////////////////////////////////////////////////////////////////////
/////////////////////////SITE UTILS///////////////////////////////////
//////////////////////////////////////////////////////////////////////

const toggleButton = document.getElementById("toggle-btn")
const sidebar = document.getElementById("sidebar")

toggleButton.addEventListener("click", (event)=>{
    sidebar.classList.toggle("close")
    toggleButton.classList.toggle("rotate")
    Array.from(sidebar.getElementsByClassName("show")).forEach((ul)=>{
         ul.classList.remove("show")
         ul.previousElementSibling.classList.remove("rotate")
    })
})

function toggleSubMenu(event){
this.nextElementSibling.classList.toggle("show")    
this.classList.toggle("rotate")
if(sidebar.classList.contains("close")){
        sidebar.classList.toggle("close")
        toggleButton.classList.toggle("rotate")
    }
}

const dropdowns = document.querySelectorAll('.dropdown-btn');

dropdowns.forEach((val)=>{
    val.addEventListener("click", toggleSubMenu)
})

//////////////////////////////////////////////////////////////////////
/////////////////////////AUTH/////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

const userCheck = await FirebaseUtils.isSignedIn()
if(!userCheck){
    window.location.href = "https://codeknight1119.github.io/The%20Tavern"
}


//////////////////////////////////////////////////////////////////////
/////////////////////////PAGE RENDERING///////////////////////////////
//////////////////////////////////////////////////////////////////////

const everyonePages = [
    {name: "Guild Bulletin", type:"tool", id: "GB", icon: "ra-wooden-sign"},
    {name: "Quest Board", type:"tool", id: "QB", icon: "ra-horn-call"},
    {name: "Officer's Desk", type:"tool", id: "OD", icon: "ra-sheriff"},
    {name: "Tavern Talk", type:"chat", id: "TT", icon: "ra-speech-bubbles"},
]

const template = document.getElementById("sidebarTemplate")
const parentSidebar = document.getElementById("everySidebarParent")

everyonePages.forEach((val, index)=>{
    let fragment = template.content.cloneNode(true)
    
    const li = fragment.querySelector('li')
    const a = fragment.querySelector('.nav-btn')
    const text = fragment.querySelector('.sidebarText')
    const icon = fragment.querySelector(".ra")

    text.innerText = val.name
    icon.classList.add(val.icon)

    a.dataset.id = val.id
    a.addEventListener("click", handleSidebarClick)

    if(index === 0){
        currentSelectedSidebar = li 
        li.classList.add("active")
    }
    
    parentSidebar.prepend(fragment)
})

function handleSidebarClick(event){
    event.preventDefault()

    const targetAnchor = event.target.closest('.nav-btn')
    if (!targetAnchor) return

    const idVal = targetAnchor.dataset.id

  const pageData = everyonePages.find((obj) => obj.id === idVal)
  if (!pageData) return
  currentSelectedSidebar.classList.toggle("active")

  if (currentSelectedSidebar) {
        currentSelectedSidebar.classList.remove("active")
    }

    const clickedLi = targetAnchor.parentElement
    clickedLi.classList.add("active")
    currentSelectedSidebar = clickedLi
  
  switch (pageData.type) {
    case "tool":
        renderTool(idVal)
        break;
  
    case "chat":
        renderChat(idVal)
        break;
  }
}

async function renderTool(id) {
  console.log(`Rendering tool: ${id}`)  
}

async function renderChat(id) {
  console.log(`Rendering Chat: ${id}`)  
}