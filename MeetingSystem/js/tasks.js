// ============================================================
// TASKS MODULE
// ============================================================

/**
 * Render tasks page
 * @param {HTMLElement} container
 */
async function renderTasks(container) {
    const uid = getCurrentUid();
    if (!uid) {
        container.innerHTML = `<p>Vui lòng đăng nhập.</p>`;
        return;
    }
    
    const userData = await getCurrentUserData();
    const role = await getCurrentUserRole();
    const teamId = await getCurrentUserTeamId();
    
    let allTasks = [];
    let meetings = [];
    
    if (role === 'admin') {
        meetings = await getAllMeetings();
    } else if (teamId) {
        meetings = await getMeetingsByTeam(teamId);
    }
    
    // Lấy tất cả nhiệm vụ từ các cuộc họp
    for (const meeting of meetings) {
        const tasks = await getTasks(meeting.id);
        tasks.forEach(t => {
            allTasks.push({
                ...t,
                meetingId: meeting.id,
                meetingTitle: meeting.title,
                meetingCode: meeting.code
            });
        });
    }
    
    // Phân loại: nhiệm vụ của tôi vs của người khác
    const myTasks = allTasks.filter(t => t.assignedTo === uid);
    const otherTasks = allTasks.filter(t => t.assignedTo !== uid);
    
    // Sắp xếp theo hạn
    myTasks.sort((a, b) => (a.deadline || '9999-99-99').localeCompare(b.deadline || '9999-99-99'));
    
    let html = `
        <div class="section-card">
            <div class="section-header">
                <h3>📋 Nhiệm vụ của tôi</h3>
                <span class="badge" style="background:var(--primary);color:white;padding:2px 12px;border-radius:20px;">
                    ${myTasks.length}
                </span>
            </div>
            <div class="section-body">
                ${myTasks.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-check-circle" style="color:var(--success);font-size:32px;"></i>
                        <p>Bạn chưa có nhiệm vụ nào.</p>
                    </div>
                ` : `
                    ${myTasks.map(t => renderTaskItem(t)).join('')}
                `}
            </div>
        </div>
    `;
    
    // Hiển thị tất cả nhiệm vụ nếu là tổ trưởng hoặc admin
    if (role === 'truong_to' || role === 'admin') {
        html += `
            <div class="section-card" style="margin-top:16px;">
                <div class="section-header">
                    <h3>📋 Tất cả nhiệm vụ</h3>
                    <span class="badge" style="background:var(--gray-500);color:white;padding:2px 12px;border-radius:20px;">
                        ${otherTasks.length}
                    </span>
                </div>
                <div class="section-body">
                    ${otherTasks.length === 0 ? `
                        <div class="empty-state">
                            <p>Chưa có nhiệm vụ nào được phân công cho người khác.</p>
                        </div>
                    ` : `
                        ${otherTasks.map(t => renderTaskItem(t, true)).join('')}
                    `}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

/**
 * Render một task item
 * @param {Object} task
 * @param {boolean} showAssignee - Hiển thị tên người được phân công
 * @returns {string} HTML
 */
function renderTaskItem(task, showAssignee = false) {
    const statusClass = task.confirmed ? 'confirmed' : 'pending';
    const statusLabel = task.confirmed ? '✅ Đã xác nhận' : '⏳ Chờ xác nhận';
    const deadline = task.deadline ? formatDate(task.deadline) : 'Chưa có hạn';
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.confirmed;
    
    return `
        <div class="task-card ${statusClass}" style="${isOverdue ? 'border-left-color:var(--danger);' : ''}">
            <div class="task-title">
                ${escapeHtml(task.title)}
                ${isOverdue ? `<span style="color:var(--danger);font-size:12px;font-weight:400;">⚠️ Quá hạn</span>` : ''}
            </div>
            <div class="task-meta">
                <span><i class="far fa-calendar"></i> Hạn: ${deadline}</span>
                ${showAssignee ? `<span><i class="fas fa-user"></i> ${escapeHtml(task.assignedByName || 'Chưa xác định')}</span>` : ''}
                <span><i class="fas fa-file-alt"></i> ${escapeHtml(task.product || 'Chưa có sản phẩm')}</span>
                <span><i class="fas fa-tag"></i> ${statusLabel}</span>
            </div>
            ${task.description ? `<div style="font-size:14px;color:var(--gray-600);margin-top:4px;">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-actions">
                ${!task.confirmed ? `
                    <button class="btn-success" onclick="quickConfirmTask('${task.meetingId}', '${task.id}')" style="padding:6px 16px;font-size:13px;">
                        <i class="fas fa-check"></i> Xác nhận nhận nhiệm vụ
                    </button>
                ` : `
                    <span style="color:var(--success);font-size:13px;">
                        <i class="fas fa-check-circle"></i> Đã xác nhận lúc ${formatDate(task.confirmedAt, true)}
                    </span>
                `}
                <button class="btn-secondary" style="padding:6px 14px;font-size:13px;" 
                    onclick="navigateTo('meeting-detail', {id: '${task.meetingId}'})">
                    <i class="fas fa-eye"></i> Xem cuộc họp
                </button>
            </div>
        </div>
    `;
}

// ============================================================
// EXPORTS
// ============================================================
window.renderTasks = renderTasks;
window.renderTaskItem = renderTaskItem;