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
            devices[doc.id] = doc.to_dict()
        return devices
    except Exception as e:
        print(f"Error fetching devices from Firestore: {e}")
        return None

def get_realtime_data(path: str = "/"):
    try:
        ref = db.reference(path)
        return ref.get()
    except Exception as e:
        print(f"Error fetching data from {path}: {e}")
        return None

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
