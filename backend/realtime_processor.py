import firebase_admin
from firebase_admin import db
import os
import time
import threading
from dotenv import load_dotenv
from services.firebase_service import get_recent_readings
from services.ml_service import ml_service_instance

load_dotenv()

class RealtimeProcessor:
    def __init__(self, user_id: str, threshold: int = 20):
        self.user_id = user_id
        self.data_path = f'/SmartMeter/users/{user_id}/data'
        self.is_running = False
        self._listener = None
        self.threshold = threshold
        self.last_reading_time = 0
        self.heartbeat_thread = None
        self.all_offline_triggered = False

    def _on_data_change(self, event):
        """
        Callback triggered when data at the listener path changes.
        """
        if event.data is None:
            return

        self.last_reading_time = time.time()
        self.all_offline_triggered = False # Reset flag since we have data
        print(f"\n[RealtimeProcessor] New data detected for user {self.user_id}")
        
        try:
            # Fetch up to 7 recent readings for DeltaP and feature calculation
            readings = get_recent_readings(self.user_id, limit=7)
            
            if len(readings) >= 1:
                print(f"[RealtimeProcessor] Triggering identification with {len(readings)} readings.")
                ml_service_instance.identify_device(readings)
            else:
                print(f"[RealtimeProcessor] No readings found in RTDB.")
                
        except Exception as e:
            print(f"[RealtimeProcessor] Error processing change: {e}")

    def _heartbeat_loop(self):
        """
        Background loop to check for data freshness.
        """
        while self.is_running:
            if self.last_reading_time > 0:
                elapsed = time.time() - self.last_reading_time
                if elapsed > self.threshold and not self.all_offline_triggered:
                    print(f"[RealtimeProcessor] HEARTBEAT ALERT: No data for {int(elapsed)}s!")
                    ml_service_instance.set_all_offline()
                    self.all_offline_triggered = True
            
            time.sleep(10) # Check every 10 seconds

    def start(self):
        """
        Start listening to the RTDB path and start the heartbeat monitor.
        """
        if self.is_running:
            return
            
        print(f"Starting RealtimeProcessor for user: {self.user_id} (threshold: {self.threshold}s)")
        print(f"Listening on path: {self.data_path}")
        
        self.is_running = True
        self.last_reading_time = time.time() # Start the clock
        
        # Start the listener
        self._listener = db.reference(self.data_path).listen(self._on_data_change)
        
        # Start the heartbeat thread
        self.heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self.heartbeat_thread.start()

    def stop(self):
        """
        Stop listening and heartbeat monitor.
        """
        self.is_running = False
        if self._listener:
            self._listener.close()
        print("RealtimeProcessor stopped.")

if __name__ == "__main__":
    # Test with the known user ID from our research
    USER_ID = "v7LHzYJqMEdn3opIub1cWFZTBcf2"
    processor = RealtimeProcessor(USER_ID)
    try:
        processor.start()
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        processor.stop()
