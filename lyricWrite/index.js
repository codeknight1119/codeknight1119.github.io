import * as FBUtils from "./firebaseUtils.js";

let currentSave = [];
let currentlySaved = true;
let MS_songsToAdd = []; // Moved to global scope so updateSongOrder can see it
let MS_maxSongOrder = 0;
let MS_ideas = []
const list = document.querySelector('.sortable-list');
const songBtnTemplate = document.getElementById("songBtnTemplate"); // Moved to global scope
let currentSong = null;
let SE_verseCount = 0;
let SE_maxSongOrder = 0;
const saveEditsButton = document.getElementById("saveEditsButton")

async function setUpMainPage() {
  MS_songsToAdd = await FBUtils.getDocuments("/songs", 50, { field: "order" });
if(MS_songsToAdd.length !== 0){
  MS_songsToAdd.forEach((val) => {
    createNewSongBtn(val.title, val.id);
    if (val.order > MS_maxSongOrder) {
      MS_maxSongOrder = val.order
    }
  });
}

  // Change 'feild' to 'field'
MS_ideas = await FBUtils.getDocuments("/ideas", 50, {field: "timestamp"});
  if(MS_ideas.length !== 0){
    MS_ideas.forEach((val)=>{
      createNewIdea(val.text, val.id)
   })
}

}

function createNewSongBtn(name, id) {
  const newSongBtnFragment = songBtnTemplate.content.cloneNode(true);
  const newSongBtn = newSongBtnFragment.firstElementChild; // Target the actual element inside the fragment


  newSongBtn.dataset.songId = id;
  newSongBtn.querySelector("#songTitle").innerText = name;
  newSongBtn.dataset.lastSongName = name


  const loadBtn = newSongBtn.querySelector(".loadBtn");
  loadBtn.addEventListener("click", () => {
    loadSong(id, name);
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

function createNewIdea(text, id){
  // 1. Grab the fragment, THEN target the actual element
  const newIdeaFragment = document.getElementById("templateIdea").content.cloneNode(true);
  const newIdea = newIdeaFragment.firstElementChild; 
  
  const writeArea = newIdea.querySelector(".writeLyrics");
  // Assuming writeLyrics is a textarea/input. Use .innerText if it's a div.
  writeArea.value = text || ""; 

  // Track the last saved text to prevent unnecessary database writes
  newIdea.dataset.lastIdeaText = text || "";

  // Enter Edit Mode
  writeArea.addEventListener('click', () => {
    newIdea.classList.add('is-editing');
    writeArea.focus();
    writeArea.select();
  });

  // Save Function
  function saveEdit() {
    const trimmedValue = writeArea.value.trim();

    // Check if it's not empty AND actually changed
    if (trimmedValue !== '' && trimmedValue !== newIdea.dataset.lastIdeaText) {
      newIdea.dataset.lastIdeaText = trimmedValue;
      // Assuming ideas use the 'text' key based on setUpMainPage
      processChange(`ideas/${id}`, { text: trimmedValue }); 
    }

    newIdea.classList.remove('is-editing');
  }

  // Save when the user taps outside the input box (loses focus)
  writeArea.addEventListener('blur', saveEdit);

  writeArea.addEventListener('keypress', (event) => {
    // If it's a textarea, you might want to use shift+enter for new lines, 
    // but for now keeping your logic!
    if (event.key === 'Enter') {
      saveEdit();
      writeArea.blur();
    }
  });

  // Append the fragment to the DOM
  document.getElementById("existingIdeas").appendChild(newIdeaFragment);
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
  const newSong = await FBUtils.addDocument("/songs", { title: "New Song", order: MS_maxSongOrder });

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
  MS_maxSongOrder = currentDOMItems.length > 0 ? currentDOMItems.length - 1 : 0;

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
  saveEditsButton.innerText = "Save (unsaved)"
  currentlySaved = false;
}


async function saveCurrent() {
        saveEditsButton.innerText = "Saving..."
  console.log("saving")
  try {
    const promises = currentSave.map((change) => {
      return FBUtils.updateDocument(change.path, change.data);
    });

    // Wait for all updates to finish completely
    await Promise.all(promises);

    currentSave = [];
    currentlySaved = true;
      saveEditsButton.innerText = "Save (saved)"

    console.log("saved")
  } catch (e) {
    console.error(e);

  }


}
saveEditsButton.addEventListener("click", saveCurrent)

const mainPage = document.querySelector(".pageEnter")
const editPage = document.querySelector("#songEdit")


async function loadSong(id, name) {
  currentSong = id;
  SE_verseCount = 1;
  await saveCurrent();
  
  // Clear out old song parts from the UI if any exist from a previous view
  partsHolder.querySelectorAll('.song-part-class-name').forEach(el => el.remove()); 

  const data = await FBUtils.getDocument(`songsData/${id}`);
  
  if (data === undefined || !data.parts) {
    await FBUtils.setDocument(`songsData/${id}`, { parts: {} });
  } else {
    // 1. Turn object values into an array and sort them by the 'order' field
    const sortedParts = Object.entries(data.parts).sort((a, b) => a[1].order - b[1].order);

    // 2. Loop through and build the UI
    sortedParts.forEach(([partKey, partData]) => {
      // Pass the existing partKey so it updates the exact record later
      createSongPart(partData.type, partData.lyrics, partKey); 
    });
  }

  editPage.querySelector(".pageTitle").innerText = name;
  editPage.querySelector("#notesArea").innerText = data.notes
  mainPage.hidden = true;
  editPage.hidden = false;
}

const partTemplate = document.getElementById("templateSongPart")
const partsHolder = document.getElementById("songEdit")

// Add partId as an argument so it can accept existing IDs on load, or generate a new one if missing
function createSongPart(type, lyrics, partID = `part_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`) {
  const newSongPartFragment = partTemplate.content.cloneNode(true);
  const newSongPartElement = newSongPartFragment.firstElementChild; // Target actual DOM element
  
  let name = capitalizeFirstLetter(type);
  if (type === "verse") {
    name += ` ${SE_verseCount}`;
    SE_verseCount++;
  }
  
  newSongPartElement.dataset.id = partID;
  newSongPartElement.querySelector(".songPartTitle").innerText = name;
  
  const textArea = newSongPartElement.querySelector(".writeLyrics");
  textArea.value = lyrics; // Use .value instead of .innerText for textareas

  textArea.addEventListener("focusout", (event) => {
    const changeData = {};
    // Use dot notation to strictly update the lyrics string for this specific part
    changeData[`parts.${partID}.lyrics`] = event.target.value;
    
    // Fix: currentSong holds the active song ID
    processChange(`songsData/${currentSong}`, changeData); 
  });

  partsHolder.appendChild(newSongPartFragment);
  return partID; // Return the ID so the click handler can use it
}

function capitalizeFirstLetter(str) {
  if (!str) return ""; // Handle empty strings safely
  return str.charAt(0).toUpperCase() + str.slice(1);
}


const addNewSongPartBtn = document.querySelector("#createSongPartBtn")
const newSongPartDropdown = document.querySelector("#createSongPartDropdown")

addNewSongPartBtn.addEventListener("click", () => {
  const type = newSongPartDropdown.value;
  const order = SE_verseCount; 

  // 1. Render on UI and catch the generated ID
  const partId = createSongPart(type, "", undefined);

  // 2. Save entire object block using dot notation for the new part
  const changeData = {};
  changeData[`parts.${partId}`] = {
      type: type,
      name: type === "verse" ? `Verse ${SE_verseCount - 1}` : capitalizeFirstLetter(type),
      lyrics: "",
      order: order
  };

  processChange(`songsData/${currentSong}`, changeData);
});


document.getElementById("notesArea").addEventListener("focusout", (event)=>{
    processChange(`songsData/${currentSong}`, {notes: event.target.value}); 
})

document.getElementById("backToMainPage").addEventListener("click", ()=>{
  mainPage.hidden = false;
  editPage.hidden = true;
})

const coppyButton = document.getElementById("copySong")
coppyButton.addEventListener("click", async () => {
  // 1. Better formatting with \n so the text isn't weirdly indented
  let copyText = `Notes:\n${document.getElementById("notesArea").value}\n\n`;

  // 2. Make sure this ID matches where your parts actually live
  // Falling back to "songEdit" just in case based on your earlier code
  const partsContainer = document.getElementById("songPartsHolder") || document.getElementById("songEdit");

  Array.from(partsContainer.children).forEach((val) => {
    const titleElement = val.querySelector(".songPartTitle");
    const lyricsElement = val.querySelector(".writeLyrics");

    // 3. Safety check: Only copy if this child element is actually a song part
    if (titleElement && lyricsElement) {
      // 4. FIX: Use .value here instead of .innerText!
      copyText += `[${titleElement.innerText}]\n${lyricsElement.value}\n\n`;
    }
  });
  
  try {
    await navigator.clipboard.writeText(copyText.trim()); // trim() removes any trailing extra lines
    coppyButton.innerText = "Copied!"; // Fixed minor typo here ('Coppied' -> 'Copied')
    setTimeout(() => {
      coppyButton.innerText = "Copy";
    }, 500);

  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
});


document.getElementById("addIdea").addEventListener("click", async () => {
  const newText = "New Idea"; // Or whatever default text you want
  
  // Add the default text and a timestamp so your query can sort it properly
  const newDocData = { 
    text: newText,
    timestamp: Date.now() 
  };
  
  const addedDoc = await FBUtils.addDocument("ideas", newDocData);
  
  // Update the UI immediately without needing a refresh!
  // Note: Depending on your FBUtils, you might need to use addedDoc.id or generate your own ID.
  createNewIdea(newText, addedDoc.id);
});