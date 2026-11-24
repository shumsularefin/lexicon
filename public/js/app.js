/* ==========================================================================
   Lexicon — Core Application Logic (Monochrome IDE + Morphing UI Engine)
   ========================================================================== */

(function () {
  'use strict';

  const { OFFLINE_DICTIONARY, syllabifyWord, estimateIpa, offlineLookup } = window.LexiconDictionary;
  const STORAGE_KEY = 'lexicon_studio_state_v1';

  // =========================================================================
  // 1. ONLINE ENRICHMENT (Gemini API -> Free Dictionary -> Offline)
  // =========================================================================
  async function enrichWord(rawWord) {
    const word = rawWord.trim();
    const lower = word.toLowerCase();
    const isOnline = navigator.onLine && !state.settings.simulateOffline;
    if (!isOnline) return offlineLookup(word);

    if (state.settings.geminiApiKey && state.settings.geminiApiKey.trim().length > 10) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(state.settings.geminiApiKey.trim())}`;
        const prompt = `Provide a concise, learner-friendly dictionary breakdown for the English word "${word}". Return ONLY valid JSON with this exact schema:
{"syllables":"dot-separated syllables e.g. e·phem·er·al","ipa":"/ipa/","category":"one short theme like Literature, Work & Craft, Communication, Mindset, Everyday Precision, or Books & Ideas","synonyms":["up to 4 synonyms"],"tip":"one concise 1-sentence memory or usage nuance tip","meanings":[{"pos":"noun|verb|adjective|adverb","def":"clear concise definition","example":"natural everyday example sentence"}]}`;
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
          })
        });
        if (resp.ok) {
          const json = await resp.json();
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
          if (parsed && Array.isArray(parsed.meanings) && parsed.meanings.length > 0) {
            return {
              word,
              syllables: parsed.syllables || syllabifyWord(word),
              ipa: parsed.ipa || estimateIpa(word),
              category: parsed.category || 'General',
              synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 5) : [],
              tip: parsed.tip || '',
              meanings: parsed.meanings.slice(0, 3).map(m => ({
                pos: (m.pos || 'noun').toLowerCase(),
                def: m.def || '',
                example: m.example || ''
              })),
              source: 'Gemini 2.5 Flash',
              audioUrl: ''
            };
          }
        }
      } catch (_) {}
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lower)}`, {
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const entry = Array.isArray(data) ? data[0] : null;
        if (entry && Array.isArray(entry.meanings) && entry.meanings.length) {
          const phoneticObj = (entry.phonetics || []).find(p => p.text) || {};
          const audioObj = (entry.phonetics || []).find(p => p.audio && p.audio.startsWith('http')) || {};
          const meanings = [];
          const syns = new Set();
          for (const m of entry.meanings) {
            (m.synonyms || []).forEach(s => syns.add(s));
            for (const d of (m.definitions || []).slice(0, 2)) {
              (d.synonyms || []).forEach(s => syns.add(s));
              if (meanings.length < 3) {
                meanings.push({ pos: (m.partOfSpeech || 'noun').toLowerCase(), def: d.definition, example: d.example || '' });
              }
            }
          }
          const offlineMatch = OFFLINE_DICTIONARY[lower];
          return {
            word,
            syllables: offlineMatch ? offlineMatch.syllables : syllabifyWord(word),
            ipa: entry.phonetic || phoneticObj.text || (offlineMatch ? offlineMatch.ipa : estimateIpa(word)),
            category: offlineMatch ? offlineMatch.category : 'General',
            synonyms: Array.from(syns).slice(0, 5).length ? Array.from(syns).slice(0, 5) : (offlineMatch ? offlineMatch.synonyms : []),
            tip: offlineMatch ? offlineMatch.tip : `${syllabifyWord(word).split('·').length} syllable(s). Tap Listen to lock in pronunciation.`,
            meanings,
            source: 'Live Dictionary',
            audioUrl: audioObj.audio || ''
          };
        }
      }
    } catch (_) {}

    return offlineLookup(word);
  }

  // =========================================================================
  // 2. STATE & PERSISTENCE
  // =========================================================================
  function dateOffsetISO(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function uid() { return 'w_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

  function buildStarterWords() {
    const starterKeys = [
      { k: 'ephemeral', daysAgo: 0, mastery: 1, reviews: 1 },
      { k: 'lucid', daysAgo: 0, mastery: 2, reviews: 3 },
      { k: 'pragmatic', daysAgo: 1, mastery: 3, reviews: 5 },
      { k: 'serendipity', daysAgo: 1, mastery: 2, reviews: 2 },
      { k: 'sanguine', daysAgo: 2, mastery: 3, reviews: 4 },
      { k: 'nuance', daysAgo: 2, mastery: 2, reviews: 3 },
      { k: 'perspicacious', daysAgo: 3, mastery: 1, reviews: 1 },
      { k: 'ubiquitous', daysAgo: 4, mastery: 3, reviews: 6 },
      { k: 'resilient', daysAgo: 5, mastery: 2, reviews: 3 },
      { k: 'juxtapose', daysAgo: 6, mastery: 1, reviews: 1 }
    ];
    return starterKeys.map(item => {
      const d = OFFLINE_DICTIONARY[item.k];
      return {
        id: uid(),
        word: item.k.charAt(0).toUpperCase() + item.k.slice(1),
        syllables: d.syllables,
        ipa: d.ipa,
        categories: [d.category],
        synonyms: d.synonyms.slice(),
        tip: d.tip,
        meanings: d.meanings.map(m => ({ ...m })),
        addedDate: dateOffsetISO(item.daysAgo),
        mastery: item.mastery,
        reviews: item.reviews,
        lastReviewed: item.reviews > 0 ? dateOffsetISO(Math.max(0, item.daysAgo - 1)) : null,
        audioUrl: ''
      };
    });
  }

  function buildDefaultActivity() {
    const log = {};
    [{ d: 6, c: 2 }, { d: 5, c: 3 }, { d: 4, c: 5 }, { d: 3, c: 2 }, { d: 2, c: 6 }, { d: 1, c: 4 }, { d: 0, c: 2 }]
      .forEach(s => { log[dateOffsetISO(s.d)] = s.c; });
    return log;
  }

  function defaultState() {
    return {
      words: buildStarterWords(),
      categories: ['Literature', 'Communication', 'Work & Craft', 'Mindset', 'Books & Ideas', 'Everyday Precision', 'General'],
      activityLog: buildDefaultActivity(),
      reportedQuizIds: [],
      sessionHistory: [{ timestamp: new Date(Date.now() - 86400000).toLocaleString(), type: 'Review', summary: '4 got it, 1 to revisit' }],
      stats: { totalReviewed: 12, quizzesCompleted: 2, bestStreak: 7 },
      savedReview: null,
      savedQuiz: null,
      settings: {
        theme: 'dark',
        dailyGoal: 5,
        voiceGender: 'female',
        googleRhythm: true,
        voiceURI: 'auto',
        speechRate: 1,
        geminiApiKey: '',
        simulateOffline: false,
        chartRange: 7,
        showInspector: true
      }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const def = defaultState();
      return { ...def, ...parsed, settings: { ...def.settings, ...(parsed.settings || {}) }, stats: { ...def.stats, ...(parsed.stats || {}) } };
    } catch (_) {
      return defaultState();
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    if (window.LexiconCloud) window.LexiconCloud.scheduleSync(state);
  }

  function mergeRemoteState(remote, isInitialMerge) {
    if (!remote || typeof remote !== 'object') return;
    if (!isInitialMerge) {
      // Real-time update from another device: merge cleanly
    }
    const localMap = new Map(state.words.map(w => [w.word.toLowerCase(), w]));
    const remoteWords = Array.isArray(remote.words) ? remote.words : [];
    const mergedList = [];
    const seen = new Set();

    remoteWords.forEach(rw => {
      if (!rw || !rw.word) return;
      const key = rw.word.toLowerCase();
      seen.add(key);
      const lw = localMap.get(key);
      if (lw) {
        mergedList.push({
          ...rw,
          mastery: Math.max(lw.mastery || 0, rw.mastery || 0),
          reviews: Math.max(lw.reviews || 0, rw.reviews || 0),
          lastReviewed: lw.lastReviewed && rw.lastReviewed ? (lw.lastReviewed > rw.lastReviewed ? lw.lastReviewed : rw.lastReviewed) : (rw.lastReviewed || lw.lastReviewed || null)
        });
      } else {
        mergedList.push(rw);
      }
    });
    state.words.forEach(lw => {
      const key = lw.word.toLowerCase();
      if (!seen.has(key)) mergedList.push(lw);
    });

    state.words = mergedList;
    if (Array.isArray(remote.categories)) {
      remote.categories.forEach(c => { if (!state.categories.includes(c)) state.categories.push(c); });
    }
    if (remote.activityLog && typeof remote.activityLog === 'object') {
      Object.keys(remote.activityLog).forEach(day => {
        state.activityLog[day] = Math.max(state.activityLog[day] || 0, remote.activityLog[day] || 0);
      });
    }
    if (remote.stats) {
      state.stats.totalReviewed = Math.max(state.stats.totalReviewed || 0, remote.stats.totalReviewed || 0);
      state.stats.quizzesCompleted = Math.max(state.stats.quizzesCompleted || 0, remote.stats.quizzesCompleted || 0);
      state.stats.bestStreak = Math.max(state.stats.bestStreak || 0, remote.stats.bestStreak || 0);
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    renderActiveView();
  }

  let state = loadState();
  let activeTab = 'dashboard';
  let peaksChartInstance = null;
  let peaksChartMobileInstance = null;

  let inlineEnrichResult = null;
  let inlineSelectedMeanings = new Set([0]);
  let inlineSelectedCategory = 'General';
  let inlineDebounce = null;

  let currentEnrichResult = null;
  let editingWordId = null;
  let selectedCategoryInModal = 'General';
  let selectedMeaningIndices = new Set([0]);
  let modalDebounce = null;

  let confirmCallback = null;
  let renamingCategoryName = null;
  let reviewSession = state.savedReview || null;
  let quizSession = state.savedQuiz || null;

  // =========================================================================
  // 3. MORPHING PILLS (Sidebar, Mobile Dock, Timeframe)
  // =========================================================================
  function updateSidebarMorphPill() {
    const wrap = document.getElementById('sidebarNavWrap');
    const pill = document.getElementById('sidebarMorphPill');
    const activeBtn = wrap?.querySelector('.nav-item.active');
    if (!wrap || !pill || !activeBtn) return;
    const wrapRect = wrap.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    if (btnRect.height === 0) return;
    pill.style.transform = `translateY(${btnRect.top - wrapRect.top}px)`;
    pill.style.height = `${btnRect.height}px`;
    pill.style.opacity = '1';
  }

  function updateMobileDockPill() {
    const dock = document.getElementById('mobileDockInner');
    const pill = document.getElementById('mobileDockPill');
    const activeBtn = dock?.querySelector('.mobile-tab-btn.active');
    if (!dock || !pill || !activeBtn) return;
    const dockRect = dock.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    if (btnRect.width === 0) return;
    pill.style.transform = `translateX(${btnRect.left - dockRect.left}px)`;
    pill.style.width = `${btnRect.width}px`;
  }

  function updateTimeframeMorphPill() {
    const group = document.getElementById('timeframeButtons');
    const pill = document.getElementById('tfMorphPill');
    const activeBtn = group?.querySelector('.tf-btn.active');
    if (!group || !pill || !activeBtn) return;
    const gRect = group.getBoundingClientRect();
    const bRect = activeBtn.getBoundingClientRect();
    if (bRect.width === 0) return;
    pill.style.transform = `translateX(${bRect.left - gRect.left}px)`;
    pill.style.width = `${bRect.width}px`;
  }

  function syncAllMorphPills() {
    requestAnimationFrame(() => {
      updateSidebarMorphPill();
      updateMobileDockPill();
      updateTimeframeMorphPill();
    });
  }

  // =========================================================================
  // 4. UTILITIES & SPEECH SYNTHESIS
  // =========================================================================
  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    const bg = type === 'error' ? 'var(--danger-soft)' : 'var(--bg-elevated)';
    const color = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--text-primary)';
    const border = type === 'error' ? 'var(--danger)' : 'var(--border-strong)';
    el.className = 'pointer-events-auto px-3.5 py-2 rounded-lg text-xs font-medium shadow-lg animate-in';
    el.style.cssText = `background:${bg};color:${color};border:1px solid ${border};`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(4px)';
      el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      setTimeout(() => el.remove(), 210);
    }, 2400);
  }

  // Google-style 3-tap rhythm tracker: 1st = Normal -> 2nd = Slow (syllables) -> 3rd = Normal
  let lastSpokenWord = '';
  let speakTapStep = 0;

  const NOVELTY_VOICES = /zarvox|trinoids|bells|bubbles|whisper|fred|ralph|albert|bad news|good news|cellos|boing|hysterical|pipe organ|bahh|deranged|junior|kathy|princess|espeak/i;
  const FEMALE_PREF = [
    /google us english/i,
    /microsoft aria online/i,
    /microsoft jenny online/i,
    /microsoft ava online/i,
    /samantha/i,
    /google uk english female/i,
    /microsoft zira/i,
    /ava|allison|karen|victoria|tessa|moira|serena|kate|female/i
  ];
  const MALE_PREF = [
    /google uk english male/i,
    /microsoft andrew online/i,
    /microsoft guy online/i,
    /microsoft brian online/i,
    /daniel/i,
    /alex/i,
    /microsoft david/i,
    /microsoft mark/i,
    /arthur|aaron|oliver|tom|frederick|male/i
  ];

  function pickBestStandardVoice(gender) {
    if (!('speechSynthesis' in window)) return null;
    const all = window.speechSynthesis.getVoices() || [];
    const english = all.filter(v => /^en[-_]/i.test(v.lang) && !NOVELTY_VOICES.test(v.name));
    const pool = english.length ? english : all.filter(v => /^en/i.test(v.lang));
    if (!pool.length) return all[0] || null;

    const prefs = gender === 'male' ? MALE_PREF : FEMALE_PREF;
    for (const pattern of prefs) {
      const match = pool.find(v => pattern.test(v.name));
      if (match) return match;
    }
    const enUS = pool.find(v => /en[-_]US/i.test(v.lang));
    return enUS || pool[0];
  }

  function updateVoiceGenderUI() {
    const g = state.settings.voiceGender || 'female';
    document.querySelectorAll('.vg-btn, .vg-settings-btn').forEach(btn => {
      const act = btn.dataset.voiceGender === g;
      btn.style.background = act ? 'var(--btn-bg)' : 'transparent';
      btn.style.color = act ? 'var(--btn-text)' : 'var(--text-muted)';
    });
  }

  function speakWord(text, audioUrl) {
    if (!text) return;
    const key = text.trim().toLowerCase();
    const useRhythm = state.settings.googleRhythm !== false;

    if (useRhythm) {
      if (lastSpokenWord === key) {
        speakTapStep = (speakTapStep + 1) % 3; // 0: Normal, 1: Slow, 2: Normal
      } else {
        lastSpokenWord = key;
        speakTapStep = 0;
      }
    } else {
      lastSpokenWord = key;
      speakTapStep = 0;
    }

    const isSlowStep = useRhythm && speakTapStep === 1;
    const baseRate = Number(state.settings.speechRate) || 1;
    const rate = isSlowStep ? 0.65 : baseRate;
    const gender = state.settings.voiceGender || 'female';

    // Always respect user's chosen Female/Male voice & Google rhythm via crystal-clear Web Speech
    speakViaWebSpeech(text, rate, gender, isSlowStep);
  }

  function speakViaWebSpeech(text, rateOverride = null, genderOverride = null, isSlowStep = false) {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis unavailable.', 'error');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();

      const utter = new SpeechSynthesisUtterance(text);
      const gender = genderOverride || state.settings.voiceGender || 'female';
      utter.lang = 'en-US';
      utter.rate = rateOverride !== null ? rateOverride : (Number(state.settings.speechRate) || 1);
      utter.pitch = 1.0;
      utter.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (state.settings.voiceURI && state.settings.voiceURI !== 'auto') {
        const chosen = voices.find(v => v.voiceURI === state.settings.voiceURI);
        if (chosen) utter.voice = chosen;
      } else {
        const standard = pickBestStandardVoice(gender);
        if (standard) utter.voice = standard;
      }

      // Slight delay after cancel() prevents Chrome from clipping the first syllable
      setTimeout(() => {
        window.speechSynthesis.speak(utter);
      }, 35);

      const paceLabel = isSlowStep ? 'Slow · syllables (0.65×)' : `Normal (${utter.rate.toFixed(2).replace(/\.00$/, '')}×)`;
      const genderLabel = gender === 'male' ? 'Male' : 'Female';
      showToast(`${paceLabel} · ${genderLabel}`);
    } catch (_) {
      showToast('Unable to play pronunciation audio.', 'error');
    }
  }

  function populateVoices() {
    const sel = document.getElementById('voiceSelect');
    if (!sel) return;
    const voices = ('speechSynthesis' in window) ? window.speechSynthesis.getVoices() : [];
    const clean = voices.filter(v => !NOVELTY_VOICES.test(v.name));
    sel.innerHTML = `<option value="auto">Automatic · Best clear ${state.settings.voiceGender === 'male' ? 'Male' : 'Female'} English voice</option>`;
    clean.filter(v => /^en/i.test(v.lang)).forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})${v.localService ? ' · Offline' : ''}`;
      sel.appendChild(opt);
    });
    sel.value = state.settings.voiceURI || 'auto';
    updateVoiceGenderUI();
  }

  function recordActivity(amount = 1) {
    const key = todayISO();
    state.activityLog[key] = (state.activityLog[key] || 0) + amount;
    const streak = computeStreak();
    if (streak > state.stats.bestStreak) state.stats.bestStreak = streak;
    saveState();
  }

  function computeStreak() {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().slice(0, 10);
      if ((state.activityLog[key] || 0) > 0) streak++;
      else if (i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function masteryMeta(level) {
    const map = [
      { label: 'New', color: '#71717A', bg: 'rgba(113,113,122,0.12)' },
      { label: 'Learning', color: '#D4D4D8', bg: 'rgba(212,212,216,0.10)' },
      { label: 'Familiar', color: '#93C5FD', bg: 'rgba(147,197,253,0.10)' },
      { label: 'Mastered', color: '#4ADE80', bg: 'rgba(74,222,128,0.10)' }
    ];
    return map[Math.min(3, Math.max(0, level || 0))];
  }

  function allPartsOfSpeech() {
    const set = new Set();
    state.words.forEach(w => (w.meanings || []).forEach(m => { if (m.pos) set.add(m.pos.toLowerCase()); }));
    return Array.from(set).sort();
  }

  // =========================================================================
  // 5. THEME, INSPECTOR PANE, NETWORK & NAVIGATION
  // =========================================================================
  function applyTheme() {
    const html = document.documentElement;
    const icon = document.getElementById('themeIcon');
    if (state.settings.theme === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
      if (icon) icon.setAttribute('data-lucide', 'moon');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
      if (icon) icon.setAttribute('data-lucide', 'sun');
    }
    if (window.lucide) lucide.createIcons();
    renderPeaksCharts();
  }

  function applyInspectorVisibility() {
    const pane = document.getElementById('rightInspector');
    if (!pane) return;
    if (state.settings.showInspector === false) {
      pane.classList.remove('xl:flex');
      pane.classList.add('xl:hidden');
    } else {
      pane.classList.remove('xl:hidden');
      pane.classList.add('xl:flex');
    }
    syncAllMorphPills();
  }

  function updateNetworkPill() {
    const dot = document.getElementById('networkDot');
    const label = document.getElementById('networkLabel');
    const engine = document.getElementById('composerEngineLabel');
    const isOnline = navigator.onLine && !state.settings.simulateOffline;
    if (isOnline) {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400';
      label.textContent = state.settings.geminiApiKey ? 'Online · Gemini' : 'Online';
      if (engine) engine.textContent = state.settings.geminiApiKey ? 'Gemini 2.5 Flash · Live' : 'Live Dictionary · Offline Ready';
    } else {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400';
      label.textContent = 'Offline';
      if (engine) engine.textContent = 'Offline Oxford-Style Engine';
    }
  }

  const TAB_LABELS = {
    dashboard: 'Today',
    vocabulary: 'Vocabulary',
    review: 'Review Cards',
    quiz: 'Practice Quiz',
    recap: 'Daily Recap',
    categories: 'Categories',
    settings: 'Settings',
    backup: 'Backup'
  };

  function closeMobileSheet() {
    const sheet = document.getElementById('mobileMoreSheet');
    sheet.classList.add('hidden');
    sheet.classList.remove('flex');
  }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('main section[id^="view-"]').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('view-' + tab);
    if (target) {
      target.classList.remove('hidden');
      target.classList.remove('animate-in');
      void target.offsetWidth;
      target.classList.add('animate-in');
    }

    document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const primaryMobileTabs = ['dashboard', 'vocabulary', 'review', 'quiz'];
    const mobileActiveKey = primaryMobileTabs.includes(tab) ? tab : 'more';
    document.querySelectorAll('.mobile-tab-btn[data-mobile-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mobileTab === mobileActiveKey);
    });

    document.getElementById('topbarViewLabel').textContent = TAB_LABELS[tab] || tab;
    closeMobileSheet();
    renderActiveView();
    syncAllMorphPills();
  }

  function updateGlobalBadges() {
    const todayCount = state.activityLog[todayISO()] || 0;
    const goal = Math.max(1, Number(state.settings.dailyGoal) || 5);
    const pct = Math.min(100, Math.round((todayCount / goal) * 100));
    const streak = computeStreak();
    const masteredCount = state.words.filter(w => (w.mastery || 0) >= 3).length;
    const dueCount = state.words.length - masteredCount;

    document.getElementById('navVocabCount').textContent = state.words.length;
    document.getElementById('navDueCount').textContent = dueCount;
    document.getElementById('headerStreakCount').textContent = streak + 'd';
    document.getElementById('sidebarGoalText').textContent = `${todayCount} / ${goal}`;
    document.getElementById('sidebarGoalBar').style.width = pct + '%';

    // Inspector & mobile summary metrics
    document.getElementById('kpiTodayCount').textContent = `${todayCount} / ${goal}`;
    document.getElementById('kpiTodayPct').textContent = pct + '%';
    document.getElementById('kpiStreak').textContent = streak + 'd';
    document.getElementById('kpiBestStreak').textContent = `best ${Math.max(streak, state.stats.bestStreak)}d`;
    document.getElementById('kpiTotalWords').textContent = state.words.length;
    document.getElementById('kpiMasteredSub').textContent = `${masteredCount} mastered`;
    document.getElementById('kpiDueCount').textContent = dueCount;

    const mobT = document.getElementById('mobTodayCount');
    if (mobT) mobT.textContent = `${todayCount} / ${goal}`;
    const mobS = document.getElementById('mobStreak');
    if (mobS) mobS.textContent = streak + 'd';
    const mobD = document.getElementById('mobDueCount');
    if (mobD) mobD.textContent = dueCount;

    const dictCount = Object.keys(OFFLINE_DICTIONARY).length;
    document.getElementById('offlineDictCountBadge').textContent = `${dictCount} Oxford-style Entries + Linguistic Engine`;
    const inspDict = document.getElementById('inspectorDictCount');
    if (inspDict) inspDict.textContent = `${dictCount} words`;

    // Sidebar Recents (Codex / Claude style)
    const sbRecents = document.getElementById('sidebarRecentsList');
    if (sbRecents) {
      sbRecents.innerHTML = state.words.slice(0, 6).map(w => `
        <button data-sb-word="${w.id}" class="sb-recent-item w-full px-2.5 py-1.5 rounded-md text-left text-[12px] truncate hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-between gap-2" style="color:var(--text-secondary);">
          <span class="truncate">${escapeHtml(w.word)}</span>
          <span class="font-mono-code text-[10px] shrink-0" style="color:var(--text-muted);">${escapeHtml((w.meanings && w.meanings[0] && w.meanings[0].pos) ? w.meanings[0].pos.slice(0, 3) : '')}</span>
        </button>
      `).join('');
      sbRecents.querySelectorAll('.sb-recent-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const w = state.words.find(x => x.id === btn.dataset.sbWord);
          if (w) openQuickAddModal(w);
        });
      });
    }
  }

  function renderActiveView() {
    updateGlobalBadges();
    populateFilterDropdowns();
    renderPeaksCharts();
    if (activeTab === 'dashboard') renderDashboard();
    if (activeTab === 'vocabulary') renderVocabulary();
    if (activeTab === 'review') renderReview();
    if (activeTab === 'quiz') renderQuiz();
    if (activeTab === 'recap') renderRecap();
    if (activeTab === 'categories') renderCategories();
    if (activeTab === 'settings') renderSettings();
    if (window.lucide) lucide.createIcons();
    syncAllMorphPills();
  }

  function populateFilterDropdowns() {
    const poses = allPartsOfSpeech();
    ['vocabCategoryFilter', 'reviewCategoryFilter', 'quizCategoryFilter'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const prev = el.value || 'all';
      el.innerHTML = `<option value="all">All categories</option>` +
        state.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('') +
        `<option value="Uncategorized">Uncategorized</option>`;
      el.value = Array.from(el.options).some(o => o.value === prev) ? prev : 'all';
    });
    ['vocabPosFilter', 'reviewPosFilter', 'quizPosFilter'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const prev = el.value || 'all';
      el.innerHTML = `<option value="all">All parts of speech</option>` +
        poses.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
      el.value = Array.from(el.options).some(o => o.value === prev) ? prev : 'all';
    });
  }

  // =========================================================================
  // 6. INLINE IDE COMPOSER CAPTURE
  // =========================================================================
  function resetInlineCapture() {
    const inp = document.getElementById('inlineWordInput');
    inp.value = '';
    inlineEnrichResult = null;
    inlineSelectedMeanings = new Set([0]);
    document.getElementById('inlineClearBtn').classList.add('hidden');
    document.getElementById('inlineEnrichPanel').classList.remove('open');
    document.getElementById('heroCaptureWrap').classList.remove('is-open');
    document.getElementById('inlineResultBody').classList.add('hidden');
    document.getElementById('inlineActionLabel').textContent = 'Save';
  }

  async function runInlineEnrich(rawWord) {
    const word = rawWord.trim();
    const panel = document.getElementById('inlineEnrichPanel');
    const wrap = document.getElementById('heroCaptureWrap');
    if (word.length < 2) {
      panel.classList.remove('open');
      wrap.classList.remove('is-open');
      inlineEnrichResult = null;
      return;
    }

    const statusText = document.getElementById('inlineStatusText');
    const sourceTag = document.getElementById('inlineSourceTag');
    const body = document.getElementById('inlineResultBody');
    const isOnline = navigator.onLine && !state.settings.simulateOffline;

    panel.classList.add('open');
    wrap.classList.add('is-open');
    statusText.textContent = isOnline ? `Enriching "${word}"...` : `Offline lookup "${word}"...`;
    sourceTag.textContent = isOnline ? 'online' : 'offline';

    const result = await enrichWord(word);
    if (document.getElementById('inlineWordInput').value.trim().toLowerCase() !== word.toLowerCase()) return;

    inlineEnrichResult = result;
    inlineSelectedMeanings = new Set([0]);
    inlineSelectedCategory = state.categories.includes(result.category) ? result.category : (state.categories[0] || 'General');

    statusText.textContent = 'Ready · press Enter to save';
    sourceTag.textContent = result.source;

    renderInlineEnrichResult(result);
    body.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function renderInlineEnrichResult(res) {
    document.getElementById('inlineResWord').textContent = res.word.charAt(0).toUpperCase() + res.word.slice(1);
    document.getElementById('inlineResSyllables').textContent = res.syllables;
    document.getElementById('inlineResIpa').textContent = res.ipa;

    const list = document.getElementById('inlineMeaningsList');
    list.innerHTML = res.meanings.map((m, i) => {
      const checked = inlineSelectedMeanings.has(i);
      return `
        <button type="button" data-imidx="${i}" class="inline-meaning-pick stagger-item w-full text-left rounded-lg px-3 py-2 transition-colors flex items-start gap-2.5"
          style="animation-delay:${i * 35}ms;background:${checked ? 'var(--bg-elevated)' : 'transparent'};border:1px solid ${checked ? 'var(--border-strong)' : 'var(--border)'};">
          <span class="mt-0.5 w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[9px] font-bold"
            style="background:${checked ? 'var(--btn-bg)' : 'transparent'};color:${checked ? 'var(--btn-text)' : 'transparent'};border:1px solid ${checked ? 'var(--btn-bg)' : 'var(--border-strong)'};">✓</span>
          <div class="space-y-0.5 min-w-0">
            <span class="font-mono-code text-[10px] uppercase" style="color:var(--text-muted);">${escapeHtml(m.pos)}</span>
            <p class="text-[13px] leading-relaxed" style="color:var(--text-primary);">${escapeHtml(m.def)}</p>
            ${m.example ? `<p class="text-[12px] italic" style="color:var(--text-secondary);">"${escapeHtml(m.example)}"</p>` : ''}
          </div>
        </button>
      `;
    }).join('');

    list.querySelectorAll('.inline-meaning-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.imidx);
        if (inlineSelectedMeanings.has(idx) && inlineSelectedMeanings.size > 1) inlineSelectedMeanings.delete(idx);
        else inlineSelectedMeanings.add(idx);
        renderInlineEnrichResult(res);
      });
    });

    const tipRow = document.getElementById('inlineTipRow');
    const syns = res.synonyms && res.synonyms.length ? ` · Synonyms: ${res.synonyms.slice(0, 4).join(', ')}` : '';
    tipRow.textContent = (res.tip || 'Saved with syllables and offline audio.') + syns;

    const pills = document.getElementById('inlineCategoryPills');
    pills.innerHTML = state.categories.slice(0, 5).map(c => {
      const active = c === inlineSelectedCategory;
      return `<button type="button" data-icat="${escapeHtml(c)}" class="inline-cat-pick px-2 py-0.5 rounded-md text-[11px] transition-colors"
        style="background:${active ? 'var(--bg-hover)' : 'transparent'};color:${active ? 'var(--text-primary)' : 'var(--text-muted)'};border:1px solid ${active ? 'var(--border-strong)' : 'var(--border)'};">${escapeHtml(c)}</button>`;
    }).join('');
    pills.querySelectorAll('.inline-cat-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        inlineSelectedCategory = btn.dataset.icat;
        renderInlineEnrichResult(res);
      });
    });
  }

  function saveInlineWord() {
    if (!inlineEnrichResult) return;
    const meanings = inlineEnrichResult.meanings.filter((_, i) => inlineSelectedMeanings.has(i));
    const finalMeanings = meanings.length ? meanings : [inlineEnrichResult.meanings[0]];
    const formattedWord = inlineEnrichResult.word.charAt(0).toUpperCase() + inlineEnrichResult.word.slice(1);

    const dup = state.words.find(w => w.word.toLowerCase() === formattedWord.toLowerCase());
    if (dup) {
      dup.meanings = finalMeanings;
      dup.syllables = inlineEnrichResult.syllables;
      dup.ipa = inlineEnrichResult.ipa;
      if (!dup.categories.includes(inlineSelectedCategory)) dup.categories.push(inlineSelectedCategory);
      saveState(); resetInlineCapture(); renderActiveView();
      showToast(`Updated "${formattedWord}".`, 'success');
      return;
    }

    state.words.unshift({
      id: uid(),
      word: formattedWord,
      syllables: inlineEnrichResult.syllables,
      ipa: inlineEnrichResult.ipa,
      categories: [inlineSelectedCategory],
      synonyms: inlineEnrichResult.synonyms || [],
      tip: inlineEnrichResult.tip || '',
      meanings: finalMeanings,
      addedDate: todayISO(),
      mastery: 0,
      reviews: 0,
      lastReviewed: null,
      audioUrl: inlineEnrichResult.audioUrl || ''
    });

    recordActivity(1); saveState(); resetInlineCapture(); renderActiveView();
    showToast(`Saved "${formattedWord}"`, 'success');
    document.getElementById('inlineWordInput').focus();
  }

  // =========================================================================
  // 7. DASHBOARD & LEARNING PEAKS CHARTS
  // =========================================================================
  function renderDashboard() {
    const now = new Date();
    document.getElementById('dashboardDateTag').textContent = now.toLocaleDateString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric'
    });
    renderRecentWords();
  }

  function buildChartConfig(range, ctx) {
    const labels = [];
    const values = [];
    let peakVal = 0;
    let peakLabel = '';
    let sum = 0;

    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = range <= 14
        ? d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const val = state.activityLog[iso] || 0;
      labels.push(label);
      values.push(val);
      sum += val;
      if (val > peakVal) { peakVal = val; peakLabel = label; }
    }

    document.getElementById('peakDayBadge').textContent = peakVal > 0 ? `Peak: ${peakVal} (${peakLabel})` : 'Peak: 0';
    document.getElementById('avgDailyRate').textContent = `Avg: ${(sum / range).toFixed(1)}/d`;
    const mobBadge = document.getElementById('mobPeakBadge');
    if (mobBadge) mobBadge.textContent = peakVal > 0 ? `Peak: ${peakVal} (${peakLabel})` : 'Peak: 0';

    const isLight = state.settings.theme === 'light';
    const lineColor = isLight ? '#111113' : '#EDEDEF';
    const grad = ctx.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, isLight ? 'rgba(17,17,19,0.14)' : 'rgba(237,237,239,0.16)');
    grad.addColorStop(1, isLight ? 'rgba(17,17,19,0.0)' : 'rgba(237,237,239,0.0)');

    return {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Words',
          data: values,
          borderColor: lineColor,
          backgroundColor: grad,
          borderWidth: 1.8,
          fill: true,
          tension: 0.36,
          pointRadius: range <= 14 ? 3 : 1.5,
          pointHoverRadius: 5,
          pointBackgroundColor: lineColor,
          pointBorderColor: isLight ? '#FFFFFF' : '#141416',
          pointBorderWidth: 1.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 420, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isLight ? '#111113' : '#232327',
            titleColor: '#EDEDEF',
            bodyColor: '#EDEDEF',
            padding: 8,
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: isLight ? '#848490' : '#5F5F69', maxTicksLimit: 5, font: { family: 'Geist Mono, monospace', size: 10 } }
          },
          y: {
            beginAtZero: true,
            suggestedMax: Math.max(5, peakVal + 1),
            grid: { color: isLight ? 'rgba(17,17,20,0.06)' : 'rgba(255,255,255,0.05)' },
            ticks: { stepSize: 2, color: isLight ? '#848490' : '#5F5F69', font: { family: 'Geist Mono, monospace', size: 10 } }
          }
        }
      }
    };
  }

  function renderPeaksCharts() {
    if (typeof Chart === 'undefined') return;
    const range = Number(state.settings.chartRange) || 7;

    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.range) === range);
    });
    document.querySelectorAll('.mob-tf-btn').forEach(btn => {
      const act = Number(btn.dataset.range) === range;
      btn.style.background = act ? 'var(--bg-hover)' : 'transparent';
      btn.style.color = act ? 'var(--text-primary)' : 'var(--text-muted)';
    });
    updateTimeframeMorphPill();

    const desktopCanvas = document.getElementById('peaksChart');
    if (desktopCanvas) {
      if (peaksChartInstance) peaksChartInstance.destroy();
      peaksChartInstance = new Chart(desktopCanvas.getContext('2d'), buildChartConfig(range, desktopCanvas.getContext('2d')));
    }

    const mobileCanvas = document.getElementById('peaksChartMobile');
    if (mobileCanvas) {
      if (peaksChartMobileInstance) peaksChartMobileInstance.destroy();
      peaksChartMobileInstance = new Chart(mobileCanvas.getContext('2d'), buildChartConfig(range, mobileCanvas.getContext('2d')));
    }
  }

  function renderRecentWords() {
    const list = document.getElementById('recentWordsList');
    const recent = state.words.slice(0, 5);
    if (!recent.length) {
      list.innerHTML = `<div class="p-6 text-center text-xs" style="color:var(--text-muted);">No words yet — type a word above and press Enter.</div>`;
      return;
    }
    list.innerHTML = recent.map((w, idx) => {
      const m0 = (w.meanings && w.meanings[0]) || { pos: '', def: '' };
      const meta = masteryMeta(w.mastery);
      return `
        <div class="stagger-item px-4 py-3 flex items-center justify-between gap-4 hover:bg-[var(--bg-elevated)] transition-colors" style="animation-delay:${idx * 30}ms;">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium text-[14px]">${escapeHtml(w.word)}</span>
              <span class="code-chip">${escapeHtml(w.syllables || syllabifyWord(w.word))}</span>
              <span class="font-mono-code text-[10px]" style="color:${meta.color};">${meta.label}</span>
            </div>
            <p class="text-[13px] truncate mt-1" style="color:var(--text-secondary);">${escapeHtml(m0.def)}</p>
          </div>
          <button data-speak="${escapeHtml(w.word)}" data-audio="${escapeHtml(w.audioUrl || '')}" class="speak-btn p-1.5 rounded-lg hover:bg-[var(--bg-hover)] shrink-0" style="color:var(--text-secondary);" title="Listen">
            <i data-lucide="volume-2" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.speak-btn').forEach(btn => {
      btn.addEventListener('click', () => speakWord(btn.dataset.speak, btn.dataset.audio));
    });
  }

  // =========================================================================
  // 8. VOCABULARY, REVIEW, QUIZ, RECAP, CATEGORIES, SETTINGS
  // =========================================================================
  function getFilteredWords(searchId, catId, posId) {
    const q = (document.getElementById(searchId)?.value || '').trim().toLowerCase();
    const cat = document.getElementById(catId)?.value || 'all';
    const pos = document.getElementById(posId)?.value || 'all';

    return state.words.filter(w => {
      if (cat !== 'all') {
        const cats = w.categories && w.categories.length ? w.categories : ['Uncategorized'];
        if (!cats.includes(cat)) return false;
      }
      if (pos !== 'all') {
        if (!(w.meanings || []).some(m => (m.pos || '').toLowerCase() === pos)) return false;
      }
      if (q) {
        const hay = [w.word, w.syllables, w.tip, ...(w.synonyms || []), ...(w.meanings || []).flatMap(m => [m.def, m.example, m.pos])].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderVocabulary() {
    const grid = document.getElementById('vocabGrid');
    document.getElementById('loadStarterBtn').classList.toggle('hidden', state.words.length > 0);

    let list = getFilteredWords('vocabSearchInput', 'vocabCategoryFilter', 'vocabPosFilter');
    const sort = document.getElementById('vocabSortSelect').value;
    if (sort === 'az') list = [...list].sort((a, b) => a.word.localeCompare(b.word));
    else if (sort === 'mastery') list = [...list].sort((a, b) => (b.mastery || 0) - (a.mastery || 0));

    document.getElementById('vocabSubtitle').textContent =
      `${state.words.length} words · ${state.words.reduce((a, w) => a + (w.meanings || []).length, 0)} meanings · ${state.categories.length} categories`;

    if (!list.length) {
      grid.innerHTML = `<div class="col-span-full surface rounded-xl p-8 text-center space-y-3"><p class="text-xs" style="color:var(--text-muted);">No matching words found.</p><button id="emptyAddWordBtn" class="btn-primary h-8 px-4 rounded-lg text-xs font-medium">+ Add Word</button></div>`;
      const b = document.getElementById('emptyAddWordBtn');
      if (b) b.addEventListener('click', () => openQuickAddModal());
      return;
    }

    grid.innerHTML = list.map((w, idx) => {
      const meta = masteryMeta(w.mastery);
      return `
        <article class="stagger-item surface rounded-xl p-4 flex flex-col justify-between gap-3" style="animation-delay:${Math.min(idx * 22, 180)}ms;">
          <div class="space-y-2.5">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-[15px] font-semibold tracking-tight">${escapeHtml(w.word)}</h3>
                  <span class="code-chip">${escapeHtml(w.syllables || syllabifyWord(w.word))}</span>
                </div>
                <div class="font-mono-code text-[11px] mt-1" style="color:var(--text-muted);">${escapeHtml(w.ipa || '')}</div>
              </div>
              <span class="text-[10px] font-mono-code px-2 py-0.5 rounded-md" style="background:${meta.bg};color:${meta.color};">${meta.label}</span>
            </div>
            <div class="space-y-1.5">
              ${(w.meanings || []).map(m => `
                <div class="elevated rounded-lg p-2.5 space-y-1">
                  <span class="font-mono-code text-[10px] uppercase" style="color:var(--text-muted);">${escapeHtml(m.pos)}</span>
                  <p class="text-[13px] leading-relaxed">${escapeHtml(m.def)}</p>
                  ${m.example ? `<p class="text-[12px] italic" style="color:var(--text-secondary);">"${escapeHtml(m.example)}"</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          <div class="pt-2.5 border-t flex items-center justify-between gap-2 flex-wrap" style="border-color:var(--border);">
            <span class="text-[11px] font-mono-code" style="color:var(--text-muted);">${escapeHtml((w.categories && w.categories[0]) || 'General')}</span>
            <div class="flex items-center gap-1">
              <button data-action="listen" data-id="${w.id}" class="word-act btn-ghost h-7 px-2.5 rounded-md text-[11px] flex items-center gap-1"><i data-lucide="volume-2" class="w-3 h-3"></i> Listen</button>
              <button data-action="edit" data-id="${w.id}" class="word-act btn-ghost h-7 px-2.5 rounded-md text-[11px]">Edit</button>
              <button data-action="delete" data-id="${w.id}" class="word-act h-7 px-2.5 rounded-md text-[11px] hover:bg-[var(--danger-soft)]" style="color:var(--danger);">Delete</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('.word-act').forEach(btn => {
      btn.addEventListener('click', () => {
        const word = state.words.find(x => x.id === btn.dataset.id);
        if (!word) return;
        if (btn.dataset.action === 'listen') speakWord(word.word, word.audioUrl);
        if (btn.dataset.action === 'edit') openQuickAddModal(word);
        if (btn.dataset.action === 'delete') {
          openConfirmModal('Delete Word', `Remove "${word.word}" from your vocabulary?`, () => {
            state.words = state.words.filter(x => x.id !== word.id);
            saveState(); renderActiveView(); showToast(`Deleted "${word.word}".`);
          });
        }
      });
    });
  }

  function buildReviewDeck() {
    const filtered = getFilteredWords('reviewSearchInput', 'reviewCategoryFilter', 'reviewPosFilter');
    reviewSession = { ids: filtered.map(w => w.id), index: 0, revealed: false, gotIt: 0, revisit: 0 };
    state.savedReview = reviewSession;
    saveState();
  }

  function renderReview() {
    const stage = document.getElementById('reviewStage');
    const filtered = getFilteredWords('reviewSearchInput', 'reviewCategoryFilter', 'reviewPosFilter');
    if (!filtered.length) {
      stage.innerHTML = `<div class="surface rounded-xl p-8 text-center text-xs" style="color:var(--text-muted);">No words match the current filters.</div>`;
      return;
    }
    if (!reviewSession || !reviewSession.ids || !reviewSession.ids.length) buildReviewDeck();

    if (reviewSession.index >= reviewSession.ids.length) {
      stage.innerHTML = `
        <div class="surface rounded-xl p-8 text-center space-y-4 animate-in">
          <h2 class="text-base font-semibold">Review Complete</h2>
          <p class="text-xs" style="color:var(--text-secondary);">${reviewSession.ids.length} cards · <span style="color:var(--success);">${reviewSession.gotIt} got it</span> · <span style="color:var(--warning);">${reviewSession.revisit} to revisit</span></p>
          <button id="reviewAgainBtn" class="btn-primary h-9 px-5 rounded-lg text-xs font-medium">Start Fresh Deck</button>
        </div>
      `;
      document.getElementById('reviewAgainBtn').addEventListener('click', () => { buildReviewDeck(); renderReview(); });
      return;
    }

    const word = state.words.find(w => w.id === reviewSession.ids[reviewSession.index]);
    if (!word) { reviewSession.index++; renderReview(); return; }

    const total = reviewSession.ids.length;
    const pct = Math.round(((reviewSession.index + 1) / total) * 100);
    stage.innerHTML = `
      <div class="space-y-3.5">
        <div class="flex items-center justify-between text-[11px] font-mono-code" style="color:var(--text-muted);">
          <span>CARD ${reviewSession.index + 1} / ${total}</span>
          <span>${reviewSession.gotIt} got it · ${reviewSession.revisit} revisit</span>
        </div>
        <div class="w-full h-1 rounded-full overflow-hidden" style="background:var(--bg-hover);">
          <div class="h-full rounded-full transition-all duration-300" style="width:${pct}%;background:var(--text-primary);"></div>
        </div>

        <div class="surface flashcard-morph ${reviewSession.revealed ? 'is-revealed' : ''} rounded-xl p-6 sm:p-8 space-y-5 text-center">
          <div class="space-y-2">
            <h2 class="text-3xl font-semibold tracking-tight">${escapeHtml(word.word)}</h2>
            <div class="flex items-center justify-center gap-2">
              <span class="code-chip">${escapeHtml(word.syllables || syllabifyWord(word.word))}</span>
              <span class="font-mono-code text-xs" style="color:var(--text-muted);">${escapeHtml(word.ipa || '')}</span>
            </div>
          </div>

          <div>
            <button id="cardListenBtn" class="btn-ghost h-8 px-3 rounded-lg text-xs inline-flex items-center gap-1.5">
              <i data-lucide="volume-2" class="w-3.5 h-3.5"></i> Listen <span class="kbd ml-1 hidden sm:inline">L</span>
            </button>
          </div>

          ${reviewSession.revealed ? `
            <div class="text-left space-y-2 pt-3 border-t animate-in" style="border-color:var(--border);">
              ${(word.meanings || []).map(m => `
                <div class="elevated rounded-lg p-3 space-y-1">
                  <span class="font-mono-code text-[10px] uppercase" style="color:var(--text-muted);">${escapeHtml(m.pos)}</span>
                  <p class="text-[14px] leading-relaxed">${escapeHtml(m.def)}</p>
                  ${m.example ? `<p class="text-xs italic" style="color:var(--text-secondary);">"${escapeHtml(m.example)}"</p>` : ''}
                </div>
              `).join('')}
            </div>
            <div class="flex items-center gap-2.5 pt-2">
              <button id="cardRevisitBtn" class="btn-ghost flex-1 h-9 rounded-lg text-xs">Practice again <span class="kbd ml-1 hidden sm:inline">1</span></button>
              <button id="cardGotItBtn" class="btn-primary flex-1 h-9 rounded-lg text-xs font-medium">Got it → <span class="kbd ml-1 hidden sm:inline" style="background:rgba(0,0,0,0.14);color:var(--btn-text);border-color:transparent;">2</span></button>
            </div>
          ` : `
            <div class="flex items-center justify-center gap-2.5 pt-3">
              <button id="cardSkipBtn" class="btn-ghost h-9 px-4 rounded-lg text-xs">Skip</button>
              <button id="cardRevealBtn" class="btn-primary h-9 px-5 rounded-lg text-xs font-medium">Reveal meaning <span class="kbd ml-1 hidden sm:inline" style="background:rgba(0,0,0,0.14);color:var(--btn-text);border-color:transparent;">Space</span></button>
            </div>
          `}
        </div>
      </div>
    `;

    document.getElementById('cardListenBtn').addEventListener('click', () => speakWord(word.word, word.audioUrl));
    if (!reviewSession.revealed) {
      document.getElementById('cardRevealBtn').addEventListener('click', () => {
        reviewSession.revealed = true; state.savedReview = reviewSession; saveState(); renderReview(); if (window.lucide) lucide.createIcons();
      });
      document.getElementById('cardSkipBtn').addEventListener('click', () => {
        reviewSession.index++; reviewSession.revealed = false; state.savedReview = reviewSession; saveState(); renderReview(); if (window.lucide) lucide.createIcons();
      });
    } else {
      document.getElementById('cardRevisitBtn').addEventListener('click', () => finishReviewCard(word, false));
      document.getElementById('cardGotItBtn').addEventListener('click', () => finishReviewCard(word, true));
    }
  }

  function finishReviewCard(word, gotIt) {
    if (gotIt) { word.mastery = Math.min(3, (word.mastery || 0) + 1); reviewSession.gotIt++; }
    else { word.mastery = Math.max(1, (word.mastery || 1) - 1); reviewSession.revisit++; }
    word.reviews = (word.reviews || 0) + 1;
    word.lastReviewed = todayISO();
    state.stats.totalReviewed++;
    recordActivity(1);

    reviewSession.index++;
    reviewSession.revealed = false;
    if (reviewSession.index >= reviewSession.ids.length) {
      state.sessionHistory.unshift({ timestamp: new Date().toLocaleString(), type: 'Review', summary: `${reviewSession.gotIt} got it, ${reviewSession.revisit} to revisit` });
      state.savedReview = null;
    } else {
      state.savedReview = reviewSession;
    }
    saveState();
    renderReview();
    updateGlobalBadges();
    renderPeaksCharts();
    if (window.lucide) lucide.createIcons();
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function buildEligibleQuizQuestions(customWordIds = null) {
    const pool = customWordIds
      ? state.words.filter(w => customWordIds.includes(w.id))
      : getFilteredWords('quizSearchInput', 'quizCategoryFilter', 'quizPosFilter');
    const allWords = state.words;
    if (allWords.length < 4) return [];

    const questions = [];
    for (const w of pool) {
      if (state.reportedQuizIds.includes(w.id)) continue;
      const m = w.meanings && w.meanings[0];
      if (!m || !m.def) continue;
      const samePos = allWords.filter(o => o.id !== w.id && (o.meanings || []).some(om => om.pos === m.pos));
      const otherPos = allWords.filter(o => o.id !== w.id && !samePos.includes(o));
      const distractors = [...shuffle(samePos), ...shuffle(otherPos)].slice(0, 3);
      if (distractors.length < 3) continue;
      questions.push({
        wordId: w.id, correctWord: w.word, pos: m.pos || 'word', def: m.def, example: m.example || '',
        options: shuffle([w, ...distractors]).map(o => ({ id: o.id, word: o.word }))
      });
    }
    return shuffle(questions);
  }

  function renderQuiz() {
    const stage = document.getElementById('quizStage');
    const filterBar = document.getElementById('quizFilterControls');

    if (!quizSession) {
      filterBar.classList.remove('hidden');
      const eligible = buildEligibleQuizQuestions();
      const reportedCount = state.reportedQuizIds.length;
      stage.innerHTML = `
        <div class="surface rounded-xl p-5 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-medium">Start Practice Quiz</h2>
              <p class="text-xs mt-0.5" style="color:var(--text-secondary);"><strong class="font-mono-code">${eligible.length}</strong> eligible questions ready.</p>
            </div>
            ${reportedCount > 0 ? `<button id="restoreReportedBtn" class="btn-ghost h-8 px-3 rounded-lg text-xs">Restore ${reportedCount} reported</button>` : ''}
          </div>
          <div class="flex flex-col sm:flex-row gap-2.5">
            <select id="quizLengthSelect" class="input-field flex-1 h-9 px-3 rounded-lg text-xs">
              <option value="10">Up to 10 questions</option>
              <option value="20">Up to 20 questions</option>
              <option value="all">All eligible (${eligible.length})</option>
            </select>
            <button id="startQuizBtn" class="btn-primary h-9 px-5 rounded-lg text-xs font-medium disabled:opacity-40" ${eligible.length === 0 ? 'disabled' : ''}>Start practice →</button>
          </div>
        </div>
      `;
      const restoreBtn = document.getElementById('restoreReportedBtn');
      if (restoreBtn) restoreBtn.addEventListener('click', () => { state.reportedQuizIds = []; saveState(); renderQuiz(); showToast('Restored reported questions.', 'success'); });
      document.getElementById('startQuizBtn').addEventListener('click', () => {
        const lenVal = document.getElementById('quizLengthSelect').value;
        const qList = lenVal === 'all' ? eligible : eligible.slice(0, Number(lenVal));
        quizSession = { questions: qList, index: 0, correct: 0, missedIds: [], answered: null };
        state.savedQuiz = quizSession;
        saveState();
        renderQuiz();
      });
      return;
    }

    filterBar.classList.add('hidden');

    if (quizSession.index >= quizSession.questions.length) {
      const total = quizSession.questions.length;
      const missed = quizSession.missedIds.length;
      stage.innerHTML = `
        <div class="surface rounded-xl p-8 text-center space-y-4 animate-in">
          <h2 class="text-base font-semibold">Quiz Complete</h2>
          <p class="text-xs" style="color:var(--text-secondary);">Score: <strong class="font-mono-code" style="color:var(--success);">${quizSession.correct} / ${total}</strong>${missed > 0 ? ` · ${missed} missed` : ' · Perfect run'}</p>
          <div class="flex flex-wrap justify-center gap-2 pt-1">
            ${missed > 0 ? `<button id="retryMissedQuizBtn" class="btn-primary h-9 px-4 rounded-lg text-xs font-medium">Retry ${missed} missed</button>` : ''}
            <button id="newQuizSetupBtn" class="btn-ghost h-9 px-4 rounded-lg text-xs">New Quiz</button>
          </div>
        </div>
      `;
      const retryBtn = document.getElementById('retryMissedQuizBtn');
      if (retryBtn) retryBtn.addEventListener('click', () => {
        quizSession = { questions: buildEligibleQuizQuestions(quizSession.missedIds), index: 0, correct: 0, missedIds: [], answered: null };
        state.savedQuiz = quizSession; saveState(); renderQuiz();
      });
      document.getElementById('newQuizSetupBtn').addEventListener('click', () => { quizSession = null; state.savedQuiz = null; saveState(); renderQuiz(); });
      return;
    }

    const q = quizSession.questions[quizSession.index];
    const pct = Math.round(((quizSession.index + 1) / quizSession.questions.length) * 100);
    const letters = ['A', 'B', 'C', 'D'];
    stage.innerHTML = `
      <div class="space-y-3.5">
        <div class="flex items-center justify-between text-[11px] font-mono-code" style="color:var(--text-muted);">
          <span>QUESTION ${quizSession.index + 1} / ${quizSession.questions.length}</span>
          <span class="uppercase">${escapeHtml(q.pos)}</span>
        </div>
        <div class="w-full h-1 rounded-full overflow-hidden" style="background:var(--bg-hover);">
          <div class="h-full rounded-full transition-all duration-300" style="width:${pct}%;background:var(--text-primary);"></div>
        </div>
        <div class="surface rounded-xl p-6 space-y-5">
          <div class="space-y-1.5">
            <div class="text-[11px] font-mono-code uppercase" style="color:var(--text-muted);">Which word matches this definition?</div>
            <p class="text-[15px] font-medium leading-relaxed">${escapeHtml(q.def)}</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            ${q.options.map((opt, idx) => {
              let extra = '';
              if (quizSession.answered) {
                if (opt.id === q.wordId) extra = 'border-color:var(--success);background:var(--success-soft);color:var(--success);';
                else if (opt.id === quizSession.answered) extra = 'border-color:var(--danger);background:var(--danger-soft);color:var(--danger);';
              }
              return `<button data-opt-id="${opt.id}" class="quiz-opt-btn elevated rounded-lg p-3 text-left flex items-center gap-2.5 transition-all hover:border-[var(--border-strong)]" style="${extra}" ${quizSession.answered ? 'disabled' : ''}>
                <span class="kbd shrink-0">${letters[idx]}</span>
                <span class="font-medium text-sm">${escapeHtml(opt.word)}</span>
              </button>`;
            }).join('')}
          </div>
          ${quizSession.answered ? `
            <div class="elevated rounded-lg p-3 space-y-1 animate-in">
              <div class="text-xs font-medium" style="color:${quizSession.answered === q.wordId ? 'var(--success)' : 'var(--danger)'};">
                ${quizSession.answered === q.wordId ? '✓ Correct' : `✕ Answer: ${escapeHtml(q.correctWord)}`}
              </div>
              ${q.example ? `<p class="text-xs italic" style="color:var(--text-secondary);">"${escapeHtml(q.example)}"</p>` : ''}
            </div>
            <div class="flex items-center justify-between">
              <button id="reportQuizBtn" class="btn-ghost h-8 px-3 rounded-lg text-xs">Report</button>
              <button id="nextQuizBtn" class="btn-primary h-9 px-5 rounded-lg text-xs font-medium">Next →</button>
            </div>
          ` : `
            <div class="flex items-center justify-between">
              <button id="reportQuizBtn" class="btn-ghost h-8 px-3 rounded-lg text-xs">Report</button>
              <button id="skipQuizBtn" class="btn-ghost h-8 px-3.5 rounded-lg text-xs">Skip</button>
            </div>
          `}
        </div>
      </div>
    `;

    stage.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosenId = btn.dataset.optId;
        quizSession.answered = chosenId;
        const word = state.words.find(w => w.id === q.wordId);
        if (chosenId === q.wordId) {
          quizSession.correct++;
          if (word) { word.mastery = Math.min(3, (word.mastery || 0) + 1); word.reviews = (word.reviews || 0) + 1; }
        } else {
          if (!quizSession.missedIds.includes(q.wordId)) quizSession.missedIds.push(q.wordId);
          if (word) word.mastery = Math.max(1, (word.mastery || 1) - 1);
        }
        recordActivity(1);
        state.savedQuiz = quizSession;
        saveState();
        renderQuiz();
        updateGlobalBadges();
        renderPeaksCharts();
      });
    });

    const reportBtn = document.getElementById('reportQuizBtn');
    if (reportBtn) reportBtn.addEventListener('click', () => {
      if (!state.reportedQuizIds.includes(q.wordId)) state.reportedQuizIds.push(q.wordId);
      advanceQuizQuestion();
      showToast('Question reported & excluded.');
    });
    const skipBtn = document.getElementById('skipQuizBtn');
    if (skipBtn) skipBtn.addEventListener('click', advanceQuizQuestion);
    const nextBtn = document.getElementById('nextQuizBtn');
    if (nextBtn) nextBtn.addEventListener('click', advanceQuizQuestion);
  }

  function advanceQuizQuestion() {
    quizSession.index++;
    quizSession.answered = null;
    if (quizSession.index >= quizSession.questions.length) {
      state.stats.quizzesCompleted++;
      state.sessionHistory.unshift({ timestamp: new Date().toLocaleString(), type: 'Quiz', summary: `${quizSession.correct} / ${quizSession.questions.length} correct` });
      state.savedQuiz = null;
    } else {
      state.savedQuiz = quizSession;
    }
    saveState();
    renderQuiz();
    updateGlobalBadges();
  }

  function renderRecap() {
    const container = document.getElementById('recapList');
    const quick = document.getElementById('recapQuickFilter').value;
    const pickedDate = document.getElementById('recapDatePicker').value;

    let words = state.words.slice();
    if (pickedDate) words = words.filter(w => w.addedDate === pickedDate);
    else if (quick === 'today') words = words.filter(w => w.addedDate === dateOffsetISO(0));
    else if (quick === 'yesterday') words = words.filter(w => w.addedDate === dateOffsetISO(1));
    else if (quick === '3days') words = words.filter(w => w.addedDate === dateOffsetISO(3));
    else if (quick === '7days') words = words.filter(w => w.addedDate === dateOffsetISO(7));
    else if (quick === 'unknown') words = words.filter(w => !w.addedDate);

    if (!words.length) {
      container.innerHTML = `<div class="surface rounded-xl p-8 text-center text-xs" style="color:var(--text-muted);">No words recorded for this date filter.</div>`;
      return;
    }

    const groups = {};
    words.forEach(w => { const key = w.addedDate || 'Unknown date'; if (!groups[key]) groups[key] = []; groups[key].push(w); });
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    container.innerHTML = sortedKeys.map(dateKey => {
      const label = dateKey === 'Unknown date'
        ? 'Date unknown'
        : new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      return `
        <div class="space-y-2">
          <div class="flex items-center justify-between px-0.5">
            <h2 class="text-xs font-mono-code uppercase" style="color:var(--text-secondary);">${escapeHtml(label)}</h2>
            <span class="text-[11px] font-mono-code" style="color:var(--text-muted);">${groups[dateKey].length}</span>
          </div>
          <div class="surface rounded-xl divide-y overflow-hidden" style="border-color:var(--border);">
            ${groups[dateKey].map(w => `
              <div class="p-4 space-y-2">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex items-center gap-2.5">
                    <span class="font-medium text-sm">${escapeHtml(w.word)}</span>
                    <span class="code-chip">${escapeHtml(w.syllables || '')}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <button data-recap-listen="${w.id}" class="recap-listen btn-ghost h-7 px-2.5 rounded-md text-[11px] flex items-center gap-1"><i data-lucide="volume-2" class="w-3 h-3"></i> Listen</button>
                    <button data-recap-edit="${w.id}" class="recap-edit btn-ghost h-7 px-2.5 rounded-md text-[11px]">Edit</button>
                  </div>
                </div>
                <details>
                  <summary class="cursor-pointer text-xs select-none" style="color:var(--text-secondary);">Recall, then reveal meanings</summary>
                  <div class="mt-2 space-y-1.5">
                    ${(w.meanings || []).map(m => `
                      <div class="elevated rounded-lg p-2.5 space-y-0.5">
                        <span class="font-mono-code text-[10px] uppercase" style="color:var(--text-muted);">${escapeHtml(m.pos)}</span>
                        <p class="text-[13px]">${escapeHtml(m.def)}</p>
                        ${m.example ? `<p class="text-xs italic" style="color:var(--text-secondary);">"${escapeHtml(m.example)}"</p>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </details>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.recap-listen').forEach(b => b.addEventListener('click', () => {
      const w = state.words.find(x => x.id === b.dataset.recapListen);
      if (w) speakWord(w.word, w.audioUrl);
    }));
    container.querySelectorAll('.recap-edit').forEach(b => b.addEventListener('click', () => {
      const w = state.words.find(x => x.id === b.dataset.recapEdit);
      if (w) openQuickAddModal(w);
    }));
  }

  function renderCategories() {
    const list = document.getElementById('categoriesList');
    list.innerHTML = state.categories.map(cat => {
      const count = state.words.filter(w => (w.categories || []).includes(cat)).length;
      return `
        <div class="surface rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div>
            <div class="font-medium text-sm">${escapeHtml(cat)}</div>
            <div class="text-[11px] font-mono-code" style="color:var(--text-muted);">${count} ${count === 1 ? 'word' : 'words'}</div>
          </div>
          <div class="flex items-center gap-1.5">
            <button data-cat-rename="${escapeHtml(cat)}" class="cat-rename btn-ghost h-7 px-2.5 rounded-md text-xs">Rename</button>
            <button data-cat-delete="${escapeHtml(cat)}" class="cat-delete h-7 px-2.5 rounded-md text-xs hover:bg-[var(--danger-soft)]" style="color:var(--danger);">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.cat-rename').forEach(btn => btn.addEventListener('click', () => {
      renamingCategoryName = btn.dataset.catRename;
      document.getElementById('renameCategoryInput').value = renamingCategoryName;
      document.getElementById('renameModal').classList.remove('hidden');
      document.getElementById('renameModal').classList.add('flex');
    }));

    list.querySelectorAll('.cat-delete').forEach(btn => btn.addEventListener('click', () => {
      const name = btn.dataset.catDelete;
      openConfirmModal('Delete Category', `Delete "${name}"? Words will be kept under "Uncategorized" if they have no other category.`, () => {
        state.categories = state.categories.filter(c => c !== name);
        state.words.forEach(w => {
          w.categories = (w.categories || []).filter(c => c !== name);
          if (!w.categories.length) w.categories = ['Uncategorized'];
        });
        saveState(); renderActiveView(); showToast(`Deleted "${name}".`);
      });
    }));
  }

  function renderSettings() {
    document.getElementById('simulateOfflineToggle').checked = !!state.settings.simulateOffline;
    document.getElementById('googleRhythmToggle').checked = state.settings.googleRhythm !== false;
    document.getElementById('geminiKeyInput').value = state.settings.geminiApiKey || '';
    document.getElementById('dailyGoalInput').value = state.settings.dailyGoal || 5;
    document.getElementById('speedSelect').value = String(state.settings.speechRate || 1);
    populateVoices();
    updateVoiceGenderUI();
  }

  // =========================================================================
  // 9. QUICK-ADD / EDIT MODAL
  // =========================================================================
  function openQuickAddModal(existingWord = null, prefillEnrich = null) {
    editingWordId = existingWord ? existingWord.id : null;
    currentEnrichResult = null;
    selectedMeaningIndices = new Set([0]);
    selectedCategoryInModal = existingWord && existingWord.categories && existingWord.categories[0]
      ? existingWord.categories[0]
      : (prefillEnrich && prefillEnrich.category ? prefillEnrich.category : 'General');

    const modal = document.getElementById('quickAddModal');
    const input = document.getElementById('quickWordInput');
    const statusStrip = document.getElementById('enrichStatusStrip');
    const emptyHint = document.getElementById('quickEmptyHint');
    const resultWrap = document.getElementById('quickResultWrap');
    const manualSec = document.getElementById('manualEditSection');
    const saveBtn = document.getElementById('saveQuickWordBtn');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    manualSec.classList.add('hidden');
    document.getElementById('saveQuickBtnLabel').textContent = existingWord ? 'Update Word' : 'Save Word';

    const tryWords = ['alacrity', 'equanimity', 'ineffable', 'pithy', 'sagacious'];
    document.getElementById('quickTryChips').innerHTML = tryWords.map(tw =>
      `<button type="button" data-try="${tw}" class="try-chip code-chip hover:border-[var(--text-muted)]">${tw}</button>`
    ).join('');
    document.querySelectorAll('.try-chip').forEach(c => c.addEventListener('click', () => {
      input.value = c.dataset.try;
      triggerModalEnrichment(c.dataset.try);
    }));

    const seed = existingWord ? {
      word: existingWord.word,
      syllables: existingWord.syllables || syllabifyWord(existingWord.word),
      ipa: existingWord.ipa || estimateIpa(existingWord.word),
      category: selectedCategoryInModal,
      synonyms: existingWord.synonyms || [],
      tip: existingWord.tip || '',
      meanings: (existingWord.meanings || []).map(m => ({ ...m })),
      source: 'Saved',
      audioUrl: existingWord.audioUrl || ''
    } : prefillEnrich;

    if (seed) {
      input.value = seed.word;
      statusStrip.classList.add('hidden');
      emptyHint.classList.add('hidden');
      currentEnrichResult = seed;
      selectedMeaningIndices = new Set(seed.meanings.map((_, i) => i));
      renderModalSuggestion(seed);
      resultWrap.classList.remove('hidden');
      if (prefillEnrich) manualSec.classList.remove('hidden');
      saveBtn.disabled = false;
    } else {
      input.value = '';
      statusStrip.classList.add('hidden');
      emptyHint.classList.remove('hidden');
      resultWrap.classList.add('hidden');
      saveBtn.disabled = true;
    }

    setTimeout(() => input.focus(), 40);
    if (window.lucide) lucide.createIcons();
  }

  function closeQuickAddModal() {
    document.getElementById('quickAddModal').classList.add('hidden');
    document.getElementById('quickAddModal').classList.remove('flex');
    clearTimeout(modalDebounce);
  }

  async function triggerModalEnrichment(rawWord) {
    const word = rawWord.trim();
    if (word.length < 2) return;
    const statusStrip = document.getElementById('enrichStatusStrip');
    const statusText = document.getElementById('enrichStatusText');
    const sourceBadge = document.getElementById('enrichSourceBadge');
    const isOnline = navigator.onLine && !state.settings.simulateOffline;

    statusStrip.classList.remove('hidden');
    statusText.textContent = isOnline ? `Enriching "${word}"...` : `Looking up "${word}" offline...`;
    sourceBadge.textContent = isOnline ? 'online' : 'offline';

    const result = await enrichWord(word);
    if (document.getElementById('quickWordInput').value.trim().toLowerCase() !== word.toLowerCase()) return;

    currentEnrichResult = result;
    selectedMeaningIndices = new Set([0]);
    selectedCategoryInModal = state.categories.includes(result.category) ? result.category : (state.categories[0] || 'General');

    statusText.textContent = 'Ready · press Enter to save';
    sourceBadge.textContent = result.source;
    document.getElementById('quickEmptyHint').classList.add('hidden');
    document.getElementById('quickResultWrap').classList.remove('hidden');
    document.getElementById('saveQuickWordBtn').disabled = false;
    renderModalSuggestion(result);
  }

  function renderModalSuggestion(res) {
    document.getElementById('resWordTitle').textContent = res.word.charAt(0).toUpperCase() + res.word.slice(1);
    document.getElementById('resSyllables').textContent = res.syllables;
    document.getElementById('resIpa').textContent = res.ipa;

    document.getElementById('manualSyllables').value = res.syllables || '';
    document.getElementById('manualIpa').value = res.ipa || '';
    const firstM = res.meanings[0] || { pos: 'noun', def: '', example: '' };
    document.getElementById('manualPos').value = ['noun', 'verb', 'adjective', 'adverb', 'phrase'].includes(firstM.pos) ? firstM.pos : 'noun';
    document.getElementById('manualDef').value = firstM.def || '';
    document.getElementById('manualExample').value = firstM.example || '';

    const mList = document.getElementById('resMeaningsList');
    mList.innerHTML = res.meanings.map((m, i) => {
      const checked = selectedMeaningIndices.has(i);
      return `
        <button type="button" data-midx="${i}" class="meaning-pick w-full text-left rounded-lg p-2.5 flex items-start gap-2.5"
          style="background:${checked ? 'var(--bg-hover)' : 'var(--bg-elevated)'};border:1px solid ${checked ? 'var(--border-strong)' : 'var(--border)'};">
          <span class="mt-0.5 w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[9px] font-bold"
            style="background:${checked ? 'var(--btn-bg)' : 'transparent'};color:${checked ? 'var(--btn-text)' : 'transparent'};border:1px solid ${checked ? 'var(--btn-bg)' : 'var(--border-strong)'};">✓</span>
          <div class="space-y-0.5 min-w-0">
            <span class="font-mono-code text-[10px] uppercase" style="color:var(--text-muted);">${escapeHtml(m.pos)}</span>
            <p class="text-[13px] leading-relaxed">${escapeHtml(m.def)}</p>
            ${m.example ? `<p class="text-xs italic" style="color:var(--text-secondary);">"${escapeHtml(m.example)}"</p>` : ''}
          </div>
        </button>
      `;
    }).join('');
    mList.querySelectorAll('.meaning-pick').forEach(btn => btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.midx);
      if (selectedMeaningIndices.has(idx) && selectedMeaningIndices.size > 1) selectedMeaningIndices.delete(idx);
      else selectedMeaningIndices.add(idx);
      renderModalSuggestion(res);
    }));

    document.getElementById('resTip').textContent = res.tip || 'Tap Listen to lock in pronunciation.';
    document.getElementById('resSynonyms').innerHTML = (res.synonyms || []).map(s =>
      `<span class="code-chip">${escapeHtml(s)}</span>`
    ).join('');

    const pills = document.getElementById('resCategoryPills');
    pills.innerHTML = (state.categories.length ? state.categories : ['General']).map(c => {
      const active = c === selectedCategoryInModal;
      return `<button type="button" data-cat-pick="${escapeHtml(c)}" class="cat-pick px-2.5 py-0.5 rounded-md text-[11px]"
        style="background:${active ? 'var(--btn-bg)' : 'var(--bg-elevated)'};color:${active ? 'var(--btn-text)' : 'var(--text-secondary)'};border:1px solid ${active ? 'var(--btn-bg)' : 'var(--border)'};">${escapeHtml(c)}</button>`;
    }).join('');
    pills.querySelectorAll('.cat-pick').forEach(btn => btn.addEventListener('click', () => {
      selectedCategoryInModal = btn.dataset.catPick;
      renderModalSuggestion(res);
    }));
    if (window.lucide) lucide.createIcons();
  }

  function saveQuickWord() {
    if (!currentEnrichResult) return;
    const manualVisible = !document.getElementById('manualEditSection').classList.contains('hidden');
    let finalMeanings = currentEnrichResult.meanings.filter((_, i) => selectedMeaningIndices.has(i));
    if (!finalMeanings.length) finalMeanings = [currentEnrichResult.meanings[0]];

    let syllables = currentEnrichResult.syllables;
    let ipa = currentEnrichResult.ipa;
    if (manualVisible) {
      syllables = document.getElementById('manualSyllables').value.trim() || syllables;
      ipa = document.getElementById('manualIpa').value.trim() || ipa;
      const mDef = document.getElementById('manualDef').value.trim();
      const mEx = document.getElementById('manualExample').value.trim();
      const mPos = document.getElementById('manualPos').value;
      if (mDef) finalMeanings = [{ pos: mPos, def: mDef, example: mEx }, ...finalMeanings.slice(1)];
    }

    const formattedWord = currentEnrichResult.word.charAt(0).toUpperCase() + currentEnrichResult.word.slice(1);
    if (editingWordId) {
      const existing = state.words.find(w => w.id === editingWordId);
      if (existing) {
        existing.word = formattedWord; existing.syllables = syllables; existing.ipa = ipa;
        existing.categories = [selectedCategoryInModal]; existing.meanings = finalMeanings;
      }
      saveState(); closeQuickAddModal(); renderActiveView(); showToast(`Updated "${formattedWord}".`, 'success');
      return;
    }

    const dup = state.words.find(w => w.word.toLowerCase() === formattedWord.toLowerCase());
    if (dup) {
      dup.meanings = finalMeanings; dup.syllables = syllables; dup.ipa = ipa;
      if (!dup.categories.includes(selectedCategoryInModal)) dup.categories.push(selectedCategoryInModal);
      saveState(); closeQuickAddModal(); resetInlineCapture(); renderActiveView(); showToast(`Updated "${formattedWord}".`, 'success');
      return;
    }

    state.words.unshift({
      id: uid(), word: formattedWord, syllables, ipa, categories: [selectedCategoryInModal],
      synonyms: currentEnrichResult.synonyms || [], tip: currentEnrichResult.tip || '',
      meanings: finalMeanings, addedDate: todayISO(), mastery: 0, reviews: 0, lastReviewed: null,
      audioUrl: currentEnrichResult.audioUrl || ''
    });
    recordActivity(1); saveState(); closeQuickAddModal(); resetInlineCapture(); renderActiveView();
    showToast(`Saved "${formattedWord}"`, 'success');
  }

  // =========================================================================
  // 10. DRAWER, MODALS & BACKUP
  // =========================================================================
  function openProfileDrawer() {
    document.getElementById('profReviewedCount').textContent = state.stats.totalReviewed || 0;
    document.getElementById('profQuizCount').textContent = state.stats.quizzesCompleted || 0;
    const hist = document.getElementById('sessionHistoryList');
    hist.innerHTML = state.sessionHistory.length
      ? state.sessionHistory.slice(0, 12).map(h => `
          <div class="elevated rounded-lg p-2.5 text-xs space-y-0.5">
            <div class="flex items-center justify-between font-mono-code text-[10px]" style="color:var(--text-muted);">
              <span>${escapeHtml(h.type)}</span><span>${escapeHtml(h.timestamp)}</span>
            </div>
            <div style="color:var(--text-secondary);">${escapeHtml(h.summary)}</div>
          </div>`).join('')
      : `<p class="text-xs" style="color:var(--text-muted);">No sessions yet.</p>`;
    document.getElementById('profileDrawer').classList.remove('hidden');
    document.getElementById('profileDrawer').classList.add('flex');
    if (window.lucide) lucide.createIcons();
  }
  function closeProfileDrawer() {
    document.getElementById('profileDrawer').classList.add('hidden');
    document.getElementById('profileDrawer').classList.remove('flex');
  }
  function openConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = onConfirm;
    document.getElementById('confirmModal').classList.remove('hidden');
    document.getElementById('confirmModal').classList.add('flex');
  }
  function closeConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
    document.getElementById('confirmModal').classList.remove('flex');
    confirmCallback = null;
  }
  function downloadJson(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function handleImportFile(file, isFullProfile = false) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (isFullProfile && data.words && data.settings) {
          state = { ...defaultState(), ...data }; saveState(); applyTheme(); updateNetworkPill(); renderActiveView();
          showToast('Profile restored.', 'success'); return;
        }
        const rawIncoming = Array.isArray(data.words) ? data.words : (Array.isArray(data) ? data : null);
        if (!rawIncoming) { showToast('Invalid JSON backup.', 'error'); return; }
        const normalized = rawIncoming.map(w => {
          const wordText = (w.word || w.base || '').trim();
          if (!wordText) return null;
          const capWord = wordText.charAt(0).toUpperCase() + wordText.slice(1);
          const meanings = (w.meanings || []).map(m => ({
            pos: (m.pos || 'noun').toLowerCase(),
            def: m.def || m.definition || '',
            example: m.example || (Array.isArray(m.examples) ? (m.examples[0] || '') : '')
          }));
          return {
            id: w.id || uid(),
            word: capWord,
            syllables: w.syllables || syllabifyWord(capWord),
            ipa: w.ipa || estimateIpa(capWord),
            categories: Array.isArray(w.categories) && w.categories.length ? w.categories : ['Everyday English'],
            synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
            tip: w.tip || '',
            meanings,
            addedDate: w.addedDate || w.addedOn || todayISO(),
            mastery: typeof w.mastery === 'number' ? w.mastery : 0,
            reviews: typeof w.reviews === 'number' ? w.reviews : 0,
            lastReviewed: w.lastReviewed || null,
            audioUrl: w.audioUrl || ''
          };
        }).filter(Boolean);

        const method = document.getElementById('importMethodSelect')?.value || 'merge';
        if (method === 'replace') {
          state.words = normalized;
          state.activityLog = {};
          normalized.forEach(w => { if (w.addedDate) state.activityLog[w.addedDate] = (state.activityLog[w.addedDate] || 0) + 1; });
          if (Array.isArray(data.categories)) state.categories = data.categories;
        } else {
          const set = new Set(state.words.map(w => w.word.toLowerCase()));
          normalized.forEach(w => {
            if (!set.has(w.word.toLowerCase())) {
              state.words.push(w);
              set.add(w.word.toLowerCase());
              if (w.addedDate) state.activityLog[w.addedDate] = (state.activityLog[w.addedDate] || 0) + 1;
            }
          });
          if (Array.isArray(data.categories)) data.categories.forEach(c => { if (!state.categories.includes(c)) state.categories.push(c); });
        }
        saveState(); renderActiveView(); showToast(`Imported ${normalized.length} words.`, 'success');
      } catch (_) { showToast('Could not parse JSON file.', 'error'); }
    };
    reader.readAsText(file);
  }

  // =========================================================================
  // 11. EVENT BINDING & BOOT
  // =========================================================================
  function bindEvents() {
    document.querySelectorAll('.nav-item[data-tab]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    document.querySelectorAll('.mobile-tab-btn[data-mobile-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.mobileTab;
        if (target === 'more') {
          const sheet = document.getElementById('mobileMoreSheet');
          sheet.classList.remove('hidden');
          sheet.classList.add('flex');
          if (window.lucide) lucide.createIcons();
        } else {
          switchTab(target);
        }
      });
    });

    document.querySelectorAll('.sheet-nav-btn[data-sheet-tab]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.sheetTab)));
    document.getElementById('closeMobileSheetBtn').addEventListener('click', closeMobileSheet);
    document.getElementById('mobileMoreSheet').addEventListener('click', e => { if (e.target.id === 'mobileMoreSheet') closeMobileSheet(); });

    const inlineInput = document.getElementById('inlineWordInput');
    inlineInput.addEventListener('input', e => {
      const val = e.target.value.trim();
      document.getElementById('inlineClearBtn').classList.toggle('hidden', !val);
      clearTimeout(inlineDebounce);
      if (val.length >= 2) inlineDebounce = setTimeout(() => runInlineEnrich(val), 360);
      else {
        document.getElementById('inlineEnrichPanel').classList.remove('open');
        document.getElementById('heroCaptureWrap').classList.remove('is-open');
        inlineEnrichResult = null;
      }
    });
    inlineInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = inlineInput.value.trim();
        if (inlineEnrichResult && inlineEnrichResult.word.toLowerCase() === val.toLowerCase()) saveInlineWord();
        else if (val.length >= 2) runInlineEnrich(val);
      } else if (e.key === 'Escape') {
        resetInlineCapture();
      }
    });
    document.getElementById('inlineActionBtn').addEventListener('click', () => {
      const val = inlineInput.value.trim();
      if (inlineEnrichResult && inlineEnrichResult.word.toLowerCase() === val.toLowerCase()) saveInlineWord();
      else if (val.length >= 2) runInlineEnrich(val);
      else inlineInput.focus();
    });
    document.getElementById('inlineClearBtn').addEventListener('click', () => { resetInlineCapture(); inlineInput.focus(); });
    document.getElementById('inlineListenBtn').addEventListener('click', () => {
      if (inlineEnrichResult) speakWord(inlineEnrichResult.word, inlineEnrichResult.audioUrl);
    });
    document.getElementById('inlineCustomizeBtn').addEventListener('click', () => {
      if (inlineEnrichResult) openQuickAddModal(null, inlineEnrichResult);
    });
    document.querySelectorAll('.inline-try').forEach(btn => {
      btn.addEventListener('click', () => {
        inlineInput.value = btn.dataset.quickTry;
        document.getElementById('inlineClearBtn').classList.remove('hidden');
        runInlineEnrich(btn.dataset.quickTry);
        inlineInput.focus();
      });
    });

    document.getElementById('openQuickAddBar').addEventListener('click', () => openQuickAddModal());
    document.getElementById('sidebarNewWordBtn').addEventListener('click', () => openQuickAddModal());
    document.getElementById('vocabAddBtn').addEventListener('click', () => openQuickAddModal());
    document.getElementById('dashReviewBtn').addEventListener('click', () => switchTab('review'));
    document.getElementById('viewAllVocabBtn').addEventListener('click', () => switchTab('vocabulary'));

    document.getElementById('toggleInspectorBtn').addEventListener('click', () => {
      state.settings.showInspector = state.settings.showInspector === false ? true : false;
      saveState();
      applyInspectorVisibility();
    });

    document.getElementById('themeToggleBtn').addEventListener('click', () => {
      state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
      saveState(); applyTheme();
    });
    document.getElementById('networkStatusPill').addEventListener('click', () => {
      state.settings.simulateOffline = !state.settings.simulateOffline;
      saveState(); updateNetworkPill();
      showToast(state.settings.simulateOffline ? 'Offline Mode active — using Local Dictionary.' : 'Online Mode active.');
    });
    window.addEventListener('online', updateNetworkPill);
    window.addEventListener('offline', updateNetworkPill);
    window.addEventListener('resize', syncAllMorphPills);

    document.querySelectorAll('.tf-btn, .mob-tf-btn').forEach(btn => btn.addEventListener('click', () => {
      state.settings.chartRange = Number(btn.dataset.range);
      saveState(); renderPeaksCharts();
    }));

    ['vocabSearchInput', 'vocabCategoryFilter', 'vocabPosFilter', 'vocabSortSelect'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderVocabulary);
      document.getElementById(id).addEventListener('change', renderVocabulary);
    });
    document.getElementById('loadStarterBtn').addEventListener('click', () => {
      state.words = buildStarterWords(); saveState(); renderActiveView(); showToast('Loaded 10 starter words.', 'success');
    });

    ['reviewSearchInput', 'reviewCategoryFilter', 'reviewPosFilter'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => { buildReviewDeck(); renderReview(); });
    });
    document.getElementById('reviewSearchInput').addEventListener('input', () => { buildReviewDeck(); renderReview(); });
    document.getElementById('restartReviewBtn').addEventListener('click', () => { buildReviewDeck(); renderReview(); });

    ['quizSearchInput', 'quizCategoryFilter', 'quizPosFilter'].forEach(id => document.getElementById(id).addEventListener('change', renderQuiz));
    document.getElementById('quizSearchInput').addEventListener('input', renderQuiz);

    document.getElementById('recapQuickFilter').addEventListener('change', () => { document.getElementById('recapDatePicker').value = ''; renderRecap(); });
    document.getElementById('recapDatePicker').addEventListener('change', renderRecap);

    document.getElementById('createCategoryBtn').addEventListener('click', () => {
      const inp = document.getElementById('newCategoryInput');
      const val = inp.value.trim();
      if (!val) return;
      if (state.categories.includes(val)) { showToast('Category already exists.', 'error'); return; }
      state.categories.push(val); inp.value = ''; saveState(); renderActiveView(); showToast(`Created "${val}".`, 'success');
    });
    document.getElementById('renameCancelBtn').addEventListener('click', () => {
      document.getElementById('renameModal').classList.add('hidden');
      document.getElementById('renameModal').classList.remove('flex');
    });
    document.getElementById('renameSaveBtn').addEventListener('click', () => {
      const next = document.getElementById('renameCategoryInput').value.trim();
      if (!next || !renamingCategoryName) return;
      state.categories = state.categories.map(c => c === renamingCategoryName ? next : c);
      state.words.forEach(w => { w.categories = (w.categories || []).map(c => c === renamingCategoryName ? next : c); });
      saveState();
      document.getElementById('renameModal').classList.add('hidden');
      document.getElementById('renameModal').classList.remove('flex');
      renderActiveView(); showToast(`Renamed to "${next}".`, 'success');
    });

    document.getElementById('closeQuickAddBtn').addEventListener('click', closeQuickAddModal);
    document.getElementById('cancelQuickAddBtn').addEventListener('click', closeQuickAddModal);
    document.getElementById('quickAddModal').addEventListener('click', e => { if (e.target.id === 'quickAddModal') closeQuickAddModal(); });
    document.getElementById('quickWordInput').addEventListener('input', e => {
      const val = e.target.value.trim();
      clearTimeout(modalDebounce);
      if (val.length >= 2) modalDebounce = setTimeout(() => triggerModalEnrichment(val), 400);
      else document.getElementById('saveQuickWordBtn').disabled = true;
    });
    document.getElementById('quickWordInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = e.target.value.trim();
        if (currentEnrichResult && currentEnrichResult.word.toLowerCase() === val.toLowerCase()) saveQuickWord();
        else if (val.length >= 2) triggerModalEnrichment(val);
      }
    });
    document.getElementById('quickLookupBtn').addEventListener('click', () => {
      const val = document.getElementById('quickWordInput').value.trim();
      if (val.length >= 2) triggerModalEnrichment(val);
    });
    document.getElementById('resListenBtn').addEventListener('click', () => {
      if (currentEnrichResult) speakWord(currentEnrichResult.word, currentEnrichResult.audioUrl);
    });
    document.getElementById('toggleManualEditBtn').addEventListener('click', () => document.getElementById('manualEditSection').classList.toggle('hidden'));
    document.getElementById('saveQuickWordBtn').addEventListener('click', saveQuickWord);

    document.getElementById('simulateOfflineToggle').addEventListener('change', e => { state.settings.simulateOffline = e.target.checked; saveState(); updateNetworkPill(); });
    document.getElementById('saveGeminiKeyBtn').addEventListener('click', () => {
      state.settings.geminiApiKey = document.getElementById('geminiKeyInput').value.trim();
      saveState(); updateNetworkPill(); showToast(state.settings.geminiApiKey ? 'Gemini key saved.' : 'Gemini key cleared.', 'success');
    });
    document.getElementById('saveGoalBtn').addEventListener('click', () => {
      const val = Math.max(1, Math.min(50, Number(document.getElementById('dailyGoalInput').value) || 5));
      state.settings.dailyGoal = val; saveState(); updateGlobalBadges(); showToast(`Daily goal set to ${val}.`, 'success');
    });
    document.getElementById('voiceSelect').addEventListener('change', e => { state.settings.voiceURI = e.target.value; saveState(); });
    document.getElementById('speedSelect').addEventListener('change', e => { state.settings.speechRate = Number(e.target.value); saveState(); });
    document.querySelectorAll('.vg-btn, .vg-settings-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.settings.voiceGender = btn.dataset.voiceGender;
        state.settings.voiceURI = 'auto';
        saveState();
        populateVoices();
        updateVoiceGenderUI();
        showToast(`Voice set to standard ${btn.dataset.voiceGender === 'male' ? 'Male' : 'Female'}.`);
      });
    });
    document.getElementById('googleRhythmToggle').addEventListener('change', e => {
      state.settings.googleRhythm = e.target.checked;
      saveState();
    });
    document.getElementById('refreshVoicesBtn').addEventListener('click', () => { populateVoices(); showToast('Voices refreshed.'); });
    document.getElementById('previewVoiceBtn').addEventListener('click', () => speakWord(document.getElementById('previewWordInput').value.trim() || 'ephemeral'));
    document.getElementById('stopVoiceBtn').addEventListener('click', () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); });

    document.getElementById('exportJsonBtn').addEventListener('click', () => { downloadJson({ words: state.words, categories: state.categories, exportedAt: new Date().toISOString() }, `lexicon-backup-${todayISO()}.json`); showToast('Backup downloaded.', 'success'); });
    document.getElementById('exportFullProfileBtn').addEventListener('click', () => { downloadJson(state, `lexicon-profile-${todayISO()}.json`); showToast('Full profile downloaded.', 'success'); });
    document.getElementById('importJsonInput').addEventListener('change', e => { handleImportFile(e.target.files[0], false); e.target.value = ''; });
    document.getElementById('resetDemoBtn').addEventListener('click', () => { state.words = buildStarterWords(); state.activityLog = buildDefaultActivity(); saveState(); renderActiveView(); showToast('Restored 10 starter words.', 'success'); });
    document.getElementById('clearAllDataBtn').addEventListener('click', () => {
      openConfirmModal('Clear All Vocabulary', 'Remove all saved words from this browser? Export a backup first if needed.', () => {
        state.words = []; reviewSession = null; quizSession = null; state.savedReview = null; state.savedQuiz = null;
        saveState(); renderActiveView(); showToast('All vocabulary cleared.');
      });
    });

    document.getElementById('profileDrawerBtn').addEventListener('click', openProfileDrawer);
    document.getElementById('closeProfileDrawerBtn').addEventListener('click', closeProfileDrawer);
    document.getElementById('profileDrawer').addEventListener('click', e => { if (e.target.id === 'profileDrawer') closeProfileDrawer(); });
    document.getElementById('resumeSavedReviewBtn').addEventListener('click', () => { closeProfileDrawer(); switchTab('review'); });
    document.getElementById('resumeSavedQuizBtn').addEventListener('click', () => { closeProfileDrawer(); switchTab('quiz'); });
    document.getElementById('drawerExportProfileBtn').addEventListener('click', () => { downloadJson(state, `lexicon-profile-${todayISO()}.json`); showToast('Profile exported.', 'success'); });
    document.getElementById('drawerRestoreProfileInput').addEventListener('change', e => { handleImportFile(e.target.files[0], true); e.target.value = ''; closeProfileDrawer(); });

    document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmOkBtn').addEventListener('click', () => { if (confirmCallback) confirmCallback(); closeConfirmModal(); });

    document.addEventListener('keydown', e => {
      const modalOpen = !document.getElementById('quickAddModal').classList.contains('hidden');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (activeTab === 'dashboard' && !modalOpen) inlineInput.focus();
        else modalOpen ? closeQuickAddModal() : openQuickAddModal();
        return;
      }
      if (e.key === 'Escape' && modalOpen) { closeQuickAddModal(); return; }
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || modalOpen) return;

      if (e.key === '/') {
        e.preventDefault();
        if (activeTab === 'dashboard') inlineInput.focus();
        else openQuickAddModal();
        return;
      }
      if (activeTab === 'review' && reviewSession && reviewSession.index < reviewSession.ids.length) {
        const w = state.words.find(x => x.id === reviewSession.ids[reviewSession.index]);
        if (!w) return;
        if (e.key === ' ' && !reviewSession.revealed) { e.preventDefault(); reviewSession.revealed = true; renderReview(); if (window.lucide) lucide.createIcons(); }
        else if (e.key.toLowerCase() === 'l') speakWord(w.word, w.audioUrl);
        else if (e.key === '1' && reviewSession.revealed) finishReviewCard(w, false);
        else if (e.key === '2' && reviewSession.revealed) finishReviewCard(w, true);
      }
    });

    if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // =========================================================================
  // 12. CLOUD AUTH, SYNC UI, STATS & TIMED FEEDBACK POPUP
  // =========================================================================
  let popupThumbedUp = false;

  function renderAuthUI(user) {
    const topLabel = document.getElementById('topAuthLabel');
    const topIcon = document.getElementById('topAuthIcon');
    const topAvatar = document.getElementById('topAuthAvatar');
    const dAvatar = document.getElementById('drawerUserAvatar');
    const dName = document.getElementById('drawerUserName');
    const dEmail = document.getElementById('drawerUserEmail');
    const signInBtn = document.getElementById('drawerGoogleSignInBtn');
    const syncNowBtn = document.getElementById('drawerSyncNowBtn');
    const signOutBtn = document.getElementById('drawerSignOutBtn');

    if (user) {
      const firstName = (user.displayName || user.email || 'Account').split(' ')[0];
      if (topLabel) topLabel.textContent = firstName;
      if (user.photoURL && topAvatar) {
        topAvatar.innerHTML = `<img src="${escapeHtml(user.photoURL)}" alt="" class="w-4 h-4 rounded-full object-cover" />`;
        topAvatar.classList.remove('hidden');
        if (topIcon) topIcon.classList.add('hidden');
      }
      if (dAvatar) {
        dAvatar.innerHTML = user.photoURL
          ? `<img src="${escapeHtml(user.photoURL)}" alt="" class="w-8 h-8 rounded-full object-cover" />`
          : escapeHtml(firstName.charAt(0).toUpperCase());
      }
      if (dName) dName.textContent = user.displayName || 'Google User';
      if (dEmail) dEmail.textContent = user.email || '';
      if (signInBtn) signInBtn.classList.add('hidden');
      if (syncNowBtn) syncNowBtn.classList.remove('hidden');
      if (signOutBtn) signOutBtn.classList.remove('hidden');
    } else {
      if (topLabel) topLabel.textContent = 'Sign in';
      if (topAvatar) topAvatar.classList.add('hidden');
      if (topIcon) topIcon.classList.remove('hidden');
      if (dAvatar) dAvatar.textContent = 'G';
      if (dName) dName.textContent = 'Not signed in';
      if (dEmail) dEmail.textContent = 'Sign in to sync phone & PC';
      if (signInBtn) signInBtn.classList.remove('hidden');
      if (syncNowBtn) syncNowBtn.classList.add('hidden');
      if (signOutBtn) signOutBtn.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
  }

  function renderSyncStatus(status) {
    const pill = document.getElementById('syncStatusPill');
    if (!pill) return;
    if (status === 'synced') {
      pill.textContent = 'synced';
      pill.style.color = 'var(--success)';
    } else if (status === 'syncing') {
      pill.textContent = 'syncing...';
      pill.style.color = 'var(--text-primary)';
    } else if (status === 'offline') {
      pill.textContent = 'offline';
      pill.style.color = 'var(--warning)';
    } else {
      pill.textContent = 'local';
      pill.style.color = 'var(--text-muted)';
    }
  }

  function renderPublicStats(m) {
    const vEl = document.getElementById('statVisitsCount');
    const uEl = document.getElementById('statUsersCount');
    const tEl = document.getElementById('statThumbsCount');
    if (vEl) vEl.textContent = Number(m.visits || 1).toLocaleString();
    if (uEl) uEl.textContent = Number(m.signedInUsers || 0).toLocaleString();
    if (tEl) tEl.textContent = Number(m.thumbsUp || 0).toLocaleString();
    if (m.userThumbedUp) {
      popupThumbedUp = true;
      const ft = document.getElementById('footerThumbsBtn');
      if (ft) ft.style.color = 'var(--success)';
    }
  }

  function openFeedbackPopup() {
    const pop = document.getElementById('feedbackPopup');
    if (!pop) return;
    pop.classList.remove('hidden');
    updatePopupThumbUI();
    if (window.lucide) lucide.createIcons();
  }

  function closeFeedbackPopup(markDismissed = false) {
    const pop = document.getElementById('feedbackPopup');
    if (pop) pop.classList.add('hidden');
    if (markDismissed) {
      try { localStorage.setItem('lexicon_feedback_dismissed', '1'); } catch (_) {}
    }
  }

  function updatePopupThumbUI() {
    const btn = document.getElementById('popupThumbBtn');
    const lbl = document.getElementById('popupThumbLabel');
    if (!btn || !lbl) return;
    if (popupThumbedUp) {
      btn.style.background = 'var(--success-soft)';
      btn.style.borderColor = 'var(--success)';
      btn.style.color = 'var(--success)';
      lbl.textContent = 'Thumbs Up Added ✓';
    } else {
      btn.style.background = 'transparent';
      btn.style.borderColor = 'var(--border)';
      btn.style.color = 'var(--text-secondary)';
      lbl.textContent = 'Give a Thumbs Up';
    }
  }

  function bindCloudAndFeedbackEvents() {
    const handleGoogleSignIn = async () => {
      if (!window.LexiconCloud) return;
      const res = await window.LexiconCloud.signInWithGoogle();
      if (res.ok) showToast('Signed in with Google · Syncing library...', 'success');
      else if (res.error) showToast(res.error, 'error');
    };

    const topAuthBtn = document.getElementById('googleAuthTopBtn');
    if (topAuthBtn) {
      topAuthBtn.addEventListener('click', () => {
        if (window.LexiconCloud && window.LexiconCloud.getUser()) openProfileDrawer();
        else handleGoogleSignIn();
      });
    }
    const drawerSignIn = document.getElementById('drawerGoogleSignInBtn');
    if (drawerSignIn) drawerSignIn.addEventListener('click', handleGoogleSignIn);

    const drawerSync = document.getElementById('drawerSyncNowBtn');
    if (drawerSync) drawerSync.addEventListener('click', () => {
      if (window.LexiconCloud) {
        window.LexiconCloud.scheduleSync(state, true);
        showToast('Cloud sync triggered.', 'success');
      }
    });

    const drawerSignOut = document.getElementById('drawerSignOutBtn');
    if (drawerSignOut) drawerSignOut.addEventListener('click', async () => {
      if (window.LexiconCloud) {
        await window.LexiconCloud.signOut();
        showToast('Signed out · Local words kept safely.');
      }
    });

    const footerThumb = document.getElementById('footerThumbsBtn');
    if (footerThumb) footerThumb.addEventListener('click', async () => {
      if (!window.LexiconCloud) return;
      const res = await window.LexiconCloud.toggleThumbsUp();
      popupThumbedUp = true;
      updatePopupThumbUI();
      showToast(res.alreadyDone ? 'Thanks — you already gave a thumbs up!' : 'Thanks for the thumbs up!', 'success');
    });

    const openFb = document.getElementById('openFeedbackBtn');
    if (openFb) openFb.addEventListener('click', openFeedbackPopup);
    const closeFb = document.getElementById('closeFeedbackBtn');
    if (closeFb) closeFb.addEventListener('click', () => closeFeedbackPopup(true));
    const dismissFb = document.getElementById('dismissFeedbackBtn');
    if (dismissFb) dismissFb.addEventListener('click', () => closeFeedbackPopup(true));

    const popThumb = document.getElementById('popupThumbBtn');
    if (popThumb) popThumb.addEventListener('click', () => {
      popupThumbedUp = !popupThumbedUp;
      updatePopupThumbUI();
    });

    const submitFb = document.getElementById('submitFeedbackBtn');
    if (submitFb) submitFb.addEventListener('click', async () => {
      const comment = document.getElementById('feedbackCommentInput').value.trim();
      if (!popupThumbedUp && !comment) {
        showToast('Tap Thumbs Up or write a quick note first.');
        return;
      }
      if (window.LexiconCloud) await window.LexiconCloud.submitFeedback(comment, popupThumbedUp);
      document.getElementById('feedbackCommentInput').value = '';
      closeFeedbackPopup(true);
      showToast('Thank you for your feedback!', 'success');
    });

    // Show gentle feedback popup once after 45s of active use if not already sent/dismissed
    setTimeout(() => {
      try {
        const dismissed = localStorage.getItem('lexicon_feedback_dismissed');
        const m = window.LexiconCloud ? window.LexiconCloud.getLocalMetrics() : {};
        if (!dismissed && !m.feedbackSent) openFeedbackPopup();
      } catch (_) {}
    }, 45000);
  }

    // Boot
  bindEvents();
  bindCloudAndFeedbackEvents();
  if (window.LexiconCloud) {
    window.LexiconCloud.init({
      onAuthChange: renderAuthUI,
      onSyncStatus: renderSyncStatus,
      onStatsUpdate: renderPublicStats,
      onRemoteState: mergeRemoteState,
      getLocalState: () => state
    });
  }
  applyTheme();
  applyInspectorVisibility();
  updateNetworkPill();
  populateVoices();
  renderActiveView();
  setTimeout(() => {
    syncAllMorphPills();
    const inp = document.getElementById('inlineWordInput');
    if (inp && activeTab === 'dashboard' && window.innerWidth >= 1024) inp.focus();
  }, 80);
})();
