/* =========================================================================
   DATA-LOADER.JS — TẢI & TIỀN XỬ LÝ DỮ LIỆU ĐỀ THI (3 loại câu hỏi)
   -------------------------------------------------------------------------
   Nhiệm vụ:
   1. Xác định nguồn dữ liệu (local / api / sheets) từ CONFIG.DATA_SOURCE.
   2. Fetch JSON đề thi.
   3. Chuẩn hoá dữ liệu: kiểm tra schema, sắp xếp, gán order, tính maxScore.
   4. Trả về object Exam đã chuẩn sẵn sàng cho slide-engine.

   Module này KHÔNG dính dáng tới DOM. Dễ unit test.
   ========================================================================= */

import { DATA_SOURCE, SCORING, log } from './config.js';

/* =========================================================================
   1. API CHÍNH
   ========================================================================= */
export async function loadExam(examId) {
  if (!examId) {
    throw new Error('Thiếu examId.');
  }

  const raw = await fetchRawExam(examId);
  const exam = normalizeExam(raw, examId);

  log('Đã tải đề thi:', exam.id, '(' + exam.questions.length + ' câu)');
  return exam;
}

/* =========================================================================
   2. FETCH RAW
   ========================================================================= */
async function fetchRawExam(examId) {
  if (DATA_SOURCE.MODE === 'local') {
    return await fetchLocal(examId);
  }
  if (DATA_SOURCE.MODE === 'api') {
    return await fetchApi(examId);
  }
  if (DATA_SOURCE.MODE === 'sheets') {
    return await fetchSheets(examId);
  }
  throw new Error('DATA_SOURCE.MODE không hợp lệ: "' + DATA_SOURCE.MODE + '"');
}

async function fetchLocal(examId) {
  const url = DATA_SOURCE.LOCAL_BASE + '/' + examId + '.json';
  try {
    return await fetchJSON(url);
  } catch (err) {
    log('Không tìm thấy "' + url + '", dùng file mẫu.');
    const fallbackUrl = DATA_SOURCE.LOCAL_BASE + '/' + DATA_SOURCE.LOCAL_FALLBACK;
    return await fetchJSON(fallbackUrl);
  }
}

async function fetchApi(examId) {
  const url = DATA_SOURCE.API_BASE + '?id=' + encodeURIComponent(examId);
  return await fetchJSON(url);
}

async function fetchSheets(examId) {
  const sheetId = DATA_SOURCE.SHEETS_IDS[examId];
  if (!sheetId) {
    throw new Error('Chưa cấu hình SHEETS_IDS cho "' + examId + '".');
  }
  const url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json';
  const res = await fetch(url);
  const text = await res.text();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Không parse được dữ liệu Google Sheets.');
  }
  const json = JSON.parse(text.substring(start, end + 1));
  return sheetsToExam(json, examId);
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' — ' + res.statusText + ' khi tải ' + url);
  }
  return await res.json();
}

/* =========================================================================
   3. CHUẨN HOÁ EXAM
   ========================================================================= */
function normalizeExam(raw, fallbackId) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Dữ liệu đề thi không hợp lệ (không phải object).');
  }
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw new Error('Đề thi không có câu hỏi nào.');
  }

  const examId = raw.id || fallbackId;
  const questions = [];

  for (let i = 0; i < raw.questions.length; i++) {
    questions.push(normalizeQuestion(raw.questions[i], i, examId));
  }

  /* Loại bỏ trùng id */
  const seenIds = {};
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (seenIds[q.id]) {
      console.warn('[DataLoader] Trùng id câu hỏi: "' + q.id + '". Tự động thêm hậu tố.');
      q.id = q.id + '_' + q.order;
    }
    seenIds[q.id] = true;
  }

  /* Tính maxScore */
  let maxScore = 0;
  for (let i = 0; i < questions.length; i++) {
    maxScore += (questions[i].points || SCORING.POINTS_PER_QUESTION);
  }

  return {
    id:             examId,
    title:          raw.title || ('Đề thi ' + examId),
    subject:        raw.subject || 'Toán',
    grade:          (raw.grade === undefined || raw.grade === null) ? null : raw.grade,
    duration:       (raw.duration === undefined || raw.duration === null) ? null : raw.duration,
    description:    raw.description || '',
    totalQuestions: questions.length,
    maxScore:       maxScore,
    questions:      questions
  };
}

/* =========================================================================
   4. CHUẨN HOÁ TỪNG CÂU HỎI
   ========================================================================= */
function normalizeQuestion(q, index, examId) {
  if (!q || typeof q !== 'object') {
    throw new Error('Câu hỏi #' + (index + 1) + ' không hợp lệ.');
  }

  const order   = index + 1;
  const id      = q.id ? String(q.id) : (examId + '_q' + order);
  const content = String(q.content || '').trim();
  const type    = q.type || 'single';

  if (!content) {
    throw new Error('Câu ' + order + ' (' + id + '): thiếu "content".');
  }

  const base = {
    id:          id,
    order:       order,
    type:        type,
    content:     content,
    explanation: String(q.explanation || '').trim(),
    points:      Number(q.points) || SCORING.POINTS_PER_QUESTION
  };

  /* ----- 4a. Single choice ----- */
  if (type === 'single') {
    const options = normalizeOptions(q.options);
    const answer  = String(q.answer || '').trim().toUpperCase();

    if (options.length < 2) {
      throw new Error('Câu ' + order + ' (' + id + '): cần ít nhất 2 lựa chọn.');
    }

    let hasAnswer = false;
    for (let i = 0; i < options.length; i++) {
      if (options[i].key === answer) {
        hasAnswer = true;
        break;
      }
    }
    if (!answer || !hasAnswer) {
      const keys = [];
      for (let i = 0; i < options.length; i++) keys.push(options[i].key);
      throw new Error(
        'Câu ' + order + ' (' + id + '): "answer"="' + answer +
        '" không khớp options [' + keys.join(', ') + '].'
      );
    }

    base.options = options;
    base.answer = answer;
    return base;
  }

  /* ----- 4b. True / False ----- */
  if (type === 'true_false') {
    const rawStmts = q.statements || q.options;
    if (!Array.isArray(rawStmts) || rawStmts.length === 0) {
      throw new Error('Câu ' + order + ' (' + id + '): "statements" phải là mảng không rỗng.');
    }

    const statements = [];
    for (let i = 0; i < rawStmts.length; i++) {
      const s = rawStmts[i] || {};
      const key = String(s.key || String.fromCharCode(97 + i)).toLowerCase();
      const stContent = String(s.content || '').trim();
      const answer = parseBool(s.answer);

      if (!stContent) {
        throw new Error('Câu ' + order + ' (' + id + '): ý "' + key + '" thiếu "content".');
      }
      if (answer === null) {
        throw new Error(
          'Câu ' + order + ' (' + id + '): ý "' + key +
          '" thiếu "answer" hợp lệ (true/false/Đ/S).'
        );
      }

      statements.push({
        key:     key,
        content: stContent,
        answer:  answer
      });
    }

    base.statements = statements;
    return base;
  }

  /* ----- 4c. Short answer ----- */
  if (type === 'short_answer') {
    const answer = String(q.answer === undefined || q.answer === null ? '' : q.answer).trim();
    if (!answer) {
      throw new Error('Câu ' + order + ' (' + id + '): "answer" của short_answer không được rỗng.');
    }

    const acceptable = [];
    if (Array.isArray(q.acceptableAnswers)) {
      for (let i = 0; i < q.acceptableAnswers.length; i++) {
        acceptable.push(String(q.acceptableAnswers[i]));
      }
    }

    base.answer = answer;
    base.acceptableAnswers = acceptable;
    base.inputMode = (q.inputMode === 'numeric') ? 'numeric' : 'text';
    base.placeholder = q.placeholder || 'Nhập đáp án ngắn...';
    return base;
  }

  throw new Error('Câu ' + order + ' (' + id + '): type "' + type + '" không được hỗ trợ.');
}

/* =========================================================================
   5. Chuẩn hoá options cho single choice
   ========================================================================= */
function normalizeOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) return [];

  const result = [];

  /* Trường hợp 1: mảng object { key, content } */
  if (rawOptions.length > 0 && typeof rawOptions[0] === 'object' && rawOptions[0] !== null) {
    for (let i = 0; i < rawOptions.length; i++) {
      const o = rawOptions[i];
      if (o && o.content !== undefined && o.content !== null) {
        result.push({
          key:     String(o.key || defaultKey(i)).toUpperCase(),
          content: String(o.content).trim()
        });
      }
    }
    return result;
  }

  /* Trường hợp 2: mảng string -> tự gán A, B, C, D */
  for (let i = 0; i < rawOptions.length; i++) {
    const c = rawOptions[i];
    if (c !== null && c !== undefined && String(c).trim() !== '') {
      result.push({
        key:     defaultKey(i),
        content: String(c).trim()
      });
    }
  }
  return result;
}

function defaultKey(index) {
  return String.fromCharCode(65 + index);
}

/* =========================================================================
   6. Parse boolean cho True/False
   ========================================================================= */
function parseBool(v) {
  if (v === true || v === false) return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', 't', 'đ', 'd', '1', 'yes', 'y', 'đúng', 'dung'].indexOf(s) !== -1) {
      return true;
    }
    if (['false', 'f', 's', '0', 'no', 'n', 'sai'].indexOf(s) !== -1) {
      return false;
    }
  }
  return null;
}

/* =========================================================================
   7. Chuyển Google Sheets -> Exam
   ========================================================================= */
function sheetsToExam(gviz, examId) {
  const rows = (gviz && gviz.table && gviz.table.rows) ? gviz.table.rows : [];
  const questions = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.c || [];
    const values = [];
    for (let j = 0; j < cells.length; j++) {
      values.push(cells[j] ? cells[j].v : '');
    }

    const id          = values[0];
    const content     = values[1];
    const A           = values[2];
    const B           = values[3];
    const C           = values[4];
    const D           = values[5];
    const answer      = values[6];
    const explanation = values[7];

    if (!content) continue;

    const options = [];
    if (A) options.push({ key: 'A', content: A });
    if (B) options.push({ key: 'B', content: B });
    if (C) options.push({ key: 'C', content: C });
    if (D) options.push({ key: 'D', content: D });

    questions.push({
      id:          id || ('q' + (i + 1)),
      type:        'single',
      content:     content,
      options:     options,
      answer:      answer,
      explanation: explanation
    });
  }

  return {
    id:      examId,
    title:   'Đề thi ' + examId,
    subject: 'Toán',
    questions: questions
  };
}

/* =========================================================================
   8. TIỆN ÍCH XUẤT (cho test)
   ========================================================================= */
export const DataLoader = {
  loadExam:           loadExam,
  _normalizeExam:     normalizeExam,
  _normalizeQuestion: normalizeQuestion
};