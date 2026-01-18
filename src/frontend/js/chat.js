/* =========================================
   CONFIGURATION & GLOBALS
   ========================================= */
const TIME_LIMIT_SECONDS = 300; 
const SWITCH_DELAY_MS = 3000;      
const REVEAL_DELAY_MS = 1500;      

let currentFurniture = null;
let matches = [];
let viewedTitles = [];
let roundCounter = 0;
let timerInterval = null;
let revealTimeout = null;
let maxRounds = 3;
let timeLeft = 0;           
let pendingAction = null;   

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

// Question Buttons
const btn0 = document.getElementById("q0");
const btn1 = document.getElementById("q1");
const btn2 = document.getElementById("q2");

// NEW: Input Elements
const optionsContainer = document.getElementById("options-container");
const inputContainer = document.getElementById("text-input-container");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// NEW: State tracking
let isFirstInteraction = true;
 
// --- MERGED: Question Pool Logic (From HEAD) ---
// pool of 9 questions
const START_QUESTION_POOL = [
  // basic facts
  "How old are you?",
  "When were you made?",
  "Who made you?",
  "Where are you from?",
  "What material are you made of?",
  "If you could choose a room today, where would you belong?",
  "What characteristic are you most proud of, and why?",
  "Who was your owner?", 

  // fun / flirty icebreakers
  "What’s your biggest green flag?",
  "What’s your biggest red flag?",
  "Wow, you look stunning!",
  "I did not expect to fall for a piece of furniture today.",
  "What kind of person usually falls for you?",
  "What is your type?"
];

function pick3Unique(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 3);
}

// --- MERGED: Modal Elements (From frontend-ui) ---
const confirmModal = document.getElementById("confirmation-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMsg = document.getElementById("confirm-message");
const confirmYesBtn = document.getElementById("confirm-yes-btn");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
const confirmCloseX = document.getElementById("close-confirm");

const timesUpModal = document.getElementById("times-up-modal");
const timesUpName = document.getElementById("times-up-name");
const timesUpForm = document.getElementById("times-up-form");
const timesUpEmail = document.getElementById("times-up-email");
const timesUpSuccess = document.getElementById("times-up-success");
const modalNextBtn = document.getElementById("modal-next-round-btn");

/* =========================================
   INITIALIZATION & ROUND LOGIC
   ========================================= */

async function initChat() {
  try {
    const response = await fetch('/get_furniture_list'); 
    if (!response.ok) throw new Error("Kon lijst niet laden");
    
    const data = await response.json();

    let selectedPeriod = localStorage.getItem("selectedPeriod");
    let roundsPref = localStorage.getItem("numberOfRounds");
    
    selectedPeriod = selectedPeriod ? selectedPeriod.toLowerCase().trim() : 'all';
    maxRounds = roundsPref ? parseInt(roundsPref) : 3; 

    // Find Matches
    let strictMatches = data.filter(item => {
      const itemPeriod = (item.period || "").toLowerCase().trim();
      return (selectedPeriod === 'all' || itemPeriod === selectedPeriod);
    });

    if (strictMatches.length >= maxRounds) {
      matches = strictMatches.sort(() => 0.5 - Math.random()).slice(0, maxRounds);
    } 
    else {
      const primaryCandidates = strictMatches.sort(() => 0.5 - Math.random());
      const needed = maxRounds - primaryCandidates.length;
      const primaryTitles = primaryCandidates.map(i => i.title);
      const potentialFillers = data.filter(item => !primaryTitles.includes(item.title));
      const fillers = potentialFillers.sort(() => 0.5 - Math.random()).slice(0, needed);
      matches = [...primaryCandidates, ...fillers];
    }

    startNextRound();

  } catch (error) {
    console.error("Critical Error:", error);
    chatBox.innerHTML = "<p style='color:red'>Server connection failed.</p>";
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
  imgNormalEl.onerror = () => { imgNormalEl.src = "images/fallback.png"; };

  // --- Reset Chat & Input State ---
  chatBox.innerHTML = ""; 
  addToChat("bot", `Hello! I am candidate ${roundCounter}. Let's get to know each other!`);
  
  // RESET LOGIC: 
  isFirstInteraction = true; // Flag reset
  
  if(optionsContainer) optionsContainer.style.display = 'flex'; // Show buttons
  if(inputContainer) inputContainer.style.display = 'none';     // Hide input

  // Generate 3 random questions for the start
  updateButtons(pick3Unique(START_QUESTION_POOL));
  setButtonsState(true); 

  // --- Reveal Animation ---
  revealTimeout = setTimeout(() => {
      if(imgContainer) imgContainer.classList.add("show-reveal");
  }, REVEAL_DELAY_MS);

  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.textContent = "Next Speeddate";
    nextBtn.style.cursor = "pointer";
  }
}

/* =========================================
   CHAT & INTERACTION LOGIC
   ========================================= */

function updateButtons(questionsArray) {
  const buttons = [btn0, btn1, btn2];
  buttons.forEach((btn, index) => {
    if (btn && questionsArray[index]) {
      btn.textContent = questionsArray[index];
    }
  });
}

function setButtonsState(isEnabled) {
  const buttons = [btn0, btn1, btn2];
  buttons.forEach(btn => {
    if(btn) btn.disabled = !isEnabled;
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
  if (!questionText || !questionText.trim()) return; // Prevent empty sends
  
  // 1. Add User Message to Chat
  addToChat("user", questionText);
  
  // 2. SWAP UI (If this is the first move)
  if (isFirstInteraction) {
      isFirstInteraction = false;
      if(optionsContainer) optionsContainer.style.display = 'none'; // Hide buttons
      if(inputContainer) inputContainer.style.display = 'flex';     // Show text box
      
      // Auto-focus the input for smoother UX
      if(userInput) setTimeout(() => userInput.focus(), 50);
  }

  // 3. Disable Inputs while waiting
  setButtonsState(false);
  if(userInput) userInput.disabled = true;
  if(sendBtn) sendBtn.disabled = true;

  // Clear input box
  if(userInput) userInput.value = "";

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
      // NOTE: We don't update buttons anymore because they are hidden!
    }

  } catch (err) {
    console.error("Interaction failed:", err);
    showConnectionError();
  } finally {
    // 4. Re-enable Inputs
    setButtonsState(true);
    if(userInput) userInput.disabled = false;
    if(sendBtn) sendBtn.disabled = false;
    
    // Keep focus on input for fast chatting
    if(userInput && !isFirstInteraction) userInput.focus();
  }
}

function showConnectionError() {
  const div = document.createElement("div");
  div.className = "chat-message bot connection-error";
  
  const title = currentFurniture?.title || "The Spirit World";
  const imgSrc = currentFurniture?.image || "images/fallback.png";

  div.innerHTML = `
    <strong>${title}:</strong>
    <div class="error-content">
        <img src="${imgSrc}" alt="${title}" class="error-mini-img">
        <span class="error-text">Sorry... I don't feel the connection anymore.</span>
    </div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Listeners
btn0.onclick = function() { askQuestion(this.textContent); };
btn1.onclick = function() { askQuestion(this.textContent); };
btn2.onclick = function() { askQuestion(this.textContent); };

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

    confirmModal.classList.remove('hidden');
}

function closeConfirmation() {
    confirmModal.classList.add('hidden');
    pendingAction = null;
}

function confirmAction() {
    confirmModal.classList.add('hidden');
    
    if (pendingAction === 'exit') {
        stopTimer();
        window.location.href = "/";
    } 
    else if (pendingAction === 'next') {
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = "Looking for matches...";
            nextBtn.style.cursor = "wait";
            addToChat("user", "<em>I don't think this is a match. Next please!</em>");
            
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

    if(timesUpName) timesUpName.textContent = currentFurniture ? currentFurniture.title : "this piece";

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
   SETTINGS MODAL LOGIC
   ========================================= */

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const modalPeriod = document.getElementById('modal-period');
const modalRounds = document.getElementById('modal-rounds');

function toggleSettings() {
    if (!settingsModal) return;
    const isHidden = settingsModal.classList.contains('hidden');
    
    if (isHidden) {
        if (timerInterval) clearInterval(timerInterval); 
        
        const currentPeriod = localStorage.getItem('selectedPeriod') || 'all';
        const currentRounds = localStorage.getItem('numberOfRounds') || '3';
        if(modalPeriod) modalPeriod.value = currentPeriod;
        if(modalRounds) modalRounds.value = currentRounds;
        settingsModal.classList.remove('hidden');
    } else {
        settingsModal.classList.add('hidden');
        startTimer(); 
    }
}

function saveAndRestart() {
    if(modalPeriod) localStorage.setItem('selectedPeriod', modalPeriod.value);
    if(modalRounds) localStorage.setItem('numberOfRounds', modalRounds.value);
    toggleSettings();
    window.location.reload(); 
}

if (settingsBtn) settingsBtn.addEventListener('click', toggleSettings);
if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', toggleSettings);
if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveAndRestart);

if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) toggleSettings();
    });
}

const imageStackContainer = document.getElementById('image-stack-container');
if (imageStackContainer) {
    imageStackContainer.addEventListener('click', function() {
        this.classList.toggle('show-reveal');
    });
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

// Make the "Send" button work
if (sendBtn) {
    sendBtn.onclick = () => {
        askQuestion(userInput.value);
    };
}

// Make the "Enter" key work
if (userInput) {
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            askQuestion(userInput.value);
        }
    });
  }

/* ======================
   BACKGROUND MUSIC LOGIC
   ====================== */
const musicBtn = document.getElementById('music-btn');
const bgMusic = document.getElementById('bg-music');

if (musicBtn && bgMusic) {
    const icon = musicBtn.querySelector('span');
    
    // Set volume 
    bgMusic.volume = 0.3; 
    const playPromise = bgMusic.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            icon.textContent = 'music_note';
        }).catch(error => {
            // If autoplay was blocked by the browser, set the icon to 'off' and wait for the first user interaction.
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
            icon.textContent = 'music_note'; // Note icon = Playing
        } else {
            bgMusic.pause();
            icon.textContent = 'music_off';  // Crossed icon = Muted
        }
    });
}
// Start
initChat();