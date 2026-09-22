/* =========================================================
   TRƯỜNG THCS-THPT TRẦN TRƯỜNG SINH – PORTAL
   script.js — Firebase Compat + Auth + Load More + Filter
   ========================================================= */

(function () {
  'use strict';

  /* -------------------------------------------------------
     0. FIREBASE CONFIG & INIT
     ------------------------------------------------------- */
  var firebaseConfig = {
    apiKey: "AIzaSyAzzbXw6qYYx-qr0_i1tV3UcOSivU_4dq0",
    authDomain: "tttweb-7c14d.firebaseapp.com",
    projectId: "tttweb-7c14d",
    storageBucket: "tttweb-7c14d.firebasestorage.app",
    messagingSenderId: "762394712272",
    appId: "1:762394712272:web:f7a0e1ddc8d0aeb1c1a6d5"
  };

  var db = null;
  var auth = null;

  try {
    if (typeof firebase !== 'undefined' && firebase.apps) {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      if (firebase.auth) auth = firebase.auth();
    }
  } catch (e) {
    console.warn('Firebase chưa khởi tạo:', e);
  }

  var POSTS_COLLECTION = 'posts';
  var PAGE_SIZE = 12;

  /* -------------------------------------------------------
     1. TIỆN ÍCH CHUNG
     ------------------------------------------------------- */

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatDateVN(date) {
    if (!date) return '—';
    var d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '—';
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function formatDateFullVN(date) {
    if (!date) return '—';
    var d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '—';
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getTimestamp(post) {
    if (!post) return 0;
    if (post.createdAt && typeof post.createdAt.toDate === 'function') {
      return post.createdAt.toDate().getTime();
    }
    if (post.createdAt && post.createdAt.seconds) {
      return post.createdAt.seconds * 1000;
    }
    if (post.createdAt) {
      var t = new Date(post.createdAt).getTime();
      return isNaN(t) ? 0 : t;
    }
    return 0;
  }

  function stripHTML(html) {
    if (!html) return '';
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function toDrivePreview(url) {
    if (!url) return '';
    url = String(url).trim();
    if (url.indexOf('drive.google.com') === -1) return url;

    var m1 = url.match(/\/file\/d\/([^/]+)/);
    if (m1 && m1[1]) return 'https://drive.google.com/file/d/' + m1[1] + '/preview';

    var m2 = url.match(/[?&]id=([^&]+)/);
    if (m2 && m2[1]) return 'https://drive.google.com/file/d/' + m2[1] + '/preview';

    var m3 = url.match(/\/open\?id=([^&]+)/);
    if (m3 && m3[1]) return 'https://drive.google.com/file/d/' + m3[1] + '/preview';

    return url;
  }

  function toSheetsEmbed(url) {
    if (!url) return '';
    url = String(url).trim();
    if (url.indexOf('docs.google.com/spreadsheets') === -1) return url;
    if (url.indexOf('/pubhtml') !== -1 || url.indexOf('/htmlembed') !== -1) return url;
    var m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m && m[1]) return 'https://docs.google.com/spreadsheets/d/' + m[1] + '/preview';
    return url;
  }

  /* -------------------------------------------------------
     2. NGÀY HIỆN TẠI + FOOTER YEAR
     ------------------------------------------------------- */
  function updateCurrentDate() {
    var el = document.getElementById('currentDate');
    if (!el) return;
    var now = new Date();
    var thu = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    el.textContent = thu[now.getDay()] + ', ' + formatDateVN(now);
  }

  function updateFooterYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* -------------------------------------------------------
     3. STICKY HEADER
     ------------------------------------------------------- */
  function initStickyHeader() {
    var header = document.getElementById('siteHeader');
    if (!header) return;
    function onScroll() {
      if (window.scrollY > 10) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
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

    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* -------------------------------------------------------
     5. HERO CAROUSEL
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
    function start() { stop(); timer = setInterval(next, AUTOPLAY_MS); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    if (btnPrev) btnPrev.addEventListener('click', function () { prev(); start(); });
    if (btnNext) btnNext.addEventListener('click', function () { next(); start(); });
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); start(); });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    root.setAttribute('tabindex', '0');
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { prev(); start(); }
      if (e.key === 'ArrowRight') { next(); start(); }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    var touchStartX = 0;
    root.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
      var diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) next(); else prev();
        start();
      }
    }, { passive: true });

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

    function render(isPlaying) {
      if (isPlaying) btn.innerHTML = '<i class="fa-solid fa-pause mr-1.5"></i> Tạm dừng';
      else btn.innerHTML = '<i class="fa-solid fa-play mr-1.5"></i> Phát nhạc';
    }
    render(false);

    btn.addEventListener('click', function () {
      if (audio.paused) {
        var p = audio.play();
        if (p && typeof p.then === 'function') {
          p.catch(function () { console.warn('Không thể phát audio.'); });
        }
      } else audio.pause();
    });

    audio.addEventListener('play', function () { render(true); });
    audio.addEventListener('pause', function () { render(false); });
    audio.addEventListener('ended', function () { render(false); audio.currentTime = 0; });
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
     8. SMOOTH ANCHOR
     ------------------------------------------------------- */
  function initSmoothAnchorScroll() {
    var anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  /* -------------------------------------------------------
     9. MODAL XEM VĂN BẢN
     ------------------------------------------------------- */
  function openViewModal(opts) {
    var modal = document.getElementById('viewModal');
    if (!modal) return;
    var titleEl = document.getElementById('viewModalTitle');
    var bodyEl = document.getElementById('viewModalBody');
    var openNew = document.getElementById('viewModalOpenNew');

    if (titleEl) titleEl.textContent = opts.title || 'Xem văn bản';
    if (openNew) openNew.href = opts.originalUrl || opts.url || '#';

    if (bodyEl) {
      bodyEl.innerHTML =
        '<iframe src="' + escapeHTML(opts.url) + '" ' +
        'title="' + escapeHTML(opts.title || 'Văn bản') + '" ' +
        'class="view-modal-iframe" ' +
        'loading="lazy" referrerpolicy="no-referrer" allowfullscreen></iframe>';
    }
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    var closeBtn = modal.querySelector('[data-modal-close]');
    if (closeBtn) closeBtn.focus();
  }

  function closeViewModal() {
    var modal = document.getElementById('viewModal');
    if (!modal) return;
    var bodyEl = document.getElementById('viewModalBody');
    if (bodyEl) bodyEl.innerHTML = '';
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function initModalEvents() {
    var modal = document.getElementById('viewModal');
    if (!modal) return;
    modal.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-modal-close]')) {
        closeViewModal();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeViewModal();
    });
  }

  function initDocModalDelegate() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-doc-action="open-modal"]');
      if (!trigger) return;
      e.preventDefault();
      var url = trigger.getAttribute('data-doc-url');
      var title = trigger.getAttribute('data-doc-title') || 'Xem văn bản';
      if (!url) return;
      openViewModal({ title: title, url: toDrivePreview(url), originalUrl: url });
    });
  }

  /* -------------------------------------------------------
     10. CARD TIN TỨC (dùng chung)
     ------------------------------------------------------- */
  function renderNewsCard(post) {
    var title = escapeHTML(post.title || '(Không có tiêu đề)');
    var image = post.image || 'images/banner-1.jpg';
    var excerpt = post.excerpt || '';
    if (!excerpt && post.content) excerpt = stripHTML(post.content).slice(0, 160);
    excerpt = escapeHTML(excerpt);
    var dateStr = formatDateVN(
      post.createdAt && post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt
    );

    var href = '#';
    var extraAttrs = '';
    if (post.type === 'announcement' && post.link) {
      extraAttrs = ' data-doc-url="' + escapeHTML(post.link) + '" data-doc-title="' + title + '" data-doc-action="open-modal"';
    } else if ((post.type === 'timetable' || post.type === 'exam') && post.sheetLink) {
      href = post.type === 'timetable' ? 'thoikhoabieu.html' : 'ketquathi.html';
    }

    return '' +
      '<article class="news-card">' +
        '<a href="' + href + '" class="news-card-img-wrap" aria-label="Đọc tiếp: ' + title + '"' + extraAttrs + '>' +
          '<img src="' + escapeHTML(image) + '" alt="" class="news-card-img" loading="lazy" onerror="imgFallback(this)" />' +
          '<span class="news-card-category">Tin tức</span>' +
        '</a>' +
        '<div class="news-card-body">' +
          '<time class="news-card-date" datetime="">' +
            '<i class="fa-regular fa-calendar mr-1"></i>' + escapeHTML(dateStr) +
          '</time>' +
          '<h3 class="news-card-title"><a href="' + href + '"' + extraAttrs + '>' + title + '</a></h3>' +
          '<p class="news-card-excerpt">' + excerpt + '</p>' +
          '<a href="' + href + '" class="news-card-more"' + extraAttrs + '>Đọc tiếp <i class="fa-solid fa-arrow-right"></i></a>' +
        '</div>' +
      '</article>';
  }

  /* -------------------------------------------------------
     11. ITEM THÔNG BÁO
     ------------------------------------------------------- */
  function renderAnnouncementItem(post) {
    var title = escapeHTML(post.title || '(Không có tiêu đề)');
    var dateStr = formatDateVN(
      post.createdAt && post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt
    );
    var hasDoc = post.link ? true : false;
    var dataAttrs = hasDoc
      ? ' data-doc-url="' + escapeHTML(post.link) + '" data-doc-title="' + title + '" data-doc-action="open-modal"'
      : '';

    return '' +
      '<li class="widget-item">' +
        '<a href="' + (hasDoc ? '#' : '#') + '" class="widget-item-link"' + dataAttrs + '>' +
          '<span class="widget-item-icon"><i class="fa-regular fa-file-pdf"></i></span>' +
          '<span class="widget-item-body">' +
            '<span class="widget-item-title">' + title + '</span>' +
            '<span class="widget-item-meta"><i class="fa-regular fa-clock mr-1"></i>' + escapeHTML(dateStr) + '</span>' +
          '</span>' +
          (hasDoc ? '<span class="widget-item-cta"><i class="fa-solid fa-eye"></i></span>' : '') +
        '</a>' +
      '</li>';
  }

  /* -------------------------------------------------------
     12. TRANG CHỦ — TIN TỨC + THÔNG BÁO
     ------------------------------------------------------- */
  function loadHomeNews() {
    var grid = document.getElementById('newsGrid');
    if (!grid || !db) return;
    var loading = document.getElementById('newsLoading');
    var empty = document.getElementById('newsEmpty');

    db.collection(POSTS_COLLECTION).where('type', '==', 'news').get()
      .then(function (snap) {
        var posts = [];
        snap.forEach(function (doc) {
          var d = doc.data(); d.id = doc.id; posts.push(d);
        });
        posts.sort(function (a, b) { return getTimestamp(b) - getTimestamp(a); });
        posts = posts.slice(0, 9);

        if (loading) loading.classList.add('hidden');
        if (!posts.length) { if (empty) empty.classList.remove('hidden'); return; }
        var html = '';
        posts.forEach(function (p) { html += renderNewsCard(p); });
        grid.innerHTML = html;
      })
      .catch(function (err) {
        console.error('Lỗi tải tin tức:', err);
        if (loading) loading.classList.add('hidden');
        if (empty) empty.classList.remove('hidden');
      });
  }

  function loadHomeAnnouncements() {
    var list = document.getElementById('announcementList');
    if (!list || !db) return;
    var loading = document.getElementById('annLoading');
    var empty = document.getElementById('annEmpty');

    db.collection(POSTS_COLLECTION).where('type', '==', 'announcement').get()
      .then(function (snap) {
        var posts = [];
        snap.forEach(function (doc) {
          var d = doc.data(); d.id = doc.id; posts.push(d);
        });
        posts.sort(function (a, b) { return getTimestamp(b) - getTimestamp(a); });
        posts = posts.slice(0, 6);

        if (loading) loading.classList.add('hidden');
        if (!posts.length) { if (empty) empty.classList.remove('hidden'); return; }
        var html = '';
        posts.forEach(function (p) { html += renderAnnouncementItem(p); });
        list.innerHTML = html;
      })
      .catch(function (err) {
        console.error('Lỗi tải thông báo:', err);
        if (loading) loading.classList.add('hidden');
        if (empty) empty.classList.remove('hidden');
      });
  }

  /* -------------------------------------------------------
     13. TRANG TIN TỨC — LOAD MORE
     ------------------------------------------------------- */
  function initArchiveNewsPage() {
    var grid = document.getElementById('archiveNewsGrid');
    if (!grid || !db) return;

    var loadingEl = document.getElementById('archiveNewsLoading');
    var emptyEl = document.getElementById('archiveNewsEmpty');
    var contentEl = document.getElementById('archiveNewsContent');
    var loadMoreWrap = document.getElementById('archiveNewsLoadMoreWrap');
    var loadMoreBtn = document.getElementById('archiveNewsLoadMore');
    var counterEl = document.getElementById('archiveNewsCounter');
    var endEl = document.getElementById('archiveNewsEnd');

    var allPosts = [];
    var shown = 0;

    function renderChunk() {
      var next = allPosts.slice(shown, shown + PAGE_SIZE);
      var html = '';
      next.forEach(function (p) { html += renderNewsCard(p); });
      grid.insertAdjacentHTML('beforeend', html);
      shown += next.length;

      if (counterEl) {
        counterEl.textContent = 'Đang hiển thị ' + shown + ' / ' + allPosts.length + ' tin tức';
      }
      if (shown >= allPosts.length) {
        if (loadMoreWrap) loadMoreWrap.classList.add('hidden');
        if (endEl) endEl.classList.remove('hidden');
      } else {
        if (loadMoreWrap) loadMoreWrap.classList.remove('hidden');
        if (endEl) endEl.classList.add('hidden');
      }
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', function () {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang tải...';
        setTimeout(function () {
          renderChunk();
          loadMoreBtn.disabled = false;
          loadMoreBtn.innerHTML = '<i class="fa-solid fa-circle-plus mr-1.5"></i> Tải thêm tin tức';
        }, 150);
      });
    }

    db.collection(POSTS_COLLECTION).where('type', '==', 'news').get()
      .then(function (snap) {
        snap.forEach(function (doc) {
          var d = doc.data(); d.id = doc.id; allPosts.push(d);
        });
        allPosts.sort(function (a, b) { return getTimestamp(b) - getTimestamp(a); });

        if (loadingEl) loadingEl.classList.add('hidden');
        if (!allPosts.length) {
          if (emptyEl) emptyEl.classList.remove('hidden');
          return;
        }
        if (contentEl) contentEl.classList.remove('hidden');
        renderChunk();
      })
      .catch(function (err) {
        console.error('Lỗi tải tin tức:', err);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (emptyEl) emptyEl.classList.remove('hidden');
      });
  }

  /* -------------------------------------------------------
     14. TRANG THÔNG BÁO — LOAD MORE
     ------------------------------------------------------- */
  function initArchiveAnnPage() {
    var list = document.getElementById('archiveAnnList');
    if (!list || !db) return;

    var loadingEl = document.getElementById('archiveAnnLoading');
    var emptyEl = document.getElementById('archiveAnnEmpty');
    var contentEl = document.getElementById('archiveAnnContent');
    var loadMoreWrap = document.getElementById('archiveAnnLoadMoreWrap');
    var loadMoreBtn = document.getElementById('archiveAnnLoadMore');
    var counterEl = document.getElementById('archiveAnnCounter');
    var endEl = document.getElementById('archiveAnnEnd');

    var allPosts = [];
    var shown = 0;

    function renderChunk() {
      var next = allPosts.slice(shown, shown + PAGE_SIZE);
      var html = '';
      next.forEach(function (p) { html += renderAnnouncementItem(p); });
      list.insertAdjacentHTML('beforeend', html);
      shown += next.length;

      if (counterEl) {
        counterEl.textContent = 'Đang hiển thị ' + shown + ' / ' + allPosts.length + ' văn bản – thông báo';
      }
      if (shown >= allPosts.length) {
        if (loadMoreWrap) loadMoreWrap.classList.add('hidden');
        if (endEl) endEl.classList.remove('hidden');
      } else {
        if (loadMoreWrap) loadMoreWrap.classList.remove('hidden');
        if (endEl) endEl.classList.add('hidden');
      }
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', function () {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang tải...';
        setTimeout(function () {
          renderChunk();
          loadMoreBtn.disabled = false;
          loadMoreBtn.innerHTML = '<i class="fa-solid fa-circle-plus mr-1.5"></i> Tải thêm văn bản – thông báo';
        }, 150);
      });
    }

    db.collection(POSTS_COLLECTION).where('type', '==', 'announcement').get()
      .then(function (snap) {
        snap.forEach(function (doc) {
          var d = doc.data(); d.id = doc.id; allPosts.push(d);
        });
        allPosts.sort(function (a, b) { return getTimestamp(b) - getTimestamp(a); });

        if (loadingEl) loadingEl.classList.add('hidden');
        if (!allPosts.length) {
          if (emptyEl) emptyEl.classList.remove('hidden');
          return;
        }
        if (contentEl) contentEl.classList.remove('hidden');
        renderChunk();
      })
      .catch(function (err) {
        console.error('Lỗi tải thông báo:', err);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (emptyEl) emptyEl.classList.remove('hidden');
      });
  }

  /* -------------------------------------------------------
     15. ADMIN — AUTH + FORM + FILTER + SỬA/XÓA
     ------------------------------------------------------- */
  function initAdminPage() {
    var loginView = document.getElementById('loginView');
    var adminView = document.getElementById('adminView');
    var adminUserBox = document.getElementById('adminUserBox');
    var adminUserEmail = document.getElementById('adminUserEmail');
    var logoutBtn = document.getElementById('logoutBtn');

    var loginForm = document.getElementById('loginForm');
    var loginEmail = document.getElementById('loginEmail');
    var loginPassword = document.getElementById('loginPassword');
    var loginBtn = document.getElementById('loginBtn');
    var loginAlert = document.getElementById('loginAlert');
    var togglePwBtn = document.getElementById('togglePwBtn');
    var togglePwIcon = document.getElementById('togglePwIcon');

    var form = document.getElementById('postForm');
    var postIdEl = document.getElementById('postId');
    var typeEl = document.getElementById('postType');
    var titleEl = document.getElementById('postTitle');
    var imageEl = document.getElementById('postImage');
    var linkEl = document.getElementById('postLink');
    var sheetEl = document.getElementById('postSheet');
    var contentEl = document.getElementById('postContent');

    var fieldImage = document.getElementById('fieldImage');
    var fieldLink = document.getElementById('fieldLink');
    var fieldSheet = document.getElementById('fieldSheet');
    var fieldContent = document.getElementById('fieldContent');

    var formTitle = document.getElementById('formTitle');
    var submitBtn = document.getElementById('submitBtn');
    var cancelEdit = document.getElementById('cancelEdit');
    var formAlert = document.getElementById('formAlert');

    var postList = document.getElementById('postList');
    var postListLoading = document.getElementById('postListLoading');
    var postListEmpty = document.getElementById('postListEmpty');
    var postListFilterEmpty = document.getElementById('postListFilterEmpty');
    var reloadBtn = document.getElementById('reloadPosts');

    /* --- Toolbar --- */
    var searchInput = document.getElementById('adminSearchInput');
    var searchClear = document.getElementById('adminSearchClear');
    var typeFilter = document.getElementById('adminTypeFilter');
    var resultInfo = document.getElementById('adminResultInfo');

    /* Cache */
    postList._allPosts = [];

    /* --- Helpers hiển thị --- */
    function showLoginView() {
      if (loginView) loginView.classList.remove('hidden');
      if (adminView) adminView.classList.add('hidden');
      if (adminUserBox) {
        adminUserBox.classList.add('hidden');
        adminUserBox.classList.remove('flex');
      }
    }
    function showAdminView(user) {
      if (loginView) loginView.classList.add('hidden');
      if (adminView) adminView.classList.remove('hidden');
      if (adminUserBox) {
        adminUserBox.classList.remove('hidden');
        adminUserBox.classList.add('flex');
      }
      if (adminUserEmail && user) adminUserEmail.textContent = user.email || '—';
    }

    function showAlert(el, type, message) {
      if (!el) return;
      el.classList.remove(
        'hidden',
        'bg-red-50', 'text-red-700', 'border', 'border-red-200',
        'bg-green-50', 'text-green-700', 'border', 'border-green-200'
      );
      if (type === 'success') {
        el.classList.add('bg-green-50', 'text-green-700', 'border', 'border-green-200');
      } else {
        el.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
      }
      el.textContent = message;
      setTimeout(function () { el.classList.add('hidden'); }, 5000);
    }

    /* --- Login --- */
    if (togglePwBtn && loginPassword && togglePwIcon) {
      togglePwBtn.addEventListener('click', function () {
        var isPw = loginPassword.type === 'password';
        loginPassword.type = isPw ? 'text' : 'password';
        togglePwIcon.className = isPw ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!auth) { showAlert(loginAlert, 'error', 'Firebase Auth chưa sẵn sàng.'); return; }

        var email = (loginEmail.value || '').trim();
        var password = loginPassword.value || '';
        if (!email || !password) {
          showAlert(loginAlert, 'error', 'Vui lòng nhập đầy đủ email và mật khẩu.');
          return;
        }

        if (loginBtn) {
          loginBtn.disabled = true;
          loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang đăng nhập...';
        }

        auth.signInWithEmailAndPassword(email, password)
          .then(function () {
            if (loginForm) loginForm.reset();
          })
          .catch(function (err) {
            console.error('Lỗi đăng nhập:', err);
            var msg = 'Đăng nhập thất bại.';
            var code = err && err.code ? err.code : '';
            if (code === 'auth/invalid-email') msg = 'Email không hợp lệ.';
            else if (code === 'auth/user-not-found') msg = 'Không tìm thấy tài khoản với email này.';
            else if (code === 'auth/wrong-password') msg = 'Mật khẩu không đúng.';
            else if (code === 'auth/invalid-credential') msg = 'Email hoặc mật khẩu không đúng.';
            else if (code === 'auth/too-many-requests') msg = 'Quá nhiều lần thử. Vui lòng thử lại sau.';
            else if (code === 'auth/network-request-failed') msg = 'Lỗi kết nối mạng. Vui lòng kiểm tra Internet.';
            else if (err && err.message) msg = err.message;
            showAlert(loginAlert, 'error', msg);
          })
          .finally(function () {
            if (loginBtn) {
              loginBtn.disabled = false;
              loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-1.5"></i> Đăng nhập';
            }
          });
      });
    }

    /* --- Logout --- */
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        if (!auth) return;
        var ok = window.confirm('Bạn có chắc chắn muốn đăng xuất?');
        if (!ok) return;
        auth.signOut()
          .then(function () { window.scrollTo({ top: 0, behavior: 'smooth' }); })
          .catch(function (err) {
            console.error('Lỗi đăng xuất:', err);
            window.alert('Không thể đăng xuất: ' + (err.message || 'Lỗi không xác định'));
          });
      });
    }

    if (!form) return;

    /* --- Fields visibility --- */
    function updateFieldsVisibility() {
      var type = typeEl.value;
      if (type === 'announcement') {
        fieldImage.classList.add('hidden');
        fieldLink.classList.remove('hidden');
        fieldSheet.classList.add('hidden');
        fieldContent.classList.remove('hidden');
        linkEl.setAttribute('required', 'required');
        sheetEl.removeAttribute('required');
        imageEl.removeAttribute('required');
        contentEl.removeAttribute('required');
      } else if (type === 'timetable' || type === 'exam') {
        fieldImage.classList.add('hidden');
        fieldLink.classList.add('hidden');
        fieldSheet.classList.remove('hidden');
        fieldContent.classList.add('hidden');
        sheetEl.setAttribute('required', 'required');
        linkEl.removeAttribute('required');
        imageEl.removeAttribute('required');
        contentEl.removeAttribute('required');
      } else {
        fieldImage.classList.remove('hidden');
        fieldLink.classList.add('hidden');
        fieldSheet.classList.add('hidden');
        fieldContent.classList.remove('hidden');
        linkEl.removeAttribute('required');
        sheetEl.removeAttribute('required');
        imageEl.removeAttribute('required');
        contentEl.removeAttribute('required');
      }
    }

    function resetForm() {
      form.reset();
      if (postIdEl) postIdEl.value = '';
      if (formTitle) formTitle.innerHTML = '<i class="fa-solid fa-pen-to-square text-brand-gold"></i> Đăng bài mới';
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1.5"></i> Đăng bài';
      if (cancelEdit) cancelEdit.classList.add('hidden');
      updateFieldsVisibility();
    }

    typeEl.addEventListener('change', updateFieldsVisibility);
    updateFieldsVisibility();

    if (cancelEdit) cancelEdit.addEventListener('click', function () { resetForm(); });

    /* --- Submit --- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!auth || !auth.currentUser) {
        showAlert(formAlert, 'error', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      if (!db) { showAlert(formAlert, 'error', 'Firebase chưa sẵn sàng.'); return; }

      var id = (postIdEl.value || '').trim();
      var type = typeEl.value;
      var title = (titleEl.value || '').trim();
      if (!title) {
        showAlert(formAlert, 'error', 'Vui lòng nhập tiêu đề.');
        titleEl.focus();
        return;
      }

      var data = {
        type: type,
        title: title,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (type === 'announcement') {
        var link = (linkEl.value || '').trim();
        if (!link) { showAlert(formAlert, 'error', 'Vui lòng nhập link Google Drive văn bản.'); linkEl.focus(); return; }
        data.link = link;
        data.content = (contentEl.value || '').trim();
        data.image = ''; data.sheetLink = ''; data.excerpt = '';
      } else if (type === 'timetable' || type === 'exam') {
        var sheet = (sheetEl.value || '').trim();
        if (!sheet) { showAlert(formAlert, 'error', 'Vui lòng nhập link Google Sheets.'); sheetEl.focus(); return; }
        data.sheetLink = sheet;
        data.link = ''; data.content = ''; data.image = ''; data.excerpt = '';
      } else {
        data.image = (imageEl.value || '').trim();
        data.content = (contentEl.value || '').trim();
        data.excerpt = stripHTML(data.content).slice(0, 200);
        data.link = ''; data.sheetLink = '';
      }

      var p;
      if (id) {
        p = db.collection(POSTS_COLLECTION).doc(id).update(data);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        p = db.collection(POSTS_COLLECTION).add(data);
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang lưu...';
      }

      p.then(function () {
        showAlert(formAlert, 'success', id ? 'Cập nhật bài viết thành công!' : 'Đăng bài thành công!');
        resetForm();
        loadAdminPosts();
      }).catch(function (err) {
        console.error('Lỗi lưu bài:', err);
        var msg = 'Lỗi: ' + (err.message || 'Không thể lưu.');
        if (err && err.code === 'permission-denied') msg = 'Không có quyền ghi dữ liệu. Vui lòng kiểm tra đăng nhập.';
        showAlert(formAlert, 'error', msg);
      }).finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = id
            ? '<i class="fa-solid fa-paper-plane mr-1.5"></i> Cập nhật'
            : '<i class="fa-solid fa-paper-plane mr-1.5"></i> Đăng bài';
        }
      });
    });

    /* --- Helpers badge --- */
    function typeLabel(t) {
      if (t === 'announcement') return 'Thông báo';
      if (t === 'timetable') return 'Thời khóa biểu';
      if (t === 'exam') return 'Kết quả thi';
      return 'Tin tức';
    }
    function typeClass(t) {
      if (t === 'announcement') return 'badge-ann';
      if (t === 'timetable') return 'badge-tkb';
      if (t === 'exam') return 'badge-exam';
      return 'badge-news';
    }

    function renderAdminItem(post) {
      var id = post.id;
      var title = escapeHTML(post.title || '(Không có tiêu đề)');
      var dateStr = formatDateFullVN(
        post.createdAt && post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt
      );
      var t = post.type || 'news';

      return '' +
        '<div class="admin-item" data-id="' + escapeHTML(id) + '">' +
          '<div class="admin-item-main">' +
            '<span class="admin-badge ' + typeClass(t) + '">' + escapeHTML(typeLabel(t)) + '</span>' +
            '<h4 class="admin-item-title">' + title + '</h4>' +
            '<p class="admin-item-meta"><i class="fa-regular fa-clock mr-1"></i>' + escapeHTML(dateStr) + '</p>' +
          '</div>' +
          '<div class="admin-item-actions">' +
            '<button type="button" class="admin-btn admin-btn-edit" data-action="edit" data-id="' + escapeHTML(id) + '" title="Sửa">' +
              '<i class="fa-solid fa-pen"></i><span class="hidden sm:inline ml-1">Sửa</span>' +
            '</button>' +
            '<button type="button" class="admin-btn admin-btn-del" data-action="delete" data-id="' + escapeHTML(id) + '" title="Xóa">' +
              '<i class="fa-solid fa-trash"></i><span class="hidden sm:inline ml-1">Xóa</span>' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    /* --- Filter + Render --- */
    function applyFiltersAndRender() {
      var all = postList._allPosts || [];
      var keyword = (searchInput && searchInput.value ? searchInput.value : '').toLowerCase().trim();
      var typeVal = (typeFilter && typeFilter.value) ? typeFilter.value : 'all';

      var filtered = all.filter(function (p) {
        var matchType = (typeVal === 'all') || (p.type === typeVal);
        var matchKeyword = !keyword || ((p.title || '').toLowerCase().indexOf(keyword) !== -1);
        return matchType && matchKeyword;
      });

      // Ẩn / hiện các khối trạng thái
      if (postListLoading) postListLoading.classList.add('hidden');
      if (postListEmpty) postListEmpty.classList.add('hidden');
      if (postListFilterEmpty) postListFilterEmpty.classList.add('hidden');

      if (!all.length) {
        if (postListEmpty) postListEmpty.classList.remove('hidden');
        postList.innerHTML = '';
        if (resultInfo) resultInfo.classList.add('hidden');
        return;
      }

      if (!filtered.length) {
        if (postListFilterEmpty) postListFilterEmpty.classList.remove('hidden');
        postList.innerHTML = '';
        if (resultInfo) {
          resultInfo.classList.remove('hidden');
          resultInfo.textContent = 'Kết quả: 0 / ' + all.length + ' bài viết';
        }
        return;
      }

      var html = '';
      filtered.forEach(function (p) { html += renderAdminItem(p); });
      postList.innerHTML = html;

      if (resultInfo) {
        resultInfo.classList.remove('hidden');
        var isFiltered = (keyword || typeVal !== 'all');
        resultInfo.textContent = isFiltered
          ? 'Kết quả: ' + filtered.length + ' / ' + all.length + ' bài viết'
          : 'Tổng cộng: ' + all.length + ' bài viết';
      }
    }

    /* --- Load all posts (1 lần) --- */
    window.loadAdminPosts = function () {
      if (!db) return;
      if (postListLoading) postListLoading.classList.remove('hidden');
      if (postListEmpty) postListEmpty.classList.add('hidden');
      if (postListFilterEmpty) postListFilterEmpty.classList.add('hidden');
      if (resultInfo) resultInfo.classList.add('hidden');
      postList.innerHTML = '';

      db.collection(POSTS_COLLECTION).get()
        .then(function (snap) {
          var posts = [];
          snap.forEach(function (doc) {
            var d = doc.data(); d.id = doc.id; posts.push(d);
          });
          posts.sort(function (a, b) { return getTimestamp(b) - getTimestamp(a); });
          postList._allPosts = posts;

          if (postListLoading) postListLoading.classList.add('hidden');

          if (!posts.length) {
            if (postListEmpty) postListEmpty.classList.remove('hidden');
            if (resultInfo) resultInfo.classList.add('hidden');
            return;
          }
          applyFiltersAndRender();
        })
        .catch(function (err) {
          console.error('Lỗi tải danh sách:', err);
          if (postListLoading) postListLoading.classList.add('hidden');
          if (postListEmpty) postListEmpty.classList.remove('hidden');
          showAlert(formAlert, 'error', 'Không thể tải danh sách: ' + (err.message || 'Lỗi không xác định'));
        });
    };

    if (reloadBtn) {
      reloadBtn.addEventListener('click', function () {
        if (searchInput) searchInput.value = '';
        if (searchClear) searchClear.classList.add('hidden');
        if (typeFilter) typeFilter.value = 'all';
        window.loadAdminPosts();
      });
    }

    /* --- Toolbar events --- */
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        if (searchClear) {
          if (searchInput.value.trim()) searchClear.classList.remove('hidden');
          else searchClear.classList.add('hidden');
        }
        applyFiltersAndRender();
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', function () {
        if (searchInput) { searchInput.value = ''; searchInput.focus(); }
        searchClear.classList.add('hidden');
        applyFiltersAndRender();
      });
    }
    if (typeFilter) {
      typeFilter.addEventListener('change', function () {
        applyFiltersAndRender();
      });
    }

    /* --- Delegate: Sửa / Xóa --- */
    if (postList) {
      postList.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-action');
        var id = btn.getAttribute('data-id');
        if (!id) return;

        var posts = postList._allPosts || [];
        var post = null;
        for (var i = 0; i < posts.length; i++) {
          if (posts[i].id === id) { post = posts[i]; break; }
        }
        if (!post) return;

        if (action === 'edit') {
          if (postIdEl) postIdEl.value = id;
          typeEl.value = post.type || 'news';
          titleEl.value = post.title || '';
          imageEl.value = post.image || '';
          linkEl.value = post.link || '';
          sheetEl.value = post.sheetLink || '';
          contentEl.value = post.content || '';
          updateFieldsVisibility();

          if (formTitle) formTitle.innerHTML = '<i class="fa-solid fa-pen-to-square text-brand-gold"></i> Cập nhật bài viết';
          if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1.5"></i> Cập nhật';
          if (cancelEdit) cancelEdit.classList.remove('hidden');

          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (action === 'delete') {
          var ok = window.confirm('Bạn có chắc chắn muốn xóa bài viết "' + (post.title || '(không tiêu đề)') + '"?\nHành động này không thể hoàn tác.');
          if (!ok) return;

          db.collection(POSTS_COLLECTION).doc(id).delete()
            .then(function () {
              showAlert(formAlert, 'success', 'Đã xóa bài viết.');
              if (postIdEl && postIdEl.value === id) resetForm();
              window.loadAdminPosts();
            })
            .catch(function (err) {
              console.error('Lỗi xóa:', err);
              var msg = 'Lỗi xóa: ' + (err.message || 'Không thể xóa.');
              if (err && err.code === 'permission-denied') msg = 'Không có quyền xóa. Vui lòng kiểm tra đăng nhập.';
              showAlert(formAlert, 'error', msg);
            });
        }
      });
    }

    /* --- Auth state --- */
    if (!auth) {
      showLoginView();
      showAlert(loginAlert, 'error', 'Firebase Authentication chưa sẵn sàng. Vui lòng tải lại trang.');
      return;
    }

    auth.onAuthStateChanged(function (user) {
      if (user) {
        showAdminView(user);
        window.loadAdminPosts();
      } else {
        showLoginView();
        postList.innerHTML = '';
        postList._allPosts = [];
        if (postListEmpty) postListEmpty.classList.add('hidden');
        if (postListFilterEmpty) postListFilterEmpty.classList.add('hidden');
        if (postListLoading) postListLoading.classList.add('hidden');
        if (resultInfo) resultInfo.classList.add('hidden');
        if (searchInput) searchInput.value = '';
        if (searchClear) searchClear.classList.add('hidden');
        if (typeFilter) typeFilter.value = 'all';
        resetForm();
      }
    });
  }

  /* -------------------------------------------------------
     16. TRANG TKB / KẾT QUẢ THI — LỊCH SỬ
     ------------------------------------------------------- */
  function initSheetHistoryPage(opts) {
    var container = document.getElementById(opts.contentId);
    if (!container || !db) return;

    var loadingEl = document.getElementById(opts.loadingId);
    var emptyEl = document.getElementById(opts.emptyId);
    var selectEl = document.getElementById(opts.selectId);
    var iframeEl = document.getElementById(opts.iframeId);
    var titleEl = document.getElementById(opts.titleId);
    var dateEl = document.getElementById(opts.dateId);
    var openNewEl = document.getElementById(opts.openNewId);

    var posts = [];

    function renderCurrent(index) {
      var post = posts[index];
      if (!post) return;
      var url = post.sheetLink || '';
      if (iframeEl) iframeEl.src = toSheetsEmbed(url);
      if (titleEl) titleEl.textContent = post.title || '—';
      if (dateEl) {
        dateEl.textContent = formatDateVN(
          post.createdAt && post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt
        );
      }
      if (openNewEl) openNewEl.href = url || '#';
    }

    db.collection(POSTS_COLLECTION).where('type', '==', opts.type).get()
      .then(function (snap) {
        snap.forEach(function (doc) {
          var d = doc.data(); d.id = doc.id; posts.push(d);
        });
        posts.sort(function (a, b) { return getTimestamp(b) - getTimestamp(a); });
        if (loadingEl) loadingEl.classList.add('hidden');

        if (!posts.length) {
          if (emptyEl) emptyEl.classList.remove('hidden');
          return;
        }

        var optionsHtml = '';
        posts.forEach(function (p, i) {
          var d = formatDateVN(p.createdAt && p.createdAt.toDate ? p.createdAt.toDate() : p.createdAt);
          optionsHtml += '<option value="' + i + '">' +
            escapeHTML((p.title || '(Không tiêu đề)') + ' — ' + d) +
            '</option>';
        });
        if (selectEl) {
          selectEl.innerHTML = optionsHtml;
          selectEl.value = '0';
          selectEl.addEventListener('change', function () {
            var idx = parseInt(selectEl.value, 10) || 0;
            renderCurrent(idx);
          });
        }
        container.classList.remove('hidden');
        renderCurrent(0);
      })
      .catch(function (err) {
        console.error('Lỗi tải dữ liệu:', err);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (emptyEl) emptyEl.classList.remove('hidden');
      });
  }

  /* -------------------------------------------------------
     17. INIT
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
    initModalEvents();
    initDocModalDelegate();

    var path = window.location.pathname.split('/').pop() || 'index.html';

    if (path === '' || path === 'index.html') {
      loadHomeNews();
      loadHomeAnnouncements();
    }
    if (path === 'tintuc.html') {
      initArchiveNewsPage();
    }
    if (path === 'thongbao.html') {
      initArchiveAnnPage();
    }
    if (path === 'admin.html') {
      initAdminPage();
    }
    if (path === 'thoikhoabieu.html') {
      initSheetHistoryPage({
        type: 'timetable',
        contentId: 'tkbContent', loadingId: 'tkbLoading', emptyId: 'tkbEmpty',
        selectId: 'tkbSelect', iframeId: 'tkbFrame',
        titleId: 'tkbTitle', dateId: 'tkbDate', openNewId: 'tkbOpenNew'
      });
    }
    if (path === 'ketquathi.html') {
      initSheetHistoryPage({
        type: 'exam',
        contentId: 'examContent', loadingId: 'examLoading', emptyId: 'examEmpty',
        selectId: 'examSelect', iframeId: 'examFrame',
        titleId: 'examTitle', dateId: 'examDate', openNewId: 'examOpenNew'
      });
    }
  });

})();