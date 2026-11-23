# Lexicon — Focused Offline-First Vocabulary App

A clean, distraction-free desktop & mobile web app for capturing and mastering vocabulary every day.

## Structure
- `public/index.html` — Semantic app layout (Desktop rail + Native mobile bottom dock)
- `public/css/styles.css` — High-contrast Dark/Light themes, morphing navigation pills, fluid capture animations
- `public/js/dictionary.js` — Embedded Oxford-style offline lexicon & syllabifier/IPA engine
- `public/js/app.js` — State, Gemini / Free Dictionary enrichment, Learning Peaks chart, flashcards, quizzes, daily recap
- `public/manifest.json` & `public/sw.js` — PWA installability & full offline caching
- `firebase.json` & `.firebaserc` — Pre-configured for Firebase project `lexicon-prc`
- `.github/workflows/firebase-hosting-merge.yml` — Auto-deploys `main` to Firebase Hosting

## Push to GitHub & Go Live on Firebase
```bash
# 1. Push to your GitHub repo
git init
git add .
git commit -m "Initial Lexicon app with morphing UI, mobile dock, and Firebase config"
git branch -M main
git remote add origin https://github.com/shumsularefin/lexicon.git
git push -u origin main

# 2. Deploy live to Firebase Hosting (lexicon-prc)
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```
To enable automatic deploys on every GitHub push, run `firebase init hosting:github` once in this folder (it automatically adds the `FIREBASE_SERVICE_ACCOUNT_LEXICON_PRC` secret to your GitHub repo).
