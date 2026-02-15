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

class MLService:
    def __init__(self):
        self.bilstm_scaler = None
        self.bulb_history = {0: [], 1: [], 2: []} # Track last 10 states for each bulb
        self.alerted_bulbs = set() # Track bulbs already alerted for fluctuation
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

    def identify_device(self, power_readings: List[float]):
        """
        Identify device using XGBoost model.
        """
        if not self.xgboost_model:
            raise ValueError("XGBoost model is not loaded.")
        
        try:
            # XGBoost expects 2D array
            # Assuming power_readings is a list of features for one sample
            data = np.array(power_readings).reshape(1, -1)
            
            # If there is a scaler, we should use it. 
            # Assuming raw data for now or pre-scaled.
            
            prediction = self.xgboost_model.predict(data)
            
            # Log identified devices to terminal
            if len(prediction) > 0:
                # Handle both 2D (batch) and 1D outputs
                bits = prediction[0] if prediction.ndim > 1 else prediction
                labels = ['12W Bulb', '15W Bulb', '7W Bulb']
                print("\n" + "="*20 + " XGBOOST IDENTIFICATION " + "="*20)
                
                from services.firebase_service import add_alert
                import uuid
                from datetime import datetime

                for i, label in enumerate(labels):
                    state = int(bits[i])
                    status = "ON" if state else "OFF"
                    print(f"{label}: {status}")
                    
                    # Check for fluctuation
                    if self._check_fluctuation(i, state):
                        if i not in self.alerted_bulbs:
                            print(f"!!! FLUCTUATION DETECTED for {label} !!!")
                            alert_data = {
                                "id": str(uuid.uuid4()),
                                "title": "Device Fluctuation Detected",
                                "message": f"Technical fault: {label} is fluctuating repeatedly (Potential Fault).",
                                "severity": "high",
                                "timestamp": datetime.now().isoformat(),
                                "is_read": False
                            }
                            add_alert(alert_data)
                            self.alerted_bulbs.add(i) # Mark as alerted
                        else:
                            print(f"Fluctuation continued for {label}, but alert already sent.")
                print("="*64 + "\n")

            # convert numpy type to python native
            return prediction.tolist()
        except Exception as e:
            print(f"Device identification error: {e}")
            raise e

ml_service_instance = MLService()
