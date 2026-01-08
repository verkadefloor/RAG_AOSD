from flask import Flask, request, jsonify, send_from_directory
import json
import os
import base64
import torch
from rag_model import chat_with_furniture  
from text_to_speech import speak           

app = Flask(
    __name__,
    static_folder="frontend",
    template_folder="frontend"
)


# Load furniture data
with open("data/raw/furniture_data.json", "r", encoding="utf-8") as f:
    furniture_data = json.load(f)


# Flask routes
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

    # Locate furniture data
    furniture = next(
        (f for f in furniture_data if f["title"].strip().lower() == furniture_title.strip().lower()),
        None
    )
    
    if not furniture:
        return jsonify({"error": f"Furniture '{furniture_title}' not found."}), 404

    # Call the LLM function (which now returns a Dict, not a String)
    # Expected format: {'message': "...", 'options': ["...", "...", "..."]}
    response_data = chat_with_furniture(question, furniture_title)

    # Check if the LLM function returned an internal error
    if "error" in response_data:
        return jsonify({"error": response_data["error"]}), 500

    # TTS Placeholder
    audio_base64 = "" 

    # Return the structured data to the frontend
    return jsonify({
        "answer": response_data.get("message", "I am speechless..."), # The character text
        "options": response_data.get("options", []),                  # The suggested questions
        "audio": audio_base64
    })

@app.route("/end")
def end_page():
    return send_from_directory(app.template_folder, "end.html")

# Run Flask
if __name__ == "__main__":
    # MPS for macbook
    app.run(host="0.0.0.0", port=8000, debug=True) 
