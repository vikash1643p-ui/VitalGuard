import requests

# Flask Server Endpoint
URL = "http://127.0.0.1:5000/check_temp"

# TEST CASE 1: Normal Patient Temperature (No Attack)
normal_payload = {
    "temp": 36.8,
    "temp_diff": 0.1   # Very small change
}

# TEST CASE 2: Hacker Tampered Data (MitM Attack)
tampered_payload = {
    "temp": 42.0,
    "temp_diff": 3.5   # Impossible sudden jump!
}

print("--- TESTING TEST CASE 1 (NORMAL DATA) ---")
res1 = requests.post(URL, json=normal_payload)
print("Response:", res1.json())

print("\n--- TESTING TEST CASE 2 (TAMPERED HACKED DATA) ---")
res2 = requests.post(URL, json=tampered_payload)
print("Response:", res2.json())