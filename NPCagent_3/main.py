# main.py
import asyncio
import json
import os
from pathlib import Path

from agents.team import create_agent_team
from autogen_agentchat.ui import Console
from core import config, memory, tools
from utils import helpers


async def main():
    Path("data/stories").mkdir(parents=True, exist_ok=True)
    Path("data/environment").mkdir(parents=True, exist_ok=True)
    Path("state").mkdir(parents=True, exist_ok=True)
    Path("memory").mkdir(parents=True, exist_ok=True)
    print("✅ Project directories ensured.")

    api_key = config.get_api_key()
    model_client = config.get_model_client(api_key)
    npc_config = config.get_npc_config_from_user()

    npc_memory = memory.setup_short_term_memory()
    rag_memory = memory.setup_rag_memory()
    await helpers.handle_story_input(rag_memory)

    # MOVED: This block is now here, BEFORE the tools are created.
    csharp_filename = input("Enter C# script filename from 'data/environment/' (e.g., EnvironmentData.cs) or press Enter to skip: ").strip()
    csharp_file_path = None
    if csharp_filename:
        csharp_file_path = os.path.join("data", "environment", csharp_filename)
        if not os.path.exists(csharp_file_path):
            print(f"⚠️ C# file '{csharp_file_path}' not found. Skipping code analysis.")
            csharp_file_path = None

    # This line now works because csharp_file_path has been defined.
    all_tools = tools.get_tools(npc_config, npc_memory, rag_memory, csharp_file_path)

    team = create_agent_team(model_client, npc_config, npc_memory, all_tools)

    state_filename = os.path.join("state", f"npc_{npc_config['name'].lower()}_state.json")
    if os.path.exists(state_filename):
        try:
            with open(state_filename, "r") as f:
                saved_state = json.load(f)
            await team.load_state(saved_state)
            print(f"✅ Restored NPC team state from {state_filename}.")
        except Exception as e:
            print(f"⚠️ Could not load or restore NPC state: {e}")


    print("\n--- Conversation Start ---")
    while True:
        user_input = input("User: ").strip()
        if not user_input:
            continue
        if user_input.lower() in ["exit", "quit"]:
            break

        task_prompt = (
            f"The user's request is: '{user_input}'.\n\n"
            f"--- MANDATORY CONTEXT ---\n"
            f"C# File Path: {csharp_file_path}\n"
            f"--- END CONTEXT ---\n\n"
            f"Your first step is to use the CodeAnalyzerAgent to get a JSON object with data from the C# file. "
            f"This data represents the current state and layout of the world.\n\n"
            
            f"**RULES FOR YOUR RESPONSE:**\n"
            f"1. **Interpret Spatial Data:** The context data may contain object locations as Vector3 coordinates (e.g., '\"cashierTableLocation\": {{\"x\": 5.0, ...}}'). Use this information to understand where things are, but **DO NOT** mention the raw coordinates in your dialogue. Refer to locations by their human-readable names.\n"
            f"2. **Movement Action Rule:** If your action involves moving, the destination in your 'action' description **MUST EXACTLY MATCH** one of the names from the 'navigableLocations' array provided in the C# data.\n"
            f"3. **Use All Relevant Data:** Pay attention to all data points provided, such as 'DamageThreshold' or 'storeCleanliness', if they are relevant to the user's request.\n\n"
            f"Now, formulate your thoughts, response, mood, and action based on these rules."
        )

        try:
            await Console(team.run_stream(task=task_prompt))
        except Exception as e:
            print(f"Error during conversation: {str(e)}")
            continue

        try:
            npc_state = await team.save_state()
            with open(state_filename, "w") as f:
                json.dump(npc_state, f, default=str)
            print(f"\n--- NPC State Saved to {state_filename} ---\n")
        except Exception as e:
            print(f"Error saving state: {str(e)}")

    await model_client.close()
    await rag_memory.close()


if __name__ == "__main__":
    asyncio.run(main())