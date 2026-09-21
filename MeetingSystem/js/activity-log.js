// ============================================================
// ACTIVITY LOG MODULE
// ============================================================

/**
 * Log an activity
 * @param {string} meetingId
 * @param {string} userId
 * @param {string} action - Action code
 * @param {string} targetType - MEETING|CONTENT|DISCUSSION|TASK|CONFIRMATION|ATTACHMENT
 * @param {string} targetId
 * @param {string} description
 * @param {Object} metadata - Additional data
 * @returns {Promise<string>} Log ID
 */
async function logActivity(meetingId, userId, action, targetType, targetId, description, metadata = {}) {
    try {
        // Get user name
        let userName = 'Người dùng';
        try {
            const userData = await db.ref(`users/${userId}`).once('value');
            const data = userData.val();
            if (data) {
                userName = data.displayName || data.email || 'Người dùng';
            }
        } catch (e) {
            // Use fallback
        }
        
        const logRef = db.ref(`activityLogs/${meetingId}`).push();
        const logId = logRef.key;
        
        await logRef.set({
            logId: logId,
            meetingId: meetingId,
            userId: userId,
            userName: userName,
            action: action,
            targetType: targetType,
            targetId: targetId,
            description: description,
            metadata: metadata,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        return logId;
    } catch (error) {
        console.error('Error logging activity:', error);
        return null;
    }
}

/**
 * Get activity logs for a meeting
 * @param {string} meetingId
 * @param {number} limit - Max number of logs
 * @returns {Promise<Array>}
 */
async function getActivityLogs(meetingId, limit = 100) {
    try {
        const snapshot = await db.ref(`activityLogs/${meetingId}`)
            .orderByChild('timestamp')
            .limitToLast(limit)
            .once('value');
        const data = snapshot.val();
        if (!data) return [];
        
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        })).reverse(); // Most recent first
    } catch (error) {
        console.error('Error getting activity logs:', error);
        return [];
    }
}

/**
 * Get action icon for activity
 * @param {string} action
 * @returns {string} CSS class
 */
function getActionIcon(action) {
    const icons = {
        'CREATE_MEETING': 'fa-calendar-plus',
        'UPDATE_MEETING': 'fa-edit',
        'STATUS_DRAFT': 'fa-pen',
        'STATUS_DISCUSSION': 'fa-comments',
        'STATUS_CONCLUDED': 'fa-check-double',
        'STATUS_CONFIRMATION': 'fa-check-circle',
        'STATUS_CLOSED': 'fa-lock',
        'ADD_CONTENT': 'fa-plus-circle',
        'UPDATE_CONTENT': 'fa-edit',
        'CREATE_DISCUSSION': 'fa-comment',
        'UPDATE_DISCUSSION': 'fa-pen',
        'UPLOAD_FILE': 'fa-upload',
        'ASSIGN_TASK': 'fa-tasks',
        'CONFIRM_TASK': 'fa-check',
        'CONFIRM_PARTICIPATION': 'fa-user-check',
        'CONFIRM_FINAL': 'fa-file-signature',
        'CLOSE_MEETING': 'fa-lock',
    };
    return icons[action] || 'fa-clock';
}

/**
 * Get action label for activity
 * @param {string} action
 * @returns {string}
 */
function getActionLabel(action) {
    const labels = {
        'CREATE_MEETING': 'Tạo cuộc họp',
        'UPDATE_MEETING': 'Cập nhật cuộc họp',
        'STATUS_DRAFT': 'Tạo dự thảo',
        'STATUS_DISCUSSION': 'Bắt đầu thảo luận',
        'STATUS_CONCLUDED': 'Kết luận',
        'STATUS_CONFIRMATION': 'Chờ xác nhận',
        'STATUS_CLOSED': 'Chốt hồ sơ',
        'ADD_CONTENT': 'Thêm nội dung',
        'UPDATE_CONTENT': 'Cập nhật nội dung',
        'CREATE_DISCUSSION': 'Gửi ý kiến',
        'UPDATE_DISCUSSION': 'Sửa ý kiến',
        'UPLOAD_FILE': 'Tải lên file',
        'ASSIGN_TASK': 'Phân công nhiệm vụ',
        'CONFIRM_TASK': 'Xác nhận nhiệm vụ',
        'CONFIRM_PARTICIPATION': 'Xác nhận tham gia',
        'CONFIRM_FINAL': 'Xác nhận hồ sơ',
        'CLOSE_MEETING': 'Chốt hồ sơ',
    };
    return labels[action] || action;
}

/**
 * Render activity log for a meeting
 * @param {string} meetingId
 * @param {HTMLElement} container
 */
async function renderActivityLog(meetingId, container) {
    try {
        const logs = await getActivityLogs(meetingId);
        
        if (!logs || logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:20px;">
                    <i class="fas fa-history" style="font-size:32px;"></i>
                    <p>Chưa có hoạt động nào.</p>
                </div>
            `;
            return;
        }
        
        let html = `<div class="activity-timeline">`;
        logs.forEach(log => {
            const icon = getActionIcon(log.action);
            const label = getActionLabel(log.action);
            const time = formatDate(log.timestamp, true);
            
            // Determine color class based on action type
            let colorClass = 'created';
            if (log.action.includes('CLOSED') || log.action === 'CLOSE_MEETING') colorClass = 'closed';
            else if (log.action.includes('CONFIRM')) colorClass = 'confirmed';
            else if (log.action.includes('CONCLUSION') || log.action.includes('CONCLUDED')) colorClass = 'concluded';
            else if (log.action.includes('UPDATE') || log.action.includes('EDIT')) colorClass = 'updated';
            
            html += `
                <div class="activity-item">
                    <span class="activity-time">${time}</span>
                    <span class="activity-icon ${colorClass}"><i class="fas ${icon}"></i></span>
                    <span class="activity-text">
                        <strong>${escapeHtml(log.userName)}</strong>
                        <span style="color:var(--gray-500);">${escapeHtml(label)}</span>
                        ${log.description ? `<span style="color:var(--gray-600);">— ${escapeHtml(log.description)}</span>` : ''}
                    </span>
                </div>
            `;
        });
        html += `</div>`;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error rendering activity log:', error);
        container.innerHTML = `<p class="error">Lỗi tải nhật ký hoạt động</p>`;
    }
}

// Export
window.logActivity = logActivity;
window.getActivityLogs = getActivityLogs;
window.renderActivityLog = renderActivityLog;
window.getActionIcon = getActionIcon;
window.getActionLabel = getActionLabel;