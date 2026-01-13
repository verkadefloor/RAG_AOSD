# Readme
## Furniture RAG Chatbot
This repository contains a Retrieval-Augmented Generation (RAG) chatbot that uses Google’s Gemma 3 IT (instruction-tuned) model to chat as a piece of furniture.


**Features:**
* Chat with different furniture items based on description and history.
* Supports predefined questions and free input.
* Multilingual and multimodal with Gemma 3 IT.
* Runs locally on CPU or GPU.

**Requirements:**
* Python 3.9 - 3.13
* GPU recommended for faster generation, CPU also works.
* Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Chatbot
```bash
python src/chatbot.py
```
* First, select a furniture item.
* Choose a predefined question or type your own.
* Type exit to quit.

## Example interaction
```vbnet
Welcome to the furniture chatbot! Type 'exit' to quit.

Which piece of furniture would you like to speak to?
1. Poppenhuis Petronella Oortman
2. Kast Herman Doomer
0. Quit
> 1

You are now talking to Poppenhuis Petronella Oortman.
Choose a question, type your own, or switch furniture:
1. Tell me something about your origin and style.
2. What makes you unique compared to other pieces of furniture?
3. Have you ever experienced an interesting event?
f. Switch furniture
0. Quit
> 3


Poppenhuis Petronella Oortman: Oh, my dear, a delightful question!
While I haven’t experienced a grand adventure –I’m a rather stationary
piece – I’ve certainly absorbed countless stories and dreams through
the watchful eyes of those who’ve placed themselves within my embrace.
```

## Sources

The project uses the **Gemma 3** instruction-tuned model from Google DeepMind. For more details:

1. **Official Model Card (Hugging Face)**  
   [Gemma 3 – 1B Instruction-Tuned](https://huggingface.co/google/gemma-3-1b-it) -  
   Provides model details, input/output formats, example code, and licensing information.

2. **Technical Report**  
   [Gemma 3 Technical Report](https://goo.gle/Gemma3Report) -
   Detailed explanation of architecture, training datasets, multimodal capabilities, large context windows, and responsible AI guidelines.

3. **Tutorials and Notebooks**  
   - [Gemma on Kaggle](https://www.kaggle.com/google/gemma) – Interactive notebooks with examples for text generation, chat, and multimodal tasks.  
   - [Transformers Pipeline Documentation](https://huggingface.co/docs/transformers/main/en/main_classes/pipelines) – Guidance for using text-generation pipelines and multi-GPU setups.



