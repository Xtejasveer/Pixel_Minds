# agents/team.py
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_agentchat.teams import SelectorGroupChat
from core.config import load_prompt

def create_agent_team(
    model_client, npc_config: dict, npc_memory, all_tools: list
) -> SelectorGroupChat:
    
    npc_system_message = load_prompt(
        "npc_system_message.txt",
        npc_name=npc_config["name"],
        npc_background=npc_config["background"],
        npc_behavior=npc_config["behavior"],
        current_mood="neutral",
        inventory="nothing"
    )

    story_system_message = load_prompt(
        "story_system_message.txt", npc_name=npc_config["name"]
    )

    code_analyzer_system_message = load_prompt("code_analyzer_system_message.txt")
    
    vision_system_message = load_prompt("vision_agent_system_message.txt")

    npc_tools = [
        tool
        for tool in all_tools
        if tool.name
        in ["perception_tool", "personality_tool", "memory_tool"]
    ]
    story_tools = [tool for tool in all_tools if tool.name == "rag_tool"]
    
    # --- THIS IS THE FIX ---
    # The tool name now correctly matches the name defined in tools.py
    code_analyzer_tools = [
        tool for tool in all_tools if tool.name == "get_environment_data"
    ]

    npc_agent = AssistantAgent(
        name=npc_config["name"],
        system_message=npc_system_message,
        model_client=model_client,
        tools=npc_tools,
        reflect_on_tool_use=False,
        memory=[npc_memory],
        description=f"The synthesizer and final responder who speaks to the user. This agent DOES NOT possess factual knowledge on its own. It MUST wait for specialists like CodeAnalyzerAgent or StoryAgent to provide data before answering any factual question."
    )

    story_agent = AssistantAgent(
        name="story_agent",
        system_message=story_system_message,
        model_client=model_client,
        tools=story_tools,
        reflect_on_tool_use=False,
        description="A specialist data-gathering agent. Call this agent when the user asks a Factual Inquiry about background lore or story details. Its job is to provide context to the main NPC.",
    )

    code_analyzer_agent = AssistantAgent(
        name="CodeAnalyzerAgent",
        system_message=code_analyzer_system_message,
        model_client=model_client,
        tools=code_analyzer_tools,
        reflect_on_tool_use=False,
        description="A specialist data-gathering agent. Call this agent when the user asks a Factual Inquiry about the game world, such as item locations, store layout, or object status. Its output is raw JSON data for the main NPC to use.",
    )

    vision_agent = AssistantAgent(
        name="VisionAgent",
        system_message=vision_system_message,
        model_client=model_client,
        # No tools are needed; its instructions are to describe images.
        description="Specialized agent for describing the content of images/screenshots from the game world."
    )

    termination = MaxMessageTermination(max_messages=20) | TextMentionTermination(
        "APPROVE"
    )

    team = SelectorGroupChat(
        participants=[npc_agent, story_agent, code_analyzer_agent, vision_agent],
        model_client=model_client,
        termination_condition=termination,
        allow_repeated_speaker=True,
        max_selector_attempts=3,
    )

    return team