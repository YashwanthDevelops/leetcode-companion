"""
Quick test for the /patterns endpoint
Run this to verify patterns are being extracted correctly
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_patterns():
    print("\n🧪 Testing /patterns endpoint...\n")
    
    try:
        # Test patterns endpoint
        response = requests.get(f"{BASE_URL}/patterns")
        
        if response.status_code == 200:
            data = response.json()
            patterns = data.get('patterns', [])
            
            print(f"✅ SUCCESS! Found {len(patterns)} patterns:\n")
            
            if patterns:
                for pattern in patterns:
                    name = pattern['name']
                    solved = pattern['solved']
                    total = pattern['total']
                    pct = pattern['percentage']
                    print(f"  📊 {name:<25} {solved:>2}/{total:<2} ({pct:>2}%)")
            else:
                print("  ℹ️  No patterns found yet. Solve some problems first!")
                
            print(f"\n📋 Raw response:")
            print(json.dumps(data, indent=2))
            
        else:
            print(f"❌ ERROR: Status {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to backend at http://localhost:8000")
        print("   Make sure the backend is running: uvicorn app.main:app --reload")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    test_patterns()
