from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class DeviceData(BaseModel):
    current: float
    voltage: float
    power: float
    timestamp: Optional[str] = None

class DeviceIdentificationRequest(BaseModel):
    power_readings: List[float]  # A sequence of power readings for identification

class PredictionRequest(BaseModel):
    # Adjust based on what the BiLSTM expects (e.g., last N hours of data)
    # For now, generic list of floats
    features: List[float]

class Alert(BaseModel):
    id: str
    message: str
    severity: str  # 'low', 'medium', 'high'
    timestamp: str
    is_read: bool

class DeviceStatus(BaseModel):
    device_id: str
    device_name: str
    is_active: bool
    last_active: str
