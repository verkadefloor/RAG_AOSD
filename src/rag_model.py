import json
import torch
from transformers import AutoTokenizer, Gemma3ForCausalLM

# -------------------------
# Detect device
# -------------------------
if torch.backends.mps.is_available():
    device = torch.device("mps")
    print("Using MPS on Mac")
else:
    device = torch.device("cpu")
    print("Using CPU")

# -------------------------
# Load furniture data
# -------------------------
with open("data/raw/furniture_data.json", "r", encoding="utf-8") as f:
    furniture_data = json.load(f)

# -------------------------
# Load Gemma 3 model
# -------------------------
model_name = "google/gemma-3-1b-it"

print(f"Loading {model_name} on {device} ...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = Gemma3ForCausalLM.from_pretrained(model_name).eval().to(device)
print("Model loaded")

# -------------------------
# Chat function
# -------------------------
def chat_with_furniture(user_input, furniture_title):
    furniture = next((item for item in furniture_data if item["title"] == furniture_title), None)
    if not furniture:
        return f"Furniture '{furniture_title}' not found."

    # Compact prompt: alleen title, description, history
    messages = [
        [
            {"role": "system", "content": [{"type": "text", "text": "You are a helpful furniture assistant."}]},
            {"role": "user", "content": [{"type": "text", "text":
                f"You are the furniture piece '{furniture['title']}'. "
                f"Description: {furniture['description']}\n"
                f"History: {furniture['history']}\n"
                f"User asks: {user_input}\n"
                "Answer briefly, charmfully, and flirt  in one or two sentences."
                "Vary the way you start your responses naturally, so that each answer may begin differently."
            }]}
        ]
    ]

    # Tokenizer + generate
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt"
    ).to(device)

    with torch.inference_mode():
        outputs = model.generate(**inputs, max_new_tokens=100)

    full_answer = tokenizer.batch_decode(outputs)[0].strip()

    # Clean up markers
    start_marker = "<start_of_turn>model"
    answer = full_answer.split(start_marker)[1] if start_marker in full_answer else full_answer
    for marker in ["<end_of_turn>", "<think>", "</think>"]:
        answer = answer.replace(marker, "")

    return answer.strip()

