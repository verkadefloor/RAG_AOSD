import json
from openai import OpenAI

# -------------------------
# Configuration
# -------------------------
client = OpenAI(
    base_url="http://192.168.1.201:1234/v1",
    api_key="lm-studio"
)

# -------------------------
# Schema Definition
# -------------------------
# We strictly define that "options" must be QUESTIONS from the USER'S perspective.
FURNITURE_RESPONSE_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "furniture_response",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "The furniture's response to the user. Flirty and in-character."
                },
                "options": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "description": "A short question (under 10 words) that the USER might want to ask the furniture next."
                    },
                    "minItems": 3,
                    "maxItems": 3
                }
            },
            "required": ["message", "options"],
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
# Chat Function
# -------------------------
def chat_with_furniture(user_input, furniture_title):
    furniture = next((item for item in furniture_data if item["title"] == furniture_title), None)
    if not furniture:
        return {"error": f"Furniture '{furniture_title}' not found."}

    messages = [
        {
            "role": "system",
            "content": (
                "You are roleplaying as a piece of furniture. "
                "Stay fully in character."
            )
        },
        {
            "role": "user",
            "content": (
                f"You are the furniture piece '{furniture['title']}'.\n"
                f"Description: {furniture['description']}\n"
                f"History: {furniture['history']}\n\n"
                f"User asks: {user_input}\n\n"
                "### INSTRUCTIONS ###\n"
                "1. Answer the user in character (Flirty, playful, brief).\n"
                "2. generate 3 follow-up QUESTIONS the USER can ask you.\n"
                "   - The options must be from the USER'S perspective (e.g., 'Who built you?', NOT 'I was built by...').\n"
                "   - Keep options short (max 10 words).\n"
                "   - Make them relevant to your specific history.\n"
            )
        }
    ]

    try:
        response = client.chat.completions.create(
            model="gemma-3-1b-it", 
            messages=messages,
            temperature=0.7,
            response_format=FURNITURE_RESPONSE_SCHEMA, 
        )

        return json.loads(response.choices[0].message.content)

    except Exception as e:
        return {"error": f"Error: {e}"}