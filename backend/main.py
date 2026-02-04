from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys

# Ensure backend directory is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models_schemas import DeviceIdentificationRequest, PredictionRequest, Alert
from services.firebase_service import get_realtime_data, add_alert, update_device_status
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

@app.get("/devices")
async def get_devices():
    data = get_realtime_data("/devices")
    return {"devices": data}

# Endpoint to trigger identification based on current Firebase state (optional)
@app.post("/trigger-identification")
async def trigger_ident():
    # 1. Fetch current readings from Firebase
    # 2. Run inference
    # 3. Update Firebase with result
    # This is a placeholder for the "using existing data" requirement
    pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
