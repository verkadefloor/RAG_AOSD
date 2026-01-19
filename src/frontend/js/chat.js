/* =========================================
   CONFIGURATION & GLOBALS
   ========================================= */
const TIME_LIMIT_SECONDS = 4*60; 
const SWITCH_DELAY_MS = 3000;      
const REVEAL_DELAY_MS = 1500;      

let currentFurniture = null;
let matches = [];
let viewedTitles = [];
let roundCounter = 0;
let timerInterval = null;
let revealTimeout = null;
let maxRounds = 2; // Default 2 dates per group
let timeLeft = 0;           
let pendingAction = null;   

// GLOBAL DATA
let globalQuestionPool = []; 
let usedQuestionsInRound = []; 

// DOM Elements
const furnitureNameEl = document.getElementById("furniture-name");
const chatBox = document.getElementById("chat-box");
const timerEl = document.getElementById("timer-display");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const furnitureUrlEl = document.getElementById("furniture-url");
const dateCounterEl = document.getElementById("date-counter");

// Image Elements
const imgContainer = document.getElementById("image-stack-container");
const imgNormalEl = document.getElementById("img-normal");
const imgRevealedEl = document.getElementById("img-revealed");

// Interaction Elements
const suggestionsContainer = document.getElementById("suggestions-container");
const inputContainer = document.getElementById("text-input-container");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Modals
const confirmModal = document.getElementById("confirmation-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMsg = document.getElementById("confirm-message");
const confirmYesBtn = document.getElementById("confirm-yes-btn");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
const confirmCloseX = document.getElementById("close-confirm");

const timesUpModal = document.getElementById("times-up-modal");
const timesUpForm = document.getElementById("times-up-form");
const timesUpEmail = document.getElementById("times-up-email");
const timesUpSuccess = document.getElementById("times-up-success");
const modalNextBtn = document.getElementById("modal-next-round-btn");

/* =========================================
   HELPER FUNCTIONS
   ========================================= */

function pickRandomQuestions(arr, count = 2) {
    if (!arr || arr.length === 0) return ["Hello?", "How are you?"];

    // Filter out questions that have been asked/clicked
    const available = arr.filter(q => !usedQuestionsInRound.includes(q));

    // Decide pool: If we have enough unused questions, pick from them, if empty recycle the full list.
    let sourcePool = (available.length >= count) ? available : arr;

    const copy = [...sourcePool];
    
    // Shuffle
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    
    return copy.slice(0, count);
}

/* =========================================
   INITIALIZATION & DATA LOADING
   ========================================= */

async function initChat() {
  try {
    console.log("Starting Chat Session...");

    // 1. Fetch Furniture List
    const furnitureRes = await fetch('/get_furniture_list'); 
    if (!furnitureRes.ok) throw new Error("Could not load furniture list");
    const furnitureData = await furnitureRes.json();

    // 2. Fetch Questions from Backend
    try {
        const questionsRes = await fetch('/get_questions');
        if (questionsRes.ok) {
            const loadedQuestions = await questionsRes.json();
            if (loadedQuestions && loadedQuestions.length > 0) {
                globalQuestionPool = loadedQuestions;
                console.log("Questions loaded:", globalQuestionPool.length);
            } else {
                globalQuestionPool = ["Who are you?", "What is your story?"];
            }
        }
    } catch (err) {
        console.warn("Using fallback questions.", err);
        globalQuestionPool = ["Who are you?", "How old are you?", "Where are you from?"];
    }

    // ---------------------------------------------------------
    // 3. MATCHMAKING LOGIC (UPDATED FOR GROUPS)
    // ---------------------------------------------------------
    
    // Check localStorage for specific IDs (from index.html)
    const storedIdsString = localStorage.getItem('selectedFurnitureIds');
    matches = [];

    if (storedIdsString) {
        try {
            // Parse the IDs ["BK-...", "BK-..."]
            const targetIds = JSON.parse(storedIdsString);
            
            // Filter furniture matching these numbers
            matches = furnitureData.filter(item => targetIds.includes(item.objectNumber));
            
            // NEW: Shuffle the order of the found matches
            matches.sort(() => 0.5 - Math.random()); // <--- THIS ENSURES RANDOM ORDER
            
            console.log(`Group loaded (random order):`, matches.map(m => m.title));
        } catch (e) {
            console.error("Error reading localStorage", e);
        }
    }

    // FALLBACK: If no group selected (or IDs invalid), pick 2 random items
    if (matches.length === 0) {
        console.warn("No specific group found. Random dates will be chosen.");
        matches = furnitureData.sort(() => 0.5 - Math.random()).slice(0, 2);
    }

    // Update max rounds based on what we found
    maxRounds = matches.length;

    // Start the first round
    startNextRound();

  } catch (error) {
    console.error("Critical Error:", error);
    if(chatBox) chatBox.innerHTML = "<p style='color:red; text-align:center; padding:20px;'>Server connection failed. Please restart.</p>";
  }
}

function startNextRound() {
  if(timesUpModal) timesUpModal.classList.add('hidden');

  if (roundCounter >= matches.length) { 
      endSession(); 
      return; 
  }
  currentFurniture = matches[roundCounter];
  
  if(!currentFurniture) { endSession(); return; }

  viewedTitles.push(currentFurniture.title);
  roundCounter++;

  setupUI();
  startTimer(TIME_LIMIT_SECONDS);
}

function startTimer(duration) {
  if (timerInterval) clearInterval(timerInterval);
  
  if (duration !== undefined) {
      timeLeft = duration;
  }

  const updateDisplay = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerEl.textContent = (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  };

  updateDisplay(); 

  timerInterval = setInterval(() => {
    timeLeft--;
    updateDisplay();
    
    if (timeLeft < 0) {
      clearInterval(timerInterval);
      if (confirmModal) confirmModal.classList.add('hidden');
      addToChat("bot", "<em>Time is up! The session has ended.</em>");
      showTimesUpModal();
    }
  }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

function endSession() {
  stopTimer();
  window.location.href = "/end";
}

// UI Setup
function setupUI() {
  if (revealTimeout) clearTimeout(revealTimeout);

  // --- Reset Question Memory for new date ---
  usedQuestionsInRound = [];

  // --- Reset Image & Name ---
  imgRevealedEl.style.transition = 'none';
  imgContainer.classList.remove("show-reveal");
  void imgRevealedEl.offsetHeight; // Force reflow
  imgRevealedEl.style.transition = ''; 

  furnitureNameEl.textContent = currentFurniture.title;
  if(dateCounterEl) dateCounterEl.textContent = `Date ${roundCounter} / ${matches.length}`;
  
  furnitureUrlEl.href = currentFurniture.url || "https://www.rijksmuseum.nl/en";
  furnitureUrlEl.textContent = "View on Collection Page";

  imgNormalEl.src = currentFurniture.image;
  imgRevealedEl.src = currentFurniture.image_after;
  
  // Fallback if image fails
  imgNormalEl.onerror = () => { 
      console.warn("Image not found:", currentFurniture.image);
      // imgNormalEl.src = "images/fallback.png"; // Uncomment if you have a fallback
  };

  // --- Reset Chat ---
  chatBox.innerHTML = ""; 
  addToChat("bot", `Hello! I am the ${currentFurniture.title}. Let's get to know each other!`);
  
  // --- Reset Input & Suggestions ---
  if(userInput) {
      userInput.value = "";
      userInput.disabled = false;
      userInput.focus();
  }
  if(sendBtn) sendBtn.disabled = false;

  // Render first batch
  renderSuggestions(pickRandomQuestions(globalQuestionPool, 2));

  // --- Reveal Animation ---
  revealTimeout = setTimeout(() => {
      if(imgContainer) imgContainer.classList.add("show-reveal");
  }, REVEAL_DELAY_MS);

  if (nextBtn) {
    nextBtn.disabled = false;
    // Update text: "Next Date" or "Finish" if it's the last one
    nextBtn.textContent = (roundCounter < matches.length) ? "Next Speeddate" : "Finish Dates";
    nextBtn.style.cursor = "pointer";
  }
}

/* =========================================
   CHAT & INTERACTION LOGIC
   ========================================= */

function renderSuggestions(questionsArray) {
    if(!suggestionsContainer) return;
    suggestionsContainer.innerHTML = ""; // Clear old chips

    questionsArray.forEach(qText => {        
        const btn = document.createElement("button");
        btn.className = "suggestion-chip";
        btn.textContent = qText;
        btn.onclick = () => askQuestion(qText);
        suggestionsContainer.appendChild(btn);
    });
}

function addToChat(sender, text) {
  const div = document.createElement("div");
  div.className = `chat-message ${sender}`;
  
  let name = "You";
  if (sender === "bot") {
      name = text.startsWith("<em>") ? "System" : (currentFurniture?.title || "Furniture");
  }

  div.innerHTML = `<strong>${name}:</strong> <span>${text}</span>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function askQuestion(questionText) {
  if (!currentFurniture) return;
  if (!questionText || !questionText.trim()) return; 
  
  // Add User Message to Chat
  addToChat("user", questionText);
  
  // Mark as used prevent this specific question from appearing again
  if (!usedQuestionsInRound.includes(questionText)) {
      usedQuestionsInRound.push(questionText);
  }

  // Clear Input & Disable Controls
  if(userInput) userInput.value = "";
  if(userInput) userInput.disabled = true;
  if(sendBtn) sendBtn.disabled = true;

  // Visually disable chips
  const chips = document.querySelectorAll(".suggestion-chip");
  chips.forEach(c => c.disabled = true);

  try {
    const res = await fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        furniture: currentFurniture.title, 
        question: questionText,
        context: currentFurniture.description 
      })
    });
    
    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();

    if (data.error) {
      addToChat("bot", `Error: ${data.error}`);
    } else {
      addToChat("bot", data.answer);
      
      // Generate new suggestions
      renderSuggestions(pickRandomQuestions(globalQuestionPool, 2));
    }

  } catch (err) {
    console.error("Interaction failed:", err);
    showConnectionError();
  } finally {
    // Re-enable Inputs
    if(userInput) userInput.disabled = false;
    if(sendBtn) sendBtn.disabled = false;
    if(userInput) userInput.focus();
  }
}

function showConnectionError() {
  const div = document.createElement("div");
  div.className = "chat-message bot connection-error";
  
  const title = currentFurniture?.title || "The Spirit World";
  // Try to get image, otherwise empty
  const imgSrc = currentFurniture?.image || ""; 

  div.innerHTML = `
    <strong>${title}:</strong>
    <div class="error-content">
        ${imgSrc ? `<img src="${imgSrc}" alt="${title}" class="error-mini-img">` : ''}
        <span class="error-text">... (silence) ...</span>
    </div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* =========================================
   CONFIRMATION MODAL LOGIC
   ========================================= */

function requestConfirmation(action) {
    pendingAction = action; 
    
    if (action === 'exit') {
        confirmTitle.textContent = "Exit Experience?";
        confirmMsg.textContent = "You will lose your progress and return to the home screen.";
        confirmYesBtn.textContent = "Yes, Exit";
        confirmYesBtn.style.backgroundColor = "#b5291ca6"; 
    } else if (action === 'next') {
        confirmTitle.textContent = "Skip Date?";
        confirmMsg.textContent = "Are you sure you want to end this date early?";
        confirmYesBtn.textContent = "Yes, Next Date";
        confirmYesBtn.style.backgroundColor = "#7da076"; 
    }

    if(confirmModal) confirmModal.classList.remove('hidden');
}

function closeConfirmation() {
    if(confirmModal) confirmModal.classList.add('hidden');
    pendingAction = null;
}

function confirmAction() {
    if(confirmModal) confirmModal.classList.add('hidden');
    
    if (pendingAction === 'exit') {
        stopTimer();
        window.location.href = "/";
    } 
    else if (pendingAction === 'next') {
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = "Moving on...";
            nextBtn.style.cursor = "wait";
            addToChat("user", "<em>I think we're done here. Next!</em>");
            
            stopTimer(); 
            if (revealTimeout) clearTimeout(revealTimeout);
            
            setTimeout(() => {
                startNextRound();
            }, SWITCH_DELAY_MS);
        }
    }
}

if (confirmYesBtn) confirmYesBtn.addEventListener('click', confirmAction);
if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', closeConfirmation);
if (confirmCloseX) confirmCloseX.addEventListener('click', closeConfirmation);

if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) closeConfirmation();
    });
}

if (nextBtn) nextBtn.onclick = () => requestConfirmation('next');
if (backBtn) backBtn.onclick = () => requestConfirmation('exit');

/* =========================================
   TIME'S UP MODAL LOGIC
   ========================================= */

function showTimesUpModal() {
    if (!timesUpModal) return;

    if(timesUpForm) timesUpForm.style.display = 'flex';
    if(timesUpSuccess) timesUpSuccess.classList.add('hidden');
    if(timesUpEmail) timesUpEmail.value = '';
    timesUpModal.classList.remove('hidden');
}

if (timesUpForm) {
    timesUpForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = timesUpEmail.value;
        const furnitureTitle = currentFurniture ? currentFurniture.title : "Unknown";
        console.log(`Email captured for ${furnitureTitle}: ${email}`);
        timesUpForm.style.display = 'none';
        timesUpSuccess.classList.remove('hidden');
    });
}

if (modalNextBtn) {
    modalNextBtn.onclick = () => {
        timesUpModal.classList.add('hidden');
        startNextRound();
    };
}

/* =========================================
   HISTORICAL CONTEXT MODAL LOGIC
   ========================================= */

const contextModal = document.getElementById('context-modal');
const warningBtn = document.querySelector('.corner-warning-btn');
const closeContextX = document.getElementById('close-context-x');
const closeContextBtn = document.getElementById('close-context-btn');

if (warningBtn) {
    warningBtn.addEventListener('click', () => {
        if (contextModal) contextModal.classList.remove('hidden');
    });
}

function closeContext() {
    if (contextModal) contextModal.classList.add('hidden');
}

if (closeContextX) closeContextX.addEventListener('click', closeContext);
if (closeContextBtn) closeContextBtn.addEventListener('click', closeContext);

if (contextModal) {
    contextModal.addEventListener('click', (e) => {
        if (e.target === contextModal) closeContext();
    });
}

/* =========================================
   INPUT & MUSIC EVENT LISTENERS
   ========================================= */

if (sendBtn) {
    sendBtn.onclick = () => {
        askQuestion(userInput.value);
    };
}

if (userInput) {
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            askQuestion(userInput.value);
        }
    });
}

// --- Image Interaction ---
const imageStackContainer = document.getElementById('image-stack-container');
if (imageStackContainer) {
    imageStackContainer.addEventListener('click', function() {
        this.classList.toggle('show-reveal');
    });
}

// --- Music Player ---
const musicBtn = document.getElementById('music-btn');
const bgMusic = document.getElementById('bg-music');

if (musicBtn && bgMusic) {
    const icon = musicBtn.querySelector('span');
    bgMusic.volume = 0.3; 
    
    // Attempt Auto-play
    const playPromise = bgMusic.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            icon.textContent = 'music_note';
        }).catch(error => {
            console.log("Autoplay prevented. Waiting for user interaction.");
            icon.textContent = 'music_off';
            document.addEventListener('click', function enableAudio() {
                bgMusic.play();
                icon.textContent = 'music_note';
                document.removeEventListener('click', enableAudio);
            }, { once: true });
        });
    }

    musicBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        if (bgMusic.paused) {
            bgMusic.play();
            icon.textContent = 'music_note'; 
        } else {
            bgMusic.pause();
            icon.textContent = 'music_off';
        }
    });
}

// Start Application
initChat();