/* =========================================================================
   CONFIG.JS — CẤU HÌNH TRUNG TÂM
   -------------------------------------------------------------------------
   Tập trung MỌI cấu hình vào 1 nơi duy nhất:
   - Firebase (dự án, collection, API key).
   - Nguồn dữ liệu đề thi (JSON tĩnh / API / Google Sheets).
   - Điểm số & thang điểm (bao gồm cả True/False từng phần).
   - Bảng phím tắt.
   - Giá trị mặc định khi thiếu tham số URL.

   Khi triển khai thật: chỉ cần sửa file này, KHÔNG cần đụng các module khác.

   DANH SÁCH NAMED EXPORT (index.html import đúng các tên này):
     - FIREBASE_CONFIG
     - FIRESTORE
     - DATA_SOURCE
     - SCORING
     - KEYMAP
     - DEFAULTS
     - UI
     - DEBUG
     - log
     - getParam
   ========================================================================= */

/* ---------- 1. FIREBASE CONFIG ----------
   Đặt ENABLED = false nếu muốn chạy offline (kết quả lưu LocalStorage).  */
export const FIREBASE_CONFIG = {
  ENABLED: false,
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID'
};

/* ---------- 2. FIRESTORE ---------- */
export const FIRESTORE = {
  COLLECTION_RESULTS: 'quiz_results',
  COLLECTION_EXAMS:   'exams'
};

/* ---------- 3. NGUỒN DỮ LIỆU ĐỀ THI ---------- */
export const DATA_SOURCE = {
  MODE: 'local',
  LOCAL_BASE:     './data',
  LOCAL_FALLBACK: 'sample-exam.json',
  API_BASE:       '/api/exams',
  SHEETS_IDS: {
    // 'toan12_01': 'PUBLISHED_SHEET_ID'
  }
};

/* ---------- 4. THANG ĐIỂM ----------
   TRUE_FALSE_PARTIAL[ n ] = tỉ lệ điểm khi đúng n ý (0..4).
   Ví dụ: đúng 3/4 ý -> 0.5 điểm trên tổng 1 điểm cho câu đó.          */
export const SCORING = {
  POINTS_PER_QUESTION: 1,
  PASS_THRESHOLD: 0.5,

  TRUE_FALSE_PARTIAL: [0, 0.1, 0.25, 0.5, 1.0],

  SHORT_ANSWER_IGNORE_CASE:   true,
  SHORT_ANSWER_IGNORE_SPACES: true
};

/* ---------- 5. PHÍM TẮT ---------- */
export const KEYMAP = {
  NEXT:     ['PageDown', 'ArrowRight', ' ', 'Enter'],
  PREV:     ['PageUp', 'ArrowLeft'],
  CHOOSE: {
    '1': 0, '2': 1, '3': 2, '4': 3,
    'a': 0, 'b': 1, 'c': 2, 'd': 3,
    'A': 0, 'B': 1, 'C': 2, 'D': 3
  },
  TOGGLE_SOLUTION: ['s', 'S'],
  SUBMIT:   ['F2'],
  GO_HOME:  ['Home'],
  GO_END:   ['End']
};

/* ---------- 6. GIÁ TRỊ MẶC ĐỊNH ---------- */
export const DEFAULTS = {
  EXAM_ID:    'toan12_01',
  STUDENT_ID: 'GUEST'
};

/* ---------- 7. UI ---------- */
export const UI = {
  SLIDE_TRANSITION_MS: 250,
  TOAST_DURATION_MS:   2600
};

/* ---------- 8. TIỆN ÍCH: ĐỌC URL PARAM ---------- */
export function getParam(key, fallback) {
  if (fallback === undefined) fallback = '';
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || fallback;
  } catch (e) {
    return fallback;
  }
}

/* ---------- 9. CỜ DEBUG ---------- */
export const DEBUG = false;
export const log = function () {
  if (!DEBUG) return;
  const args = Array.prototype.slice.call(arguments);
  args.unshift('[Quiz]');
  console.log.apply(console, args);
};