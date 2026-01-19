import base64
import os
from text_to_speech import speak

text_to_speak = (
     " chair creaks "
     " I was handcrafted in the misty Northern Netherlands, around seventeen-hundred to seventeen-twenty-five. "
     " But I don't have a real 'home,' just a museum display. " 
     " Though I do have a favorite place: when you're sitting close enough to feel my wood. "
     " Tell me, what's your favorite memory? "
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