import requests
import json

BASE_URL = "http://localhost:8000"
USER_ID = "v7LHzYJqMEdn3opIub1cWFZTBcf2"

def test_billing_summary():
    print(f"Testing /billing/summary for user {USER_ID}...")
    try:
        response = requests.get(f"{BASE_URL}/billing/summary", params={"user_id": USER_ID})
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response JSON:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_billing_summary()
