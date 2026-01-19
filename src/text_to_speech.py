import os
import base64
from dotenv import load_dotenv
from gradio_client import Client, handle_file
import re
from num2words import num2words

# --- CONFIGURATION ---
REF_AUDIO_PATH = "data/tts_sample/sample.wav"
REF_TEXT_PATH = "data/tts_sample/sample_text.txt"
# ---------------------

load_dotenv()

gradio_url = os.getenv("GRADIO_URL")
gradio_user = os.getenv("GRADIO_USER")
gradio_pass = os.getenv("GRADIO_AUTH")

client = Client(gradio_url, auth=(gradio_user, gradio_pass))

def _replace_numbers(match):
    """
    Helper: Converts regex match of digits to words.
    - 4 digits = Year style (1725 -> "seventeen twenty-five")
    - Other = Cardinal style (10 -> "ten")
    """
    text_num = match.group()
    if len(text_num) == 4 and text_num.isdigit():
        return num2words(int(text_num), to='year')
    elif text_num.isdigit():
        return num2words(int(text_num))
    return text_num

def _clean_segment(segment):
    """
    Helper: Removes forbidden characters and normalizes spaces/dashes.
    Allowed: A-Z, a-z, space, period, comma, question mark, hyphen.
    """
    if not segment: 
        return ""
    # Normalize dashes (em-dash, en-dash to hyphen)
    segment = re.sub(r'[—–−]', '-', segment)
    # Remove unwanted characters
    # Allowed: A-Z, space, ., ,, !, ?, -, ', "
    segment = re.sub(r'''[^a-zA-Z\s.,?! \-'" ]''', '', segment)
    # Collapse multiple spaces
    segment = re.sub(r'\s+', ' ', segment).strip()
    return segment

def _pad_sentences(raw_str):
    """
    Helper: Splits by sentence terminators (. ! ?) and adds padding spaces.
    """
    if not raw_str: 
        return ""
    # Split by . ! or ? (Lookbehind ensures we keep the punctuation for detection, 
    # but re.split consumes the delimiter, so we need a capture group or specific logic.
    # Actually, the previous regex split approach consumes the whitespace after punctuation.)
    
    # Improved regex: Split after punctuation, keeping punctuation attached to the previous word.
    parts = re.split(r'(?<=[.!?])\s+', raw_str)
    
    # Pad every non-empty part
    return "\n".join([f" {p.strip()} " for p in parts if p.strip()])

def clean_text_for_tts(text):
    """
    Main processing function.
    1. Converts numbers.
    2. Isolates leading *action* blocks (max 10 words).
    3. Cleans and pads text for TTS.
    """
    if not text:
        return ""

    # --- 1. Global Number Conversion ---
    # We pass the helper function `_replace_numbers` directly
    text = re.sub(r'\d+', _replace_numbers, text)

    # --- 2. Separate Start-of-String Action ---
    action_text = ""
    body_text = text

    # Regex: Start of string -> * -> (content) -> * -> remaining text
    match = re.match(r'^\s*\*([^*]+)\*\s*(.*)', text, re.DOTALL)
    
    if match:
        potential_action = match.group(1)
        remainder = match.group(2)
        
        # Check word count of the action block
        if len(potential_action.split()) <= 10:
            action_text = potential_action
            body_text = remainder

    # --- 3. Clean Segments Independently ---
    cleaned_action = _clean_segment(action_text)
    cleaned_body = _clean_segment(body_text)

    # --- 4. Pad and Recombine ---
    final_action = _pad_sentences(cleaned_action)
    final_body = _pad_sentences(cleaned_body)

    return final_action + final_body

def speak(text, clean_input=True, verbose=True):
    """
    Sends text to Fish Speech using a STATIC reference.
    
    Args:
        text (str): The text to speak.
        clean_input (bool): If True, cleans input using clean_text_for_tts.
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

    if clean_input:
        processed_text = clean_text_for_tts(text)   
        if verbose:
            print("TTS: Cleaned text input")
            print(f"Original: {text[:50]}")
            print(f"Cleaned:  '{processed_text[:50]}'")            

    if verbose:        
        print(f"TTS: Using static sample -> {current_ref_audio}")
        print(f"TTS: Sample Text -> {current_ref_text[:50]}...")

    # --- 3. Generation ---
    try:
        if verbose:
            print(f"TTS: Generating audio for '{processed_text[:20]}...'")
        
        result = client.predict(
            text=processed_text,
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