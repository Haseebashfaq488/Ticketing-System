"""Thin wrapper around the Gemini REST API.

The LLM is ONLY the reasoning component. It never touches the database
and never sees credentials. Everything it receives is assembled by our
backend (context builder) and everything it returns is validated by us.
"""
import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{MODEL}:generateContent"
)


class LLMError(Exception):
    """Raised when the LLM call fails or returns unusable output."""


def _is_configured() -> bool:
    return bool(GEMINI_API_KEY) and GEMINI_API_KEY != "your_api_key_here"


def _post(payload: dict) -> str:
    if not _is_configured():
        raise LLMError(
            "GEMINI_API_KEY is not set. Copy backend/.env.example to "
            "backend/.env and add your key from https://aistudio.google.com/apikey"
        )
    try:
        resp = requests.post(
            API_URL,
            params={"key": GEMINI_API_KEY},
            json=payload,
            timeout=60,
        )
    except requests.RequestException as exc:
        raise LLMError(f"Could not reach Gemini API: {exc}") from exc

    if resp.status_code != 200:
        raise LLMError(f"Gemini API error {resp.status_code}: {resp.text[:300]}")

    try:
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, ValueError) as exc:
        raise LLMError(
            "Unexpected Gemini response shape: " + json.dumps(data)[:300]
        ) from exc


def llm_text(system_prompt: str, contents: list, temperature: float = 0.4) -> str:
    """Plain-text generation (used by live chat)."""
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 1024},
    }
    return _post(payload)


def llm_json(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> dict:
    """JSON-constrained generation (used by ticket analysis)."""
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json",
            "maxOutputTokens": 2048,
        },
    }
    raw = _post(payload)
    # Strip accidental markdown fences even though we asked for JSON mime type
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
    return json.loads(raw)
