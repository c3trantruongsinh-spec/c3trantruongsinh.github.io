/* =========================================================================
   FIREBASE-SYNC.JS — ĐỒNG BỘ KẾT QUẢ LÊN FIRESTORE (Modular SDK v10)
   -------------------------------------------------------------------------
   Nhiệm vụ:
   1. Khởi tạo Firebase (nếu ENABLED = true trong config).
   2. Lưu bài làm vào collection quiz_results.
   3. Nếu mất mạng / Firebase tắt -> fallback LocalStorage,
      tự động gửi lại khi có mạng (flushPendingResults).

   Dùng dynamic import để KHÔNG tải SDK Firebase khi không dùng.
   ========================================================================= */

import {
  FIREBASE_CONFIG,
  FIRESTORE,
  SCORING,
  log
} from './config.js';

/* ---------- 1. STATE NỘI BỘ ---------- */
let _db          = null;
let _collection  = null;
let _initPromise = null;
const PENDING_KEY = 'quiz_pending_results_v1';

/* =========================================================================
   2. KHỞI TẠO FIREBASE (lazy)
   ========================================================================= */
async function ensureInit() {
  if (!FIREBASE_CONFIG.ENABLED) return null;
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async function () {
    try {
      const appMod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const fsMod  = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

      const app = appMod.initializeApp(FIREBASE_CONFIG);
      _db = fsMod.getFirestore(app);
      _collection = {
        collection:      fsMod.collection,
        addDoc:          fsMod.addDoc,
        serverTimestamp: fsMod.serverTimestamp
      };

      log('Firebase đã khởi tạo.');
      return _db;
    } catch (err) {
      console.error('[FirebaseSync] Lỗi khởi tạo Firebase:', err);
      throw err;
    }
  })();

  return _initPromise;
}

/* =========================================================================
   3. GỬI KẾT QUẢ BÀI LÀM
   ========================================================================= */
export async function submitResult(result) {
  if (!result) {
    return { ok: false, error: 'Không có dữ liệu để gửi.' };
  }

  const detailPayload = [];
  for (let i = 0; i < result.details.length; i++) {
    const d = result.details[i];
    detailPayload.push({
      questionId: d.questionId,
      order:      d.order,
      type:       d.type,
      chosen:     d.chosen,
      correct:    d.correct,
      isCorrect:  d.isCorrect,
      earned:     d.earned
    });
  }

  const payload = {
    examId:          result.examId,
    examTitle:       result.examTitle,
    studentId:       result.studentId,
    studentName:     result.studentName || '',
    totalQuestions:  result.totalQuestions,
    answeredCount:   result.answeredCount,
    correctCount:    result.correctCount,
    wrongCount:      result.wrongCount,
    unansweredCount: result.unansweredCount,
    score:           result.score,
    maxScore:        result.maxScore,
    percent:         result.percent,
    passed:          result.passed,
    durationSec:     result.durationSec,
    submittedAt:     result.submittedAt,
    details:         detailPayload,
    clientInfo: {
      userAgent: navigator.userAgent,
      language:  navigator.language,
      platform:  navigator.platform || '',
      viewport:  window.innerWidth + 'x' + window.innerHeight
    },
    scoring: {
      pointsPerQuestion: SCORING.POINTS_PER_QUESTION,
      passThreshold:     SCORING.PASS_THRESHOLD
    }
  };

  /* Firebase tắt -> lưu local */
  if (!FIREBASE_CONFIG.ENABLED) {
    savePending(payload);
    return { ok: true, offline: true, id: 'local_' + Date.now() };
  }

  try {
    const db = await ensureInit();
    if (!db) {
      savePending(payload);
      return { ok: true, offline: true, id: 'local_' + Date.now() };
    }

    const collectionFn      = _collection.collection;
    const addDocFn          = _collection.addDoc;
    const serverTimestampFn = _collection.serverTimestamp;

    const colRef = collectionFn(db, FIRESTORE.COLLECTION_RESULTS);
    const docRef = await addDocFn(colRef, Object.assign({}, payload, {
      _serverCreatedAt: serverTimestampFn()
    }));

    log('Đã lưu kết quả lên Firestore, id =', docRef.id);
    return { ok: true, id: docRef.id };
  } catch (err) {
    console.error('[FirebaseSync] Lỗi gửi Firestore:', err);
    savePending(payload);
    return { ok: false, offline: true, error: err.message };
  }
}

/* =========================================================================
   4. LƯU LOCAL KHI OFFLINE
   ========================================================================= */
function savePending(payload) {
  try {
    const list = readPending();
    list.push({ savedAt: Date.now(), payload: payload });
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    log('Đã lưu tạm bài làm (' + list.length + ' bài đang chờ).');
  } catch (err) {
    console.error('[FirebaseSync] Không lưu được LocalStorage:', err);
  }
}

function readPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function writePending(list) {
  try {
    if (!list || list.length === 0) {
      localStorage.removeItem(PENDING_KEY);
    } else {
      localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('[FirebaseSync] Không ghi được LocalStorage:', err);
  }
}

/* =========================================================================
   5. GỬI LẠI CÁC BÀI TỒN ĐỌNG
   ========================================================================= */
export async function flushPendingResults() {
  if (!FIREBASE_CONFIG.ENABLED) return 0;

  const list = readPending();
  if (list.length === 0) return 0;
  if (!navigator.onLine) return 0;

  let sent = 0;
  const stillPending = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    try {
      const res = await submitRaw(item.payload);
      if (res.ok) sent++;
      else stillPending.push(item);
    } catch (e) {
      stillPending.push(item);
    }
  }

  writePending(stillPending);
  log('Đã gửi lại ' + sent + ' bài làm tồn đọng, còn ' + stillPending.length + ' bài chờ.');
  return sent;
}

async function submitRaw(payload) {
  const db = await ensureInit();
  if (!db) throw new Error('Firebase chưa sẵn sàng.');

  const collectionFn      = _collection.collection;
  const addDocFn          = _collection.addDoc;
  const serverTimestampFn = _collection.serverTimestamp;

  const colRef = collectionFn(db, FIRESTORE.COLLECTION_RESULTS);
  await addDocFn(colRef, Object.assign({}, payload, {
    _serverCreatedAt: serverTimestampFn(),
    _flushedAt:       serverTimestampFn()
  }));

  return { ok: true };
}

/* =========================================================================
   6. TỰ ĐỘNG FLUSH KHI CÓ MẠNG
   ========================================================================= */
if (typeof window !== 'undefined') {
  window.addEventListener('online', function () {
    log('Có mạng trở lại — thử gửi các bài tồn đọng.');
    flushPendingResults().catch(function () {});
  });
}

/* =========================================================================
   7. TIỆN ÍCH XUẤT
   ========================================================================= */
export const FirebaseSync = {
  submitResult:        submitResult,
  flushPendingResults: flushPendingResults,
  getPendingCount:     function () { return readPending().length; }
};