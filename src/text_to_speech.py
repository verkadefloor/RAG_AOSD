from elevenlabs.client import ElevenLabs
import os

API_KEY = os.getenv("ELEVENLABS_API_KEY")
client = ElevenLabs(api_key=API_KEY)

ACCENT_VOICES = {
    "french_male": "K8nDX2f6wjv6bCh5UeZi",
    "french_female": "xNtG3W2oqJs0cJZuTyBc",
    "british_male": "y0SYydk17lMbUIUvSf3N",
}

def speak(text, accent="french_male"):
    voice_id = ACCENT_VOICES.get(accent.lower(), ACCENT_VOICES["french_male"])
    
    audio_gen = client.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )
    
    return b"".join(audio_gen)  
