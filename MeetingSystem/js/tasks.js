// ============================================================
// TASKS MODULE
// Trường THCS-THPT Trần Trường Sinh
// ============================================================

/**
 * Resolve danh sách UID của assignedTo thành chuỗi tên
 * Hỗ trợ cả format cũ (string uid) và format mới (object map)
 * @param {Object|string} assignedTo
 * @param {string} assignedToNames - Tên đã lưu sẵn (fallback)
 * @param {Object} memberNameMap - Map uid -> name
 * @returns {string} Chuỗi tên, ví dụ: "Nguyễn Văn A, Lê Thị B" hoặc "Tất cả thành viên"
 */
function resolveAssigneeDisplay(assignedTo, assignedToNames, memberNameMap) {
    if (!assignedTo) {
        return assignedToNames || 'Chưa xác định';
    }
    
    if (typeof assignedTo === 'string') {
        if (assignedTo === '__ALL__') {
            return 'Tất cả thành viên';
        }
        return memberNameMap && memberNameMap[assignedTo] 
            ? memberNameMap[assignedTo] 
            : (assignedToNames || assignedTo);
    }
    
    if (typeof assignedTo === 'object') {
        if (assignedTo['__ALL__'] === true) {
            return 'Tất cả thành viên';
        }
        
        const uids = Object.keys(assignedTo).filter(k => assignedTo[k] === true);
        if (uids.length === 0) return assignedToNames || 'Chưa xác định';
        
        const names = uids.map(uid => {
            if (memberNameMap && memberNameMap[uid]) return memberNameMap[uid];
            return uid.substring(0, 8) + '...';
        });
        
        return names.join(', ');
    }
    
    return assignedToNames || 'Chưa xác định';
}

/**
 * Kiểm tra task có được giao cho user không
 * @param {Object} task
 * @param {string} uid
 * @returns {boolean}
 */
function isTaskAssignedTo(task, uid) {
    if (!task.assignedTo) return false;
    
    if (typeof task.assignedTo === 'string') {
        return task.assignedTo === uid || task.assignedTo === '__ALL__';
    }
    
    if (typeof task.assignedTo === 'object') {
        return task.assignedTo[uid] === true || task.assignedTo['__ALL__'] === true;
    }
    
    return false;
}
/**
 * Render tasks page
 * ĐÃ SỬA: Pass canEdit cho renderTaskItem
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
    
    const isAdminUser = role === 'admin';
    const isLeaderOfTeam = role === 'truong_to' || role === 'to_pho' || role === 'nhom_truong';
    
    let accessibleMeetings = [];
    if (isAdminUser) {
        accessibleMeetings = await getAllMeetings();
    } else {
        accessibleMeetings = await getMeetingsForUser(uid, teamId);
    }
    
    // Build map tên thành viên từ tất cả meetings
    const allUids = new Set();
    accessibleMeetings.forEach(m => {
        if (m.memberIds) Object.keys(m.memberIds).forEach(u => allUids.add(u));
    });
    
    const memberNameMap = {};
    for (const memberUid of allUids) {
        try {
            const snap = await db.ref(`users/${memberUid}/displayName`).once('value');
            memberNameMap[memberUid] = snap.val() || memberUid;
        } catch (e) {
            memberNameMap[memberUid] = memberUid;
        }
    }
    
    let allTasks = [];
    for (const meeting of accessibleMeetings) {
        try {
            const tasks = await getTasks(meeting.id);
            tasks.forEach(t => {
                allTasks.push({
                    ...t,
                    meetingId: meeting.id,
                    meetingTitle: meeting.title,
                    meetingCode: meeting.code
                });
            });
        } catch (taskErr) {
            console.warn(`Không đọc được tasks của meeting ${meeting.id}:`, taskErr.message);
        }
    }
    
    // Task của tôi — canEdit = false (không cần nút Sửa ở đây)
    const myTasks = allTasks.filter(t => isTaskAssignedTo(t, uid));
    // Task của người khác — canEdit = true nếu user là leader/admin
    const otherTasks = allTasks.filter(t => !isTaskAssignedTo(t, uid));
    
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
                    ${myTasks.map(t => renderTaskItem(t, false, memberNameMap, false)).join('')}
                `}
            </div>
        </div>
    `;
    
    if (isAdminUser || isLeaderOfTeam) {
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
                        ${otherTasks.map(t => renderTaskItem(t, true, memberNameMap, true)).join('')}
                    `}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

/**
 * Render một task item
 * ĐÃ SỬA: Có nút Sửa cho Ban lãnh đạo/Admin
 * @param {Object} task
 * @param {boolean} showAssignee - Hiển thị cột "Giao cho"
 * @param {Object} memberNameMap - Map uid -> tên hiển thị
 * @param {boolean} canEdit - User có quyền sửa nhiệm vụ không
 * @returns {string} HTML
 */
function renderTaskItem(task, showAssignee = false, memberNameMap = {}, canEdit = false) {
    const statusClass = task.confirmed ? 'confirmed' : 'pending';
    const statusLabel = task.confirmed ? '✅ Đã xác nhận' : '⏳ Chờ xác nhận';
    const deadline = task.deadline ? formatDate(task.deadline) : 'Chưa có hạn';
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.confirmed;
    
    const meetingId = task.meetingId || '';
    const taskId = task.id || '';
    const hasValidIds = meetingId !== '' 
                     && taskId !== '' 
                     && meetingId !== 'undefined' 
                     && taskId !== 'undefined';
    
    const assigneeDisplay = resolveAssigneeDisplay(task.assignedTo, task.assignedToNames, memberNameMap);
    
    // Nút hành động chính
    let actionButtonHtml = '';
    const currentUid = getCurrentUid();
    const isMine = currentUid && isTaskAssignedTo(task, currentUid);
    
    if (!task.confirmed) {
        if (hasValidIds && isMine) {
            actionButtonHtml = `
                <button class="btn-success" 
                        onclick="quickConfirmTask('${meetingId}', '${taskId}')" 
                        style="padding:6px 16px;font-size:13px;">
                    <i class="fas fa-check"></i> Xác nhận nhận nhiệm vụ
                </button>
            `;
        } else if (!isMine) {
            actionButtonHtml = `
                <span style="color:var(--gray-500);font-size:13px;font-style:italic;">
                    <i class="fas fa-info-circle"></i> Nhiệm vụ của người khác
                </span>
            `;
        } else {
            actionButtonHtml = `
                <button class="btn-secondary" 
                        disabled 
                        title="Không xác định được ID cuộc họp hoặc nhiệm vụ"
                        style="padding:6px 16px;font-size:13px;opacity:0.6;cursor:not-allowed;">
                    <i class="fas fa-exclamation-triangle"></i> Thiếu dữ liệu ID
                </button>
            `;
        }
    } else {
        actionButtonHtml = `
            <span style="color:var(--success);font-size:13px;">
                <i class="fas fa-check-circle"></i> Đã xác nhận lúc ${formatDate(task.confirmedAt, true)}
            </span>
        `;
    }
    
    // Nút Sửa (chỉ hiện khi canEdit VÀ chưa confirmed)
    let editButtonHtml = '';
    if (canEdit && !task.confirmed && hasValidIds) {
        editButtonHtml = `
            <button class="btn-secondary" 
                    style="padding:6px 14px;font-size:13px;background:#f59e0b;color:#fff;border:none;font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;border-radius:6px;" 
                    onclick="showEditTask('${meetingId}', '${taskId}')"
                    title="Sửa nhiệm vụ">
                <i class="fas fa-edit"></i> Sửa
            </button>
        `;
    }
    
    let viewMeetingButtonHtml = '';
    if (hasValidIds) {
        viewMeetingButtonHtml = `
            <button class="btn-secondary" 
                    style="padding:6px 14px;font-size:13px;" 
                    onclick="navigateTo('meeting-detail', {id: '${meetingId}'})">
                <i class="fas fa-eye"></i> Xem cuộc họp
            </button>
        `;
    }
    
    return `
        <div class="task-card ${statusClass}" style="${isOverdue ? 'border-left-color:var(--danger);' : ''}">
            <div class="task-title">
                ${escapeHtml(task.title)}
                ${isOverdue ? `<span style="color:var(--danger);font-size:12px;font-weight:400;">⚠️ Quá hạn</span>` : ''}
            </div>
            <div class="task-meta">
                <span><i class="far fa-calendar"></i> Hạn: ${deadline}</span>
                ${showAssignee ? `<span><i class="fas fa-users"></i> Giao cho: <strong>${escapeHtml(assigneeDisplay)}</strong></span>` : ''}
                <span><i class="fas fa-file-alt"></i> ${escapeHtml(task.product || 'Chưa có sản phẩm')}</span>
                <span><i class="fas fa-tag"></i> ${statusLabel}</span>
            </div>
            ${task.description ? `<div style="font-size:14px;color:var(--gray-600);margin-top:4px;">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-actions">
                ${actionButtonHtml}
                ${editButtonHtml}
                ${viewMeetingButtonHtml}
            </div>
        </div>
    `;
}

// ============================================================
// EXPORTS
// ============================================================
window.renderTasks = renderTasks;
window.renderTaskItem = renderTaskItem;
window.resolveAssigneeDisplay = resolveAssigneeDisplay;
window.isTaskAssignedTo = isTaskAssignedTo;