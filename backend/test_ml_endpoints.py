import requests
import json

BASE_URL = "http://localhost:8000"

def test_predict_energy():
    print("Testing /predict/energy...")
    payload = {"features": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]} # 6 features
    response = requests.post(f"{BASE_URL}/predict/energy", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

def test_identify_device():
    print("\nTesting /identify/device...")
    payload = {"power_readings": [100.0, 105.0, 110.0, 95.0, 102.0, 108.0, 103.0]} # 7 features
    response = requests.post(f"{BASE_URL}/identify/device", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    try:
        test_predict_energy()
        test_identify_device()
    except Exception as e:
        print(f"Test failed: {e}")
