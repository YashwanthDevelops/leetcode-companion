import os
import json
import asyncio
import time
from typing import Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Robust .env loading
# Finds the project root by looking for 'backend' in the path or just going up
# Current file: backend/app/services/gemini_service.py
current_file_path = Path(__file__).resolve()
project_root = current_file_path.parent.parent.parent
env_path = project_root / '.env'

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    # Fallback to standard loading if path calculation fails (e.g. structure change)
    load_dotenv()

class GeminiService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set. Please check your .env file.")
        
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = "gemini-flash-latest"
        
        # Rate limiting state
        self.last_request_time = 0
        self.min_request_interval = 2.0  # Increased to 2 seconds
        self.lock = asyncio.Lock()

    async def _rate_limit(self):
        """Ensures we don't exceed the free tier rate limits."""
        async with self.lock:
            current_time = time.time()
            elapsed = current_time - self.last_request_time
            if elapsed < self.min_request_interval:
                await asyncio.sleep(self.min_request_interval - elapsed)
            self.last_request_time = time.time()

    def _build_system_prompt(self, problem_description: str) -> str:
        return f"""
        You are an expert algorithm instructor. Analyze this LeetCode problem.
        
        PROBLEM:
        {problem_description}
        
        REQUIREMENTS:
        1. Identify optimal algorithmic patterns.
        2. Estimate Time/Space complexity.
        3. Provide confidence score (0-1).
        4. List prerequisites and similar problems.
        5. Provide a 'Key Insight'.
        
        Return JSON with this schema:
        {{
            "patterns": [{{"name": str, "confidence": float, "reason": str}}],
            "time_complexity": str,
            "space_complexity": str,
            "difficulty_analysis": str,
            "key_insight": str,
            "prerequisites": [str],
            "similar_problems": [str]
        }}
        """

    async def analyze_problem(self, description: str) -> Dict[str, Any]:
        """
        Analyzes a LeetCode problem description using Gemini AI.
        """
        if not description:
            raise ValueError("Problem description cannot be empty")
            
        retry_count = 0
        max_retries = 3
        
        while retry_count < max_retries:
            try:
                await self._rate_limit()
                
                prompt = self._build_system_prompt(description)
                
                response = await self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                        top_p=0.95,
                        top_k=40,
                        response_mime_type="application/json"
                    )
                )
                
                if not response.text:
                    raise ValueError("Empty response from Gemini API")
                    
                return json.loads(response.text)
                
            except Exception as e:
                error_str = str(e)
                if "429" in error_str:
                    print(f"Rate limit hit. Retrying... ({retry_count + 1}/{max_retries})")
                    retry_count += 1
                    await asyncio.sleep(5 * (retry_count + 1)) # Exponential-ish backoff
                else:
                    print(f"An error occurred: {error_str}")
                    raise

        raise Exception("Failed to analyze problem after multiple retries due to rate limiting.")

# Usage Example (for testing)
if __name__ == "__main__":
    async def main():
        service = GeminiService()
        sample_problem = """
        Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.
        """
        try:
            print("Analyzing problem...")
            result = await service.analyze_problem(sample_problem)
            print(json.dumps(result, indent=2))
        except Exception as e:
            print(f"Error: {e}")

    asyncio.run(main())
