from rag_model import chat_with_furniture
from text_to_speech import speak
import json

# Load furniture data
with open("data/raw/furniture_data.json", "r", encoding="utf-8") as f:
    furniture_data = json.load(f)

print("Welcome to the furniture chatbot! Type 'exit' to quit.\n")

# Let the user choose a furniture piece
while True:
    print("Which piece of furniture would you like to speak to?")
    for i, furniture in enumerate(furniture_data, 1):
        print(f"{i}. {furniture['title']}")
    print("0. Quit")

    choice = input("> ")
    if choice.lower() in ["0", "exit", "quit"]:
        print("Goodbye!")
        exit()

    if choice.isdigit() and 1 <= int(choice) <= len(furniture_data):
        furniture_title = furniture_data[int(choice) - 1]["title"]
        break
    else:
        print("Invalid choice. Please select a number from the list.")

# 3 standard questions
questions = [
    "Tell me something about your origin and style.",
    "What makes you unique compared to other pieces of furniture?",
    "Have you ever experienced an interesting event?"
]

while True:
    print(f"\nYou are now talking to {furniture_title}.")
    print("Choose a question, type your own, or switch furniture:")
    for i, question in enumerate(questions, 1):
        print(f"{i}. {question}")
    print("f. Switch furniture")
    print("0. Quit")

    choice = input("> ")

    if choice.lower() in ["0", "exit", "quit"]:
        print("Goodbye!")
        break

    if choice.lower() == "f":
        # Switch furniture
        while True:
            print("\nWhich piece of furniture would you like to speak to?")
            for i, furniture in enumerate(furniture_data, 1):
                print(f"{i}. {furniture['title']}")
            print("0. Cancel")
            f_choice = input("> ")
            if f_choice.lower() in ["0", "cancel"]:
                break
            if f_choice.isdigit() and 1 <= int(f_choice) <= len(furniture_data):
                furniture_title = furniture_data[int(f_choice) - 1]["title"]
                print(f"Switched to {furniture_title}")
                break
            else:
                print("Invalid choice. Please select a number from the list.")
        continue

    # Standard question selected
    if choice.isdigit() and 1 <= int(choice) <= len(questions):
        user_input = questions[int(choice) - 1]
    else:  # custom input
        user_input = choice

    answer = chat_with_furniture(user_input, furniture_title)
    print(f"\n{furniture_title}: {answer}\n")

    # accent van huidig meubel
    furniture = next(item for item in furniture_data if item["title"] == furniture_title)
    accent = furniture.get("accent", "american")

    speak(answer, accent)

