# Cyber-BioWall ESP32 telemetry sender
# Intended for MicroPython + Thonny.
# Connect MAX30102 according to your board/sensor wiring.
# This demo-ready skeleton sends JSON telemetry to the Flask backend.

import time
import json
import network
import urequests

WIFI_SSID = "YOUR_WIFI_NAME"
WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"
BACKEND_URL = "http://YOUR_PC_IP:5000/api/telemetry"

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    while not wlan.isconnected():
        time.sleep(0.5)
    print("WiFi connected:", wlan.ifconfig())

def read_vitals():
    # Replace these demo values with MAX30102 sensor reads.
    return {
        "heart_rate": 76,
        "spo2": 97,
        "temperature": 36.7
    }

connect_wifi()

while True:
    data = read_vitals()
    try:
        response = urequests.post(
            BACKEND_URL,
            headers={"Content-Type": "application/json"},
            data=json.dumps(data)
        )
        print("Backend:", response.text)
        response.close()
    except Exception as e:
        print("Telemetry error:", e)
    time.sleep(1)