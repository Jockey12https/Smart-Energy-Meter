import os
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from typing import List

# Paths to models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

BILSTM_MODEL_PATH = os.path.join(MODELS_DIR, "bilstm_bulb_forecasting.h5")
XGBOOST_MODEL_PATH = os.path.join(MODELS_DIR, "nilm_xgboost_model.pkl")
# SCALERS
BILSTM_SCALER_PATH = os.path.join(MODELS_DIR, "bilstm_scaler.pkl")
ANOMALY_MODEL_PATH = os.path.join(MODELS_DIR, "energy_anomaly_model.pkl")
ANOMALY_SCALER_PATH = os.path.join(MODELS_DIR, "anomaly_scaler.pkl")

class MLService:
    def __init__(self):
        self.bilstm_scaler = None
        self.anomaly_model = None
        self.anomaly_scaler = None
        self.bulb_history = {0: [], 1: [], 2: []} # Track last 10 states for each bulb
        self.alerted_bulbs = set() # Track bulbs already alerted for fluctuation
        self.last_predict_features = None # Store features for rolling stats
        self.load_models()

    def load_models(self):
        try:
            print(f"Loading BiLSTM model from {BILSTM_MODEL_PATH}...")
            # Load with custom objects to handle mse and other metrics
            self.bilstm_model = tf.keras.models.load_model(
                BILSTM_MODEL_PATH,
                custom_objects={'mse': tf.keras.losses.MeanSquaredError()}
            )
            print("BiLSTM model loaded.")
        except Exception as e:
            print(f"Error loading BiLSTM model: {e}")

        try:
            print(f"Loading XGBoost model from {XGBOOST_MODEL_PATH}...")
            self.xgboost_model = joblib.load(XGBOOST_MODEL_PATH)
            print("XGBoost model loaded.")
        except Exception as e:
            print(f"Error loading XGBoost model: {e}")

        try:
            print(f"Loading BiLSTM scaler from {BILSTM_SCALER_PATH}...")
            self.bilstm_scaler = joblib.load(BILSTM_SCALER_PATH)
            print("BiLSTM scaler loaded.")
        except Exception as e:
            print(f"Error loading BiLSTM scaler: {e}")

        try:
            print(f"Loading Anomaly model from {ANOMALY_MODEL_PATH}...")
            self.anomaly_model = joblib.load(ANOMALY_MODEL_PATH)
            print("Anomaly model loaded.")
        except Exception as e:
            print(f"Error loading Anomaly model: {e}")

        try:
            print(f"Loading Anomaly scaler from {ANOMALY_SCALER_PATH}...")
            self.anomaly_scaler = joblib.load(ANOMALY_SCALER_PATH)
            print("Anomaly scaler loaded.")
        except Exception as e:
            print(f"Error loading Anomaly scaler: {e}")

    def _check_fluctuation(self, bulb_idx: int, state: int):
        """
        Check if a bulb is fluctuating based on history.
        Fluctuation: 4+ toggles in recent history.
        """
        history = self.bulb_history[bulb_idx]
        history.append(state)
        if len(history) > 10:
            history.pop(0)
        
        if len(history) < 6:
            return False
            
        toggles = 0
        for i in range(1, len(history)):
            if history[i] != history[i-1]:
                toggles += 1
        
        return toggles >= 4

    def predict_energy(self, features: List[float]):
        """
        Predict energy usage using BiLSTM model.
        Assumes features is a list of numerical values.
        """
        if not self.bilstm_model:
            raise ValueError("BiLSTM model is not loaded.")
        
        try:
            # Preprocessing
            # This logic depends highly on how the model was trained. 
            # Assuming input shape (1, timesteps, features) or (1, features)
            # Defaulting to reshaping to (1, 1, len(features)) if simple
            
            data = np.array(features).reshape(1, -1)
            
            if self.bilstm_scaler:
                data = self.bilstm_scaler.transform(data)
                
            # BiLSTM typically expects 3D input: [samples, time_steps, features]
            # If the model expects a sequence, we might need to adjust.
            # For now, assuming we reshape to (1, 1, n_features) or (1, n_features)
            # We'll try (1, 1, n_features) as BiLSTM usually takes sequences.
            try:
                # Based on the model summary, the first layer expects a sequence of length 20.
                # If we only have one sample, we repeat it 20 times to match the expected input shape.
                if data.shape[1] == 6:
                    data_3d = np.repeat(data[:, np.newaxis, :], 20, axis=1)
                else:
                    # Fallback or handle different features if any
                    data_3d = data.reshape(1, -1, 6)
                
                prediction = self.bilstm_model.predict(data_3d)
            except Exception as e:
                print(f"BiLSTM prediction failed with 3D input: {e}")
                # Ultimate fallback to 2D
                prediction = self.bilstm_model.predict(data)
            
            # Log raw prediction for debugging
            print(f"Raw BiLSTM prediction: {prediction}")

            # User requested the raw positive value from the prediction instead of inverse transformed value.
            # We take the absolute value of the first output element.
            result = abs(float(prediction[0][0])) if prediction.ndim > 1 else abs(float(prediction[0]))
            
            print(f"Final prediction result (raw positive): {result}")
            return result
        except Exception as e:
            print(f"Prediction error: {e}")
            raise e

    def set_all_offline(self):
        """
        Mark all devices as offline in both RTDB and Firestore.
        Used when no real-time data is received within the threshold.
        """
        labels = ['12W Bulb', '15W Bulb', '7W Bulb']
        firestore_labels = ['Bulb 12W', 'Bulb 15W', 'Bulb 7W']
        
        from services.firebase_service import update_device_status, update_firestore_device_status
        
        print("\n" + "!"*20 + " HEARTBEAT TIMEOUT: SETTING ALL OFFLINE " + "!"*20)
        for i, label in enumerate(labels):
            # RTDB
            update_device_status(str(i), {"name": label, "status": "OFF", "is_active": False})
            # Firestore
            update_firestore_device_status(firestore_labels[i], "offline")
        print("!"*64 + "\n")

    def detect_anomaly(self, readings: List[dict]):
        """
        Detect energy anomalies using the energy_anomaly_model.pkl.
        Expects a list of readings (at least 10 for rolling stats).
        Features: ['Power', 'Vrms', 'Irms', 'PF', 'VA', 'VAR', 'Power_change', 'Current_change', 'Voltage_change', 'Power_rolling_std']
        """
        if not self.anomaly_model:
            raise ValueError("Anomaly model is not loaded.")

        try:
            if len(readings) < 1:
                return {"anomaly": False, "score": 0.0, "message": "Insufficient data"}

            # Get latest reading
            curr = readings[-1]
            prev = readings[-2] if len(readings) > 1 else curr

            # 1. New Model Features: ['Voltage', 'Global_intensity', 'power_w', 'hour']
            power = curr.get('Power', 0.0)
            vrms = curr.get('Vrms', 0.0)
            irms = curr.get('Irms', 0.0)
            
            # Extract hour from timestamp: '2026-02-18_10:48:30_286'
            hour = 12 # Default
            ts_str = curr.get('timestamp', "")
            if ts_str and "_" in ts_str:
                try:
                    time_part = ts_str.split('_')[1]
                    hour = int(time_part.split(':')[0])
                except:
                    pass
            elif not ts_str:
                from datetime import datetime
                hour = datetime.now().hour

            # Features for energy_anomaly_model.pkl
            features = [vrms, irms, power, hour]
            
            data = np.array(features).reshape(1, -1)
            
            # 2. Features for return dict (transparency for frontend)
            va = vrms * irms
            pf = power / va if va > 0 else 1.0
            var_p = np.sqrt(max(0, (va**2) - (power**2)))
            power_change = power - prev.get('Power', power)
            all_powers = [r.get('Power', 0.0) for r in readings]
            power_rolling_std = np.std(all_powers) if len(all_powers) > 1 else 0.0

            # Prediction
            prediction = self.anomaly_model.predict(data)
            
            # IsolationForest returns -1 for anomaly, 1 for normal
            is_anomaly = bool(prediction[0] == -1)

            # Try to get score if possible
            score = 0.0
            if hasattr(self.anomaly_model, 'decision_function'):
                score = float(self.anomaly_model.decision_function(data)[0])
            elif hasattr(self.anomaly_model, 'predict_proba'):
                score = float(self.anomaly_model.predict_proba(data)[0][1])

            print(f"\n[MLService] Anomaly Detection: {'!!! ANOMALY !!!' if is_anomaly else 'Normal'}")
            print(f"Features (Model): {features}")
            print(f"Prediction: {prediction}, Score: {score}")

            return {
                "is_anomaly": is_anomaly,
                "score": score,
                "features": {
                    "Power": power,
                    "Vrms": vrms,
                    "Irms": irms,
                    "PF": pf,
                    "VA": va,
                    "VAR": var_p,
                    "Power_change": power_change,
                    "Power_rolling_std": power_rolling_std,
                    "Hour": hour
                }
            }
        except Exception as e:
            print(f"Anomaly detection error: {e}")
            raise e

    def identify_device(self, readings: List[dict]):
        """
        Identify device using XGBoost model.
        Expects a list of reading dicts: [{'Irms', 'Power', 'Vrms', 'kWh', 'timestamp'}, ...]
        """
        if not self.xgboost_model:
            raise ValueError("XGBoost model is not loaded.")
        
        try:
            if not readings or len(readings) < 1:
                return self.set_all_offline()

            # 1. Strict Freshness Check
            from datetime import datetime
            latest_reading = readings[-1]
            ts_str = latest_reading['timestamp'] # '2026-02-18_10:48:30_286'
            try:
                # Format: YYYY-MM-DD_HH:MM:SS_mmm
                read_dt = datetime.strptime(ts_str.split('_')[0] + " " + ts_str.split('_')[1], "%Y-%m-%d %H:%M:%S")
                # Also handle the milliseconds part if needed, but seconds is enough for freshness
                now = datetime.now()
                diff_seconds = (now - read_dt).total_seconds()
                
                # If data is older than 60 seconds, treat as offline
                if diff_seconds > 60:
                    print(f"[MLService] Data is stale ({int(diff_seconds)}s old). Marking all offline.")
                    self.set_all_offline()
                    return [[0, 0, 0]] # Return zeros
            except Exception as ts_err:
                print(f"[MLService] Timestamp parse error for '{ts_str}': {ts_err}")
                # If we can't parse, fall back to what we have or proceed with caution

            # 2. Heuristic: If power is very low (noise), return offline
            main_power = latest_reading.get('Power', 0.0)
            if main_power < 1.0:
                print(f"[MLService] Total power {main_power}W is below threshold. Marking all offline.")
                self.set_all_offline()
                return [[0, 0, 0]]

            # 3. Calculate 7 Features for XGBoost: ['Irms', 'Power', 'Vrms', 'kWh', 'DeltaP', 'VarP', 'PF']
            # We take the features from the latest reading, and calculate DeltaP using the previous one.
            curr = latest_reading
            prev = readings[-2] if len(readings) > 1 else curr

            irms = curr['Irms']
            power = curr['Power']
            vrms = curr['Vrms']
            kwh = curr['kWh']
            delta_p = power - prev['Power']
            
            va = vrms * irms
            var_p = np.sqrt(max(0, (va**2) - (power**2)))
            pf = power / va if va > 0 else 1.0

            # XGBoost expects 2D array [irms, power, vrms, kwh, delta_p, var_p, pf]
            features = [irms, power, vrms, kwh, delta_p, var_p, pf]
            data = np.array(features).reshape(1, -1)
            
            prediction = self.xgboost_model.predict(data)
            
            # Log identified devices to terminal
            if len(prediction) > 0:
                bits = prediction[0] if prediction.ndim > 1 else prediction
                labels = ['12W Bulb', '15W Bulb', '7W Bulb']
                firestore_labels = ['Bulb 12W', 'Bulb 15W', 'Bulb 7W']
                print("\n" + "="*20 + " XGBOOST IDENTIFICATION " + "="*20)
                print(f"Features used: {features}")
                
                from services.firebase_service import add_alert, update_device_status, update_firestore_device_status
                import uuid

                for i, label in enumerate(labels):
                    state = int(bits[i])
                    status = "ON" if state else "OFF"
                    status_str = "online" if state else "offline"
                    print(f"{label}: {status}")
                    
                    update_device_status(str(i), {"name": label, "status": status, "is_active": bool(state)})
                    update_firestore_device_status(firestore_labels[i], status_str)

                    if self._check_fluctuation(i, state):
                        if i not in self.alerted_bulbs:
                            print(f"!!! FLUCTUATION DETECTED for {label} !!!")
                            alert_data = {
                                "id": str(uuid.uuid4()),
                                "title": "Device Fluctuation Detected",
                                "message": f"Technical fault: {label} is fluctuating repeatedly.",
                                "severity": "high",
                                "timestamp": datetime.now().isoformat(),
                                "is_read": False
                            }
                            add_alert(alert_data)
                            self.alerted_bulbs.add(i)
                print("="*64 + "\n")

            return prediction.tolist()
        except Exception as e:
            print(f"Device identification error: {e}")
            raise e

ml_service_instance = MLService()
