from flask import Flask, jsonify, request, session
from flask_cors import CORS
import sqlite3
import hashlib
import os
import secrets
import joblib
from datetime import datetime, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "biowall.db")

# AI MODEL
MODEL_PATH = os.path.join(BASE, "..", "ai", "my_temp_ai_model.pkl")

app = Flask(__name__)
app.secret_key = os.environ.get(
    "BIOWALL_SECRET",
    "cyber-biowall-demo-secret"
)

CORS(app, supports_credentials=True)


# --------------------------------------------------
# LOAD AI MODEL
# --------------------------------------------------

AI_MODEL = None

try:
    AI_MODEL = joblib.load(MODEL_PATH)
    print("SUCCESS: AI Model 'my_temp_ai_model.pkl' loaded successfully!")
except Exception as e:
    print("ERROR: AI Model could not be loaded!")
    print("Reason:", e)


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def now():
    return datetime.now(timezone.utc).isoformat()


def con():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


# --------------------------------------------------
# DATABASE
# --------------------------------------------------

def init_db():

    c = con()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        role TEXT
    );

    CREATE TABLE IF NOT EXISTS patients(
        id TEXT PRIMARY KEY,
        name TEXT,
        age INTEGER,
        room TEXT,
        ward TEXT,
        status TEXT
    );

    CREATE TABLE IF NOT EXISTS devices(
        id TEXT PRIMARY KEY,
        name TEXT,
        patient_id TEXT,
        status TEXT,
        last_seen TEXT,
        ip TEXT
    );

    CREATE TABLE IF NOT EXISTS telemetry(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT,
        device_id TEXT,
        temperature REAL,
        heart_rate REAL,
        spo2 REAL,
        classification TEXT,
        confidence REAL,
        integrity TEXT,
        packet_hash TEXT,
        source_ip TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS incidents(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id TEXT UNIQUE,
        severity TEXT,
        title TEXT,
        detail TEXT,
        classification TEXT,
        response TEXT,
        source_ip TEXT,
        device_id TEXT,
        patient_id TEXT,
        created_at TEXT
    );
    """)

    # Default login
    c.execute(
        """
        INSERT OR IGNORE INTO users
        (username, password_hash, role)
        VALUES (?, ?, ?)
        """,
        (
            "admin",
            hashlib.sha256(b"admin123").hexdigest(),
            "Security Operator"
        )
    )

    # Demo patient
    c.execute(
        """
        INSERT OR IGNORE INTO patients
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            "P-001",
            "Aarav Kumar",
            42,
            "ICU-04",
            "Critical Care",
            "Monitoring"
        )
    )

    # Demo ESP32
    c.execute(
        """
        INSERT OR IGNORE INTO devices
        (id, name, patient_id, status)
        VALUES (?, ?, ?, ?)
        """,
        (
            "ESP32-01",
            "Astra bedside node",
            "P-001",
            "offline"
        )
    )

    c.commit()
    c.close()


init_db()


# --------------------------------------------------
# SHA-256
# --------------------------------------------------

def digest(d):

    raw = (
        f"{d.get('patient_id')}|"
        f"{d.get('temperature')}|"
        f"{d.get('heart_rate')}|"
        f"{d.get('spo2')}|"
        f"{d.get('device_id')}|"
        f"{d.get('timestamp')}"
    ).encode()

    return hashlib.sha256(raw).hexdigest()


# --------------------------------------------------
# INCIDENT
# --------------------------------------------------

def incident(
    severity,
    title,
    detail,
    classification,
    response,
    source,
    device="ESP32-01",
    patient="P-001"
):

    c = con()

    c.execute(
        """
        INSERT INTO incidents
        (
            incident_id,
            severity,
            title,
            detail,
            classification,
            response,
            source_ip,
            device_id,
            patient_id,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "INC-" + secrets.token_hex(4).upper(),
            severity,
            title,
            detail,
            classification,
            response,
            source,
            device,
            patient,
            now()
        )
    )

    c.commit()
    c.close()


# --------------------------------------------------
# AI PREDICTION
# --------------------------------------------------

def ai_predict(temp, temp_diff):

    if AI_MODEL is None:
        return {
            "classification": "AI Unavailable",
            "confidence": 0.0,
            "prediction": None
        }

    try:

        # EXACT FEATURES USED DURING TRAINING
        features = [[float(temp), float(temp_diff)]]

        prediction = int(AI_MODEL.predict(features)[0])

        # Probability
        probabilities = AI_MODEL.predict_proba(features)[0]
        confidence = float(max(probabilities))

        if prediction == 1:
            classification = "Cyber-Tampered"
        else:
            classification = "Normal"

        return {
            "classification": classification,
            "confidence": confidence,
            "prediction": prediction
        }

    except Exception as e:

        print("AI prediction error:", e)

        return {
            "classification": "AI Error",
            "confidence": 0.0,
            "prediction": None
        }


# --------------------------------------------------
# HEALTH
# --------------------------------------------------

@app.get("/api/health")
def health():

    return jsonify(
        ok=True,
        service="Cyber-BioWall Flask API",
        database="SQLite",
        ai_model_loaded=AI_MODEL is not None
    )


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@app.post("/api/login")
def login():

    d = request.get_json(silent=True) or {}

    u = str(d.get("username", "")).strip()
    p = str(d.get("password", ""))

    c = con()

    r = c.execute(
        """
        SELECT username, role
        FROM users
        WHERE username=?
        AND password_hash=?
        """,
        (
            u,
            hashlib.sha256(p.encode()).hexdigest()
        )
    ).fetchone()

    c.close()

    if not r:

        return jsonify(
            ok=False,
            message="Invalid operator credentials"
        ), 401

    session["user"] = r["username"]

    return jsonify(
        ok=True,
        user=dict(r)
    )


# --------------------------------------------------
# LOGOUT
# --------------------------------------------------

@app.post("/api/logout")
def logout():

    session.clear()

    return jsonify(ok=True)


# --------------------------------------------------
# PATIENTS
# --------------------------------------------------

@app.get("/api/patients")
def patients():

    c = con()

    r = [
        dict(x)
        for x in c.execute(
            "SELECT * FROM patients"
        ).fetchall()
    ]

    c.close()

    return jsonify(r)


# --------------------------------------------------
# DEVICE
# --------------------------------------------------

@app.get("/api/device")
def device():

    c = con()

    r = c.execute(
        """
        SELECT *
        FROM devices
        WHERE id="ESP32-01"
        """
    ).fetchone()

    c.close()

    d = dict(r)

    connected = False

    if d.get("last_seen"):

        try:

            connected = (
                datetime.now(timezone.utc)
                -
                datetime.fromisoformat(d["last_seen"])
            ).total_seconds() < 12

        except Exception:
            pass

    d["connected"] = connected

    d["status"] = (
        "connected"
        if connected
        else d.get("status", "offline")
    )

    return jsonify(d)


# --------------------------------------------------
# TELEMETRY HISTORY
# --------------------------------------------------

@app.get("/api/telemetry")
def telemetry():

    c = con()

    r = [
        dict(x)
        for x in c.execute(
            """
            SELECT *
            FROM telemetry
            ORDER BY id DESC
            LIMIT 100
            """
        ).fetchall()
    ]

    c.close()

    return jsonify(list(reversed(r)))


# --------------------------------------------------
# INCIDENT HISTORY
# --------------------------------------------------

@app.get("/api/incidents")
def incidents():

    c = con()

    r = [
        dict(x)
        for x in c.execute(
            """
            SELECT *
            FROM incidents
            ORDER BY id DESC
            LIMIT 50
            """
        ).fetchall()
    ]

    c.close()

    return jsonify(r)


# --------------------------------------------------
# RECEIVE TELEMETRY
# ESP32 / EXTERNAL DEVICE
# --------------------------------------------------

@app.post("/api/telemetry")
def receive():

    d = request.get_json(silent=True) or {}

    d["timestamp"] = d.get("timestamp") or now()
    d["patient_id"] = d.get("patient_id", "P-001")
    d["device_id"] = d.get("device_id", "ESP32-01")

    # ----------------------------------------------
    # DATA INTEGRITY
    # ----------------------------------------------

    provided = d.get("packet_hash")

    expected = digest(d)

    integrity = (
        "MATCH"
        if not provided or provided == expected
        else "MISMATCH"
    )

    # ----------------------------------------------
    # VALUES
    # ----------------------------------------------

    temp = float(
        d.get("temperature", 36.7)
    )

    hr = d.get("heart_rate")
    spo2 = d.get("spo2")

    # ----------------------------------------------
    # PREVIOUS TEMPERATURE
    # ----------------------------------------------

    c = con()

    previous = c.execute(
        """
        SELECT temperature
        FROM telemetry
        WHERE patient_id=?
        ORDER BY id DESC
        LIMIT 1
        """,
        (d["patient_id"],)
    ).fetchone()

    c.close()

    if previous and previous["temperature"] is not None:

        temp_diff = abs(
            temp - float(previous["temperature"])
        )

    else:

        temp_diff = 0.0

    # ----------------------------------------------
    # AI
    # ----------------------------------------------

    ai_result = ai_predict(
        temp,
        temp_diff
    )

    ai_classification = ai_result["classification"]
    confidence = ai_result["confidence"]

    # ----------------------------------------------
    # FINAL CLASSIFICATION
    # ----------------------------------------------

    if integrity == "MISMATCH":

        classification = "Cyber-Tampered"
        confidence = max(confidence, 0.99)

    elif ai_classification == "Cyber-Tampered":

        classification = "Cyber-Tampered"

    elif temp >= 39 or temp <= 34:

        # Clinical rule because current AI model
        # only contains Normal + Cyber-Tampered
        classification = "Physiological Change"

    else:

        classification = "Normal"

    # ----------------------------------------------
    # SAVE TELEMETRY
    # ----------------------------------------------

    c = con()

    c.execute(
        """
        INSERT INTO telemetry
        (
            patient_id,
            device_id,
            temperature,
            heart_rate,
            spo2,
            classification,
            confidence,
            integrity,
            packet_hash,
            source_ip,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            d["patient_id"],
            d["device_id"],
            temp,
            hr,
            spo2,
            classification,
            confidence,
            integrity,
            expected,
            request.remote_addr,
            d["timestamp"]
        )
    )

    c.execute(
        """
        UPDATE devices
        SET status=?,
            last_seen=?,
            ip=?
        WHERE id=?
        """,
        (
            "connected",
            d["timestamp"],
            request.remote_addr,
            d["device_id"]
        )
    )

    c.commit()
    c.close()

    # ----------------------------------------------
    # INCIDENT
    # ----------------------------------------------

    if classification == "Cyber-Tampered":

        incident(
            "CRITICAL",
            "Unauthorized telemetry activity detected",
            f"AI detected suspicious temperature behaviour. "
            f"Temperature={temp:.2f}°C, "
            f"Delta={temp_diff:.2f}°C.",
            "Cyber-Tampered",
            "Packet quarantined • operator alerted",
            request.remote_addr,
            d["device_id"],
            d["patient_id"]
        )

    elif classification == "Physiological Change":

        incident(
            "WARNING",
            "Physiological change detected",
            f"Temperature={temp:.2f}°C "
            f"requires clinical review.",
            "Physiological Change",
            "Flagged for clinical review",
            request.remote_addr,
            d["device_id"],
            d["patient_id"]
        )

    return jsonify(
        ok=True,
        accepted=classification != "Cyber-Tampered",
        classification=classification,
        confidence=confidence,
        temp=temp,
        temp_diff=temp_diff,
        integrity=integrity,
        packet_hash=expected,
        ai_model_used=AI_MODEL is not None
    )


# --------------------------------------------------
# DIRECT AI ENDPOINT
# --------------------------------------------------

@app.post("/api/ai/classify")
def ai_classify():

    d = request.get_json(silent=True) or {}

    temp = float(
        d.get("temp", d.get("temperature", 36.7))
    )

    temp_diff = float(
        d.get("temp_diff", 0.0)
    )

    result = ai_predict(
        temp,
        temp_diff
    )

    return jsonify(
        ok=True,
        temperature=temp,
        temp_diff=temp_diff,
        classification=result["classification"],
        confidence=result["confidence"],
        prediction=result["prediction"],
        source="my_temp_ai_model.pkl"
    )


# --------------------------------------------------
# OLD TEST ENDPOINT
# test_ai.py uses /check_temp
# --------------------------------------------------

@app.post("/check_temp")
def check_temp():

    d = request.get_json(silent=True) or {}

    temp = float(d.get("temp", 36.7))
    temp_diff = float(d.get("temp_diff", 0.0))

    result = ai_predict(
        temp,
        temp_diff
    )

    return jsonify(
        ok=True,
        temp=temp,
        temp_diff=temp_diff,
        classification=result["classification"],
        confidence=result["confidence"],
        prediction=result["prediction"]
    )


# --------------------------------------------------
# DEMO BUTTON
# --------------------------------------------------

@app.post("/api/demo")
def demo():

    kind = (
        request.get_json(silent=True) or {}
    ).get("kind", "normal")

    # ----------------------------------------------
    # DEMO VALUES
    # ----------------------------------------------

    if kind == "tampered":

        temp = 42.0
        temp_diff = 3.5

    elif kind == "physiological":

        temp = 39.2
        temp_diff = 0.2

    else:

        temp = 36.7
        temp_diff = 0.1

    # ----------------------------------------------
    # AI
    # ----------------------------------------------

    ai_result = ai_predict(
        temp,
        temp_diff
    )

    if kind == "physiological":

        classification = "Physiological Change"
        confidence = 0.93
        severity = "WARNING"

    elif ai_result["classification"] == "Cyber-Tampered":

        classification = "Cyber-Tampered"
        confidence = ai_result["confidence"]
        severity = "CRITICAL"

    else:

        classification = "Normal"
        confidence = ai_result["confidence"]
        severity = "INFO"

    # ----------------------------------------------
    # SAVE
    # ----------------------------------------------

    timestamp = now()

    d = {
        "patient_id": "P-001",
        "device_id": "ESP32-01",
        "temperature": temp,
        "heart_rate": 79,
        "spo2": 98,
        "timestamp": timestamp
    }

    h = digest(d)

    c = con()

    c.execute(
        """
        INSERT INTO telemetry
        (
            patient_id,
            device_id,
            temperature,
            heart_rate,
            spo2,
            classification,
            confidence,
            integrity,
            packet_hash,
            source_ip,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "P-001",
            "ESP32-01",
            temp,
            79,
            98,
            classification,
            confidence,
            "MATCH",
            h,
            "127.0.0.1",
            timestamp
        )
    )

    c.execute(
        """
        UPDATE devices
        SET status=?,
            last_seen=?
        WHERE id=?
        """,
        (
            "demo",
            timestamp,
            "ESP32-01"
        )
    )

    c.commit()
    c.close()

    # ----------------------------------------------
    # INCIDENT
    # ----------------------------------------------

    if classification == "Cyber-Tampered":

        incident(
            "CRITICAL",
            "Unauthorized telemetry activity detected",
            "AI model classified the demo telemetry as suspicious.",
            "Cyber-Tampered",
            "Packet quarantined • source isolated • operator alerted",
            "192.168.1.77"
        )

    elif classification == "Physiological Change":

        incident(
            "WARNING",
            "Physiological change detected",
            "Temperature crossed the configured clinical review threshold.",
            "Physiological Change",
            "Flagged for clinical review",
            "127.0.0.1"
        )

    return jsonify(
        ok=True,
        temperature=temp,
        temp_diff=temp_diff,
        classification=classification,
        confidence=confidence,
        severity=severity,
        ai_model_used=AI_MODEL is not None
    )


# --------------------------------------------------
# SHA-256 VERIFY
# --------------------------------------------------

@app.post("/api/verify")
def verify():

    d = request.get_json(silent=True) or {}

    expected = digest(d)

    return jsonify(
        match=(
            not d.get("packet_hash")
            or d.get("packet_hash") == expected
        ),
        expected_hash=expected
    )


# --------------------------------------------------
# START
# --------------------------------------------------

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )