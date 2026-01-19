import os
import base64
from dotenv import load_dotenv
from gradio_client import Client, handle_file

# --- CONFIGURATION ---
REF_AUDIO_PATH = "data/tts_sample/sample.wav"
REF_TEXT_PATH = "data/tts_sample/sample_text.txt"
# ---------------------

load_dotenv()

gradio_url = os.getenv("GRADIO_URL")
gradio_user = os.getenv("GRADIO_USER")
gradio_pass = os.getenv("GRADIO_AUTH")

client = Client(gradio_url, auth=(gradio_user, gradio_pass))

def speak(text, verbose=True):
    """
    Sends text to Fish Speech using a STATIC reference.
    
    Args:
        text (str): The text to speak.
        verbose (bool): If True, prints status updates to console.
    """
    if not text:
        return None

    # --- 1. Load Static Reference Text ---
    if not os.path.exists(REF_TEXT_PATH):
        print(f"TTS Error: Reference text file not found at '{REF_TEXT_PATH}'")
        return None
    
    try:
        with open(REF_TEXT_PATH, "r", encoding="utf-8") as f:
            current_ref_text = f.read().strip()
    except Exception as e:
        print(f"TTS Error reading reference text: {e}")
        return None

    # --- 2. Verify Static Reference Audio ---
    if not os.path.exists(REF_AUDIO_PATH):
        print(f"TTS Error: Reference audio file not found at '{REF_AUDIO_PATH}'")
        return None
        
    current_ref_audio = REF_AUDIO_PATH

    if verbose:
        print(f"TTS: Using static sample -> {current_ref_audio}")
        print(f"TTS: Sample Text -> {current_ref_text[:50]}...")

    # --- 3. Generation ---
    try:
        if verbose:
            print(f"TTS: Generating audio for '{text[:20]}...'")
        
        result = client.predict(
            text=text,
            reference_id="",
            reference_audio=handle_file(current_ref_audio),
            reference_text=current_ref_text,
            max_new_tokens=0,
            chunk_length=200,
            top_p=0.7,
            repetition_penalty=1.2,
            temperature=0.7,
            seed=0,
            use_memory_cache="on",
            api_name="/partial"
        )
        
        audio_path = result[0]
        
        with open(audio_path, "rb") as audio_file:
            audio_bytes = audio_file.read()
            base64_audio = base64.b64encode(audio_bytes).decode('utf-8')
            
        return base64_audio

    except Exception as e:
        # Errors are usually important enough to print regardless of verbosity,
        # but you can wrap this too if you want total silence.
        print(f"TTS Error: {e}")
        return None