// ============================================================
// NOTIFICATIONS MODULE
// ============================================================

/**
 * Render notifications page
 * @param {HTMLElement} container
 */
async function renderNotifications(container) {
    const uid = getCurrentUid();
    if (!uid) {
        container.innerHTML = `<p>Vui lòng đăng nhập.</p>`;
        return;
    }
    
    try {
        const snapshot = await db.ref(`notifications/${uid}`).once('value');
        const data = snapshot.val();
        let notifications = [];
        if (data) {
            notifications = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            // Sắp xếp mới nhất lên đầu
            notifications.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        
        // Đếm số chưa đọc
        const unreadCount = notifications.filter(n => !n.read).length;
        
        let html = `
            <div class="section-card">
                <div class="section-header">
                    <h3>🔔 Thông báo</h3>
                    <span class="badge" style="background:${unreadCount > 0 ? 'var(--danger)' : 'var(--gray-500)'};color:white;padding:2px 12px;border-radius:20px;">
                        ${unreadCount} chưa đọc
                    </span>
                </div>
                <div class="section-body">
                    ${notifications.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-bell" style="font-size:32px;color:var(--gray-300);"></i>
                            <p>Chưa có thông báo nào.</p>
                        </div>
                    ` : `
                        ${notifications.map(n => `
                            <div class="notification-item" style="padding:12px 16px;border-bottom:1px solid var(--gray-100);${!n.read ? 'background:var(--primary-bg);' : ''} border-radius:4px;margin-bottom:4px;">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                                    <div style="flex:1;">
                                        <div style="font-weight:${!n.read ? '600' : '400'};font-size:15px;">${escapeHtml(n.title)}</div>
                                        <div style="font-size:14px;color:var(--gray-600);margin-top:2px;">${escapeHtml(n.message || '')}</div>
                                        ${n.link ? `
                                            <a href="${n.link}" style="display:inline-block;margin-top:6px;color:var(--primary);font-size:13px;font-weight:500;">
                                                <i class="fas fa-arrow-right"></i> Xem chi tiết
                                            </a>
                                        ` : ''}
                                    </div>
                                    <span style="font-size:12px;color:var(--gray-400);white-space:nowrap;">
                                        ${formatDate(n.createdAt, true)}
                                    </span>
                                </div>
                                ${!n.read ? `
                                    <button class="btn-secondary" style="padding:2px 12px;font-size:12px;margin-top:6px;" onclick="markNotificationRead('${n.id}')">
                                        <i class="fas fa-check"></i> Đánh dấu đã đọc
                                    </button>
                                ` : ''}
                            </div>
                        `).join('')}
                    `}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle" style="color:var(--danger);"></i>
                <h3>Lỗi tải thông báo</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

/**
 * Đánh dấu một thông báo đã đọc
 * @param {string} notificationId
 */
async function markNotificationRead(notificationId) {
    const uid = getCurrentUid();
    if (!uid) {
        showToast('Vui lòng đăng nhập', 'error');
        return;
    }
    try {
        await db.ref(`notifications/${uid}/${notificationId}/read`).set(true);
        showToast('Đã đánh dấu đã đọc', 'success');
        // Tải lại thông báo
        const container = document.getElementById('pageContainer');
        if (container) {
            await renderNotifications(container);
        }
        // Cập nhật badge
        if (typeof updateNotificationBadge === 'function') {
            await updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error marking notification:', error);
        showToast('Lỗi: ' + error.message, 'error');
    }
}

/**
 * Tạo một thông báo mới (gọi từ module khác)
 * @param {string} userId - UID người nhận
 * @param {string} title - Tiêu đề
 * @param {string} message - Nội dung
 * @param {string} type - Loại thông báo
 * @param {string} meetingId - ID cuộc họp liên quan
 * @param {string} link - Link tùy chỉnh
 */
async function createNotification(userId, title, message, type = 'info', meetingId = null, link = null) {
    try {
        const notifRef = db.ref(`notifications/${userId}`).push();
        await notifRef.set({
            title: title,
            message: message,
            type: type,
            meetingId: meetingId,
            link: link || (meetingId ? `/meeting-detail.html?id=${meetingId}` : null),
            read: false,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

/**
 * Đếm số thông báo chưa đọc của user hiện tại
 * @returns {Promise<number>}
 */
async function getUnreadNotificationCount() {
    const uid = getCurrentUid();
    if (!uid) return 0;
    try {
        const snapshot = await db.ref(`notifications/${uid}`).orderByChild('read').equalTo(false).once('value');
        const data = snapshot.val();
        return data ? Object.keys(data).length : 0;
    } catch (error) {
        console.error('Error counting notifications:', error);
        return 0;
    }
}

/**
 * Cập nhật badge số thông báo chưa đọc trên UI
 */
async function updateNotificationBadge() {
    try {
        const count = await getUnreadNotificationCount();
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
    } catch (error) {
        console.warn('Error updating notification badge:', error);
    }
}

// ============================================================
// EXPORTS
// ============================================================
window.renderNotifications = renderNotifications;
window.markNotificationRead = markNotificationRead;
window.createNotification = createNotification;
window.getUnreadNotificationCount = getUnreadNotificationCount;
window.updateNotificationBadge = updateNotificationBadge;