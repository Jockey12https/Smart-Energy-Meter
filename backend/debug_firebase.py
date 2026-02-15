import firebase_admin
from firebase_admin import credentials, db
import os
from dotenv import load_dotenv

load_dotenv()

# Path to service account
cred_path = "serviceaccount.json"
database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://smartenergymeter-91219-default-rtdb.firebaseio.com')

print(f"Testing Firebase connection...")
print(f"Cred path: {os.path.abspath(cred_path)}")
print(f"Database URL: {database_url}")

try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': database_url
        })
    
    print("Firebase initialized. Attempting to fetch /devices...")
    ref = db.reference('/devices')
    data = ref.get()
    print("Success!")
    print(f"Data: {data}")

except Exception as e:
    print(f"\nConnection failed!")
    print(f"Error type: {type(e).__name__}")
    print(f"Error message: {e}")
    
    # Check system time
    import datetime
    print(f"\nCurrent System Time (UTC): {datetime.datetime.utcnow()}")
    print("If this time is significantly different from your actual current time, please sync your system clock.")
