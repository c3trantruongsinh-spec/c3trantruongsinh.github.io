// ============================================================
// MAIN APPLICATION - APP.JS
// ============================================================

/**
 * Initialize the application
 * - Kiểm tra auth
 * - Điều hướng trang mặc định
 * - Gắn sự kiện navigation (desktop + mobile)
 * - Gắn nút toggle sidebar
 * - Gắn nút đổi mật khẩu
 * - Cập nhật badge thông báo
 */
async function initApp() {
    // 1. Kiểm tra đăng nhập
    const user = await initAuth();
    if (!user) return;
    
    // 2. Điều hướng trang mặc định
    navigateTo('dashboard');
    
    // 3. Hiển thị ngày hiện tại ở top bar
    const now = new Date();
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        currentDateEl.textContent = now.toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    // 4. Gắn sự kiện cho menu desktop
    setupNavigation();
    
    // 5. Gắn sự kiện cho menu mobile
    setupMobileNavigation();
    
    // 6. Gắn sự kiện cho nút toggle sidebar
    const toggleSidebar = document.getElementById('toggleSidebar');
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('open');
        });
    }
    
    // 7. Gắn sự kiện cho nút Đổi mật khẩu
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            if (typeof showChangePasswordModal === 'function') {
                showChangePasswordModal();
            } else {
                showToast('Chức năng đổi mật khẩu chưa sẵn sàng.', 'error');
            }
        });
    }
    
    // 8. Đóng sidebar khi click ra ngoài (trên mobile)
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('toggleSidebar');
        if (!sidebar || !toggle) return;
        if (window.innerWidth <= 1024 &&
            sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
    
    // 9. Cập nhật badge thông báo chưa đọc
    try {
        if (typeof updateNotificationBadge === 'function') {
            await updateNotificationBadge();
        } else {
            console.warn('updateNotificationBadge function not available yet');
        }
    } catch (error) {
        console.warn('Error updating notification badge:', error);
    }
}

/**
 * Setup desktop navigation
 * Gắn sự kiện click cho tất cả .nav-item[data-page]
 */
function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page === 'create-meeting') {
                hasRole('truong_to').then(isLeader => {
                    if (isLeader || isAdmin()) {
                        navigateTo('create-meeting');
                    } else {
                        showToast('Bạn không có quyền tạo cuộc họp', 'error');
                    }
                });
            } else {
                navigateTo(page);
            }
            // Đóng sidebar trên mobile sau khi chuyển trang
            if (window.innerWidth <= 1024) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.remove('open');
            }
        });
    });
}

/**
 * Setup mobile navigation
 * Gắn sự kiện click cho tất cả .mobile-nav-item[data-page]
 */
function setupMobileNavigation() {
    document.querySelectorAll('.mobile-nav-item[data-page]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page === 'create-meeting') {
                hasRole('truong_to').then(isLeader => {
                    if (isLeader || isAdmin()) {
                        navigateTo('create-meeting');
                    } else {
                        showToast('Bạn không có quyền tạo cuộc họp', 'error');
                    }
                });
            } else {
                navigateTo(page);
            }
        });
    });
}

/**
 * Lấy URL parameter
 * @param {string} name
 * @returns {string|null}
 */
function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

/**
 * Lấy hash parameter (dạng #meeting-xxxx)
 * @returns {string|null}
 */
function getHashParam() {
    const hash = window.location.hash;
    if (hash.startsWith('#meeting-')) {
        return hash.replace('#meeting-', '');
    }
    return null;
}

// ============================================================
// XỬ LÝ URL PARAMS KHI VÀO TRANG
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Nếu URL có ?page=meeting-detail&id=xxx
    const page = getUrlParam('page');
    const id = getUrlParam('id');
    
    if (page === 'meeting-detail' && id) {
        window._pendingPage = { page: 'meeting-detail', params: { id } };
    }
    
    // Nếu URL có hash #meeting-xxx
    const hashId = getHashParam();
    if (hashId) {
        window._pendingPage = { page: 'meeting-detail', params: { id: hashId } };
    }
});

// ============================================================
// OVERRIDE navigateTo ĐỂ XỬ LÝ PENDING PAGE
// ============================================================
// Lưu hàm gốc
const originalNavigateTo = navigateTo;

// Override để xử lý pending page
navigateTo = function(page, params = {}) {
    // Nếu có pending page và đang gọi dashboard lần đầu
    if (window._pendingPage && page === 'dashboard') {
        const pending = window._pendingPage;
        window._pendingPage = null;
        originalNavigateTo(pending.page, pending.params);
        return;
    }
    originalNavigateTo(page, params);
};

// ============================================================
// KHỞI ĐỘNG ỨNG DỤNG
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    initApp().catch(error => {
        console.error('Failed to initialize app:', error);
        showToast('Lỗi khởi tạo ứng dụng', 'error');
    });
});

// ============================================================
// XỬ LÝ HASHCHANGE (khi URL thay đổi hash)
// ============================================================
window.addEventListener('hashchange', function() {
    const hash = window.location.hash;
    if (hash.startsWith('#meeting-')) {
        const id = hash.replace('#meeting-', '');
        navigateTo('meeting-detail', { id });
    }
});

// ============================================================
// EXPORTS (cho debugging nếu cần)
// ============================================================
window.initApp = initApp;
window.setupNavigation = setupNavigation;
window.setupMobileNavigation = setupMobileNavigation;
window.getUrlParam = getUrlParam;
window.getHashParam = getHashParam;