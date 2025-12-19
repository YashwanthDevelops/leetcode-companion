import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# Robust .env loading
current_file_path = Path(__file__).resolve()
project_root = current_file_path.parent.parent.parent
env_path = project_root / '.env'
load_dotenv(dotenv_path=env_path)

async def main():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("No API Key found")
        return

    client = genai.Client(api_key=api_key)
    try:
        # For google-genai v2, list() might return an async iterator directly or a coroutine.
        # Let's try to await it first or treating it as async iterator.
        # Based on error, it returned a coroutine.
        pager = await client.aio.models.list()
        async for model in pager:
            print(f"Model: {model.name}")
            # print(f"Supported generation methods: {model.supported_generation_methods}")
            print("-" * 20)
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    asyncio.run(main())
