// ============================================================
// AUTHENTICATION MODULE
// Trường THCS-THPT Trần Trường Sinh
// ============================================================

/**
 * Bảng ánh xạ mã vai trò → nhãn hiển thị tiếng Việt
 * Được dùng thống nhất ở mọi nơi trong hệ thống
 */
const ROLE_LABELS = {
    'admin':        'Quản trị viên',
    'truong_to':    'Tổ trưởng',
    'to_pho':       'Tổ phó',
    'nhom_truong':  'Nhóm trưởng',
    'thu_ky':       'Thư ký',
    'giao_vien':    'Giáo viên'
};

/**
 * Lấy nhãn hiển thị của vai trò
 * @param {string} role - Mã role (admin, truong_to, ...)
 * @returns {string} Nhãn tiếng Việt
 */
function getRoleDisplayLabel(role) {
    if (!role) return 'Chưa xác định';
    return ROLE_LABELS[role] || 'Chưa xác định';
}

/**
 * Kiểm tra user có thuộc Ban Lãnh đạo (Tổ trưởng, Tổ phó, Nhóm trưởng)
 * KHÔNG bao gồm admin — vì admin là cấp cao hơn
 * @returns {Promise<boolean>}
 */
async function isBanLanhDao() {
    const role = await getCurrentUserRole();
    return role === 'truong_to' || role === 'to_pho' || role === 'nhom_truong';
}

/**
 * Kiểm tra user có quyền TẠO cuộc họp
 * Bao gồm: admin, truong_to, to_pho, nhom_truong, thu_ky
 * @returns {Promise<boolean>}
 */
async function canCreateMeeting() {
    const role = await getCurrentUserRole();
    return role === 'admin'
        || role === 'truong_to'
        || role === 'to_pho'
        || role === 'nhom_truong'
        || role === 'thu_ky';
}

/**
 * Kiểm tra user có quyền QUẢN LÝ cuộc họp
 * (chuyển trạng thái, kết luận nội dung, giao việc, chốt hồ sơ)
 * Bao gồm: admin, truong_to, to_pho, nhom_truong
 * KHÔNG bao gồm thu_ky (chỉ soạn thảo)
 * @returns {Promise<boolean>}
 */
async function canManageMeeting() {
    const role = await getCurrentUserRole();
    return role === 'admin'
        || role === 'truong_to'
        || role === 'to_pho'
        || role === 'nhom_truong';
}

/**
 * Kiểm tra user có quyền XEM tất cả hồ sơ (không giới hạn tổ)
 * @returns {Promise<boolean>}
 */
async function canViewAllArchives() {
    const role = await getCurrentUserRole();
    return role === 'admin';
}
/**
 * Check authentication state and redirect if needed
 */
function initAuth() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            const loadingOverlay = document.getElementById('loadingOverlay');
            
            if (user) {
                console.log('User authenticated:', user.uid);
                
                try {
                    const userData = await getCurrentUserData();
                    if (!userData) {
                        console.warn('User not found in database, creating entry...');
                        await db.ref(`users/${user.uid}`).set({
                            email: user.email,
                            displayName: user.displayName || user.email,
                            role: 'giao_vien',
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                    
                    // ============================================================
                    // 1. HIỂN THỊ TÊN NGƯỜI DÙNG
                    // ============================================================
                    const userNameEl = document.getElementById('userName');
                    if (userNameEl) {
                        if (user.displayName) {
                            userNameEl.textContent = user.displayName;
                        } else if (userData && userData.displayName) {
                            userNameEl.textContent = userData.displayName;
                        } else {
                            userNameEl.textContent = user.email || 'Người dùng';
                        }
                    }
                    
                    // ============================================================
                    // 2. HIỂN THỊ VAI TRÒ (đã sửa — hỗ trợ đủ 5 role)
                    // ============================================================
                    const role = await getCurrentUserRole();
                    const roleLabel = getRoleDisplayLabel(role);
                    
                    const userRoleEl = document.getElementById('userRole');
                    if (userRoleEl) {
                        userRoleEl.textContent = roleLabel;
                    }
                    
                    // ============================================================
                    // 3. HIỆN MENU ADMIN NẾU LÀ ADMIN
                    // ============================================================
                    if (role === 'admin') {
                        const adminNav = document.getElementById('adminNav');
                        if (adminNav) adminNav.style.display = 'flex';
                    }
                    
                    // ============================================================
                    // 4. CẬP NHẬT AVATAR
                    // ============================================================
                    const avatarEl = document.getElementById('userAvatar');
                    if (avatarEl) {
                        if (user.photoURL) {
                            avatarEl.innerHTML = `<img src="${user.photoURL}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                        } else {
                            const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
                            avatarEl.textContent = initial;
                        }
                    }
                    
                    // ============================================================
                    // 5. ẨN LOADING OVERLAY
                    // ============================================================
                    if (loadingOverlay) loadingOverlay.classList.add('hidden');
                    
                    resolve(user);
                } catch (error) {
                    console.error('Error loading user data:', error);
                    if (loadingOverlay) loadingOverlay.classList.add('hidden');
                    showToast('Lỗi tải dữ liệu người dùng', 'error');
                    resolve(null);
                }
            } else {
                console.log('User not authenticated');
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
                
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html';
                }
                resolve(null);
            }
        });
    });
}

/**
 * Logout current user
 */
async function logoutUser() {
    try {
        await auth.signOut();
        showToast('Đã đăng xuất', 'success');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Lỗi đăng xuất: ' + error.message, 'error');
    }
}

/**
 * Update user role (admin only)
 * @param {string} uid - User ID
 * @param {string} role - New role
 */
async function updateUserRole(uid, role) {
    if (!await isAdmin()) {
        showToast('Bạn không có quyền thực hiện thao tác này', 'error');
        return false;
    }
    
    try {
        await db.ref(`users/${uid}/role`).set(role);
        showToast('Đã cập nhật vai trò', 'success');
        return true;
    } catch (error) {
        console.error('Error updating role:', error);
        showToast('Lỗi cập nhật vai trò: ' + error.message, 'error');
        return false;
    }
}

/**
 * Update user team (admin only)
 * @param {string} uid - User ID
 * @param {string} teamId - Team ID
 */
async function updateUserTeam(uid, teamId) {
    if (!await isAdmin()) {
        showToast('Bạn không có quyền thực hiện thao tác này', 'error');
        return false;
    }
    
    try {
        await db.ref(`users/${uid}/teamId`).set(teamId);
        showToast('Đã cập nhật tổ chuyên môn', 'success');
        return true;
    } catch (error) {
        console.error('Error updating team:', error);
        showToast('Lỗi cập nhật tổ: ' + error.message, 'error');
        return false;
    }
}

// ============================================================
// CHANGE PASSWORD
// ============================================================

/**
 * Hiển thị modal đổi mật khẩu
 */
function showChangePasswordModal() {
    const user = auth.currentUser;
    if (!user) {
        showToast('Bạn chưa đăng nhập.', 'error');
        return;
    }
    
    const modalHtml = `
        <div class="form-group">
            <label>Email tài khoản</label>
            <input type="text" value="${escapeHtml(user.email || '')}" disabled style="background:var(--gray-100);">
        </div>
        <div class="form-group">
            <label>Mật khẩu mới <span class="required">*</span></label>
            <input type="password" id="newPassword" placeholder="Tối thiểu 6 ký tự" autocomplete="new-password">
        </div>
        <div class="form-group">
            <label>Xác nhận mật khẩu mới <span class="required">*</span></label>
            <input type="password" id="confirmPassword" placeholder="Nhập lại mật khẩu mới" autocomplete="new-password">
        </div>
        <div id="changePasswordError" class="login-error" style="display:none;margin-top:8px;"></div>
        <div style="margin-top:8px;padding:10px 12px;background:#fef3c7;border-radius:6px;font-size:13px;color:#92400e;">
            <i class="fas fa-info-circle"></i>
            Nếu hệ thống yêu cầu xác thực lại, bạn cần đăng xuất và đăng nhập lại trước khi đổi mật khẩu.
        </div>
    `;
    
    showModal('🔑 Đổi mật khẩu', modalHtml, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Lưu thay đổi',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                await handleChangePassword(close);
            }
        }
    ]);
}

/**
 * Xử lý logic đổi mật khẩu
 * @param {Function} closeModal - Hàm đóng modal
 */
async function handleChangePassword(closeModal) {
    const newPasswordEl = document.getElementById('newPassword');
    const confirmPasswordEl = document.getElementById('confirmPassword');
    const errorEl = document.getElementById('changePasswordError');
    
    if (!newPasswordEl || !confirmPasswordEl) return;
    
    const newPassword = newPasswordEl.value;
    const confirmPassword = confirmPasswordEl.value;
    
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    
    if (!newPassword || !confirmPassword) {
        errorEl.textContent = 'Vui lòng nhập đầy đủ cả hai ô mật khẩu.';
        errorEl.style.display = 'block';
        return;
    }
    
    if (newPassword.length < 6) {
        errorEl.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
        errorEl.style.display = 'block';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        errorEl.textContent = 'Mật khẩu xác nhận không khớp với mật khẩu mới.';
        errorEl.style.display = 'block';
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        errorEl.textContent = 'Bạn chưa đăng nhập. Vui lòng đăng nhập lại.';
        errorEl.style.display = 'block';
        return;
    }
    
    const saveBtn = document.querySelector('.modal-footer button[data-action="save"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner"></span> Đang lưu...';
    }
    
    try {
        await user.updatePassword(newPassword);
        
        showToast('✅ Đổi mật khẩu thành công!', 'success', 4000);
        if (closeModal) closeModal();
        
    } catch (error) {
        console.error('Change password error:', error);
        
        let message = 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
        
        switch (error.code) {
            case 'auth/requires-recent-login':
                message = 'Phiên đăng nhập đã quá cũ. Vui lòng ĐĂNG XUẤT và ĐĂNG NHẬP LẠI, sau đó thực hiện đổi mật khẩu.';
                if (closeModal) closeModal();
                setTimeout(() => {
                    showConfirm(
                        '⚠️ Cần đăng nhập lại',
                        'Vì lý do bảo mật, bạn cần đăng xuất và đăng nhập lại để đổi mật khẩu. Bạn có muốn đăng xuất ngay bây giờ không?',
                        () => {
                            logoutUser();
                        },
                        'Đăng xuất ngay'
                    );
                }, 300);
                return;
                
            case 'auth/weak-password':
                message = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn (tối thiểu 6 ký tự).';
                break;
                
            case 'auth/network-request-failed':
                message = 'Lỗi kết nối mạng. Vui lòng kiểm tra Internet và thử lại.';
                break;
                
            case 'auth/too-many-requests':
                message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.';
                break;
                
            default:
                message = error.message || message;
        }
        
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Lưu thay đổi';
        }
    }
}

// ============================================================
// INITIALIZE ON DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.includes('login.html')) {
        initAuth();
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }
});

// ============================================================
// EXPORTS
// ============================================================
window.ROLE_LABELS = ROLE_LABELS;
window.getRoleDisplayLabel = getRoleDisplayLabel;
window.initAuth = initAuth;
window.logoutUser = logoutUser;
window.updateUserRole = updateUserRole;
window.updateUserTeam = updateUserTeam;
window.showChangePasswordModal = showChangePasswordModal;
window.handleChangePassword = handleChangePassword;
window.isBanLanhDao = isBanLanhDao;
window.canCreateMeeting = canCreateMeeting;
window.canManageMeeting = canManageMeeting;
window.canViewAllArchives = canViewAllArchives;