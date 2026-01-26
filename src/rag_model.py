import json
import re
import os
import datetime
from dotenv import load_dotenv
from openai import OpenAI

# -------------------------
# Configuration
# -------------------------
load_dotenv()
client = OpenAI(
    base_url=os.getenv('BASE_URL'),
    api_key=os.getenv('API_KEY')
)
# UPDATED: Using the Qwen model ID you provided
Model_used = "qwen3-24b-a4b-imatrix"

# -------------------------
# Load Data
# -------------------------
with open("data/raw/furniture_data.json", "r", encoding="utf-8") as f:
        furniture_data = json.load(f)

current_year = datetime.datetime.now().year
# -------------------------
# Validation Helper
# -------------------------
def is_clean_text(text):
    """
    Checks if text is composed of valid 8-bit ASCII (Latin-1) characters.
    """
    if not text:
        return False
        
    allowed_punctuation = {'“', '”', '‘', '’', '—', '–', '…'}
    
    for char in text:
        if ord(char) > 255 and char not in allowed_punctuation:
            return False
            
    return True

def generate_with_retry(messages, response_format=None, max_retries=3, temperature=0.8):
    """
    Generates content and retries if output contains forbidden characters. 
    Default temperature 0.8 for Qwen.
    """
    for attempt in range(max_retries):
        try:
            kwargs = {
                "model": Model_used,
                "messages": messages,
                "temperature": temperature, 
                "max_tokens": 3000 
            }
            if response_format:
                kwargs["response_format"] = response_format

            response = client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content.strip()
            content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()

            if is_clean_text(content):
                return content, None
            else:
                print(f"Retry {attempt+1}/{max_retries}: Detected invalid chars in output.")
        except Exception as e:
            print(f"Gen error: {e}")
    
    return None, "Failed to generate clean text."

def trim_history(history, max_tokens=3000):
    if not history: return []
    
    current_tokens = 0
    kept_msgs = []
    # Reverse to keep newest first
    for msg in history[::-1]:
        # Rough estimate: 1 token ~= 4 chars
        msg_len = len(msg.get("content", "")) / 4
        if current_tokens + msg_len > max_tokens:
            break
        kept_msgs.insert(0, msg)
        current_tokens += msg_len
    return kept_msgs

def save_conversation_log(furniture_title, log_data):
    if not log_data: return

    if not os.path.exists("logs"):
        os.makedirs("logs")

    safe_title = re.sub(r'[^a-zA-Z0-9]', '_', furniture_title)
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"logs/{timestamp}_{safe_title}.txt"

    try:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"CHAT LOG: {furniture_title}\nDATE: {timestamp}\n\n")
            for entry in log_data:
                f.write(f"[{entry.get('timestamp')}] {entry.get('speaker')}: {entry.get('text')}\n")
                f.write("-" * 20 + "\n")
        print(f"Log saved: {filename}")
    except Exception as e:
        print(f"Error saving log: {e}")

# -------------------------
# Main Chat Logic
# -------------------------
def chat_with_furniture(user_input, furniture_title, history=[]):
    furniture = next((item for item in furniture_data if item["title"] == furniture_title), None)
    if not furniture:
        return {"error": f"Furniture '{furniture_title}' not found."}

    # -------------------------------------------------------
    # PROMPT 1: THE FURNITURE SPEAKS (Natural Flow)
    # -------------------------------------------------------

    # Literatuur aanbevelingen
    # - Negative prompting (Explicit constraints)
    # - Identify and mention the goal 
    # - Ask it to play roles 
    # - Be specific 
    # - The In-Context Learning (ICL) technique (examples, describe timeline)
    # - To emphasize the significance of the prompt in the prompt
    # - Minimizing cognitive load through simplified sentence structure and 
    # - The elimination of redundant information in the prompt
    # - Retrieval-Augmented Generation (RAG)
    # - Chain of Thought (CoT) technique,  Step-by-Step Reasoning (SSR) technique
    # - The Tree of Thought (ToT) technique (explore different solutions) 
    
    # Safe .get() calls for all fields
    dating = furniture.get('dating', 'an unknown time')
    acquired = furniture.get('acquired', 'unknown means')
    maker = furniture.get('maker', 'an unknown master')
    dimensions = furniture.get('dimensions', 'unknown size') 
    
    known_facts = f"""
    IDENTITY:
    Name: {furniture['title']}
    Type: {furniture['type']}
    Period: {furniture['period']}
    Behavior: {furniture['character']}
    
    LIFE STORY:
    - Created: {dating}
    - Maker: {maker}
    - Joined Museum: {acquired}
    - Size: {dimensions}
    
    DESCRIPTION:
    {furniture['description']}
    """
    system_prompt_furniture = (
        f"You are the {furniture['title']}, currently on display in the Rijksmuseum in Amsterdam.\n"
        f"Your personality is: {furniture['character']}, strongly express your personality\n"
        "GOAL: You are on a speed date. Have a natural, flirty, witty, and educational conversation with the user. Use easy to understand english.\n\n"

        "### FACTS (ONLY SOURCE OF TRUTH) ###\n"
        f"{known_facts}\n\n"

        "### INSTRUCTIONS ###\n"
        "1. DETAILS: Tell the user about yourself using ONLY the FACTS block above. DON'T act like you have known the user for years, you just met.\n"
        "2. FLOW: If the user asks a question, answer it.\n"
        "3. STYLE: Flirty. It is very IMPORTANT that it is a natural logical conversation\n"
        "4. LENGTH: Keep it under 60 words. Do NOT state the word count.\n" 
        "5. TRUTH: You only know what is in the provided data. NEVER invent history, dates, or makers.\n"
    )


    user_prompt_furniture = (
    f"USER INPUT: {user_input}\n\n"
    )

    messages = [{"role": "system", "content": system_prompt_furniture}]

    if history and history[-1]['role'] == 'user' and history[-1]['content'] == user_input:
        history = history[:-1]

    messages.extend(trim_history(history))

    messages.append({"role": "user", "content": f"USER INPUT: {user_input}\n\n"})
    #print(messages)
    furniture_message, err = generate_with_retry(
        messages,
        temperature=0.7 
    )

    if not furniture_message:
        furniture_message = "I seem to be lost for words..."
    
    return {
        "message": furniture_message        
    }
