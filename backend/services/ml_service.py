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
        
        # HuggingFace Chatbot pipeline
        self.chat_pipeline = None
        
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

        try:
            from transformers import pipeline
            import torch
            print("Loading Hugging Face Chatbot model (TinyLlama)...")
            # Using TinyLlama instead of meta-llama to avoid massive downloads and auth issues
            model_id = "TinyLlama/TinyLlama-1.1B-Chat-v1.0" 
            
            # Since loading Llama takes a long time and a lot of memory, we wrap it in a try-except
            # but usually it's better to load it lazily or separately if it's too big.
            self.chat_pipeline = pipeline(
                "text-generation",
                model=model_id,
                device_map="auto",
                torch_dtype=torch.float16,
            )
            print("Hugging Face Chatbot model loaded.")
        except Exception as e:
            print(f"Error loading Hugging Face Chatbot model: {e}")
            print("Chatbot will fallback to simple responses if model unavailable.")

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

    def get_billing_summary(self, user_id: str):
        """
        Calculate billing summary: current cost, target, and predicted cost in RS (₹).
        Rate: ₹7.00/kWh
        """
        from services.firebase_service import get_recent_readings
        from datetime import datetime
        
        try:
            # 1. Fetch recent readings
            readings = get_recent_readings(user_id, limit=50) # Fetch more for better prediction
            
            if not readings:
                return {
                    "current_cost": 0.0,
                    "monthly_target": 500.0, # Default target ₹500
                    "predicted_cost": 0.0,
                    "currency": "RS",
                    "unit": "kWh"
                }

            # 2. Current Cost
            # Assuming kWh is cumulative for the month or we take the latest
            latest_kwh = readings[-1].get('kWh', 0.0)
            rate = 7.00
            current_cost = latest_kwh * rate

            # 3. Predict Future Usage using BiLSTM
            # User says: BiLSTM predicts value for next day (Daily kWh)
            # Extrapolate for 30 days: (Daily kWh * 7) * 30
            predicted_daily_kwh = 0.0
            try:
                curr = readings[-1]
                # Features: [Power, Vrms, Irms, kWh, 0, 0] -> 6 features
                input_features = [
                    curr.get('Power', 0.0), 
                    curr.get('Vrms', 0.0), 
                    curr.get('Irms', 0.0), 
                    curr.get('kWh', 0.0),
                    0.0, 0.0
                ]
                predicted_daily_kwh = self.predict_energy(input_features)
            except Exception as e:
                print(f"Prediction for billing failed: {e}")
                # Fallback: simple average if possible
                if len(readings) > 1:
                    first_kwh = readings[0].get('kWh', 0.0)
                    days_elapsed = 1 # Simplified for fallback
                    predicted_daily_kwh = (latest_kwh - first_kwh) / max(1, days_elapsed)

            predicted_monthly_cost = predicted_daily_kwh * rate * 30

            # 4. Backtrack to Current Cost for Viability
            # Calculation: (Current Cost / Days Passed) * 30 vs Predicted
            now = datetime.now()
            days_passed = now.day
            if days_passed == 0: days_passed = 1
            
            actual_trajectory_cost = (current_cost / days_passed) * 30
            
            # Viability check: If the BiLSTM prediction is wildly different from actual trajectory, 
            # we can average them or return a "confidence" metric.
            # For "backtracking", we'll use a weighted average: 40% actual trajectory, 60% BiLSTM
            viable_predicted_cost = (actual_trajectory_cost * 0.4) + (predicted_monthly_cost * 0.6)
            
            # 5. Monthly Target
            # Based on previous cost used (actual trajectory)
            monthly_target = actual_trajectory_cost * 1.1 # 10% buffer above current trajectory

            return {
                "current_cost": round(current_cost, 2),
                "monthly_target": round(monthly_target, 2),
                "predicted_cost": round(viable_predicted_cost, 2),
                "currency": "RS",
                "unit": "kWh",
                "latest_kwh": latest_kwh,
                "viability_score": round(min(100, (1 - abs(viable_predicted_cost - actual_trajectory_cost)/max(1, actual_trajectory_cost)) * 100), 2)
            }
        except Exception as e:
            print(f"Error in get_billing_summary: {e}")
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

    def process_chat_query(self, message: str, history: List[dict], user_id: str):
        """
        Processes a chat message using the HuggingFace LLM and Firebase data if needed.
        """
        from services.firebase_service import get_recent_readings
        
        # 1. Very basic intent detection (can be improved by asking the LLM first)
        message_lower = message.lower()
        energy_keywords = ["energy", "power", "consumption", "usage", "cost", "bill", "electricity", "kwh", "yesterday", "today", "tips"]
        
        is_energy_query = any(keyword in message_lower for keyword in energy_keywords)
        
        system_context = ""
        latest_power = 0.0
        latest_kwh = 0.0
        
        if is_energy_query:
            # 2. Fetch data from Firebase
            readings = get_recent_readings(user_id, limit=50) # Fetch recent readings
            
            if not readings:
                system_context = "System Note: The user has asked about energy data, but no data could be found in the Firebase database for this user."
            else:
                # 3. Analyze data
                latest_reading = readings[-1]
                latest_power = latest_reading.get('Power', 0.0)
                latest_kwh = latest_reading.get('kWh', 0.0)
                
                # Simple analysis for context
                total_power = sum(r.get('Power', 0.0) for r in readings)
                avg_power = total_power / len(readings) if readings else 0
                max_power = max(r.get('Power', 0.0) for r in readings) if readings else 0
                
                system_context = f"""[System Context: Energy Data from Firebase]
Current Power Consumption: {latest_power:.2f} W
Total Energy Used (kWh): {latest_kwh:.2f} kWh
Average Power (Recent): {avg_power:.2f} W
Peak Power (Recent): {max_power:.2f} W
Current Electricity Rate: ₹7.00/kWh (Estimated cost: ₹{latest_kwh * 7.00:.2f})

You are a Smart Energy Assistant integrated with a Firebase database containing smart meter energy data and powered by a local Hugging Face language model for natural language understanding and generation.

Your responsibilities:
1. Smart Meter Data Queries
You must:
- Use the Hugging Face NLP/LLM model to interpret the user query and extract intent and parameters.
- Retrieve the relevant smart meter data from Firebase.
- Process and analyze the retrieved data to compute total consumption, average usage, peak usage periods, cost estimates, trends or anomalies.
- Generate a clear, structured response using the Hugging Face LLM, including key insights, calculated values, brief explanation of trends, and practical recommendations for reducing consumption.
- Never fabricate or guess energy data. Only respond using actual values retrieved from Firebase.
- If the query requires parameters that are missing, ask the user for clarification before retrieving data.

5. Response Style
Always provide answers that are accurate, concise, clearly structured, and easy for a non-technical user to understand.
When presenting analytics, prefer structured formats such as bullet points, tables, summary insights, and actionable recommendations.
"""
        else:
            system_context = """[System Context]
You are a Smart Energy Assistant. The user is asking a general question unrelated to smart meter data.
Respond normally using your general knowledge without accessing Firebase. Be helpful, concise, and friendly.
"""

        # 4. Construct Prompt
        # Format for Llama chat models
        prompt = ""
        # Add system context as the first system message if history doesn't have it
        prompt += f"<<SYS>>\n{system_context}\n<</SYS>>\n\n"
        
        # Add a few history items (limit to keep prompt small)
        for h in history[-3:]:
            if h.get('role') == 'user':
                prompt += f"[INST] {h.get('content', '')} [/INST] "
            else:
                prompt += f"{h.get('content', '')} "
                
        # Add current message
        prompt += f"[INST] {message} [/INST]"

        # 5. Generate Response using Hugging Face Pipeline
        try:
            if self.chat_pipeline:
                outputs = self.chat_pipeline(
                    prompt, 
                    max_new_tokens=250, 
                    temperature=0.7, 
                    do_sample=True,
                    top_k=50,
                    top_p=0.9
                )
                
                # Extract the newly generated text (varies slightly by model/pipeline)
                generated_text = outputs[0]['generated_text']
                
                # Naive extraction of the response part after the last [/INST]
                response_part = generated_text.split('[/INST]')[-1].strip()
                return response_part
            else:
                # Fallback if model didn't load (e.g., due to memory constraints)
                if is_energy_query:
                    if latest_kwh == 0 and latest_power == 0:
                        return "I can see you are asking about energy, but no data could be found for you in the database!"
                    else:
                        return f"I can see you are asking about energy! Currently, my advanced AI model is initializing, but based on your recent data: your current power is {latest_power:.2f}W and total usage is {latest_kwh:.2f}kWh."
                else:
                    return "My advanced AI is currently initializing. How else can I help you today?"
                    
        except Exception as e:
            print(f"Error generating chat response: {e}")
            return "I apologize, but I encountered an error while processing your request. Please try again later."

ml_service_instance = MLService()
