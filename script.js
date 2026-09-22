/* =========================================================
   TRƯỜNG THCS-THPT TRẦN TRƯỜNG SINH – PORTAL
   Vanilla JavaScript + Firebase (compat SDK via CDN)
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     CẤU HÌNH FIREBASE
     ========================================================= */
  const firebaseConfig = {
    apiKey: "AIzaSyAzzbXw6qYYx-qr0_i1tV3UcOSivU_4dq0",
    authDomain: "tttweb-7c14d.firebaseapp.com",
    projectId: "tttweb-7c14d",
    storageBucket: "tttweb-7c14d.firebasestorage.app",
    messagingSenderId: "762394712272",
    appId: "1:762394712272:web:f7a0e1ddc8d0aeb1c1a6d5"
  };

  /* =========================================================
     KHỞI TẠO FIREBASE
     ========================================================= */
  let db = null;
  let auth = null;
  let firebaseReady = false;

  try {
    if (typeof firebase !== 'undefined' && firebaseConfig && firebaseConfig.projectId) {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      auth = firebase.auth();
      firebaseReady = true;
    }
  } catch (err) {
    console.error('[Firebase] Lỗi khởi tạo:', err);
    firebaseReady = false;
  }

  /* =========================================================
     HELPERS
     ========================================================= */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function formatDate(ts) {
    if (!ts) return '';
    let date;
    try {
      if (typeof ts.toDate === 'function') date = ts.toDate();
      else if (ts instanceof Date) date = ts;
      else if (typeof ts === 'number') date = new Date(ts);
      else if (typeof ts === 'string') date = new Date(ts);
      else return '';
    } catch (e) { return ''; }
    if (!date || isNaN(date.getTime())) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return d + '/' + m + '/' + y;
  }

  function formatDateAttr(ts) {
    if (!ts) return '';
    let date;
    try {
      if (typeof ts.toDate === 'function') date = ts.toDate();
      else if (ts instanceof Date) date = ts;
      else if (typeof ts === 'number') date = new Date(ts);
      else return '';
    } catch (e) { return ''; }
    if (!date || isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function convertDriveUrlToPreview(url) {
    if (!url) return '';
    var u = String(url).trim();

    var docsMatch = u.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
    if (docsMatch) {
      return 'https://docs.google.com/' + docsMatch[1] + '/d/' + docsMatch[2] + '/preview';
    }

    var fileMatch = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      return 'https://drive.google.com/file/d/' + fileMatch[1] + '/preview';
    }

    var openMatch = u.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch) {
      return 'https://drive.google.com/file/d/' + openMatch[1] + '/preview';
    }

    var ucMatch = u.match(/drive\.google\.com\/uc\?[^#]*id=([a-zA-Z0-9_-]+)/);
    if (ucMatch) {
      return 'https://drive.google.com/file/d/' + ucMatch[1] + '/preview';
    }

    var folderMatch = u.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
      return 'https://drive.google.com/embeddedfolderview?id=' + folderMatch[1];
    }

    return u;
  }

  /* =========================================================
     NGÀY HIỆN TẠI
     ========================================================= */
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

  function updateFooterYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* =========================================================
     STICKY HEADER SHADOW
     ========================================================= */
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

  /* =========================================================
     MOBILE MENU
     ========================================================= */
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

    var links = menu.querySelectorAll('a');
    links.forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* =========================================================
     HERO CAROUSEL
     ========================================================= */
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
    var touchEndX = 0;
    root.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
      touchEndX = e.changedTouches[0].screenX;
      var diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) { if (diff > 0) next(); else prev(); start(); }
    }, { passive: true });

    goTo(0);
    start();
  }

  /* =========================================================
     AUDIO PLAYER
     ========================================================= */
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

  /* =========================================================
     BACK TO TOP
     ========================================================= */
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

  /* =========================================================
     SMOOTH ANCHOR SCROLL
     ========================================================= */
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

  /* =========================================================
     MODAL XEM VĂN BẢN (dùng chung index.html)
     ========================================================= */
  function openDocModal(rawUrl, title) {
    var modal = document.getElementById('docModal');
    var frame = document.getElementById('docModalFrame');
    var titleEl = document.getElementById('docModalTitle');
    var openTab = document.getElementById('docModalOpenTab');
    if (!modal || !frame) return;

    var previewUrl = convertDriveUrlToPreview(rawUrl);
    frame.src = previewUrl || 'about:blank';
    if (titleEl) titleEl.textContent = title || 'Xem văn bản';
    if (openTab) openTab.href = rawUrl || '#';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  function closeDocModal() {
    var modal = document.getElementById('docModal');
    var frame = document.getElementById('docModalFrame');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (frame) frame.src = 'about:blank';
    document.body.style.overflow = '';
  }

  function initDocModal() {
    var modal = document.getElementById('docModal');
    if (!modal) return;

    var closeBtn = document.getElementById('docModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeDocModal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeDocModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeDocModal();
    });
  }

  /* =========================================================
     RENDER TIN TỨC + THÔNG BÁO (trang chủ)
     ========================================================= */
  function newsCardHTML(post) {
    var date = formatDate(post.createdAt);
    var dateAttr = formatDateAttr(post.createdAt);
    var img = post.imageUrl || 'images/banner-1.jpg';
    var title = escapeHtml(post.title || '');
    var desc = escapeHtml(post.description || '');

    return '' +
      '<article class="news-card">' +
        '<a href="#" class="news-card-img-wrap" aria-label="Đọc tiếp: ' + title + '" onclick="return false;">' +
          '<img src="' + escapeAttr(img) + '" alt="" class="news-card-img" onerror="imgFallback(this)" />' +
          '<span class="news-card-category">Tin tức</span>' +
        '</a>' +
        '<div class="news-card-body">' +
          '<time class="news-card-date" datetime="' + dateAttr + '">' +
            '<i class="fa-regular fa-calendar mr-1"></i>' + date +
          '</time>' +
          '<h3 class="news-card-title">' +
            '<a href="#" onclick="return false;">' + title + '</a>' +
          '</h3>' +
          '<p class="news-card-excerpt">' + desc + '</p>' +
        '</div>' +
      '</article>';
  }

  function noticeItemHTML(post) {
    var date = formatDate(post.createdAt);
    var title = escapeHtml(post.title || '');
    var driveLink = post.driveLink || '';
    var hasLink = !!driveLink;

    return '' +
      '<li>' +
        '<a href="#" data-drive="' + escapeAttr(driveLink) + '" data-title="' + escapeAttr(title) + '"' +
          ' class="notice-link' + (hasLink ? '' : ' opacity-60 pointer-events-none') + '">' +
          '<i class="fa-solid fa-file-lines"></i>' +
          '<span>' + title +
            '<span class="ml-2 text-[11px] text-brand-muted">' + date + '</span>' +
          '</span>' +
        '</a>' +
      '</li>';
  }

  function sortByCreatedAtDesc(arr) {
    return arr.sort(function (a, b) {
      var ta = a.createdAt && typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : 0;
      var tb = b.createdAt && typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
  }

  async function loadHomePosts() {
    var newsGrid = document.getElementById('newsGrid');
    var noticesList = document.getElementById('noticesList');
    var newsLoading = document.getElementById('newsLoading');
    var newsEmpty = document.getElementById('newsEmpty');
    var noticesLoading = document.getElementById('noticesLoading');
    var noticesEmpty = document.getElementById('noticesEmpty');

    if (!newsGrid && !noticesList) return;

    if (!firebaseReady || !db) {
      if (newsLoading) newsLoading.classList.add('hidden');
      if (newsEmpty) newsEmpty.classList.remove('hidden');
      if (noticesLoading) noticesLoading.classList.add('hidden');
      if (noticesEmpty) noticesEmpty.classList.remove('hidden');
      return;
    }

    try {
      var snap = await db.collection('posts').get();
      var news = [];
      var notices = [];

      snap.forEach(function (doc) {
        var data = doc.data() || {};
        var item = {
          id: doc.id,
          type: data.type || '',
          title: data.title || '',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          driveLink: data.driveLink || '',
          createdAt: data.createdAt || null
        };
        if (item.type === 'news') news.push(item);
        else if (item.type === 'notice') notices.push(item);
      });

      sortByCreatedAtDesc(news);
      sortByCreatedAtDesc(notices);

      // Tin tức
      if (newsLoading) newsLoading.classList.add('hidden');
      if (newsGrid) {
        if (news.length > 0) {
          newsGrid.innerHTML = news.slice(0, 9).map(newsCardHTML).join('');
          if (newsEmpty) newsEmpty.classList.add('hidden');
        } else {
          newsGrid.innerHTML = '';
          if (newsEmpty) newsEmpty.classList.remove('hidden');
        }
      }

      // Thông báo
      if (noticesLoading) noticesLoading.classList.add('hidden');
      if (noticesList) {
        if (notices.length > 0) {
          noticesList.innerHTML = notices.slice(0, 10).map(noticeItemHTML).join('');
          if (noticesEmpty) noticesEmpty.classList.add('hidden');

          noticesList.addEventListener('click', function (e) {
            var link = e.target.closest('.notice-link');
            if (!link) return;
            e.preventDefault();
            var drive = link.getAttribute('data-drive');
            var title = link.getAttribute('data-title');
            if (!drive) return;
            openDocModal(drive, title);
          });
        } else {
          noticesList.innerHTML = '';
          if (noticesEmpty) noticesEmpty.classList.remove('hidden');
        }
      }
    } catch (err) {
      console.error('[Firestore] Lỗi tải bài viết:', err);
      if (newsLoading) newsLoading.classList.add('hidden');
      if (noticesLoading) noticesLoading.classList.add('hidden');
      if (newsGrid) newsGrid.innerHTML = '';
      if (noticesList) noticesList.innerHTML = '';
      if (newsEmpty) {
        newsEmpty.classList.remove('hidden');
        newsEmpty.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-4xl mb-3 text-red-300"></i><p class="text-sm">Không tải được tin tức.</p>';
      }
    }
  }

  /* =========================================================
     TRANG QUẢN TRỊ
     ========================================================= */
  function initAdminPage() {
    var loginSection = document.getElementById('loginSection');
    var adminSection = document.getElementById('adminSection');
    var loginForm = document.getElementById('loginForm');
    var postForm = document.getElementById('postForm');
    var currentUserEmail = document.getElementById('currentUserEmail');
    var logoutBtn = document.getElementById('logoutBtn');
    var configWarning = document.getElementById('configWarning');
    var postType = document.getElementById('postType');
    var imageField = document.getElementById('imageField');
    var driveField = document.getElementById('driveField');
    var postImage = document.getElementById('postImage');
    var postDrive = document.getElementById('postDrive');
    var postMessage = document.getElementById('postMessage');
    var recentPostsList = document.getElementById('recentPostsList');
    var postFormHeading = document.getElementById('postFormHeading');
    var editingBadge = document.getElementById('editingBadge');
    var postSubmitLabel = document.getElementById('postSubmitLabel');
    var cancelEditBtn = document.getElementById('cancelEditBtn');
    var resetFormBtn = document.getElementById('resetFormBtn');

    if (!loginSection && !adminSection) return;

    if (!firebaseReady) {
      if (configWarning) configWarning.classList.remove('hidden');
      if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
          e.preventDefault();
          showLoginError('Chưa cấu hình Firebase. Vui lòng điền firebaseConfig trong script.js.');
        });
      }
      return;
    }

    var editingPostId = null;
    var postsCache = {};

    function showLoginError(msg) {
      var errBox = document.getElementById('loginError');
      if (!errBox) return;
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    }
    function hideLoginError() {
      var errBox = document.getElementById('loginError');
      if (!errBox) return;
      errBox.textContent = '';
      errBox.classList.add('hidden');
    }
    function showPostMessage(type, msg) {
      if (!postMessage) return;
      var cls = type === 'success'
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-red-50 text-red-700 border border-red-200';
      postMessage.className = 'text-sm rounded-lg p-3 ' + cls;
      postMessage.textContent = msg;
      postMessage.classList.remove('hidden');
    }
    function hidePostMessage() {
      if (!postMessage) return;
      postMessage.classList.add('hidden');
      postMessage.textContent = '';
    }

    function updateFormByType() {
      if (!postType) return;
      var isNews = postType.value === 'news';
      if (imageField) imageField.classList.toggle('hidden', !isNews);
      if (driveField) driveField.classList.toggle('hidden', isNews);
      if (postImage) postImage.required = isNews;
      if (postDrive) postDrive.required = !isNews;
    }

    if (postType) {
      postType.addEventListener('change', updateFormByType);
      updateFormByType();
    }

    function resetFormState() {
      editingPostId = null;
      if (postFormHeading) postFormHeading.textContent = 'Đăng bài viết mới';
      if (editingBadge) editingBadge.classList.add('hidden');
      if (postSubmitLabel) postSubmitLabel.textContent = 'Đăng bài';
      if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
      hidePostMessage();
    }

    function fillFormWithPost(post) {
      editingPostId = post.id;
      if (postType) postType.value = post.type || 'news';
      updateFormByType();

      document.getElementById('postTitle').value = post.title || '';
      document.getElementById('postDesc').value = post.description || '';
      if (postImage) postImage.value = post.imageUrl || '';
      if (postDrive) postDrive.value = post.driveLink || '';

      if (postFormHeading) postFormHeading.textContent = 'Cập nhật bài viết';
      if (editingBadge) editingBadge.classList.remove('hidden');
      if (postSubmitLabel) postSubmitLabel.textContent = 'Cập nhật';
      if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');
      hidePostMessage();

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', function () {
        if (postForm) postForm.reset();
        resetFormState();
        updateFormByType();
      });
    }
    if (resetFormBtn) {
      resetFormBtn.addEventListener('click', function () {
        setTimeout(function () {
          resetFormState();
          updateFormByType();
        }, 0);
      });
    }

    function showLoggedIn(user) {
      if (loginSection) loginSection.classList.add('hidden');
      if (adminSection) adminSection.classList.remove('hidden');
      if (currentUserEmail) currentUserEmail.textContent = user.email || '(không có email)';
      loadRecentPosts();
    }
    function showLoggedOut() {
      if (loginSection) loginSection.classList.remove('hidden');
      if (adminSection) adminSection.classList.add('hidden');
      if (currentUserEmail) currentUserEmail.textContent = '—';
      hideLoginError();
      resetFormState();
    }

    auth.onAuthStateChanged(function (user) {
      if (user) showLoggedIn(user);
      else showLoggedOut();
    });

    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        hideLoginError();

        var email = document.getElementById('loginEmail').value.trim();
        var password = document.getElementById('loginPassword').value;
        var btn = document.getElementById('loginBtn');

        if (!email || !password) {
          showLoginError('Vui lòng nhập đầy đủ email và mật khẩu.');
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang đăng nhập...';

        auth.signInWithEmailAndPassword(email, password)
          .then(function () { loginForm.reset(); })
          .catch(function (err) {
            var msg = 'Đăng nhập thất bại.';
            if (err && err.code === 'auth/invalid-credential') msg = 'Email hoặc mật khẩu không đúng.';
            else if (err && err.code === 'auth/user-not-found') msg = 'Tài khoản không tồn tại.';
            else if (err && err.code === 'auth/wrong-password') msg = 'Mật khẩu không đúng.';
            else if (err && err.code === 'auth/invalid-email') msg = 'Email không hợp lệ.';
            else if (err && err.code === 'auth/too-many-requests') msg = 'Quá nhiều lần thử. Vui lòng thử lại sau.';
            else if (err && err.message) msg = err.message;
            showLoginError(msg);
          })
          .finally(function () {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-1.5"></i> Đăng nhập';
          });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        auth.signOut().catch(function (err) {
          console.error('[Auth] Lỗi đăng xuất:', err);
        });
      });
    }

    if (postForm) {
      postForm.addEventListener('submit', function (e) {
        e.preventDefault();
        hidePostMessage();

        var user = auth.currentUser;
        if (!user) {
          showPostMessage('error', 'Bạn cần đăng nhập để đăng bài.');
          return;
        }

        var type = postType.value;
        var title = document.getElementById('postTitle').value.trim();
        var description = document.getElementById('postDesc').value.trim();
        var imageUrl = postImage ? postImage.value.trim() : '';
        var driveLink = postDrive ? postDrive.value.trim() : '';

        if (!title || !description) {
          showPostMessage('error', 'Vui lòng nhập tiêu đề và mô tả ngắn.');
          return;
        }
        if (type === 'news' && !imageUrl) {
          showPostMessage('error', 'Vui lòng nhập link ảnh cho bài Tin tức.');
          return;
        }
        if (type === 'notice' && !driveLink) {
          showPostMessage('error', 'Vui lòng nhập link Google Drive cho bài Thông báo.');
          return;
        }

        var payload = {
          type: type,
          title: title,
          description: description,
          imageUrl: type === 'news' ? imageUrl : '',
          driveLink: type === 'notice' ? driveLink : '',
          authorEmail: user.email || ''
        };

        var submitBtn = document.getElementById('postSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang lưu...';

        var promise;
        if (editingPostId) {
          payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
          promise = db.collection('posts').doc(editingPostId).update(payload);
        } else {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          promise = db.collection('posts').add(payload);
        }

        promise
          .then(function () {
            showPostMessage('success', editingPostId ? 'Đã cập nhật bài viết thành công!' : 'Đã đăng bài thành công!');
            postForm.reset();
            resetFormState();
            updateFormByType();
            loadRecentPosts();
          })
          .catch(function (err) {
            console.error('[Firestore] Lỗi lưu bài viết:', err);
            showPostMessage('error', 'Không thể lưu bài viết. Vui lòng kiểm tra quyền Firestore. (' + (err.message || '') + ')');
          })
          .finally(function () {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1.5"></i> <span id="postSubmitLabel">' +
              (editingPostId ? 'Cập nhật' : 'Đăng bài') + '</span>';
          });
      });
    }

    async function deletePost(postId) {
      if (!confirm('Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.')) return;
      try {
        await db.collection('posts').doc(postId).delete();
        if (editingPostId === postId) {
          if (postForm) postForm.reset();
          resetFormState();
          updateFormByType();
        }
        loadRecentPosts();
      } catch (err) {
        console.error('[Firestore] Lỗi xóa bài viết:', err);
        alert('Không thể xóa bài viết. Vui lòng thử lại.');
      }
    }

    async function editPost(postId) {
      try {
        var docRef = db.collection('posts').doc(postId);
        var docSnap = await docRef.get();
        if (!docSnap.exists) {
          alert('Bài viết không tồn tại hoặc đã bị xóa.');
          loadRecentPosts();
          return;
        }
        var data = docSnap.data() || {};
        fillFormWithPost({
          id: docSnap.id,
          type: data.type || 'news',
          title: data.title || '',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          driveLink: data.driveLink || ''
        });
      } catch (err) {
        console.error('[Firestore] Lỗi tải bài viết:', err);
        alert('Không thể tải bài viết để sửa.');
      }
    }

    async function loadRecentPosts() {
      if (!recentPostsList) return;
      recentPostsList.innerHTML =
        '<li class="text-sm text-brand-muted py-3 text-center">' +
          '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải...' +
        '</li>';

      try {
        var snap = await db.collection('posts').get();
        var all = [];
        snap.forEach(function (doc) {
          var d = doc.data() || {};
          all.push({
            id: doc.id,
            type: d.type || '',
            title: d.title || '',
            createdAt: d.createdAt || null
          });
        });

        all.sort(function (a, b) {
          var ta = a.createdAt && typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : 0;
          var tb = b.createdAt && typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });

        if (all.length === 0) {
          recentPostsList.innerHTML =
            '<li class="text-sm text-brand-muted py-3 text-center">' +
              '<i class="fa-regular fa-folder-open mr-2"></i>Chưa có bài viết nào.' +
            '</li>';
          return;
        }

        recentPostsList.innerHTML = all.slice(0, 20).map(function (p) {
          var isNews = p.type === 'news';
          var icon = isNews ? 'fa-newspaper' : 'fa-file-lines';
          var label = isNews ? 'Tin tức' : 'Thông báo';
          var labelCls = isNews ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700';
          var date = formatDate(p.createdAt);

          return '' +
            '<li class="py-3 border-b border-brand-border last:border-b-0">' +
              '<div class="flex items-start gap-3">' +
                '<div class="flex-1 min-w-0">' +
                  '<p class="text-sm font-semibold text-brand-navy leading-snug break-words">' +
                    escapeHtml(p.title) +
                  '</p>' +
                  '<p class="text-xs text-brand-muted mt-1 flex flex-wrap items-center gap-2">' +
                    '<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ' + labelCls + '">' +
                      '<i class="fa-solid ' + icon + '"></i> ' + label +
                    '</span>' +
                    '<span><i class="fa-regular fa-calendar mr-1"></i>' + date + '</span>' +
                  '</p>' +
                '</div>' +
                '<div class="flex gap-1.5 shrink-0">' +
                  '<button type="button" class="edit-btn w-9 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition" data-id="' + escapeAttr(p.id) + '" title="Sửa bài viết" aria-label="Sửa">' +
                    '<i class="fa-solid fa-pen text-xs"></i>' +
                  '</button>' +
                  '<button type="button" class="delete-btn w-9 h-9 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition" data-id="' + escapeAttr(p.id) + '" title="Xóa bài viết" aria-label="Xóa">' +
                    '<i class="fa-solid fa-trash text-xs"></i>' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</li>';
        }).join('');

        recentPostsList.querySelectorAll('.edit-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            editPost(btn.getAttribute('data-id'));
          });
        });
        recentPostsList.querySelectorAll('.delete-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            deletePost(btn.getAttribute('data-id'));
          });
        });

      } catch (err) {
        console.error('[Firestore] Lỗi tải bài viết gần đây:', err);
        recentPostsList.innerHTML =
          '<li class="text-sm text-red-600 py-3 text-center">' +
            '<i class="fa-solid fa-triangle-exclamation mr-2"></i>Không tải được danh sách.' +
          '</li>';
      }
    }

    updateFormByType();
  }

  /* =========================================================
     TRANG THỜI KHÓA BIỂU & KẾT QUẢ THI
     ========================================================= */
  function initIframePage(frameId, reloadBtnId) {
    var frame = document.getElementById(frameId);
    var reloadBtn = document.getElementById(reloadBtnId);
    if (!frame) return;

    if (reloadBtn) {
      reloadBtn.addEventListener('click', function () {
        var currentSrc = frame.src;
        frame.src = 'about:blank';
        setTimeout(function () { frame.src = currentSrc; }, 120);
      });
    }
  }

  /* =========================================================
     INIT
     ========================================================= */
  document.addEventListener('DOMContentLoaded', function () {
    updateCurrentDate();
    updateFooterYear();
    initStickyHeader();
    initMobileMenu();
    initHeroCarousel();
    initAudioPlayer();
    initBackToTop();
    initSmoothAnchorScroll();
    initDocModal();
    loadHomePosts();
    initAdminPage();
    initIframePage('tkbFrame', 'reloadTkbBtn');
    initIframePage('kqtFrame', 'reloadKqtBtn');
  });

})();