#!/usr/bin/env python3
import os
import sys

try:
    import openai
    import google.generativeai as genai
except ImportError:
    print("Missing required libraries. Run: pip install openai google-generativeai")
    sys.exit(1)

MODEL = os.getenv("DEFAULT_MODEL", "gemini-pro")
PROMPT = " ".join(sys.argv[1:]) or "Say hello from the AI router."

def use_openai(prompt):
    openai.api_key = os.getenv("OPENAI_API_KEY")
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

def use_gemini(prompt):
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content(prompt)
    return response.text

if __name__ == "__main__":
    if MODEL == "gemini-pro":
        print(use_gemini(PROMPT))
    else:
        print(use_openai(PROMPT))