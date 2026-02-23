import sys, os
sys.path.append(r'c:\ML\Smart-Energy-Meter\backend')
from services.firebase_service import get_recent_readings

USER_ID = '5GgRCifbnOZWFEOAf5mtAlviqX63'
readings = get_recent_readings(USER_ID, limit=20)

print(f'Total readings fetched: {len(readings)}')
print()
print('=== ALL 20 READINGS (index 0=oldest, index -1=latest used by detect_anomaly) ===')
for i, r in enumerate(readings):
    label = ''
    if i == len(readings) - 1:
        label = '  <--- curr (readings[-1]) — THIS IS WHAT ANOMALY USES'
    elif i == len(readings) - 2:
        label = '  <--- prev (readings[-2])'
    ts = r['timestamp']
    vrms = r['Vrms']
    power = r['Power']
    irms = r['Irms']
    kwh = r['kWh']
    print(f'[{i:2d}] {ts}  Vrms={vrms:>10.4f}  Power={power:>10.5f}  Irms={irms:>10.5f}  kWh={kwh}{label}')

print()
print('=== ANOMALY FEATURE EXTRACTION (from curr = readings[-1]) ===')
curr = readings[-1]
prev = readings[-2] if len(readings) > 1 else curr
power = curr.get('Power', 0.0)
vrms = curr.get('Vrms', 0.0)
irms = curr.get('Irms', 0.0)

ts_str = curr.get('timestamp', '')
hour = 12
if ts_str and '_' in ts_str:
    try:
        time_part = ts_str.split('_')[1]
        hour = int(time_part.split(':')[0])
    except:
        pass

features = [vrms, irms, power, hour]
print(f'  curr timestamp : {curr["timestamp"]}')
print(f'  vrms           : {vrms}')
print(f'  irms           : {irms}')
print(f'  power          : {power}')
print(f'  hour           : {hour}')
print(f'  features sent  : {features}')
