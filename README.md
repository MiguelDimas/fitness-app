AI-Powered Gamified Fitness App

An installable web app that uses AI-driven adaptive difficulty to help users stay consistent with their exercise. Instead of setting fixed daily goals, the app adjusts each user's targets based on their recent activity, aiming to improve exercise adherence.

Built as part of the QHO656 Dissertation Project at Southampton Solent University: "Design and Evaluation of an AI-Powered Gamified Fitness App for Improving Exercise Adherence."

Features
Adaptive goal engine a contextual bandit with a rule-based cold-start policy that personalises daily targets based on user context and history.
Gamification — progress tracking and game-like feedback to encourage regular use.
User accounts — sign-up and login via Firebase Authentication.
Cloud data — activity logs and user data stored in Firebase Firestore.
Installable PWA — can be added to a phone's home screen and used like a native app.
Tech Stack
Framework: Next.js (App Router) with React and TypeScript
Styling: Tailwind CSS
Backend / Database: Firebase (Firestore + Authentication)
Hosting: Vercel
App type: Progressive Web App (PWA)
Getting Started
Prerequisites
Node.js (version 18 or later)
A Firebase project (for Firestore + Auth)
1. Install dependencies
bash
npm install
2. Set up environment variables

Create a file named .env.local in the project root and add your Firebase configuration:

bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

You can find these values in your Firebase project settings.

3. Run the development server
bash
npm run dev

Open http://localhost:3000 in your browser to view the app.

Project Structure
app/ — application pages and routes (Next.js App Router)
public/ — static assets (icons, images, PWA files)
next.config.ts — Next.js configuration
package.json — dependencies and scripts
Author

Miguel Dimas — Southampton Solent University Module: QHO656 Dissertation Project Supervisor: Dr Sharjeel Aslam