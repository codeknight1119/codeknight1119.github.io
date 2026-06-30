import * as FBUtils from "./firebaseUtils.js"
let currentSave = [

]

let currentlySaved = true;
const list = document.querySelector('.sortable-list');

async function setUpMainPage() {
  const songsToAdd = await FBUtils.getDocuments("/songs", 50, { field: "order" })

  const songBtnTemplate = document.getElementById("songBtnTemplate")
  songsToAdd.forEach((val) => {
    createNewSongBtn(val.title, val.id)
  })
}

function createNewSongBtn(name, id){
  const newSongBtn = songBtnTemplate.content.cloneNode(true)

  newSongBtn.dataset.songId = id
  
    newSongBtn.querySelector(".title").innerText = name

    const loadBtn = newSongBtn.querySelector(".loadBtn")
    
    loadBtn.addEventListener("click", ()=>{
      loadSong(id)
    })
    list.appendChild(newSongBtn)
}

await setUpMainPage()

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


document.querySelector(".addSong").addEventListener(async ()=>{
const newSong = await FBUtils.addDocument("/songs", {title:"New Song"})
createNewSongBtn("New Song", newSong.id)
processChange(`song/${newSong.id}`, {title:"New Song"})

})

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
          newOrder: index,
          id: item.dataset.songId
        });

        song.order = index;
      }
    }
  });

  if (changedItems.length > 0) {
    console.log("These items changed position:", changedItems);
    changedItems.forEach((val) => {
      processChange(`songs/${val.id}`, { order: val.newOrder })
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
  currentSave.forEach((change) => {
    FBUtils.updateDocument(change.path, change.data)
  })
  currentSave = []
  currentlySaved = true
}


async function loadSong(id) {
  await saveCurrent()
const data = FBUtils.getDocuments(`songs/${id}`, 15, {field : "order"})
console.log(data)
}