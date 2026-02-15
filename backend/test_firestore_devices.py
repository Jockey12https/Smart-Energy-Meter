import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.firebase_service import get_firestore_devices

def test_firestore_devices():
    print("Testing get_firestore_devices()...")
    devices = get_firestore_devices()
    if devices is not None:
        print(f"Success! Found {len(devices)} devices.")
        for device_id, data in devices.items():
            print(f"  ID: {device_id}, Data: {data}")
    else:
        print("Failed to fetch devices or collection is empty.")

if __name__ == "__main__":
    test_firestore_devices()
