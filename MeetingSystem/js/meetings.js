// ============================================================
// MEETINGS MODULE - Render and manage meetings
// ============================================================

/**
 * Render dashboard
 * @param {HTMLElement} container
 */
async function renderDashboard(container) {
    const uid = getCurrentUid();
    if (!uid) {
        container.innerHTML = `<p>Vui lòng đăng nhập.</p>`;
        return;
    }
    
    const userData = await getCurrentUserData();
    const role = await getCurrentUserRole();
    const teamId = await getCurrentUserTeamId();
    
    let meetings = [];
    if (role === 'admin') {
        meetings = await getAllMeetings();
    } else if (teamId) {
        meetings = await getMeetingsByTeam(teamId);
    }
    
    const draft = meetings.filter(m => m.status === 'DRAFT').length;
    const discussion = meetings.filter(m => m.status === 'DISCUSSION').length;
    const concluded = meetings.filter(m => m.status === 'CONCLUDED' || m.status === 'CONFIRMATION').length;
    const closed = meetings.filter(m => m.status === 'CLOSED').length;
    
    const recent = [...meetings]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5);
    
    let tasks = [];
    if (teamId) {
        const allTasks = await getAllUserTasks(uid);
        tasks = allTasks.filter(t => t.status !== 'CONFIRMED' && t.status !== 'COMPLETED');
    }
    
    let html = `
        <div class="dashboard-stats">
            <div class="stat-card draft">
                <div class="stat-number">${draft}</div>
                <div class="stat-label">📝 Dự thảo</div>
            </div>
            <div class="stat-card discussion">
                <div class="stat-number">${discussion}</div>
                <div class="stat-label">💬 Đang thảo luận</div>
            </div>
            <div class="stat-card concluded">
                <div class="stat-number">${concluded}</div>
                <div class="stat-label">✅ Đã kết luận</div>
            </div>
            <div class="stat-card closed">
                <div class="stat-number">${closed}</div>
                <div class="stat-label">🔒 Đã chốt</div>
            </div>
        </div>
        
        <div class="dashboard-recent">
            <div class="section-card">
                <div class="section-header">
                    <h3>📅 Cuộc họp gần đây</h3>
                    <button class="btn-secondary" onclick="navigateTo('meetings')">
                        Xem tất cả <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="section-body">
                    ${recent.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-calendar-alt"></i>
                            <p>Chưa có cuộc họp nào.</p>
                        </div>
                    ` : `
                        ${recent.map(m => `
                            <div class="meeting-card" onclick="navigateTo('meeting-detail', {id: '${m.id}'})">
                                <div class="meeting-card-header">
                                    <span class="meeting-card-title">${escapeHtml(m.title)}</span>
                                    <span class="meeting-card-code">${escapeHtml(m.code || '')}</span>
                                </div>
                                <div class="meeting-card-body">
                                    <span><i class="far fa-calendar"></i> ${formatDate(m.meetingDate)}</span>
                                    <span><i class="far fa-clock"></i> ${m.meetingTime || '--:--'}</span>
                                    <span><i class="fas fa-users"></i> ${m.memberIds ? Object.keys(m.memberIds).length : 0} thành viên</span>
                                </div>
                                <div class="meeting-card-footer">
                                    ${getStatusBadge(m.status)}
                                    <span style="font-size:13px;color:var(--gray-400);">${formatDate(m.createdAt, true)}</span>
                                </div>
                            </div>
                        `).join('')}
                    `}
                </div>
            </div>
            
            <div class="section-card">
                <div class="section-header">
                    <h3>📋 Nhiệm vụ chưa hoàn thành</h3>
                    <button class="btn-secondary" onclick="navigateTo('tasks')">
                        Xem tất cả <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="section-body">
                    ${tasks.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-check-circle" style="color:var(--success);"></i>
                            <p>Chưa có nhiệm vụ nào chưa hoàn thành.</p>
                        </div>
                    ` : `
                        ${tasks.map(t => `
                            <div class="task-card pending">
                                <div class="task-title">${escapeHtml(t.title)}</div>
                                <div class="task-meta">
                                    Hạn: ${formatDate(t.deadline)} | 
                                    Phân công: ${escapeHtml(t.assignedByName || '')}
                                </div>
                                <div class="task-actions">
                                    <button class="btn-success" onclick="quickConfirmTask('${t.meetingId || ''}', '${t.id}')" style="padding:6px 14px;font-size:13px;">
                                        <i class="fas fa-check"></i> Xác nhận
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    `}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Render meetings list
 * @param {HTMLElement} container
 */
async function renderMeetings(container) {
    const uid = getCurrentUid();
    if (!uid) return;
    
    const role = await getCurrentUserRole();
    const teamId = await getCurrentUserTeamId();
    
    let meetings = [];
    if (role === 'admin') {
        meetings = await getAllMeetings();
    } else if (teamId) {
        meetings = await getMeetingsByTeam(teamId);
    }
    
    meetings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    const canCreate = role === 'truong_to' || role === 'admin' || role === 'thu_ky';
    
    let html = `
        <div class="meetings-toolbar">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="meetingSearch" placeholder="Tìm kiếm cuộc họp..." oninput="filterMeetings()">
            </div>
            ${canCreate ? `
                <button class="btn-primary" onclick="navigateTo('create-meeting')">
                    <i class="fas fa-plus"></i> Tạo cuộc họp
                </button>
            ` : ''}
        </div>
        <div id="meetingsList">
            ${meetings.length === 0 ? `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <h3>Chưa có cuộc họp nào</h3>
                    <p>${canCreate ? 'Hãy tạo cuộc họp đầu tiên.' : 'Chờ tổ trưởng tạo cuộc họp.'}</p>
                </div>
            ` : `
                ${meetings.map(m => `
                    <div class="meeting-card" data-title="${escapeHtml(m.title).toLowerCase()}" data-code="${escapeHtml(m.code || '').toLowerCase()}">
                        <div class="meeting-card-header">
                            <span class="meeting-card-title">${escapeHtml(m.title)}</span>
                            <span class="meeting-card-code">${escapeHtml(m.code || '')}</span>
                        </div>
                        <div class="meeting-card-body">
                            <span><i class="far fa-calendar"></i> ${formatDate(m.meetingDate)}</span>
                            <span><i class="far fa-clock"></i> ${m.meetingTime || '--:--'}</span>
                            <span><i class="fas fa-users"></i> ${m.memberIds ? Object.keys(m.memberIds).length : 0} thành viên</span>
                            <span><i class="fas fa-${m.format === 'truc_tiep' ? 'building' : m.format === 'truc_tuyen' ? 'video' : 'wifi'}"></i> ${getFormatLabel(m.format)}</span>
                        </div>
                        <div class="meeting-card-footer">
                            ${getStatusBadge(m.status)}
                            <button class="btn-secondary" style="padding:6px 16px;font-size:13px;" onclick="navigateTo('meeting-detail', {id: '${m.id}'})">
                                <i class="fas fa-eye"></i> Xem
                            </button>
                        </div>
                    </div>
                `).join('')}
            `}
        </div>
    `;
    
    container.innerHTML = html;
    window._meetingsData = meetings;
}

/**
 * Filter meetings by search input
 */
function filterMeetings() {
    const search = document.getElementById('meetingSearch');
    if (!search) return;
    const query = search.value.toLowerCase().trim();
    const cards = document.querySelectorAll('#meetingsList .meeting-card');
    
    cards.forEach(card => {
        const title = card.dataset.title || '';
        const code = card.dataset.code || '';
        const match = title.includes(query) || code.includes(query);
        card.style.display = match ? '' : 'none';
    });
}

/**
 * Get format label
 * @param {string} format
 * @returns {string}
 */
function getFormatLabel(format) {
    const map = {
        'truc_tiep': 'Trực tiếp',
        'truc_tuyen': 'Trực tuyến',
        'ket_hop': 'Kết hợp',
        'khong_dong_thoi': 'Không đồng thời'
    };
    return map[format] || format;
}

/**
 * Render create meeting form
 * @param {HTMLElement} container
 */
async function renderCreateMeeting(container) {
    const uid = getCurrentUid();
    if (!uid) return;
    
    const userData = await getCurrentUserData();
    const role = await getCurrentUserRole();
    const teamId = await getCurrentUserTeamId();
    
    if (role !== 'truong_to' && role !== 'admin' && role !== 'thu_ky') {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h3>Không có quyền</h3>
                <p>Bạn không có quyền tạo cuộc họp.</p>
            </div>
        `;
        return;
    }
    
    let members = [];
    if (teamId) {
        try {
            const snapshot = await db.ref(`teams/${teamId}/members`).once('value');
            const data = snapshot.val();
            if (data) {
                const memberUids = Object.keys(data);
                for (const memberUid of memberUids) {
                    const userSnapshot = await db.ref(`users/${memberUid}`).once('value');
                    const memberData = userSnapshot.val();
                    if (memberData) {
                        members.push({
                            uid: memberUid,
                            displayName: memberData.displayName || memberData.email || memberUid,
                            role: memberData.role || 'giao_vien'
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Error loading members:', e);
        }
    }
    
    let teamCode = 'TO';
    let teamName = '';
    if (teamId) {
        try {
            const snapshot = await db.ref(`teams/${teamId}`).once('value');
            const data = snapshot.val();
            if (data) {
                teamCode = data.code || 'TO';
                teamName = data.name || '';
            }
        } catch (e) {}
    }
    
    let sequence = 1;
    try {
        const meetings = await getMeetingsByTeam(teamId);
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const monthMeetings = meetings.filter(m => {
            const d = new Date(m.meetingDate);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
        sequence = monthMeetings.length + 1;
    } catch (e) {}
    
    const today = formatDateInput(new Date());
    const defaultDeadline = formatDateInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    
    let html = `
        <div class="section-card">
            <div class="section-header">
                <h3><i class="fas fa-plus-circle"></i> Tạo cuộc họp mới</h3>
            </div>
            <div class="section-body">
                <form id="createMeetingForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tên cuộc họp <span class="required">*</span></label>
                            <input type="text" id="meetingTitle" placeholder="Nhập tên cuộc họp" required>
                        </div>
                        <div class="form-group">
                            <label>Tổ chuyên môn</label>
                            <input type="text" value="${escapeHtml(teamName || teamId)}" disabled style="background:var(--gray-50);">
                            <input type="hidden" id="meetingTeamId" value="${teamId}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Ngày họp <span class="required">*</span></label>
                            <input type="date" id="meetingDate" value="${today}" required>
                        </div>
                        <div class="form-group">
                            <label>Thời gian <span class="required">*</span></label>
                            <input type="time" id="meetingTime" value="14:00" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Hình thức <span class="required">*</span></label>
                            <select id="meetingFormat" required>
                                <option value="truc_tiep">Trực tiếp</option>
                                <option value="truc_tuyen">Trực tuyến</option>
                                <option value="ket_hop">Kết hợp</option>
                                <option value="khong_dong_thoi">Không đồng thời</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Thời hạn góp ý <span class="required">*</span></label>
                            <input type="date" id="discussionDeadline" value="${defaultDeadline}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Người chủ trì</label>
                            <select id="chairmanId">
                                <option value="${uid}" selected>${escapeHtml(userData?.displayName || userData?.email || 'Tôi')}</option>
                                ${members.filter(m => m.uid !== uid).map(m => `
                                    <option value="${m.uid}">${escapeHtml(m.displayName)}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Thư ký</label>
                            <select id="secretaryId">
                                <option value="">-- Chọn --</option>
                                ${members.map(m => `
                                    <option value="${m.uid}">${escapeHtml(m.displayName)}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Thành viên tham dự</label>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0;">
                            ${members.map(m => `
                                <label style="display:flex;align-items:center;gap:6px;font-size:14px;background:var(--gray-50);padding:4px 12px;border-radius:20px;cursor:pointer;">
                                    <input type="checkbox" class="member-checkbox" value="${m.uid}" checked>
                                    ${escapeHtml(m.displayName)}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Nội dung cuộc họp <span class="required">*</span></label>
                        <textarea id="meetingDescription" rows="3" placeholder="Mô tả nội dung chính của cuộc họp..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Mã hồ sơ (tự động)</label>
                        <input type="text" id="meetingCodePreview" value="HS-${teamCode}-${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(sequence).padStart(3,'0')}" disabled style="background:var(--gray-50);">
                        <span class="form-help">Mã sẽ được tạo tự động khi lưu.</span>
                    </div>
                    
                    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Tạo cuộc họp
                        </button>
                        <button type="button" class="btn-secondary" onclick="navigateTo('meetings')">
                            <i class="fas fa-times"></i> Hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    document.getElementById('createMeetingForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const title = document.getElementById('meetingTitle').value.trim();
        const meetingDate = document.getElementById('meetingDate').value;
        const meetingTime = document.getElementById('meetingTime').value;
        const format = document.getElementById('meetingFormat').value;
        const chairmanId = document.getElementById('chairmanId').value;
        const secretaryId = document.getElementById('secretaryId').value;
        const discussionDeadline = document.getElementById('discussionDeadline').value;
        const description = document.getElementById('meetingDescription').value.trim();
        const teamId = document.getElementById('meetingTeamId').value;
        
        if (!title || !meetingDate || !meetingTime || !format || !description) {
            showToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
            return;
        }
        
        const selectedMembers = {};
        document.querySelectorAll('.member-checkbox:checked').forEach(cb => {
            selectedMembers[cb.value] = true;
        });
        
        if (Object.keys(selectedMembers).length === 0) {
            showToast('Vui lòng chọn ít nhất một thành viên', 'error');
            return;
        }
        
        const teamSnapshot = await db.ref(`teams/${teamId}`).once('value');
        const teamData = teamSnapshot.val();
        const teamCode = teamData?.code || 'TO';
        
        const allMeetings = await getMeetingsByTeam(teamId);
        const now = new Date();
        const monthMeetings = allMeetings.filter(m => {
            const d = new Date(m.meetingDate);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const seq = monthMeetings.length + 1;
        const code = generateMeetingCode(teamCode, meetingDate, seq);
        
        const meetingData = {
            title: title,
            code: code,
            teamId: teamId,
            meetingDate: meetingDate,
            meetingTime: meetingTime,
            format: format,
            chairmanId: chairmanId || null,
            secretaryId: secretaryId || null,
            memberIds: selectedMembers,
            discussionDeadline: discussionDeadline,
            description: description,
            status: 'DRAFT'
        };
        
        try {
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';
            
            const meetingId = await createMeeting(meetingData);
            
            if (description) {
                await addMeetingContent(meetingId, {
                    title: 'Nội dung chính',
                    description: description,
                    status: 'DRAFT'
                });
            }
            
            showToast('Đã tạo cuộc họp thành công!', 'success');
            navigateTo('meeting-detail', { id: meetingId });
        } catch (error) {
            console.error('Error creating meeting:', error);
            showToast('Lỗi tạo cuộc họp: ' + error.message, 'error');
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Tạo cuộc họp';
        }
    });
}

/**
 * Get all tasks assigned to a user
 * @param {string} uid
 * @returns {Promise<Array>}
 */
async function getAllUserTasks(uid) {
    try {
        const meetings = await getAllMeetings();
        let allTasks = [];
        for (const meeting of meetings) {
            const tasks = await getTasks(meeting.id, uid);
            tasks.forEach(t => {
                allTasks.push({
                    ...t,
                    meetingId: meeting.id,
                    meetingTitle: meeting.title
                });
            });
        }
        return allTasks;
    } catch (error) {
        console.error('Error getting user tasks:', error);
        return [];
    }
}

/**
 * Quick confirm task from dashboard
 * @param {string} meetingId
 * @param {string} taskId
 */
async function quickConfirmTask(meetingId, taskId) {
    try {
        await confirmTask(meetingId, taskId);
        showToast('Đã xác nhận nhiệm vụ!', 'success');
        navigateTo('dashboard');
    } catch (error) {
        showToast('Lỗi: ' + error.message, 'error');
    }
}

// ============================================================
// MEETING DETAIL RENDERING
// ============================================================

/**
 * Render meeting detail page
 * @param {HTMLElement} container
 * @param {string} meetingId
 */
/**
 * Render meeting detail page (đã fix hiển thị đính kèm)
 * @param {HTMLElement} container
 * @param {string} meetingId
 */
/**
 * Render meeting detail page
 * @param {HTMLElement} container
 * @param {string} meetingId
 */
/**
 * Render meeting detail page
 * @param {HTMLElement} container
 * @param {string} meetingId
 */
/**
 * Render meeting detail page
 * @param {HTMLElement} container
 * @param {string} meetingId
 */
async function renderMeetingDetail(container, meetingId) {
    if (!meetingId) {
        container.innerHTML = `<p>Không tìm thấy cuộc họp.</p>`;
        return;
    }
    
    const uid = getCurrentUid();
    if (!uid) return;
    
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Không tìm thấy cuộc họp</h3></div>`;
        return;
    }
    
    await recordMeetingView(meetingId, uid);
    
    const role = await getCurrentUserRole();
    const isLeader = role === 'truong_to' || role === 'admin';
    const isSecretary = role === 'thu_ky';
    const canEdit = isLeader || isSecretary;
    const isClosed = meeting.status === 'CLOSED';
    
    const contents = await getMeetingContents(meetingId);
    const tasks = await getTasks(meetingId);
    const confirmations = await getConfirmations(meetingId);
    const allDiscussions = await getDiscussions(meetingId);
    
    // === ĐẾM SỐ THẢO LUẬN CHO TỪNG NỘI DUNG (TRƯỚC KHI BUILD HTML) ===
    contents.forEach(c => {
        const liveCount = allDiscussions.filter(d => d.contentId === c.id).length;
        const storedCount = c.discussionCount || 0;
        c.discussionCount = liveCount > 0 ? liveCount : storedCount;
    });
    
    // Đếm số thảo luận chung (không thuộc content nào)
    const generalDiscussionCount = allDiscussions.filter(d => !d.contentId).length;
    
    const memberIds = Object.keys(meeting.memberIds || {});
    
    let chairmanName = 'Chưa xác định';
    let secretaryName = 'Chưa có';
    if (meeting.chairmanId) {
        try {
            const snap = await db.ref(`users/${meeting.chairmanId}/displayName`).once('value');
            chairmanName = snap.val() || meeting.chairmanId;
        } catch (e) {}
    }
    if (meeting.secretaryId) {
        try {
            const snap = await db.ref(`users/${meeting.secretaryId}/displayName`).once('value');
            secretaryName = snap.val() || meeting.secretaryId;
        } catch (e) {}
    }
    
    let html = `
        <div class="meeting-detail-header">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div>
                    <div class="meeting-detail-title">${escapeHtml(meeting.title)}</div>
                    <div style="font-size:14px;color:var(--gray-500);margin-top:2px;">
                        Mã: ${escapeHtml(meeting.code || 'Chưa có')}
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    ${getStatusBadge(meeting.status)}
                    ${isClosed ? `
                        <button class="btn-primary" style="padding:6px 14px;font-size:13px;background:#7c3aed;border:none;font-weight:600;" onclick="exportMeetingMinutes('${meetingId}')">
                            <i class="fas fa-print"></i> Xuất biên bản (PDF)
                        </button>
                    ` : ''}
                    ${!isClosed && canEdit ? `
                        <button class="btn-secondary" style="padding:6px 14px;font-size:13px;" onclick="editMeeting('${meetingId}')">
                            <i class="fas fa-edit"></i> Sửa
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="meeting-detail-meta">
                <span><i class="far fa-calendar"></i> ${formatDate(meeting.meetingDate)}</span>
                <span><i class="far fa-clock"></i> ${meeting.meetingTime || '--:--'}</span>
                <span><i class="fas fa-users"></i> ${memberIds.length} thành viên</span>
                <span><i class="fas fa-${meeting.format === 'truc_tiep' ? 'building' : meeting.format === 'truc_tuyen' ? 'video' : 'wifi'}"></i> ${getFormatLabel(meeting.format)}</span>
                <span><i class="fas fa-user-tie"></i> Chủ trì: ${escapeHtml(chairmanName)}</span>
                <span><i class="fas fa-user"></i> Thư ký: ${escapeHtml(secretaryName)}</span>
                <span><i class="fas fa-comments"></i> ${allDiscussions.length} ý kiến</span>
            </div>
            ${meeting.description ? `<div style="margin-top:12px;padding:12px 16px;background:var(--gray-50);border-radius:6px;font-size:14px;color:var(--gray-600);">${escapeHtml(meeting.description)}</div>` : ''}
            ${isClosed ? `
                <div style="margin-top:10px;padding:8px 14px;background:var(--success-bg);border-radius:6px;font-size:14px;color:#15803d;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-lock"></i>
                    <span>Đã chốt lúc ${formatDate(meeting.closedAt, true)} bởi ${escapeHtml(meeting.closedBy || '')}</span>
                </div>
                ${meeting.forceCloseReason ? `
                    <div style="margin-top:8px;padding:12px 14px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;font-size:14px;color:#92400e;">
                        <div style="font-weight:600;margin-bottom:4px;">⚠️ Hồ sơ được chốt ngoại lệ</div>
                        <div style="line-height:1.6;"><strong>Lý do:</strong> ${escapeHtml(meeting.forceCloseReason)}</div>
                        ${meeting.forceClosedAt ? `<div style="font-size:12px;color:#a16207;margin-top:4px;">${formatDate(meeting.forceClosedAt, true)}</div>` : ''}
                    </div>
                ` : ''}
            ` : ''}
        </div>
        
        <div class="meeting-tabs">
            <button class="meeting-tab active" data-tab="contents">📋 Nội dung</button>
            <button class="meeting-tab" data-tab="discussions">💬 Thảo luận (${allDiscussions.length})</button>
            <button class="meeting-tab" data-tab="tasks">📋 Nhiệm vụ</button>
            <button class="meeting-tab" data-tab="confirmations">✅ Xác nhận</button>
            <button class="meeting-tab" data-tab="logs">📜 Nhật ký</button>
            ${isLeader && !isClosed ? `<button class="meeting-tab" data-tab="admin">⚙️ Quản lý</button>` : ''}
        </div>
        
        <div id="tabContents">
            <div class="meeting-content-panel active" data-panel="contents">
                <div id="contentsContainer">
                    ${contents.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-file-alt"></i>
                            <p>Chưa có nội dung nào.</p>
                            ${canEdit && !isClosed ? `
                                <button class="btn-primary" style="margin-top:8px;" onclick="addContent('${meetingId}')">
                                    <i class="fas fa-plus"></i> Thêm nội dung
                                </button>
                            ` : ''}
                        </div>
                    ` : contents.map((c, idx) => {
                        const attachHtml = renderAttachmentsHTML(c.attachments, {
                            label: '🔗 Tài liệu đính kèm',
                            showFileId: true
                        });
                        const conclusionAttachHtml = renderAttachmentsHTML(c.conclusionAttachments, {
                            label: '🔗 Tài liệu kèm kết luận',
                            showFileId: true
                        });
                        const discussionCount = c.discussionCount || 0;
                        const isDiscussionEmpty = discussionCount === 0;
                        const discussionBadgeColor = isDiscussionEmpty ? 'var(--gray-400)' : 'var(--primary)';
                        const discussionBadgeBg = isDiscussionEmpty ? 'var(--gray-100)' : 'var(--primary-bg)';
                        
                        return `
                            <div class="section-card" style="margin-bottom:12px;">
                                <div class="section-header">
                                    <h3>📌 NỘI DUNG ${String(idx + 1).padStart(2, '0')}</h3>
                                    <div style="display:flex;gap:6px;align-items:center;">
                                        <span class="status-badge ${c.status === 'CONCLUDED' ? 'concluded' : 'draft'}">
                                            ${c.status === 'CONCLUDED' ? '✅ Đã kết luận' : '📝 Dự thảo'}
                                        </span>
                                        ${canEdit && !isClosed ? `
                                            <button class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="editContent('${meetingId}', '${c.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="section-body">
                                    <h4 style="font-size:16px;font-weight:600;">${escapeHtml(c.title)}</h4>
                                    <div style="font-size:14px;color:var(--gray-600);margin-top:4px;white-space:pre-wrap;">${escapeHtml(c.description || '')}</div>
                                    
                                    ${attachHtml}
                                    
                                    ${c.conclusion ? `
                                        <div class="conclusion-box" style="margin-top:12px;">
                                            <div class="conclusion-label">👨‍💼 Kết luận của tổ trưởng</div>
                                            <div class="conclusion-content">${escapeHtml(c.conclusion)}</div>
                                            <div class="conclusion-meta">
                                                ${escapeHtml(c.concludedBy || '')} • ${formatDate(c.concludedAt, true)}
                                            </div>
                                            ${conclusionAttachHtml}
                                        </div>
                                    ` : ''}
                                    
                                    <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                                        <button class="btn-secondary" 
                                            style="padding:6px 14px;font-size:13px;background:${discussionBadgeBg};color:${discussionBadgeColor};border:1px solid ${isDiscussionEmpty ? 'var(--gray-200)' : 'var(--primary-light)'};font-weight:600;" 
                                            onclick="switchTab('discussions');scrollToContent('${c.id}')">
                                            <i class="fas fa-comments"></i> Xem thảo luận (${discussionCount})
                                        </button>
                                        ${isLeader && !isClosed && c.status !== 'CONCLUDED' ? `
                                            <button class="btn-primary" style="padding:6px 14px;font-size:13px;" onclick="concludeContent('${meetingId}', '${c.id}')">
                                                <i class="fas fa-check-double"></i> Kết luận
                                            </button>
                                        ` : ''}
                                        ${isLeader && !isClosed && c.status === 'CONCLUDED' ? `
                                            <button class="btn-secondary" style="padding:6px 14px;font-size:13px;" onclick="editConclusion('${meetingId}', '${c.id}')">
                                                <i class="fas fa-edit"></i> Sửa kết luận
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    ${canEdit && !isClosed ? `
                        <button class="btn-primary" onclick="addContent('${meetingId}')" style="width:100%;justify-content:center;margin-top:4px;">
                            <i class="fas fa-plus"></i> Thêm nội dung
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="meeting-content-panel" data-panel="discussions">
                <div id="discussionsContainer">
                    <p>Đang tải thảo luận...</p>
                </div>
            </div>
            
            <div class="meeting-content-panel" data-panel="tasks">
                <div id="tasksContainer">
                    ${tasks.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-tasks"></i>
                            <p>Chưa có nhiệm vụ nào.</p>
                            ${isLeader && !isClosed ? `
                                <button class="btn-primary" style="margin-top:8px;" onclick="showAssignTask('${meetingId}')">
                                    <i class="fas fa-plus"></i> Phân công nhiệm vụ
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                        ${tasks.map(t => renderTaskItem(t, true)).join('')}
                    `}
                    ${isLeader && !isClosed ? `
                        <button class="btn-primary" onclick="showAssignTask('${meetingId}')" style="margin-top:8px;">
                            <i class="fas fa-plus"></i> Phân công nhiệm vụ
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="meeting-content-panel" data-panel="confirmations">
                <div id="confirmationSection">
                    <p>Đang tải thông tin xác nhận...</p>
                </div>
            </div>
            
            <div class="meeting-content-panel" data-panel="logs">
                <div id="logsContainer">
                    <p>Đang tải nhật ký hoạt động...</p>
                </div>
            </div>
            
            ${isLeader && !isClosed ? `
                <div class="meeting-content-panel" data-panel="admin">
                    <div class="section-card">
                        <div class="section-header">
                            <h3>⚙️ Quản lý cuộc họp</h3>
                        </div>
                        <div class="section-body">
                            ${meeting.status === 'DRAFT' ? `
                                <button class="btn-primary" onclick="updateMeetingStatusAction('${meetingId}', 'DISCUSSION')">
                                    <i class="fas fa-play"></i> Bắt đầu thảo luận
                                </button>
                                <p style="font-size:13px;color:var(--gray-500);margin-top:4px;">Chuyển sang trạng thái ĐANG THẢO LUẬN</p>
                            ` : ''}
                            
                            ${meeting.status === 'DISCUSSION' ? `
                                <button class="btn-primary" onclick="updateMeetingStatusAction('${meetingId}', 'CONCLUDED')">
                                    <i class="fas fa-check-double"></i> Chốt kết luận
                                </button>
                                <p style="font-size:13px;color:var(--gray-500);margin-top:4px;">Chuyển sang trạng thái ĐÃ KẾT LUẬN</p>
                            ` : ''}
                            
                            ${meeting.status === 'CONCLUDED' ? `
                                <button class="btn-primary" onclick="updateMeetingStatusAction('${meetingId}', 'CONFIRMATION')">
                                    <i class="fas fa-check-circle"></i> Chuyển sang chờ xác nhận
                                </button>
                                <p style="font-size:13px;color:var(--gray-500);margin-top:4px;">Yêu cầu thành viên xác nhận hồ sơ</p>
                            ` : ''}
                            
                            ${meeting.status === 'CONFIRMATION' ? `
                                <button class="btn-success" onclick="closeMeeting('${meetingId}')" style="font-weight:600;">
                                    <i class="fas fa-lock"></i> CHỐT HỒ SƠ
                                </button>
                                <p style="font-size:13px;color:var(--gray-500);margin-top:4px;line-height:1.6;">
                                    Bấm để chốt hồ sơ. Nếu còn thành viên chưa xác nhận, hệ thống sẽ yêu cầu bạn nhập <strong>lý do chốt ngoại lệ</strong>.
                                </p>
                            ` : ''}
                            
                            ${meeting.status === 'CLOSED' ? `
                                <p style="color:var(--success);font-weight:600;">✅ Hồ sơ đã được chốt</p>
                                <p style="font-size:13px;color:var(--gray-500);">Không thể chỉnh sửa hồ sơ đã chốt.</p>
                                <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--gray-200);">
                                    <button class="btn-primary" style="background:#7c3aed;font-weight:600;width:100%;justify-content:center;" onclick="exportMeetingMinutes('${meetingId}')">
                                        <i class="fas fa-print"></i> 🖨️ Xuất biên bản cuộc họp (PDF)
                                    </button>
                                    <p style="font-size:12px;color:var(--gray-500);margin-top:6px;text-align:center;">
                                        Biên bản sẽ mở ở tab mới và tự động mở hộp thoại in.
                                    </p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    container.innerHTML = html;
    
    document.querySelectorAll('.meeting-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    await renderDiscussions(meetingId, null, document.getElementById('discussionsContainer'));
    await renderConfirmations(meetingId, document.getElementById('confirmationSection'));
    await renderActivityLog(meetingId, document.getElementById('logsContainer'));
}

/**
 * Switch tab
 * @param {string} tabName
 */
function switchTab(tabName) {
    document.querySelectorAll('.meeting-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabName);
    });
    document.querySelectorAll('.meeting-content-panel').forEach(p => {
        p.classList.toggle('active', p.dataset.panel === tabName);
    });
}

function scrollToContent(contentId) {
    const el = document.querySelector(`[data-content-id="${contentId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// ADD CONTENT - Google Drive URL version
// ============================================================

/**
 * Add content to meeting
 * @param {string} meetingId
 */
async function addContent(meetingId) {
    const formKey = `add_content_${Date.now()}`;
    
    if (!window._pendingLinks) window._pendingLinks = {};
    window._pendingLinks[formKey] = [];
    
    showModal('Thêm nội dung', `
        <div class="form-group">
            <label>Tiêu đề <span class="required">*</span></label>
            <input type="text" id="newContentTitle" placeholder="Nhập tiêu đề">
        </div>
        <div class="form-group">
            <label>Nội dung <span class="required">*</span></label>
            <textarea id="newContentDesc" rows="4" placeholder="Mô tả nội dung..."></textarea>
        </div>
        <div class="form-group">
            <label>🔗 Đính kèm tài liệu (Google Drive)</label>
            <div style="padding:12px;background:var(--gray-50);border-radius:8px;">
                <div id="attachList_${formKey}" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
                    <span style="font-size:13px;color:var(--gray-400);font-style:italic;">Chưa có tài liệu đính kèm.</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                    <input type="text" id="attachUrl_${formKey}" placeholder="https://drive.google.com/file/d/.../view" style="flex:2;min-width:180px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                    <input type="text" id="attachName_${formKey}" placeholder="Tên file" style="flex:1;min-width:100px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                    <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:13px;" onclick="addAttachmentTagFromInput('${formKey}')">
                        <i class="fas fa-plus"></i> Thêm link
                    </button>
                </div>
            </div>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Thêm',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const title = document.getElementById('newContentTitle').value.trim();
                const desc = document.getElementById('newContentDesc').value.trim();
                
                if (!title || !desc) {
                    showToast('Vui lòng nhập đầy đủ thông tin', 'warning');
                    return;
                }
                
                try {
                    const contentId = await addMeetingContent(meetingId, {
                        title: title,
                        description: desc,
                        status: 'DRAFT'
                    });
                    
                    const links = getPendingLinks(formKey);
                    for (const link of links) {
                        try {
                            await addAttachmentByUrl(
                                meetingId,
                                link.url,
                                link.fileName,
                                'application/octet-stream',
                                'CONTENT',
                                contentId,
                                link.fileId
                            );
                        } catch (attError) {
                            console.warn('Lỗi lưu link:', attError);
                        }
                    }
                    
                    showToast('Đã thêm nội dung!', 'success');
                    resetPendingLinks(formKey);
                    close();
                    const container = document.getElementById('pageContainer');
                    await renderMeetingDetail(container, meetingId);
                } catch (error) {
                    showToast('Lỗi: ' + error.message, 'error');
                }
            }
        }
    ]);
}

/**
 * Edit content (chỉ thêm link mới, không sửa/xóa link cũ)
 * @param {string} meetingId
 * @param {string} contentId
 */
async function editContent(meetingId, contentId) {
    const contents = await getMeetingContents(meetingId);
    const content = contents.find(c => c.id === contentId);
    if (!content) return;
    
    const formKey = `edit_content_${contentId}`;
    
    const oldAttachments = content.attachments || {};
    const lockedLinks = Object.values(oldAttachments).map(att => ({
        url: att.url,
        fileId: att.fileId || extractGoogleDriveId(att.url) || '',
        fileName: att.fileName || 'Tài liệu',
        isNew: false
    }));
    
    if (!window._pendingLinks) window._pendingLinks = {};
    window._pendingLinks[formKey] = [...lockedLinks];
    
    showModal('Sửa nội dung', `
        <div class="form-group">
            <label>Tiêu đề <span class="required">*</span></label>
            <input type="text" id="editContentTitle" value="${escapeHtml(content.title)}">
        </div>
        <div class="form-group">
            <label>Nội dung <span class="required">*</span></label>
            <textarea id="editContentDesc" rows="4">${escapeHtml(content.description || '')}</textarea>
        </div>
        <div class="form-group">
            <label>🔗 Tài liệu đính kèm</label>
            <div style="padding:12px;background:var(--gray-50);border-radius:8px;">
                <div id="attachList_${formKey}" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
                    ${renderAttachmentTags(lockedLinks, formKey)}
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px;">
                    <input type="text" id="attachUrl_${formKey}" placeholder="https://drive.google.com/file/d/.../view" style="flex:2;min-width:180px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                    <input type="text" id="attachName_${formKey}" placeholder="Tên file" style="flex:1;min-width:100px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                    <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:13px;" onclick="addAttachmentTagFromInput('${formKey}', true)">
                        <i class="fas fa-plus"></i> Thêm link
                    </button>
                </div>
                <p style="font-size:12px;color:var(--gray-500);margin-top:8px;">
                    <i class="fas fa-lock"></i> Link cũ đã khóa, chỉ có thể thêm link mới.
                </p>
            </div>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Lưu',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const title = document.getElementById('editContentTitle').value.trim();
                const desc = document.getElementById('editContentDesc').value.trim();
                if (!title || !desc) {
                    showToast('Vui lòng nhập đầy đủ thông tin', 'warning');
                    return;
                }
                try {
                    await updateMeetingContent(meetingId, contentId, {
                        title: title,
                        description: desc
                    });
                    
                    const allLinks = getPendingLinks(formKey);
                    const newLinks = allLinks.filter(l => l.isNew === true);
                    for (const link of newLinks) {
                        try {
                            await addAttachmentByUrl(
                                meetingId,
                                link.url,
                                link.fileName,
                                'application/octet-stream',
                                'CONTENT',
                                contentId,
                                link.fileId
                            );
                        } catch (attError) {
                            console.warn('Lỗi lưu link mới:', attError);
                        }
                    }
                    
                    showToast('Đã cập nhật!', 'success');
                    resetPendingLinks(formKey);
                    close();
                    const container = document.getElementById('pageContainer');
                    await renderMeetingDetail(container, meetingId);
                } catch (error) {
                    showToast('Lỗi: ' + error.message, 'error');
                }
            }
        }
    ]);
}

/**
 * Conclude content
 * @param {string} meetingId
 * @param {string} contentId
 */
async function concludeContent(meetingId, contentId) {
    const formKey = `conclude_${contentId}`;
    
    if (!window._pendingLinks) window._pendingLinks = {};
    window._pendingLinks[formKey] = [];
    
    showModal('Kết luận nội dung', `
        <div class="form-group">
            <label>Kết luận <span class="required">*</span></label>
            <textarea id="conclusionInput" rows="4" placeholder="Nhập kết luận..."></textarea>
        </div>
        <div class="form-group">
            <label>🔗 Đính kèm tài liệu (Google Drive, tùy chọn)</label>
            <div style="padding:12px;background:var(--gray-50);border-radius:8px;">
                <div id="attachList_${formKey}" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
                    <span style="font-size:13px;color:var(--gray-400);font-style:italic;">Chưa có tài liệu đính kèm.</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                    <input type="text" id="attachUrl_${formKey}" placeholder="https://drive.google.com/file/d/.../view" style="flex:2;min-width:180px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                    <input type="text" id="attachName_${formKey}" placeholder="Tên file" style="flex:1;min-width:100px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                    <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:13px;" onclick="addAttachmentTagFromInput('${formKey}')">
                        <i class="fas fa-plus"></i> Thêm link
                    </button>
                </div>
            </div>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Kết luận',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const conclusion = document.getElementById('conclusionInput').value.trim();
                if (!conclusion) {
                    showToast('Vui lòng nhập kết luận', 'warning');
                    return;
                }
                try {
                    const uid = getCurrentUid();
                    await updateMeetingContent(meetingId, contentId, {
                        conclusion: conclusion,
                        concludedAt: firebase.database.ServerValue.TIMESTAMP,
                        concludedBy: uid,
                        status: 'CONCLUDED'
                    });
                    
                    const links = getPendingLinks(formKey);
                    for (const link of links) {
                        try {
                            await addAttachmentByUrl(
                                meetingId,
                                link.url,
                                link.fileName,
                                'application/octet-stream',
                                'CONCLUSION',
                                contentId,
                                link.fileId
                            );
                        } catch (attError) {
                            console.warn('Lỗi lưu link kết luận:', attError);
                        }
                    }
                    
                    showToast('Đã kết luận!', 'success');
                    resetPendingLinks(formKey);
                    close();
                    const container = document.getElementById('pageContainer');
                    await renderMeetingDetail(container, meetingId);
                } catch (error) {
                    showToast('Lỗi: ' + error.message, 'error');
                }
            }
        }
    ]);
}

/**
 * Edit conclusion (chỉ thêm link mới, không sửa/xóa link cũ)
 * @param {string} meetingId
 * @param {string} contentId
 */
async function editConclusion(meetingId, contentId) {
    const contents = await getMeetingContents(meetingId);
    const content = contents.find(c => c.id === contentId);
    if (!content || !content.conclusion) return;
    
    const formKey = `edit_conclusion_${contentId}`;
    
    const oldAttachments = content.conclusionAttachments || {};
    const lockedLinks = Object.values(oldAttachments).map(att => ({
        url: att.url,
        fileId: att.fileId || extractGoogleDriveId(att.url) || '',
        fileName: att.fileName || 'Tài liệu',
        isNew: false
    }));
    
    if (!window._pendingLinks) window._pendingLinks = {};
    window._pendingLinks[formKey] = [...lockedLinks];
    
    showModal('Sửa kết luận', `
        <div class="form-group">
            <label>Kết luận</label>
            <textarea id="editConclusionInput" rows="4">${escapeHtml(content.conclusion)}</textarea>
        </div>
        <div class="form-group">
            <label>🔗 Tài liệu đính kèm</label>
            <div style="padding:12px;background:var(--gray-50);border-radius:8px;">
                <div id="attachList_${formKey}" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
                    ${renderAttachmentTags(lockedLinks, formKey)}
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px;">
                    <input type="text" id="attachUrl_${formKey}" placeholder="https://drive.google.com/file/d/.../view" style="flex:2;min-width:180px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                    <input type="text" id="attachName_${formKey}" placeholder="Tên file" style="flex:1;min-width:100px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                    <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:13px;" onclick="addAttachmentTagFromInput('${formKey}', true)">
                        <i class="fas fa-plus"></i> Thêm link
                    </button>
                </div>
                <p style="font-size:12px;color:var(--gray-500);margin-top:8px;">
                    <i class="fas fa-lock"></i> Link cũ đã khóa, chỉ có thể thêm link mới.
                </p>
            </div>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Lưu',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const conclusion = document.getElementById('editConclusionInput').value.trim();
                if (!conclusion) {
                    showToast('Vui lòng nhập kết luận', 'warning');
                    return;
                }
                try {
                    await updateMeetingContent(meetingId, contentId, {
                        conclusion: conclusion,
                        concludedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                    
                    const allLinks = getPendingLinks(formKey);
                    const newLinks = allLinks.filter(l => l.isNew === true);
                    for (const link of newLinks) {
                        try {
                            await addAttachmentByUrl(
                                meetingId,
                                link.url,
                                link.fileName,
                                'application/octet-stream',
                                'CONCLUSION',
                                contentId,
                                link.fileId
                            );
                        } catch (attError) {
                            console.warn('Lỗi lưu link mới:', attError);
                        }
                    }
                    
                    showToast('Đã cập nhật!', 'success');
                    resetPendingLinks(formKey);
                    close();
                    const container = document.getElementById('pageContainer');
                    await renderMeetingDetail(container, meetingId);
                } catch (error) {
                    showToast('Lỗi: ' + error.message, 'error');
                }
            }
        }
    ]);
}

/**
 * Show assign task form
 * @param {string} meetingId
 */
async function showAssignTask(meetingId) {
    const meeting = await getMeeting(meetingId);
    if (!meeting) return;
    
    const memberIds = Object.keys(meeting.memberIds || {});
    let memberOptions = '';
    for (const mid of memberIds) {
        try {
            const snap = await db.ref(`users/${mid}/displayName`).once('value');
            const name = snap.val() || mid;
            memberOptions += `<option value="${mid}">${escapeHtml(name)}</option>`;
        } catch (e) {}
    }
    
    showModal('Phân công nhiệm vụ', `
        <div class="form-group">
            <label>Người thực hiện <span class="required">*</span></label>
            <select id="taskAssignee">
                <option value="">-- Chọn --</option>
                ${memberOptions}
            </select>
        </div>
        <div class="form-group">
            <label>Nội dung nhiệm vụ <span class="required">*</span></label>
            <input type="text" id="taskTitle" placeholder="Mô tả nhiệm vụ">
        </div>
        <div class="form-group">
            <label>Chi tiết</label>
            <textarea id="taskDesc" rows="3" placeholder="Chi tiết nhiệm vụ..."></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Thời hạn <span class="required">*</span></label>
                <input type="date" id="taskDeadline">
            </div>
            <div class="form-group">
                <label>Sản phẩm cần nộp</label>
                <input type="text" id="taskProduct" placeholder="Mô tả sản phẩm">
            </div>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Phân công',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const assignee = document.getElementById('taskAssignee').value;
                const title = document.getElementById('taskTitle').value.trim();
                const deadline = document.getElementById('taskDeadline').value;
                const desc = document.getElementById('taskDesc').value.trim();
                const product = document.getElementById('taskProduct').value.trim();
                
                if (!assignee || !title || !deadline) {
                    showToast('Vui lòng điền đầy đủ thông tin', 'warning');
                    return;
                }
                
                let assigneeName = assignee;
                try {
                    const snap = await db.ref(`users/${assignee}/displayName`).once('value');
                    assigneeName = snap.val() || assignee;
                } catch (e) {}
                
                try {
                    await addTask(meetingId, {
                        assignedTo: assignee,
                        assignedByName: assigneeName,
                        title: title,
                        description: desc,
                        deadline: deadline,
                        product: product || 'Chưa xác định'
                    });
                    showToast('Đã phân công nhiệm vụ!', 'success');
                    close();
                    const container = document.getElementById('pageContainer');
                    await renderMeetingDetail(container, meetingId);
                } catch (error) {
                    showToast('Lỗi: ' + error.message, 'error');
                }
            }
        }
    ]);
}

// ============================================================
// STATUS TRANSITION WITH VALIDATION
// ============================================================

/**
 * Check if a status transition is allowed
 * @param {string} meetingId
 * @param {string} newStatus
 * @returns {Promise<{ok: boolean, reason: string}>}
 */
async function canTransition(meetingId, newStatus) {
    const meeting = await getMeeting(meetingId);
    if (!meeting) return { ok: false, reason: 'Cuộc họp không tồn tại' };
    if (meeting.status === 'CLOSED') return { ok: false, reason: 'Hồ sơ đã chốt' };

    const contents = await getMeetingContents(meetingId);
    const tasks = await getTasks(meetingId);

    switch (newStatus) {
        case 'DISCUSSION':
            if (contents.length === 0) {
                return { ok: false, reason: 'Cần có ít nhất một nội dung để bắt đầu thảo luận' };
            }
            break;
        case 'CONCLUDED':
            if (contents.length === 0) {
                return { ok: false, reason: 'Chưa có nội dung nào để kết luận' };
            }
            if (!contents.every(c => c.status === 'CONCLUDED')) {
                return { ok: false, reason: 'Tất cả nội dung phải được kết luận trước khi chốt kết luận' };
            }
            break;
        case 'CONFIRMATION':
            if (!contents.every(c => c.conclusion)) {
                return { ok: false, reason: 'Tất cả nội dung phải có kết luận' };
            }
            if (tasks.length === 0) {
                return { ok: false, reason: 'Cần phân công ít nhất một nhiệm vụ' };
            }
            break;
        default:
            break;
    }
    return { ok: true };
}

/**
 * Update meeting status with validation
 * @param {string} meetingId
 * @param {string} status
 */
async function updateMeetingStatusAction(meetingId, status) {
    const result = await canTransition(meetingId, status);
    if (!result.ok) {
        showToast('⚠️ ' + result.reason, 'error');
        return;
    }

    const labels = {
        'DISCUSSION': 'chuyển sang trạng thái ĐANG THẢO LUẬN',
        'CONCLUDED': 'chốt kết luận',
        'CONFIRMATION': 'chuyển sang chờ xác nhận'
    };

    showConfirm(
        'Xác nhận chuyển trạng thái',
        `Bạn có chắc chắn muốn ${labels[status] || status}?`,
        async () => {
            try {
                await updateMeetingStatus(meetingId, status);
                showToast(`Đã chuyển sang ${status}`, 'success');
                const container = document.getElementById('pageContainer');
                await renderMeetingDetail(container, meetingId);
            } catch (error) {
                showToast('Lỗi: ' + error.message, 'error');
            }
        }
    );
}

/**
 * Close meeting with validation
 * @param {string} meetingId
 */
/**
 * Chốt hồ sơ cuộc họp
 * - Nếu tất cả thành viên đã xác nhận → chốt bình thường
 * - Nếu còn người chưa xác nhận → yêu cầu nhập lý do chốt ngoại lệ
 * @param {string} meetingId
 */
async function closeMeeting(meetingId) {
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
        showToast('Không tìm thấy cuộc họp', 'error');
        return;
    }
    
    // ============================================
    // BƯỚC 1: Kiểm tra điều kiện CỨNG (không thể chốt ngoại lệ)
    // ============================================
    const contents = await getMeetingContents(meetingId);
    const tasks = await getTasks(meetingId);
    
    const hardErrors = [];
    if (!meeting.title) {
        hardErrors.push('Chưa có thông tin cuộc họp');
    }
    if (!meeting.memberIds || Object.keys(meeting.memberIds).length === 0) {
        hardErrors.push('Chưa có danh sách thành viên');
    }
    if (contents.length === 0) {
        hardErrors.push('Chưa có nội dung nào');
    }
    if (!contents.every(c => c.status === 'CONCLUDED')) {
        hardErrors.push('Có nội dung chưa được kết luận');
    }
    if (tasks.length === 0) {
        hardErrors.push('Chưa phân công nhiệm vụ nào');
    }
    
    if (hardErrors.length > 0) {
        showModal('⚠️ Không thể chốt hồ sơ', `
            <p style="color:var(--danger);margin-bottom:12px;">
                Vui lòng hoàn tất các bước sau trước khi chốt hồ sơ:
            </p>
            <ul style="list-style:none;padding:0;color:var(--danger);">
                ${hardErrors.map(e => `<li style="padding:4px 0;">❌ ${escapeHtml(e)}</li>`).join('')}
            </ul>
            <div style="margin-top:12px;padding:10px 12px;background:var(--gray-50);border-radius:6px;font-size:13px;color:var(--gray-500);">
                💡 Đây là các điều kiện bắt buộc, không thể chốt ngoại lệ.
            </div>
        `, [
            { text: 'Đã hiểu', class: 'btn-secondary', action: 'close' }
        ]);
        return;
    }
    
    // ============================================
    // BƯỚC 2: Kiểm tra xác nhận thành viên
    // ============================================
    const confirmations = await getConfirmations(meetingId);
    const memberIds = Object.keys(meeting.memberIds || {});
    const unconfirmedUids = memberIds.filter(mid => {
        return !confirmations[mid] || confirmations[mid].finalConfirmed !== true;
    });
    
    const uid = getCurrentUid();
    
    // ============================================
    // CASE A: TẤT CẢ ĐÃ XÁC NHẬN → Chốt bình thường
    // ============================================
    if (unconfirmedUids.length === 0) {
        showConfirm(
            '🔒 Chốt hồ sơ',
            `Tất cả ${memberIds.length} thành viên đã xác nhận. Bạn có chắc chắn muốn chốt hồ sơ này? Sau khi chốt, không thể chỉnh sửa nội dung.`,
            async () => {
                try {
                    await updateMeetingStatus(meetingId, 'CLOSED');
                    await logActivity(
                        meetingId, uid, 'CLOSE_MEETING', 'MEETING', meetingId,
                        `Đã chốt hồ sơ (${memberIds.length}/${memberIds.length} đã xác nhận)`
                    );
                    showToast('🎉 Đã chốt hồ sơ thành công!', 'success');
                    const container = document.getElementById('pageContainer');
                    if (container) await renderMeetingDetail(container, meetingId);
                } catch (error) {
                    console.error('Close meeting error:', error);
                    showToast('Lỗi: ' + error.message, 'error');
                }
            },
            'Chốt hồ sơ'
        );
        return;
    }
    
    // ============================================
    // CASE B: CÒN NGƯỜI CHƯA XÁC NHẬN → Yêu cầu lý do chốt ngoại lệ
    // ============================================
    // Lấy tên những người chưa xác nhận
    const unconfirmedNames = [];
    for (const mid of unconfirmedUids) {
        try {
            const snap = await db.ref(`users/${mid}/displayName`).once('value');
            const name = snap.val();
            unconfirmedNames.push(name || 'Giáo viên');
        } catch (e) {
            unconfirmedNames.push('Giáo viên');
        }
    }
    
    const namesListHtml = unconfirmedNames.map(n =>
        `<li style="padding:2px 0;">• ${escapeHtml(n)}</li>`
    ).join('');
    
    showModal(
        '⚠️ Chốt hồ sơ ngoại lệ',
        `
            <div style="padding:14px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;color:#92400e;margin-bottom:16px;">
                <div style="font-weight:600;margin-bottom:8px;">
                    ⚠️ Còn ${unconfirmedUids.length} thành viên chưa xác nhận:
                </div>
                <ul style="list-style:none;padding:0;margin:0;font-size:14px;line-height:1.7;">
                    ${namesListHtml}
                </ul>
            </div>
            <div class="form-group">
                <label style="display:block;font-weight:600;font-size:14px;color:#334155;margin-bottom:6px;">
                    Lý do chốt ngoại lệ <span style="color:#ef4444;">*</span>
                </label>
                <textarea id="forceCloseReason" rows="3"
                    placeholder="Ví dụ: Đ/c A nghỉ ốm dài ngày, đã thông báo qua điện thoại và email; các thành viên còn lại đã đồng ý."
                    style="width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;background:#f8fafc;"></textarea>
                <div style="font-size:12px;color:var(--gray-500);margin-top:6px;line-height:1.6;">
                    💡 Lý do này sẽ được lưu vĩnh viễn vào hồ sơ để đảm bảo tính minh bạch. Tối thiểu 10 ký tự.
                </div>
            </div>
        `,
        [
            { text: 'Hủy', class: 'btn-secondary', action: 'close' },
            {
                text: '🔒 Chốt ngoại lệ',
                class: 'btn-danger',
                action: 'force',
                onClick: async (closeModalFn) => {
                    const reasonEl = document.getElementById('forceCloseReason');
                    const reason = reasonEl ? reasonEl.value.trim() : '';
                    
                    if (!reason) {
                        showToast('Vui lòng nhập lý do chốt ngoại lệ', 'warning');
                        if (reasonEl) reasonEl.focus();
                        return;
                    }
                    
                    if (reason.length < 10) {
                        showToast('Lý do quá ngắn. Vui lòng mô tả rõ hơn (tối thiểu 10 ký tự).', 'warning');
                        if (reasonEl) reasonEl.focus();
                        return;
                    }
                    
                    try {
                        const unconfirmedMap = {};
                        unconfirmedUids.forEach(mid => {
                            unconfirmedMap[mid] = true;
                        });
                        
                        await db.ref(`meetings/${meetingId}`).update({
                            forceCloseReason: reason,
                            forceClosedBy: uid,
                            forceClosedAt: firebase.database.ServerValue.TIMESTAMP,
                            unconfirmedMembers: unconfirmedMap
                        });
                        
                        await updateMeetingStatus(meetingId, 'CLOSED');
                        
                        await logActivity(
                            meetingId, uid, 'CLOSE_MEETING_FORCE', 'MEETING', meetingId,
                            `Đã chốt ngoại lệ (${unconfirmedUids.length} chưa xác nhận). Lý do: ${reason}`
                        );
                        
                        showToast('🎉 Đã chốt hồ sơ (ngoại lệ) thành công!', 'success');
                        
                        if (typeof closeModalFn === 'function') closeModalFn();
                        
                        const container = document.getElementById('pageContainer');
                        if (container) await renderMeetingDetail(container, meetingId);
                    } catch (error) {
                        console.error('Force close error:', error);
                        showToast('Lỗi: ' + error.message, 'error');
                    }
                }
            }
        ]
    );
}

/**
 * Edit meeting
 * @param {string} meetingId
 */
async function editMeeting(meetingId) {
    const meeting = await getMeeting(meetingId);
    if (!meeting) return;
    
    showModal('Sửa cuộc họp', `
        <div class="form-group">
            <label>Tên cuộc họp</label>
            <input type="text" id="editMeetingTitle" value="${escapeHtml(meeting.title)}">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Ngày họp</label>
                <input type="date" id="editMeetingDate" value="${meeting.meetingDate || ''}">
            </div>
            <div class="form-group">
                <label>Thời gian</label>
                <input type="time" id="editMeetingTime" value="${meeting.meetingTime || ''}">
            </div>
        </div>
        <div class="form-group">
            <label>Hình thức</label>
            <select id="editMeetingFormat">
                <option value="truc_tiep" ${meeting.format === 'truc_tiep' ? 'selected' : ''}>Trực tiếp</option>
                <option value="truc_tuyen" ${meeting.format === 'truc_tuyen' ? 'selected' : ''}>Trực tuyến</option>
                <option value="ket_hop" ${meeting.format === 'ket_hop' ? 'selected' : ''}>Kết hợp</option>
                <option value="khong_dong_thoi" ${meeting.format === 'khong_dong_thoi' ? 'selected' : ''}>Không đồng thời</option>
            </select>
        </div>
        <div class="form-group">
            <label>Mô tả</label>
            <textarea id="editMeetingDesc" rows="3">${escapeHtml(meeting.description || '')}</textarea>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Lưu',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const title = document.getElementById('editMeetingTitle').value.trim();
                const meetingDate = document.getElementById('editMeetingDate').value;
                const meetingTime = document.getElementById('editMeetingTime').value;
                const format = document.getElementById('editMeetingFormat').value;
                const description = document.getElementById('editMeetingDesc').value.trim();
                
                if (!title || !meetingDate) {
                    showToast('Vui lòng nhập đầy đủ thông tin', 'warning');
                    return;
                }
                
                try {
                    await updateMeeting(meetingId, {
                        title: title,
                        meetingDate: meetingDate,
                        meetingTime: meetingTime,
                        format: format,
                        description: description
                    });
                    showToast('Đã cập nhật!', 'success');
                    close();
                    const container = document.getElementById('pageContainer');
                    await renderMeetingDetail(container, meetingId);
                } catch (error) {
                    showToast('Lỗi: ' + error.message, 'error');
                }
            }
        }
    ]);
}
/**
 * Xuất biên bản cuộc họp dưới dạng HTML in được (PDF)
 * Mở cửa sổ mới với layout biên bản hành chính chuẩn
 * @param {string} meetingId
 */
/**
 * Xuất biên bản cuộc họp dưới dạng HTML in được (PDF)
 * Mở cửa sổ mới với layout biên bản hành chính chuẩn
 * @param {string} meetingId
 */
/**
 * Xuất biên bản cuộc họp dưới dạng HTML in được (PDF)
 * Mở cửa sổ mới với layout biên bản hành chính chuẩn
 * @param {string} meetingId
 */
async function exportMeetingMinutes(meetingId) {
    const uid = getCurrentUid();
    if (!uid) {
        showToast('Vui lòng đăng nhập', 'error');
        return;
    }
    
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
        showToast('Không tìm thấy cuộc họp', 'error');
        return;
    }
    
    showToast('Đang chuẩn bị biên bản...', 'info', 2000);
    
    const contents = await getMeetingContents(meetingId);
    const tasks = await getTasks(meetingId);
    const confirmations = await getConfirmations(meetingId);
    const allDiscussions = await getDiscussions(meetingId);
    
    let teamName = '';
    let teamCode = '';
    if (meeting.teamId) {
        try {
            const snap = await db.ref(`teams/${meeting.teamId}`).once('value');
            const td = snap.val();
            if (td) {
                teamName = td.name || '';
                teamCode = td.code || '';
            }
        } catch (e) {}
    }
    
    let chairmanName = '';
    let secretaryName = '';
    if (meeting.chairmanId) {
        try {
            const snap = await db.ref(`users/${meeting.chairmanId}/displayName`).once('value');
            chairmanName = snap.val() || '';
        } catch (e) {}
    }
    if (meeting.secretaryId) {
        try {
            const snap = await db.ref(`users/${meeting.secretaryId}/displayName`).once('value');
            secretaryName = snap.val() || '';
        } catch (e) {}
    }
    
    let closedByName = 'Tổ trưởng';
    if (meeting.closedBy) {
        try {
            const snap = await db.ref(`users/${meeting.closedBy}/displayName`).once('value');
            const val = snap.val();
            if (val && val.trim()) {
                closedByName = val;
            }
        } catch (e) {
            closedByName = 'Tổ trưởng';
        }
    }
    
    let concludedByNameMap = {};
    for (const c of contents) {
        if (c.concludedBy && !concludedByNameMap[c.concludedBy]) {
            try {
                const snap = await db.ref(`users/${c.concludedBy}/displayName`).once('value');
                concludedByNameMap[c.concludedBy] = snap.val() || 'Tổ trưởng';
            } catch (e) {
                concludedByNameMap[c.concludedBy] = 'Tổ trưởng';
            }
        }
    }
    
    const memberIds = Object.keys(meeting.memberIds || {});
    const memberList = [];
    for (const mid of memberIds) {
        let name = 'Thành viên';
        let email = '';
        try {
            const snap = await db.ref(`users/${mid}`).once('value');
            const ud = snap.val() || {};
            name = ud.displayName || ud.email || 'Thành viên';
            email = ud.email || '';
        } catch (e) {}
        const conf = confirmations[mid] || {};
        memberList.push({
            uid: mid,
            name: name,
            email: email,
            participated: conf.participated === true,
            finalConfirmed: conf.finalConfirmed === true
        });
    }
    memberList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    const authorNameMap = {};
    memberList.forEach(m => {
        authorNameMap[m.uid] = m.name;
    });
    
    const tasksDetailed = [];
    for (const t of tasks) {
        let assigneeName = t.assignedByName || 'Chưa rõ';
        if (t.assignedTo) {
            try {
                const snap = await db.ref(`users/${t.assignedTo}/displayName`).once('value');
                assigneeName = snap.val() || assigneeName;
            } catch (e) {}
        }
        tasksDetailed.push({ ...t, assigneeName });
    }
    tasksDetailed.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    
    contents.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    
    function toRoman(num) {
        const map = [
            [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
            [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
            [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
        ];
        let result = '';
        for (const item of map) {
            while (num >= item[0]) {
                result += item[1];
                num -= item[0];
            }
        }
        return result;
    }
    
    function formatDateVN(dateVal) {
        if (!dateVal) return '.../.../......';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '.../.../......';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    function formatTimeOnly(dateVal) {
        if (!dateVal) return '... giờ ... phút';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '... giờ ... phút';
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${h} giờ ${m} phút`;
    }
    
    function formatTimeShort(dateVal) {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '';
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }
    
    function formatDateTimeShort(dateVal) {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '';
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${h}:${m} ${day}/${month}/${year}`;
    }
    
    function formatDeadlineVN(dateVal) {
        if (!dateVal) return 'Chưa có';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return dateVal;
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    
    function esc(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }
    
    function getAuthorName(disc) {
        if (disc.authorName && disc.authorName.trim()) {
            return disc.authorName;
        }
        if (disc.authorId && authorNameMap[disc.authorId]) {
            return authorNameMap[disc.authorId];
        }
        if (disc.userId && authorNameMap[disc.userId]) {
            return authorNameMap[disc.userId];
        }
        return 'Giáo viên';
    }
    
    function formatLabel(fmt) {
        const map = {
            'truc_tiep': 'Trực tiếp',
            'truc_tuyen': 'Trực tuyến',
            'ket_hop': 'Kết hợp (trực tiếp + trực tuyến)',
            'khong_dong_thoi': 'Không đồng thời (trao đổi qua hệ thống)'
        };
        return map[fmt] || fmt || 'Không xác định';
    }
    
    function renderAttachListHTML(attachments) {
        if (!attachments || Object.keys(attachments).length === 0) {
            return '';
        }
        const items = Object.values(attachments).map(att => {
            const fileName = att.fileName || att.name || 'Tài liệu';
            const fid = att.fileId || '';
            const desc = att.description || att.note || '';
            const url = att.url || '';
            
            let sub = '';
            if (fid) {
                sub += `<div style="font-size:11pt;color:#475569;font-style:italic;">File ID: <code style="font-family:Consolas,monospace;font-style:normal;background:#f1f5f9;padding:1px 4px;border-radius:3px;">${esc(fid)}</code></div>`;
            }
            if (desc) {
                sub += `<div style="font-size:11pt;color:#334155;margin-top:2px;"><span style="color:#64748b;">Mô tả:</span> ${esc(desc)}</div>`;
            }
            if (url) {
                sub += `<div style="font-size:11pt;margin-top:2px;"><a href="${esc(url)}" style="color:#0369a1;text-decoration:none;border-bottom:1px dotted #0369a1;" target="_blank" rel="noopener noreferrer">🔗 Link truy cập</a></div>`;
            }
            
            return `
                <li style="margin-bottom:8px;line-height:1.5;">
                    <div style="font-weight:bold;font-size:12pt;">📄 ${esc(fileName)}</div>
                    ${sub}
                </li>
            `;
        }).join('');
        
        return `<ul style="margin:6px 0 0 20px;padding:0;list-style:none;">${items}</ul>`;
    }
    
    function renderDiscussionBlock(discussions, blockTitle, colorTheme) {
        if (!discussions || discussions.length === 0) {
            return '';
        }
        
        const theme = colorTheme || 'yellow';
        const themeMap = {
            yellow: { bg: '#fffbeb', border: '#fde68a', titleColor: '#92400e', itemBg: '#fef3c7', itemBorder: '#fcd34d' },
            blue: { bg: '#eff6ff', border: '#bfdbfe', titleColor: '#1e40af', itemBg: '#dbeafe', itemBorder: '#93c5fd' }
        };
        const t = themeMap[theme] || themeMap.yellow;
        
        const rootDiscs = discussions.filter(d => !d.parentId);
        const replyMap = {};
        discussions.forEach(d => {
            if (d.parentId) {
                if (!replyMap[d.parentId]) replyMap[d.parentId] = [];
                replyMap[d.parentId].push(d);
            }
        });
        
        rootDiscs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        
        function renderOne(disc, isReply) {
            const authorName = getAuthorName(disc);
            const timeStr = formatDateTimeShort(disc.createdAt);
            const contentHtml = esc(disc.content || '');
            const isEdited = disc.status === 'EDITED';
            
            const attList = [];
            if (disc.attachments && Object.keys(disc.attachments).length > 0) {
                Object.values(disc.attachments).forEach(att => {
                    const fileName = att.fileName || att.name || 'Tài liệu';
                    const fid = att.fileId || '';
                    const url = att.url || '';
                    if (url) {
                        attList.push(`
                            <div style="font-size:11pt;margin-top:2px;padding-left:12px;">
                                <span style="color:#64748b;">📎</span>
                                <a href="${esc(url)}" style="color:#0369a1;text-decoration:none;border-bottom:1px dotted #0369a1;" target="_blank" rel="noopener noreferrer">
                                    ${esc(fileName)}
                                </a>
                                ${fid ? `<span style="font-size:10pt;color:#64748b;font-style:italic;"> (ID: ${esc(fid.substring(0, 12))}…)</span>` : ''}
                            </div>
                        `);
                    }
                });
            }
            
            const replies = replyMap[disc.id] || [];
            replies.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            
            const repliesHtml = replies.map(r => renderOne(r, true)).join('');
            
            return `
                <div style="margin-bottom:8px;${isReply ? 'margin-left:20px;padding-left:10px;border-left:2px solid #cbd5e1;' : `padding:8px 10px;background:${t.itemBg};border-left:3px solid ${t.itemBorder};border-radius:3px;`}">
                    <div style="font-size:11pt;line-height:1.5;">
                        <strong style="color:#0f172a;">👤 ${esc(authorName)}</strong>
                        <span style="color:#64748b;font-style:italic;"> (${esc(timeStr)})${isEdited ? ' ✏️ đã chỉnh sửa' : ''}${isReply ? ' — phản hồi' : ''}:</span>
                    </div>
                    <div style="font-size:11pt;line-height:1.6;margin-top:2px;color:#1e293b;white-space:pre-wrap;">${contentHtml}</div>
                    ${attList.length > 0 ? `<div style="margin-top:3px;">${attList.join('')}</div>` : ''}
                    ${repliesHtml}
                </div>
            `;
        }
        
        const itemsHtml = rootDiscs.map(d => renderOne(d, false)).join('');
        
        return `
            <div style="margin-top:12px;padding:10px 12px;background:${t.bg};border:1px solid ${t.border};border-radius:4px;">
                <div style="font-weight:bold;font-size:12pt;color:${t.titleColor};margin-bottom:6px;">
                    ${blockTitle} (${discussions.length} ý kiến):
                </div>
                <div>
                    ${itemsHtml}
                </div>
            </div>
        `;
    }
    
    const meetingDateStr = formatDateVN(meeting.meetingDate || meeting.createdAt);
    const closedDateStr = meeting.closedAt ? formatDateVN(meeting.closedAt) : '';
    
    const totalMembers = memberList.length;
    const confirmedCount = memberList.filter(m => m.finalConfirmed).length;
    
    const membersHtml = memberList.map((m, idx) => {
        const status = m.finalConfirmed
            ? '<span style="color:#15803d;">✅ Đã xác nhận</span>'
            : '<span style="color:#b91c1c;">❌ Chưa xác nhận</span>';
        return `
            <tr>
                <td style="text-align:center;padding:4px 8px;border:1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding:4px 8px;border:1px solid #cbd5e1;">${esc(m.name)}</td>
                <td style="padding:4px 8px;border:1px solid #cbd5e1;">${esc(m.email)}</td>
                <td style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;">${status}</td>
            </tr>
        `;
    }).join('');
    
    const contentsHtml = contents.length === 0
        ? `<p style="font-style:italic;color:#64748b;">Chưa có nội dung nào.</p>`
        : contents.map((c, idx) => {
            const romanIdx = toRoman(idx + 1);
            
            const attachHtml = renderAttachListHTML(c.attachments);
            const attachBlock = attachHtml ? `
                <div style="margin-top:8px;">
                    <strong>📎 Tài liệu đính kèm:</strong>
                    ${attachHtml}
                </div>
            ` : '';
            
            const contentDiscussions = allDiscussions.filter(d => d.contentId === c.id);
            const discussionBlock = renderDiscussionBlock(contentDiscussions, '📢 Ý kiến thảo luận', 'yellow');
            
            let conclusionBlock = '';
            if (c.conclusion) {
                const conclusionAttachHtml = renderAttachListHTML(c.conclusionAttachments);
                const conclusionAttachBlock = conclusionAttachHtml ? `
                    <div style="margin-top:8px;">
                        <strong>📎 Tài liệu kèm kết luận:</strong>
                        ${conclusionAttachHtml}
                    </div>
                ` : '';
                
                const concludedByName = c.concludedBy
                    ? (concludedByNameMap[c.concludedBy] || 'Tổ trưởng')
                    : 'Tổ trưởng';
                
                conclusionBlock = `
                    <div style="margin-top:10px;padding:10px 12px;background:#eff6ff;border-left:3px solid #2563eb;">
                        <div style="font-weight:bold;margin-bottom:4px;">➤ Kết luận của tổ trưởng:</div>
                        <div style="white-space:pre-wrap;line-height:1.6;">${esc(c.conclusion)}</div>
                        <div style="font-size:11pt;color:#475569;margin-top:6px;font-style:italic;">
                            Người kết luận: ${esc(concludedByName)} — ${formatDateVN(c.concludedAt)}
                        </div>
                        ${conclusionAttachBlock}
                    </div>
                `;
            } else {
                conclusionBlock = `
                    <div style="margin-top:10px;padding:8px 12px;background:#fef3c7;border-left:3px solid #f59e0b;">
                        <em>Nội dung này chưa có kết luận chính thức.</em>
                    </div>
                `;
            }
            
            return `
                <div style="margin-top:16px;page-break-inside:avoid;">
                    <div style="font-weight:bold;font-size:14px;margin-bottom:6px;">
                        ${romanIdx}. ${esc(c.title)}
                    </div>
                    <div style="margin-left:20px;">
                        <div style="margin-bottom:6px;">
                            <strong>Nội dung trình bày:</strong>
                        </div>
                        <div style="white-space:pre-wrap;line-height:1.6;padding-left:8px;border-left:2px solid #e2e8f0;">
                            ${esc(c.description || '(Không có mô tả)')}
                        </div>
                        ${attachBlock}
                        ${discussionBlock}
                        ${conclusionBlock}
                    </div>
                </div>
            `;
        }).join('');
    
    const generalDiscussions = allDiscussions.filter(d => !d.contentId);
    const generalDiscussionBlock = renderDiscussionBlock(generalDiscussions, '📢 Ý kiến thảo luận chung', 'blue');
    
    let tasksHtml = '';
    if (tasksDetailed.length === 0) {
        tasksHtml = `<p style="font-style:italic;color:#64748b;">Chưa có nhiệm vụ nào được phân công.</p>`;
    } else {
        tasksHtml = `
            <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="border:1px solid #cbd5e1;padding:6px;width:40px;">STT</th>
                        <th style="border:1px solid #cbd5e1;padding:6px;">Họ và tên</th>
                        <th style="border:1px solid #cbd5e1;padding:6px;">Nội dung nhiệm vụ</th>
                        <th style="border:1px solid #cbd5e1;padding:6px;width:90px;">Hạn</th>
                        <th style="border:1px solid #cbd5e1;padding:6px;">Sản phẩm cần nộp</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasksDetailed.map((t, i) => `
                        <tr>
                            <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${i + 1}</td>
                            <td style="border:1px solid #cbd5e1;padding:6px;">${esc(t.assigneeName)}</td>
                            <td style="border:1px solid #cbd5e1;padding:6px;">${esc(t.title || '')}${t.description ? `<br><em style="color:#64748b;font-size:12px;">${esc(t.description)}</em>` : ''}</td>
                            <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${formatDeadlineVN(t.deadline)}</td>
                            <td style="border:1px solid #cbd5e1;padding:6px;">${esc(t.product || 'Chưa xác định')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    let forceCloseBlock = '';
    if (meeting.forceCloseReason) {
        forceCloseBlock = `
            <div style="margin-top:12px;padding:10px 12px;background:#fef3c7;border:1px solid #fcd34d;">
                <strong>⚠️ Ghi chú chốt ngoại lệ:</strong>
                <div style="margin-top:4px;line-height:1.6;">${esc(meeting.forceCloseReason)}</div>
                <div style="font-size:12px;color:#92400e;margin-top:4px;font-style:italic;">
                    (Chốt ngày ${meeting.forceClosedAt ? formatDateVN(meeting.forceClosedAt) : closedDateStr})
                </div>
            </div>
        `;
    }
    
    const meetingDayNum = meeting.meetingDate ? new Date(meeting.meetingDate).getDate() : '...';
    const meetingMonthNum = meeting.meetingDate ? (new Date(meeting.meetingDate).getMonth() + 1) : '...';
    const meetingYearNum = meeting.meetingDate ? new Date(meeting.meetingDate).getFullYear() : '......';
    
    const documentHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8" />
    <title>Biên bản cuộc họp ${esc(meeting.code || '')}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm 15mm 15mm 15mm;
        }
        * { box-sizing: border-box; }
        body {
            font-family: "Times New Roman", "Liberation Serif", serif;
            font-size: 13pt;
            line-height: 1.5;
            color: #000;
            margin: 0;
            padding: 0;
        }
        .page {
            max-width: 210mm;
            margin: 0 auto;
            padding: 10mm 0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            font-size: 12pt;
            gap: 10px;
        }
        .header-left {
            text-align: center;
            flex: 0 0 55%;
            max-width: 55%;
            line-height: 1.4;
        }
        .header-right {
            text-align: center;
            flex: 0 0 45%;
            max-width: 45%;
            line-height: 1.4;
        }
        .header-left strong,
        .header-right strong {
            display: block;
        }
        .header-school {
            white-space: nowrap;
            font-size: 12pt;
        }
        .header-sub {
            font-weight: normal;
            font-size: 11pt;
        }
        .header-divider {
            display: inline-block;
            border-bottom: 1px solid #000;
            width: 60%;
            margin-top: 2px;
        }
        .title {
            text-align: center;
            margin: 24px 0 4px 0;
            font-size: 16pt;
            font-weight: bold;
            letter-spacing: 1px;
        }
        .subtitle {
            text-align: center;
            font-size: 12pt;
            font-style: italic;
            margin-bottom: 20px;
        }
        .meta-table {
            width: 100%;
            font-size: 12pt;
            margin-bottom: 16px;
        }
        .meta-table td {
            vertical-align: top;
            padding: 2px 4px;
        }
        .meta-table td:first-child {
            width: 140px;
        }
        .meta-table td:nth-child(2) {
            width: 8px;
        }
        .section-heading {
            font-weight: bold;
            font-size: 13pt;
            margin: 18px 0 8px 0;
            text-transform: uppercase;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 2px;
        }
        table {
            font-family: "Times New Roman", serif;
        }
        .signature-block {
            margin-top: 30px;
            display: flex;
            justify-content: space-around;
            page-break-inside: avoid;
        }
        .signature-col {
            width: 45%;
            text-align: center;
        }
        .signature-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 4px;
        }
        .signature-note {
            font-size: 11pt;
            font-style: italic;
            margin-bottom: 60px;
        }
        .signature-name {
            font-size: 12pt;
            font-weight: bold;
        }
        .footer-note {
            text-align: center;
            font-size: 10pt;
            color: #475569;
            margin-top: 24px;
            font-style: italic;
        }
        @media print {
            body { font-size: 12pt; }
            .page { padding: 0; }
            .no-print { display: none !important; }
        }
        .print-toolbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #1e293b;
            color: #fff;
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
        }
        .print-toolbar button {
            background: #2563eb;
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin-left: 8px;
        }
        .print-toolbar button:hover { background: #1d4ed8; }
        .print-toolbar button.secondary { background: #64748b; }
        .print-toolbar button.secondary:hover { background: #475569; }
        .page-wrapper { padding-top: 60px; }
        @media print {
            .print-toolbar { display: none !important; }
            .page-wrapper { padding-top: 0 !important; }
        }
    </style>
</head>
<body>

    <div class="print-toolbar no-print">
        <span>📄 <strong>Biên bản cuộc họp</strong> — ${esc(meeting.code || '')}</span>
        <span>
            <button onclick="window.print()">🖨️ In / Lưu PDF</button>
            <button class="secondary" onclick="window.close()">✖ Đóng</button>
        </span>
    </div>

    <div class="page-wrapper">
    <div class="page">

        <div class="header">
            <div class="header-left">
                <strong>SỞ GIÁO DỤC VÀ ĐÀO TẠO VĨNH LONG</strong>
                <strong class="header-school">TRƯỜNG THCS&THPT TRẦN TRƯỜNG SINH</strong>
                <div class="header-sub">TỔ: ${esc(teamName || teamCode || '..................')}</div>
                <div class="header-sub">─────────</div>
                <div style="font-size:11pt;margin-top:4px;">Số: <strong>${esc(meeting.code || '.......')}</strong></div>
            </div>
            <div class="header-right">
                <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
                <div style="font-weight:bold;">Độc lập - Tự do - Hạnh phúc</div>
                <div class="header-sub">─────────</div>
                <div style="font-size:11pt;margin-top:4px;font-style:italic;">
                    Thạnh Phong, ngày ${meetingDayNum} tháng ${meetingMonthNum} năm ${meetingYearNum}
                </div>
            </div>
        </div>

        <div class="title">BIÊN BẢN SINH HOẠT TỔ CHUYÊN MÔN</div>
        <div class="subtitle">(Về việc: ${esc(meeting.title || '')})</div>

        <table class="meta-table">
            <tr>
                <td>Mã hồ sơ:</td>
                <td>:</td>
                <td><strong>${esc(meeting.code || '..............')}</strong></td>
            </tr>
            <tr>
                <td>Thời gian:</td>
                <td>:</td>
                <td>${esc(formatTimeOnly(meeting.createdAt || meeting.meetingDate))} — ngày ${esc(meetingDateStr)}</td>
            </tr>
            <tr>
                <td>Hình thức:</td>
                <td>:</td>
                <td>${esc(formatLabel(meeting.format))}</td>
            </tr>
            <tr>
                <td>Người chủ trì:</td>
                <td>:</td>
                <td>${esc(chairmanName || '........................')}</td>
            </tr>
            <tr>
                <td>Thư ký:</td>
                <td>:</td>
                <td>${esc(secretaryName || '........................')}</td>
            </tr>
        </table>

        <div class="section-heading">I. Thành phần tham dự</div>
        <p style="margin:0 0 6px 0;">
            Tổng số thành viên được triệu tập: <strong>${totalMembers}</strong> người.
            Đã xác nhận: <strong>${confirmedCount}</strong>/${totalMembers} người.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:12pt;">
            <thead>
                <tr style="background:#e2e8f0;">
                    <th style="border:1px solid #cbd5e1;padding:6px;width:40px;">STT</th>
                    <th style="border:1px solid #cbd5e1;padding:6px;">Họ và tên</th>
                    <th style="border:1px solid #cbd5e1;padding:6px;">Email</th>
                    <th style="border:1px solid #cbd5e1;padding:6px;width:130px;">Trạng thái</th>
                </tr>
            </thead>
            <tbody>
                ${membersHtml}
            </tbody>
        </table>

        <div class="section-heading">II. Nội dung cuộc họp</div>
        ${contentsHtml}
        ${generalDiscussionBlock}

        <div class="section-heading">III. Phân công nhiệm vụ</div>
        ${tasksHtml}

        ${forceCloseBlock ? `
            <div class="section-heading">IV. Ghi chú</div>
            ${forceCloseBlock}
        ` : ''}

        <p style="margin-top:20px;font-style:italic;">
            Biên bản kết thúc vào ${esc(formatTimeOnly(meeting.closedAt))} — ngày ${esc(closedDateStr || meetingDateStr)}.
            ${meeting.closedBy ? `Hồ sơ được chốt bởi <strong>${esc(closedByName)}</strong>.` : ''}
        </p>

        <div class="signature-block">
            <div class="signature-col">
                <div class="signature-title">CHỦ TỌA CUỘC HỌP</div>
                <div class="signature-note">(Ký, ghi rõ họ tên)</div>
                <div class="signature-name">${esc(chairmanName || '........................')}</div>
            </div>
            <div class="signature-col">
                <div class="signature-title">THƯ KÝ</div>
                <div class="signature-note">(Ký, ghi rõ họ tên)</div>
                <div class="signature-name">${esc(secretaryName || '........................')}</div>
            </div>
        </div>

        <div class="footer-note">
            — Hết biên bản —
            <br>Trích xuất từ Hệ thống Quản lý Sinh hoạt Tổ chuyên môn lúc ${esc(formatDateVN(Date.now()))} ${esc(formatTimeOnly(Date.now()))}
        </div>

    </div>
    </div>

    <script>
        window.addEventListener('load', function() {
            setTimeout(function() {
                try {
                    window.focus();
                    window.print();
                } catch (e) {
                    console.warn('Không thể tự động in:', e);
                }
            }, 400);
        });
    <\/script>

</body>
</html>
    `.trim();
    
    const win = window.open('', '_blank');
    if (!win) {
        showToast('Trình duyệt đã chặn cửa sổ Pop-up. Vui lòng cho phép Pop-up và thử lại.', 'error', 6000);
        return;
    }
    
    win.document.open();
    win.document.write(documentHtml);
    win.document.close();
    
    try {
        await logActivity(
            meetingId, uid, 'EXPORT_MINUTES', 'MEETING', meetingId,
            `Đã xuất biên bản cuộc họp (${allDiscussions.length} ý kiến thảo luận)`
        );
    } catch (e) {
        console.warn('Không ghi được log export:', e);
    }
    
    showToast('✅ Đã mở biên bản. Nhấn Ctrl+P để lưu PDF.', 'success', 4000);
}

window.exportMeetingMinutes = exportMeetingMinutes;
// ============================================================
// EXPORTS
// ============================================================
window.renderDashboard = renderDashboard;
window.renderMeetings = renderMeetings;
window.renderCreateMeeting = renderCreateMeeting;
window.filterMeetings = filterMeetings;
window.getFormatLabel = getFormatLabel;
window.getAllUserTasks = getAllUserTasks;
window.quickConfirmTask = quickConfirmTask;
window.renderMeetingDetail = renderMeetingDetail;
window.switchTab = switchTab;
window.scrollToContent = scrollToContent;
window.addContent = addContent;
window.editContent = editContent;
window.concludeContent = concludeContent;
window.editConclusion = editConclusion;
window.showAssignTask = showAssignTask;
window.updateMeetingStatusAction = updateMeetingStatusAction;
window.closeMeeting = closeMeeting;
window.editMeeting = editMeeting;
window.canTransition = canTransition;