# fastapi_app.py
import sys
import os
import json
import shutil
import uuid
import re
from pathlib import Path
from dotenv import load_dotenv
from core.config import get_valid_moods
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ValidationError

from autogen_agentchat.messages import MultiModalMessage
from autogen_core import Image as AGImage
from PIL import Image
from autogen_agentchat.state import BaseState

# --- IMPORTANT: Load environment variables at the very top ---
load_dotenv()

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from core import config, memory, tools
    from agents.team import create_agent_team
    from openai import InternalServerError, AuthenticationError
    from core.config import NPCResponse # Import the Pydantic model
except ImportError as e:
    print(f"Error: A required module could not be imported. Please ensure core/ and agents/ are in the same directory: {e}")
    sys.exit(1)

# --- FastAPI App Setup ---
app = FastAPI(title="AutoGen Character Chat API")

# --- Global state management & File Paths ---
SESSIONS = {}
UPLOAD_DIR = Path("data/uploads")
PUBLIC_DIR = Path("public")
STATE_DIR = Path("state")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB file size limit

# Create necessary directories on startup
for d in [UPLOAD_DIR, PUBLIC_DIR, STATE_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class CharacterInit(BaseModel):
    name: str
    background: str
    behavior: str
    story_file_path: str | None = None
    csharp_file_path: str | None = None
    image_file_path: str | None = None

def save_secure_upload(upload_file: UploadFile) -> str:
    if upload_file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File size exceeds the limit of {MAX_FILE_SIZE / 1024 / 1024} MB.")
    
    base_filename = Path(upload_file.filename).name
    unique_id = uuid.uuid4().hex
    extension = Path(base_filename).suffix or ".dat"
    secure_filename = f"{unique_id}{extension}"
    file_path = UPLOAD_DIR / secure_filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
    finally:
        upload_file.file.close()
        
    return str(file_path.resolve())

def get_state_path(character_name: str) -> Path:
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '', character_name.lower().replace(' ', '_'))
    return STATE_DIR / f"{safe_name}_state.json"


@app.get("/avatars")
async def get_avatars():
    avatars = []
    try:
        if not STATE_DIR.exists():
            return JSONResponse(content=avatars)

        seen = set()
        for filename in os.listdir(STATE_DIR):
            if not filename.endswith("_state.json"):
                continue
            fp = STATE_DIR / filename
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    state_data = json.load(f)
            except Exception as e:
                print(f"⚠️ Could not read/parse state file {filename}: {e}")
                continue

            persona = state_data.get("persona")
            if not persona:
                continue

            name = str(persona.get("name", "")).strip()
            if not name:
                continue

            normalized = name.lower()
            if normalized in seen:
                continue
            seen.add(normalized)

            avatars.append({
                "name": name,
                "background": persona.get("background", "") or "",
                "behavior": persona.get("behavior", "") or ""
            })
        return JSONResponse(content=avatars)
    except Exception as e:
        print(f"‼️ Unexpected error in /avatars: {e}")
        return JSONResponse(content={"detail": "Server error while fetching avatars."}, status_code=500)


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    allowed_extensions = {".pdf", ".txt", ".cs", ".png", ".jpg", ".jpeg", ".webp"}
    extension = Path(file.filename).suffix.lower()
    if extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}")
        
    file_path = save_secure_upload(file)
    return {"file_path": file_path}

@app.post("/initialize")
async def initialize_character(init_data: CharacterInit):
    session_id = str(uuid.uuid4())
    state_path = get_state_path(init_data.name)
    
    try:
        api_key = config.get_api_key()
        model_client = config.get_model_client(api_key)
        npc_config = {
            "name": init_data.name, "background": init_data.background, "behavior": init_data.behavior,
        }

        is_new_session = not os.path.exists(state_path)
        
        csharp_path = init_data.csharp_file_path
        story_path = init_data.story_file_path
        
        if is_new_session:
            print(f"No existing state found for '{init_data.name}'. Creating new session.")
            npc_memory = memory.setup_short_term_memory()
            rag_memory = memory.setup_rag_memory()
            if story_path and Path(story_path).exists():
                await memory.index_story_file(story_path, rag_memory)
            if csharp_path and not Path(csharp_path).exists():
                csharp_path = None
            npc_mood = "neutral"
            npc_inventory = []
        else:
            print(f"✅ Found existing state for '{init_data.name}'. Loading from '{state_path}'...")
            with open(state_path, 'r') as f:
                state_json = json.load(f)
            
            context_files = state_json.get("context_files", {})
            csharp_path = context_files.get("csharp")
            story_path = context_files.get("story")
            npc_memory = memory.setup_short_term_memory()
            rag_memory = memory.setup_rag_memory()
            npc_mood = state_json.get("npc_mood", "neutral")
            npc_inventory = state_json.get("npc_inventory", [])

        all_tools = tools.get_tools(
            npc_config=npc_config,
            npc_memory=npc_memory,
            rag_memory=rag_memory,
            csharp_file_path_from_main=csharp_path
        )
        npc_team = create_agent_team(model_client, npc_config, npc_memory, all_tools)
        
        if not is_new_session:
            await npc_team.load_state(state_json["team_state"])
            print(f"✅ State for '{init_data.name}' loaded successfully.")

        image_path = init_data.image_file_path if init_data.image_file_path and Path(init_data.image_file_path).exists() else None
        
        SESSIONS[session_id] = {
            "team": npc_team,
            "name": init_data.name,
            "background": init_data.background,
            "behavior": init_data.behavior,
            "rag_memory": rag_memory,
            "model_client": model_client,
            "npc_mood": npc_mood,
            "npc_inventory": npc_inventory,
            "is_new_session": is_new_session,
            "uploaded_files": {
                "story": story_path,
                "csharp": csharp_path,
                "image": image_path,
            }
        }
        return {"message": f"Character '{init_data.name}' initialized.", "session_id": session_id}
    except AuthenticationError:
         raise HTTPException(status_code=401, detail="Authentication failed. Check your API key.")
    except Exception as e:
        if session_id in SESSIONS:
            del SESSIONS[session_id]
        raise HTTPException(status_code=500, detail=f"Failed to initialize character: {str(e)}")

def extract_json_from_string(text: str) -> dict | None:
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            print(f"⚠️ Failed to decode JSON from extracted string: {match.group(0)}")
            return None
    return None

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    if session_id not in SESSIONS:
        await websocket.send_text("Error: Invalid session ID. Please initialize a character first.")
        await websocket.close()
        return

    session = SESSIONS[session_id]
    npc_team = session["team"]
    image_path = session["uploaded_files"]["image"]
    csharp_path = session["uploaded_files"]["csharp"]
    is_new_session = session["is_new_session"]
    initial_description = "The user did not provide a visual description of the scene."

    try:
        if image_path and is_new_session:
            try:
                pil_image = Image.open(image_path)
                ag_image = AGImage(pil_image)
                task_to_run = MultiModalMessage(source="user", content=["Describe this scene for me.", ag_image])
                print(f"✅ Created MultiModalMessage task for session {session_id}")
                
                initial_description_result = await npc_team.run(task=task_to_run)
                raw_vision_output = initial_description_result.messages[-1].content
                
                vision_data = extract_json_from_string(raw_vision_output)
                if vision_data and "response" in vision_data:
                    initial_description = vision_data["response"]
                else:
                    initial_description = raw_vision_output.replace("APPROVE", "").strip()
                print(f"Initial scene description: {initial_description}")
            except Exception as e:
                print(f"⚠️ Could not process image file {image_path}: {e}")
        
        print("INFO:     Connection open")

        while True:
            message = await websocket.receive_text()
            if message == '_TERMINATE_':
                break

            current_mood = SESSIONS[session_id].get("npc_mood", "neutral")
            current_inventory = SESSIONS[session_id].get("npc_inventory", [])
            inventory_str = ", ".join(current_inventory) if current_inventory else "nothing"
            character_name = session.get("name", "The NPC")
            valid_moods_str = ", ".join([f"'{m}'" for m in get_valid_moods()])

            task_prompt = (
                f"The user's message is: '{message}'.\n\n"
                f"--- CONTEXT ---\n"
                f"Your Current Mood: {current_mood}\n"
                f"Your Inventory: You are currently holding {inventory_str}.\n"
                f"Visual Description of the Scene: {initial_description}\n"
                f"C# File Path: {csharp_path or 'not provided'}\n\n"
                
                f"--- JSON OUTPUT RULE ---\n"
                f"Your final response MUST begin with a single valid JSON object. In the 'mood' field of this JSON, you MUST use exactly one of the following string values: {valid_moods_str}.\n\n"

                f"--- DECISION-MAKING FRAMEWORK ---\n"
                f"1. **Analyze User Intent:** First, classify the user's message into one of three categories:\n"
                f"   - **Category A (Factual Inquiry):** The user is asking a question that requires you to look up **new information that you do not already have in your context**.\n"
                f"   - **Category B (Direct Command):** The user is telling you to perform a physical action in the world (e.g., 'Pick up the wrapper', 'Open the door').\n"
                f"   - **Category C (Social Interaction):** The user is engaging in simple conversation (e.g., 'Hello', 'How are you?').\n\n"
                
                f"2. **Execute the Plan:** Based on the category, follow this logic:\n"
                f"   - **If Category A:** You MUST use a specialist agent (`CodeAnalyzerAgent` or `StoryAgent`) to gather the new facts. Do not answer directly.\n"
                f"   - **If the user's question can be answered using information already in your context (from a previous tool use), treat it as Category C.**\n"
                f"   - **If Category B or C:** No specialist data-gathering tools are needed. The main NPC, `{character_name}`, should respond directly by generating the required JSON.\n"
            )
            print("DEBUG: Task prompt created. About to call npc_team.run...")
            # --- START OF UPDATED BLOCK ---
            try:
                task_result = await npc_team.run(task=task_prompt)
                print("DEBUG: npc_team.run completed successfully.")
                
                if task_result and task_result.messages:
                    raw_output = task_result.messages[-1].content
                    print(f"DEBUG: Raw output from agent team: {raw_output}")
                    
                    response_dict = extract_json_from_string(raw_output)
                    
                    if response_dict:
                        try:
                            # 1. Validate the dictionary against your Pydantic model
                            response_data = NPCResponse(**response_dict)
                            print(f"DEBUG: Successfully validated JSON: {response_data.model_dump_json(indent=2)}")

                            print("\n--- NPC Full Response ---")
                            print(response_data.model_dump_json(indent=2))
                            print("--------------------------\n")
                            
                            SESSIONS[session_id]["npc_mood"] = response_data.mood
                            
                            dialogue_message = {
                                "type": "dialogue",
                                "message": response_data.response,
                                "animation": response_data.animation.split(':')[0].strip()
                            }
                            await websocket.send_text(json.dumps(dialogue_message))
                            print("DEBUG: Sent 'dialogue' message to frontend.")

                            # 2. Handle validated actions
                            action_parts = [part.strip() for part in response_data.action.split(":", 1)]
                            if len(action_parts) == 2:
                                verb, target = action_parts
                                
                                if verb.upper() in ["MOVE", "INTERACT"]:
                                    action_message = {
                                        "type": "action",
                                        "command": verb.upper(),
                                        "target": target,
                                        "animation": response_data.animation.split(':')[0].strip()
                                    }
                                    await websocket.send_text(json.dumps(action_message))
                                    print(f"DEBUG: Sent 'action' message ({verb.upper()}) to frontend.")

                                elif verb.upper() == "PICKUP":
                                    item_to_pickup = target
                                    if item_to_pickup and item_to_pickup not in SESSIONS[session_id]["npc_inventory"]:
                                        SESSIONS[session_id]["npc_inventory"].append(item_to_pickup)
                                        print(f"✅ NPC Inventory Update: Added '{item_to_pickup}'")
                                
                                elif verb.upper() == "UPDATE_STATUS":
                                    # Find the update_world_state tool from the agent's tool list
                                    update_tool = next((t for t in npc_team._participants[0].tools if t.name == "update_world_state"), None)
                                    if update_tool:
                                        try:
                                            # Target for UPDATE_STATUS contains two parts: "object, new_status"
                                            obj_name, new_status = [part.strip() for part in target.split(",", 1)]
                                            tool_result = await update_tool.call(target_object=obj_name, new_status=new_status)
                                            print(f"✅ World State Update: {tool_result}")
                                        except Exception as tool_e:
                                            print(f"⚠️ Error parsing or calling update_world_state tool: {tool_e}")
                        
                        except ValidationError as e:
                            print(f"⚠️ VALIDATION ERROR: AI response did not match NPCResponse model.\n{e}")
                            await websocket.send_text(json.dumps({
                                "type": "error",
                                "message": "System: My thoughts are a bit scrambled. Please try rephrasing."
                            }))
                    else:
                        print("DEBUG: Failed to extract JSON. Treating as fallback text.")
                        fallback_message = { "type": "dialogue", "message": raw_output.replace("APPROVE", "").strip(), "animation": "talk_passionately"}
                        await websocket.send_text(json.dumps(fallback_message))
                else:
                    print("DEBUG: Task result was empty or had no messages.")

            except (InternalServerError, AuthenticationError, Exception) as e:
                print(f"ERROR: Exception during agent run or processing: {e}")
                
                error_message = "Error: The AI service failed unexpectedly. Please try again."
                # Check for a status_code if it's an API error
                if hasattr(e, 'status_code'):
                    error_message = f"Error: The AI service failed. ({e.status_code})"

                await websocket.send_text(json.dumps({
                    "type": "error", 
                    "message": error_message
                }))
            # --- END OF UPDATED BLOCK ---

    except WebSocketDisconnect:
        print(f"Client disconnected from session {session_id}")
    finally:
        print(f"Closing session {session_id}...")

        try:
            state_path = get_state_path(session["name"])
            team_state = await npc_team.save_state()
            
            full_session_state = {
                "persona": {
                    "name": session.get("name"),
                    "background": session.get("background"),
                    "behavior": session.get("behavior"),
                },
                "context_files": {
                    "csharp": session["uploaded_files"].get("csharp"),
                    "story": session["uploaded_files"].get("story"),
                },
                "team_state": team_state,
                "npc_mood": session.get("npc_mood", "neutral"),
                "npc_inventory": session.get("npc_inventory", [])
            }
            with open(state_path, 'w') as f:
                json.dump(full_session_state, f, indent=2)
            print(f"✅ Session state for '{session['name']}' saved to '{state_path}'")
        except Exception as e:
            print(f"⚠️ Failed to save session state: {e}")
        
        uploaded_files = session.get("uploaded_files", {})
        for file_type, file_path in uploaded_files.items():
            if file_path and os.path.exists(file_path):
                try:
                    if UPLOAD_DIR.resolve() in Path(file_path).resolve().parents:
                        os.remove(file_path)
                        print(f"✅ Cleaned up {file_type} file: {file_path}")
                except OSError as e:
                    print(f"⚠️ Error cleaning up file {file_path}: {e}")

        await session["rag_memory"].close()
        await session["model_client"].close()
        del SESSIONS[session_id]
        print(f"Session {session_id} and its resources have been released.")
        
        if not websocket.client_state.name == 'DISCONNECTED':
            await websocket.close()
        print("INFO:     Connection closed")

app.mount("/public", StaticFiles(directory="public"), name="public_assets")

@app.get("/")
async def read_root():
    return FileResponse(os.path.join(PUBLIC_DIR, "index.html"))