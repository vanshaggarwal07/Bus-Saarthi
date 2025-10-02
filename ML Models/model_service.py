from flask import Flask, request, jsonify
import joblib
import numpy as np
import tensorflow as tf
import os
import pandas as pd

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

wait_model = joblib.load(os.path.join(BASE_DIR, "waiting_time_model.pkl"))

path_scaler = joblib.load(os.path.join(BASE_DIR, "path_scaler.pkl"))
path_model = tf.keras.models.load_model(os.path.join(BASE_DIR, "path_prediction_model.keras"))

@app.route('/predict_wait', methods=['POST'])
def predict_wait():
    data = request.json
    input_data = pd.DataFrame(
        [[data['busroute'], data['stopid'], data['timeofday'], data['dayofweek'], data['trafficcondition'], data['weathercondition']]],
        columns=['bus_route', 'stop_id', 'time_of_day', 'day_of_week', 'traffic_condition', 'weather_condition']
    )
    prediction = wait_model.predict(input_data)  # raw input DataFrame directly passed to pipeline model
    return jsonify({'wait_time': float(prediction[0])})

@app.route('/predict_path', methods=['POST'])
def predict_path():
    data = request.json
    seq_arr = np.array(data['sequence'])
    scaled_seq = path_scaler.transform(seq_arr)
    pred_scaled = path_model.predict(scaled_seq.reshape(1, 10, 4))
    pred = path_scaler.inverse_transform(pred_scaled.reshape(5, 4))
    return jsonify({'path': pred.tolist()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)