import * as FBUtils from "./firebaseUtils.js"
let currentSave = [

]

let currentlySaved = true;

const songsToAdd = [
    {title:"Veiled", order: 0},
    {title:"Ultimate Chaos", order: 1}
]

const list = document.querySelector('.sortable-list');
const songBtnTemplate = document.getElementById("songBtnTemplate")
songsToAdd.forEach((val)=>{
const newSongBtn = songBtnTemplate.content.cloneNode(true)
newSongBtn.querySelector("#title").innerText = val.title
list.appendChild(newSongBtn)
})

let draggingItem = null;

list.addEventListener('dragstart', (e) => {
draggingItem = e.target;
e.target.classList.add('dragging');
});

list.addEventListener('dragend', (e) => {
e.target.classList.remove('dragging');
document.querySelectorAll('.sortable-item').forEach(item => item.classList.remove('over'));
draggingItem = null;
updateSongOrder();
});

list.addEventListener('dragover', (e) => {
e.preventDefault();
const draggingOverItem = getDragAfterElement(list, e.clientY);

// Remove .over from all items
document.querySelectorAll('.sortable-item').forEach(item => item.classList.remove('over'));

if (draggingOverItem) {
    draggingOverItem.classList.add('over'); // Add .over to the hovered item
    list.insertBefore(draggingItem, draggingOverItem);
} else {
    list.appendChild(draggingItem); // Append to the end if no item below
}
});

function getDragAfterElement(container, y) {
const draggableElements = [...container.querySelectorAll('.sortable-item:not(.dragging)')];

return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
    return { offset: offset, element: child };
    } else {
    return closest;
    }
}, { offset: Number.NEGATIVE_INFINITY }).element;
}


function updateSongOrder() {
  const currentDOMItems = list.querySelectorAll('.sortable-item');
  
  // Array to keep track of ONLY the elements that actually moved
  const changedItems = [];

  currentDOMItems.forEach((item, index) => {
    const titleText = item.querySelector("#title").innerText;
    const song = songsToAdd.find(s => s.title === titleText);
    
    if (song) {
      if (song.order !== index) {
        
        // 2. Track the change before updating the object
        changedItems.push({
          title: song.title,
          oldOrder: song.order,
          newOrder: index
        });

        song.order = index; 
      }
    }
  });

  if (changedItems.length > 0) {
    console.log("These items changed position:", changedItems);
    changedItems.forEach((val)=>{
        processChange(`songs/${changedItems.title}`, {order: changedItems.newOrder})
    })
    
  } else {
    console.log("Item dropped, but the overall order remained the same.");
  }


  songsToAdd.sort((a, b) => a.order - b.order);
}

function processChange(path, newData) {
    let index = currentSave.findIndex(obj => obj.path === path);
    
    if (index === -1) {
        currentSave.push({ path, ...newData });
    } else {
        currentSave[index] = { ...currentSave[index], ...newData };
    }
    console.log(currentSave)
}

async function saveCurrent() {
    currentSave.forEach((change)=>{
FBUtils.updateDocument(change.path, change.data)
    })
    currentSave = []
    currentlySaved = true
}