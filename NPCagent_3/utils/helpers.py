import os
import hashlib
from core import memory

def file_hash(path: str) -> str | None:
    # ... (This function's logic remains the same)
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return None

async def handle_story_input(rag_memory):
    """Handles user input for story files or manual text entry."""
    # MODIFIED: The prompt is more specific.
    story_file = input("Enter story filename from 'data/stories/' (e.g., my_story.pdf) or press Enter to skip: ").strip()
    
    if story_file:
        # MODIFIED: The code now automatically constructs the full path.
        full_path = os.path.join("data", "stories", story_file)
        if os.path.exists(full_path):
            await memory.index_story_file(full_path, rag_memory)
        else:
            print(f"⚠️ File '{full_path}' not found. Switching to manual story input.")
            await handle_manual_story_input(rag_memory)
    else:
        await handle_manual_story_input(rag_memory)

async def handle_manual_story_input(rag_memory):
    """Helper for manual text entry."""
    print("No story file provided. You can type story text directly. Type 'DONE' on a new line to finish.")
    user_story_lines = []
    while True:
        line = input()
        if line.strip().upper() == "DONE":
            break
        user_story_lines.append(line)
    if user_story_lines:
        await memory.add_user_text_story("\n".join(user_story_lines), rag_memory)