# CYBER BIOWALL — ASTRA COMPLETE BUILD

Professional full-stack demo for the Cyber-BioWall healthcare IoT security project.

## Included
- Premium animated boot/splash screen before login
- Original-style dark clinical security login
- Flask authentication with SQLite database
- Patient, device, telemetry and incident tables
- Multi-page hospital/security console
- Moving live-looking temperature waveform
- Normal / Physiological Change / Cyber-Tampered demo states
- MITM demo creates a persistent incident in SQLite
- Alarm sound + browser voice: “Unauthorized activity detected”
- SHA-256 integrity verification endpoint
- AI integration endpoint: `/api/ai/classify`
- ESP32/Thonny MicroPython telemetry client
- Real ESP32 status is derived from recent backend telemetry

## Run backend
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py app.py
```

## Run frontend
Open a second terminal:
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
Then open http://localhost:5173

## Login
Username: `admin`
Password: `admin123`

## ESP32 tomorrow
Edit `esp32/main.py` with your Wi-Fi and laptop IP, then run it in Thonny. The dashboard will only show a real connected state after telemetry reaches Flask. The MAX30102/AI-specific sensor code can be linked later without changing the UI/database architecture.

## Note
The local hardware adapter currently uses HTTP POST for the easiest LAN demonstration. The expected architecture remains MAX30102 → ESP32 → secure transport → Bio-Firewall AI → SHA-256 → Flask/SQLite → dashboard.
