/* =========================================================================
   INPUT-HANDLER.JS — BẮT SỰ KIỆN CHO 3 LOẠI CÂU HỎI
   -------------------------------------------------------------------------
   - Single       : A/B/C/D + 1/2/3/4 chọn đáp án
   - True/False   : 1/2/3/4 hoặc a/b/c/d focus vào ý tương ứng;
                    sau đó Tab / Space / Enter để chọn Đ hoặc S.
   - Short answer : gõ ký tự in được -> tự focus vào ô input.
                    Enter trong ô input -> rời input & sang câu kế.
   - Global       : PageUp/PageDown, ←/→, S (lời giải), Ctrl+Enter (nộp).
   ========================================================================= */

import { KEYMAP, UI, log } from './config.js';

export function bindInput(opts) {
  const engine            = opts.engine;
  const elements          = opts.elements || {};
  const onSubmitRequested = opts.onSubmitRequested;

  /* ---------- 1. Nút điều hướng ---------- */
  if (elements.prevBtn) {
    elements.prevBtn.addEventListener('click', function () {
      engine.prev();
    });
  }

  if (elements.nextBtn) {
    elements.nextBtn.addEventListener('click', function () {
      engine.next();
    });
  }

  /* ---------- 2. Nút lời giải ---------- */
  if (elements.solutionBtn) {
    elements.solutionBtn.addEventListener('click', function () {
      engine.toggleSolution();
    });
  }

  /* ---------- 3. Nút nộp bài ---------- */
  if (elements.submitBtn) {
    elements.submitBtn.addEventListener('click', function () {
      if (typeof onSubmitRequested === 'function') {
        onSubmitRequested();
      }
    });
  }

  /* ---------- 4. Bàn phím toàn cục ---------- */
  document.addEventListener('keydown', function (event) {

    /* 4.1 Bỏ qua nếu đang gõ trong input/textarea/contentEditable */
    if (isTypingContext(event.target)) return;

    /* 4.2 Modal đang mở -> chỉ cho ESC */
    if (isModalOpen() && event.key !== 'Escape') return;

    const key = event.key;
    const q = engine.current;

    /* 4.3 Ctrl+Enter: Nộp bài */
    if ((event.ctrlKey || event.metaKey) && key === 'Enter') {
      event.preventDefault();
      if (typeof onSubmitRequested === 'function') {
        onSubmitRequested();
      }
      return;
    }

    /* 4.4 Toggle lời giải: S */
    if (KEYMAP.TOGGLE_SOLUTION.indexOf(key) !== -1) {
      event.preventDefault();
      engine.toggleSolution();
      return;
    }

    /* 4.5 Nộp bài phím phụ (F2) */
    if (KEYMAP.SUBMIT.indexOf(key) !== -1) {
      event.preventDefault();
      if (typeof onSubmitRequested === 'function') {
        onSubmitRequested();
      }
      return;
    }

    /* 4.6 Điều hướng */
    if (KEYMAP.NEXT.indexOf(key) !== -1) {
      event.preventDefault();
      engine.next();
      return;
    }
    if (KEYMAP.PREV.indexOf(key) !== -1) {
      event.preventDefault();
      engine.prev();
      return;
    }
    if (KEYMAP.GO_HOME.indexOf(key) !== -1) {
      event.preventDefault();
      engine.goTo(0);
      return;
    }
    if (KEYMAP.GO_END.indexOf(key) !== -1) {
      event.preventDefault();
      engine.goTo(engine.total - 1);
      return;
    }

    if (!q) return;

    /* 4.7 Single: chọn A/B/C/D hoặc 1/2/3/4 */
    if (q.type === 'single') {
      const idx = KEYMAP.CHOOSE[key];
      if (idx !== undefined) {
        event.preventDefault();
        const opt = q.options[idx];
        if (opt) {
          engine.choose(q.id, opt.key);
        }
        return;
      }
    }

    /* 4.8 True/False: phím số / chữ cái focus vào ý tương ứng */
    if (q.type === 'true_false') {
      const idx = KEYMAP.CHOOSE[key];
      if (idx !== undefined && idx < q.statements.length) {
        event.preventDefault();
        focusTFRow(idx);
        return;
      }
    }

    /* 4.9 Short answer: gõ ký tự in được đầu tiên -> tự focus vào input */
    if (q.type === 'short_answer') {
      const isPrintable = key.length === 1
        && !event.ctrlKey
        && !event.metaKey
        && !event.altKey;

      if (isPrintable) {
        const input = document.querySelector('.slide.is-active .sa-input');
        if (input && document.activeElement !== input) {
          event.preventDefault();
          input.focus();
          const pos = input.value.length;
          try {
            input.setSelectionRange(pos, pos);
          } catch (e) {
            /* Bỏ qua: một số browser cũ không hỗ trợ setSelectionRange */
          }
          input.value += key;
          engine.setShortAnswer(q.id, input.value);
          return;
        }
      }
    }
  });

  /* ---------- 5. Click vùng trống stage -> next/prev ---------- */
  const stageEl = document.querySelector('.stage');
  if (stageEl) {
    stageEl.addEventListener('click', function (e) {
      if (e.target.closest('button'))           return;
      if (e.target.closest('.slide__question')) return;
      if (e.target.closest('.solution'))        return;
      if (e.target.closest('mjx-container'))    return;
      if (e.target.closest('.answer'))          return;
      if (e.target.closest('.tf-row'))          return;
      if (e.target.closest('.sa-wrap'))         return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x > rect.width / 2) {
        engine.next();
      } else {
        engine.prev();
      }
    });
  }

 

/* =========================================================================
   HELPERS
   ========================================================================= */

function focusTFRow(idx) {
  const slide = document.querySelector('.slide.is-active');
  if (!slide) return;

  const rows = slide.querySelectorAll('.tf-row');
  const row = rows[idx];
  if (!row) return;

  if (row.scrollIntoView) {
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  const selected = row.querySelector('.tf-btn.is-selected');
  const target = selected || row.querySelector('.tf-btn--true');
  if (target && typeof target.focus === 'function') {
    target.focus();
  }
}

function isTypingContext(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function isModalOpen() {
  const modal = document.getElementById('summary-modal');
  return modal && !modal.hidden;
}