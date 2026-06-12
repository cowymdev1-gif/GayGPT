# GayGPT™ v2 — Advanced Gaydar Scanner

A viral entertainment website built with vanilla HTML, CSS, and JavaScript.
Runs 100% in the browser. No backend. No API keys. No Node.js required.

---

## Project Structure

```
gaygpt-v2/
├── index.html        ← Main HTML (all screens)
├── styles.css        ← Complete dark-mode stylesheet
├── app.js            ← Screen routing + app controller
├── js/
│   ├── roasts.js     ← 100+ roast lines + verdict system
│   ├── face.js       ← MediaPipe FaceMesh scoring
│   ├── voice.js      ← Web Audio API voice analysis
│   ├── performance.js← MediaPipe Pose performance scoring
│   └── results.js    ← Results screen rendering
└── README.md
```

---

## How to Run

### Option 1: VS Code Live Server (recommended)

1. Open the `gaygpt-v2/` folder in VS Code
2. Install the **Live Server** extension (ritwickdey.liveserver)
3. Right-click `index.html` → **Open with Live Server**
4. Browser opens at `http://127.0.0.1:5500`

> **Important:** MediaPipe requires a proper HTTP server (not `file://`).
> Live Server handles this automatically.

### Option 2: Python HTTP server

```bash
cd gaygpt-v2
python3 -m http.server 8080
# Open http://localhost:8080
```

### Option 3: Any static file server

Serve the folder root over HTTP. The `file://` protocol will NOT work
because MediaPipe loads WASM files via fetch.

---

## Permissions Required

| Feature | Permission |
|---------|-----------|
| Face Scanner | Camera |
| Voice Scanner | Microphone |
| Performance Challenge | Camera |

All permissions are requested when each stage begins.
If denied, the app falls back to estimated scores so the flow still works.

---

## Scoring System

### Face Energy (40% of final score)
Calculated from live MediaPipe FaceMesh landmarks:
- **Smile intensity** — mouth corner width vs face height ratio
- **Eyebrow raise** — brow-to-eye vertical gap normalised to face
- **Eye openness** — vertical/horizontal eye dimension ratio
- **Head tilt** — angle of eye-line from horizontal
- **Facial asymmetry** — left/right landmark height differences
- **Expressiveness** — weighted compound of all sub-scores

### Voice Energy (30% of final score)
Calculated from 10 seconds of Web Audio API data:
- **Average pitch** — autocorrelation pitch detection at 100ms intervals
- **Pitch variability** — standard deviation of detected pitches
- **Volume variability** — RMS amplitude standard deviation
- **Speaking rate** — pitch detection events per second
- **Drama index** — combined pitch + volume expressiveness
- **Energy bursts** — count of sudden volume spikes (>1.8x previous)

### Performance Energy (30% of final score)
Calculated from 8 seconds of MediaPipe Pose tracking:
- **Hand speed** — maximum wrist velocity across frames
- **Arm extension** — wrist distance from shoulder / torso height
- **Body movement** — hip center velocity
- **Head movement** — nose landmark velocity
- **Enthusiasm** — aggregate velocity across key landmarks
- **Drama index** — peak-to-average wrist velocity ratio

---

## Fallback Behaviour

If camera or microphone is denied, each module generates plausible
random scores in the expected range so the complete flow still works.

---

## Entertainment Disclaimer

This is a parody/entertainment product. It does not determine, infer,
or claim to assess sexual orientation. All results are generated for
humour. The "scores" reflect expressiveness, energy, and movement
rather than anything about a person's identity.

---

## Tech Stack

- **MediaPipe FaceMesh** — facial landmark detection (468 points)
- **MediaPipe Pose** — full-body pose detection (33 landmarks)
- **Web Audio API** — real-time pitch + volume analysis
- **Syne + DM Mono** — Google Fonts (loaded via CDN)
- Zero frameworks. Zero build steps. Zero dependencies to install.
