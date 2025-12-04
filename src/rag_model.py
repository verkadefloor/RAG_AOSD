# src/rag_model.py
import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

# 1️⃣ Laad JSON meubeldata
with open("data/raw/furniture_data.json", "r", encoding="utf-8") as f:
    furniture_data = json.load(f)

# 2️⃣ Laad gratis GEITje-chat model
model_name = "BramVanroy/GEITje-7B-ultra-sft"  # chat-fijngetuned, gratis
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name, device_map="auto", torch_dtype=torch.float16)





# 3️⃣ Chat pipeline (conversational)
chat_pipe = pipeline("text-generation", model=model, tokenizer=tokenizer)

def chat_with_furniture(user_input, furniture_title):
    """Genereer een antwoord als het gekozen meubelstuk."""
    
    # Zoek meubelstuk
    furniture = next((item for item in furniture_data if item["title"] == furniture_title), None)
    if not furniture:
        return f"Meubelstuk '{furniture_title}' niet gevonden."

    # Maak duidelijke prompt
    prompt = (
        f"Je bent het meubelstuk '{furniture['title']}'. "
        "Beantwoord de volgende vraag van de gebruiker in natuurlijke Nederlandse taal. "
        "Gebruik **alleen** de onderstaande informatie en flirt subtiel:\n\n"
        f"Beschrijving: {furniture['description']}\n"
        f"Geschiedenis: {furniture['history']}\n\n"
        f"Gebruiker vraagt: {user_input}\n"
        "Antwoord in volledige zinnen:"
    )

    # Genereer antwoord
    result = chat_pipe(prompt, max_new_tokens=300, do_sample=True, temperature=0.7, top_p=0.95, top_k=50)

    antwoord = result[0]['generated_text']
    # Strip de prompt zodat alleen het echte antwoord overblijft
    antwoord = antwoord.replace(prompt, "").strip()
    return antwoord
