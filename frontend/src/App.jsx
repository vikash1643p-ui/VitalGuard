import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, AlertTriangle, BellRing, CheckCircle2, ChevronRight, Clock3,
  Cpu, Database, FileCheck2, Fingerprint, HeartPulse, History, LayoutDashboard,
  LockKeyhole, Menu, Network, Radio, Server, ShieldAlert, ShieldCheck,
  Thermometer, UserRound, Wifi, WifiOff, X, Search, Ban, Eye, Zap,
  Stethoscope, Waves, CircleDot, ArrowDownToLine, RefreshCw, Siren, EyeOff
} from "lucide-react";

const nav = [
  ["dashboard", "Command Center", LayoutDashboard],
  ["monitoring", "Patient Monitoring", HeartPulse],
  ["firewall", "Bio-Firewall AI", ShieldCheck],
  ["alerts", "Security Alerts", BellRing],
  ["history", "Incident History", History],
  ["device", "ESP32 Device", Cpu],
  ["integrity", "Data Integrity", Fingerprint],
];

const baseEvents = [
  { time: "09:18:42", type: "Integrity", title: "Telemetry packet verified", detail: "SHA-256 digest matched server record", level: "safe", source: "ESP32-P001" },
  { time: "09:18:38", type: "Bio-Firewall", title: "Physiological pattern normal", detail: "HR / SpO₂ correlation within baseline", level: "safe", source: "BIO-AI-01" },
  { time: "09:18:31", type: "Device", title: "Sensor heartbeat received", detail: "MAX30102 telemetry channel responding", level: "safe", source: "ESP32-P001" },
];

function makeTelemetry(mode = "normal") {
  const t = Date.now();

  if (mode === "tampered") {
    return {
      hr: 148,
      spo2: 98,
      temp: 36.7,
      time: new Date().toLocaleTimeString([], { hour12: false })
    };
  }

  if (mode === "physiological") {
    return {
      hr: 101,
      spo2: 95,
      temp: 37.4,
      time: new Date().toLocaleTimeString([], { hour12: false })
    };
  }

  return {
    hr: Math.round(76 + Math.sin(t / 850) * 3 + (Math.random() - 0.5) * 2),
    spo2: Math.max(
      96,
      Math.min(
        99,
        Math.round(98 + Math.sin(t / 2800) * 0.5 + (Math.random() - 0.5))
      )
    ),
    temp: +(36.7 + Math.sin(t / 6000) * 0.1 + (Math.random() - 0.5) * 0.06).toFixed(1),
    time: new Date().toLocaleTimeString([], { hour12: false })
  };
}

function CoreApp({ user }) {
  const [page, setPage] = useState("dashboard");
  const [mobile, setMobile] = useState(false);
  const [mode, setMode] = useState("normal");
  const [telemetry, setTelemetry] = useState(() => makeTelemetry("normal"));
  const [events, setEvents] = useState(baseEvents);
  const [hardwareConnected, setHardwareConnected] = useState(false);
  const [toast, setToast] = useState(null);
  const [alarm, setAlarm] = useState(false);
  const [incident, setIncident] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (mode === "normal") {
        setTelemetry(makeTelemetry("normal"));
      }
    }, 1300);

    return () => clearInterval(id);
  }, [mode]);

  const notify = (text, tone = "safe") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const addEvent = (
    title,
    detail,
    level = "safe",
    type = "System",
    source = "LOCAL-DEMO"
  ) => {
    setEvents((e) => [
      {
        time: new Date().toLocaleTimeString([], { hour12: false }),
        type,
        title,
        detail,
        level,
        source
      },
      ...e
    ].slice(0, 14));
  };

  const playAlarm = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      [0, 0.28, 0.56].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(880, now + offset);

        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });

      audioRef.current = ctx;
    } catch {}
  };

  const simulateAttack = () => {
    fetch("http://127.0.0.1:5000/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "tampered" })
    }).catch(() => {});

    const fake = makeTelemetry("tampered");

    setMode("tampered");
    setTelemetry(fake);
    setAlarm(true);

    setIncident({
      id: `INC-${Date.now().toString().slice(-6)}`,
      sourceIp: "192.168.1.77",
      sourceId: "MITM-DEMO-NODE",
      account: "remote-session-demo",
      time: new Date().toLocaleTimeString([], { hour12: false })
    });

    addEvent(
      "MITM telemetry tampering detected",
      "Heart-rate payload conflicts with SpO₂ / temperature context",
      "danger",
      "Bio-Firewall",
      "192.168.1.77"
    );

    addEvent(
      "Packet quarantined",
      "Inconsistent payload blocked before backend persistence",
      "danger",
      "Response",
      "BIO-FIREWALL-01"
    );

    notify("CRITICAL: suspicious telemetry blocked", "danger");
    playAlarm();

    try {
      const u = new SpeechSynthesisUtterance("Unauthorized activity detected");
      u.rate = 0.86;
      u.pitch = 0.72;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {}
  };

  const simulatePhysiology = () => {
    fetch("http://127.0.0.1:5000/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "physiological" })
    }).catch(() => {});

    setMode("physiological");
    setTelemetry(makeTelemetry("physiological"));
    setAlarm(false);
    setIncident(null);

    addEvent(
      "Physiological variation detected",
      "Vitals changed together; clinical review recommended",
      "warn",
      "Bio-Firewall",
      "BIO-AI-01"
    );

    notify("Physiological change flagged for review", "warn");
  };

  const restoreNormal = () => {
    fetch("http://127.0.0.1:5000/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "normal" })
    }).catch(() => {});

    setMode("normal");
    setTelemetry(makeTelemetry("normal"));
    setAlarm(false);
    setIncident(null);

    addEvent(
      "Telemetry stream restored",
      "Normal physiological relationship confirmed",
      "safe",
      "Bio-Firewall",
      "BIO-AI-01"
    );

    notify("Normal monitoring restored", "safe");
  };

  const props = {
    telemetry,
    events,
    mode,
    hardwareConnected,
    setHardwareConnected,
    incident,
    notify,
    addEvent,
    simulateAttack,
    simulatePhysiology,
    restoreNormal,
    selectedAlert,
    setSelectedAlert
  };

  return (
    <div className={`appShell ${alarm ? "alarmState" : ""}`}>
      <aside className={`sidebar ${mobile ? "mobileOpen" : ""}`}>
        <div className="brand">
          <div className="brandMark">
            <Waves size={23} />
          </div>
          <div>
            <strong>CYBER-BIOWALL</strong>
            <span>Clinical Defense Platform</span>
          </div>
        </div>

        <div className="environment">
          <span className="envDot" />
          DEMONSTRATION ENVIRONMENT <b>v1.0</b>
        </div>

        <div className="sideRule" />

        <div className="navLabel">CLINICAL OPERATIONS</div>

        <nav>
          {nav.slice(0, 3).map(([id, label, Icon]) => (
            <NavBtn
              key={id}
              id={id}
              label={label}
              Icon={Icon}
              page={page}
              setPage={setPage}
              setMobile={setMobile}
            />
          ))}
        </nav>

        <div className="navLabel securityLabel">CYBER DEFENSE</div>

        <nav>
          {nav.slice(3).map(([id, label, Icon]) => (
            <NavBtn
              key={id}
              id={id}
              label={label}
              Icon={Icon}
              page={page}
              setPage={setPage}
              setMobile={setMobile}
            />
          ))}
        </nav>

        <div className="sideBottom">
          <div className={`systemPill ${hardwareConnected ? "connected" : "demo"}`}>
            {hardwareConnected ? <Wifi size={16} /> : <WifiOff size={16} />}

            <div>
              <b>
                {hardwareConnected
                  ? "ESP32 LINK ACTIVE"
                  : "ESP32 NOT CONNECTED"}
              </b>
              <small>
                {hardwareConnected
                  ? "Live hardware telemetry"
                  : "Demo telemetry only"}
              </small>
            </div>
          </div>

          <div className="sideMeta">
            <span><LockKeyhole size={13} /> MQTT / TLS ready</span>
            <span><Server size={13} /> Flask backend ready</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="mobileMenu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={20} />
          </button>

          <div className="crumb">
            <span>HOSPITAL CYBERSECURITY / LIVE</span>
            <b>{nav.find((x) => x[0] === page)?.[1]}</b>
          </div>

          <div className="topActions">
            <div className={`liveStatus ${alarm ? "critical" : ""}`}>
              <span className="pulseDot" />
              {alarm ? "THREAT ACTIVE" : "LIVE MONITORING"}
            </div>

            <div className={`deviceChip ${hardwareConnected ? "connected" : ""}`}>
              {hardwareConnected ? <Wifi size={15} /> : <WifiOff size={15} />}
              ESP32 <b>{hardwareConnected ? "CONNECTED" : "DEMO"}</b>
            </div>

            <div className="avatar" title={user?.username}>
              <UserRound size={17} />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            className="pageWrap"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {page === "dashboard" && <Dashboard {...props} setPage={setPage} />}
            {page === "monitoring" && <Monitoring {...props} />}
            {page === "firewall" && <Firewall {...props} />}
            {page === "alerts" && <Alerts {...props} />}
            {page === "history" && <HistoryPage {...props} />}
            {page === "device" && <Device {...props} />}
            {page === "integrity" && <Integrity {...props} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast ${toast.tone}`}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {toast.tone === "safe" ? (
              <CheckCircle2 size={18} />
            ) : toast.tone === "warn" ? (
              <AlertTriangle size={18} />
            ) : (
              <Siren size={18} />
            )}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alarm && (
          <motion.div
            className="threatBanner"
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            exit={{ y: -80 }}
          >
            <Siren size={18} />
            <strong>CYBER-TAMPERED TELEMETRY BLOCKED</strong>
            <span>Bio-Firewall quarantine active</span>
            <button onClick={() => setAlarm(false)}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavBtn({ id, label, Icon, page, setPage, setMobile }) {
  return (
    <button
      className={`navBtn ${page === id ? "active" : ""}`}
      onClick={() => {
        setPage(id);
        setMobile(false);
      }}
    >
      <Icon size={18} />
      <span>{label}</span>
      {page === id && <ChevronRight size={15} className="navArrow" />}
    </button>
  );
}

function PageHead({ eyebrow, title, desc, action }) {
  return (
    <div className="pageHead">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      {action}
    </div>
  );
}

function CardTitle({ icon: Icon, title, tag }) {
  return (
    <div className="cardTitle">
      <div>
        <Icon size={17} />
        <h3>{title}</h3>
      </div>
      {tag && <span>{tag}</span>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, unit, meta, accent = "green", state }) {
  return (
    <motion.div
      className={`stat ${state || ""}`}
      whileHover={{ y: -2 }}
    >
      <div className={`statIcon ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="statBody">
        <span>{label}</span>
        <strong>{value}<small>{unit}</small></strong>
        <em>{meta}</em>
      </div>
    </motion.div>
  );
}

function Signal({ telemetry, mode = "normal", tall = false }) {
  const seed =
    mode === "tampered" ? 2.1 :
    mode === "physiological" ? 0.9 : 0.35;

  const points = Array.from({ length: 92 }, (_, i) => {
    const x = i * 11;
    const spike =
      i % (mode === "tampered" ? 11 : 17) === 0
        ? -25 * seed
        : 0;

    const y =
      56 -
      Math.sin(i * 0.62) * (7 + seed * 3) +
      Math.sin(i * 0.15) * 4 +
      spike;

    return `${x},${y}`;
  }).join(" ");

  return (
    <div className={`signal ${tall ? "tall" : ""} ${mode}`}>
      <div className="signalGrid" />

      <svg viewBox="0 0 1000 110" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="scan" />

      <div className="signalLabel">
        <span><CircleDot size={12} /> LIVE BIOSIGNAL</span>
        <b>{telemetry.hr} BPM</b>
      </div>
    </div>
  );
}

function StatusPill({ mode }) {
  const map = {
    normal: ["NORMAL", "safe"],
    physiological: ["PHYSIOLOGICAL CHANGE", "warn"],
    tampered: ["CYBER-TAMPERED", "danger"]
  };

  const [text, tone] = map[mode];

  return (
    <span className={`statusPill ${tone}`}>
      <span /> {text}
    </span>
  );
}

function Dashboard({
  telemetry,
  events,
  mode,
  hardwareConnected,
  incident,
  setPage,
  simulateAttack,
  simulatePhysiology,
  restoreNormal
}) {
  return (
    <>
      <PageHead
        eyebrow="CLINICAL SECURITY / COMMAND CENTER"
        title="Patient Protection Command Center"
        desc="One view of bedside physiology, AI reasoning, telemetry integrity and cyber response."
        action={<StatusPill mode={mode} />}
      />

      <div className="heroStrip">
        <div>
          <span>ACTIVE PATIENT</span>
          <strong>P-001 · Ward A · Bed 04</strong>
          <small>Continuous monitoring session · baseline established</small>
        </div>

        <div className="heroClinical">
          <div><HeartPulse size={18} /><b>{telemetry.hr}</b><small>BPM</small></div>
          <div><Activity size={18} /><b>{telemetry.spo2}</b><small>SpO₂</small></div>
          <div><Thermometer size={18} /><b>{telemetry.temp}</b><small>°C</small></div>
        </div>

        <div className="heroTime">
          <span>LAST STREAM</span>
          <b>{telemetry.time}</b>
        </div>
      </div>

      <div className="statsGrid">
        <Stat
          icon={HeartPulse}
          label="Heart Rate"
          value={telemetry.hr}
          unit=" BPM"
          meta={mode === "tampered" ? "Incoming payload abnormal" : "Live physiological stream"}
          state={mode === "tampered" ? "dangerStat" : ""}
        />

        <Stat
          icon={Activity}
          label="Blood Oxygen"
          value={telemetry.spo2}
          unit=" %"
          meta="Optical signal channel"
          accent="blue"
        />

        <Stat
          icon={Thermometer}
          label="Temperature"
          value={telemetry.temp}
          unit=" °C"
          meta="Context reference"
          accent="amber"
        />

        <Stat
          icon={ShieldCheck}
          label="AI Confidence"
          value={mode === "tampered" ? "99.2" : mode === "physiological" ? "91.4" : "97.8"}
          unit=" %"
          meta="Current classification"
        />
      </div>

      <div className="commandGrid">
        <section className="card signalCard">
          <CardTitle icon={Waves} title="Continuous Physiological Stream" tag="1 Hz / LIVE" />
          <Signal telemetry={telemetry} mode={mode} tall />

          <div className="signalFooter">
            <span><CircleDot size={13} /> MAX30102 · P-001</span>
            <span>Baseline <b>76 BPM</b></span>
            <span>Stream <b>{mode === "tampered" ? "QUARANTINED" : "VERIFIED"}</b></span>
          </div>
        </section>

        <section className={`card decisionCard ${mode}`}>
          <CardTitle icon={ShieldCheck} title="Bio-Firewall Decision" tag="CONTEXT ENGINE" />

          <div className="decisionTop">
            <div className="decisionIcon"><ShieldCheck size={30} /></div>
            <div>
              <span>INCOMING TELEMETRY</span>
              <h2><StatusPill mode={mode} /></h2>
              <p>
                {mode === "tampered"
                  ? "Payload conflicts with the patient's multi-vital context. Backend write blocked."
                  : mode === "physiological"
                  ? "Vitals changed together. No network inconsistency detected; clinical review is advised."
                  : "Heart rate, SpO₂ and temperature remain contextually consistent."}
              </p>
            </div>
          </div>

          <div className="decisionRows">
            <div><span>HR ↔ SpO₂</span><b>{mode === "tampered" ? "18%" : "98.2%"}</b></div>
            <div><span>HR ↔ Temperature</span><b>{mode === "tampered" ? "22%" : "96.4%"}</b></div>
            <div><span>Integrity</span><b>{mode === "tampered" ? "FAILED" : "VERIFIED"}</b></div>
          </div>
        </section>
      </div>

      <div className="twoCol lower">
        <section className="card">
          <CardTitle icon={Zap} title="Demonstration Control" tag="LOCAL SIMULATION" />
          <p className="demoIntro">
            Show the project story: normal vitals → suspicious change → quarantine.
          </p>

          <div className="demoButtons">
            <button className="safeBtn" onClick={restoreNormal}>
              <CheckCircle2 /> Normal
            </button>
            <button className="warnBtn" onClick={simulatePhysiology}>
              <Activity /> Physiological Change
            </button>
            <button className="dangerBtn" onClick={simulateAttack}>
              <ShieldAlert /> Simulate MITM
            </button>
          </div>

          <div className="demoHint">
            <Eye size={15} />
            Demo attack creates a fake telemetry packet, triggers an audible browser alarm, quarantines it and records the source.
          </div>
        </section>

        <section className="card">
          <CardTitle icon={History} title="Latest Security Events" tag="LIVE LOG" />
          <div className="eventList">
            {events.slice(0, 4).map((e, i) => <Event key={i} e={e} />)}
          </div>
        </section>
      </div>

      <div className="flowCard card">
        <CardTitle icon={Network} title="Trust Boundary" tag="DATA PATH" />

        <div className="trustFlow">
          {[
            [Cpu, "ESP32 / MAX30102", "SOURCE"],
            [Radio, "TELEMETRY", "HR · SpO₂ · TEMP"],
            [ShieldCheck, "BIO-FIREWALL", "AI CONTEXT"],
            [Fingerprint, "SHA-256", "VERIFY"],
            [Database, "FLASK BACKEND", "PERSIST / BLOCK"]
          ].map(([I, a, b], i) => (
            <div
              className={`trustNode ${mode === "tampered" && i >= 3 ? "blockedNode" : ""}`}
              key={a}
            >
              <div className="trustIcon"><I size={18} /></div>
              <b>{a}</b>
              <small>{b}</small>
              {i < 4 && <ChevronRight className="flowArrow" size={16} />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Monitoring({ telemetry, mode, hardwareConnected }) {
  const clinical =
    mode === "normal"
      ? "Stable baseline pattern"
      : mode === "physiological"
      ? "Possible physiological variation"
      : "Bedside context appears stable; incoming payload is inconsistent";

  return (
    <>
      <PageHead
        eyebrow="PATIENT CARE / BEDSIDE VIEW"
        title="Patient Monitoring"
        desc="A clinical-first view that separates the patient's condition from the trustworthiness of the incoming network data."
        action={
          <div className="patientBadge">
            <div className="patientAvatar"><Stethoscope size={18} /></div>
            <div><b>Patient P-001</b><span>Ward A · Bed 04 · Monitoring bay</span></div>
          </div>
        }
      />

      <div className="patientBanner">
        <div className="patientIdentity">
          <div className="bigPatient"><UserRound size={28} /></div>
          <div>
            <span>MONITORED PATIENT</span>
            <h2>P-001</h2>
            <p>Continuous non-invasive telemetry</p>
          </div>
        </div>

        <div className="clinicalStatus">
          <span>CLINICAL CONTEXT</span>
          <strong>{clinical}</strong>
          <small>
            {mode === "tampered"
              ? "Security system is evaluating the packet, not changing the bedside reading."
              : "No simulated critical clinical event."}
          </small>
        </div>

        <div className="linkStatus">
          {hardwareConnected ? <Wifi /> : <WifiOff />}
          <span>{hardwareConnected ? "ESP32 LIVE" : "DEMO SENSOR"}</span>
        </div>
      </div>

      <div className="statsGrid">
        <Stat icon={HeartPulse} label="Heart Rate" value={telemetry.hr} unit=" BPM" meta="Current stream" />
        <Stat icon={Activity} label="SpO₂" value={telemetry.spo2} unit=" %" meta="Oxygen saturation" accent="blue" />
        <Stat icon={Thermometer} label="Temperature" value={telemetry.temp} unit=" °C" meta="Context value" accent="amber" />
        <Stat
          icon={Radio}
          label="Signal Quality"
          value={mode === "tampered" ? "—" : "98"}
          unit={mode === "tampered" ? "" : " %"}
          meta={mode === "tampered" ? "Packet quarantined" : "MAX30102 optical signal"}
          state={mode === "tampered" ? "dangerStat" : ""}
        />
      </div>

      <section className="card bigSignal">
        <CardTitle icon={HeartPulse} title="Live Heart-Rate Waveform" tag="PHYSIOLOGICAL CHANNEL" />
        <Signal telemetry={telemetry} mode={mode} tall />

        <div className="metricStrip">
          <div><span>Current</span><b>{telemetry.hr} BPM</b></div>
          <div><span>Baseline</span><b>76 BPM</b></div>
          <div><span>SpO₂</span><b>{telemetry.spo2}%</b></div>
          <div><span>Temperature</span><b>{telemetry.temp}°C</b></div>
        </div>
      </section>

      <div className="threeCol">
        <InfoCard icon={Activity} title="Oxygen" value={`${telemetry.spo2}%`} note="MAX30102 channel" />
        <InfoCard icon={Thermometer} title="Temperature" value={`${telemetry.temp}°C`} note="Context reference" />
        <InfoCard
          icon={ShieldCheck}
          title="Data Trust"
          value={mode === "tampered" ? "QUARANTINED" : "VERIFIED"}
          note={mode === "tampered" ? "Do not persist packet" : "Integrity passed"}
        />
      </div>
    </>
  );
}

function Firewall({ telemetry, mode, incident, simulateAttack, simulatePhysiology, restoreNormal }) {
  const score =
    mode === "tampered" ? "99.2" :
    mode === "physiological" ? "91.4" : "97.8";

  return (
    <>
      <PageHead
        eyebrow="AI DEFENSE / BEHAVIORAL ANALYSIS"
        title="Bio-Firewall Intelligence"
        desc="The defense layer asks a different question: does this packet make biological sense for the same patient?"
        action={<div className="aiBadge"><span className="aiDot" /> MODEL ONLINE</div>}
      />

      <div className={`aiHero ${mode}`}>
        <div className="aiCore"><ShieldCheck size={42} /><span>BIO-AI</span></div>
        <div className="aiResult">
          <span>CURRENT CLASSIFICATION</span>
          <h2><StatusPill mode={mode} /></h2>
          <p>
            {mode === "tampered"
              ? "Cross-vital mismatch + integrity failure. Packet moved to quarantine."
              : mode === "physiological"
              ? "Correlated vital changes look physiologically plausible. Review, don't block."
              : "Physiological relationships match the established patient baseline."}
          </p>
        </div>
        <div className="aiScore">
          <span>CONFIDENCE</span>
          <b>{score}%</b>
          <div className="bar"><i style={{ width: `${score}%` }} /></div>
        </div>
      </div>

      <div className="aiGrid">
        <section className="card">
          <CardTitle icon={Waves} title="Multi-Vital Correlation" tag="WHY THE AI FLAGS IT" />

          <div className="correlations">
            <Correlation
              name="Heart Rate ↔ SpO₂"
              value={mode === "tampered" ? "18%" : mode === "physiological" ? "88.1%" : "98.2%"}
              ok={mode === "normal"}
            />
            <Correlation
              name="Heart Rate ↔ Temperature"
              value={mode === "tampered" ? "22%" : mode === "physiological" ? "86.3%" : "96.4%"}
              ok={mode !== "tampered"}
            />
            <Correlation
              name="Telemetry ↔ SHA-256"
              value={mode === "tampered" ? "MISMATCH" : "MATCH"}
              ok={mode !== "tampered"}
            />
          </div>

          <div className="ruleNote">
            <ShieldCheck size={17} />
            <span>Three signals are evaluated together so a believable-looking single field cannot automatically become trusted medical data.</span>
          </div>
        </section>

        <section className="card attackCard">
          <CardTitle icon={Siren} title="Threat Demonstrator" tag="SAFE LOCAL TEST" />

          <div className="attackStory">
            <div>
              <span>STEP 01</span>
              <b>Fake pulse enters</b>
              <small>Example: HR suddenly becomes 148 while SpO₂ / temperature stay unchanged.</small>
            </div>
            <ChevronRight />
            <div>
              <span>STEP 02</span>
              <b>Bio-Firewall compares</b>
              <small>Cross-vital context + integrity are evaluated.</small>
            </div>
            <ChevronRight />
            <div>
              <span>STEP 03</span>
              <b>Packet quarantined</b>
              <small>Backend write is blocked and incident is logged.</small>
            </div>
          </div>

          <div className="demoButtons">
            <button className="dangerBtn wide" onClick={simulateAttack}>
              <Siren /> Run MITM Demonstration
            </button>
            <button className="safeBtn" onClick={restoreNormal}>
              <RefreshCw /> Restore
            </button>
            <button className="warnBtn" onClick={simulatePhysiology}>
              <Activity /> Physiological Change
            </button>
          </div>
        </section>
      </div>

      {incident && (
        <section className="incidentReveal">
          <div className="incidentStamp">
            <Siren size={22} />
            <span>INCIDENT CREATED</span>
            <b>{incident.id}</b>
          </div>
          <div><span>DEMO SOURCE</span><strong>{incident.sourceIp}</strong></div>
          <div><span>SESSION / ID</span><strong>{incident.account}</strong></div>
          <div><span>DEVICE CLAIM</span><strong>{incident.sourceId}</strong></div>
          <div><span>RESPONSE</span><strong>QUARANTINED</strong></div>
        </section>
      )}

      <section className="card">
        <CardTitle icon={Database} title="Decision Pipeline" tag="EDGE → BACKEND" />
        <div className="decisionFlow">
          {["Sensor Input", "Cross-Vital Context", "AI Classification", "SHA-256 Verification", "Backend Action"].map((x, i) => (
            <div
              className={`decision ${mode === "tampered" && i >= 3 ? "blockedDecision" : ""}`}
              key={x}
            >
              <span>0{i + 1}</span>
              <b>{x}</b>
              {i < 4 && <ChevronRight size={17} />}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Alerts({
  events,
  mode,
  incident,
  notify,
  simulateAttack,
  restoreNormal,
  selectedAlert,
  setSelectedAlert
}) {
  const alerts = events.filter((e) => e.level !== "safe");

  return (
    <>
      <PageHead
        eyebrow="SOC / INCIDENT RESPONSE"
        title="Security Alerts"
        desc="Threats are separated from clinical observations so a cyber event can be investigated without confusing it with patient deterioration."
        action={
          <button className="outlineBtn" onClick={() => notify("Alert queue reviewed", "safe")}>
            Mark reviewed
          </button>
        }
      />

      <div className="alertSummary">
        <div><span>OPEN ALERTS</span><b>{alerts.length}</b><small>requires attention</small></div>
        <div><span>QUARANTINED</span><b>{mode === "tampered" ? "01" : "00"}</b><small>payload blocked</small></div>
        <div><span>INTEGRITY FAILURES</span><b>{mode === "tampered" ? "01" : "00"}</b><small>SHA-256 mismatch</small></div>
        <div><span>ESP32 LINK</span><b className="greenText">DEMO</b><small>hardware not connected</small></div>
      </div>

      {mode === "tampered" && (
        <div className="criticalAlert">
          <div className="criticalIcon"><Siren /></div>
          <div>
            <span>CRITICAL SECURITY EVENT · {incident?.id}</span>
            <h2>Suspicious telemetry injection blocked</h2>
            <p>Incoming heart-rate value is inconsistent with the patient's other physiological signals. The packet is quarantined before backend persistence.</p>
          </div>
          <button onClick={restoreNormal}>Resolve demo</button>
        </div>
      )}

      <section className="card">
        <CardTitle icon={BellRing} title="Alert Queue" tag="CLICK ANY ALERT TO INSPECT" />

        <div className="alertTable">
          <div className="tableHead">
            <span>TIME</span>
            <span>SEVERITY</span>
            <span>EVENT</span>
            <span>SOURCE / ID</span>
            <span>STATUS</span>
          </div>

          {(alerts.length
            ? alerts
            : [{
                time: "—",
                level: "safe",
                title: "No open security alerts",
                detail: "Monitoring is clear",
                source: "SYSTEM",
                type: "System"
              }]
          ).map((e, i) => (
            <button
              className="tableRow alertClickable"
              key={i}
              onClick={() => setSelectedAlert(e)}
            >
              <span>{e.time}</span>
              <span><Level level={e.level} /></span>
              <div><b>{e.title}</b><small>{e.detail}</small></div>
              <span className="mono">{e.source}</span>
              <span className={e.level === "danger" ? "blockedText" : "reviewText"}>
                {e.level === "danger" ? "QUARANTINED" : e.level === "warn" ? "REVIEW" : "CLEAR"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="responseBar">
        <div>
          <ShieldAlert size={20} />
          <div>
            <b>Want to demonstrate the alert live?</b>
            <span>Run the local MITM simulation. No external target or real attack is used.</span>
          </div>
        </div>
        <button className="dangerBtn" onClick={simulateAttack}>Trigger Demo Alert</button>
      </div>

      <AnimatePresence>
        {selectedAlert && (
          <AlertPreview
            alert={selectedAlert}
            incident={incident}
            onClose={() => setSelectedAlert(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function AlertPreview({ alert, incident, onClose }) {
  const isDanger = alert.level === "danger";
  const isWarn = alert.level === "warn";

  const title = isDanger ? "CYBER EVENT INSPECTION" : "PHYSIOLOGICAL REVIEW";
  const classification = isDanger ? "CYBER-TAMPERED" : "PHYSIOLOGICAL CHANGE";
  const response = isDanger
    ? "QUARANTINED — BACKEND WRITE BLOCKED"
    : "REVIEW — NO AUTOMATIC BLOCK";

  const source = alert.source || "BIO-AI-01";

  return (
    <motion.div
      className="alertModalBackdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`alertModal ${alert.level}`}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="alertModalTop">
          <div>
            <span className="eyebrow">{title}</span>
            <h2>{alert.title}</h2>
            <p>{alert.detail}</p>
          </div>
          <button className="iconClose" onClick={onClose}><X /></button>
        </div>

        <div className="previewStatus">
          <div><span>AI CLASSIFICATION</span><b>{classification}</b></div>
          <div><span>RESPONSE</span><b>{response}</b></div>
        </div>

        <div className="previewGrid">
          <div><span>EVENT TIME</span><strong>{alert.time}</strong></div>
          <div><span>SOURCE</span><strong className="mono">{source}</strong></div>
          <div><span>INCIDENT ID</span><strong className="mono">{incident?.id || "—"}</strong></div>
          <div><span>DEVICE CLAIM</span><strong className="mono">{isDanger ? "MITM-DEMO-NODE" : "ESP32-P001"}</strong></div>
          <div><span>NETWORK ORIGIN</span><strong className="mono">{isDanger ? "192.168.1.77" : "LOCAL SENSOR STREAM"}</strong></div>
          <div><span>SESSION</span><strong className="mono">{isDanger ? "remote-session-demo" : "BIO-AI-01"}</strong></div>
        </div>

        <div className="previewEvidence">
          <div className="evidenceHead">
            <ShieldCheck size={17} />
            <b>WHY THIS EVENT WAS FLAGGED</b>
          </div>

          {isDanger ? (
            <>
              <div>• Heart rate: <b>148 BPM</b> — inconsistent with context</div>
              <div>• SpO₂: <b>98%</b> and temperature: <b>36.7°C</b> remained unchanged</div>
              <div>• HR ↔ SpO₂ correlation: <b>18%</b></div>
              <div>• SHA-256: <b className="blockedText">MISMATCH</b></div>
            </>
          ) : (
            <>
              <div>• Multiple vital signs changed together</div>
              <div>• Biological relationship remains plausible</div>
              <div>• AI recommends <b>clinical review</b>, not automatic blocking</div>
            </>
          )}
        </div>

        <div className="previewFooter">
          <span><CheckCircle2 size={15} /> Evidence captured in Incident History</span>
          <button
            className={isDanger ? "dangerBtn" : "outlineBtn"}
            onClick={onClose}
          >
            {isWarn ? "Close Review" : "Close Incident Preview"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HistoryPage({ events }) {
  return (
    <>
      <PageHead
        eyebrow="FORENSICS / AUDIT TRAIL"
        title="Incident History"
        desc="Chronological evidence of what the defense layer received, decided and blocked."
      />

      <section className="card timelineCard">
        <CardTitle icon={History} title="Security Timeline" tag="AUDIT RECORD" />

        <div className="timeline">
          {events.map((e, i) => (
            <div className={`timelineItem ${e.level}`} key={i}>
              <div className="timelineDot" />
              <div className="timelineTime">{e.time}</div>
              <div className="timelineBody">
                <div><Level level={e.level} /><span>{e.type}</span></div>
                <h3>{e.title}</h3>
                <p>{e.detail}</p>
                <code>{e.source}</code>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Device({ hardwareConnected, setHardwareConnected, notify, addEvent }) {
  const toggle = () => {
    const next = !hardwareConnected;

    setHardwareConnected(next);

    addEvent(
      next ? "ESP32 hardware link enabled" : "ESP32 hardware link disabled",
      next
        ? "Dashboard is ready to accept device telemetry"
        : "Returning to local demonstration telemetry",
      next ? "safe" : "warn",
      "Device",
      "ESP32-P001"
    );

    notify(
      next ? "ESP32 marked as connected" : "ESP32 marked as disconnected",
      next ? "safe" : "warn"
    );
  };

  return (
    <>
      <PageHead
        eyebrow="EDGE DEVICE / ESP32"
        title="ESP32 Device Control"
        desc="Hardware status is explicit: until the board is actually connected, the platform stays in demonstration mode."
      />

      <div className={`deviceHero ${hardwareConnected ? "connected" : ""}`}>
        <div className="deviceVisual">
          <div className="boardGlow"><Cpu size={58} /></div>
          <div>
            <span>EDGE NODE</span>
            <h2>ESP32 · P-001</h2>
            <p>MAX30102 telemetry source</p>
          </div>
        </div>

        <div className="deviceState">
          <span>CONNECTION STATE</span>
          <strong>{hardwareConnected ? "CONNECTED" : "NOT CONNECTED"}</strong>
          <small>{hardwareConnected ? "Awaiting live sensor packets" : "No physical board detected"}</small>
          <button onClick={toggle}>
            {hardwareConnected ? "Set Offline" : "Demo: Mark Connected"}
          </button>
        </div>
      </div>

      <div className="deviceGrid">
        <section className="card">
          <CardTitle icon={Cpu} title="Readiness" tag="EDGE STACK" />
          <div className="readiness">
            <Readiness label="MicroPython / Thonny" ok />
            <Readiness label="MAX30102 sensor" ok />
            <Readiness label="MQTT / TLS channel" ok />
            <Readiness label="Live ESP32 handshake" ok={hardwareConnected} />
          </div>
        </section>

        <section className="card">
          <CardTitle icon={Network} title="Expected Data Path" tag="WHEN HARDWARE IS CONNECTED" />
          <div className="expectedPath">
            <span>MAX30102</span><ChevronRight />
            <span>ESP32</span><ChevronRight />
            <span>MQTT / TLS</span><ChevronRight />
            <span>Bio-Firewall</span><ChevronRight />
            <span>Flask</span>
          </div>

          <div className="deviceNote">
            <WifiOff size={16} />
            <span>
              Current build intentionally does <b>not</b> claim a real ESP32 connection.
              Use the toggle only for presentation UI; later your friend's Thonny code can feed the backend.
            </span>
          </div>
        </section>
      </div>
    </>
  );
}

function Integrity({ mode }) {
  const digest = mode === "tampered"
    ? "7f2a…91d4  ·  MISMATCH"
    : "9b7e…c81a  ·  MATCH";

  return (
    <>
      <PageHead
        eyebrow="TRUST / CRYPTOGRAPHIC VERIFICATION"
        title="Data Integrity"
        desc="Every telemetry packet gets a cryptographic fingerprint before the backend accepts it."
      />

      <div className={`hashHero ${mode}`}>
        <div className="hashIcon"><Fingerprint size={38} /></div>
        <div>
          <span>PACKET TRUST STATUS</span>
          <h2>{mode === "tampered" ? "INTEGRITY FAILED" : "INTEGRITY VERIFIED"}</h2>
          <p>
            {mode === "tampered"
              ? "Payload changed after source transmission. Backend persistence is blocked."
              : "Server-side digest matches the received telemetry packet."}
          </p>
        </div>
        <div className="hashBadge">
          <FileCheck2 size={18} />
          {mode === "tampered" ? "REJECT" : "ACCEPT"}
        </div>
      </div>

      <div className="hashGrid">
        <section className="card">
          <CardTitle icon={Fingerprint} title="SHA-256 Verification" tag="TELEMETRY PACKET" />
          <div className="hashRows">
            <div><span>Packet ID</span><code>PKT-P001-09:18:42</code></div>
            <div><span>Received digest</span><code>{digest}</code></div>
            <div><span>Server digest</span><code>9b7e…c81a</code></div>
            <div>
              <span>Backend action</span>
              <b className={mode === "tampered" ? "blockedText" : "greenText"}>
                {mode === "tampered" ? "REJECT + ALERT" : "ACCEPT + STORE"}
              </b>
            </div>
          </div>
        </section>

        <section className="card">
          <CardTitle icon={LockKeyhole} title="Trust Rule" tag="POLICY" />
          <div className="policy">
            <div><CheckCircle2 /><span>Valid digest → continue AI analysis</span></div>
            <div><CheckCircle2 /><span>Context mismatch → classify and review</span></div>
            <div><Ban /><span>Integrity failure → quarantine packet</span></div>
            <div><History /><span>Every decision → incident record</span></div>
          </div>
        </section>
      </div>
    </>
  );
}

function InfoCard({ icon: Icon, title, value, note }) {
  return (
    <div className="infoCard">
      <Icon size={18} />
      <span>{title}</span>
      <b>{value}</b>
      <small>{note}</small>
    </div>
  );
}

function Correlation({ name, value, ok }) {
  return (
    <div className="correlation">
      <div><span>{name}</span><b>{value}</b></div>
      <div className="bar">
        <i
          className={ok ? "" : "bad"}
          style={{ width: value.includes("%") ? value : "100%" }}
        />
      </div>
    </div>
  );
}

function Readiness({ label, ok }) {
  return <div><span>{label}</span>{ok ? <CheckCircle2 /> : <WifiOff />}</div>;
}

function Event({ e }) {
  return (
    <div className="event">
      <div className={`eventDot ${e.level}`} />
      <div>
        <div><b>{e.title}</b><span>{e.time}</span></div>
        <p>{e.detail}</p>
        <small>{e.type} · {e.source}</small>
      </div>
    </div>
  );
}

function Level({ level }) {
  return (
    <span className={`level ${level}`}>
      {level === "danger" ? "CRITICAL" : level === "warn" ? "REVIEW" : "SAFE"}
    </span>
  );
}

function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div className="astraSplash">
      <div className="splashGrid" />

      <motion.div
        className="splashRing"
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        className="splashShield"
        initial={{ scale: 0.55, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <ShieldCheck size={54} />
      </motion.div>

      <h1>CYBER <span>BIOWALL</span></h1>
      <p>ASTRA CLINICAL SECURITY CONSOLE</p>
      <div className="splashLoader"><i /></div>
      <small>INITIALIZING TRUSTED TELEMETRY ENVIRONMENT</small>
    </motion.div>
  );
}

function LoginGate({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const r = await fetch("http://127.0.0.1:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
      });

      const d = await r.json();

      if (!r.ok) {
        throw Error(d.message || "Invalid credentials");
      }

      sessionStorage.setItem("biowall_authenticated", "true");
      sessionStorage.setItem("biowall_operator", d.user.username);

      onLogin(d.user);
    } catch (err) {
      setError(err.message || "Backend unavailable. Start Flask first.");
    }

    setBusy(false);
  }

  return (
    <div className="astraLogin">
      <div className="hospitalBackdrop" />
      <div className="loginShade" />
      <div className="loginGrid" />

      <div className="clinicalTop">
        <span><span className="statusLamp" /> HOSPITAL NETWORK · SECURE</span>
        <span>CYBER-BIOWALL / ACCESS NODE 01</span>
      </div>

      <div className="ambientReadout ambientLeft">
        <span>ICU MONITORING</span>
        <b>24 / 7</b>
        <small>CLINICAL TELEMETRY</small>
      </div>

      <div className="ambientReadout ambientRight">
        <span>THREAT SENSOR</span>
        <b>ARMED</b>
        <small>AI + INTEGRITY LAYER</small>
      </div>

      <motion.div
        className="loginPanel"
        initial={{ y: 26, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="loginPanelGlow" />

        <div className="loginBrandRow">
          <div className="loginMark">
            <ShieldCheck size={28} />
            <i />
          </div>

          <div>
            <b>CYBER-BIOWALL</b>
            <span>Clinical Defense Platform</span>
          </div>

          <div className="secureBadge">
            <LockKeyhole size={13} /> SECURE
          </div>
        </div>

        <div className="loginIntro">
          <span className="eyebrow">SECURE CLINICAL ACCESS</span>
          <h1>Welcome to <span>BioWall</span></h1>
          <p>
            Protected access to patient telemetry, AI reasoning and cyber-physical defense.
          </p>
        </div>

        <form onSubmit={submit}>
          <label>OPERATOR ID</label>

          <motion.div
            className={`loginInput ${focused === "user" ? "focused" : ""} ${username ? "filled" : ""}`}
            animate={focused === "user" ? { y: -1 } : { y: 0 }}
          >
            <UserRound size={17} />

            <input
              value={username}
              onFocus={() => setFocused("user")}
              onBlur={() => setFocused("")}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter operator ID"
              autoComplete="off"
              required
            />

            {username && <CheckCircle2 className="fieldCheck" size={15} />}
          </motion.div>

          <label>PASSWORD</label>

          <motion.div
            className={`loginInput ${focused === "pass" ? "focused" : ""} ${password ? "filled" : ""}`}
            animate={focused === "pass" ? { y: -1 } : { y: 0 }}
          >
            <LockKeyhole size={17} />

            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onFocus={() => setFocused("pass")}
              onBlur={() => setFocused("")}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter secure password"
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="passwordToggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </motion.div>

          <div className="loginOptions">
            <label className="remember">
              <input type="checkbox" />
              <span>Remember this workstation</span>
            </label>
            <span>Protected session</span>
          </div>

          {error && (
            <motion.div
              className="loginError"
              initial={{ x: -8 }}
              animate={{ x: [-8, 7, -5, 3, 0] }}
            >
              <AlertTriangle size={15} />
              <span>{error}</span>
            </motion.div>
          )}

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            className="loginButton"
            disabled={busy}
          >
            {busy ? (
              <>
                <RefreshCw size={16} className="spinIcon" />
                AUTHENTICATING…
              </>
            ) : (
              <>
                ENTER SECURITY CONSOLE <ChevronRight size={17} />
              </>
            )}
          </motion.button>
        </form>

        <div className="loginFooter">
          <span><Wifi size={13} /> Flask backend protected session</span>
          <span><ShieldCheck size={13} /> SHA-256 telemetry trust</span>
        </div>

        <div className="demoHintLogin">
          DEMO ACCESS <b>admin</b> / <b>admin123</b>
        </div>
      </motion.div>

      <div className="clinicalBottom">
        <span>ESP32 / MAX30102</span><i />
        <span>MQTT / TLS READY</span><i />
        <span>BIO-FIREWALL ONLINE</span><i />
        <span>INTEGRITY ENGINE READY</span>
      </div>
    </div>
  );
}

/* LOGIN FIX:
   Always start without a logged-in user.
   Successful LoginGate authentication opens CoreApp.
   Refreshing the page shows the login page again.
*/
function App() {
  const [splash, setSplash] = useState(true);
  const [user, setUser] = useState(null);

  if (splash) {
    return <Splash onDone={() => setSplash(false)} />;
  }

  if (!user) {
    return <LoginGate onLogin={setUser} />;
  }

  return <CoreApp user={user} />;
}

export default App;