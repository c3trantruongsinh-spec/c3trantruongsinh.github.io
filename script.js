/* =========================================================
   TRƯỜNG THCS-THPT TRẦN TRƯỜNG SINH – PORTAL
   Vanilla JavaScript
   ========================================================= */

(function () {
  'use strict';

  /* -------------------------------------------------------
     1. NGÀY HIỆN TẠI (tiếng Việt)
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
     2. NĂM Ở FOOTER
     ------------------------------------------------------- */
  function updateFooterYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* -------------------------------------------------------
     3. STICKY HEADER SHADOW KHI SCROLL
     ------------------------------------------------------- */
  function initStickyHeader() {
    var header = document.getElementById('siteHeader');
    if (!header) return;

    function onScroll() {
      if (window.scrollY > 10) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* -------------------------------------------------------
     4. MOBILE MENU
     ------------------------------------------------------- */
  function initMobileMenu() {
    var toggle = document.getElementById('mobileToggle');
    var menu = document.getElementById('mobileMenu');
    var icon = document.getElementById('mobileToggleIcon');
    if (!toggle || !menu) return;

    function setOpen(open) {
      if (open) {
        menu.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Đóng menu');
        if (icon) icon.className = 'fa-solid fa-xmark text-lg';
      } else {
        menu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Mở menu');
        if (icon) icon.className = 'fa-solid fa-bars text-lg';
      }
    }

    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!isOpen);
    });

    // Tự đóng khi chọn link
    var links = menu.querySelectorAll('a');
    links.forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    // Đóng khi nhấn Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* -------------------------------------------------------
     5. HERO CAROUSEL (vanilla)
     ------------------------------------------------------- */
  function initHeroCarousel() {
    var root = document.getElementById('heroCarousel');
    if (!root) return;

    var slides = root.querySelectorAll('.slide');
    var dots = root.querySelectorAll('[data-carousel-dot]');
    var btnPrev = root.querySelector('[data-carousel-prev]');
    var btnNext = root.querySelector('[data-carousel-next]');
    var current = 0;
    var total = slides.length;
    var timer = null;
    var AUTOPLAY_MS = 6000;

    if (total <= 1) return;

    function goTo(index) {
      if (index < 0) index = total - 1;
      if (index >= total) index = 0;
      current = index;

      slides.forEach(function (s, i) {
        s.classList.toggle('active', i === index);
        s.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      });
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === index);
        d.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function start() {
      stop();
      timer = setInterval(next, AUTOPLAY_MS);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    if (btnPrev) btnPrev.addEventListener('click', function () { prev(); start(); });
    if (btnNext) btnNext.addEventListener('click', function () { next(); start(); });
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); start(); });
    });

    // Pause khi hover / focus
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    // Điều hướng bằng bàn phím
    root.setAttribute('tabindex', '0');
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { prev(); start(); }
      if (e.key === 'ArrowRight') { next(); start(); }
    });

    // Pause khi tab bị ẩn
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stop(); } else { start(); }
    });

    // Swipe trên mobile
    var touchStartX = 0;
    var touchEndX = 0;
    root.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
      touchEndX = e.changedTouches[0].screenX;
      var diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) next(); else prev();
        start();
      }
    }, { passive: true });

    // Khởi tạo
    goTo(0);
    start();
  }

  /* -------------------------------------------------------
     6. AUDIO PLAYER
     ------------------------------------------------------- */
  function initAudioPlayer() {
    var audio = document.getElementById('schoolSong');
    var btn = document.getElementById('btnToggleSong');
    if (!audio || !btn) return;

    function renderButton(isPlaying) {
      if (isPlaying) {
        btn.innerHTML = '<i class="fa-solid fa-pause mr-1.5"></i> Tạm dừng';
      } else {
        btn.innerHTML = '<i class="fa-solid fa-play mr-1.5"></i> Phát nhạc';
      }
    }

    renderButton(false);

    btn.addEventListener('click', function () {
      if (audio.paused) {
        var p = audio.play();
        if (p && typeof p.then === 'function') {
          p.catch(function () {
            console.warn('Không thể phát audio. Kiểm tra file audio/bai-hat-truyen-thong.mp3');
          });
        }
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('play', function () { renderButton(true); });
    audio.addEventListener('pause', function () { renderButton(false); });
    audio.addEventListener('ended', function () {
      renderButton(false);
      audio.currentTime = 0;
    });
  }

  /* -------------------------------------------------------
     7. BACK TO TOP
     ------------------------------------------------------- */
  function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;

    function toggle() {
      if (window.scrollY > 320) btn.classList.add('show');
      else btn.classList.remove('show');
    }

    window.addEventListener('scroll', toggle, { passive: true });
    toggle();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* -------------------------------------------------------
     8. SMOOTH ANCHOR SCROLL (bù trừ header)
     ------------------------------------------------------- */
  function initSmoothAnchorScroll() {
    var anchors = document.querySelectorAll('a[href^="#"]');
    if (!anchors.length) return;

    anchors.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;

        var target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        var headerOffset = 90;
        var top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  /* -------------------------------------------------------
     9. INIT
     ------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    updateCurrentDate();
    updateFooterYear();
    initStickyHeader();
    initMobileMenu();
    initHeroCarousel();
    initAudioPlayer();
    initBackToTop();
    initSmoothAnchorScroll();
  });

})();