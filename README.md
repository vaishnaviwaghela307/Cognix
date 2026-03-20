# Cognix

<div align="center">
  <h3>A Comprehensive Assessment & Analysis Platform</h3>
  <br />
</div>

## 📖 Overview

Cognix is an advanced mobile application and backend ecosystem designed for various analytical and assessment capabilities, including clinical tests, speech assessments, document scanning, and optical character recognition (OCR). The platform is divided into three main components: a versatile mobile client, a robust primary backend server, and a specialized machine learning Flask server.

## 🏗️ Project Architecture

The repository is structured into three main directories, each serving a specific role in the ecosystem:

### 1. 📱 `cognix-mobile`
The frontend mobile application built to provide a seamless user interface for test conduction and reporting.
- **Key Features:** Clinical Tests, Speech Assessment, Document Scanning, History Tracking, and Detailed Test Reports.
- **Tech Stack:** React Native / Expo (TypeScript)

### 2. 🗄️ `cognix-server`
The central primary backend server that manages application data, user histories, and core backend logic.
- **Key Features:** API Routing, Data Persistence, History Management, and core app APIs.
- **Tech Stack:** Node.js, Express.js

### 3. 🧠 `cognix-flask-server`
A dedicated Python-based machine learning inference server handling compute-intensive tasks.
- **Key Features:** Advanced Speech Assessment processing, Optical Character Recognition (OCR), and complex analysis.
- **Tech Stack:** Python, Flask, TensorFlow, Docker

## 🚀 Getting Started

To run the full stack locally, you will need to set up each component individually. Please refer to the specific configuration within each directory for detailed setup instructions.

### Prerequisites
- Node.js & npm / yarn / pnpm (for the mobile app and primary server)
- Python 3.x & pip / Docker (for the Flask ML server)

### Quick Start Overview

1. **Start Database Services:**
   Ensure your local or remote database instances (e.g., MongoDB, PostgreSQL) required by `cognix-server` are running.

2. **Run the Flask ML Server:**
   ```bash
   cd cognix-flask-server
   # Run via Docker or standard Python environment
   ```

3. **Run the Primary Backend Server:**
   ```bash
   cd cognix-server
   npm install
   npm run dev
   ```

4. **Run the Mobile Application:**
   ```bash
   cd cognix-mobile
   npm install
   npx expo start
   ```

## 🛠️ Configuration & Best Practices

**Network IP Management:** 
For the mobile application to successfully communicate with the backend servers locally, ensure the API base URLs in `cognix-mobile/services/` (such as `api.ts`, `backend-api.ts`, etc.) are correctly pointing to your local machine's current Wi-Fi/Network IP address.

## 📄 License

*This project is proprietary. Add relevant license information here.*
