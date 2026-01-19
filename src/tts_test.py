import base64
import os
from text_to_speech import speak

text_to_speak = (
" *A faint, wooden creak* My 'shape' is just wood and careful craftsmanship, but my true purpose? To hold memories. Like your smile, I’d rather keep things than destroy them. Tell me—what’s something you hold onto that’s meant to last? "
)
print("Generating audio... please wait.")
base64_result = speak(text_to_speak)
if base64_result:
    # 3. Convert Base64 back to a file for local testing
    output_filename = f"test_output.wav"
    
    try:
        # Decode the string back to bytes
        audio_bytes = base64.b64decode(base64_result)
        
        # Save to disk
        with open(output_filename, "wb") as f:
            f.write(audio_bytes)
            
        print(f"Success! Audio saved to: {os.path.abspath(output_filename)}")

        # 4. Play it automatically (Windows Only)
        os.startfile(output_filename)
        
    except Exception as e:
        print(f"Error saving file: {e}")
else:
    print("Error: Audio generation failed (returned None).")