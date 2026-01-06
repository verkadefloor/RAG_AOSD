
const title = localStorage.getItem("selectedFurnitureTitle");
const imageAfter = localStorage.getItem("selectedFurnitureAfterImage");

if (!title || !imageAfter) {
  alert("No furniture selected!");
  window.location.href = "/";
}


const furnitureNameEl = document.getElementById("furniture-name");
const furnitureImgEl = document.getElementById("furniture-img");
const chatBox = document.getElementById("chat-box");


furnitureNameEl.textContent = title;
furnitureImgEl.src = imageAfter;
furnitureImgEl.alt = title;

furnitureImgEl.onerror = () => {
  furnitureImgEl.src = "/images/fallback.png";
};


function addToChat(sender, text) {
  const div = document.createElement("div");
  div.className = "chat-message " + sender;

  if (sender === "user") {
    div.innerHTML = `<strong>You:</strong> <span>${text}</span>`;
  } else {
    div.innerHTML = `<strong>${title}:</strong> <span>${text}</span>`;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}


async function askQuestion(qIdx) {
  const questions = [
    "Tell me something about your origin and style.",
    "What makes you unique compared to other pieces of furniture?",
    "Have you ever experienced an interesting event?"
  ];

  const question = questions[qIdx];
  addToChat("user", question);

  try {
    const res = await fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ furniture: title, question })
    });

    const data = await res.json();

    if (data.error) {
      addToChat("bot", data.error);
      return;
    }

    addToChat("bot", data.answer);

  } catch (err) {
    console.error(err);
    addToChat("bot", "Something went wrong while fetching the answer.");
  }
}


document.getElementById("q0").onclick = () => askQuestion(0);
document.getElementById("q1").onclick = () => askQuestion(1);
document.getElementById("q2").onclick = () => askQuestion(2);


document.getElementById("switch-btn").onclick = () => {
  localStorage.clear();
  window.location.href = "/";
};
