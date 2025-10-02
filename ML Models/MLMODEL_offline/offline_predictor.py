import json
import numpy as np
import joblib
import math
import sys
from datetime import datetime, timedelta
import tensorflow as tf
from pathlib import Path

# ------------ CONFIG -------------
MODEL_FILE = "bus_location_predictor.h5"
SCALER_FILE = "scaler.save"
GPS_DATA_FILE = "bus_gps_data.json"

SEQUENCE_LENGTH = 3       # must match train-time
NUM_FEATURES = 4          # latitude, longitude, speed, heading
PREDICT_STEPS = 5         # how many future points to predict
# ---------------------------------

def haversine(lat1, lon1, lat2, lon2):
    # distance in meters
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2.0)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2.0)**2
    return 2*R*math.asin(math.sqrt(a))

def load_files(model_file=MODEL_FILE, scaler_file=SCALER_FILE):
    if not Path(model_file).exists():
        raise FileNotFoundError(f"model file not found: {model_file}")
    if not Path(scaler_file).exists():
        raise FileNotFoundError(f"scaler file not found: {scaler_file}")

    print("Loading model and scaler...")
    model = tf.keras.models.load_model(model_file, compile=False)
    scaler = joblib.load(scaler_file)
    print("Loaded model:", model_file, "and scaler:", scaler_file)
    return model, scaler

def read_gps_json(path=GPS_DATA_FILE):
    if not Path(path).exists():
        raise FileNotFoundError(f"gps data file not found: {path}")
    with open(path, "r") as f:
        data = json.load(f)
    return data

def build_last_sequence(bus_entries, scaler):
    if len(bus_entries) < SEQUENCE_LENGTH:
        return None

    last = bus_entries[-SEQUENCE_LENGTH:]
    X = np.array([[ e['latitude'], e['longitude'], e['speed'], e['heading'] ] for e in last], dtype=float)
    X_reshaped = X.copy()
    try:
        X_scaled = scaler.transform(X_reshaped)
    except Exception as e:
        raise RuntimeError("Scaler transform failed: " + str(e))
    return X_scaled.reshape(1, SEQUENCE_LENGTH, NUM_FEATURES)

def predict_future(model, scaler, init_sequence, predict_steps=PREDICT_STEPS):
    seq = init_sequence.copy()
    preds = []
    for _ in range(predict_steps):
        p = model.predict(seq, verbose=0)[0]   
        p = np.array(p)
        if p.size == NUM_FEATURES:
            pred_latlon = p[:2]
            last_speed_heading = seq[0, -1, 2:]
            new_point = np.concatenate([pred_latlon, last_speed_heading])
        elif p.size == 2:
            pred_latlon = p
            last_speed_heading = seq[0, -1, 2:]
            new_point = np.concatenate([pred_latlon, last_speed_heading])
        else:
            pred_latlon = p[:2]
            last_speed_heading = seq[0, -1, 2:]
            new_point = np.concatenate([pred_latlon, last_speed_heading])

        preds.append(pred_latlon)
        new_point = new_point.reshape(1,1,NUM_FEATURES)
        seq = np.concatenate([seq[:, 1:, :], new_point], axis=1)
    return np.array(preds)   # shape (predict_steps, 2)

def inverse_scale_predictions(preds_scaled, scaler):
  
    dummy = np.zeros((preds_scaled.shape[0], NUM_FEATURES - preds_scaled.shape[1]))
    full = np.concatenate([preds_scaled, dummy], axis=1)  # shape (N,4)
    full_inv = scaler.inverse_transform(full)
    return full_inv[:, :2]

def estimate_eta_and_delay(latlon_sequence_orig, timestamps, predicted_latlon_orig):
    
    results = []
    try:
        if len(timestamps) >= 2:
            t1 = timestamps[-2]
            t2 = timestamps[-1]
            dt = (t2 - t1).total_seconds()
            if dt <= 0:
                avg_speed = None
            else:
                lat1, lon1 = latlon_sequence_orig[-2]
                lat2, lon2 = latlon_sequence_orig[-1]
                dist = haversine(lat1, lon1, lat2, lon2)
                avg_speed = dist / dt  # m/s
        else:
            avg_speed = None
    except Exception:
        avg_speed = None

    # fallback avg_speed: compute mean speed field if available in sequence (last entries)
    # if we have no reliable speed, set a conservative speed 8 m/s (~28.8 km/h)
    if not avg_speed or avg_speed <= 0:
        avg_speed = 8.0

    # baseline: mean historical time per predicted step from sample dataset - approximate using last intervals
    baseline_dt = 0.0
    try:
        # if timestamps length >= SEQUENCE_LENGTH, compute mean dt
        if len(timestamps) >= 2:
            dts = []
            for i in range(1, len(timestamps)):
                dts.append((timestamps[i] - timestamps[i-1]).total_seconds())
            baseline_dt = sum(dts)/len(dts)
        else:
            baseline_dt = 300.0  # default 5 min between points
    except Exception:
        baseline_dt = 300.0

    # now iterate predicted points and estimate time
    last_lat, last_lon = latlon_sequence_orig[-1]
    cumulative_seconds = 0.0
    for i, (plat, plon) in enumerate(predicted_latlon_orig, start=1):
        dist = haversine(last_lat, last_lon, plat, plon)  # meters from last known to predicted step
        # assume movement is incremental: use avg_speed to convert to seconds
        step_seconds = dist / avg_speed if avg_speed > 0 else baseline_dt
        cumulative_seconds += step_seconds
        # delay estimate: compare cumulative_seconds to baseline (baseline_dt*i)
        baseline_cum = baseline_dt * i
        delay_seconds = cumulative_seconds - baseline_cum
        results.append({
            "step": i,
            "latitude": float(plat),
            "longitude": float(plon),
            "eta_seconds_from_last": int(cumulative_seconds),
            "delay_seconds_vs_baseline": int(delay_seconds)
        })
        last_lat, last_lon = plat, plon

    return results

def parse_iso(ts):
    # handle Z
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))

def main(args):
    model, scaler = load_files()
    gps_data = read_gps_json()

    # Build per-bus chronological lists
    bus_map = {}
    for bus in gps_data:
        bid = bus.get("bus_id")
        entries = sorted(bus.get("data", []), key=lambda x: x.get("timestamp"))
        # convert timestamps to datetime and store as dict with numeric fields
        parsed = []
        for e in entries:
            try:
                ts = parse_iso(e["timestamp"])
            except Exception:
                # if not iso, try float
                ts = datetime.utcfromtimestamp(float(e["timestamp"]))
            parsed.append({
                "timestamp": ts,
                "latitude": float(e["latitude"]),
                "longitude": float(e["longitude"]),
                "speed": float(e.get("speed", 0.0)),
                "heading": float(e.get("heading", 0.0))
            })
        bus_map[bid] = parsed

    # If user passed a bus id in args, restrict to it. Else iterate all buses.
    target_buses = [args[1]] if len(args) > 1 else list(bus_map.keys())

    for bid in target_buses:
        entries = bus_map.get(bid, [])
        print("\n--- Bus:", bid, "entries:", len(entries))
        if len(entries) < SEQUENCE_LENGTH:
            print("Not enough data (need at least", SEQUENCE_LENGTH, "points). Skipping.")
            continue

        # construct sequence
        seq_scaled = build_last_sequence(entries, scaler)
        # predict in scaled space
        preds_scaled = predict_future(model, scaler, seq_scaled, predict_steps=PREDICT_STEPS)

        # inverse scale to real lat/lon
        preds_orig = inverse_scale_predictions(preds_scaled, scaler)

        # Also prepare original recent lat/lon list and timestamps
        recent_latlon = [(e["latitude"], e["longitude"]) for e in entries[-SEQUENCE_LENGTH:]]
        recent_timestamps = [e["timestamp"] for e in entries[-SEQUENCE_LENGTH:]]

        # estimate ETA/delay
        eta_info = estimate_eta_and_delay(recent_latlon, recent_timestamps, preds_orig)

        print("Predicted next", PREDICT_STEPS, "points (lat, lon):")
        for p in preds_orig:
            print("  ", float(p[0]), float(p[1]))
        print("\nETA / delay estimates (per step):")
        for info in eta_info:
            print("  step", info["step"],
                  "lat", info["latitude"],
                  "lon", info["longitude"],
                  "eta_s", info["eta_seconds_from_last"],
                  "delay_s", info["delay_seconds_vs_baseline"])
    print("\nDone.")

if __name__ == "__main__":
    main(sys.argv)