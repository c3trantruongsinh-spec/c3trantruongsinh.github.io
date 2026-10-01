/* =========================================================================
   SLIDE-ENGINE.JS — ĐỘNG CƠ TRÌNH CHIẾU (hỗ trợ 3 loại câu hỏi)
   -------------------------------------------------------------------------
   Loại câu hỏi được hỗ trợ:
   - 'single'       : trắc nghiệm 1 đáp án (A/B/C/D)
   - 'true_false'   : Đúng/Sai 4 ý (a, b, c, d)
   - 'short_answer' : trả lời ngắn (input số/text)

   State:
   - this.answers: Map<questionId, any>
       · single       -> "A"
       · true_false   -> { a: true, b: false, c: null, d: null }
       · short_answer -> "42"

   Chấm điểm:
   - single       : 1 điểm nếu đúng
   - true_false   : thang điểm từng phần SCORING.TRUE_FALSE_PARTIAL
   - short_answer : 1 điểm nếu khớp sau chuẩn hoá
   ========================================================================= */

import { UI, SCORING, log } from './config.js';

export class SlideEngine {

  /* =====================================================================
     KHỞI TẠO
     ===================================================================== */
  constructor(opts) {
    this.stageEl       = opts.stageEl;
    this.progressBarEl = opts.progressBarEl;
    this.counterEl     = opts.counterEl;
    this.titleEl       = opts.titleEl;
    this.metaEl        = opts.metaEl;
    this.progressEl    = opts.progressEl;
    this.context       = opts.context || {};
    this.onStateChange = opts.onStateChange || function () {};

    this.exam            = null;
    this.questions       = [];
    this.currentIndex    = 0;
    this.answers         = new Map();
    this.solutionVisible = false;
    this.slideEls        = [];
    this.startedAt       = null;

    log('SlideEngine đã khởi tạo (đa loại câu hỏi).');
  }

  /* =====================================================================
     1. NẠP ĐỀ THI
     ===================================================================== */
  setExam(exam) {
    this.exam      = exam;
    this.questions = exam.questions;
    this.answers.clear();
    this.currentIndex = 0;
    this.solutionVisible = false;
    this.startedAt = Date.now();

    if (this.titleEl) {
      this.titleEl.textContent = exam.title;
    }

    if (this.metaEl) {
      const parts = [];
      if (exam.subject)   parts.push(exam.subject);
      if (exam.grade)     parts.push('Khối ' + exam.grade);
      parts.push(exam.totalQuestions + ' câu');
      if (exam.duration)  parts.push(exam.duration + ' phút');
      this.metaEl.textContent = parts.join(' · ');
    }

    this._buildSlides();
    this._applyActiveSlide(0, false);
    this._updateProgress();
    this._emitState();
  }

  /* =====================================================================
     2. DỰNG DOM SLIDE
     ===================================================================== */
  _buildSlides() {
    this.stageEl.innerHTML = '';
    this.slideEls = [];

    const frag = document.createDocumentFragment();
    for (let i = 0; i < this.questions.length; i++) {
      const slide = this._createSlide(this.questions[i], i);
      this.slideEls.push(slide);
      frag.appendChild(slide);
    }
    this.stageEl.appendChild(frag);

    this._typesetAll();
  }

  _createSlide(question, idx) {
    const slide = document.createElement('section');
    slide.className = 'slide';
    slide.dataset.index = String(idx);
    slide.dataset.type  = question.type;
    slide.setAttribute('aria-hidden', 'true');

    /* Header */
    let typeLabel = 'Trắc nghiệm';
    if (question.type === 'single')       typeLabel = 'Chọn 1 đáp án';
    else if (question.type === 'true_false')  typeLabel = 'Đúng / Sai';
    else if (question.type === 'short_answer') typeLabel = 'Trả lời ngắn';

    const header = document.createElement('div');
    header.className = 'slide__header';
    header.innerHTML =
      '<span class="slide__index">Câu ' + question.order + '</span>' +
      '<span class="slide__type">' + typeLabel + '</span>';
    slide.appendChild(header);

    /* Nội dung câu hỏi */
    const qDiv = document.createElement('div');
    qDiv.className = 'slide__question tex2jax_process';
    qDiv.innerHTML = question.content;
    slide.appendChild(qDiv);

    /* Body theo loại */
    if (question.type === 'single') {
      slide.appendChild(this._buildSingleBody(question));
    } else if (question.type === 'true_false') {
      slide.appendChild(this._buildTrueFalseBody(question));
    } else if (question.type === 'short_answer') {
      slide.appendChild(this._buildShortAnswerBody(question));
    }

    /* Khối lời giải */
    slide.appendChild(this._buildSolutionBlock(question));

    return slide;
  }

  /* ---------- 2a. Single choice ---------- */
  _buildSingleBody(q) {
    const wrap = document.createElement('div');
    wrap.className = 'answers';
    wrap.setAttribute('role', 'radiogroup');
    wrap.setAttribute('aria-label', 'Đáp án câu ' + q.order);

    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer tex2jax_process';
      btn.dataset.key = opt.key;
      btn.dataset.qid = q.id;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.innerHTML =
        '<span class="answer__label">' + opt.key + '</span>' +
        '<span class="answer__content">' + opt.content + '</span>';

      const self = this;
      btn.addEventListener('click', function () {
        self.choose(q.id, opt.key);
      });

      wrap.appendChild(btn);
    }
    return wrap;
  }

  /* ---------- 2b. True / False ---------- */
  _buildTrueFalseBody(q) {
    const wrap = document.createElement('div');
    wrap.className = 'tf-list';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Đúng/Sai câu ' + q.order);

    const self = this;

    for (let i = 0; i < q.statements.length; i++) {
      const st = q.statements[i];

      const row = document.createElement('div');
      row.className = 'tf-row';
      row.dataset.key = st.key;
      row.dataset.qid = q.id;

      const stText = document.createElement('div');
      stText.className = 'tf-row__content tex2jax_process';
      stText.innerHTML = '<span class="tf-row__key">' + st.key + ')</span> ' + st.content;
      row.appendChild(stText);

      const btns = document.createElement('div');
      btns.className = 'tf-row__buttons';
      btns.setAttribute('role', 'radiogroup');
      btns.setAttribute('aria-label', 'Chọn Đúng/Sai cho ý ' + st.key);

      const values = ['true', 'false'];
      for (let v = 0; v < values.length; v++) {
        const val = values[v];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tf-btn tf-btn--' + val;
        btn.dataset.value = val;
        btn.dataset.key   = st.key;
        btn.dataset.qid   = q.id;
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', 'false');
        btn.textContent = val === 'true' ? 'Đ' : 'S';
        btn.title = val === 'true' ? 'Đúng' : 'Sai';

        btn.addEventListener('click', (function (statementKey, isTrue) {
          return function () {
            self.chooseTF(q.id, statementKey, isTrue);
          };
        })(st.key, val === 'true'));

        btns.appendChild(btn);
      }

      row.appendChild(btns);
      wrap.appendChild(row);
    }
    return wrap;
  }

  /* ---------- 2c. Short answer ---------- */
  _buildShortAnswerBody(q) {
    const wrap = document.createElement('div');
    wrap.className = 'sa-wrap';

    const label = document.createElement('label');
    label.className = 'sa-label';
    label.htmlFor = 'sa-input-' + q.id;
    label.textContent = 'Đáp án của bạn:';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'sa-input-' + q.id;
    input.className = 'sa-input';
    input.dataset.qid = q.id;
    input.placeholder = q.placeholder || 'Nhập đáp án ngắn...';
    input.autocomplete = 'off';
    input.spellcheck = false;
    if (q.inputMode === 'numeric') {
      input.inputMode = 'decimal';
    }

    const self = this;

    input.addEventListener('input', function () {
      self.setShortAnswer(q.id, input.value);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
        self.next();
      }
    });

    const hint = document.createElement('p');
    hint.className = 'sa-hint';
    if (q.inputMode === 'numeric') {
      hint.textContent = '💡 Nhập số (dấu phẩy hoặc dấu chấm cho phần thập phân). Nhấn Enter để sang câu tiếp theo.';
    } else {
      hint.textContent = '💡 Nhập câu trả lời ngắn gọn. Nhấn Enter để sang câu tiếp theo.';
    }

    wrap.appendChild(label);
    wrap.appendChild(input);
    wrap.appendChild(hint);
    return wrap;
  }

  /* ---------- 2d. Khối lời giải ---------- */
  _buildSolutionBlock(q) {
    const sol = document.createElement('div');
    sol.className = 'solution tex2jax_process';
    sol.hidden = true;

    let answerDisplay = '';
    if (q.type === 'single') {
      answerDisplay = '<strong>Đáp án đúng: ' + q.answer + '</strong>';
    } else if (q.type === 'true_false') {
      const pieces = [];
      for (let i = 0; i < q.statements.length; i++) {
        const s = q.statements[i];
        pieces.push(s.key + ')&nbsp;<b>' + (s.answer ? 'Đ' : 'S') + '</b>');
      }
      answerDisplay = '<strong>Đáp án đúng:</strong> ' + pieces.join(' &nbsp;·&nbsp; ');
    } else if (q.type === 'short_answer') {
      let extra = '';
      if (q.acceptableAnswers && q.acceptableAnswers.length > 0) {
        extra = ' <em>(chấp nhận: ' + q.acceptableAnswers.join(', ') + ')</em>';
      }
      answerDisplay = '<strong>Đáp án đúng: ' + q.answer + '</strong>' + extra;
    }

    sol.innerHTML =
      '<div class="solution__label">💡 Lời giải</div>' +
      '<div class="solution__content">' +
        answerDisplay + '<br>' +
        (q.explanation || 'Chưa có lời giải thích cho câu này.') +
      '</div>';
    return sol;
  }

  /* ---------- 2e. MathJax ---------- */
  _typesetAll() {
    const self = this;

    function doTypeset() {
      if (!window.MathJax || !window.MathJax.typesetPromise) {
        setTimeout(doTypeset, 100);
        return;
      }
      window.MathJax.typesetPromise()
        .then(function () { log('MathJax render xong.'); })
        .catch(function (err) { console.error('[MathJax]', err); });
    }

    if (document.readyState === 'complete') {
      doTypeset();
    } else {
      window.addEventListener('load', doTypeset, { once: true });
    }
  }

  /* =====================================================================
     3. ĐIỀU HƯỚNG
     ===================================================================== */
  next() {
    if (this.currentIndex >= this.questions.length - 1) return false;
    this._applyActiveSlide(this.currentIndex + 1);
    return true;
  }

  prev() {
    if (this.currentIndex <= 0) return false;
    this._applyActiveSlide(this.currentIndex - 1);
    return true;
  }

  goTo(index) {
    if (index < 0 || index >= this.questions.length) return false;
    this._applyActiveSlide(index);
    return true;
  }

  _applyActiveSlide(newIndex, animate) {
    if (animate === undefined) animate = true;

    const oldEl = this.slideEls[this.currentIndex];
    const newEl = this.slideEls[newIndex];

    if (oldEl) {
      oldEl.classList.remove('is-active');
      oldEl.setAttribute('aria-hidden', 'true');
    }

    this.currentIndex = newIndex;

    if (newEl) {
      newEl.classList.add('is-active');
      newEl.setAttribute('aria-hidden', 'false');
      newEl.scrollTop = 0;
    }

    this._refreshSlideUI(newIndex);
    this._updateProgress();
    this._emitState();

    if (animate) {
      log('→ Câu ' + (newIndex + 1));
    }
  }

  /* =====================================================================
     4. LÀM MỚI UI THEO STATE
     ===================================================================== */
  _refreshSlideUI(idx) {
    const q = this.questions[idx];
    const slide = this.slideEls[idx];
    if (!q || !slide) return;

    if (q.type === 'single') {
      this._refreshSingle(slide, q);
    } else if (q.type === 'true_false') {
      this._refreshTrueFalse(slide, q);
    } else if (q.type === 'short_answer') {
      this._refreshShortAnswer(slide, q);
    }

    const sol = slide.querySelector('.solution');
    if (sol) sol.hidden = !this.solutionVisible;
  }

  _refreshSingle(slide, q) {
    const chosenKey = this.answers.get(q.id) || null;
    const btns = slide.querySelectorAll('.answer');

    for (let i = 0; i < btns.length; i++) {
      const btn = btns[i];
      const key = btn.dataset.key;

      btn.classList.remove('is-selected');
      btn.classList.remove('is-correct');
      btn.classList.remove('is-wrong');
      btn.setAttribute('aria-checked', 'false');

      if (chosenKey === key) {
        btn.classList.add('is-selected');
        btn.setAttribute('aria-checked', 'true');
      }

      if (this.solutionVisible) {
        if (key === q.answer) {
          btn.classList.add('is-correct');
        } else if (chosenKey === key) {
          btn.classList.add('is-wrong');
        }
      }
    }
  }

  _refreshTrueFalse(slide, q) {
    const chosen = this.answers.get(q.id) || {};
    const rows = slide.querySelectorAll('.tf-row');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const stKey = row.dataset.key;
      let st = null;
      for (let j = 0; j < q.statements.length; j++) {
        if (q.statements[j].key === stKey) {
          st = q.statements[j];
          break;
        }
      }
      if (!st) continue;

      const val = chosen[stKey];
      const btns = row.querySelectorAll('.tf-btn');

      for (let k = 0; k < btns.length; k++) {
        const btn = btns[k];
        const isTrue = btn.dataset.value === 'true';

        btn.classList.remove('is-selected');
        btn.classList.remove('is-correct');
        btn.classList.remove('is-wrong');
        btn.setAttribute('aria-checked', 'false');

        if (val === isTrue) {
          btn.classList.add('is-selected');
          btn.setAttribute('aria-checked', 'true');
        }

        if (this.solutionVisible) {
          if (isTrue === st.answer) {
            btn.classList.add('is-correct');
          } else if (val === isTrue) {
            btn.classList.add('is-wrong');
          }
        }
      }
    }
  }

  _refreshShortAnswer(slide, q) {
    const input = slide.querySelector('.sa-input');
    if (!input) return;

    const storedRaw = this.answers.get(q.id);
    const stored = (storedRaw === undefined || storedRaw === null) ? '' : storedRaw;

    if (input.value !== stored) {
      input.value = stored;
    }

    input.classList.remove('is-correct');
    input.classList.remove('is-wrong');

    if (this.solutionVisible && stored !== '') {
      const ok = this._matchShortAnswer(stored, q);
      if (ok) {
        input.classList.add('is-correct');
      } else {
        input.classList.add('is-wrong');
      }
    }
  }

  /* =====================================================================
     5. GHI NHẬN ĐÁP ÁN
     ===================================================================== */

  choose(questionId, optionKey) {
    let q = null;
    let idx = -1;
    for (let i = 0; i < this.questions.length; i++) {
      if (this.questions[i].id === questionId) {
        q = this.questions[i];
        idx = i;
        break;
      }
    }
    if (!q || q.type !== 'single') return false;

    let validKey = false;
    for (let i = 0; i < q.options.length; i++) {
      if (q.options[i].key === optionKey) {
        validKey = true;
        break;
      }
    }
    if (!validKey) return false;

    this.answers.set(questionId, optionKey);
    this._refreshSlideUI(idx);
    this._updateProgress();
    this._emitState();
    return true;
  }

  chooseTF(questionId, statementKey, value) {
    let q = null;
    let idx = -1;
    for (let i = 0; i < this.questions.length; i++) {
      if (this.questions[i].id === questionId) {
        q = this.questions[i];
        idx = i;
        break;
      }
    }
    if (!q || q.type !== 'true_false') return false;

    let validStmt = false;
    for (let i = 0; i < q.statements.length; i++) {
      if (q.statements[i].key === statementKey) {
        validStmt = true;
        break;
      }
    }
    if (!validStmt) return false;

    const cur = this.answers.get(questionId);
    const next = {};
    if (cur) {
      const keys = Object.keys(cur);
      for (let i = 0; i < keys.length; i++) {
        next[keys[i]] = cur[keys[i]];
      }
    }

    if (next[statementKey] === value) {
      delete next[statementKey];
    } else {
      next[statementKey] = value;
    }

    if (Object.keys(next).length === 0) {
      this.answers.delete(questionId);
    } else {
      this.answers.set(questionId, next);
    }

    this._refreshSlideUI(idx);
    this._updateProgress();
    this._emitState();
    return true;
  }

  setShortAnswer(questionId, value) {
    let q = null;
    for (let i = 0; i < this.questions.length; i++) {
      if (this.questions[i].id === questionId) {
        q = this.questions[i];
        break;
      }
    }
    if (!q || q.type !== 'short_answer') return false;

    const s = String(value === undefined || value === null ? '' : value);
    if (s.trim() === '') {
      this.answers.delete(questionId);
    } else {
      this.answers.set(questionId, s);
    }

    this._updateProgress();
    this._emitState();
    return true;
  }

  /* =====================================================================
     6. CHẤM ĐIỂM
     ===================================================================== */

  _normalizeShortAnswer(s) {
    if (s === undefined || s === null) return '';
    let out = String(s).trim();

    if (SCORING.SHORT_ANSWER_IGNORE_CASE) {
      out = out.toLowerCase();
    }
    if (SCORING.SHORT_ANSWER_IGNORE_SPACES) {
      out = out.replace(/\s+/g, '');
      const hasComma = out.indexOf(',') !== -1;
      const hasDot   = out.indexOf('.') !== -1;
      if (hasComma && !hasDot) {
        out = out.replace(',', '.');
      }
    }
    return out;
  }

  _matchShortAnswer(userAnswer, q) {
    const u = this._normalizeShortAnswer(userAnswer);
    const correct = this._normalizeShortAnswer(q.answer);
    if (u === correct) return true;

    if (Array.isArray(q.acceptableAnswers)) {
      for (let i = 0; i < q.acceptableAnswers.length; i++) {
        if (this._normalizeShortAnswer(q.acceptableAnswers[i]) === u) {
          return true;
        }
      }
    }
    return false;
  }

  _isAnswered(q) {
    const raw = this.answers.get(q.id);
    if (raw === undefined || raw === null) return false;

    if (q.type === 'single' || q.type === 'short_answer') {
      return String(raw).trim() !== '';
    }
    if (q.type === 'true_false') {
      return Object.keys(raw).length > 0;
    }
    return false;
  }

  _isCorrect(q) {
    const raw = this.answers.get(q.id);
    if (raw === undefined || raw === null) return false;

    if (q.type === 'single') {
      return raw === q.answer;
    }
    if (q.type === 'short_answer') {
      return this._matchShortAnswer(raw, q);
    }
    if (q.type === 'true_false') {
      if (Object.keys(raw).length < q.statements.length) return false;
      for (let i = 0; i < q.statements.length; i++) {
        const s = q.statements[i];
        if (raw[s.key] !== s.answer) return false;
      }
      return true;
    }
    return false;
  }

  _getScore(q) {
    const raw = this.answers.get(q.id);
    const base = q.points || SCORING.POINTS_PER_QUESTION;
    if (raw === undefined || raw === null) return 0;

    if (q.type === 'single') {
      return raw === q.answer ? base : 0;
    }

    if (q.type === 'short_answer') {
      return this._matchShortAnswer(raw, q) ? base : 0;
    }

    if (q.type === 'true_false') {
      let correctCount = 0;
      for (let i = 0; i < q.statements.length; i++) {
        const s = q.statements[i];
        if (raw[s.key] === s.answer) correctCount++;
      }
      const ratio = SCORING.TRUE_FALSE_PARTIAL[correctCount];
      if (ratio === undefined) return 0;
      return ratio * base;
    }

    return 0;
  }

  _getCorrectLabel(q) {
    if (q.type === 'single') {
      return q.answer;
    }
    if (q.type === 'short_answer') {
      return q.answer;
    }
    if (q.type === 'true_false') {
      const parts = [];
      for (let i = 0; i < q.statements.length; i++) {
        const s = q.statements[i];
        parts.push(s.key + ')' + (s.answer ? 'Đ' : 'S'));
      }
      return parts.join(' ');
    }
    return '';
  }

  _getChosenLabel(q) {
    const raw = this.answers.get(q.id);
    if (raw === undefined || raw === null) return '–';

    if (q.type === 'single' || q.type === 'short_answer') {
      return String(raw);
    }

    if (q.type === 'true_false') {
      const parts = [];
      for (let i = 0; i < q.statements.length; i++) {
        const s = q.statements[i];
        if (raw[s.key] !== undefined) {
          parts.push(s.key + ')' + (raw[s.key] ? 'Đ' : 'S'));
        }
      }
      return parts.length > 0 ? parts.join(' ') : '–';
    }

    return '–';
  }

  /* =====================================================================
     7. LỜI GIẢI
     ===================================================================== */
  toggleSolution(force) {
    if (typeof force === 'boolean') {
      this.solutionVisible = force;
    } else {
      this.solutionVisible = !this.solutionVisible;
    }
    this._refreshSlideUI(this.currentIndex);
    this._emitState();
    return this.solutionVisible;
  }

  /* =====================================================================
     8. UI HELPERS
     ===================================================================== */
  _updateProgress() {
    const total   = this.questions.length;
    const current = this.currentIndex + 1;
    let percent = 0;
    if (total > 0) {
      percent = Math.round((current / total) * 100);
    }

    if (this.progressBarEl) {
      this.progressBarEl.style.width = percent + '%';
    }
    if (this.counterEl) {
      this.counterEl.textContent = current + ' / ' + total;
    }
    if (this.progressEl) {
      this.progressEl.setAttribute('aria-valuenow', String(percent));
    }
  }

  _emitState() {
    let answeredCount = 0;
    for (let i = 0; i < this.questions.length; i++) {
      if (this._isAnswered(this.questions[i])) answeredCount++;
    }

    const curQ = this.questions[this.currentIndex];

    this.onStateChange({
      currentIndex:    this.currentIndex,
      totalQuestions:  this.questions.length,
      currentType:     curQ ? curQ.type : null,
      isFirst:         this.currentIndex === 0,
      isLast:          this.currentIndex === this.questions.length - 1,
      solutionVisible: this.solutionVisible,
      answeredCount:   answeredCount
    });
  }

  /* =====================================================================
     9. KẾT QUẢ
     ===================================================================== */
  getResult() {
    const details = [];
    let totalEarned = 0;
    let maxScore = 0;

    for (let i = 0; i < this.questions.length; i++) {
      const q = this.questions[i];
      const isCorrect = this._isCorrect(q);
      const earned    = this._getScore(q);
      const points    = q.points || SCORING.POINTS_PER_QUESTION;

      let correctField;
      if (q.type === 'true_false') {
        correctField = {};
        for (let j = 0; j < q.statements.length; j++) {
          const s = q.statements[j];
          correctField[s.key] = s.answer;
        }
      } else {
        correctField = q.answer;
      }

      const rawChosen = this.answers.get(q.id);
      const chosenValue = (rawChosen === undefined) ? null : rawChosen;

      details.push({
        questionId:   q.id,
        order:        q.order,
        type:         q.type,
        content:      q.content,
        chosen:       chosenValue,
        correct:      correctField,
        chosenLabel:  this._getChosenLabel(q),
        correctLabel: this._getCorrectLabel(q),
        isCorrect:    isCorrect,
        answered:     this._isAnswered(q),
        points:       points,
        earned:       Math.round(earned * 100) / 100
      });

      totalEarned += earned;
      maxScore += points;
    }

    let correctCount    = 0;
    let answeredCount   = 0;
    for (let i = 0; i < details.length; i++) {
      if (details[i].isCorrect)  correctCount++;
      if (details[i].answered)   answeredCount++;
    }
    const unansweredCount = details.length - answeredCount;
    const wrongCount      = answeredCount - correctCount;

    const score   = Math.round(totalEarned * 100) / 100;
    let percent   = 0;
    if (maxScore > 0) {
      percent = Math.round((score / maxScore) * 100);
    }
    const passed  = maxScore > 0 ? (score / maxScore) >= SCORING.PASS_THRESHOLD : false;

    let durationSec = 0;
    if (this.startedAt) {
      durationSec = Math.round((Date.now() - this.startedAt) / 1000);
    }

    return {
      examId:         this.exam.id,
      examTitle:      this.exam.title,
      studentId:      this.context.studentId || 'GUEST',
      studentName:    this.context.studentName || '',
      totalQuestions: details.length,
      answeredCount:  answeredCount,
      unansweredCount: unansweredCount,
      correctCount:   correctCount,
      wrongCount:     wrongCount,
      score:          score,
      maxScore:       maxScore,
      percent:        percent,
      passed:         passed,
      durationSec:    durationSec,
      submittedAt:    new Date().toISOString(),
      details:        details
    };
  }

  /* =====================================================================
     GETTERS
     ===================================================================== */
  get current() {
    return this.questions[this.currentIndex];
  }
  get total() {
    return this.questions.length;
  }
  get isFirst() {
    return this.currentIndex === 0;
  }
  get isLast() {
    return this.currentIndex === this.questions.length - 1;
  }
}