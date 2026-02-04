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
        self.bilstm_model = None
        self.xgboost_model = None
        self.bilstm_scaler = None
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
                data_3d = data.reshape(1, 1, -1)
                prediction = self.bilstm_model.predict(data_3d)
            except:
                 # Fallback to 2D if model is not sequence-based or different shape
                prediction = self.bilstm_model.predict(data)
                
            return float(prediction[0][0]) if prediction.ndim > 1 else float(prediction[0])
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
            # convert numpy type to python native
            return prediction.tolist()
        except Exception as e:
            print(f"Device identification error: {e}")
            raise e

ml_service_instance = MLService()
