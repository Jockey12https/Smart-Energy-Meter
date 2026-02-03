import numpy as np
import flask
import io
import pandas as pd
import pickle
import collections as cl

app = flask.Flask(__name__)
model = None
count = 0
appr = cl.defaultdict(float)

@app.route("/predict", methods=["POST"])
def predict():
    global count
    global appr
    alert_threshold = 0.005
    data = {"success": False}
    
    if flask.request.method == "POST":
        content = flask.request.json
        val = content['kWh']
        
        if pd.isna(val):
            print('Missing value')
            data = {"success": True, "label": "non-anomalous"}
        else:
            count += 1
            if val in appr:
                appr[val] += 1
            else:
                appr[val] = 1
            
            freq = appr[val]/count
            if freq < alert_threshold:
                print(f'Anomalous value detected: {val}, freq: {freq}')
                data = {
                    "prob": 0.9,  
                    "label": "anomaly",
                    "severity": "HIGH",
                    "success": True
                }
            else:
                data = {
                    "prob": 1.0,  
                    "label": "non-anomalous",
                    "severity": "NONE",
                    "success": True
                }

    return flask.jsonify(data)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
