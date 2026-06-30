import * as FBUtils from "./firebaseUtils.js";

let currentSave = [];
let currentlySaved = true;
let MS_songsToAdd = []; // Moved to global scope so updateSongOrder can see it
let MS_maxSongOrder = 0;
const list = document.querySelector('.sortable-list');
const songBtnTemplate = document.getElementById("songBtnTemplate"); // Moved to global scope

async function setUpMainPage() {
  MS_songsToAdd = await FBUtils.getDocuments("/songs", 50, { field: "order" });

  MS_songsToAdd.forEach((val) => {
    createNewSongBtn(val.title, val.id);
    if (val.order > MS_maxSongOrder) {
      MS_maxSongOrder = val.order
    }
  });
}

function createNewSongBtn(name, id) {
  const newSongBtnFragment = songBtnTemplate.content.cloneNode(true);
  const newSongBtn = newSongBtnFragment.firstElementChild; // Target the actual element inside the fragment


  newSongBtn.dataset.songId = id;
  newSongBtn.querySelector("#songTitle").innerText = name;
  newSongBtn.dataset.lastSongName = name


  const loadBtn = newSongBtn.querySelector(".loadBtn");
  loadBtn.addEventListener("click", () => {
    loadSong(id);
  });

  const container = newSongBtn.querySelector('#titleContainer');
  const textDisplay = newSongBtn.querySelector('#songTitle');
  const textInput = newSongBtn.querySelector('#songInput');

  // 1. Enter Edit Mode
  textDisplay.addEventListener('click', () => {
    container.classList.add('is-editing');

    // Make sure input matches the current text
    textInput.value = textDisplay.textContent;

    // Focus the input and select the text for easy overriding
    textInput.focus();
    textInput.select();
  });

  // 2. Save Function
  function saveEdit() {
    const trimmedValue = textInput.value.trim();

    // Change || to && so BOTH conditions must be true to trigger a save
    if (trimmedValue !== '' && trimmedValue !== newSongBtn.dataset.lastSongName) {
      textDisplay.textContent = trimmedValue;
      newSongBtn.dataset.lastSongName = trimmedValue;
      processChange(`songs/${id}`, { title: textDisplay.textContent });
    }

    container.classList.remove('is-editing');
  }
  // 3. Save when the user taps outside the input box (loses focus)
  textInput.addEventListener('blur', saveEdit);

  textInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      saveEdit();
      textInput.blur();
    }
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
  MS_maxSongOrder++
  const newSong = await FBUtils.addDocument("/songs", { title: "New Song", order: MS_maxSongOrder++ });

  // Keep local array in sync
  MS_songsToAdd.push({ id: newSong.id, title: "New Song", order: MS_songsToAdd.length });

  createNewSongBtn("New Song", newSong.id);
});

function updateSongOrder() {
  const currentDOMItems = list.querySelectorAll('.sortable-item');
  const changedItems = [];

  currentDOMItems.forEach((item, index) => {
    const titleText = item.querySelector(".title").innerText; // Fixed: changed from #title to .title
    const song = MS_songsToAdd.find(s => s.title === titleText);

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

  MS_songsToAdd.sort((a, b) => a.order - b.order);
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
  try{
  const promises = currentSave.map((change) => {
    return FBUtils.updateDocument(change.path, change.data);
  });

  // Wait for all updates to finish completely
  await Promise.all(promises);

  currentSave = [];
  currentlySaved = true;
  console.log("saved")
}catch(e){
  console.error(e);
  
}
  
}

document.addEventListener('keydown', (event) => {
    if(event.key === "s"){
      saveCurrent()
    }
});

async function loadSong(id) {
  await saveCurrent();
  const data = await FBUtils.getDocument(`songs/${id}`);
  console.log("Loaded song data:", data);
}