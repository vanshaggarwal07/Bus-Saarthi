import requests

def test_predict_wait():
    url = "http://localhost:8000/predict_wait"
    payload = {
        "busroute": "RouteA",
        "stopid": "Stop1",
        "timeofday": 15,
        "dayofweek": 3,
        "trafficcondition": "Moderate",
        "weathercondition": "Clear"
    }
    response = requests.post(url, json=payload)
    print("Predict Wait Response:", response.status_code, response.json())

def test_predict_path():
    url = "http://localhost:8000/predict_path"
    payload = {
        "sequence": [
            [30.7, 76.7, 50, 90],
            [30.71, 76.71, 52, 92],
            [30.72, 76.72, 48, 88],
            [30.73, 76.73, 49, 89],
            [30.74, 76.74, 51, 91],
            [30.75, 76.75, 50, 90],
            [30.76, 76.76, 49, 87],
            [30.77, 76.77, 50, 88],
            [30.78, 76.78, 48, 86],
            [30.79, 76.79, 47, 85]
        ]
    }
    response = requests.post(url, json=payload)
    print("Predict Path Response:", response.status_code, response.json())

if __name__ == "__main__":
    test_predict_wait()
    test_predict_path()