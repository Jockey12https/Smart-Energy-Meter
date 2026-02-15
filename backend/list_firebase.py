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
    
    print("Fetching root structure...")
    ref = db.reference('/')
    data = ref.get()
    
    if data:
        print("Root keys found:", data.keys() if isinstance(data, dict) else "Data is not a dict")
        if isinstance(data, dict):
            for key in data.keys():
                sub_ref = db.reference(f'/{key}')
                sub_data = sub_ref.get()
                if isinstance(sub_data, dict):
                    print(f"  /{key} keys: {sub_data.keys()}")
                else:
                    print(f"  /{key} is not a dict: {sub_data}")
    else:
        print("Database is empty at root.")

except Exception as e:
    print(f"Error: {e}")
