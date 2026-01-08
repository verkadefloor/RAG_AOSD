// --- CONFIGURATIE ---
const TIME_LIMIT_SECONDS = 5 * 60; // 5 minuten
const MAX_ROUNDS = 3;
const SWITCH_DELAY_MS = 3000;
const REVEAL_DELAY_MS = 1500; // NIEUW: Wacht 1.5 seconde voor de onthulling start

// --- GLOBALE VARIABELEN ---
let currentFurniture = null;
let matches = [];
let viewedTitles = [];
let roundCounter = 0;
let timerInterval = null;
let revealTimeout = null; // NIEUW: Om de onthulling te kunnen resetten

// --- DOM ELEMENTEN ---
const furnitureNameEl = document.getElementById("furniture-name");
// const furnitureImgEl = document.getElementById("furniture-img"); // <-- DEZE OUDE VERWIJDEREN
const chatBox = document.getElementById("chat-box");
const timerEl = document.getElementById("timer-display");
const nextBtn = document.getElementById("next-btn");

// NIEUWE ELEMENTEN VOOR DE BEELDEN
const imgContainer = document.getElementById("image-stack-container");
const imgNormalEl = document.getElementById("img-normal");
const imgRevealedEl = document.getElementById("img-revealed");


// 1. Start de applicatie (ONGECWIJZIGD)
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
      return (selectedPeriod === 'all' || itemPeriod === selectedPeriod) && (selectedType === 'all' || itemType === selectedType);
    });
    if (matches.length === 0) {
      alert("No matches found. Starting with random furniture.");
      matches = data; 
    }
    startNextRound();
  } catch (error) {
    console.error(error);
    chatBox.innerHTML = "<p style='color:red'>Server connection failed.</p>";
  }
}

// 2. Start een nieuwe ronde (StartNextRound - MINIMALE WIJZIGING)
function startNextRound() {
  if (roundCounter >= MAX_ROUNDS) { endSession(); return; }
  const availableCandidates = matches.filter(item => !viewedTitles.includes(item.title));
  if (availableCandidates.length === 0) { endSession(); return; }
  const randomIndex = Math.floor(Math.random() * availableCandidates.length);
  currentFurniture = availableCandidates[randomIndex];
  viewedTitles.push(currentFurniture.title);
  roundCounter++;
  
  setupUI(); // <--- HIER GEBEURT HET NU
  startTimer(TIME_LIMIT_SECONDS);
}

// 3. Timer Logica (ONGECWIJZIGD)
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

// 4. Sessie beëindigen (ONGECWIJZIGD)
function endSession() {
  if (timerInterval) clearInterval(timerInterval);
  window.location.href = "/end";
}

// --- 5. UI Setup (GROTE WIJZIGING VOOR TRANSITIE) ---
function setupUI() {
  // A. Reset de vorige ronde
  if (revealTimeout) clearTimeout(revealTimeout); // Stop een lopende onthulling timer
  imgContainer.classList.remove("show-reveal");   // Zorg dat de 'after' foto weer verborgen is

  // B. Vul de teksten
  furnitureNameEl.textContent = currentFurniture.title;
  chatBox.innerHTML = ""; 
  addToChat("bot", `Hello! I am candidate #${roundCounter}: ${currentFurniture.title}. You have 5 minutes.`);

  // C. Laad BEIDE afbeeldingen in
  imgNormalEl.src = currentFurniture.image; 
  // Hier laden we de 'after' image in de verborgen laag:
  imgRevealedEl.src = currentFurniture.image_after;

  // Fallback alleen op de normale image voor nu
  imgNormalEl.onerror = () => { imgNormalEl.src = "images/fallback.png"; };

  // D. Reset de knop
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.textContent = "Next Date ➔";
    nextBtn.style.cursor = "pointer";
  }

  // E. Start de timer voor de onthulling!
  // Na 1.5 seconde (REVEAL_DELAY_MS) voegen we de class toe die de CSS transitie start.
  revealTimeout = setTimeout(() => {
      imgContainer.classList.add("show-reveal");
      console.log("Revealing the true form!");
  }, REVEAL_DELAY_MS);
}

// 6. Chat Functies (ONGECWIJZIGD)
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

async function askQuestion(qIdx) {
  if (!currentFurniture) return;
  const questions = [
    "Tell me something about your origin and style.",
    "What makes you unique compared to other pieces of furniture?",
    "Have you ever experienced an interesting event?"
  ];
  const questionText = questions[qIdx];
  addToChat("user", questionText);
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
    const data = await res.json();
    if (data.error) addToChat("bot", "Error: " + data.error);
    else addToChat("bot", data.answer);
  } catch (err) {
    console.error(err);
    addToChat("bot", "Connection error.");
  }
}

// --- Event Listeners (ONGECWIJZIGD) ---
document.getElementById("q0").onclick = () => askQuestion(0);
document.getElementById("q1").onclick = () => askQuestion(1);
document.getElementById("q2").onclick = () => askQuestion(2);

if (nextBtn) {
  nextBtn.onclick = () => {
    nextBtn.disabled = true;
    nextBtn.textContent = "Looking for matches...";
    nextBtn.style.cursor = "wait";
    addToChat("user", "<em>I don't think this is a match. Next please!</em>");
    if (timerInterval) clearInterval(timerInterval);
    // Ook de onthulling stoppen als die nog niet gebeurd is
    if (revealTimeout) clearTimeout(revealTimeout);
    setTimeout(() => {
      startNextRound();
    }, SWITCH_DELAY_MS);
  };
}

// Start alles
initChat();