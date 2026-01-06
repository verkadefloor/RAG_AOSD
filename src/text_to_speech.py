from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
import os

API_KEY = os.getenv("ELEVENLABS_API_KEY")

client = ElevenLabs(api_key=API_KEY)

# Map accent → voice_id (je moet deze IDs ophalen van ElevenLabs)
ACCENT_VOICES = {
    "french_male": "K8nDX2f6wjv6bCh5UeZi",
    "french_female": "xNtG3W2oqJs0cJZuTyBc",
    "british": "PUT_BRITISH_VOICE_ID_HERE",
    "american": "PUT_AMERICAN_VOICE_ID_HERE",
    "italian": "PUT_ITALIAN_VOICE_ID_HERE",
    "german": "PUT_GERMAN_VOICE_ID_HERE",
    "dutch": "PUT_DUTCH_VOICE_ID_HERE"
}

def speak(text, accent="american"):
    voice_id = ACCENT_VOICES.get(accent.lower(), ACCENT_VOICES["american"])
    
    audio = client.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )
    
    play(audio)
