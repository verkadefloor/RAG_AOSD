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
print("Model loaded ✅")

# Function to chat with a furniture piece
def chat_with_furniture(user_input, furniture_title):
    furniture = next((item for item in furniture_data if item["title"] == furniture_title), None)
    if not furniture:
        return f"Furniture '{furniture_title}' not found."

    # Build prompt as messages for Gemma 3
    messages = [
        [
            {"role": "system", "content": [{"type": "text", "text": "You are a helpful furniture assistant."}]},
            {"role": "user", "content": [{"type": "text", "text":
                f"You are the furniture piece '{furniture['title']}'. "
                f"Description: {furniture['description']}\n"
                f"History: {furniture['history']}\n"
                f"User asks: {user_input}\n"
                "Answer briefly, charmfully, and flirt subtly in one or two sentences."
            }]}
        ]
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
