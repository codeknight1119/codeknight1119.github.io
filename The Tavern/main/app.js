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