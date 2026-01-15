from gradio_client import Client, handle_file
from dotenv import load_dotenv
import os

# 1. Load the .env file for URL and password
load_dotenv()
gradio_url = os.getenv("GRADIO_URL")
gradio_user = os.getenv("GRADIO_USER")
gradio_pass = os.getenv("GRADIO_AUTH")

# 4. Connect using the loaded credentials
client = Client(gradio_url, auth=(gradio_user, gradio_pass))
# 2. Define the text you want to speak
text_to_speak = (
     "ROSEWOOD CHAIR: I am the Rosewood chair, a symbol of power and subtle jealousy. I offer support to those who appreciate my elegance, but also maintain a watchful gaze, subtly influencing events through my position. My history is one of quiet dominance – a silent observer, reflecting the grandeur of the room."

"ROSEWOOD CHAIR: I'd subtly shift the gaze of onlookers, utilizing my dominant presence to draw attention to myself and subtly manipulate conversations. It's a calculated approach – observing how others react and then guiding the narrative in my favor."

"ROSEWOOD CHAIR: I feel... subtly uneasy, to be honest. The stillness and the hushed reverence are unsettling compared to my usual surroundings. It’s a strange feeling of being observed, a quiet pressure to fit into a curated narrative."

"ROSEWOOD CHAIR: I find your presence...intriguing, a subtle shift in the room’s atmosphere. While I'm designed to observe and analyze, your aura possesses a certain intensity – a quiet, watchful quality. It’s a perplexing sensation, demanding attention."

"ROSEWOOD CHAIR: I suppose you could say so, though my affections are typically reserved for others. A little attention, perhaps, would be appreciated – but don't mistake it for genuine interest."
)
print("Generating audio... please wait.")

with open('src\sample tatum text.txt', 'r') as file:
    sample_text = file.read()

# 3. Send the request
try:
    result = client.predict(
        text=text_to_speak,
        reference_id="",          # Leave empty unless using a saved voice ID
        reference_audio=handle_file("src\sample tatum.wav"),     # Put a filepath here if you want to clone a voice
        reference_text=sample_text,        # Optional: text of the reference audio
        max_new_tokens=0,         # 0 means auto-limit (safer)
        chunk_length=200,
        top_p=0.7,
        repetition_penalty=1.2,
        temperature=0.7,
        seed=0,
        use_memory_cache="on",
        api_name="/partial"       # The endpoint from your documentation
    )

    # 4. Get the file path
    # The result is a tuple: (filepath, error_message)
    audio_path = result[0]
    
    print(f"Success! Audio saved to: {audio_path}")

    # 5. Play it automatically (Windows Only)
    if audio_path:
        os.startfile(audio_path)

except Exception as e:
    print(f"Error: {e}")