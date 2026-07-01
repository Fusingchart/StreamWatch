# StreamWatch

**Turns citizen pollution reports into real-time water safety information for Washington's 1st Congressional District.**

StreamWatch is an iOS app built for the [Congressional App Challenge 2026](https://www.congressionalappchallenge.us/). It closes the loop between spotting pollution and knowing whether it's safe to swim:

**Report → Resolve → Protect**

1. **Report** — anyone photographs a waterway; a YOLOv8 model instantly classifies the pollution type and the report is automatically routed to the right environmental agency.
2. **Resolve** — the community or the notified agency (via a one-click email link) marks the issue cleared once it's cleaned up, so the map always reflects current conditions, not stale reports.
3. **Protect** — that live report data is combined with official EPA and King County water-quality monitoring to tell nearby residents, in real time, whether a beach is safe to swim at.

---

## Features

- **AI Classification** — YOLOv8 model (via Roboflow) identifies oil sheen, foam/suds, algal bloom, discoloration, solid debris, or clean water from a photo
- **Auto Agency Routing** — high-severity reports are emailed to the correct county or state agency automatically
- **Resolution Tracking** — reports can be marked resolved by the community or by the agency itself via a secure email link, keeping the map and safety data current
- **Swim Safety** — combines official water quality data (EPA BEACON, King County) with nearby unresolved StreamWatch reports to rate WA-01 beaches Safe / Caution / Avoid
- **Downstream Impact Cards** — every report shows which beaches, salmon habitat, shellfish beds, and drinking water intakes are at risk downstream
- **Waterway Health Scores** — live 0–100 scores with trend tracking across 8 WA-01 waterways
- **Community Map** — real-time map of all sightings with severity markers
- **Sighting History** — full detail view with hero photo, mini map, resolution status, and agency notification status
- **Anonymous by default** — Firebase anonymous auth, no account required

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo SDK 56 (React Native, TypeScript) |
| Routing | expo-router (file-based) |
| AI | Roboflow YOLOv8 inference API |
| Backend | Firebase (Firestore, Storage, Anonymous Auth) |
| Notifications | Cloud Functions v2 + SendGrid |
| Maps | react-native-maps (Apple Maps) |
| State | Zustand |
| UI | expo-blur, expo-linear-gradient, lucide-react-native |

## Project Structure

```
app/
├── (tabs)/
│   ├── index.tsx        # Camera + classify + stats
│   ├── map.tsx           # Community map + waterway health
│   ├── safety.tsx        # Swim Safety (EPA/King County + reports)
│   └── history.tsx       # Sighting list
├── confirm.tsx          # Review & submit report
├── onboarding.tsx       # First-launch onboarding
└── sighting/[id].tsx    # Sighting detail + mark resolved

src/
├── components/          # Shared UI (DownstreamCard)
├── constants/           # Theme, pollution class definitions
├── data/                # Downstream POIs, waterway definitions, beach spots
├── services/            # Firebase, Roboflow, sightings API, beach safety
├── store/               # Zustand app state
├── types/               # TypeScript interfaces
└── utils/               # Geocoding, agency routing

functions/               # Firebase Cloud Functions (email alerts + resolve endpoint)
```

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode 16+ with iOS 15+ simulator or device
- Firebase project (Blaze plan for Storage + Functions)
- Roboflow account with a trained model
- SendGrid account for email alerts

### 1. Clone and install

```bash
git clone https://github.com/Fusingchart/StreamWatch.git
cd StreamWatch
npm install
```

### 2. Configure environment variables

Copy the example and fill in your credentials:

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

EXPO_PUBLIC_ROBOFLOW_API_KEY=
EXPO_PUBLIC_ROBOFLOW_MODEL_ID=      # e.g. streamwatch/1
```

### 3. Set up Firestore indexes

The sightings query requires a composite index. On first run, the app logs a Firebase console URL — click it to create the index automatically.

### 4. Run on iOS

```bash
# Development build (required — Expo Go is not supported)
npx expo run:ios

# Physical device
npx expo run:ios --device
```

> **iOS 27 beta users:** The `EXPO_USE_PRECOMPILED_MODULES=false` flag is set in `ios/Podfile.properties.json` and a `SceneDelegate` stub is included to work around beta compatibility issues.

### 5. Deploy Cloud Functions (optional)

Required for agency email alerts:

```bash
cd functions
npm install
firebase functions:secrets:set SENDGRID_API_KEY
firebase deploy --only functions
```

## Pollution Classes

| Class | Severity | Typical Agency |
|---|---|---|
| Oil sheen | HIGH | WA Dept. of Ecology |
| Foam / suds | HIGH | WA Dept. of Ecology |
| Algal bloom | MEDIUM | County Health or Ecology |
| Discoloration | MEDIUM | County Health or Ecology |
| Solid debris | MEDIUM | County Public Works |
| Clean water | NONE | — |

## WA-01 Waterways Monitored

Snohomish River · Stillaguamish River · Pilchuck River · Wallace River · Sultan River · Skykomish River · Sammamish River · Lake Stevens

## Swim Safety Data Sources

| Water type | Source | Signal used |
|---|---|---|
| Saltwater beaches (Puget Sound) | EPA BEACON | Advisory/closure status |
| Freshwater beaches (King County lakes) | King County Environmental Health | 30-day bacteria geometric mean vs. WA DOH action threshold (126 CFU/100mL) |
| All beaches | StreamWatch reports | Unresolved, non-clean reports within 3 km in the last 7 days escalate the rating |

Official data and community reports are combined into a single Safe / Caution / Avoid rating per beach.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

---

*Built for the Congressional App Challenge 2026, representing Washington's 1st Congressional District.*
