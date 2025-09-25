# core/config.py
import os
from pathlib import Path
from typing import Literal, Optional

from autogen_ext.models.openai import OpenAIChatCompletionClient
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()
PROMPT_DIR = Path(__file__).parent.parent / "prompts"


def get_api_key() -> str:
    api_key = os.getenv("OPEN_ROUTER_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPEN_ROUTER_API_KEY not set in environment. Please set it in .env"
        )
    return api_key


def get_model_client(api_key: str) -> OpenAIChatCompletionClient:
    return OpenAIChatCompletionClient(
        base_url="https://openrouter.ai/api/v1",
        model="x-ai/grok-4-fast:free",
        api_key=api_key,
        model_info={
            "family": "x-ai",
            "vision": True,
            "function_calling": True,
            "json_output": True,
            "structured_output": True,
        },
    )



class NPCResponse(BaseModel):
    thoughts: str
    response: str
    mood: Literal["neutral", "happy", "sad", "angry", "curious", "excited", "confused", "sarcastic"]
    action: str
    animation: str

# ADD THIS FUNCTION
def get_valid_moods() -> list[str]:
    """Extracts the list of valid moods from the NPCResponse model."""
    return list(NPCResponse.model_fields["mood"].annotation.__args__)



def get_npc_config_from_user() -> dict:
    return {
        "name": input("Enter NPC name: "),
        "background": input("Enter NPC background: "),
        "behavior": input("Enter NPC behavior: "),
    }


def load_prompt(filename: str, **kwargs) -> str:
    try:
        with open(PROMPT_DIR / filename, "r") as f:
            prompt = f.read()
        return prompt.format(**kwargs)
    except FileNotFoundError:
        raise FileNotFoundError(f"Prompt file not found: {filename}")
    except KeyError as e:
        raise KeyError(f"Missing placeholder in prompt {filename}: {e}")