import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_anomaly_endpoint():
    print("Testing /detect-anomaly endpoint...")
    try:
        response = requests.post(f"{BASE_URL}/detect-anomaly")
        if response.status_code == 200:
            data = response.json()
            print("Successfully received response:")
            print(json.dumps(data, indent=2))
            
            result = data.get("anomaly_result", {})
            print(f"\nAnomaly Detected: {result.get('is_anomaly')}")
            print(f"Score: {result.get('score')}")
            print("Features extracted:", list(result.get("features", {}).keys()))
        else:
            print(f"Failed with status code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    test_anomaly_endpoint()
