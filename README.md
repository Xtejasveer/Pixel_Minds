# Project Title: Autonomous NPC.

This project builds Dynamic,context-aware NPC Framework using Autogen

---

## 🚀 Purpose of the Project

#### Currently exisiting NPCs in Role Playing Games are Static and Hard Coded. This project uses the power of LLMs to make them Percieve, think, understand and act according to the environment and story context.
---

## ✨ Features

List the key features of your application.
* **Feature 1:** Give 
* **Feature 2:** Memory integration for context-aware dialogue.
* **Feature 3:** Web interface built with FastAPI and vanilla JavaScript.

---

## 🔧 Setup and Installation Guide

Instructions on how a user can get your project running on their own machine.

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Xtejasveer/Pixel_Minds.git](https://github.com/Xtejasveer/Pixel_Minds.git)
    cd Pixel_Minds
    cd NPCagent_3
    ```

2.  **Install `uv` (if you don't have it):**
    `uv` is a fast Python package manager used for this project. If you need to install it, run the appropriate command for your system.
    ```bash
    # On macOS, Linux, or Windows (WSL)
    curl -LsSf [https://astral.sh/uv/install.sh](https://astral.sh/uv/install.sh) | sh

    # On Windows (PowerShell)
    irm [https://astral.sh/uv/install.ps1](https://astral.sh/uv/install.ps1) | iex
    ```

3.  **Create and activate the virtual environment using `uv`:**
    Make sure you are using Python version 3.12.
    ```bash
    # Create the virtual environment
    uv venv

    # Activate the environment
    # On Windows:
    .venv\Scripts\activate
    # On macOS/Linux:
    source .venv/bin/activate
    ```

4. **Install the required packages using `uv`:**
    ```bash
    uv add -r requirements.txt
    ```
5. **Add an ipykernel:**
   ```bash
   uv add ipykernel
   ```
6.  **Special Setup:**
    * Go to [openrouter.ai](https://openrouter.ai) to get your API key.
    * Create an account and navigate to settings and then keys.
    * Make a new API key and give it any name you want.
    * Copy the API key in your clipboard.
    * Add your API key to the `.env` file in the NPCagent_3 folder like this: `OPEN_ROUTER_API_KEY="your_secret_key_from_openrouter"`

---

## ▶️ How to Run the Project

1.  **Start the FastAPI backend:**
    ```bash
    uvicorn fastapi_app:app --host 127.0.0.1 --port 8000 --reload
    ```

2. **Open the application:**
    Open your web browser and go to `http://127.0.0.1:8000`.
---

##  Submissions

* **Video Demo URL:** (https://youtu.be/b03IsgiFPnE)
* **Supplementary Resource URL:** [Link to any other resource]
