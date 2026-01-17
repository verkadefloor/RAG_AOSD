// configuration
const TIME_LIMIT_SECONDS = 5 * 60; //duration date
const MAX_ROUNDS = 3;              // max number of rounds
const SWITCH_DELAY_MS = 3000;      // waighting time before next round
const REVEAL_DELAY_MS = 1500;      // waiting time before revealing image

// global variables
let currentFurniture = null;
let matches = [];
let viewedTitles = [];
let roundCounter = 0;
let timerInterval = null;
let revealTimeout = null;

// DOM elements
const furnitureNameEl = document.getElementById("furniture-name");
const chatBox = document.getElementById("chat-box");
const timerEl = document.getElementById("timer-display");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");

// image elements
const imgContainer = document.getElementById("image-stack-container");
const imgNormalEl = document.getElementById("img-normal");
const imgRevealedEl = document.getElementById("img-revealed");

// question buttons
const btn0 = document.getElementById("q0");
const btn1 = document.getElementById("q1");
const btn2 = document.getElementById("q2");

// pool van 9 startvragen
const START_QUESTION_POOL = [
  // basic facts (past bij jullie JSON velden)
  "How old are you?",
  "When were you made?",
  "Who made you?",
  "Where are you from?",
  "What material are you made of?",
  "If you could choose a room today, where would you belong?",
  "What characteristic are you most proud of, and why?",
  "Who was your owner?", 

  // fun / flirty icebreakers (hoeven geen facts)
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

// start application
async function initChat() {
  try {
    const response = await fetch('/get_furniture_list'); 
    if (!response.ok) throw new Error("Kon lijst niet laden");
    
    const data = await response.json();

    let selectedPeriod = localStorage.getItem("selectedPeriod");
    let selectedType = localStorage.getItem("selectedType");
    
    selectedPeriod = selectedPeriod ? selectedPeriod.toLowerCase().trim() : 'all';
    selectedType = selectedType ? selectedType.toLowerCase().trim() : 'all';

    matches = data.filter(item => {
      const itemPeriod = (item.period || "").toLowerCase().trim();
      const itemType = (item.type || "").toLowerCase().trim();
      const periodMatch = (selectedPeriod === 'all' || itemPeriod === selectedPeriod);
      const typeMatch = (selectedType === 'all' || itemType === selectedType);
      return periodMatch && typeMatch;
    });

    if (matches.length === 0) {
      matches = data; 
    }

    startNextRound();

  } catch (error) {
    console.error("Critical Error:", error);
    chatBox.innerHTML = "<p style='color:red'>Server connection failed.</p>";
  }
}

// start next round
function startNextRound() {
  if (roundCounter >= MAX_ROUNDS) { endSession(); return; }
  const availableCandidates = matches.filter(item => !viewedTitles.includes(item.title));
  if (availableCandidates.length === 0) { endSession(); return; }

  const randomIndex = Math.floor(Math.random() * availableCandidates.length);
  currentFurniture = availableCandidates[randomIndex];
  viewedTitles.push(currentFurniture.title);
  roundCounter++;

  setupUI();
  startTimer(TIME_LIMIT_SECONDS);
}

// Timer 
function startTimer(duration) {
  if (timerInterval) clearInterval(timerInterval);
  let timer = duration;
  const updateDisplay = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    timerEl.textContent = (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  };
  updateDisplay(); 
  timerInterval = setInterval(() => {
    timer--;
    updateDisplay();
    if (timer < 0) {
      clearInterval(timerInterval);
      addToChat("bot", "<em>Time is up! Let's meet the next candidate...</em>");
      setTimeout(startNextRound, 2000);
    }
  }, 1000);
}

// end session
function endSession() {
  if (timerInterval) clearInterval(timerInterval);
  window.location.href = "/end";
}

// UI Setup
function setupUI() {
  if (revealTimeout) clearTimeout(revealTimeout);
  
  imgRevealedEl.style.transition = 'none';
  imgContainer.classList.remove("show-reveal");
  void imgRevealedEl.offsetHeight; 
  imgRevealedEl.style.transition = '';

  furnitureNameEl.textContent = currentFurniture.title;
  imgNormalEl.src = currentFurniture.image; 
  imgRevealedEl.src = currentFurniture.image_after;
  imgNormalEl.onerror = () => { imgNormalEl.src = "images/fallback.png"; };

  chatBox.innerHTML = ""; 
  addToChat("bot", `Hello! I am candidate #${roundCounter}: ${currentFurniture.title}. You have 5 minutes.`);
  
  updateButtons(pick3Unique(START_QUESTION_POOL));

  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.textContent = "Next Date ➔";
    nextBtn.style.cursor = "pointer";
  }

  revealTimeout = setTimeout(() => {
      imgContainer.classList.add("show-reveal");
  }, REVEAL_DELAY_MS);
}

function updateButtons(questionsArray) {
  if (questionsArray.length > 0) btn0.textContent = questionsArray[0];
  if (questionsArray.length > 1) btn1.textContent = questionsArray[1];
  if (questionsArray.length > 2) btn2.textContent = questionsArray[2];
}

// chat functions
function addToChat(sender, text) {
  const div = document.createElement("div");
  div.className = "chat-message " + sender;
  let name = "You";
  if (sender === "bot") {
      if (text.startsWith("<em>")) name = "System";
      else name = currentFurniture ? currentFurniture.title : "Furniture";
  }
  div.innerHTML = `<strong>${name}:</strong> <span>${text}</span>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// error connection message
function showConnectionError() {
  const div = document.createElement("div");
  div.className = "chat-message bot connection-error";

  const title = currentFurniture ? currentFurniture.title : "The Spirit World";

  const imgSrc = currentFurniture ? currentFurniture.image : "images/fallback.png";

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

async function askQuestion(questionText) {
  if (!currentFurniture) return;
  
  // 1. Add user's question to chat
  addToChat("user", questionText);

  // 2. Disable buttons while thinking
  btn0.disabled = true; btn1.disabled = true; btn2.disabled = true;

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
    
    if (!res.ok) {
        throw new Error("Server responded with " + res.status);
    }

    const data = await res.json();

    if (data.error) {
      addToChat("bot", "Error: " + data.error);
    } else {
      // 3. Add the furniture's response to chat
      addToChat("bot", data.answer);

      // 4. UPDATE BUTTONS (The new logic)
      // Check if the backend provided new options
      if (data.options && Array.isArray(data.options) && data.options.length > 0) {
          updateButtons(data.options);
      }
    }

  } catch (err) {
    console.error("Connection lost:", err);
    showConnectionError();
    
  } finally {
    // 5. Re-enable buttons
    btn0.disabled = false; btn1.disabled = false; btn2.disabled = false;
  }
}

// event Listeners 
btn0.onclick = function() { askQuestion(this.textContent); };
btn1.onclick = function() { askQuestion(this.textContent); };
btn2.onclick = function() { askQuestion(this.textContent); };

if (nextBtn) {
  nextBtn.onclick = () => {
    nextBtn.disabled = true;
    nextBtn.textContent = "Looking for matches...";
    nextBtn.style.cursor = "wait";
    addToChat("user", "<em>I don't think this is a match. Next please!</em>");
    if (timerInterval) clearInterval(timerInterval);
    if (revealTimeout) clearTimeout(revealTimeout);
    setTimeout(() => {
      startNextRound();
    }, SWITCH_DELAY_MS);
  };
}

if (backBtn) {
  backBtn.onclick = () => {
    if (timerInterval) clearInterval(timerInterval);
    if (revealTimeout) clearTimeout(revealTimeout);
    window.location.href = "/";
  };
}

initChat();