<div align="center">

<br />

<img src="https://img.shields.io/badge/version-1.0.0-0A84FF?style=for-the-badge&labelColor=0D0D0D" />
<img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android-0A84FF?style=for-the-badge&labelColor=0D0D0D" />
<img src="https://img.shields.io/badge/license-Proprietary-FF453A?style=for-the-badge&labelColor=0D0D0D" />
<img src="https://img.shields.io/badge/status-Active-30D158?style=for-the-badge&labelColor=0D0D0D" />

<br /><br />

<pre align="center">
   ██████╗ ██████╗  ██████╗ ███╗   ██╗██╗██╗  ██╗
  ██╔════╝██╔═══██╗██╔════╝ ████╗  ██║██║╚██╗██╔╝
  ██║     ██║   ██║██║  ███╗██╔██╗ ██║██║ ╚███╔╝
  ██║     ██║   ██║██║   ██║██║╚██╗██║██║ ██╔██╗
  ╚██████╗╚██████╔╝╚██████╔╝██║ ╚████║██║██╔╝ ██╗
   ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝
</pre>

### **Comprehensive Assessment & Intelligent Analysis Platform**

*Clinical intelligence. Speech analytics. Document cognition — unified.*

<br />

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 Overview

**Cognix** is an enterprise-grade, full-stack assessment and analytics platform engineered for precision. It unifies clinical test conduction, real-time speech evaluation, intelligent document scanning, and optical character recognition into a single cohesive ecosystem — accessible from a cross-platform mobile interface and powered by a cloud-ready backend.

The platform is purpose-built for environments that demand accuracy, performance, and reliability: healthcare, research, and enterprise diagnostics.

> **Core Philosophy:** Bring machine-learning intelligence to the edge — fast, reliable, and human-centered.

---

## 🏗️ Architecture

Cognix is a **tri-service architecture** designed for scalability and clear separation of concerns. Each component operates independently and communicates over well-defined APIs.

```
┌─────────────────────────────────────────────────────────────────┐
│                         COGNIX PLATFORM                         │
│                                                                  │
│  ┌─────────────────┐        ┌──────────────────────────────┐   │
│  │                 │  HTTP  │                              │   │
│  │  cognix-mobile  │◄──────►│      cognix-server           │   │
│  │                 │        │  (Node.js / Express.js)      │   │
│  │  React Native   │        │                              │   │
│  │  Expo / TS      │        └──────────────┬───────────────┘   │
│  │                 │                        │  Internal API      │
│  └─────────────────┘                        ▼                   │
│                               ┌─────────────────────────┐      │
│                               │   cognix-flask-server    │      │
│                               │  (Python / Flask / TF)   │      │
│                               │   ML Inference Engine    │      │
│                               └─────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

<br />

### `cognix-mobile` — Cross-Platform Client

> The primary interface for end-users. Designed for reliability and clarity.

| Feature | Description |
|---|---|
| 🩺 **Clinical Tests** | Conduct and record standardized clinical assessments |
| 🎙️ **Speech Assessment** | Real-time speech recording and submission for ML analysis |
| 📄 **Document Scanning** | In-app document capture and submission pipeline |
| 📊 **Detailed Reports** | Full assessment result breakdowns and visualizations |
| 🕓 **History Tracking** | Persistent session history with search and filtering |

<br />

### `cognix-server` — Primary Backend

> The data and logic backbone. Handles all persistent state, routing, and coordination.

| Feature | Description |
|---|---|
| 🔀 **API Routing** | RESTful API layer for all client-server communication |
| 💾 **Data Persistence** | Manages user sessions, records, and assessment history |
| 🔒 **Auth & Access Control** | Secure user and session management |
| 🔗 **ML Server Bridge** | Routes ML-bound requests to the Flask inference server |

<br />

### `cognix-flask-server` — ML Inference Engine

> The intelligence core. Handles all compute-intensive analysis workloads.

| Feature | Description |
|---|---|
| 🎙️ **Speech Processing** | Deep analysis of recorded speech using trained TF models |
| 🔍 **OCR Engine** | Extracts and structures text from scanned documents |
| 🧬 **ML Inference** | Scalable model inference with TensorFlow backend |
| 🐳 **Docker-Ready** | Fully containerized for consistent, portable deployment |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Mobile Client** | React Native, Expo, TypeScript |
| **Primary Backend** | Node.js, Express.js |
| **ML Server** | Python 3.x, Flask, TensorFlow |
| **Databases** | MongoDB / PostgreSQL |
| **Containerization** | Docker |
| **Package Management** | npm / yarn / pip |

---

## 🚀 Getting Started

### Prerequisites

Ensure the following are installed on your development machine before proceeding.

```
Node.js        >= 18.x
npm / yarn     (latest stable)
Python         >= 3.9
pip            (latest stable)
Docker         >= 24.x         (for the Flask ML server)
Expo CLI       >= 6.x
```

---

### Installation

Clone the repository and set up each service individually.

```bash
git clone https://github.com/your-org/cognix.git
cd cognix
```

<br />

**Step 1 — Start Database Services**

Ensure your MongoDB and/or PostgreSQL instances are running before starting any server.

```bash
# Example: start MongoDB locally
mongod --dbpath /your/db/path
```

<br />

**Step 2 — Launch the ML Inference Server**

```bash
cd cognix-flask-server

# Option A: Docker (Recommended)
docker build -t cognix-flask .
docker run -p 5000:5000 cognix-flask

# Option B: Standard Python Environment
pip install -r requirements.txt
python app.py
```

> ✅ Flask server will be available at `http://localhost:5000`

<br />

**Step 3 — Launch the Primary Backend Server**

```bash
cd cognix-server

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env

# Start the development server
npm run dev
```

> ✅ Backend API will be available at `http://localhost:3000`

<br />

**Step 4 — Launch the Mobile Application**

```bash
cd cognix-mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

> ✅ Scan the QR code with Expo Go (iOS / Android) or launch a simulator.

---

## ⚙️ Configuration

### Network IP Management

When running locally, the mobile application must point to your machine's active local IP address — **not** `localhost` — as physical/emulated devices communicate over the network.

Update the base URLs in `cognix-mobile/services/`:

```typescript
// cognix-mobile/services/api.ts
const BASE_URL = "http://192.168.x.x:3000";  // ← Replace with your local IP

// cognix-mobile/services/backend-api.ts
const ML_BASE_URL = "http://192.168.x.x:5000";  // ← Replace with your local IP
```

> 💡 **Tip:** Run `ipconfig` (Windows) or `ifconfig` / `ip a` (macOS/Linux) to find your current Wi-Fi IP address.

### Environment Variables

Each server requires its own `.env` configuration. Refer to the `.env.example` file within each service directory for the full list of required variables.

| Variable | Service | Description |
|---|---|---|
| `PORT` | `cognix-server` | HTTP port for the backend |
| `MONGO_URI` | `cognix-server` | MongoDB connection string |
| `FLASK_ENV` | `cognix-flask-server` | Flask environment (`development` / `production`) |
| `MODEL_PATH` | `cognix-flask-server` | Path to the TF model artifacts |

---

## 📁 Project Structure

```
cognix/
├── cognix-mobile/               # React Native / Expo application
│   ├── app/                     # Screens and navigation
│   ├── components/              # Reusable UI components
│   ├── services/                # API service layer
│   │   ├── api.ts
│   │   └── backend-api.ts
│   └── assets/                  # Static assets
│
├── cognix-server/               # Node.js / Express.js backend
│   ├── src/
│   │   ├── routes/              # API route definitions
│   │   ├── controllers/         # Business logic
│   │   ├── models/              # Database models
│   │   └── middleware/          # Auth and utility middleware
│   └── .env.example
│
└── cognix-flask-server/         # Python / Flask ML server
    ├── models/                  # TF model artifacts
    ├── routes/                  # Inference endpoints
    ├── utils/                   # OCR and processing utilities
    ├── Dockerfile
    └── requirements.txt
```

---

## 🤝 Contributing

Contributions, improvements, and bug reports are welcome. Please follow the steps below:

1. **Fork** this repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** your changes: `git commit -m "feat: add your feature description"`
4. **Push** to your branch: `git push origin feature/your-feature-name`
5. **Open** a Pull Request against `main`

Please ensure your code adheres to the project's existing style and all tests pass before submitting.

---

## 📄 License

This project is **proprietary and confidential**.  
Unauthorized copying, distribution, or modification of this software, in whole or in part, is strictly prohibited without explicit written permission from the authors.

© 2025 Cognix. All rights reserved.

---

<div align="center">

**Built with precision. Designed for intelligence.**

<br />

<img src="https://img.shields.io/badge/React_Native-20232A?style=flat-square&logo=react&logoColor=61DAFB" />
<img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=flat-square&logo=tensorflow&logoColor=white" />
<img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/Flask-000000?style=flat-square&logo=flask&logoColor=white" />

</div>
