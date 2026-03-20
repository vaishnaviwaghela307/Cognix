# 🧠 Cognix - Cognitive Disease Prediction App

A professional mobile application for predicting cognitive diseases using AI/ML models.

## ✨ Features

- **6 Disease Predictions**: Alzheimer's, Parkinson's, MCI, Vascular Dementia, FTD, LBD
- **Hybrid ML Model**: Combines individual and multi-class predictions
- **Professional UI**: Modern, clean design with color-coded diseases
- **Real-time Predictions**: Instant results from Flask ML backend
- **No Authentication Required**: Direct access to all features

## 🚀 Quick Start

### Prerequisites

- Node.js installed
- Expo CLI
- Flask backend running on port 5000

### Installation

```bash
# Install dependencies
npm install

# Start the app
npx expo start
```

### Testing

1. **Scan QR code** with Expo Go app (Android/iOS)
2. **Or press 'w'** to open in web browser
3. **Or press 'a'** to open Android emulator

## 📱 How to Use

1. **Home Screen**: Overview of diseases and features
2. **Assessment Tab**:
   - Enter patient data (minimum: MMSE Score + Age)
   - Tap "Get Prediction"
   - View detailed results with confidence scores
3. **History Tab**: View past assessments (coming soon)
4. **Resources Tab**: Learn about cognitive diseases
5. **Profile Tab**: App information and settings

## 🎨 Design System

- **Primary Color**: Indigo (#6366F1)
- **Disease Colors**: Each disease has a unique color
- **Typography**: Professional hierarchy (H1-H4, body, captions)
- **Spacing**: Consistent 4px grid system
- **Shadows**: 3-level elevation system

## 🔧 Configuration

### Update API URL

Edit `services/api.ts`:

```typescript
const API_BASE_URL = "http://YOUR_LOCAL_IP:5000";
```

Replace `YOUR_LOCAL_IP` with your computer's IP address.

### Find Your IP

**Windows:**

```bash
ipconfig
```

**Mac/Linux:**

```bash
ifconfig
```

## 📊 Prediction Flow

```
User Input → API Service → Flask Backend → ML Models → Results Display
```

### Required Fields

- **MMSE Score** (0-30): Mini-Mental State Examination
- **Age**: Patient's age in years

### Optional Fields (Improves Accuracy)

- Gender, Education, SES, CDR, eTIV, nWBV, ASF

## 🎯 Prediction Results

Results include:

- **Predicted Disease**: Most likely diagnosis
- **Confidence Score**: Prediction certainty (0-100%)
- **Risk Level**: High/Medium/Low
- **Severity**: Disease severity level
- **Top 3 Predictions**: Ranked by probability
- **All Disease Scores**: Probabilities for all 6 diseases

## 📁 Project Structure

```
mobile/
├── app/
│   ├── (tabs)/          # Main app screens
│   │   ├── home.tsx
│   │   ├── cognitive-test.tsx
│   │   ├── history.tsx
│   │   ├── resources.tsx
│   │   └── profile.tsx
│   ├── _layout.tsx      # Root layout
│   └── index.tsx        # Entry point
├── constants/
│   └── theme.ts         # Design system
├── services/
│   └── api.ts           # API service
└── REDESIGN_SUMMARY.md  # Detailed documentation
```

## 🔌 API Endpoints

- `GET /health` - Health check
- `POST /predict` - Hybrid prediction
- `POST /predict/individual/<disease>` - Individual disease
- `POST /predict/multiclass` - Multi-class prediction

## 🎨 Screens

| Screen     | Description                             |
| ---------- | --------------------------------------- |
| Home       | Welcome, disease overview, how it works |
| Assessment | Data input form and prediction results  |
| History    | Past assessment records                 |
| Resources  | Educational materials about diseases    |
| Profile    | User settings and app information       |

## 🐛 Troubleshooting

### "Network request failed"

- Ensure Flask backend is running
- Check API URL in `services/api.ts`
- Verify mobile device is on same network

### "Prediction failed"

- Check Flask terminal for errors
- Verify all required fields are filled
- Ensure MMSE score is between 0-30

### App won't start

```bash
# Clear cache and restart
npx expo start -c
```

## 📚 Documentation

- **REDESIGN_SUMMARY.md**: Complete redesign documentation
- **API_INTEGRATION_GUIDE.md**: API integration details
- **PROJECT_STRUCTURE.md**: Folder structure explanation

## 🎯 Next Steps

- [ ] Implement history storage
- [ ] Add data visualization charts
- [ ] Export results as PDF
- [ ] Add offline mode
- [ ] Multi-language support
- [ ] Dark mode theme

## 📄 License

MIT License

## 👨‍💻 Developer

Built with ❤️ using Expo, React Native, and Flask ML
