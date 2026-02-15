import tensorflow as tf
import numpy as np
import joblib
import os

MODELS_DIR = "models"
BILSTM_MODEL_PATH = os.path.join(MODELS_DIR, "bilstm_bulb_forecasting.h5")
BILSTM_SCALER_PATH = os.path.join(MODELS_DIR, "bilstm_scaler.pkl")

def test_shape():
    try:
        print("Loading model and scaler...")
        model = tf.keras.models.load_model(
            BILSTM_MODEL_PATH,
            custom_objects={'mse': tf.keras.losses.MeanSquaredError()}
        )
        scaler = joblib.load(BILSTM_SCALER_PATH)
        
        features = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
        data = np.array(features).reshape(1, -1)
        data_scaled = scaler.transform(data)
        
        print(f"Scaled data shape: {data_scaled.shape}")
        
        # Try (1, 1, 6)
        print("Testing (1, 1, 6)...")
        try:
            p1 = model.predict(data_scaled.reshape(1, 1, -1))
            print("Success with (1, 1, 6)")
        except Exception as e:
            print(f"Failed with (1, 1, 6): {e}")
            
        # Try (1, 20, 6)
        print("\nTesting (1, 20, 6)...")
        try:
            data_20 = np.repeat(data_scaled[:, np.newaxis, :], 20, axis=1)
            p2 = model.predict(data_20)
            print(f"Success with (1, 20, 6), prediction shape: {p2.shape}")
        except Exception as e:
            print(f"Failed with (1, 20, 6): {e}")
            
    except Exception as e:
        print(f"Setup failed: {e}")

if __name__ == "__main__":
    test_shape()
