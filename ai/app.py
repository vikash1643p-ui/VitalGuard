from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)

# Step 2-la create panna AI Model-a Load panrom
try:
    ai_model = joblib.load('my_temp_ai_model.pkl')
    print("SUCCESS: AI Model 'my_temp_ai_model.pkl' loaded successfully!")
except Exception as e:
    print("ERROR: Model file kedaikkala! train_ai.py check pannunga.")

# Basic Health Check Route
@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "Server Running", "service": "Bio-Firewall AI API"})

# Temperature Verification Endpoint
@app.route('/check_temp', methods=['POST'])
def check_temperature():
    try:
        data = request.json
        
        current_temp = float(data['temp'])
        temp_diff = float(data['temp_diff'])
        
        # AI Prediction: 0 = Normal Data, 1 = Hacker Tampered
        prediction = ai_model.predict([[current_temp, temp_diff]])[0]
        
        if prediction == 1:
            return jsonify({
                "status": "ALERT",
                "result": "TAMPERED",
                "message": "MitM Attack Detected! Biological Anomaly found.",
                "data_valid": False
            }), 200
        else:
            return jsonify({
                "status": "SUCCESS",
                "result": "NORMAL",
                "message": "Data Verified by Thermal AI.",
                "data_valid": True
            }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    # host='0.0.0.0' pottadhaande local Wi-Fi-la irukka ESP32 connect aagum
    app.run(host='0.0.0.0', port=5001, debug=True)