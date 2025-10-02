from flask import Flask, request, jsonify
import numpy as np
import tensorflow as tf
from datetime import datetime
import joblib

scaler = joblib.load('scaler.save')
model = tf.keras.models.load_model('bus_location_predictor.h5', compile=False)

app = Flask(__name__)

bus_data_store = {}

sequence_length = 3
num_features = 4  # latitude, longitude, speed, heading


@app.route('/')
def home():
    return "Bus Location Predictor API is running!"


@app.route('/gps', methods=['POST'])
def receive_gps():
    try:
        data = request.get_json()
        bus_id = data['bus_id']
        timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))

        features = np.array([
            data['latitude'],
            data['longitude'],
            data['speed'],
            data['heading']
        ]).reshape(1, -1)

        features_norm = scaler.transform(features)

        if bus_id not in bus_data_store:
            bus_data_store[bus_id] = []
        bus_data_store[bus_id].append((timestamp, features_norm.flatten()))

        if len(bus_data_store[bus_id]) > sequence_length:
            bus_data_store[bus_id] = bus_data_store[bus_id][-sequence_length:]

        return jsonify({"status": "received", "bus_id": bus_id, "timestamp": data["timestamp"]})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/predict/<bus_id>', methods=['GET'])
def predict_path(bus_id):
    try:
        if bus_id not in bus_data_store or len(bus_data_store[bus_id]) < sequence_length:
            return jsonify({"error": "Not enough data"}), 400

        sequence = np.array([x[1] for x in bus_data_store[bus_id]])
        sequence = sequence.reshape(1, sequence_length, num_features)

        predicted_points = []   # keep as a list
        current_seq = sequence.copy()

        # Predict next 5 points
        for _ in range(5):
            pred = model.predict(current_seq)[0]
            predicted_points.append(pred)

            last_speed_heading = current_seq[0, -1, 2:]
            new_point = np.concatenate([pred, last_speed_heading])
            current_seq = np.concatenate(
                [current_seq[:, 1:, :], new_point.reshape(1, 1, num_features)],
                axis=1
            )

        # Convert to array after loop
        predicted_points = np.array(predicted_points)

        # Add dummy speed & heading so scaler works
        dummy_speed_heading = np.zeros((predicted_points.shape[0], 2))
        predicted_full = np.concatenate([predicted_points, dummy_speed_heading], axis=1)

        # Inverse transform
        predicted_full = scaler.inverse_transform(predicted_full)

        # Only return lat/lon
        response = [
            {"latitude": float(lat), "longitude": float(lon)}
            for lat, lon in predicted_full[:, :2]
        ]

        return jsonify(response)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
