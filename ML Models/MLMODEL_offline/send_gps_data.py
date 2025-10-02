import json
import requests
import time

# Load your JSON file
with open('bus_gps_data.json', 'r') as f:
    buses = json.load(f)

for bus in buses:
    bus_id = bus['bus_id']
    for entry in bus['data']:
        payload = {
            "bus_id": bus_id,
            "timestamp": entry["timestamp"],
            "latitude": entry["latitude"],
            "longitude": entry["longitude"],
            "speed": entry["speed"],
            "heading": entry["heading"]
        }

        response = requests.post("http://127.0.0.1:5000/gps", json=payload)
        print(f"Sent GPS data for {bus_id} at {entry['timestamp']}, response: {response.status_code}")
        
        # optional: sleep to simulate real-time
        time.sleep(0.2)
