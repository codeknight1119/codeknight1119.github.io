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
    {name: "Officer's Desk", type:"tool", id: "OD", icon: "ra-horn-call"},
    {name: "Tavern Talk", type:"chat", id: "TT", icon: "ra-speech-bubbles"},
]

const template = document.getElementById("sidebarTemplate")
const parentSidebar = document.getElementById("everySidebarParent")

everyonePages.forEach((val, index)=>{
    let newEl = template.content.cloneNode(true)
    const text = newEl.querySelector('.sidebarText')
    const icon = newEl.querySelector(".ra")
    text.innerText = val.name
    icon.classList.add(val.icon)
    if(index === 0){
        currentSelectedSidebar = newEl
        icon.classList.add("active")
    }
    
    parentSidebar.append(newEl)
})

function handleSidebarClick(event){
    const button = event.target
    const idVal = button.value
  const pageData = everyonePages.find((obj)=>{obj.id === idVal})
  currentSelectedSidebar.classList.toggle("active")
  
  switch (pageData.type) {
    case "tool":
        renderTool(idVal)
        break;
  
    case "chat":
        renderChat(idVal)
        break;
  }
}