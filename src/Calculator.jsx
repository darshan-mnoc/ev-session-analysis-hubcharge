import { useState, useMemo } from "react";
import "./Calculator.css";

// Site Infrastructure Constants (HC-MBS)
const SITE_CONFIG = {
  name: "HC-MBS",
  pcs: { capacity: 60 },
  battery: { capacity: 240, voltage: 639.9 },
};

// Charger specifications
const CHARGERS = {
  winline: { name: "Winline", id: "MBS_1", maxKw: 160, maxAmps: 200 },
  yotai: { name: "Yotai", id: "MBS_2", maxKw: 180, maxAmps: 400 },
};

// EV Database with accurate charging curves
const EV_DATABASE = [
  // Tesla
  {
    make: "Tesla",
    model: "Model 3 SR RWD",
    bat: 57.5,
    dc: 170,
    v: 400,
    epa: 272,
    curve: "flat400",
  },
  {
    make: "Tesla",
    model: "Model 3 LR AWD",
    bat: 82,
    dc: 250,
    v: 400,
    epa: 358,
    curve: "flat400",
  },
  {
    make: "Tesla",
    model: "Model 3 Performance",
    bat: 82,
    dc: 250,
    v: 400,
    epa: 315,
    curve: "flat400",
  },
  {
    make: "Tesla",
    model: "Model Y SR RWD",
    bat: 57.5,
    dc: 170,
    v: 400,
    epa: 260,
    curve: "flat400",
  },
  {
    make: "Tesla",
    model: "Model Y LR AWD",
    bat: 82,
    dc: 250,
    v: 400,
    epa: 330,
    curve: "flat400",
  },
  {
    make: "Tesla",
    model: "Model Y Performance",
    bat: 82,
    dc: 250,
    v: 400,
    epa: 303,
    curve: "flat400",
  },
  {
    make: "Tesla",
    model: "Model S LR",
    bat: 100,
    dc: 250,
    v: 400,
    epa: 405,
    curve: "flat400",
  },
  {
    make: "Tesla",
    model: "Model X LR",
    bat: 100,
    dc: 250,
    v: 400,
    epa: 348,
    curve: "flat400",
  },
  {
    make: "Tesla",
    model: "Cybertruck AWD",
    bat: 123,
    dc: 350,
    v: 800,
    epa: 340,
    curve: "flat800",
  },
  {
    make: "Tesla",
    model: "Cybertruck Cyberbeast",
    bat: 123,
    dc: 350,
    v: 800,
    epa: 320,
    curve: "flat800",
  },
  // Hyundai/Kia/Genesis (800V)
  {
    make: "Hyundai",
    model: "Ioniq 5 RWD SR",
    bat: 58,
    dc: 220,
    v: 800,
    epa: 266,
    curve: "flat800",
  },
  {
    make: "Hyundai",
    model: "Ioniq 5 AWD LR",
    bat: 77.4,
    dc: 233,
    v: 800,
    epa: 266,
    curve: "flat800",
  },
  {
    make: "Hyundai",
    model: "Ioniq 6 RWD LR",
    bat: 77.4,
    dc: 233,
    v: 800,
    epa: 361,
    curve: "flat800",
  },
  {
    make: "Hyundai",
    model: "Ioniq 6 AWD LR",
    bat: 77.4,
    dc: 233,
    v: 800,
    epa: 316,
    curve: "flat800",
  },
  {
    make: "Kia",
    model: "EV6 RWD SR",
    bat: 58,
    dc: 233,
    v: 800,
    epa: 232,
    curve: "flat800",
  },
  {
    make: "Kia",
    model: "EV6 RWD LR",
    bat: 77.4,
    dc: 233,
    v: 800,
    epa: 310,
    curve: "flat800",
  },
  {
    make: "Kia",
    model: "EV6 GT AWD",
    bat: 77.4,
    dc: 233,
    v: 800,
    epa: 275,
    curve: "flat800",
  },
  {
    make: "Kia",
    model: "EV9 AWD LR",
    bat: 99.8,
    dc: 240,
    v: 800,
    epa: 304,
    curve: "flat800",
  },
  {
    make: "Genesis",
    model: "GV60 Performance",
    bat: 77.4,
    dc: 233,
    v: 800,
    epa: 235,
    curve: "flat800",
  },
  {
    make: "Genesis",
    model: "GV70 Electrified",
    bat: 77.4,
    dc: 233,
    v: 800,
    epa: 236,
    curve: "flat800",
  },
  // Porsche/Audi (800V)
  {
    make: "Porsche",
    model: "Taycan RWD",
    bat: 93.4,
    dc: 270,
    v: 800,
    epa: 246,
    curve: "flat800",
  },
  {
    make: "Porsche",
    model: "Taycan 4S",
    bat: 93.4,
    dc: 270,
    v: 800,
    epa: 227,
    curve: "flat800",
  },
  {
    make: "Porsche",
    model: "Taycan Turbo S",
    bat: 93.4,
    dc: 320,
    v: 800,
    epa: 215,
    curve: "flat800",
  },
  {
    make: "Audi",
    model: "e-tron GT quattro",
    bat: 93.4,
    dc: 270,
    v: 800,
    epa: 238,
    curve: "flat800",
  },
  {
    make: "Audi",
    model: "RS e-tron GT",
    bat: 93.4,
    dc: 270,
    v: 800,
    epa: 232,
    curve: "flat800",
  },
  // Ford
  {
    make: "Ford",
    model: "Mustang Mach-E SR",
    bat: 68,
    dc: 115,
    v: 400,
    epa: 224,
    curve: "steep400",
  },
  {
    make: "Ford",
    model: "Mustang Mach-E ER",
    bat: 88,
    dc: 150,
    v: 400,
    epa: 312,
    curve: "mod400",
  },
  {
    make: "Ford",
    model: "F-150 Lightning SR",
    bat: 98,
    dc: 80,
    v: 400,
    epa: 240,
    curve: "steep400",
  },
  {
    make: "Ford",
    model: "F-150 Lightning ER",
    bat: 131,
    dc: 150,
    v: 400,
    epa: 320,
    curve: "mod400",
  },
  // Chevrolet/GMC
  {
    make: "Chevrolet",
    model: "Bolt EV",
    bat: 65,
    dc: 55,
    v: 400,
    epa: 259,
    curve: "steep400",
  },
  {
    make: "Chevrolet",
    model: "Equinox EV",
    bat: 79,
    dc: 150,
    v: 400,
    epa: 319,
    curve: "good400",
  },
  {
    make: "Chevrolet",
    model: "Blazer EV",
    bat: 85,
    dc: 190,
    v: 400,
    epa: 320,
    curve: "good400",
  },
  {
    make: "Chevrolet",
    model: "Silverado EV",
    bat: 200,
    dc: 350,
    v: 800,
    epa: 450,
    curve: "flat800",
  },
  {
    make: "GMC",
    model: "Hummer EV Pickup",
    bat: 213,
    dc: 350,
    v: 800,
    epa: 329,
    curve: "flat800",
  },
  {
    make: "Cadillac",
    model: "Lyriq RWD",
    bat: 102,
    dc: 190,
    v: 400,
    epa: 314,
    curve: "good400",
  },
  // Rivian
  {
    make: "Rivian",
    model: "R1T Dual LR",
    bat: 135,
    dc: 220,
    v: 400,
    epa: 410,
    curve: "flat400",
  },
  {
    make: "Rivian",
    model: "R1S Dual LR",
    bat: 135,
    dc: 220,
    v: 400,
    epa: 410,
    curve: "flat400",
  },
  // BMW
  {
    make: "BMW",
    model: "i4 eDrive35",
    bat: 83.9,
    dc: 180,
    v: 400,
    epa: 301,
    curve: "mod400",
  },
  {
    make: "BMW",
    model: "i4 M50",
    bat: 83.9,
    dc: 205,
    v: 400,
    epa: 270,
    curve: "mod400",
  },
  {
    make: "BMW",
    model: "iX xDrive50",
    bat: 105.2,
    dc: 195,
    v: 400,
    epa: 324,
    curve: "good400",
  },
  // Mercedes
  {
    make: "Mercedes",
    model: "EQS 450+",
    bat: 107.8,
    dc: 200,
    v: 400,
    epa: 350,
    curve: "good400",
  },
  {
    make: "Mercedes",
    model: "EQE 350+",
    bat: 90.6,
    dc: 170,
    v: 400,
    epa: 305,
    curve: "good400",
  },
  // VW
  {
    make: "Volkswagen",
    model: "ID.4 Pro RWD",
    bat: 82,
    dc: 135,
    v: 400,
    epa: 291,
    curve: "mod400",
  },
  {
    make: "Volkswagen",
    model: "ID.4 Pro S AWD",
    bat: 82,
    dc: 135,
    v: 400,
    epa: 255,
    curve: "mod400",
  },
  // Volvo/Polestar
  {
    make: "Volvo",
    model: "EX90 Twin Motor",
    bat: 107,
    dc: 250,
    v: 400,
    epa: 310,
    curve: "good400",
  },
  {
    make: "Polestar",
    model: "Polestar 2 LR SM",
    bat: 82,
    dc: 205,
    v: 400,
    epa: 320,
    curve: "good400",
  },
  {
    make: "Polestar",
    model: "Polestar 3 LR AWD",
    bat: 111,
    dc: 250,
    v: 400,
    epa: 315,
    curve: "good400",
  },
  // Others
  {
    make: "Lucid",
    model: "Air Pure",
    bat: 88,
    dc: 200,
    v: 400,
    epa: 410,
    curve: "good400",
  },
  {
    make: "Lucid",
    model: "Air Grand Touring",
    bat: 112,
    dc: 300,
    v: 924,
    epa: 516,
    curve: "flat800",
  },
  {
    make: "Nissan",
    model: "Ariya FWD 87kWh",
    bat: 87,
    dc: 130,
    v: 400,
    epa: 304,
    curve: "steep400",
  },
  {
    make: "Toyota",
    model: "bZ4X XLE FWD",
    bat: 71.4,
    dc: 150,
    v: 400,
    epa: 252,
    curve: "steep400",
  },
  {
    make: "Subaru",
    model: "Solterra Premium",
    bat: 71.4,
    dc: 100,
    v: 400,
    epa: 222,
    curve: "steep400",
  },
  {
    make: "Honda",
    model: "Prologue AWD",
    bat: 85,
    dc: 150,
    v: 400,
    epa: 296,
    curve: "steep400",
  },
];

// Charging curves - power fraction [0-1] vs SoC [0-1]
const CURVES = {
  flat800: {
    name: "Flat 800V",
    desc: "Excellent - sustains peak to ~82% SoC",
    color: "#22c55e",
    points: [
      [0, 0.3],
      [0.07, 1],
      [0.82, 1],
      [0.88, 0.75],
      [0.93, 0.45],
      [0.97, 0.2],
      [1, 0.05],
    ],
  },
  flat400: {
    name: "Flat 400V",
    desc: "Very good - sustains peak to ~78% SoC",
    color: "#3b82f6",
    points: [
      [0, 0.25],
      [0.09, 1],
      [0.78, 1],
      [0.84, 0.7],
      [0.9, 0.38],
      [0.96, 0.18],
      [1, 0.05],
    ],
  },
  good400: {
    name: "Good 400V",
    desc: "Solid - sustains peak to ~72% SoC",
    color: "#f97316",
    points: [
      [0, 0.2],
      [0.1, 1],
      [0.72, 1],
      [0.8, 0.55],
      [0.88, 0.25],
      [0.95, 0.12],
      [1, 0.05],
    ],
  },
  mod400: {
    name: "Moderate 400V",
    desc: "Average - tapers after ~65% SoC",
    color: "#eab308",
    points: [
      [0, 0.2],
      [0.1, 1],
      [0.65, 1],
      [0.74, 0.6],
      [0.82, 0.35],
      [0.9, 0.18],
      [1, 0.05],
    ],
  },
  steep400: {
    name: "Steep 400V",
    desc: "Poor - tapers sharply after ~50% SoC",
    color: "#ef4444",
    points: [
      [0, 0.2],
      [0.1, 1],
      [0.5, 1],
      [0.62, 0.55],
      [0.72, 0.35],
      [0.8, 0.22],
      [0.9, 0.11],
      [1, 0.05],
    ],
  },
};

// Time/price options
const TIME_OPTIONS = [
  { min: 10, price: 12.5 },
  { min: 15, price: 15.5 },
  { min: 20, price: 18.5 },
  { min: 25, price: 21.5 },
  { min: 30, price: 24.5 },
];

// Constants
const STARTUP_SEC = 22;
const DCFC_EFF = 0.944;

function Calculator() {
  // Input mode
  const [inputMode, setInputMode] = useState("vehicle"); // "vehicle" or "manual"

  // Vehicle selection
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  // Manual input
  const [manualVoltage, setManualVoltage] = useState(400);
  const [manualBattery, setManualBattery] = useState(82);
  const [manualDcKw, setManualDcKw] = useState(150);
  const [manualEpa, setManualEpa] = useState(300);
  const [manualCurve, setManualCurve] = useState("mod400");

  // Charging parameters
  const [charger, setCharger] = useState("yotai");
  const [startSoc, setStartSoc] = useState(20);
  const [selectedTime, setSelectedTime] = useState(0);

  // Get unique makes
  const makes = useMemo(
    () => [...new Set(EV_DATABASE.map((v) => v.make))].sort(),
    [],
  );

  // Get models for selected make
  const models = useMemo(
    () =>
      EV_DATABASE.filter((v) => v.make === selectedMake).map((v) => v.model),
    [selectedMake],
  );

  // Get selected vehicle specs
  const vehicleSpecs = useMemo(() => {
    if (inputMode === "vehicle" && selectedMake && selectedModel) {
      const v = EV_DATABASE.find(
        (x) => x.make === selectedMake && x.model === selectedModel,
      );
      if (v)
        return {
          voltage: v.v,
          battery: v.bat,
          dcKw: v.dc,
          epa: v.epa,
          curve: v.curve,
        };
    }
    return {
      voltage: manualVoltage,
      battery: manualBattery,
      dcKw: manualDcKw,
      epa: manualEpa,
      curve: manualCurve,
    };
  }, [
    inputMode,
    selectedMake,
    selectedModel,
    manualVoltage,
    manualBattery,
    manualDcKw,
    manualEpa,
    manualCurve,
  ]);

  // Interpolate power fraction
  const getPowerFraction = (socFrac, curveKey) => {
    const pts = CURVES[curveKey].points;
    if (socFrac <= pts[0][0]) return pts[0][1];
    if (socFrac >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) {
      if (socFrac >= pts[i][0] && socFrac <= pts[i + 1][0]) {
        const t = (socFrac - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
        return pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
      }
    }
    return 1;
  };

  // Calculate constraints
  const constraints = useMemo(() => {
    const ch = CHARGERS[charger];
    const limCharger = ch.maxKw;
    const limAmps = (ch.maxAmps * vehicleSpecs.voltage) / 1000;
    const limVehicle = vehicleSpecs.dcKw;
    const peak = Math.min(limCharger, limAmps, limVehicle);

    let bottleneck = "charger";
    if (
      peak === limVehicle &&
      limVehicle <= limCharger &&
      limVehicle <= limAmps
    )
      bottleneck = "vehicle";
    else if (peak === limAmps && limAmps <= limCharger) bottleneck = "amps";

    return { peak, limCharger, limAmps, limVehicle, bottleneck };
  }, [charger, vehicleSpecs]);

  // Simulate charging
  const simulation = useMemo(() => {
    const opt = TIME_OPTIONS[selectedTime];
    const totalSec = opt.min * 60;
    const chargeSec = Math.max(0, totalSec - STARTUP_SEC);
    const steps = Math.floor(chargeSec / 6);
    const stepHr = 6 / 3600;

    let soc = startSoc / 100;
    let kwhCharger = 0;
    let pwrSum = 0;
    let peakPower = 0;
    let hitFull = false;
    let taperHit = false;

    for (let i = 0; i < steps; i++) {
      if (soc >= 1) {
        hitFull = true;
        break;
      }
      const frac = getPowerFraction(soc, vehicleSpecs.curve);
      const kw = constraints.peak * frac;
      const eCharger = kw * stepHr;
      const eBattery = eCharger * DCFC_EFF;

      kwhCharger += eCharger;
      pwrSum += kw;
      if (kw > peakPower) peakPower = kw;
      if (frac < 0.9) taperHit = true;
      soc += eBattery / vehicleSpecs.battery;
      if (soc > 1) soc = 1;
    }

    const avgKw = steps > 0 ? pwrSum / steps : 0;
    const socGained = soc - startSoc / 100;
    const milesAdded = socGained * vehicleSpecs.epa;

    return {
      finalSoc: Math.round(soc * 100),
      socGained: Math.round(socGained * 100),
      kwh: +kwhCharger.toFixed(2),
      miles: +milesAdded.toFixed(1),
      peakKw: +peakPower.toFixed(0),
      avgKw: +avgKw.toFixed(1),
      hitFull,
      taperHit,
      price: opt.price,
      duration: opt.min,
      costPerKwh: kwhCharger > 0 ? +(opt.price / kwhCharger).toFixed(2) : 0,
    };
  }, [startSoc, selectedTime, vehicleSpecs, constraints]);

  return (
    <>
      <header className="calc-header">
        <div>
          <h1>Charging Calculator</h1>
          <p>HC-MBS Site · Yotai & Winline DCFC</p>
        </div>
      </header>

      <div className="calc-grid">
        {/* Left - Inputs */}
        <div className="calc-inputs">
          {/* Vehicle Selection */}
          <section className="calc-section">
            <div className="section-title">
              <span className="section-num">01</span>
              Vehicle Specifications
            </div>

            <div className="mode-toggle">
              <button
                className={inputMode === "vehicle" ? "active" : ""}
                onClick={() => setInputMode("vehicle")}
              >
                Select Vehicle
              </button>
              <button
                className={inputMode === "manual" ? "active" : ""}
                onClick={() => setInputMode("manual")}
              >
                Manual Input
              </button>
            </div>

            {inputMode === "vehicle" ? (
              <div className="vehicle-select-grid">
                <div className="select-group">
                  <label>Make</label>
                  <select
                    value={selectedMake}
                    onChange={(e) => {
                      setSelectedMake(e.target.value);
                      setSelectedModel("");
                    }}
                  >
                    <option value="">Select Make</option>
                    {makes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="select-group">
                  <label>Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={!selectedMake}
                  >
                    <option value="">Select Model</option>
                    {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="manual-inputs">
                <div className="input-row">
                  <div className="input-group">
                    <label>Voltage</label>
                    <div className="voltage-btns">
                      <button
                        className={manualVoltage === 400 ? "active" : ""}
                        onClick={() => setManualVoltage(400)}
                      >
                        400V
                      </button>
                      <button
                        className={manualVoltage === 800 ? "active" : ""}
                        onClick={() => setManualVoltage(800)}
                      >
                        800V
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Battery (kWh)</label>
                    <input
                      type="number"
                      value={manualBattery}
                      onChange={(e) => setManualBattery(+e.target.value || 0)}
                    />
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>Max DC Rate (kW)</label>
                    <input
                      type="number"
                      value={manualDcKw}
                      onChange={(e) => setManualDcKw(+e.target.value || 0)}
                    />
                  </div>
                  <div className="input-group">
                    <label>EPA Range (mi)</label>
                    <input
                      type="number"
                      value={manualEpa}
                      onChange={(e) => setManualEpa(+e.target.value || 0)}
                    />
                  </div>
                </div>
                <div className="input-group full">
                  <label>Charging Curve</label>
                  <div className="curve-grid">
                    {Object.entries(CURVES).map(([key, c]) => (
                      <button
                        key={key}
                        className={`curve-btn ${manualCurve === key ? "active" : ""}`}
                        onClick={() => setManualCurve(key)}
                        style={{ "--c": c.color }}
                      >
                        <span className="curve-name">{c.name}</span>
                        <span className="curve-desc">{c.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Specs Display */}
            {(inputMode === "vehicle" && selectedModel) ||
            inputMode === "manual" ? (
              <div className="specs-chips">
                <span className="chip">{vehicleSpecs.battery} kWh</span>
                <span className="chip">{vehicleSpecs.dcKw} kW max</span>
                <span className="chip">{vehicleSpecs.epa} mi EPA</span>
                <span className="chip">{vehicleSpecs.voltage}V</span>
                <span
                  className="chip"
                  style={{
                    background: `${CURVES[vehicleSpecs.curve].color}20`,
                    color: CURVES[vehicleSpecs.curve].color,
                    borderColor: CURVES[vehicleSpecs.curve].color,
                  }}
                >
                  {CURVES[vehicleSpecs.curve].name}
                </span>
              </div>
            ) : null}
          </section>

          {/* Charger Selection */}
          <section className="calc-section">
            <div className="section-title">
              <span className="section-num">02</span>
              Select Charger
            </div>
            <div className="charger-cards">
              {Object.entries(CHARGERS).map(([key, ch]) => (
                <div
                  key={key}
                  className={`charger-card ${charger === key ? "selected" : ""}`}
                  onClick={() => setCharger(key)}
                >
                  <div className="charger-name">{ch.name}</div>
                  <div className="charger-id">{ch.id}</div>
                  <div className="charger-specs">
                    Max {ch.maxKw} kW · {ch.maxAmps}A/port
                  </div>
                  {charger === key && <div className="charger-check">✓</div>}
                </div>
              ))}
            </div>
            <div className="power-limits">
              <div className="limit-title">Power Limits</div>
              <div
                className={`limit-item ${constraints.bottleneck === "charger" ? "active" : ""}`}
              >
                <span className="limit-dot" />
                Charger: {constraints.limCharger} kW
                {constraints.bottleneck === "charger" && (
                  <span className="limit-tag">← limit</span>
                )}
              </div>
              <div
                className={`limit-item ${constraints.bottleneck === "amps" ? "active" : ""}`}
              >
                <span className="limit-dot" />
                {CHARGERS[charger].maxAmps}A × {vehicleSpecs.voltage}V ={" "}
                {constraints.limAmps.toFixed(0)} kW
                {constraints.bottleneck === "amps" && (
                  <span className="limit-tag">← limit</span>
                )}
              </div>
              <div
                className={`limit-item ${constraints.bottleneck === "vehicle" ? "active" : ""}`}
              >
                <span className="limit-dot" />
                Vehicle BMS: {constraints.limVehicle} kW
                {constraints.bottleneck === "vehicle" && (
                  <span className="limit-tag">← limit</span>
                )}
              </div>
              <div className="effective-peak">
                Peak Power: <strong>{constraints.peak.toFixed(0)} kW</strong>
              </div>
            </div>
          </section>

          {/* SoC & Time */}
          <section className="calc-section">
            <div className="section-title">
              <span className="section-num">03</span>
              Starting Battery & Duration
            </div>
            <div className="soc-time-row">
              <div className="soc-input">
                <label>Start SoC</label>
                <div className="soc-control">
                  <input
                    type="number"
                    value={startSoc}
                    onChange={(e) =>
                      setStartSoc(
                        Math.max(1, Math.min(99, +e.target.value || 1)),
                      )
                    }
                  />
                  <span>%</span>
                </div>
                <div
                  className="soc-bar"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setStartSoc(
                      Math.max(
                        1,
                        Math.min(
                          99,
                          Math.round(
                            ((e.clientX - rect.left) / rect.width) * 100,
                          ),
                        ),
                      ),
                    );
                  }}
                >
                  <div className="soc-fill" style={{ width: `${startSoc}%` }} />
                </div>
              </div>
              <div className="time-options">
                <label>Duration</label>
                <div className="time-btns">
                  {TIME_OPTIONS.map((opt, idx) => (
                    <button
                      key={opt.min}
                      className={selectedTime === idx ? "active" : ""}
                      onClick={() => setSelectedTime(idx)}
                    >
                      <span className="time-min">{opt.min}</span>
                      <span className="time-label">min</span>
                      <span className="time-price">${opt.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right - Results */}
        <div className="calc-results">
          <div className="results-card">
            <div className="results-header">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Session Estimate
            </div>

            <div className="results-grid">
              <div className="result-item">
                <div className="result-label">Final SoC</div>
                <div className="result-value green">{simulation.finalSoc}%</div>
                <div className="result-sub">
                  +{simulation.socGained}% gained
                </div>
              </div>
              <div className="result-item">
                <div className="result-label">Miles Added</div>
                <div className="result-value blue">+{simulation.miles}</div>
                <div className="result-sub">EPA estimate</div>
              </div>
              <div className="result-item">
                <div className="result-label">Energy</div>
                <div className="result-value">
                  {simulation.kwh} <span>kWh</span>
                </div>
                <div className="result-sub">${simulation.costPerKwh}/kWh</div>
              </div>
              <div className="result-item">
                <div className="result-label">Cost</div>
                <div className="result-value orange">
                  ${simulation.price.toFixed(2)}
                </div>
                <div className="result-sub">{simulation.duration} min</div>
              </div>
            </div>

            <div className="battery-viz">
              <div className="viz-label">Battery Level</div>
              <div className="viz-row">
                <span className="viz-start">{startSoc}%</span>
                <div className="viz-bar">
                  <div
                    className="viz-existing"
                    style={{ width: `${startSoc}%` }}
                  />
                  <div
                    className="viz-gained"
                    style={{
                      left: `${startSoc}%`,
                      width: `${Math.max(0, simulation.finalSoc - startSoc)}%`,
                    }}
                  />
                </div>
                <span className="viz-end">{simulation.finalSoc}%</span>
              </div>
            </div>

            <div className="power-viz">
              <div className="viz-label">
                Power Delivery
                <span
                  className="curve-tag"
                  style={{ color: CURVES[vehicleSpecs.curve].color }}
                >
                  {CURVES[vehicleSpecs.curve].name}
                </span>
              </div>
              <div className="power-bar-group">
                <div className="power-bar-label">
                  Peak: {simulation.peakKw} kW
                </div>
                <div className="power-bar">
                  <div
                    className="power-fill peak"
                    style={{ width: `${(simulation.peakKw / 250) * 100}%` }}
                  />
                </div>
              </div>
              <div className="power-bar-group">
                <div className="power-bar-label">
                  Avg: {simulation.avgKw} kW
                </div>
                <div className="power-bar">
                  <div
                    className="power-fill avg"
                    style={{ width: `${(simulation.avgKw / 250) * 100}%` }}
                  />
                </div>
              </div>
              <div className="power-note">
                Avg ={" "}
                {simulation.peakKw > 0
                  ? Math.round((simulation.avgKw / simulation.peakKw) * 100)
                  : 0}
                % of peak
              </div>
            </div>

            {/* Alerts */}
            {simulation.hitFull && (
              <div className="alert green">
                ✓ Battery reached 100% before time expired
              </div>
            )}
            {constraints.bottleneck === "amps" &&
              vehicleSpecs.voltage === 400 &&
              charger === "winline" && (
                <div className="alert orange">
                  ⚠ 400V vehicle amp-limited to {constraints.limAmps.toFixed(0)}{" "}
                  kW on Winline. Yotai allows up to{" "}
                  {Math.min(180, (400 * 400) / 1000).toFixed(0)} kW.
                </div>
              )}
            {simulation.taperHit && !simulation.hitFull && (
              <div className="alert blue">
                ℹ BMS tapering was active during this session
              </div>
            )}
          </div>

          {/* Site Info */}
          <div className="site-card">
            <div className="site-header">Site: {SITE_CONFIG.name}</div>
            <div className="site-grid">
              <div className="site-item">
                <div className="site-label">PCS</div>
                <div className="site-value">{SITE_CONFIG.pcs.capacity} kW</div>
              </div>
              <div className="site-item">
                <div className="site-label">Battery</div>
                <div className="site-value">
                  {SITE_CONFIG.battery.capacity} kWh
                </div>
              </div>
              <div className="site-item">
                <div className="site-label">DCFC 1</div>
                <div className="site-value">{CHARGERS.winline.maxKw} kW</div>
              </div>
              <div className="site-item">
                <div className="site-label">DCFC 2</div>
                <div className="site-value">{CHARGERS.yotai.maxKw} kW</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Calculator;
