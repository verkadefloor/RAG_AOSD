# Readme
## Furniture RAG Chatbot
This repository contains a Retrieval-Augmented Generation (RAG) chatbot that uses an external LLM to chat as a piece of furniture. The current setup is designed around Qwen3.

**Features:**

* Chat with different furniture items based on description and history.

* Supports predefined questions and free input.

* Multilingual input partially supported with Qwen.

* LLM runs in `llama.cpp` for improved speed and support of various CPU, GPU, and accelerator architectures.

* Can run locally, or on a remote PC or server.

## Requirements

* Python 3.13

* **Note:** A new Python virtual environment (`venv`) is recommended to prevent version conflicts.

* Install dependencies:

  ```
  pip install -r requirements.txt
  
  ```

## Backend Services Setup

To function, this chatbot requires two backend services running: one for the LLM (`llama.cpp`) and one for TTS (Fish Speech). For the development of the app, these services were ran in two Ubuntu-based containers on a proxmox host, with CUDA acceleration. A CUDA device with >=16GB of ram is recommended. For further details on the models used and their installation instructions, please refer to the linked documents.

### 1. LLM Service (llama.cpp)

We use `llama.cpp` to serve the Qwen3 model via an OpenAI-compatible API.

* **Engine:** [llama.cpp GitHub](https://github.com/ggml-org/llama.cpp) (Follow their build instructions)

* **Model:** [Qwen3-24B-A4B-Freedom-HQ... (HuggingFace)](https://huggingface.co/DavidAU/Qwen3-24B-A4B-Freedom-HQ-Thinking-Abliterated-Heretic-NEOMAX-Imatrix-GGUF?not-for-all-audiences=true)

**Launch Command:** Adjust the paths to match your model location. This starts the server on port 8080. The flags below correspond to the specific settings used for the app.

```
# llama.cpp setup used:
/root/llama.cpp/build/bin/llama-server \
  -m /opt/Qwen3-24-A4B.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --n-gpu-layers 99 \ 
  -c 16384 \
  -np 1 \
  -b 1024 \
  -t 32 \
  -fa on \ # Note that flash attention support depends on hardware. For Nvidia: Ampere or newer.
  --cache-type-k q8_0 \
  --cache-type-v q8_0 \
  --api-key "sk_example"

```

### 2. Speech Service (Fish Speech)

We use Fish Speech 1.5 for Text-to-Speech synthesis.

* **Code (release v1.5.1):** [Fish Speech GitHub](https://github.com/fishaudio/fish-speech)

* **Model:** [Fish Speech 1.5 (HuggingFace)](https://huggingface.co/fishaudio/fish-speech-1.5)

**Launch Command:** 
```
python -m tools.run_webui \  # note that this version of fish speech requires python 3.10
  --llama-checkpoint-path /path/to/checkpoints/fish-speech-1.5 \
  --decoder-checkpoint-path /path/to/checkpoints/fish-speech-1.5/firefly-gan-vq-fsq-8x1024-21hz-generator.pth \
  --decoder-config-name firefly_gan_vq \
  --compile \
  --half
```

## Running the Chatbot

Once the backend services are running:

1. **Configure your `.env` file:**
   Ensure the URLs match where your backend services are hosted.

   ```
   # Example for local usage
   BASE_URL=http://localhost:8080/v1
   API_KEY=sk_example
    
   GRADIO_URL=http://localhost:7860/
   GRADIO_USER=admin
   GRADIO_AUTH=sk_example
   ```

2. **Start the application:**

   ```
   python ./src/app.py
   ```

3. **Usage:**

   * Open webpage shown in code output.
     
   * Select a furniture item from the UI.

   * Choose a predefined question or type your own to start chatting.

## Sources

* **LLM Model:** [DavidAU/Qwen3-24B-A4B...](https://huggingface.co/DavidAU/Qwen3-24B-A4B-Freedom-HQ-Thinking-Abliterated-Heretic-NEOMAX-Imatrix-GGUF?not-for-all-audiences=true)

* **Inference Engine:** [llama.cpp](https://github.com/ggml-org/llama.cpp)

* **Fish Speech Model:** [fishaudio/fish-speech-1.5](https://huggingface.co/fishaudio/fish-speech-1.5)

* **Fish Speech Github:** [fishaudio/fish-speech](https://github.com/fishaudio/fish-speech)



