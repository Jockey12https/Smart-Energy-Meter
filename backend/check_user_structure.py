import firebase_admin
from firebase_admin import credentials, db
import os
from dotenv import load_dotenv

load_dotenv()

cred_path = "serviceaccount.json"
database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://smartenergymeter-91219-default-rtdb.firebaseio.com')

try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': database_url
        })
    
    print("Fetching /SmartMeter/users...")
    ref = db.reference('/SmartMeter/users')
    users = ref.get()
    
    if users:
        print(f"Users found: {list(users.keys())}")
        for uid in users.keys():
            print(f"\nStructure for user {uid}:")
            user_ref = db.reference(f'/SmartMeter/users/{uid}')
            user_data = user_ref.get()
            if isinstance(user_data, dict):
                print(f"  Keys: {list(user_data.keys())}")
                if 'devices' in user_data:
                    print(f"  Devices found: {user_data['devices']}")
                if 'data' in user_data:
                    print(f"  Data samples count: {len(user_data['data'])}")
            else:
                print(f"  Data: {user_data}")
    else:
        print("No users found.")

except Exception as e:
    print(f"Error: {e}")
