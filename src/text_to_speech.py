import os
import base64
from dotenv import load_dotenv
from gradio_client import Client, handle_file

# Load environment variables once when module imports
load_dotenv()

gradio_url = os.getenv("GRADIO_URL")
gradio_user = os.getenv("GRADIO_USER")
gradio_pass = os.getenv("GRADIO_AUTH")

client = Client(gradio_url, auth=(gradio_user, gradio_pass))

# --- Configuration: Voice Cloning Paths ---
# We use the raw strings (r"...") to handle Windows backslashes correctly
REF_AUDIO_PATH = r"src\sample tatum.wav"
REF_TEXT_PATH = r"src\sample tatum text.txt"

def speak(text):
    """
    Sends text to Fish Speech and returns the audio file as a Base64 string.
    Returns None if generation fails.
    """
    if not text:
        return None

    # 1. Read the reference text from the file (if it exists)
    reference_text_content = ""
    try:
        if os.path.exists(REF_TEXT_PATH):
            with open(REF_TEXT_PATH, "r", encoding="utf-8") as f:
                reference_text_content = f.read()
    except Exception as e:
        print(f"TTS Warning: Could not read reference text: {e}")

    print(f"TTS: Generating audio for '{text[:20]}...' using voice: {REF_AUDIO_PATH}")
    
    try:
        # 2. Send request with handle_file() and the loaded reference text
        result = client.predict(
            text=text,
            reference_id="",
            reference_audio=handle_file(REF_AUDIO_PATH), # <--- The critical fix
            reference_text=reference_text_content,       # <--- Added reference text
            max_new_tokens=0,
            chunk_length=200,
            top_p=0.7,
            repetition_penalty=1.2,
            temperature=0.7,
            seed=0,
            use_memory_cache="on",
            api_name="/partial"
        )
        
        # Result is tuple (filepath, metadata)
        audio_path = result[0]
        
        # 3. Read file and convert to Base64 for the frontend
        with open(audio_path, "rb") as audio_file:
            audio_bytes = audio_file.read()
            base64_audio = base64.b64encode(audio_bytes).decode('utf-8')
            
        return base64_audio

    except Exception as e:
        print(f"TTS Error: {e}")
        return None