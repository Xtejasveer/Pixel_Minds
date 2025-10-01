# Project Title: Autonomous NPC.

This project builds Dynamic,context-aware NPC Framework using Autogen

---

## 🚀 Purpose of the Project

#### Currently exisiting NPCs in Role Playing Games are Static and Hard Coded. This project uses the power of LLMs to make them Percieve, think, understand and act according to the environment and story context.
---

---

## ✨ Features

### 1. 🤖 Multi-Agent Specialized Intelligence
Four AI agents working in coordination to prevent knowledge contamination while maintaining character authenticity:
* **🎭 NPC Agent:** Manages character personality and final dialogue.
* **📖 Story Agent:** Provides lore and narrative context from a knowledge base.
* **💻 CodeAnalyzer Agent:** Acts as the game world data expert, reading scripts and state files.
* **👁️ Vision Agent:** Grants environmental awareness by describing visual scenes.

### 2. 🎮 Structured Game-Ready Output System
Consistent JSON formatting for seamless and direct integration with game engines and animation systems.

### 3. 🌍 Dynamic Context Awareness
Real-time environmental integration creates truly immersive, context-sensitive interactions.
* **Visual Scene Analysis:** Interprets game screenshots to understand the immediate environment.
* **Live Game World Data:** Reads C# scripts and JSON files for real-time world state.
* **Persistent Story Lore:** Pulls from documents to stay consistent with the narrative.
* **Emotional State Tracking:*** Manages and transitions between different moods based on conversation.

### 4. 🧠 Persistent Memory Architecture
A dual-layer memory system allows NPCs to remember players and previous conversations.
* **Short-Term Memory:** Tracks the immediate conversation history within a session.
* **Long-Term Memory:** A vector database for deep story knowledge and semantic recall.
* **Cross-Session Persistence:** Includes functionality for automatic saving and loading of memory.

### 5. 🛡️ Safety & Control Framework
A built-in content management system ensures safe, predictable, and game-appropriate responses.
* **Content Filtering:** Automatically filters NSFW and inappropriate user requests
* **Ethical Guidelines:** Enforces ethical response boundaries to keep the NPC in line.
* **Modular Capabilities:** Tool-based restrictions control what the AI can and cannot do.

## 🔧 Setup and Installation Guide

Instructions on how a user can get your project running on their own machine.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Xtejasveer/Pixel_Minds.git
    cd NPCagent_3
    ```

2.  **Install `uv` (if you don't have it):**
    
    `uv` is a fast Python package manager used for this project. If you need to install it, run the appropriate command for your system.
    ```bash
    # On macOS, Linux, or Windows (WSL)
    curl -LsSf https://astral.sh/uv/install.sh| sh

    # On Windows (PowerShell)
    # You might have to first change your Execution Policy on your PC
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    
    #And then run this command to download uv
    irm https://astral.sh/uv/install.ps1| iex
    ```

4.  **Create and activate the virtual environment using `uv`:**
    * Make sure you are using Python version 3.12.
    * Download Python 3.12 if you dont have from
    * [Python 3.12](https://www.python.org/downloads/release/python-3120/)
    
    
    ```bash
    # Inside the NPCagent_3 folder initialize a uv project
    uv init
    # Create the virtual environment
    uv venv

    # Activate the environment
    # On Windows:
    .venv\Scripts\activate
    # On macOS/Linux:
    source .venv/bin/activate
    ```

6. **Install the required packages using `uv`:** 
    ```bash
    uv add -r requirements.txt
    ```
7. **Add an ipykernel:**
   ```bash
   uv add ipykernel
   ```
8. **You will have to select the virtual environment you made as the interpreter in VS code**
    * Open the command pallete using Ctrl + Shift + P
    * Type Select Interpreter and choose that option
    * Once the Select Interpreter Tab opens click on "Enter Interpreter Path"
    * Browse to NPCagent_3/.venv/Scripts/python.exe
    * Now you have made your virtual environment the interepreter. 

9.  **Special Setup:**
    * Go to [openrouter.ai](https://openrouter.ai) to get your API key.
    * Create an account and navigate to settings and then keys.
    * Make a new API key and give it any name you want.
    * Copy the API key in your clipboard.
    * In the NPCagent_3 folder you are required to make a .env file
    * Add your API key to the `.env` file in the NPCagent_3 folder like this: `OPEN_ROUTER_API_KEY="your_secret_key_from_openrouter"`

---

## ▶️ How to Run the Project

1.  **Start the FastAPI backend:**
    ```bash
    cd NPCagent_3
    uvicorn fastapi_app:app --host 127.0.0.1 --port 8000 --reload-dir .
    ```

2. **Open the application:**
    Open your web browser and go to `http://127.0.0.1:8000`.
---

##  Submissions

* **Video Demo URL:** ([https://youtu.be/b03IsgiFPnE](https://www.youtube.com/watch?v=j7RHOM4qtis))
* For a detailed breakdown of our project's architecture, agent roles, and technical highlights, please see our supplementary documentation file present in the root folder.
* The example showed in the demonstration video uses three external files, these files are also added to the root folder, use them if needed.
* The Final PPT is also added in the root folder.
