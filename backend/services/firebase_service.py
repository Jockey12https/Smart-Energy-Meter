import firebase_admin
from firebase_admin import credentials, db, firestore
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Firebase Admin
# Assuming serviceaccount.json is in the parent directory (backend root)
cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceaccount.json")

# Prevent re-initialization
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': os.getenv('FIREBASE_DATABASE_URL', 'https://smartenergymeter-91219-default-rtdb.firebaseio.com')
        })
        print("Firebase initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")

def get_firestore_client():
    return firestore.client()

def get_firestore_devices():
    """
    Fetch all devices from Firestore 'devices' collection.
    """
    try:
        db_fs = get_firestore_client()
        devices_ref = db_fs.collection('devices')
        docs = devices_ref.stream()
        
        devices = {}
        for doc in docs:
            device_data = doc.to_dict()
            device_data['id'] = doc.id
            devices[doc.id] = device_data
        return devices
    except Exception as e:
        print(f"Error fetching devices from Firestore: {e}")
        return None

def update_firestore_device_status(device_name: str, status_str: str):
    """
    Find a device by name in Firestore and update its status.
    """
    try:
        db_fs = get_firestore_client()
        devices_ref = db_fs.collection('devices')
        # We search by name (e.g., 'Bulb 12W', 'Bulb 15W', 'Bulb 7W')
        query = devices_ref.where('name', '==', device_name).limit(1)
        docs = query.stream()
        
        updated = False
        for doc in docs:
            doc.reference.update({
                'status': status_str,
                'lastSeen': firebase_admin.firestore.SERVER_TIMESTAMP
            })
            print(f"Updated Firestore device '{device_name}' to {status_str}")
            updated = True
        
        if not updated:
            print(f"Device '{device_name}' not found in Firestore.")
    except Exception as e:
        print(f"Error updating Firestore device {device_name}: {e}")

def get_realtime_data(path: str = "/"):
    try:
        ref = db.reference(path)
        return ref.get()
    except Exception as e:
        print(f"Error fetching data from {path}: {e}")
        return None

def get_recent_readings(user_id: str, limit: int = 7):
    """
    Fetch the latest N readings for a user from RTDB.
    Returns a list of dicts with keys: Irms, Power, Vrms, kWh, timestamp
    """
    try:
        ref = db.reference(f'/SmartMeter/users/{user_id}/data')
        # RTDB keys are formatted like '2026-02-06_10:16:44_924'
        snapshot = ref.order_by_key().limit_to_last(limit).get()
        
        if not snapshot:
            return []
            
        # snapshot is a dict, we want a sorted list of reading objects
        sorted_keys = sorted(snapshot.keys())
        readings = []
        for key in sorted_keys:
            data = snapshot[key]
            # Convert raw strings to floats, default to 0.0
            reading = {
                'Irms': float(data.get('Irms', 0)),
                'Power': float(data.get('Power', 0)),
                'Vrms': float(data.get('Vrms', 0)),
                'kWh': float(data.get('kWh', 0)),
                'timestamp': key # The key itself is the ISO-like timestamp
            }
            readings.append(reading)
        return readings
    except Exception as e:
        print(f"Error fetching recent readings for {user_id}: {e}")
        return []

def update_device_status(device_id: str, status: dict):
    try:
        ref = db.reference(f'/devices/{device_id}')
        ref.update(status)
    except Exception as e:
        print(f"Error updating device {device_id}: {e}")

def add_alert(alert: dict):
    try:
        ref = db.reference('/alerts')
        ref.push(alert)
    except Exception as e:
        print(f"Error adding alert: {e}")

def acknowledge_alert(alert_id: str):
    """
    Mark an alert as read in Realtime Database.
    Note: alert_id here is the Firebase push key. If using custom IDs, 
    we must find the child with that ID.
    However, Alerts.tsx uses the key as ID (line 47).
    """
    try:
        ref = db.reference(f'/alerts/{alert_id}')
        ref.update({"is_read": True})
        return True
    except Exception as e:
        print(f"Error acknowledging alert {alert_id}: {e}")
        return False
