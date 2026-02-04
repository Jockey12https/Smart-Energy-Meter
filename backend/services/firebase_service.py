import firebase_admin
from firebase_admin import credentials, db
import os
import json

# Initialize Firebase Admin
# Assuming serviceaccount.json is in the parent directory (backend root)
cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceaccount.json")

# Prevent re-initialization
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://smartenergymeter-91219-default-rtdb.firebaseio.com'
        })
        print("Firebase initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")

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
