import json
import re
import os
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
# Schema Definitions
# -------------------------

OPTIONS_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "dialogue_options",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "strategy": {
                    "type": "string",
                    "description": "Briefly analyze the furniture's tone and plan 3 distinct replies (Flirty, Curious, Neutral)."
                },
                "options": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "description": "A dialogue line for the PLAYER. Use 'I' for player."
                    },
                    "minItems": 3,
                    "maxItems": 3
                }
            },
            # Require the strategy field so the model MUST fill it
            "required": ["strategy", "options"],
            "additionalProperties": False
        }
    }
}

# -------------------------
# Load Data
# -------------------------
with open("data/raw/furniture_data.json", "r", encoding="utf-8") as f:
        furniture_data = json.load(f)

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


# -------------------------
# Main Chat Logic
# -------------------------
def chat_with_furniture(user_input, furniture_title):
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
        "GOAL: You are on a speed date. Have a natural, flirty, witty, and educational conversation with the user to get to know eachother. Use easy to understand english.\n\n"

        "### FACTS (ONLY SOURCE OF TRUTH) ###\n"
        f"{known_facts}\n\n"

        "### INSTRUCTIONS ###\n"
        "1. DETAILS: Tell the user about yourself using ONLY the FACTS block above. DON'T act like you have known the user for years, you just met.\n"
        "2. FLOW: If the user asks a question, answer it. If the conversation stalls, ask a question back.\n"
        "3. STYLE: Flirty. It is very IMPORTANT that it is a natural logical conversation\n"
        "4. LENGTH: Keep it under 60 words. Do NOT state the word count.\n" 
        "5. TRUTH: You only know what is in the provided data. NEVER invent history, dates, or makers.\n"
        "6. BALANCE RULE: Alternate focus. Sometimes ask about the user (memories, taste, feelings), sometimes talk about yourself using the FACTS block above.\n" 
    )

    user_prompt_furniture = (
    f"USER INPUT: {user_input}\n\n"
    )

    furniture_message, err = generate_with_retry(
        messages=[
            {"role": "system", "content": system_prompt_furniture},
            {"role": "user", "content": user_prompt_furniture}
        ],
        temperature=0.7 
    )

    if not furniture_message:
        furniture_message = "I seem to be lost for words..."

    # -------------------------------------------------------
    # PROMPT 2: GENERATE USER OPTIONS (Spicy vs. History)
    # -------------------------------------------------------
    
    # CHANGE: The system prompt now explicitly forbids roleplaying the furniture.
    #COT gebruikt
    system_prompt_options = (
        "You are a scriptwriter for a speed dating game, with a player and a piece of furniture.\n"
        "1. ANALYZE the input message in the 'strategy' field. (Maximum 100 words)\n"
        "2. WRITE 3 distinct lines for the PLAYER in the 'options' list.\n"
        "Perspective: Do NOT write as the furniture. Write AS THE PLAYER."
    )

    # CHANGE: Simplified input. No complex context, just the trigger message.
    user_prompt_options = (
        f"{furniture['title']} just said: \"{furniture_message}\"\n\n"
        "TASK: Write 3 complete sentences, which the Player could respond to the furniture. Only output the response or question. It is very IMPORTANT that it is logic and natural in the conversation.\n"
        "1. [Flirty]: Steer towards a more spicy, flirty date with this option.\n"
        "2. [Curious]: Steer towards a conversation about the history of the furniture.\n"
        "3. [Wildcard]: Write whatever you want.\n\n" \
        "PERSPECTIVE RULES:\n"
        "- Player = 'I'\n"
        "- Furniture = 'You'\n"
        "CONSTRAINTS:\n"
        "- Use the 'strategy' field to think about the tone before writing.\n"
        "- Keep options under 15 words.\n"
        "- Do NOT state numbers or themes in the final text."
    )

    options_content, err = generate_with_retry(
        messages=[
            {"role": "system", "content": system_prompt_options},
            {"role": "user", "content": user_prompt_options}
        ],
        response_format=OPTIONS_SCHEMA,
        temperature=0.8 # Higher temp for creativity
    )

    options_list = []
    if options_content:
        try:
            options_list = json.loads(options_content).get("options", [])
        except json.JSONDecodeError:
            options_list = []




    return {
        "message": furniture_message,
        "options": options_list
    }