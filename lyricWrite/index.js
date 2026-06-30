import * as FBUtils from "./firebaseUtils.js";

let currentSave = [];
let currentlySaved = true;
let songsToAdd = []; // Moved to global scope so updateSongOrder can see it
const list = document.querySelector('.sortable-list');
const songBtnTemplate = document.getElementById("songBtnTemplate"); // Moved to global scope

async function setUpMainPage() {
  songsToAdd = await FBUtils.getDocuments("/songs", 50, { field: "order" });

  songsToAdd.forEach((val) => {
    createNewSongBtn(val.title, val.id);
  });
}

function createNewSongBtn(name, id) {
  const newSongBtnFragment = songBtnTemplate.content.cloneNode(true);
  const newSongBtn = newSongBtnFragment.firstElementChild; // Target the actual element inside the fragment

  newSongBtn.dataset.songId = id;
  newSongBtn.querySelector(".title").innerText = name;

  const loadBtn = newSongBtn.querySelector(".loadBtn");
  loadBtn.addEventListener("click", () => {
    loadSong(id);
  });

  list.appendChild(newSongBtnFragment);
}

// Initial load
await setUpMainPage();

// --- Drag and Drop Logic ---
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

  document.querySelectorAll('.sortable-item').forEach(item => item.classList.remove('over'));

  if (draggingOverItem) {
    draggingOverItem.classList.add('over');
    list.insertBefore(draggingItem, draggingOverItem);
  } else {
    list.appendChild(draggingItem);
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

// --- Event Listeners & Database Sync ---

// Added missing "click" argument here
document.querySelector("#addSong").addEventListener("click", async () => {
  const newSong = await FBUtils.addDocument("/songs", { title: "New Song" });
  
  // Keep local array in sync
  songsToAdd.push({ id: newSong.id, title: "New Song", order: songsToAdd.length });
  
  createNewSongBtn("New Song", newSong.id);
  processChange(`songs/${newSong.id}`, { title: "New Song" });
});

function updateSongOrder() {
  const currentDOMItems = list.querySelectorAll('.sortable-item');
  const changedItems = [];

  currentDOMItems.forEach((item, index) => {
    const titleText = item.querySelector(".title").innerText; // Fixed: changed from #title to .title
    const song = songsToAdd.find(s => s.title === titleText);

    if (song) {
      if (song.order !== index) {
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
      processChange(`songs/${val.id}`, { order: val.newOrder });
    });
  } else {
    console.log("Item dropped, but the overall order remained the same.");
  }

  songsToAdd.sort((a, b) => a.order - b.order);
}

function processChange(path, newData) {
  let index = currentSave.findIndex(obj => obj.path === path);

  if (index === -1) {
    // Keep data payload nested or separated so saveCurrent can parse it easily
    currentSave.push({ path, data: newData });
  } else {
    currentSave[index].data = { ...currentSave[index].data, ...newData };
  }
  console.log(currentSave);
}

async function saveCurrent() {
  const promises = currentSave.map((change) => {
    return FBUtils.updateDocument(change.path, change.data);
  });
  
  // Wait for all updates to finish completely
  await Promise.all(promises);
  
  currentSave = [];
  currentlySaved = true;
}

async function loadSong(id) {
  await saveCurrent();
  const data = await FBUtils.getDocument(`songs/${id}`); 
  console.log("Loaded song data:", data);
}