import requests
import json
import time
from datetime import datetime, timezone

JAVA_API = "http://localhost:8080/api/v1/simulate"
METER_ID = "1uipsD69wifP3nnYXFuZysUox963"

def send_data(kwh):
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    payload = {
        "meterId": METER_ID,
        "timestamp": timestamp,
        "kWh": kwh
    }
    try:
        print(f"Sending data: {kwh} kWh at {timestamp}...")
        response = requests.post(JAVA_API, json=payload)
        if response.status_code == 200:
            anomalies = response.json()
            if anomalies:
                print(f"!!! ANOMALY DETECTED: {anomalies}")
            else:
                print("Normal data recorded.")
        else:
            print(f"Failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Starting simulation (ensure Python model is on port 5000 and Java on 8080)...")
    
    # Send enough normal data to make a spike statistically rare (< 0.005 threshold)
    print("Sending 210 normal data points (batching)...")
    for i in range(210):
        send_data(0.5)
        
    print("Sending the anomaly spike...")
    # Send an anomaly (extremely high KWh)
    send_data(500.0)
    
    print("Simulation complete.")
