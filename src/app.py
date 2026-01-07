from flask import Flask, request, jsonify, send_from_directory
import json
import os
import base64
import torch
from rag_model import chat_with_furniture  # blijft hetzelfde
from text_to_speech import speak           # optioneel, blijft hetzelfde

app = Flask(
    __name__,
    static_folder="frontend",
    template_folder="frontend"
)

# -------------------------
# Load furniture data
# -------------------------
with open("data/raw/furniture_data.json", "r", encoding="utf-8") as f:
    furniture_data = json.load(f)

# -------------------------
# Flask routes
# -------------------------
@app.route("/")
def home():
    return send_from_directory(app.template_folder, "index.html")


@app.route("/chat")
def chat_page():
    return send_from_directory(app.template_folder, "chat.html")


@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)


@app.route("/get_furniture_list")
def get_furniture_list():
    return jsonify(furniture_data)


@app.route("/ask", methods=["POST"])
def ask():
    data = request.json
    furniture_title = data.get("furniture")
    question = data.get("question")

    furniture = next(
        (f for f in furniture_data if f["title"].strip().lower() == furniture_title.strip().lower()),
        None
    )
    if not furniture:
        return jsonify({"error": f"Furniture '{furniture_title}' not found."}), 404

    answer = chat_with_furniture(question, furniture_title)

    audio_base64 = ""  # optie voor TTS

    return jsonify({
        "answer": answer,
        "audio": audio_base64
    })


# -------------------------
# Run Flask
# -------------------------
if __name__ == "__main__":
    # Gebruik MPS op MacBook als beschikbaar
    # anders fallback op CPU
    app.run(host="0.0.0.0", port=8000, debug=True) 
