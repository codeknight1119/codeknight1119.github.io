import * as FBUtils from "./firebaseUtils.js";

let currentSave = [];
let currentlySaved = true;
let MS_songsToAdd = []; 
let MS_maxSongOrder = 0;
let MS_ideas = [];
const list = document.querySelector('.sortable-list');
const songBtnTemplate = document.getElementById("songBtnTemplate"); 
let currentSong = null;
let SE_verseCount = 0;
let SE_maxSongOrder = 0;
const saveEditsButton = document.getElementById("saveEditsButton");

window.addEventListener("beforeunload", (event) => {
    if (!currentlySaved) {
        event.preventDefault();
        event.returnValue = "";
    }
});

setInterval(() => {
    if (!currentlySaved) {
        saveCurrent();
    }
}, 5000);


async function setUpMainPage() {
  MS_songsToAdd = await FBUtils.getDocuments("/songs", 50, { field: "order" });
  if(MS_songsToAdd.length !== 0){
    MS_songsToAdd.forEach((val) => {
      createNewSongBtn(val.title, val.id);
      if (val.order > MS_maxSongOrder) {
        MS_maxSongOrder = val.order;
      }
    });
  }

  MS_ideas = await FBUtils.getDocuments("/ideas", 50, {field: "timestamp"});
  if(MS_ideas.length !== 0){
    MS_ideas.forEach((val)=>{
      createNewIdea(val.text, val.id);
   });
  }
  triggerInitialResize();
}

function createNewSongBtn(name, id) {
  const newSongBtnFragment = songBtnTemplate.content.cloneNode(true);
  const newSongBtn = newSongBtnFragment.firstElementChild; 

  newSongBtn.dataset.songId = id;
  newSongBtn.querySelector("#songTitle").innerText = name;
  newSongBtn.dataset.lastSongName = name;

  const loadBtn = newSongBtn.querySelector(".loadBtn");
  loadBtn.addEventListener("click", () => {
    loadSong(id, name);
  });

  const container = newSongBtn.querySelector('#titleContainer');
  const textDisplay = newSongBtn.querySelector('#songTitle');
  const textInput = newSongBtn.querySelector('#songInput');

  textDisplay.addEventListener('click', () => {
    container.classList.add('is-editing');
    textInput.value = textDisplay.textContent;
    textInput.focus();
    textInput.select();
  });

  function saveEdit() {
    const trimmedValue = textInput.value.trim();
    if (trimmedValue !== '' && trimmedValue !== newSongBtn.dataset.lastSongName) {
      textDisplay.textContent = trimmedValue;
      newSongBtn.dataset.lastSongName = trimmedValue;
      processChange(`songs/${id}`, { title: textDisplay.textContent });
    }
    container.classList.remove('is-editing');
  }

  textInput.addEventListener('blur', saveEdit);
  textInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      saveEdit();
      textInput.blur();
    }
  });

  list.appendChild(newSongBtnFragment);
}

function createNewIdea(text, id){
  const newIdeaFragment = document.getElementById("templateIdea").content.cloneNode(true);
  const newIdea = newIdeaFragment.firstElementChild; 
  
  const writeArea = newIdea.querySelector(".writeLyrics");
  writeArea.value = text || ""; 
  newIdea.dataset.lastIdeaText = text || "";

  writeArea.addEventListener('click', () => {
    newIdea.classList.add('is-editing');
    writeArea.focus();
    writeArea.select();
  });

  function saveEdit() {
    const trimmedValue = writeArea.value.trim();
    if (trimmedValue !== '' && trimmedValue !== newIdea.dataset.lastIdeaText) {
      newIdea.dataset.lastIdeaText = trimmedValue;
      processChange(`ideas/${id}`, { text: trimmedValue }); 
    }
    newIdea.classList.remove('is-editing');
  }

  writeArea.addEventListener('blur', saveEdit);
  document.getElementById("existingIdeas").appendChild(newIdeaFragment);
}

// Initial load
await setUpMainPage();

// --- Drag and Drop Logic ---
let draggingItem = null;
let currentList = null;

document.querySelectorAll('.sortable-list').forEach(sortableList => {
  sortableList.addEventListener('dragstart', (e) => {
    // FIX: Find the closest draggable item element, even if dragging by title or inner card content
    const targetItem = e.target.closest('.sortable-item');
    if (!targetItem) return;

    draggingItem = targetItem;
    draggingItem.classList.add('dragging');
    currentList = sortableList;
  });

  sortableList.addEventListener('dragend', (e) => {
    if (!draggingItem) return;
    
    draggingItem.classList.remove('dragging');
    document.querySelectorAll('.sortable-item').forEach(item => item.classList.remove('over'));
    
    if (currentList.id === "songPartsHolder") {
        updateSongPartOrder();
    } else {
        updateSongOrder();
    }
    
    draggingItem = null;
    currentList = null;
  });

  sortableList.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggingItem) return;

    const draggingOverItem = getDragAfterElement(sortableList, e.clientY);
    sortableList.querySelectorAll('.sortable-item').forEach(item => item.classList.remove('over'));

    if (draggingOverItem) {
      draggingOverItem.classList.add('over');
      sortableList.insertBefore(draggingItem, draggingOverItem);
    } else {
      sortableList.appendChild(draggingItem);
    }
  });
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

document.querySelector("#addSong").addEventListener("click", async () => {
  MS_maxSongOrder++;
  const newSong = await FBUtils.addDocument("/songs", { title: "New Song", order: MS_maxSongOrder });
  MS_songsToAdd.push({ id: newSong.id, title: "New Song", order: MS_songsToAdd.length });
  createNewSongBtn("New Song", newSong.id);
});

function updateSongOrder() {
  const currentDOMItems = list.querySelectorAll('.sortable-item');
  const changeData = {};
  currentDOMItems.forEach((item, index) => {
    const songId = item.dataset.songId;
    if (songId) {
      processChange(`songs/${songId}`, { order: index });
    }
  });
}

function updateSongPartOrder() {
  const currentDOMItems = partsHolder.querySelectorAll('.sortable-item');
  const changeData = {};
  let currentVerseCount = 1;

  currentDOMItems.forEach((item, index) => {
    const partID = item.dataset.id;
    const type = item.dataset.partType; 
    let newName = item.querySelector(".songPartTitle").innerText;

    if (type === "verse") {
      newName = `Verse ${currentVerseCount}`;
      item.querySelector(".songPartTitle").innerText = newName;
      currentVerseCount++;
    }

    changeData[`parts.${partID}.order`] = index;
    changeData[`parts.${partID}.name`] = newName;
  });

  SE_verseCount = currentVerseCount;

  if (Object.keys(changeData).length > 0) {
    processChange(`songsData/${currentSong}`, changeData);
  }
}

function processChange(path, newData) {
  let index = currentSave.findIndex(obj => obj.path === path);

  if (index === -1) {
    currentSave.push({ path, data: newData });
  } else {
    currentSave[index].data = { ...currentSave[index].data, ...newData };
  }
  saveEditsButton.innerText = "Save (unsaved)";
  currentlySaved = false;
}

async function saveCurrent() {
  if (currentSave.length === 0) return;
  saveEditsButton.innerText = "Saving...";
  try {
    const promises = currentSave.map((change) => {
      return FBUtils.updateDocument(change.path, change.data);
    });

    await Promise.all(promises);
    currentSave = [];
    currentlySaved = true;
    saveEditsButton.innerText = "Save (saved)";
  } catch (e) {
    console.error(e);
  }
}

saveEditsButton.addEventListener("click", saveCurrent);

const mainPage = document.querySelector(".pageEnter");
const editPage = document.querySelector("#songEdit");

async function loadSong(id, name) {
  currentSong = id;
  SE_verseCount = 1;
  await saveCurrent();

  // FIX: Completely empty the inner HTML of partsHolder container to clean out all remaining <li> structures
  partsHolder.innerHTML = "";

  const data = await FBUtils.getDocument(`songsData/${id}`);
  
  if (data === undefined || !data.parts) {
    await FBUtils.setDocument(`songsData/${id}`, { parts: {} });
  } else {
    const sortedParts = Object.entries(data.parts).sort((a, b) => a[1].order - b[1].order);
    sortedParts.forEach(([partKey, partData]) => {
      createSongPart(partData.type, partData.lyrics, partKey); 
    });
  }

  editPage.querySelector(".pageTitle").innerText = name;
  const notesArea = editPage.querySelector("#notesArea");
  if(!data || !data.notes){
    notesArea.value = "";
  }else{
    notesArea.value = data.notes; 
  }

  mainPage.hidden = true;
  editPage.hidden = false;
  autoExpandTextarea(notesArea);
  triggerInitialResize();
}

const partTemplate = document.getElementById("templateSongPart");
const partsHolder = document.getElementById("songPartsHolder");

function createSongPart(type, lyrics, partID = `part_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`) {
  const newSongPartFragment = partTemplate.content.cloneNode(true);
  const newSongPartElement = newSongPartFragment.firstElementChild; 
  
  let name = capitalizeFirstLetter(type);
  if (type === "verse") {
    name += ` ${SE_verseCount}`;
    SE_verseCount++;
  }
  
  newSongPartElement.dataset.id = partID;
  newSongPartElement.dataset.partType = type; 
  newSongPartElement.querySelector(".songPartTitle").innerText = name;
  
  const textArea = newSongPartElement.querySelector(".writeLyrics");
  textArea.value = lyrics; 

  textArea.addEventListener("focusout", (event) => {
    const changeData = {};
    changeData[`parts.${partID}.lyrics`] = event.target.value;
    processChange(`songsData/${currentSong}`, changeData); 
  });

  partsHolder.appendChild(newSongPartFragment);
  return partID; 
}

function capitalizeFirstLetter(str) {
  if (!str) return ""; 
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const exitBTn = newSongPartElement.querySelector(".deleteSongPart")
exitBTn.addEventListener("click",()=>{
  if(confirm(`Do you want to delete ${name}? \n This cannot be undone`)){
    FBUtils.removeDocument(`songData/${currentSong}.${partID}`)
  }
})


const addNewSongPartBtn = document.querySelector("#createSongPartBtn");
const newSongPartDropdown = document.querySelector("#createSongPartDropdown");

addNewSongPartBtn.addEventListener("click", () => {
  const type = newSongPartDropdown.value;
  const order = partsHolder.querySelectorAll('.sortable-item').length; 

  const partId = createSongPart(type, "", undefined);

  const changeData = {};
  changeData[`parts.${partId}`] = {
      type: type,
      name: type === "verse" ? `Verse ${SE_verseCount - 1}` : capitalizeFirstLetter(type),
      lyrics: "",
      order: order
  };

  processChange(`songsData/${currentSong}`, changeData);
  triggerInitialResize();
});

document.getElementById("notesArea").addEventListener("focusout", (event)=>{
    processChange(`songsData/${currentSong}`, {notes: event.target.value}); 
});

document.getElementById("backToMainPage").addEventListener("click", async ()=>{
  await saveCurrent();
  mainPage.hidden = false;
  editPage.hidden = true;
});

const coppyButton = document.getElementById("copySong");
coppyButton.addEventListener("click", async () => {
  let copyText = `Title:${document.getElementById("pageTitle").innerText}\nNotes:\n${document.getElementById("notesArea").value}\n\n`;
  const partsContainer = document.getElementById("songPartsHolder");

  Array.from(partsContainer.children).forEach((val) => {
    const titleElement = val.querySelector(".songPartTitle");
    const lyricsElement = val.querySelector(".writeLyrics");

    if (titleElement && lyricsElement) {
      copyText += `[${titleElement.innerText}]\n${lyricsElement.value}\n\n`;
    }
  });
  
  try {
    await navigator.clipboard.writeText(copyText.trim());
    coppyButton.innerText = "Copied!";
    setTimeout(() => {
      coppyButton.innerText = "Copy";
    }, 500);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
});

document.getElementById("addIdea").addEventListener("click", async () => {
  const newText = "New Idea"; 
  const newDocData = { 
    text: newText,
    timestamp: Date.now() 
  };
  const addedDoc = await FBUtils.addDocument("ideas", newDocData);
  createNewIdea(newText, addedDoc.id);
  triggerInitialResize();
});

function autoExpandTextarea(textarea) {
    textarea.style.height = 'auto'; 
    let height = 0;
    if(textarea.scrollHeight < 50){
      height = 50;
    }else{
      height = textarea.scrollHeight;
    }
    textarea.style.height =  height + 'px'; 
}

document.body.addEventListener('input', function (e) {
    if (e.target.classList.contains('writeLyrics') || e.target.classList.contains('ideaChild')) {
        autoExpandTextarea(e.target);
    }
});

function triggerInitialResize() {
    document.querySelectorAll('.writeLyrics, .ideaChild').forEach(textarea => {
        autoExpandTextarea(textarea);
    });
}