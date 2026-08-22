# Aarogya Grid

Aarogya Grid is a comprehensive health supply chain forecasting and management platform.

## Monorepo Structure

- `/web`: Frontend web application (Vite + React + Tailwind + React Router)
- `/functions`: Serverless backend API (Firebase Cloud Functions, Node 20, JavaScript)
- `/forecast`: Predictive analytics service (Python)
- `/seed`: Dataset CSVs and database import scripts
- `/mock`: Mock JSON responses (`api.json`)

## Branching Strategy

- **`main`**: Always deployable. Represents the stable production state.
- **Feature Branches**: Branch off `main` for new features or bug fixes (e.g., `feature/inventory-forecasting`, `fix/map-rendering`).
- **Pull Requests (PR in)**: All code must be merged into `main` via Pull Requests. CI/CD checks and code reviews must pass before merging.

## Initial Setup & Hour-One Deployment

Run these exact terminal commands from the root of this repository to initialize the project, configure Firebase, and deploy a "Hello World" page.

### 1. Initialize the Web App

```bash
# Scaffold the Vite React app in the /web directory
npm create vite@latest web -- --template react

cd web
npm install

# Install Tailwind CSS and React Router
npm install tailwindcss @tailwindcss/vite react-router-dom

# Note: For Tailwind v4, configure it in vite.config.js and src/index.css
# as per standard Vite+Tailwind setup.

# Build the web app so Firebase Hosting has a dist/ directory to serve
npm run build
cd ..
```

### 2. Initialize Cloud Functions

```bash
# Initialize Firebase Functions in the /functions directory
# IMPORTANT: Choose JavaScript and Node 20. Do NOT overwrite firebase.json if asked.
firebase init functions

# We need an exported 'api' function to match the Hosting rewrite in firebase.json.
# Overwrite functions/index.js with a basic hello-world api function:
cat << 'EOF' > functions/index.js
const { onRequest } = require("firebase-functions/v2/https");

exports.api = onRequest((request, response) => {
  response.send("Hello from Aarogya Grid API!");
});
EOF
```

### 3. Deploy to Firebase

```bash
# Login to the Firebase CLI
firebase login

# Link your local repository to your Firebase project
# Replace <YOUR_FIREBASE_PROJECT_ID> with your actual project ID
firebase use --add <YOUR_FIREBASE_PROJECT_ID>

# Deploy Hosting and Functions
firebase deploy
```

## Environment Variables

Copy the `.env.example` file to `.env` and populate it with your actual keys (Gemini, Google Maps, Firebase, etc.).

```bash
cp .env.example .env
```
