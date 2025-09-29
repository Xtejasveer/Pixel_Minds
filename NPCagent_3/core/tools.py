# core/tools.py
import json
import os
import re
import aiofiles
from autogen_core.tools import FunctionTool
from typing_extensions import Annotated

WORLD_STATE_PATH = "data/world_state.json"

# This function now correctly accepts the file path from main.py
def get_tools(
    npc_config: dict,
    npc_memory,
    rag_memory,
    csharp_file_path_from_main: str | None
) -> list[FunctionTool]:
    """
    Creates and returns a list of all FunctionTool objects.
    """

    # --- Tool Logic ---

    # In core/tools.py

    async def analyze_csharp_file(
        llm_provided_path: Annotated[
            str, "The path to the C# script. This is ignored; the correct path is pre-configured."
        ]
    ) -> str:
        """
        Analyzes the game project to extract state, layout, objects, and characters.
        Reads static data from the C# script and dynamic object statuses from world_state.json.
        """
        data = {
            "gameState": {}, "storeLayout": {"locations": {}, "aisleContents": {}},
            "objects": [], "characters": [],
        }
        
        try: # 1. Load dynamic state for objects ONLY from JSON. This is the single source of truth.
            async with aiofiles.open(WORLD_STATE_PATH, "r", encoding="utf-8") as f:
                world_state = json.loads(await f.read())
                data["objects"] = world_state.get("objects", [])
        except Exception as e:
            return f"Critical Error: Could not read world_state.json: {e}"

        if not csharp_file_path_from_main or not os.path.exists(csharp_file_path_from_main):
            return json.dumps(data, indent=2)

        try: # 2. Load ONLY STATIC data (layout, characters) from C#
            async with aiofiles.open(csharp_file_path_from_main, "r", encoding="utf-8") as f:
                csharp_code = await f.read()

            def extract_static_values(class_name, target_dict):
                class_pattern = re.compile(r"public static class " + class_name + r"\s*\{([\s\S]*?)\}", re.DOTALL)
                class_match = class_pattern.search(csharp_code)
                if class_match:
                    content = class_match.group(1)
                    for line in content.splitlines():
                        line = line.strip()
                        if not line.startswith("public static"): continue
                        str_match = re.search(r'string\s+(\w+)\s*=\s*"(.*?)";', line)
                        if str_match: target_dict[str_match.group(1)] = str_match.group(2)
                        int_match = re.search(r'int\s+(\w+)\s*=\s*(\d+);', line)
                        if int_match: target_dict[int_match.group(1)] = int(int_match.group(2))
                        bool_match = re.search(r'bool\s+(\w+)\s*=\s*(true|false);', line)
                        if bool_match: target_dict[bool_match.group(1)] = bool_match.group(2).lower() == 'true'

            extract_static_values("GameState", data["gameState"])

            aisle_pattern = re.compile(r'AisleContents = new Dictionary<string, string>\s*\{([\s\S]*?)\};', re.DOTALL)
            aisle_match = aisle_pattern.search(csharp_code)
            if aisle_match:
                content = aisle_match.group(1)
                entry_pattern = re.compile(r'\{"(.*?)",\s*"(.*?)"\}')
                for match in entry_pattern.finditer(content):
                    data["storeLayout"]["aisleContents"][match.group(1)] = match.group(2)
            
            # NOTE: We now ONLY parse "Characters" from the C# file. 
            # The logic to parse "Objects" has been intentionally removed.
            char_pattern = re.compile(r'public static List<Character>\s*Characters\s*=\s*new List<Character>\s*\{([\s\S]*?)\};', re.DOTALL)
            char_match = char_pattern.search(csharp_code)
            if char_match:
                list_content = char_match.group(1)
                item_pattern = re.compile(r'new Character\s*\{([\s\S]*?)\}', re.DOTALL)
                for item_match in item_pattern.finditer(list_content):
                    item_data = {}
                    prop_pattern = re.compile(r'(\w+)\s*=\s*"(.*?)"', re.DOTALL)
                    for prop_match in prop_pattern.finditer(item_match.group(1)):
                        item_data[prop_match.group(1).strip()] = prop_match.group(2).strip()
                    data["characters"].append(item_data)
            
            return json.dumps(data, indent=2)
        except Exception as e:
            return f"Error analyzing C# file: {str(e)}"

    async def perception_tool(event: Annotated[str, "Event happening in the world"]) -> str:
        return f"{npc_config['name']} perceives: {event}"

    async def personality_tool() -> str:
        return (f"Name: {npc_config['name']}. Background: {npc_config['background']}. Behavior: {npc_config['behavior']}.")

    async def memory_tool(query: Annotated[str, "The query to recall from NPC memory"]) -> str:
        records_result = await npc_memory.query()
        records = records_result.results if hasattr(records_result, "results") else records_result
        if not records: return f"As {npc_config['name']}, I do not recall anything."
        if not query:
            last = records[-3:]
            return "\n".join([r.content for r in last])
        for record in reversed(records):
            if query.lower() in record.content.lower():
                return f"As {npc_config['name']}, I recall: '{record.content}'."
        return f"As {npc_config['name']}, I do not recall anything about '{query}'."

    async def rag_tool(query: Annotated[str, "The query to retrieve from story knowledge base"]) -> str:
        """Retrieves relevant story information using a RAG query."""
        query_result = await rag_memory.query(query)
        results = query_result.results if hasattr(query_result, "results") else query_result
        if results:
            return "Relevant story info:\n" + "\n".join([r.content for r in results])
        return "No relevant story knowledge found."

    async def update_world_state(
        target_object: Annotated[str, "The name of the object to update, e.g., 'front door'."],
        new_status: Annotated[str, "The new status for the object, e.g., 'Open'."],
    ) -> str:
        """
        Updates the status of an object in the world_state.json file.
        This is used for actions that permanently change the environment.
        """
        try:
            async with aiofiles.open(WORLD_STATE_PATH, "r+", encoding="utf-8") as f:
                content = await f.read()
                world_data = json.loads(content)
                
                found_object = False
                for obj in world_data.get("objects", []):
                    if obj.get("Name") == target_object:
                        obj["Status"] = new_status
                        found_object = True
                        break
                
                if not found_object:
                    return f"Error: Object '{target_object}' not found in world state."

                await f.seek(0)
                await f.truncate()
                await f.write(json.dumps(world_data, indent=2))
                return f"Success: Updated '{target_object}' status to '{new_status}'."

        except Exception as e:
            return f"Error updating world state: {e}"
        
    # --- Tool Registration ---
    perception = FunctionTool(perception_tool, name="perception_tool", description="NPC perceives events in the game world")
    personality = FunctionTool(personality_tool, name="personality_tool", description="Return NPC personality traits")
    memory = FunctionTool(memory_tool, name="memory_tool", description="Recall past NPC memory or events")
    rag = FunctionTool(rag_tool, name="rag_tool", description="Retrieve facts from story knowledge base")
    
    update_tool = FunctionTool(
        update_world_state,
        name="update_world_state",
        description="Permanently updates the status of an interactable object in the game world."
    )
    # CORRECTED: Renamed the tool to match the system prompt's instruction.
    code_analyzer_tool = FunctionTool(
        analyze_csharp_file,
        name="get_environment_data",
        description="Analyzes a C# script file to find and extract raw game world data as a JSON object."
    )

    return [perception, personality, memory, rag, code_analyzer_tool, update_tool]