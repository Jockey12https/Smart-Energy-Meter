from services.ml_service import ml_service_instance
import numpy as np

def test_threshold():
    print("--- Power Threshold Verification ---")
    
    # 1. Test with low power noise (the user's values)
    low_power = [0.18, 0.18, 0.13, 0.13, 0.23, 0.15, 0.08]
    print(f"\nTesting with low power readings: {low_power}")
    result_low = ml_service_instance.identify_device(low_power)
    print(f"Result for low power: {result_low}")
    
    # 2. Test with high power (simulated bulb on)
    # A 12W bulb should show ~12W in Power
    high_power = [12.0, 12.1, 11.9, 12.0, 12.2, 11.8, 12.0]
    print(f"\nTesting with high power readings: {high_power}")
    result_high = ml_service_instance.identify_device(high_power)
    print(f"Result for high power: {result_high}")
    
    # Validation
    if result_low == [[0, 0, 0]]:
        print("\nSUCCESS: Low power correctly filtered to offline.")
    else:
        print("\nFAILURE: Low power NOT filtered.")
        
    if result_high != [[0, 0, 0]]:
        print("SUCCESS: High power correctly identified (not filtered).")
    else:
        print("FAILURE: High power was incorrectly filtered.")

if __name__ == "__main__":
    test_threshold()
