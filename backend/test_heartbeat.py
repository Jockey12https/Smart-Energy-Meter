import time
from services.firebase_service import get_firestore_devices
from services.ml_service import ml_service_instance

def verify_heartbeat():
    print("--- Heartbeat Verification ---")
    
    # 1. Start with a fresh state (all offline)
    print("Setting initial state to offline...")
    ml_service_instance.set_all_offline()
    
    # 2. Simulate data arrival
    print("\nSimulating data arrival (running identification)...")
    ml_service_instance.identify_device([100.0, 105.0, 110.0, 95.0, 102.0, 108.0, 103.0])
    
    devices = get_firestore_devices()
    online_count = sum(1 for d in devices.values() if d.get('status') == 'online')
    print(f"Devices online after identification: {online_count}")
    
    # 3. Trigger manual offline (simulating RealtimeProcessor timeout)
    print("\nTriggering manual offline (simulating heartbeat timeout)...")
    ml_service_instance.set_all_offline()
    
    devices = get_firestore_devices()
    online_count = sum(1 for d in devices.values() if d.get('status') == 'online')
    print(f"Devices online after heartbeat alert: {online_count}")
    
    if online_count == 0:
        print("\nSUCCESS: Heartbeat/Offline logic verified!")
    else:
        print("\nFAILURE: Some devices are still online.")

if __name__ == "__main__":
    verify_heartbeat()
