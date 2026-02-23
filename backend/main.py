from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys

# Ensure backend directory is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models_schemas import DeviceIdentificationRequest, PredictionRequest, Alert
from services.firebase_service import get_realtime_data, add_alert, update_device_status, get_firestore_devices, acknowledge_alert, get_recent_readings
from services.ml_service import ml_service_instance

app = FastAPI(title="Smart Energy Meter Backend")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev, restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Smart Energy Meter API is running"}

@app.post("/predict/energy")
async def predict_energy_usage(request: PredictionRequest):
    try:
        # We might want to fetch recent data from Firebase if not provided, 
        # but here we use request body.
        result = ml_service_instance.predict_energy(request.features)
        return {"predicted_energy": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/identify/device")
async def identify_device(request: DeviceIdentificationRequest):
    try:
        result = ml_service_instance.identify_device(request.power_readings)
        # Result logic might need mapping to "Bulb 1", "Bulb 2", etc.
        # Assuming model returns label encoding or specific ID.
        return {"identified_device": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Identification failed: {str(e)}")

@app.get("/alerts")
async def get_alerts():
    data = get_realtime_data("/alerts")
    return {"alerts": data}

@app.post("/alerts")
async def create_alert(alert: Alert):
    add_alert(alert.dict())
    return {"message": "Alert added successfully"}

@app.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert_endpoint(alert_id: str):
    success = acknowledge_alert(alert_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")
    return {"message": "Alert acknowledged"}

@app.get("/devices")
async def get_devices():
    data = get_firestore_devices()
    return {"devices": data}

@app.post("/trigger-identification")
async def trigger_ident(user_id: str = Query(..., description="Firebase UID of the logged-in user")):
    """
    Trigger identification based on the latest readings in Firebase.
    user_id must be passed by the frontend (the logged-in Firebase UID).
    """
    try:
        # 1. Fetch recent readings from Firebase (objects with timestamps)
        readings = get_recent_readings(user_id, limit=7)
        
        if len(readings) < 1:
            return {"message": "No data found to run identification."}
            
        # 2. Run inference (this handles freshness and updates Firebase status)
        result = ml_service_instance.identify_device(readings)
        
        # 3. Return result
        return {
            "user_id": user_id,
            "readings_used": readings,
            "identified_device_states": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Identification trigger failed: {str(e)}")

@app.post("/detect-anomaly")
async def detect_anomaly(user_id: str = Query(..., description="Firebase UID of the logged-in user")):
    """
    Detect energy anomalies using the energy_anomaly_model.
    Fetches the latest readings from Firebase RTDB.
    user_id must be passed by the frontend (the logged-in Firebase UID).
    """
    try:
        # 1. Fetch recent readings (at least 10-20 for rolling stats)
        readings = get_recent_readings(user_id, limit=20)
        
        if len(readings) < 1:
            return {"message": "No data found to run anomaly detection."}
            
        # 2. Run anomaly detection
        result = ml_service_instance.detect_anomaly(readings)
        
        # 3. Return result
        return {
            "user_id": user_id,
            "readings_count": len(readings),
            "anomaly_result": result
        }
    except Exception as e:
        print(f"Anomaly detection trigger failed: {e}")
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
