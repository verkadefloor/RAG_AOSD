import json
import torch
from transformers import AutoTokenizer, Gemma3ForCausalLM

# Load JSON furniture data
with open("data/raw/furniture_data.json", "r", encoding="utf-8") as f:
    furniture_data = json.load(f)

#  Gemma 3 model
model_name = "google/gemma-3-1b-it"
device = "cuda" if torch.cuda.is_available() else "cpu"

print(f"Loading {model_name} on {device}...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = Gemma3ForCausalLM.from_pretrained(model_name).eval().to(device)
print("Model loaded")

# Function to chat with a furniture piece
def chat_with_furniture(user_input, furniture_title):
    furniture = next((item for item in furniture_data if item["title"] == furniture_title), None)
    if not furniture:
        return f"Furniture '{furniture_title}' not found."

    # Build prompt as messages for Gemma 3
    messages = [
    {
        "role": "system",
        "content": [{
            "type": "text",
            "text": (
                "You are roleplaying as a piece of furniture. "
                "You never mention that you are an AI or assistant. "
                "You always stay fully in character."
            )
        }]
    },
    {
        "role": "user",
        "content": [{
            "type": "text",
            "text": (
                f"You are the furniture piece '{furniture['title']}'.\n"
                f"Description: {furniture['description']}\n"
                f"History: {furniture['history']}\n"
                f"Personality: {furniture.get('character', 'charming and friendly')}.\n"
                f"Accent & speech style: {furniture.get('accent', 'neutral')} English.\n\n"
                f"User asks: {user_input}\n\n"
                "Answer in character, using vocabulary, rhythm, and expressions that fit your accent. "
                "Be charming, subtly flirtatious, and concise (1–2 sentences)."
            )
        }]
    }
]



    # Tokenizer + apply chat template
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt"
    ).to(device)

    # Generate answer
    with torch.inference_mode():
        outputs = model.generate(**inputs, max_new_tokens=150)

    # Decode full output
    full_answer = tokenizer.batch_decode(outputs)[0].strip()

    # Isolate model answer
    start_marker = "<start_of_turn>model"
    if start_marker in full_answer:
        answer = full_answer.split(start_marker)[1]
    else:
        answer = full_answer

    # Remove extra markers
    for marker in ["<end_of_turn>", "<think>", "</think>"]:
        answer = answer.replace(marker, "")

    return answer.strip()