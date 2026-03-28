# Voters Management App

A comprehensive voter management system built with React, TypeScript, Firebase, and Vite.

## Features

- 🏠 House Management - Track houses with voter information
- 👥 Voter Management - Add, edit, and manage voter details
- ⭐ Support Rating System - Track voter support levels (1-5 stars)
- 📋 Task Management - Create and track tasks for each house
- 📊 Dashboard Analytics - View statistics and support distribution
- 🔐 Google Authentication - Secure login with Firebase Auth
- 📱 Responsive Design - Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google)
- **Charts**: Recharts
- **Animations**: Motion (Framer Motion)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Firebase account
- Gemini API key (optional)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd VOTERS-APP
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Add your Firebase configuration in `src/firebase.ts`
   - Add your Gemini API key in `.env.local` (if using AI features)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

### Deploy to Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts and set environment variables in Vercel dashboard

### Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Build the app:
```bash
npm run build
```

4. Deploy:
```bash
firebase deploy
```

### Deploy to Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Build and deploy:
```bash
npm run build
netlify deploy --prod
```

## GitHub Repository Setup

To push to GitHub:

```bash
# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/voters-app.git
git branch -M main
git push -u origin main
```

## Environment Variables

Required environment variables:

- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `GEMINI_API_KEY` - Gemini API key (optional)

## Project Structure

```
src/
├── components/          # React components
│   ├── AddVoterForm.tsx
│   ├── BoothSelection.tsx
│   ├── Dashboard.tsx
│   ├── HouseDetail.tsx
│   ├── Houses.tsx
│   ├── Layout.tsx
│   ├── Login.tsx
│   ├── PhotoModal.tsx
│   ├── Profile.tsx
│   ├── TasksList.tsx
│   ├── VoterDetail.tsx
│   └── VoterList.tsx
├── lib/                # Utility functions
├── App.tsx             # Main app component
├── firebase.ts         # Firebase configuration
├── types.ts            # TypeScript types
└── main.tsx           # App entry point
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
