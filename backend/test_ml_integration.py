import requests
import json
import time
from services.firebase_service import get_firestore_devices, db

BASE_URL = "http://localhost:8000"
USER_ID = "v7LHzYJqMEdn3opIub1cWFZTBcf2"

def verify_integration():
    print("--- 1. Checking Current Device Status ---")
    devices = get_firestore_devices()
    for dev_id, data in devices.items():
        print(f"Device: {data.get('name')}, Status: {data.get('status')}")

    print("\n--- 2. Triggering Identification via API ---")
    try:
        response = requests.post(f"{BASE_URL}/trigger-identification", params={"user_id": USER_ID})
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"API Trigger failed (is server running?): {e}")

    print("\n--- 3. Verifying Firestore Updates ---")
    # Wait a moment for updates to propagate if triggered via listener/background
    time.sleep(2)
    new_devices = get_firestore_devices()
    for dev_id, data in new_devices.items():
        print(f"Device: {data.get('name')}, Status: {data.get('status')}")

    print("\n--- 4. (Optional) Simulating RTDB Update for RealtimeProcessor ---")
    print("To test the RealtimeProcessor, you can manually update a value in Firebase Console:")
    print(f"Path: /SmartMeter/users/{USER_ID}/data")
    print("The terminal running realtime_processor.py should show detection logs.")

if __name__ == "__main__":
    verify_integration()
