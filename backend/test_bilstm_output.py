import tensorflow as tf
import numpy as np
import joblib
import os

MODELS_DIR = "models"
BILSTM_MODEL_PATH = os.path.join(MODELS_DIR, "bilstm_bulb_forecasting.h5")
BILSTM_SCALER_PATH = os.path.join(MODELS_DIR, "bilstm_scaler.pkl")

def debug_prediction():
    try:
        print("Loading model and scaler...")
        model = tf.keras.models.load_model(
            BILSTM_MODEL_PATH,
            custom_objects={'mse': tf.keras.losses.MeanSquaredError()}
        )
        scaler = joblib.load(BILSTM_SCALER_PATH)
        
        # Test features
        features = [200.0, 230.0, 0.87, 0.95, 12, 1] # Typical values
        data = np.array(features).reshape(1, -1)
        data_scaled = scaler.transform(data)
        
        # Repeat for 20 timesteps
        data_3d = np.repeat(data_scaled[:, np.newaxis, :], 20, axis=1)
        
        print("\n--- Raw Input ---")
        print(data)
        print("\n--- Scaled Input ---")
        print(data_scaled)
        
        print("\n--- Predicting ---")
        prediction = model.predict(data_3d)
        
        print("\n--- Raw Prediction ---")
        print(prediction)
        print(f"Prediction shape: {prediction.shape}")
        
        # Check if inverse transform is possible
        # If the model predicts the same 6 features, we can inverse transform it
        if prediction.shape[1] == 6:
            try:
                inv_prediction = scaler.inverse_transform(prediction)
                print("\n--- Inverse Transformed Prediction ---")
                print(inv_prediction)
            except Exception as e:
                print(f"\nInverse transform failed: {e}")
                
    except Exception as e:
        print(f"Debug failed: {e}")

if __name__ == "__main__":
    debug_prediction()
