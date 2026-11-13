# 🚀 AstroGalen — Astronaut Health & Wellness Companion

> An offline-first Progressive Web App that helps spacefarers track their physical and mental well-being on Earth, the ISS, the Moon, or on the way to Mars. Built for the **NASA Space Apps Challenge 2026**.

AstroGalen pairs a simulated onboard medical-sensor suite with **real NASA data** — live radiation measurements, space-weather alerts, and actual spaceflight health studies — wrapped in a mission-style dashboard with a friendly AI companion named **ORBI**.

---

## ✨ Features

### 🛰️ Mission Dashboard (Home)
- **12 live sensor cards** — heart rate, blood pressure, sleep, activity, body temperature, blood oxygen, radiation dose (absorbed & equivalent), cabin CO₂, cabin pressure and cabin temperature, all updating smoothly every **10 seconds**.
- **Real NASA panels** side-by-side with the sensors:
  - **RadLab radiation** — actual dose-rate measurements from the NASA RadLab visualization API, with data timestamps and a "data age" label.
  - **DONKI space weather** — the latest solar flares (FLR), coronal mass ejections (CME), geomagnetic storms (GST) and solar energetic particle events (SEP) from NASA's CCMC.
- **Health alerts** — automatic awareness when any simulated reading leaves its healthy threshold range.
- Everything is clearly labeled **DEMO · simulated device** — the app never passes simulation off as a real device, and missing devices show **"Not Installed"** instead of invented numbers.

### 🧑‍🚀 ORBI — Your Journey Companion
- A full-body animated astronaut avatar who **flies from Earth to the Moon as you complete your two daily assessments**.
- Complete both today's Physical and Mental check-ins → ORBI launches into flight → a **"Mission Accomplished"** celebration overlay when he arrives.
- The journey state persists across sessions — no replaying the flight on refresh, no lost progress.

### 📋 Daily Assessments
- **Physical check-in** — muscle/joint soreness, fatigue, sleep quality, hydration, appetite, vision, plus optional bone-density and eye-exam lab values (prefilled from sensor data where available).
- **Mental check-in** — stress, mood, focus, loneliness, workload and restfulness.
- Exactly **two assessments per day**, each with a transparent disclaimer that this is wellness tracking, **not a medical diagnosis**.

### 🩺 Medical Tests
- A test console for **ECG, ultrasound, blood pressure, glucose, pulse oximetry, temperature, blood/urine lab analysis and eye examination**.
- Equipment availability depends on the **mission environment** you select (ISS, Lunar Surface, Rover, Mars Transit) — e.g. the ECG is available on the ISS, but the eye-exam set only on larger habitats. Ultrasound and other tests respect the configured inventory.
- The **ECG demo** draws a clearly-labeled simulated waveform you can connect to, watch, and save as a test record.
- Every test explains **what it measures** and **why it matters in spaceflight** (SANS eye screening, fluid-shift blood-pressure trends, closed-habitat fever screening, and more).

### 🫀 Body Explorer
- An interactive human-body map that connects symptoms and body regions to spaceflight-related health context.

### 📈 Insights & History
- Trend charts and sparklines for every metric over time, built from your assessment history and sensor log.
- All data is stored locally in **IndexedDB** (Dexie) — your history survives refreshes and works fully offline.

### 💬 Offline AI Assistant
- A rule-based conversational assistant that runs **entirely on-device** — it works with no internet connection.
- Answers questions about symptoms, the mission environment, radiation and space-weather context, and can escalate to an **urgent-care path** when needed.
- Backed by **NASA Human Research Program (HRP)** knowledge — spaceflight hazards and risks — with links to official NASA sources.
- It **never diagnoses**; it offers wellness guidance and always points to the crew medical officer for anything urgent.

### 📄 Medical Report
- Generates a consolidated health report of your assessments, test records and trends.
- **Local export** as PDF (jsPDF) / JSON — always available, even offline.
- Optional **secure delivery**: set a `REPORT_WEBHOOK_URL` environment variable and the report can be sent to a mission medical system over HTTPS.

### ⚙️ Settings
- Switch the **mission environment** (ISS / Lunar Surface / Rover / Mars Transit) — instantly changes sensor and medical-test availability.
- **Equipment inventory editor** — toggle which medical devices your habitat carries.
- Light & dark themes, offline status indicator, and local profile login.

### 📴 Offline-First PWA
- Installable on desktop and mobile; a service worker keeps the app usable with **zero connectivity**.
- Sensor simulation, assessments, the assistant, charts and reports all work in airplane mode.
- Toast notifications (top-right) confirm every important action.

---

## 🛰️ NASA APIs Used

| API | What it provides | Where it appears |
|---|---|---|
| **NASA RadLab** (`visualization.osdr.nasa.gov/radlab/api`) | Real space-radiation dose measurements (absorbed dose, dose rates) for LEO and beyond-LEO missions | Dashboard radiation panel + simulated radiation readings calibrated from it |
| **NASA DONKI** (`ccmc.gsfc.nasa.gov/DONKI-API`) | Space-weather event data — Solar Flares (FLR), Coronal Mass Ejections (CME), Geomagnetic Storms (GST), Solar Energetic Particles (SEP) | Dashboard space-weather panel |
| **NASA OSDR** (`osdr.nasa.gov/osdr/data/search`) | The Open Science Data Repository — real spaceflight biology/health studies | "Related studies" in the guidance dialogs |
| **NASA Human Research Program** (`nasa.gov/hrp`) | Official hazards & risks knowledge base (reference links, not an API) | AI assistant guidance and health context |

All API calls are made through **server-side Next.js API routes** (`/api/nasa/*`) that cache responses in IndexedDB — so the dashboard keeps showing the last known data (with its age) when you're offline or NASA is unreachable.

---

## 🛠️ Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with a custom `orbit-*` design system (mission-control aesthetic)
- **Dexie / IndexedDB** for offline data storage
- **Recharts** for trend charts, **Framer Motion** for ORBI's flight
- **jsPDF** for report export, **Sonner** for toasts, **lucide-react** icons
- **PWA** with a hand-rolled service worker (`public/sw.js`)

---

## 🚦 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
# → http://localhost:3000

# 3. Run the test suite
npm test

# 4. Production build
npm run build && npm start
```

### Environment variables (all optional)

| Variable | Purpose |
|---|---|
| `REPORT_WEBHOOK_URL` | HTTPS endpoint to deliver generated medical reports (e.g. mission medical system). Without it, local PDF/JSON export remains available. |
| `REPORT_WEBHOOK_TOKEN` | Optional bearer token sent as `Authorization` with the report webhook. |

---

## 📁 Project Structure (key paths)

```
src/
├─ app/                  # Pages: dashboard, assessments, medical-tests,
│  │                     # assistant, insights, body, report, settings
│  └─ api/               # Server routes: /api/nasa/* (RadLab, DONKI, OSDR),
│                        # /api/sensors/*, /api/report/send
├─ components/           # Dashboard, ORBI avatar, starfield, navbar, forms…
├─ lib/                  # sensor-sim, nasa-guidance, journey, equipment,
│                        # db (Dexie), assistant, insights, thresholds
└─ tests/                # Unit tests (node:test via tsx)
```

---

## ⚕️ Important Disclaimer

AstroGalen is a **demonstration and wellness-tracking tool**, not a medical device. It does **not** diagnose conditions. All sensor data in this prototype is simulated and permanently labeled **DEMO**; all guidance points toward the crew medical officer. For real medical concerns, consult qualified medical personnel.

---

*Built with ❤️ for NASA Space Apps Challenge 2026. Data courtesy of NASA Open Science Data Repository, NASA CCMC DONKI, and NASA RadLab.*
