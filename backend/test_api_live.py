import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
RED = "\033[91m"
GREEN = "\033[92m"
CYAN = "\033[96m"
RESET = "\033[0m"

def log_test(name, result, response=None):
    if result:
        print(f"{GREEN}[PASS] {name}{RESET}")
    else:
        print(f"{RED}[FAIL] {name}{RESET}")
        if response:
            print(f"{RED}Error: {response.text}{RESET}")

def test_endpoints():
    print(f"{CYAN}Starting API Tests on {BASE_URL}...{RESET}\n")

    # 1. Health Check
    try:
        res = requests.get(f"{BASE_URL}/")
        log_test("Root Endpoint (/)", res.status_code == 200)
    except Exception as e:
        print(f"{RED}[FAIL] Server not reachable. Is it running?{RESET}")
        return

    # 2. Analyze Problem (Gemini)
    print("\ntesting /analyze (this might take a few seconds)...")
    payload_analyze = {
        "title": "Two Sum",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        "difficulty": "Easy",
        "url": "https://leetcode.com/problems/two-sum/"
    }
    res = requests.post(f"{BASE_URL}/analyze", json=payload_analyze)
    log_test("Analyze Endpoint (/analyze)", res.status_code == 200, res)
    if res.status_code == 200:
        data = res.json()
        if "patterns" in data and "time_complexity" in data:
            print(f"   > Patterns detected: {len(data['patterns'])}")
        else:
            print(f"   > {RED}Warning: Unexpected response format{RESET}")

    # 3. Solve Problem (Save Progress)
    print("\ntesting /solve...")
    payload_solve = {
        "title": "Two Sum",
        "difficulty": "Easy",
        "quality": 5, # Perfect recall
        "url": "https://leetcode.com/problems/two-sum/"
    }
    res = requests.post(f"{BASE_URL}/solve", json=payload_solve)
    log_test("Solve Endpoint (/solve)", res.status_code == 200, res)
    if res.status_code == 200:
        data = res.json()
        print(f"   > Next review in: {data.get('interval_days')} days")

    # 4. Get Stats
    print("\ntesting /stats...")
    res = requests.get(f"{BASE_URL}/stats")
    log_test("Stats Endpoint (/stats)", res.status_code == 200, res)
    if res.status_code == 200:
        data = res.json()
        print(f"   > Streak: {data.get('streak')}")
        print(f"   > Mastery Rate: {data.get('mastery_rate')}%")

    # 5. Get Due Today
    print("\ntesting /today...")
    res = requests.get(f"{BASE_URL}/today")
    log_test("Due Today Endpoint (/today)", res.status_code == 200, res)
    if res.status_code == 200:
        data = res.json()
        print(f"   > Due Count: {data.get('due_count')}")

    # 6. Get Heatmap
    print("\ntesting /heatmap...")
    res = requests.get(f"{BASE_URL}/heatmap")
    log_test("Heatmap Endpoint (/heatmap)", res.status_code == 200, res)
    if res.status_code == 200:
        data = res.json()
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        print(f"   > Data points: {len(data)}")
        if today_str in data:
            print(f"   > Activity confirmed for today ({data[today_str]})")

if __name__ == "__main__":
    test_endpoints()
