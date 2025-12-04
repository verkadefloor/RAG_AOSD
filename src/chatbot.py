# src/chatbot.py
from rag_model import chat_with_furniture

print("Welkom bij de meubel chatbot! Typ 'exit' om te stoppen.\n")

# Kies het meubelstuk
furniture_title = input("Welk meubelstuk wil je spreken? (bijv. 'Stoel Louis XV'):\n> ")

# Drie vaste vragen
vragen = [
    "Vertel iets over je herkomst en stijl.",
    "Wat maakt jou uniek vergeleken met andere meubelstukken?",
    "Heb je ooit een interessante gebeurtenis meegemaakt?"
]

while True:
    print("\nKies een vraag of typ je eigen vraag:")
    for i, vraag in enumerate(vragen, 1):
        print(f"{i}. {vraag}")
    print("0. Stoppen")

    keuze = input("> ")

    if keuze.lower() in ["0", "exit", "quit"]:
        print("Dag! 👋")
        break

    # Vaste vraag geselecteerd
    if keuze.isdigit() and int(keuze) in [1, 2, 3]:
        user_input = vragen[int(keuze) - 1]
    else:  # vrije input
        user_input = keuze

    antwoord = chat_with_furniture(user_input, furniture_title)
    print(f"\n{furniture_title}: {antwoord}\n")
