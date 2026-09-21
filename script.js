/* =========================================================
   CỔNG THÔNG TIN TRƯỜNG THCS-THPT TRẦN TRƯỜNG SINH
   File: script.js
   JavaScript thuần - không phụ thuộc framework
   ========================================================= */

(function () {
  'use strict';

  /* -------------------------------------------------------
     1. HIỂN THỊ NGÀY HIỆN TẠI (tiếng Việt)
     ------------------------------------------------------- */
  function updateCurrentDate() {
    var el = document.getElementById('currentDate');
    if (!el) return;

    var now = new Date();
    var thu = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    var dayName = thu[now.getDay()];
    var day = String(now.getDate()).padStart(2, '0');
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var year = now.getFullYear();

    el.textContent = dayName + ', ' + day + '/' + month + '/' + year;
  }

  /* -------------------------------------------------------
     2. CẬP NHẬT NĂM Ở FOOTER
     ------------------------------------------------------- */
  function updateFooterYear() {
    var el = document.getElementById('year');
    if (el) {
      el.textContent = new Date().getFullYear();
    }
  }

  /* -------------------------------------------------------
     3. NÚT "XEM THÊM" TRONG CARD TIN TỨC
     ------------------------------------------------------- */
  function initToggleMoreButtons() {
    var buttons = document.querySelectorAll('.btn-toggle-more');
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetSelector = btn.getAttribute('data-target');
        var target = document.querySelector(targetSelector);
        if (!target) return;

        var isOpen = target.classList.toggle('is-open');
        btn.classList.toggle('is-open', isOpen);
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

        // Đổi nội dung nút
        if (isOpen) {
          btn.innerHTML = 'Thu gọn <i class="fa-solid fa-angle-up"></i>';
        } else {
          btn.innerHTML = 'Xem thêm <i class="fa-solid fa-angle-down"></i>';
        }
      });
    });
  }

  /* -------------------------------------------------------
     4. TRÌNH PHÁT NHẠC TRUYỀN THỐNG
        - Không tự động phát
        - Nút Phát / Tạm dừng đồng bộ với audio
     ------------------------------------------------------- */
  function initAudioPlayer() {
    var audio = document.getElementById('schoolSong');
    var btn = document.getElementById('btnToggleSong');
    if (!audio || !btn) return;

    function renderButton(isPlaying) {
      if (isPlaying) {
        btn.innerHTML = '<i class="fa-solid fa-pause me-1"></i> Tạm dừng';
      } else {
        btn.innerHTML = '<i class="fa-solid fa-play me-1"></i> Phát nhạc';
      }
    }

    // Trạng thái ban đầu: chưa phát
    renderButton(false);

    btn.addEventListener('click', function () {
      if (audio.paused) {
        var playPromise = audio.play();
        if (playPromise !== undefined && typeof playPromise.then === 'function') {
          playPromise.catch(function () {
            // Trình duyệt chặn hoặc file chưa có
            console.warn('Không thể phát audio. Vui lòng kiểm tra file audio/bai-hat-truyen-thong.mp3');
          });
        }
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('play', function () {
      renderButton(true);
    });

    audio.addEventListener('pause', function () {
      renderButton(false);
    });

    audio.addEventListener('ended', function () {
      renderButton(false);
      audio.currentTime = 0;
    });
  }

  /* -------------------------------------------------------
     5. NÚT LÊN ĐẦU TRANG
     ------------------------------------------------------- */
  function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;

    function toggleVisibility() {
      if (window.scrollY > 300) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    }

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* -------------------------------------------------------
     6. TỰ ĐỘNG ĐÓNG MENU MOBILE KHI CLICK LINK
     ------------------------------------------------------- */
  function initAutoCloseMobileMenu() {
    var menu = document.getElementById('mainMenu');
    if (!menu) return;

    var links = menu.querySelectorAll('.nav-link');
    if (!links.length) return;

    links.forEach(function (link) {
      link.addEventListener('click', function () {
        // Chỉ xử lý khi menu đang mở (mobile)
        if (menu.classList.contains('show')) {
          var collapse = bootstrap.Collapse.getInstance(menu);
          if (collapse) {
            collapse.hide();
          } else {
            menu.classList.remove('show');
          }
        }
      });
    });
  }

  /* -------------------------------------------------------
     7. SCROLL MƯỢT CHO CÁC LIÊN KẾT NEO (hỗ trợ thêm)
        (Bootstrap đã hỗ trợ nhưng thêm để chắc chắn)
     ------------------------------------------------------- */
  function initSmoothAnchorScroll() {
    var anchors = document.querySelectorAll('a[href^="#"]');
    if (!anchors.length) return;

    anchors.forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var href = anchor.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;

        var target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        var headerOffset = 80;
        var rect = target.getBoundingClientRect();
        var offsetTop = rect.top + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      });
    });
  }

  /* -------------------------------------------------------
     8. KHỞI TẠO KHI DOM SẴN SÀNG
     ------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    updateCurrentDate();
    updateFooterYear();
    initToggleMoreButtons();
    initAudioPlayer();
    initBackToTop();
    initAutoCloseMobileMenu();
    initSmoothAnchorScroll();
  });

})();