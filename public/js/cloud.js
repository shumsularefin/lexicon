/* ==========================================================================
   Lexicon — Firebase Google Auth, Cross-Device Sync, Live Stats & Feedback
   ========================================================================== */

window.LexiconCloud = (function () {
  'use strict';

  const FALLBACK_CONFIG = {
    apiKey: "AIzaSyBFHe4XsVFX5R4AJ9Ve-UtvdYW4SZl7Fqo",
    authDomain: "lexicon-prc.firebaseapp.com",
    projectId: "lexicon-prc",
    storageBucket: "lexicon-prc.firebasestorage.app",
    messagingSenderId: "571291805852"
  };

  let auth = null;
  let db = null;
  let currentUser = null;
  let unsubUserDoc = null;
  let unsubStatsDoc = null;
  let syncTimer = null;
  let isApplyingRemote = false;
  let initialized = false;
  let hooks = {};

  function getLocalMetrics() {
    try {
      const raw = localStorage.getItem('lexicon_local_metrics_v1');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { visits: 1, signedInUsers: 0, thumbsUp: 0, userThumbedUp: false, feedbackSent: false };
  }

  function saveLocalMetrics(m) {
    try { localStorage.setItem('lexicon_local_metrics_v1', JSON.stringify(m)); } catch (_) {}
  }

  async function init(callbacks) {
    hooks = callbacks || {};
    const localM = getLocalMetrics();

    // Track local visit once per browser session
    try {
      if (!sessionStorage.getItem('lexicon_visit_counted')) {
        sessionStorage.setItem('lexicon_visit_counted', '1');
        localM.visits = (localM.visits || 0) + 1;
        saveLocalMetrics(localM);
      }
    } catch (_) {}

    if (hooks.onStatsUpdate) hooks.onStatsUpdate(localM);

    // Only initialize Firebase SDK if loaded and running on http(s)
    if (typeof firebase === 'undefined' || !location.protocol.startsWith('http')) {
      if (hooks.onSyncStatus) hooks.onSyncStatus('local');
      return;
    }

    try {
      let config = FALLBACK_CONFIG;
      try {
        const res = await fetch('/__/firebase/init.json');
        if (res.ok) {
          const json = await res.json();
          if (json && json.apiKey && json.projectId) config = json;
        }
      } catch (_) {}

      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      auth = firebase.auth();
      db = firebase.firestore();
      initialized = true;

      // Enable offline Firestore persistence when available
      try {
        db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      } catch (_) {}

      // Handle redirect result on mobile browsers
      auth.getRedirectResult().catch(() => {});

      // Watch public site metrics (visits, signed-in users, thumbs up)
      initPublicStats();

      // Watch authentication state
      auth.onAuthStateChanged(user => {
        currentUser = user;
        if (hooks.onAuthChange) hooks.onAuthChange(user);
        if (user) {
          recordSignedInUser(user);
          attachUserSync(user);
        } else {
          detachUserSync();
          if (hooks.onSyncStatus) hooks.onSyncStatus('local');
        }
      });
    } catch (_) {
      if (hooks.onSyncStatus) hooks.onSyncStatus('local');
    }
  }

  function initPublicStats() {
    if (!db) return;
    const statsRef = db.collection('stats').doc('public');

    // Increment visit once per browser session
    try {
      if (!sessionStorage.getItem('lexicon_cloud_visit_counted')) {
        sessionStorage.setItem('lexicon_cloud_visit_counted', '1');
        statsRef.set({
          visits: firebase.firestore.FieldValue.increment(1),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
    } catch (_) {}

    if (unsubStatsDoc) unsubStatsDoc();
    unsubStatsDoc = statsRef.onSnapshot(doc => {
      if (!doc.exists) return;
      const d = doc.data() || {};
      const localM = getLocalMetrics();
      const merged = {
        ...localM,
        visits: Math.max(localM.visits || 1, d.visits || 0),
        signedInUsers: Math.max(localM.signedInUsers || 0, d.signedInUsers || 0),
        thumbsUp: Math.max(localM.thumbsUp || 0, d.thumbsUp || 0)
      };
      saveLocalMetrics(merged);
      if (hooks.onStatsUpdate) hooks.onStatsUpdate(merged);
    }, () => {});
  }

  async function recordSignedInUser(user) {
    if (!db || !user) return;
    try {
      const markerRef = db.collection('stats_users').doc(user.uid);
      const snap = await markerRef.get();
      if (!snap.exists) {
        await markerRef.set({
          firstSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('stats').doc('public').set({
          signedInUsers: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
      }
    } catch (_) {}
  }

  function attachUserSync(user) {
    if (!db || !user) return;
    detachUserSync();
    if (hooks.onSyncStatus) hooks.onSyncStatus('syncing');

    const docRef = db.collection('users').doc(user.uid).collection('lexicon').doc('state');
    let firstSnap = true;

    unsubUserDoc = docRef.onSnapshot(snap => {
      if (snap.exists) {
        const remoteData = snap.data();
        if (remoteData && remoteData.payload) {
          isApplyingRemote = true;
          try {
            if (hooks.onRemoteState) hooks.onRemoteState(remoteData.payload, firstSnap);
          } finally {
            isApplyingRemote = false;
          }
        }
        if (firstSnap) {
          firstSnap = false;
          // Push merged state back up once so any offline/local words are preserved in cloud
          scheduleSync(hooks.getLocalState ? hooks.getLocalState() : null, true);
        }
        if (hooks.onSyncStatus) hooks.onSyncStatus('synced');
      } else {
        firstSnap = false;
        // First time this user signs in: upload current local state to cloud
        if (hooks.getLocalState) {
          scheduleSync(hooks.getLocalState(), true);
        }
      }
    }, () => {
      if (hooks.onSyncStatus) hooks.onSyncStatus('offline');
    });
  }

  function detachUserSync() {
    if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
  }

  function scheduleSync(stateObj, immediate = false) {
    if (!db || !currentUser || !stateObj || isApplyingRemote) return;
    clearTimeout(syncTimer);
    const run = async () => {
      try {
        if (hooks.onSyncStatus) hooks.onSyncStatus('syncing');
        const docRef = db.collection('users').doc(currentUser.uid).collection('lexicon').doc('state');
        // Strip transient or sensitive API key from cloud doc if user prefers, keep all vocab/progress/settings
        const cleanPayload = JSON.parse(JSON.stringify(stateObj));
        await docRef.set({
          payload: cleanPayload,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          email: currentUser.email || ''
        }, { merge: true });
        if (hooks.onSyncStatus) hooks.onSyncStatus('synced');
      } catch (_) {
        if (hooks.onSyncStatus) hooks.onSyncStatus('offline');
      }
    };
    if (immediate) run();
    else syncTimer = setTimeout(run, 800);
  }

  async function signInWithGoogle() {
    if (!initialized || !auth) {
      return { ok: false, error: 'Google sign-in is available on the live Firebase site (lexicon-prc.web.app).' };
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await auth.signInWithPopup(provider);
      return { ok: true };
    } catch (err) {
      if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')) {
        try {
          await auth.signInWithRedirect(provider);
          return { ok: true };
        } catch (e2) {
          return { ok: false, error: e2.message || 'Sign-in failed.' };
        }
      }
      if (err && err.code === 'auth/popup-closed-by-user') {
        return { ok: false, error: 'Sign-in cancelled.' };
      }
      return { ok: false, error: (err && err.message) || 'Could not sign in with Google.' };
    }
  }

  async function signOut() {
    if (!auth) return;
    try {
      await auth.signOut();
    } catch (_) {}
  }

  async function toggleThumbsUp() {
    const m = getLocalMetrics();
    if (m.userThumbedUp) {
      return { alreadyDone: true, metrics: m };
    }
    m.userThumbedUp = true;
    m.thumbsUp = (m.thumbsUp || 0) + 1;
    saveLocalMetrics(m);
    if (hooks.onStatsUpdate) hooks.onStatsUpdate(m);

    if (db) {
      try {
        await db.collection('stats').doc('public').set({
          thumbsUp: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
      } catch (_) {}
    }
    return { alreadyDone: false, metrics: m };
  }

  async function submitFeedback(comment, thumbedUp) {
    const m = getLocalMetrics();
    m.feedbackSent = true;
    if (thumbedUp && !m.userThumbedUp) {
      m.userThumbedUp = true;
      m.thumbsUp = (m.thumbsUp || 0) + 1;
      if (db) {
        db.collection('stats').doc('public').set({
          thumbsUp: firebase.firestore.FieldValue.increment(1)
        }, { merge: true }).catch(() => {});
      }
    }
    saveLocalMetrics(m);
    if (hooks.onStatsUpdate) hooks.onStatsUpdate(m);

    if (db && (comment || thumbedUp)) {
      try {
        await db.collection('feedback').add({
          comment: String(comment || '').trim(),
          thumbsUp: !!thumbedUp,
          uid: currentUser ? currentUser.uid : null,
          userName: currentUser ? (currentUser.displayName || '') : 'Anonymous',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (_) {}
    }
    return true;
  }

  function getUser() { return currentUser; }

  return {
    init,
    signInWithGoogle,
    signOut,
    scheduleSync,
    toggleThumbsUp,
    submitFeedback,
    getUser,
    getLocalMetrics
  };
})();
