// ============================================================
// MEETINGS MODULE - Render and manage meetings
// ============================================================

/**
 * Render dashboard
 * @param {HTMLElement} container
 */
/**
 * Render dashboard
 * Đã nâng cấp: hiển thị cả cuộc họp mà user là khách mời
 * @param {HTMLElement} container
 */
/**
 * Render dashboard
 * Đã nâng cấp: hiển thị nút tắt "Tạo cuộc họp" cho Ban lãnh đạo (5 role)
 * Đã nâng cấp: hiển thị cả cuộc họp mà user là khách mời
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
    } else {
        meetings = await getMeetingsForUser(uid, teamId);
    }
    
    // Sử dụng helper canCreateMeeting() để kiểm tra quyền tạo cuộc họp
    const canCreate = await canCreateMeeting();
    
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
        ${canCreate ? `
            <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
                <button class="btn-primary" style="padding:10px 20px;font-weight:600;" onclick="navigateTo('create-meeting')">
                    <i class="fas fa-plus"></i> Tạo cuộc họp mới
                </button>
            </div>
        ` : ''}
        
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
                            ${canCreate ? `
                                <button class="btn-primary" style="margin-top:12px;" onclick="navigateTo('create-meeting')">
                                    <i class="fas fa-plus"></i> Tạo cuộc họp đầu tiên
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                        ${recent.map(m => {
                            const isGuest = teamId && m.teamId && m.teamId !== teamId && m.memberIds && m.memberIds[uid];
                            const guestBadge = isGuest
                                ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#fef3c7;color:#92400e;border-radius:10px;font-size:11px;font-weight:600;">🎫 Khách mời</span>`
                                : '';
                            return `
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
                                        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                                            ${getStatusBadge(m.status)}
                                            ${guestBadge}
                                        </div>
                                        <span style="font-size:13px;color:var(--gray-400);">${formatDate(m.createdAt, true)}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
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
/**
 * Render meetings list
 * Đã nâng cấp: hiển thị cả cuộc họp mà user là KHÁCH MỜI (khác tổ)
 * @param {HTMLElement} container
 */
/**
 * Render meetings list
 * Đã nâng cấp: dùng canCreateMeeting() để hỗ trợ đủ 5 role (admin, truong_to, to_pho, nhom_truong, thu_ky)
 * Đã nâng cấp: hiển thị cả cuộc họp mà user là KHÁCH MỜI (khác tổ)
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
    } else {
        meetings = await getMeetingsForUser(uid, teamId);
    }
    
    meetings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    // Sử dụng helper canCreateMeeting() từ auth.js để kiểm tra quyền
    const canCreate = await canCreateMeeting();
    
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
                    <p>${canCreate ? 'Hãy tạo cuộc họp đầu tiên.' : 'Chờ Ban lãnh đạo tổ tạo cuộc họp.'}</p>
                    ${canCreate ? `
                        <button class="btn-primary" style="margin-top:12px;" onclick="navigateTo('create-meeting')">
                            <i class="fas fa-plus"></i> Tạo cuộc họp đầu tiên
                        </button>
                    ` : ''}
                </div>
            ` : `
                ${meetings.map(m => {
                    const isGuest = teamId && m.teamId && m.teamId !== teamId && m.memberIds && m.memberIds[uid];
                    const guestBadge = isGuest
                        ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#fef3c7;color:#92400e;border-radius:10px;font-size:11px;font-weight:600;">🎫 Khách mời</span>`
                        : '';
                    
                    return `
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
                                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                                    ${getStatusBadge(m.status)}
                                    ${guestBadge}
                                </div>
                                <button class="btn-secondary" style="padding:6px 16px;font-size:13px;" onclick="navigateTo('meeting-detail', {id: '${m.id}'})">
                                    <i class="fas fa-eye"></i> Xem
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
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
 * Đã nâng cấp: Đặc quyền Admin + Giao diện khách mời CSS Grid
 * @param {HTMLElement} container
 */

async function renderCreateMeeting(container) {
    const uid = getCurrentUid();
    if (!uid) return;
    const userData = await getCurrentUserData();
    const role = await getCurrentUserRole();
    const teamId = await getCurrentUserTeamId();

    const canCreate = await canCreateMeeting();
    if (!canCreate) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h3>Không có quyền</h3>
                <p>Bạn không có quyền tạo cuộc họp.</p>
            </div>
        `;
        return;
    }

    // ============================================================
    // 1. LẤY DATA TẤT CẢ CÁC TỔ
    // ============================================================
    const teamsSnap = await db.ref('teams').once('value');
    const teamsData = teamsSnap.val() || {};
    const teamNameMap = {};
    Object.keys(teamsData).forEach(tid => {
        teamNameMap[tid] = teamsData[tid].name || tid;
    });

    // ============================================================
    // 2. PHÂN LOẠI THÀNH VIÊN VÀ KHÁCH MỜI
    // ============================================================
    let ownTeamMembers = [];
    let otherTeamMembers = [];

    try {
        const allUsersSnap = await db.ref('users').once('value');
        const allUsers = allUsersSnap.val() || {};

        Object.keys(allUsers).forEach(otherUid => {
            const u = allUsers[otherUid];
            if (!u) return;

            if (role === 'admin') {
                if (otherUid !== uid) {
                    otherTeamMembers.push({
                        uid: otherUid,
                        displayName: u.displayName || u.email || otherUid,
                        email: u.email || '',
                        role: u.role || 'giao_vien',
                        teamId: u.teamId || '',
                        teamName: u.teamId ? (teamNameMap[u.teamId] || u.teamId) : 'Chưa phân tổ'
                    });
                }
            } else {
                if (u.teamId === teamId) {
                    ownTeamMembers.push({
                        uid: otherUid,
                        displayName: u.displayName || u.email || otherUid,
                        email: u.email || '',
                        role: u.role || 'giao_vien',
                        teamId: teamId
                    });
                } else if (otherUid !== uid) {
                    otherTeamMembers.push({
                        uid: otherUid,
                        displayName: u.displayName || u.email || otherUid,
                        email: u.email || '',
                        role: u.role || 'giao_vien',
                        teamId: u.teamId || '',
                        teamName: u.teamId ? (teamNameMap[u.teamId] || u.teamId) : 'Chưa phân tổ'
                    });
                }
            }
        });

        otherTeamMembers.sort((a, b) => {
            const t = (a.teamName || '').localeCompare(b.teamName || '');
            if (t !== 0) return t;
            return (a.displayName || '').localeCompare(b.displayName || '');
        });
    } catch (e) {
        console.error('Error loading members:', e);
    }

    // ============================================================
    // 3. LOGIC HIỂN THỊ TỔ CHUYÊN MÔN (ĐẶC QUYỀN ADMIN)
    // ============================================================
    let teamSelectorHtml = '';
    
    if (role === 'admin') {
        let options = `<option value="TOAN_TRUONG">🏫 Cuộc họp Toàn trường</option>`;
        Object.keys(teamsData).forEach(tid => {
            options += `<option value="${tid}">Tổ: ${teamsData[tid].name}</option>`;
        });
        teamSelectorHtml = `
            <select id="meetingTeamId" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                ${options}
            </select>
            <span class="form-help">Quản trị viên có thể chọn quy mô họp</span>
        `;
    } else {
        teamSelectorHtml = `
            <input type="text" value="${escapeHtml(teamNameMap[teamId] || teamId)}" disabled style="background:var(--gray-50); width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
            <input type="hidden" id="meetingTeamId" value="${teamId}">
        `;
    }

    let sequence = 1;
    const today = formatDateInput(new Date());
    const defaultDeadline = formatDateInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    // ============================================================
    // 4. BUILD HTML
    // ============================================================
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
                        ${teamSelectorHtml}
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
                            ${ownTeamMembers.filter(m => m.uid !== uid).map(m => `
                                <option value="${m.uid}">${escapeHtml(m.displayName)}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Thư ký</label>
                        <select id="secretaryId">
                            <option value="">-- Chọn --</option>
                            ${ownTeamMembers.map(m => `
                                <option value="${m.uid}">${escapeHtml(m.displayName)}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>👥 Thành viên tổ chuyên môn (mặc định)</label>
                    
                    <div style="display:flex;gap:6px;margin-bottom:6px;">
                        <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="toggleAllMembers(true)">
                            <i class="fas fa-check-double"></i> Chọn tất cả
                        </button>
                        <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="toggleAllMembers(false)">
                            <i class="fas fa-times"></i> Bỏ chọn
                        </button>
                    </div>

                    <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0;">
                        ${ownTeamMembers.length === 0 ? `
                            <span style="color:var(--gray-500);font-style:italic;font-size:14px;">Chưa có thành viên trong tổ.</span>
                        ` : ownTeamMembers.map(m => `
                            <label style="display:flex;align-items:center;gap:6px;font-size:14px;background:var(--gray-50);padding:4px 12px;border-radius:20px;cursor:pointer;">
                                <input type="checkbox" class="member-checkbox" value="${m.uid}" checked>
                                ${escapeHtml(m.displayName)}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="form-group" style="margin-top:8px;">
                    <label style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span>🎫 Khách mời tham dự (Tổ khác)</span>
                        <span style="font-size:12px;color:var(--gray-500);font-weight:400;">
                            (${otherTeamMembers.length} giáo viên khả dụng)
                        </span>
                    </label>
                    
                    <div style="display:flex;gap:6px;margin-bottom:6px;">
                        <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="toggleAllGuests(true)">
                            <i class="fas fa-check-double"></i> Chọn tất cả
                        </button>
                        <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="toggleAllGuests(false)">
                            <i class="fas fa-times"></i> Bỏ chọn
                        </button>
                    </div>

                    <div id="guestListBox" style="max-height:250px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:8px; padding:8px; background:#f8fafc;">
                        ${otherTeamMembers.length === 0 ? `
                            <div style="padding:12px;text-align:center;color:#64748b;font-style:italic;font-size:14px;">
                                Không có giáo viên nào khả dụng.
                            </div>
                        ` : otherTeamMembers.map(m => `
                            <label style="display:grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; padding:10px 12px; border-radius:6px; cursor:pointer; background:#ffffff; margin-bottom:6px; border:1px solid #e2e8f0; width: 100%; box-sizing: border-box; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: all 0.2s;">
                                <input type="checkbox" class="guest-checkbox" value="${m.uid}" style="width:16px; height:16px; margin:0; cursor:pointer;">
                                <div style="display:flex; flex-direction:column; overflow:hidden;">
                                    <div style="font-weight:600; font-size:14px; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                        ${escapeHtml(m.displayName)}
                                    </div>
                                    <div style="font-size:12px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">
                                        ${escapeHtml(m.email)}${m.teamName ? ` <span style="color:#0284c7; font-weight:500;">• ${escapeHtml(m.teamName)}</span>` : ''}
                                    </div>
                                </div>
                                <span class="role-badge ${m.role}" style="font-size:11px; white-space:nowrap; flex-shrink:0;">${escapeHtml(getRoleLabelForMeeting(m.role))}</span>
                            </label>
                        `).join('')}
                    </div>
                    <span class="form-help" style="display:block;margin-top:6px;">
                        💡 Khách mời sẽ thấy cuộc họp này trong danh sách của họ, dù khác tổ chuyên môn.
                    </span>
                </div>

                <div class="form-group">
                    <label>Nội dung cuộc họp <span class="required">*</span></label>
                    <textarea id="meetingDescription" rows="3" placeholder="Mô tả nội dung chính của cuộc họp..." required></textarea>
                </div>

                <div class="form-group">
                    <label>Mã hồ sơ (tự động)</label>
                    <input type="text" id="meetingCodePreview" value="Được tạo tự động sau khi lưu" disabled style="background:var(--gray-50); font-style: italic;">
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

    // ============================================================
    // 5. XỬ LÝ SUBMIT FORM
    // ============================================================
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
        const selectedTeamId = document.getElementById('meetingTeamId').value;

        if (!title || !meetingDate || !meetingTime || !format || !description) {
            showToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
            return;
        }

        // ===== GỘP THÀNH VIÊN TỔ MÌNH + KHÁCH MỜI =====
        const selectedMembers = {};
        document.querySelectorAll('.member-checkbox:checked').forEach(cb => {
            selectedMembers[cb.value] = true;
        });

        let guestCount = 0;
        document.querySelectorAll('.guest-checkbox:checked').forEach(cb => {
            selectedMembers[cb.value] = true;
            guestCount++;
        });

        if (Object.keys(selectedMembers).length === 0) {
            showToast('Vui lòng chọn ít nhất một thành viên hoặc khách mời', 'error');
            return;
        }

        // ===== XỬ LÝ TẠO MÃ HỒ SƠ =====
        let teamCodeForCode = 'TRUONG'; // Mặc định nếu là họp Toàn trường
        let sequence = 1;

        if (selectedTeamId !== 'TOAN_TRUONG') {
            const teamSnapshot = await db.ref(`teams/${selectedTeamId}`).once('value');
            const teamData = teamSnapshot.val();
            teamCodeForCode = teamData?.code || 'TO';
            
            const allMeetings = await getMeetingsByTeam(selectedTeamId);
            const now = new Date();
            const monthMeetings = allMeetings.filter(m => {
                const d = new Date(m.meetingDate);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            sequence = monthMeetings.length + 1;
        } else {
            // Nếu là họp toàn trường, đếm tổng số cuộc họp toàn trường
            const allMeetingsSnap = await db.ref('meetings').orderByChild('teamId').equalTo('TOAN_TRUONG').once('value');
            if (allMeetingsSnap.exists()) {
                sequence = Object.keys(allMeetingsSnap.val()).length + 1;
            }
        }

        const code = generateMeetingCode(teamCodeForCode, meetingDate, sequence);

        const meetingData = {
            title: title,
            code: code,
            teamId: selectedTeamId,
            meetingDate: meetingDate,
            meetingTime: meetingTime,
            format: format,
            chairmanId: chairmanId || null,
            secretaryId: secretaryId || null,
            memberIds: selectedMembers,
            guestCount: guestCount,
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

            const guestMsg = guestCount > 0 ? ` (có ${guestCount} khách mời)` : '';
            showToast('Đã tạo cuộc họp thành công!' + guestMsg, 'success');
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
 * Hàm phụ: chọn/bỏ chọn tất cả khách mời
 * @param {boolean} checked
 */
function toggleAllGuests(checked) {
    document.querySelectorAll('.guest-checkbox').forEach(cb => {
        cb.checked = checked;
    });
}

/**
 * Hàm phụ: lấy nhãn vai trò (dùng trong form create)
 * @param {string} role
 * @returns {string}
 */
function getRoleLabelForMeeting(role) {
    const map = {
        'admin': 'Admin',
        'truong_to': 'Tổ trưởng',
        'thu_ky': 'Thư ký',
        'giao_vien': 'Giáo viên'
    };
    return map[role] || 'Giáo viên';
}

// Export
window.toggleAllGuests = toggleAllGuests;
window.getRoleLabelForMeeting = getRoleLabelForMeeting;

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
/**
 * Quick confirm task từ Dashboard hoặc Tasks page
 * Đã sửa: VALIDATION chống undefined + refresh trang hiện tại đúng cách
 * @param {string} meetingId
 * @param {string} taskId
 */
async function quickConfirmTask(meetingId, taskId) {
    // ============================================================
    // VALIDATION ĐẦU VÀO
    // ============================================================
    if (!meetingId 
        || meetingId === 'undefined' 
        || meetingId === 'null' 
        || meetingId === '') {
        console.error('quickConfirmTask: meetingId không hợp lệ:', meetingId);
        showToast('❌ Lỗi: Không xác định được cuộc họp. Vui lòng refresh trang (Ctrl+F5) và thử lại.', 'error', 5000);
        return;
    }
    
    if (!taskId 
        || taskId === 'undefined' 
        || taskId === 'null' 
        || taskId === '') {
        console.error('quickConfirmTask: taskId không hợp lệ:', taskId);
        showToast('❌ Lỗi: Không xác định được nhiệm vụ. Vui lòng refresh trang (Ctrl+F5) và thử lại.', 'error', 5000);
        return;
    }
    
    // ============================================================
    // GỌI API XÁC NHẬN
    // ============================================================
    try {
        await confirmTask(meetingId, taskId);
        showToast('✅ Đã xác nhận nhiệm vụ thành công!', 'success', 3000);
        
        // ============================================================
        // REFRESH TRANG HIỆN TẠI
        // ============================================================
        const pageContainer = document.getElementById('pageContainer');
        if (!pageContainer) return;
        
        const activeNavItem = document.querySelector('.nav-item.active[data-page], .mobile-nav-item.active[data-page]');
        const currentPage = activeNavItem ? activeNavItem.dataset.page : 'dashboard';
        
        if (currentPage === 'tasks') {
            if (typeof renderTasks === 'function') {
                await renderTasks(pageContainer);
            }
        } else if (currentPage === 'dashboard') {
            if (typeof renderDashboard === 'function') {
                await renderDashboard(pageContainer);
            }
        } else if (currentPage === 'meeting-detail') {
            if (typeof renderMeetingDetail === 'function') {
                await renderMeetingDetail(pageContainer, meetingId);
            }
        } else {
            if (typeof renderDashboard === 'function') {
                await renderDashboard(pageContainer);
            }
        }
    } catch (error) {
        console.error('Confirm task error:', error);
        showToast('❌ Lỗi xác nhận: ' + error.message, 'error', 5000);
    }
}

// ============================================================
// MEETING DETAIL RENDERING
// ============================================================
/**
 * Build ACTION PANEL nổi bật ở đầu trang chi tiết cuộc họp
 * ĐÃ SỬA: BỎ cảnh báo cứng "Cần kết luận tất cả nội dung"
 * @param {Object} meeting
 * @param {Object} options
 * @returns {string} HTML
 */
function buildMeetingActionPanel(meeting, options) {
    const isLeader = options.isLeader || false;
    const isClosed = options.isClosed || false;
    const totalMembers = options.totalMembers || 0;
    const confirmedMembers = options.confirmedMembers || 0;
    const participatedMembers = options.participatedMembers || 0;
    const contentsCount = options.contentsCount || 0;
    const tasksCount = options.tasksCount || 0;
    
    const confirmPercent = totalMembers > 0 
        ? Math.round((confirmedMembers / totalMembers) * 100) 
        : 0;
    const participatePercent = totalMembers > 0 
        ? Math.round((participatedMembers / totalMembers) * 100) 
        : 0;
    
    let progressColor = '#ef4444';
    if (confirmPercent >= 100) progressColor = '#22c55e';
    else if (confirmPercent >= 75) progressColor = '#84cc16';
    else if (confirmPercent >= 50) progressColor = '#f59e0b';
    else if (confirmPercent >= 25) progressColor = '#fb923c';
    
    const remainingCount = totalMembers - confirmedMembers;
    
    let actionButtonHtml = '';
    let statusMessageHtml = '';
    
    if (isLeader) {
        if (meeting.status === 'DRAFT') {
            actionButtonHtml = `
                <button class="meeting-action-btn" 
                        style="background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);color:#fff;"
                        onclick="updateMeetingStatusAction('${meeting.id}', 'DISCUSSION')"
                        title="Chuyển cuộc họp sang trạng thái ĐANG THẢO LUẬN">
                    <i class="fas fa-play-circle" style="font-size:20px;"></i>
                    <span>Bắt đầu thảo luận</span>
                </button>
            `;
            statusMessageHtml = `
                <div style="margin-top:10px;padding:10px 14px;background:#dbeafe;border-radius:8px;font-size:13px;color:#1e40af;line-height:1.6;">
                    <i class="fas fa-info-circle"></i>
                    <strong>Bước tiếp theo:</strong> Bấm <em>"Bắt đầu thảo luận"</em> để giáo viên có thể gửi ý kiến vào các nội dung.
                </div>
            `;
        } else if (meeting.status === 'DISCUSSION') {
            actionButtonHtml = `
                <button class="meeting-action-btn" 
                        style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:#fff;"
                        onclick="updateMeetingStatusAction('${meeting.id}', 'CONCLUDED')"
                        title="Chuyển sang trạng thái ĐÃ KẾT LUẬN">
                    <i class="fas fa-check-double" style="font-size:20px;"></i>
                    <span>Chốt kết luận</span>
                </button>
            `;
            statusMessageHtml = `
                <div style="margin-top:10px;padding:10px 14px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e;line-height:1.6;">
                    <i class="fas fa-info-circle"></i>
                    Bạn có thể bấm <em>"Chốt kết luận"</em> ngay cả khi một số nội dung chưa có kết luận.
                    Hệ thống cho phép bỏ trống kết luận với các nội dung mang tính <strong>dự thảo</strong> hoặc <strong>lấy ý kiến</strong>.
                </div>
            `;
        } else if (meeting.status === 'CONCLUDED') {
            const hasTasks = tasksCount > 0;
            const btnColor = hasTasks 
                ? 'background:linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);color:#fff;' 
                : 'background:#e2e8f0;color:#94a3b8;cursor:not-allowed;';
            
            actionButtonHtml = `
                <button class="meeting-action-btn" 
                        style="${btnColor}"
                        onclick="${hasTasks ? `updateMeetingStatusAction('${meeting.id}', 'CONFIRMATION')` : `showToast('Cần phân công ít nhất một nhiệm vụ trước khi chuyển sang bước xác nhận', 'warning')`}"
                        title="${hasTasks ? 'Chuyển sang giai đoạn chờ xác nhận' : 'Cần có ít nhất một nhiệm vụ'}">
                    <i class="fas fa-users-cog" style="font-size:20px;"></i>
                    <span>Chuyển chờ xác nhận</span>
                </button>
            `;
            if (!hasTasks) {
                statusMessageHtml = `
                    <div style="margin-top:10px;padding:10px 14px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e;line-height:1.6;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Cần phân công nhiệm vụ</strong> trước khi chuyển sang bước xác nhận hồ sơ.
                    </div>
                `;
            }
        } else if (meeting.status === 'CONFIRMATION') {
            const allConfirmed = (remainingCount === 0);
            const btnColor = allConfirmed
                ? 'background:linear-gradient(135deg, #22c55e 0%, #16a34a 100%);color:#fff;box-shadow:0 4px 14px rgba(34,197,94,0.4);'
                : 'background:linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);color:#fff;box-shadow:0 4px 14px rgba(245,158,11,0.35);';
            
            actionButtonHtml = `
                <button class="meeting-action-btn" 
                        style="${btnColor}"
                        onclick="closeMeeting('${meeting.id}')"
                        title="${allConfirmed ? 'Tất cả đã xác nhận — Sẵn sàng chốt' : 'Còn thành viên chưa xác nhận — sẽ yêu cầu lý do ngoại lệ'}">
                    <i class="fas fa-lock" style="font-size:22px;"></i>
                    <span style="font-weight:800;font-size:16px;">CHỐT HỒ SƠ</span>
                </button>
            `;
            if (allConfirmed) {
                statusMessageHtml = `
                    <div style="margin-top:10px;padding:10px 14px;background:#dcfce7;border-radius:8px;font-size:13px;color:#15803d;line-height:1.6;">
                        <i class="fas fa-check-circle"></i>
                        <strong>Tất cả ${totalMembers} thành viên đã xác nhận!</strong> Sẵn sàng chốt hồ sơ.
                    </div>
                `;
            } else {
                statusMessageHtml = `
                    <div style="margin-top:10px;padding:10px 14px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e;line-height:1.6;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Còn ${remainingCount} thành viên chưa xác nhận.</strong> Nếu chốt bây giờ, bạn sẽ cần nhập <em>lý do chốt ngoại lệ</em>.
                    </div>
                `;
            }
        } else if (meeting.status === 'CLOSED') {
            actionButtonHtml = `
                <button class="meeting-action-btn" 
                        style="background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);color:#fff;"
                        onclick="exportMeetingMinutes('${meeting.id}')"
                        title="Xuất biên bản cuộc họp ra PDF">
                    <i class="fas fa-file-pdf" style="font-size:20px;"></i>
                    <span>Xuất biên bản PDF</span>
                </button>
            `;
            statusMessageHtml = `
                <div style="margin-top:10px;padding:10px 14px;background:#dcfce7;border-radius:8px;font-size:13px;color:#15803d;line-height:1.6;">
                    <i class="fas fa-lock"></i>
                    Hồ sơ đã được chốt. Mọi thao tác chỉnh sửa đã bị khóa.
                </div>
            `;
        }
    } else {
        statusMessageHtml = `
            <div style="margin-top:10px;padding:10px 14px;background:#f1f5f9;border-radius:8px;font-size:13px;color:#475569;line-height:1.6;">
                <i class="fas fa-info-circle"></i>
                Bạn không phải Ban lãnh đạo tổ nên không có quyền chuyển trạng thái. Vui lòng liên hệ Tổ trưởng/Tổ phó nếu cần.
            </div>
        `;
    }
    
    return `
        <div class="meeting-action-panel" style="
            margin-bottom:20px;
            padding:20px;
            background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border:2px solid var(--gray-200);
            border-radius:14px;
            box-shadow:0 4px 20px rgba(30,58,138,0.08);
            position:relative;
            overflow:hidden;
        ">
            <div style="
                position:absolute;top:0;left:0;right:0;height:5px;
                background:linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);
            "></div>
            
            <div style="
                display:flex;justify-content:space-between;align-items:center;
                flex-wrap:wrap;gap:10px;margin-bottom:16px;
            ">
                <div style="
                    display:flex;align-items:center;gap:10px;
                    font-size:16px;font-weight:800;color:var(--primary);
                    text-transform:uppercase;letter-spacing:0.5px;
                ">
                    <i class="fas fa-tachometer-alt" style="font-size:20px;color:var(--accent);"></i>
                    <span>Trạng thái & Thao tác</span>
                </div>
                <div style="
                    padding:6px 16px;border-radius:20px;
                    background:linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                    color:#fff;font-size:13px;font-weight:700;
                    letter-spacing:0.5px;
                ">
                    ${getStatusInfo(meeting.status).label}
                </div>
            </div>
            
            <div style="
                display:grid;
                grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));
                gap:10px;margin-bottom:16px;
            ">
                <div style="
                    padding:14px;border-radius:10px;text-align:center;
                    background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                    border:1px solid #bfdbfe;
                ">
                    <div style="font-size:26px;font-weight:800;color:#1e40af;line-height:1;">
                        ${confirmedMembers}/${totalMembers}
                    </div>
                    <div style="font-size:12px;color:#1e40af;font-weight:600;margin-top:6px;">
                        ✅ Đã xác nhận
                    </div>
                </div>
                
                <div style="
                    padding:14px;border-radius:10px;text-align:center;
                    background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border:1px solid #bbf7d0;
                ">
                    <div style="font-size:26px;font-weight:800;color:#15803d;line-height:1;">
                        ${participatedMembers}/${totalMembers}
                    </div>
                    <div style="font-size:12px;color:#15803d;font-weight:600;margin-top:6px;">
                        👥 Đã tham gia
                    </div>
                </div>
                
                <div style="
                    padding:14px;border-radius:10px;text-align:center;
                    background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                    border:1px solid #fcd34d;
                ">
                    <div style="font-size:26px;font-weight:800;color:#92400e;line-height:1;">
                        ${contentsCount}
                    </div>
                    <div style="font-size:12px;color:#92400e;font-weight:600;margin-top:6px;">
                        📋 Nội dung
                    </div>
                </div>
                
                <div style="
                    padding:14px;border-radius:10px;text-align:center;
                    background:linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
                    border:1px solid #d8b4fe;
                ">
                    <div style="font-size:26px;font-weight:800;color:#6b21a8;line-height:1;">
                        ${tasksCount}
                    </div>
                    <div style="font-size:12px;color:#6b21a8;font-weight:600;margin-top:6px;">
                        📌 Nhiệm vụ
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom:16px;">
                <div style="
                    display:flex;justify-content:space-between;align-items:center;
                    margin-bottom:8px;font-size:13px;font-weight:600;color:var(--gray-700);
                ">
                    <span>📊 Tiến độ xác nhận hồ sơ</span>
                    <span style="color:${progressColor};font-weight:800;font-size:15px;">${confirmPercent}%</span>
                </div>
                <div style="
                    height:14px;background:#e2e8f0;border-radius:10px;
                    overflow:hidden;position:relative;
                ">
                    <div style="
                        height:100%;width:${confirmPercent}%;
                        background:linear-gradient(90deg, ${progressColor} 0%, ${progressColor}dd 100%);
                        border-radius:10px;
                        transition:width 0.6s ease;
                        box-shadow:0 0 10px ${progressColor}66;
                    "></div>
                </div>
            </div>
            
            ${actionButtonHtml ? `
                <div style="margin-top:16px;">
                    ${actionButtonHtml}
                </div>
            ` : ''}
            
            ${statusMessageHtml}
        </div>
    `;
}
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
/**
 * Render meeting detail page
 * Đã nâng cấp: thêm nút Xóa cuộc họp (chỉ Admin)
 * @param {HTMLElement} container
 * @param {string} meetingId
 */
/**
 * Render meeting detail page
 * Đã nâng cấp: 
 *   - Action panel nổi bật ở đầu trang (thay vì ẩn trong tab Admin)
 *   - Nút chuyển trạng thái to rõ, màu sắc sinh động
 *   - Thống kê xác nhận hiển thị ngay đầu
 *   - Bỏ tab Admin (không cần thiết nữa)
 * @param {HTMLElement} container
 * @param {string} meetingId
 */
/**
 * Render meeting detail page
 * ĐÃ NÂNG CẤP:
 *   - Bỏ tab "Thảo luận" riêng
 *   - Thảo luận được nhúng vào từng thẻ Nội dung dưới dạng accordion
 *   - Nút "Xem thảo luận" toggle mở/đóng khu vực bình luận
 * @param {HTMLElement} container
 * @param {string} meetingId
 */
/**
 * Render meeting detail page
 * ĐÃ KHÔI PHỤC ĐẦY ĐỦ + SỬA PHÂN QUYỀN TRIỆT ĐỂ:
 *   - Action Panel nổi bật ở đầu trang (thống kê + progress bar + nút chuyển trạng thái)
 *   - Nút Xuất biên bản PDF hiển thị đúng chỗ (header khi CLOSED + Action Panel khi CLOSED)
 *   - PHÂN QUYỀN: Chỉ Admin HOẶC chính người chủ trì/tạo cuộc họp mới thấy nút [Kết luận], [CHỐT HỒ SƠ]
 *   - Luồng thảo luận Accordion giữ nguyên (toggle mở rộng, lazy load, cập nhật badge)
 * @param {HTMLElement} container
 * @param {string} meetingId
 */
/**
 * Render meeting detail page
 * ĐÃ KHÔI PHỤC: Nút Xóa cuộc họp (chỉ Admin hoặc người Chủ trì/Tạo cuộc họp)
 * ĐIỀU KIỆN HIỂN THỊ: (!isClosed) && (isAdminUser || isChairmanOrCreator)
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
    
    // ============================================================
    // PHÂN QUYỀN
    // ============================================================
    const role = await getCurrentUserRole();
    const userTeamId = await getCurrentUserTeamId();
    
    const isAdminUser = role === 'admin';
    
    const isChairmanOrCreator = 
        (meeting.chairmanId && meeting.chairmanId === uid) 
        || (meeting.createdBy && meeting.createdBy === uid);
    
    const canLeadThisMeeting = isAdminUser || isChairmanOrCreator;
    
    const isSecretary = (meeting.secretaryId && meeting.secretaryId === uid);
    const canEditContent = canLeadThisMeeting || isSecretary;
    
    const isClosed = meeting.status === 'CLOSED';
    
    // === ĐIỀU KIỆN HIỂN THỊ NÚT XÓA ===
    // Chỉ hiện khi: chưa chốt VÀ (là admin HOẶC là người chủ trì/tạo cuộc họp)
    const canDelete = !isClosed && (isAdminUser || isChairmanOrCreator);
    
    const contents = await getMeetingContents(meetingId);
    const tasks = await getTasks(meetingId);
    const confirmations = await getConfirmations(meetingId);
    const allDiscussions = await getDiscussions(meetingId);
    
    contents.forEach(c => {
        const liveCount = allDiscussions.filter(d => d.contentId === c.id).length;
        const storedCount = c.discussionCount || 0;
        c.discussionCount = liveCount > 0 ? liveCount : storedCount;
    });
    
    const memberIds = Object.keys(meeting.memberIds || {});
        // Build memberNameMap để hiển thị tên trong Tasks
    const memberNameMap = {};
    for (const mid of memberIds) {
        try {
            const snap = await db.ref(`users/${mid}/displayName`).once('value');
            memberNameMap[mid] = snap.val() || mid;
        } catch (e) {
            memberNameMap[mid] = mid;
        }
    }
    const totalMembers = memberIds.length;
    const confirmedMembers = memberIds.filter(mid => 
        confirmations[mid] && confirmations[mid].finalConfirmed === true
    ).length;
    const participatedMembers = memberIds.filter(mid => 
        confirmations[mid] && confirmations[mid].participated === true
    ).length;
    const allContentsConcluded = contents.length > 0 
        && contents.every(c => c.status === 'CONCLUDED');
    const concludedContentsCount = contents.filter(c => c.status === 'CONCLUDED').length;
    
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
                    ${!isClosed && canEditContent ? `
                        <button class="btn-secondary" style="padding:6px 14px;font-size:13px;" onclick="editMeeting('${meetingId}')">
                            <i class="fas fa-edit"></i> Sửa
                        </button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="btn-danger" 
                                style="padding:6px 14px;font-size:13px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all 0.2s;" 
                                onclick="deleteMeeting('${meetingId}')"
                                onmouseover="this.style.background='#b91c1c';"
                                onmouseout="this.style.background='#dc2626';"
                                title="Xóa vĩnh viễn cuộc họp này">
                            <i class="fas fa-trash-alt"></i> Xóa cuộc họp
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
        
        ${buildMeetingActionPanel(meeting, {
            isLeader: canLeadThisMeeting,
            isClosed: isClosed,
            totalMembers: totalMembers,
            confirmedMembers: confirmedMembers,
            participatedMembers: participatedMembers,
            contentsCount: contents.length,
            concludedContentsCount: concludedContentsCount,
            allContentsConcluded: allContentsConcluded,
            tasksCount: tasks.length
        })}
        
            <div class="meeting-tabs">
            <button class="meeting-tab active" data-tab="contents">
                <span class="tab-icon">📋</span>
                <span class="tab-label">Nội dung</span>
            </button>
            <button class="meeting-tab" data-tab="tasks">
                <span class="tab-icon">📌</span>
                <span class="tab-label">Nhiệm vụ</span>
            </button>
            <button class="meeting-tab" data-tab="confirmations">
                <span class="tab-icon">✅</span>
                <span class="tab-label">Xác nhận</span>
            </button>
            <button class="meeting-tab" data-tab="logs">
                <span class="tab-icon">📜</span>
                <span class="tab-label">Nhật ký</span>
            </button>
        </div>
        
        <div id="tabContents">
            <div class="meeting-content-panel active" data-panel="contents">
                <div id="contentsContainer">
                    ${contents.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-file-alt"></i>
                            <p>Chưa có nội dung nào.</p>
                            ${canEditContent && !isClosed ? `
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
                        
                        return `
                            <div class="section-card" style="margin-bottom:16px;">
                                <div class="section-header">
                                    <h3>📌 NỘI DUNG ${String(idx + 1).padStart(2, '0')}</h3>
                                    <div style="display:flex;gap:6px;align-items:center;">
                                        <span class="status-badge ${c.status === 'CONCLUDED' ? 'concluded' : 'draft'}">
                                            ${c.status === 'CONCLUDED' ? '✅ Đã kết luận' : '📝 Dự thảo'}
                                        </span>
                                        ${canEditContent && !isClosed ? `
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
                                    
                                    <div class="content-actions">
                                        <button class="discussion-toggle-btn" 
                                                data-disc-toggle="${c.id}"
                                                onclick="toggleContentDiscussion('${meetingId}', '${c.id}')">
                                            <i class="fas fa-comments"></i>
                                            <span>Mời thảo luận</span>
                                            <span class="count-badge">${discussionCount}</span>
                                            <i class="fas fa-chevron-down toggle-icon"></i>
                                        </button>
                                        ${canLeadThisMeeting && !isClosed && c.status !== 'CONCLUDED' ? `
                                            <button class="btn-primary" style="padding:8px 16px;font-size:13px;" onclick="concludeContent('${meetingId}', '${c.id}')">
                                                <i class="fas fa-check-double"></i> Kết luận
                                            </button>
                                        ` : ''}
                                        ${canLeadThisMeeting && !isClosed && c.status === 'CONCLUDED' ? `
                                            <button class="btn-secondary" style="padding:8px 16px;font-size:13px;" onclick="editConclusion('${meetingId}', '${c.id}')">
                                                <i class="fas fa-edit"></i> Sửa kết luận
                                            </button>
                                        ` : ''}
                                    </div>
                                    
                                    <div class="discussion-accordion" id="disc_accordion_${c.id}">
                                        <div class="discussion-accordion-header">
                                            <span><i class="fas fa-comments"></i> Thảo luận — ${escapeHtml(c.title)}</span>
                                        </div>
                                        <div class="discussion-accordion-body" id="discussions_${c.id}">
                                            <div class="discussion-loading">
                                                <div class="loader"></div>
                                                <div>Đang tải thảo luận...</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    ${canEditContent && !isClosed ? `
                        <button class="btn-primary" onclick="addContent('${meetingId}')" style="width:100%;justify-content:center;margin-top:4px;">
                            <i class="fas fa-plus"></i> Thêm nội dung
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="meeting-content-panel" data-panel="tasks">
                <div id="tasksContainer">
                    ${tasks.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-tasks"></i>
                            <p>Chưa có nhiệm vụ nào.</p>
                            ${canLeadThisMeeting && !isClosed ? `
                                <button class="btn-primary" style="margin-top:8px;" onclick="showAssignTask('${meetingId}')">
                                    <i class="fas fa-plus"></i> Phân công nhiệm vụ
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                       ${tasks.map(t => renderTaskItem(t, true, memberNameMap, canLeadThisMeeting)).join('')}
                    `}
                    ${canLeadThisMeeting && !isClosed ? `
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
        </div>
    `;
    
    container.innerHTML = html;
    
    document.querySelectorAll('.meeting-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
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
 * Thêm nội dung mới cho cuộc họp
 * ĐÃ NÂNG CẤP: Hỗ trợ đính kèm NHIỀU LINK Google Drive
 * @param {string} meetingId
 */
async function addContent(meetingId) {
    const formKey = `add_content_${Date.now()}`;
    
    if (!window._pendingLinks) window._pendingLinks = {};
    window._pendingLinks[formKey] = [];
    
    showModal('➕ Thêm nội dung cuộc họp', `
        <div class="form-group">
            <label>Tiêu đề nội dung <span class="required">*</span></label>
            <input type="text" id="newContentTitle" placeholder="VD: Triển khai kế hoạch chuyên môn tháng 10">
        </div>
        <div class="form-group">
            <label>Nội dung trình bày <span class="required">*</span></label>
            <textarea id="newContentDesc" rows="5" placeholder="Mô tả chi tiết nội dung cần thảo luận..."></textarea>
        </div>
        
        <div class="form-group" style="padding:14px;background:#f0fdf4;border:2px dashed #86efac;border-radius:10px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <i class="fas fa-paperclip" style="color:#16a34a;font-size:16px;"></i>
                <strong style="font-size:14px;color:#14532d;">+ Đính kèm tài liệu thảo luận</strong>
                <span style="font-size:11px;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:10px;font-weight:600;">
                    Có thể thêm nhiều link
                </span>
            </div>
            <div style="font-size:12px;color:#166534;margin-bottom:10px;">
                Đính kèm một hoặc nhiều tài liệu Google Drive để giáo viên nghiên cứu trước khi thảo luận
            </div>
            
            <div id="attachList_${formKey}" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;min-height:32px;">
                <span style="font-size:13px;color:var(--gray-400);font-style:italic;">Chưa có tài liệu đính kèm.</span>
            </div>
            
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                <input type="text" id="attachUrl_${formKey}" placeholder="https://drive.google.com/file/d/.../view" style="flex:2;min-width:180px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                <input type="text" id="attachName_${formKey}" placeholder="Tên tài liệu" style="flex:1;min-width:120px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:13px;background:#16a34a;color:#fff;border:none;" onclick="addAttachmentTagFromInput('${formKey}')">
                    <i class="fas fa-plus"></i> Thêm link
                </button>
            </div>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Thêm nội dung',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const title = document.getElementById('newContentTitle').value.trim();
                const desc = document.getElementById('newContentDesc').value.trim();
                
                if (!title || !desc) {
                    showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung', 'warning');
                    return;
                }
                
                try {
                    const saveBtn = document.querySelector('.modal-footer button[data-action="save"]');
                    if (saveBtn) {
                        saveBtn.disabled = true;
                        saveBtn.innerHTML = '<span class="spinner"></span> Đang lưu...';
                    }
                    
                    const contentId = await addMeetingContent(meetingId, {
                        title: title,
                        description: desc,
                        status: 'DRAFT'
                    });
                    
                    const links = getPendingLinks(formKey);
                    let uploadedCount = 0;
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
                            uploadedCount++;
                        } catch (attError) {
                            console.warn('Lỗi lưu link:', attError);
                        }
                    }
                    
                    const linkMsg = uploadedCount > 0 ? ` (${uploadedCount} tài liệu)` : '';
                    showToast(`✅ Đã thêm nội dung${linkMsg}!`, 'success');
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
 * Sửa nội dung cuộc họp
 * ĐÃ NÂNG CẤP: Hỗ trợ xem nhiều link cũ + thêm nhiều link mới
 * @param {string} meetingId
 * @param {string} contentId
 */
async function editContent(meetingId, contentId) {
    const contents = await getMeetingContents(meetingId);
    const content = contents.find(c => c.id === contentId);
    if (!content) {
        showToast('Không tìm thấy nội dung', 'error');
        return;
    }
    
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
    
    showModal('✏️ Sửa nội dung cuộc họp', `
        <div class="form-group">
            <label>Tiêu đề nội dung <span class="required">*</span></label>
            <input type="text" id="editContentTitle" value="${escapeHtml(content.title)}">
        </div>
        <div class="form-group">
            <label>Nội dung trình bày <span class="required">*</span></label>
            <textarea id="editContentDesc" rows="5">${escapeHtml(content.description || '')}</textarea>
        </div>
        
        <div class="form-group" style="padding:14px;background:#f0fdf4;border:2px dashed #86efac;border-radius:10px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <i class="fas fa-paperclip" style="color:#16a34a;font-size:16px;"></i>
                <strong style="font-size:14px;color:#14532d;">+ Đính kèm tài liệu thảo luận</strong>
                <span style="font-size:11px;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:10px;font-weight:600;">
                    Có thể thêm nhiều link
                </span>
            </div>
            <div style="font-size:12px;color:#166534;margin-bottom:10px;">
                Link cũ đã khóa để đảm bảo tính toàn vẹn. Bạn có thể thêm nhiều link mới.
            </div>
            
            <div id="attachList_${formKey}" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;min-height:32px;">
                ${renderAttachmentTags(lockedLinks, formKey)}
            </div>
            
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                <input type="text" id="attachUrl_${formKey}" placeholder="https://drive.google.com/file/d/.../view" style="flex:2;min-width:180px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                <input type="text" id="attachName_${formKey}" placeholder="Tên tài liệu" style="flex:1;min-width:120px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:13px;background:#16a34a;color:#fff;border:none;" onclick="addAttachmentTagFromInput('${formKey}', true)">
                    <i class="fas fa-plus"></i> Thêm link
                </button>
            </div>
            
            <div style="font-size:12px;color:#64748b;margin-top:8px;">
                <i class="fas fa-lock"></i> Link cũ có ổ khóa không thể xóa. Chỉ có thể thêm link mới.
            </div>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Lưu thay đổi',
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
                    const saveBtn = document.querySelector('.modal-footer button[data-action="save"]');
                    if (saveBtn) {
                        saveBtn.disabled = true;
                        saveBtn.innerHTML = '<span class="spinner"></span> Đang lưu...';
                    }
                    
                    await updateMeetingContent(meetingId, contentId, {
                        title: title,
                        description: desc
                    });
                    
                    const allLinks = getPendingLinks(formKey);
                    const newLinks = allLinks.filter(l => l.isNew === true);
                    let uploadedCount = 0;
                    
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
                            uploadedCount++;
                        } catch (attError) {
                            console.warn('Lỗi lưu link mới:', attError);
                        }
                    }
                    
                    const linkMsg = uploadedCount > 0 ? ` (thêm ${uploadedCount} tài liệu)` : '';
                    showToast(`✅ Đã cập nhật nội dung${linkMsg}!`, 'success');
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
 * Kết luận nội dung cuộc họp
 * ĐÃ SỬA: Cho phép kết luận TRỐNG (bỏ qua kết luận)
 * @param {string} meetingId
 * @param {string} contentId
 */
async function concludeContent(meetingId, contentId) {
    const formKey = `conclude_${contentId}`;
    
    if (!window._pendingLinks) window._pendingLinks = {};
    window._pendingLinks[formKey] = [];
    
    showModal('👨‍💼 Kết luận nội dung cuộc họp', `
        <div style="padding:10px 14px;background:#eff6ff;border-left:3px solid #2563eb;border-radius:6px;margin-bottom:14px;font-size:13px;color:#1e40af;line-height:1.6;">
            <i class="fas fa-info-circle"></i>
            Với các nội dung <strong>dự thảo</strong> hoặc <strong>lấy ý kiến</strong>, bạn có thể <strong>để trống kết luận</strong> và bấm "Chốt nội dung" — hệ thống vẫn ghi nhận là đã xử lý.
        </div>
        
        <div class="form-group">
            <label>Nội dung kết luận</label>
            <textarea id="conclusionInput" rows="6" placeholder="Nhập kết luận của tổ trưởng cho nội dung này (có thể bỏ trống nếu chỉ ghi nhận ý kiến)..."></textarea>
            <div style="font-size:12px;color:var(--gray-500);margin-top:6px;">
                💡 Kết luận sẽ được ghi vào hồ sơ. Nếu bỏ trống, hệ thống sẽ ghi chú "Chưa có kết luận chính thức".
            </div>
        </div>
        
        <div class="form-group" style="padding:14px;background:#eff6ff;border:2px dashed #93c5fd;border-radius:10px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <i class="fas fa-file-signature" style="color:#1e40af;font-size:16px;"></i>
                <strong style="font-size:14px;color:#1e3a8a;">+ Đính kèm văn bản kết luận / Quyết định ban hành</strong>
            </div>
            <div style="font-size:12px;color:#1e40af;margin-bottom:10px;">
                Đính kèm văn bản chính thức sau khi kết luận (Google Drive)
            </div>
            
            <div id="attachList_${formKey}" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
                <span style="font-size:13px;color:var(--gray-400);font-style:italic;">Chưa có văn bản đính kèm.</span>
            </div>
            
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                <input type="text" id="attachUrl_${formKey}" placeholder="https://drive.google.com/file/d/.../view" style="flex:2;min-width:180px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                <input type="text" id="attachName_${formKey}" placeholder="Tên văn bản" style="flex:1;min-width:120px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:13px;background:#1e40af;color:#fff;border:none;" onclick="addAttachmentTagFromInput('${formKey}')">
                    <i class="fas fa-plus"></i> Thêm link
                </button>
            </div>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: '✅ Chốt nội dung',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const conclusion = document.getElementById('conclusionInput').value.trim();
                
                try {
                    const saveBtn = document.querySelector('.modal-footer button[data-action="save"]');
                    if (saveBtn) {
                        saveBtn.disabled = true;
                        saveBtn.innerHTML = '<span class="spinner"></span> Đang lưu...';
                    }
                    
                    const uid = getCurrentUid();
                    await updateMeetingContent(meetingId, contentId, {
                        conclusion: conclusion || '',
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
                    
                    showToast('✅ Đã chốt nội dung thành công!', 'success');
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
                        <i class="fa fa-paperclip"></i> Xác nhận đính kèm
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
 * Hiển thị form phân công nhiệm vụ
 * ĐÃ NÂNG CẤP: Cho phép chọn NHIỀU người hoặc "Tất cả thành viên"
 * @param {string} meetingId
 */
async function showAssignTask(meetingId) {
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
        showToast('Không tìm thấy cuộc họp', 'error');
        return;
    }
    
    const memberIds = Object.keys(meeting.memberIds || {});
    if (memberIds.length === 0) {
        showToast('Cuộc họp chưa có thành viên nào', 'warning');
        return;
    }
    
    // Load tên các thành viên
    const membersInfo = [];
    for (const mid of memberIds) {
        try {
            const snap = await db.ref(`users/${mid}`).once('value');
            const ud = snap.val() || {};
            membersInfo.push({
                uid: mid,
                displayName: ud.displayName || ud.email || mid,
                email: ud.email || ''
            });
        } catch (e) {
            membersInfo.push({
                uid: mid,
                displayName: mid,
                email: ''
            });
        }
    }
    membersInfo.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    
    const formKey = `assign_task_${Date.now()}`;
    
    // Build checkbox list
    const checkboxesHtml = membersInfo.map(m => `
        <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:6px;transition:all 0.2s;">
            <input type="checkbox" class="assignee-checkbox" value="${m.uid}" style="width:16px;height:16px;margin:0;cursor:pointer;">
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${escapeHtml(m.displayName)}
                </div>
                ${m.email ? `<div style="font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.email)}</div>` : ''}
            </div>
        </label>
    `).join('');
    
    showModal('📋 Phân công nhiệm vụ', `
        <div class="form-group">
            <label>Người thực hiện <span class="required">*</span></label>
            
            <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
                <button type="button" class="btn-secondary" style="padding:6px 12px;font-size:13px;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;border-radius:6px;font-weight:600;cursor:pointer;" onclick="toggleAllAssignees(true)">
                    <i class="fas fa-check-double"></i> Chọn tất cả
                </button>
                <button type="button" class="btn-secondary" style="padding:6px 12px;font-size:13px;" onclick="toggleAllAssignees(false)">
                    <i class="fas fa-times"></i> Bỏ chọn
                </button>
                <button type="button" class="btn-secondary" style="padding:6px 12px;font-size:13px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:6px;font-weight:600;cursor:pointer;" onclick="selectAllMembersOption()">
                    <i class="fas fa-users"></i> Tất cả thành viên
                </button>
            </div>
            
            <div id="assigneeListBox" style="max-height:220px;overflow-y:auto;padding:10px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;">
                ${checkboxesHtml}
            </div>
            
            <div id="allMembersBadge" style="display:none;margin-top:8px;padding:10px 14px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;font-size:13px;color:#92400e;font-weight:600;">
                <i class="fas fa-users"></i> Đã chọn: <strong>Tất cả thành viên</strong> — sẽ được giao cho mọi người trong cuộc họp
            </div>
        </div>
        
        <div class="form-group">
            <label>Nội dung nhiệm vụ <span class="required">*</span></label>
            <input type="text" id="taskTitle" placeholder="Mô tả nhiệm vụ (VD: Soạn chuyên đề tháng 10)">
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
                <input type="text" id="taskProduct" placeholder="VD: File Word, PDF...">
            </div>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Phân công',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const title = document.getElementById('taskTitle').value.trim();
                const deadline = document.getElementById('taskDeadline').value;
                const desc = document.getElementById('taskDesc').value.trim();
                const product = document.getElementById('taskProduct').value.trim();
                
                if (!title || !deadline) {
                    showToast('Vui lòng nhập đầy đủ tiêu đề và thời hạn', 'warning');
                    return;
                }
                
                // Thu thập assignees
                const selectedUids = {};
                document.querySelectorAll('.assignee-checkbox:checked').forEach(cb => {
                    selectedUids[cb.value] = true;
                });
                
                const allMembersBadge = document.getElementById('allMembersBadge');
                const isAllMembers = allMembersBadge && allMembersBadge.style.display !== 'none';
                
                if (!isAllMembers && Object.keys(selectedUids).length === 0) {
                    showToast('Vui lòng chọn ít nhất một người thực hiện', 'warning');
                    return;
                }
                
                // Chuẩn bị assignedTo
                let assignedTo;
                let assignedToNames;
                
                if (isAllMembers) {
                    assignedTo = { '__ALL__': true };
                    assignedToNames = 'Tất cả thành viên';
                } else {
                    assignedTo = selectedUids;
                    const names = Object.keys(selectedUids).map(uid => {
                        const m = membersInfo.find(x => x.uid === uid);
                        return m ? m.displayName : uid;
                    });
                    assignedToNames = names.join(', ');
                }
                
                try {
                    const saveBtn = document.querySelector('.modal-footer button[data-action="save"]');
                    if (saveBtn) {
                        saveBtn.disabled = true;
                        saveBtn.innerHTML = '<span class="spinner"></span> Đang lưu...';
                    }
                    
                    await addTask(meetingId, {
                        assignedTo: assignedTo,
                        assignedToNames: assignedToNames,
                        title: title,
                        description: desc,
                        deadline: deadline,
                        product: product || 'Chưa xác định'
                    });
                    
                    showToast('✅ Đã phân công nhiệm vụ!', 'success');
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
 * Toggle tất cả checkbox người được giao
 * @param {boolean} checked
 */
function toggleAllAssignees(checked) {
    document.querySelectorAll('.assignee-checkbox').forEach(cb => {
        cb.checked = checked;
    });
    const badge = document.getElementById('allMembersBadge');
    if (badge) badge.style.display = 'none';
}

/**
 * Chọn "Tất cả thành viên" — không tick checkbox mà hiện badge đặc biệt
 */
function selectAllMembersOption() {
    document.querySelectorAll('.assignee-checkbox').forEach(cb => {
        cb.checked = false;
    });
    const badge = document.getElementById('allMembersBadge');
    if (badge) {
        badge.style.display = badge.style.display === 'none' ? 'block' : 'none';
    }
}

window.toggleAllAssignees = toggleAllAssignees;
window.selectAllMembersOption = selectAllMembersOption;

// ============================================================
// STATUS TRANSITION WITH VALIDATION
// ============================================================
/**
 * Check if a status transition is allowed
 * ĐÃ SỬA: BỎ HOÀN TOÀN điều kiện bắt buộc kết luận nội dung
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
                return { ok: false, reason: 'Chưa có nội dung nào để chốt kết luận' };
            }
            break;
        case 'CONFIRMATION':
            if (tasks.length === 0) {
                return { ok: false, reason: 'Cần phân công ít nhất một nhiệm vụ trước khi chuyển sang bước xác nhận' };
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
 * Chốt hồ sơ cuộc họp
 * ĐÃ SỬA: BỎ điều kiện bắt buộc "tất cả nội dung phải kết luận"
 * @param {string} meetingId
 */
async function closeMeeting(meetingId) {
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
        showToast('Không tìm thấy cuộc họp', 'error');
        return;
    }
    
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
                💡 Đây là các điều kiện bắt buộc. Lưu ý: kết luận nội dung KHÔNG bắt buộc — bạn có thể bỏ trống.
            </div>
        `, [
            { text: 'Đã hiểu', class: 'btn-secondary', action: 'close' }
        ]);
        return;
    }
    
    const confirmations = await getConfirmations(meetingId);
    const memberIds = Object.keys(meeting.memberIds || {});
    const unconfirmedUids = memberIds.filter(mid => {
        return !confirmations[mid] || confirmations[mid].finalConfirmed !== true;
    });
    
    const uid = getCurrentUid();
    
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
 * Sửa cuộc họp — Cho phép thêm/gỡ thành viên khi DRAFT hoặc DISCUSSION
 * Chỉ khóa hoàn toàn khi hồ sơ đã CLOSED
 * @param {string} meetingId
 */
async function editMeeting(meetingId) {
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
        showToast('Không tìm thấy cuộc họp', 'error');
        return;
    }
    
    // ============================================================
    // KIỂM TRA TRẠNG THÁI — chỉ chặn khi đã CLOSED
    // ============================================================
    if (meeting.status === 'CLOSED') {
        showToast('❌ Không thể sửa cuộc họp đã chốt. Đây là hồ sơ lưu trữ.', 'error', 5000);
        return;
    }
    
    const canEditMembers = meeting.status === 'DRAFT' || meeting.status === 'DISCUSSION';
    
    // ============================================================
    // LOAD DANH SÁCH THÀNH VIÊN TỔ CỦA CUỘC HỌP
    // ============================================================
    const meetingTeamId = meeting.teamId;
    let ownTeamMembers = [];
    let otherTeamMembers = [];
    
    try {
        const teamsSnap = await db.ref('teams').once('value');
        const teamsData = teamsSnap.val() || {};
        const teamNameMap = {};
        Object.keys(teamsData).forEach(tid => {
            teamNameMap[tid] = teamsData[tid].name || tid;
        });
        
        const allUsersSnap = await db.ref('users').once('value');
        const allUsers = allUsersSnap.val() || {};
        
        Object.keys(allUsers).forEach(otherUid => {
            const u = allUsers[otherUid];
            if (!u) return;
            
            if (u.teamId === meetingTeamId) {
                ownTeamMembers.push({
                    uid: otherUid,
                    displayName: u.displayName || u.email || otherUid,
                    email: u.email || '',
                    role: u.role || 'giao_vien',
                    teamId: meetingTeamId
                });
            } else {
                otherTeamMembers.push({
                    uid: otherUid,
                    displayName: u.displayName || u.email || otherUid,
                    email: u.email || '',
                    role: u.role || 'giao_vien',
                    teamId: u.teamId || '',
                    teamName: u.teamId ? (teamNameMap[u.teamId] || u.teamId) : 'Chưa phân tổ'
                });
            }
        });
        
        otherTeamMembers.sort((a, b) => {
            const t = (a.teamName || '').localeCompare(b.teamName || '');
            if (t !== 0) return t;
            return (a.displayName || '').localeCompare(b.displayName || '');
        });
    } catch (e) {
        console.error('Error loading members:', e);
    }
    
    // Danh sách UID đã có trong meeting.memberIds
    const currentMemberIds = Object.keys(meeting.memberIds || {});
    
    // ============================================================
    // BUILD BLOCK CHỌN THÀNH VIÊN
    // ============================================================
    let memberSelectionHtml = '';
    if (canEditMembers) {
        memberSelectionHtml = `
            <div class="form-group" style="margin-top:16px;padding:14px;background:#f0f9ff;border:2px dashed #7dd3fc;border-radius:10px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                    <i class="fas fa-users" style="color:#0284c7;font-size:16px;"></i>
                    <strong style="font-size:15px;color:#0c4a6e;">👥 Thành viên tham gia</strong>
                    <span style="font-size:12px;color:#0284c7;font-weight:600;background:#e0f2fe;padding:2px 10px;border-radius:12px;">
                        Có thể thêm/gỡ khi đang thảo luận
                    </span>
                </div>
                
                <div style="display:flex;gap:6px;margin-bottom:10px;">
                    <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="toggleAllMembers(true)">
                        <i class="fas fa-check-double"></i> Chọn tất cả tổ mình
                    </button>
                    <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="toggleAllMembers(false)">
                        <i class="fas fa-times"></i> Bỏ chọn tổ mình
                    </button>
                </div>
                
                <div style="font-size:13px;font-weight:600;color:#0c4a6e;margin-bottom:6px;">
                    Thành viên tổ ${escapeHtml(meetingTeamId || 'mình')} (${ownTeamMembers.length})
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0 12px 0;">
                    ${ownTeamMembers.length === 0 ? `
                        <span style="color:var(--gray-500);font-style:italic;font-size:14px;">Chưa có thành viên trong tổ.</span>
                    ` : ownTeamMembers.map(m => {
                        const isChecked = currentMemberIds.includes(m.uid);
                        return `
                            <label style="display:flex;align-items:center;gap:6px;font-size:14px;background:${isChecked ? '#dcfce7' : '#ffffff'};border:1px solid ${isChecked ? '#86efac' : '#e2e8f0'};padding:6px 12px;border-radius:20px;cursor:pointer;transition:all 0.2s;">
                                <input type="checkbox" class="member-checkbox" value="${m.uid}" ${isChecked ? 'checked' : ''}>
                                ${escapeHtml(m.displayName)}
                            </label>
                        `;
                    }).join('')}
                </div>
                
                <div style="display:flex;gap:6px;margin-bottom:10px;">
                    <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="toggleAllGuests(true)">
                        <i class="fas fa-check-double"></i> Chọn tất cả khách
                    </button>
                    <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="toggleAllGuests(false)">
                        <i class="fas fa-times"></i> Bỏ chọn khách
                    </button>
                </div>
                
                <div style="font-size:13px;font-weight:600;color:#0c4a6e;margin-bottom:6px;">
                    🎫 Khách mời (Tổ khác) — ${otherTeamMembers.length} người
                </div>
                <div style="max-height:200px;overflow-y:auto;border:1px solid #cbd5e1;border-radius:8px;padding:8px;background:#ffffff;">
                    ${otherTeamMembers.length === 0 ? `
                        <div style="padding:8px;text-align:center;color:#64748b;font-style:italic;font-size:13px;">
                            Không có giáo viên nào khác tổ.
                        </div>
                    ` : otherTeamMembers.map(m => {
                        const isChecked = currentMemberIds.includes(m.uid);
                        return `
                            <label style="display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:8px 10px;border-radius:6px;cursor:pointer;background:${isChecked ? '#fef3c7' : '#ffffff'};margin-bottom:4px;border:1px solid ${isChecked ? '#fcd34d' : '#e2e8f0'};">
                                <input type="checkbox" class="guest-checkbox" value="${m.uid}" ${isChecked ? 'checked' : ''}>
                                <div style="min-width:0;">
                                    <div style="font-weight:600;font-size:13px;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                        ${escapeHtml(m.displayName)}
                                    </div>
                                    <div style="font-size:11px;color:#64748b;">
                                        ${escapeHtml(m.email)}${m.teamName ? ` • <span style="color:#0284c7;font-weight:500;">${escapeHtml(m.teamName)}</span>` : ''}
                                    </div>
                                </div>
                                <span class="role-badge ${m.role}" style="font-size:10px;white-space:nowrap;">${escapeHtml(getRoleLabelForMeeting(m.role))}</span>
                            </label>
                        `;
                    }).join('')}
                </div>
                
                <div style="font-size:12px;color:#0369a1;margin-top:8px;font-style:italic;">
                    💡 Khi sửa danh sách thành viên, số người sẽ tự động cập nhật lại trong trang chi tiết.
                </div>
            </div>
        `;
    } else {
        memberSelectionHtml = `
            <div class="form-group" style="margin-top:16px;padding:12px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;">
                <div style="font-size:13px;color:#92400e;line-height:1.6;">
                    <i class="fas fa-lock"></i>
                    <strong>Không thể thay đổi thành viên</strong> ở trạng thái hiện tại (${meeting.status}).
                    Chỉ có thể sửa khi cuộc họp ở trạng thái <strong>Dự thảo</strong> hoặc <strong>Đang thảo luận</strong>.
                </div>
            </div>
        `;
    }
    
    // ============================================================
    // RENDER MODAL
    // ============================================================
    showModal('✏️ Sửa cuộc họp', `
        <div class="form-group">
            <label>Tên cuộc họp <span class="required">*</span></label>
            <input type="text" id="editMeetingTitle" value="${escapeHtml(meeting.title)}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Ngày họp <span class="required">*</span></label>
                <input type="date" id="editMeetingDate" value="${meeting.meetingDate || ''}" required>
            </div>
            <div class="form-group">
                <label>Thời gian <span class="required">*</span></label>
                <input type="time" id="editMeetingTime" value="${meeting.meetingTime || ''}" required>
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
        
        ${memberSelectionHtml}
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Lưu thay đổi',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const title = document.getElementById('editMeetingTitle').value.trim();
                const meetingDate = document.getElementById('editMeetingDate').value;
                const meetingTime = document.getElementById('editMeetingTime').value;
                const format = document.getElementById('editMeetingFormat').value;
                const description = document.getElementById('editMeetingDesc').value.trim();
                
                if (!title || !meetingDate) {
                    showToast('Vui lòng nhập đầy đủ thông tin bắt buộc', 'warning');
                    return;
                }
                
                // Build memberIds mới nếu được phép sửa thành viên
                let newMemberIds = null;
                let addedCount = 0;
                let removedCount = 0;
                
                if (canEditMembers) {
                    newMemberIds = {};
                    document.querySelectorAll('.member-checkbox:checked, .guest-checkbox:checked').forEach(cb => {
                        newMemberIds[cb.value] = true;
                    });
                    
                    if (Object.keys(newMemberIds).length === 0) {
                        showToast('Phải có ít nhất một thành viên hoặc khách mời', 'warning');
                        return;
                    }
                    
                    // Đếm số thay đổi
                    Object.keys(newMemberIds).forEach(id => {
                        if (!currentMemberIds.includes(id)) addedCount++;
                    });
                    currentMemberIds.forEach(id => {
                        if (!newMemberIds[id]) removedCount++;
                    });
                }
                
                const updates = {
                    title: title,
                    meetingDate: meetingDate,
                    meetingTime: meetingTime,
                    format: format,
                    description: description
                };
                
                if (newMemberIds !== null) {
                    updates.memberIds = newMemberIds;
                }
                
                try {
                    const saveBtn = document.querySelector('.modal-footer button[data-action="save"]');
                    if (saveBtn) {
                        saveBtn.disabled = true;
                        saveBtn.innerHTML = '<span class="spinner"></span> Đang lưu...';
                    }
                    
                    await updateMeeting(meetingId, updates);
                    
                    // Thông báo chi tiết
                    let msg = '✅ Đã cập nhật cuộc họp!';
                    if (addedCount > 0 || removedCount > 0) {
                        const parts = [];
                        if (addedCount > 0) parts.push(`thêm ${addedCount} người`);
                        if (removedCount > 0) parts.push(`gỡ ${removedCount} người`);
                        msg += ` (${parts.join(', ')})`;
                    }
                    showToast(msg, 'success', 4000);
                    
                    close();
                    
                    // Refresh lại trang chi tiết
                    const container = document.getElementById('pageContainer');
                    if (container) {
                        await renderMeetingDetail(container, meetingId);
                    }
                } catch (error) {
                    console.error('Save edit error:', error);
                    showToast('Lỗi: ' + error.message, 'error');
                    
                    const saveBtn = document.querySelector('.modal-footer button[data-action="save"]');
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = 'Lưu thay đổi';
                    }
                }
            }
        }
    ]);
}
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
    
    // ============================================================
    // 1. THU THẬP DỮ LIỆU
    // ============================================================
    const contents = await getMeetingContents(meetingId);
    const tasks = await getTasks(meetingId);
    const confirmations = await getConfirmations(meetingId);
    const allDiscussions = await getDiscussions(meetingId);
    
    // Ánh xạ mã tổ
    const TEAM_CODE_MAP = {
        'van': 'NGỮ VĂN',
        'nguvan': 'NGỮ VĂN',
        'ngu_van': 'NGỮ VĂN',
        'toan': 'TOÁN',
        'toan_tin': 'TOÁN - TIN HỌC',
        'toantin': 'TOÁN - TIN HỌC',
        'tin': 'TIN HỌC',
        'tinhoc': 'TIN HỌC',
        'tin_hoc': 'TIN HỌC',
        'anh': 'TIẾNG ANH',
        'tienganh': 'TIẾNG ANH',
        'tieng_anh': 'TIẾNG ANH',
        'ly': 'VẬT LÝ',
        'vatly': 'VẬT LÝ',
        'vat_ly': 'VẬT LÝ',
        'hoa': 'HÓA HỌC',
        'hoahoc': 'HÓA HỌC',
        'hoa_hoc': 'HÓA HỌC',
        'sinh': 'SINH HỌC',
        'sinhhoc': 'SINH HỌC',
        'sinh_hoc': 'SINH HỌC',
        'khtn': 'KHOA HỌC TỰ NHIÊN',
        'khxh': 'KHOA HỌC XÃ HỘI',
        'su': 'LỊCH SỬ',
        'lichsu': 'LỊCH SỬ',
        'lich_su': 'LỊCH SỬ',
        'dia': 'ĐỊA LÝ',
        'dialy': 'ĐỊA LÝ',
        'dia_ly': 'ĐỊA LÝ',
        'gdcd': 'GIÁO DỤC CÔNG DÂN',
        'the_duc': 'THỂ DỤC',
        'theduc': 'THỂ DỤC',
        'gdtc_nt': 'GIÁO DỤC THỂ CHẤT - NGHỆ THUẬT',
        'cong_nghe': 'CÔNG NGHỆ',
        'congnghe': 'CÔNG NGHỆ',
        'van_phong': 'VĂN PHÒNG',
        'vanphong': 'VĂN PHÒNG',
        'am_nhac': 'ÂM NHẠC',
        'amnhac': 'ÂM NHẠC',
        'my_thuat': 'MỸ THUẬT',
        'mythuat': 'MỸ THUẬT',
        'demo': 'TỔ DEMO'
    };
    
    // Thu thập teamName
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
    
    if (!teamName && meeting.teamName && String(meeting.teamName).trim()) {
        teamName = String(meeting.teamName).trim();
    }
    if (!teamName && meeting.team && String(meeting.team).trim()) {
        teamName = String(meeting.team).trim();
    }
    
    let rawCode = '';
    if (meeting.teamCode) {
        rawCode = String(meeting.teamCode).trim();
    } else if (meeting.team) {
        rawCode = String(meeting.team).trim();
    } else if (meeting.teamId) {
        rawCode = String(meeting.teamId).trim();
    } else if (teamCode) {
        rawCode = String(teamCode).trim();
    } else if (meeting.code && typeof meeting.code === 'string') {
        const parts = meeting.code.split('-');
        if (parts.length >= 2 && parts[1]) {
            rawCode = parts[1].trim();
        }
    }
    
    const rawCodeLower = rawCode.toLowerCase().replace(/\s+/g, '');
    
    let displayTeamName = '..................';
    if (rawCodeLower && TEAM_CODE_MAP[rawCodeLower]) {
        displayTeamName = TEAM_CODE_MAP[rawCodeLower];
    } else if (teamName && teamName.trim()) {
        displayTeamName = teamName.trim().toUpperCase();
    } else if (rawCode) {
        displayTeamName = rawCode.toUpperCase();
    }
    
    // Chủ trì
    const BLANK_LINE = '..........................................';
    let chairmanName = '';
    if (meeting.chairmanId) {
        try {
            const snap = await db.ref(`users/${meeting.chairmanId}/displayName`).once('value');
            chairmanName = snap.val() || '';
        } catch (e) {}
    }
    if (!chairmanName || !chairmanName.trim()) {
        chairmanName = BLANK_LINE;
    }
    
    // Thư ký
    let secretaryName = BLANK_LINE;
    if (meeting.secretaryId) {
        try {
            const snap = await db.ref(`users/${meeting.secretaryId}/displayName`).once('value');
            const val = snap.val();
            if (val && val.trim()) {
                secretaryName = val.trim();
            }
        } catch (e) {
            secretaryName = BLANK_LINE;
        }
    }
    
    // Người chốt
    let closedByName = BLANK_LINE;
    if (meeting.closedBy) {
        try {
            const snap = await db.ref(`users/${meeting.closedBy}/displayName`).once('value');
            const val = snap.val();
            if (val && val.trim()) {
                closedByName = val.trim();
            }
        } catch (e) {
            closedByName = BLANK_LINE;
        }
    }
    
    // Người kết luận map
    let concludedByNameMap = {};
    for (const c of contents) {
        if (c.concludedBy && !concludedByNameMap[c.concludedBy]) {
            try {
                const snap = await db.ref(`users/${c.concludedBy}/displayName`).once('value');
                concludedByNameMap[c.concludedBy] = snap.val() || BLANK_LINE;
            } catch (e) {
                concludedByNameMap[c.concludedBy] = BLANK_LINE;
            }
        }
    }
    
    // Thành viên + xác nhận + BUILD memberNameMap cho multi-assignee
    const memberIds = Object.keys(meeting.memberIds || {});
    const memberList = [];
    const memberNameMap = {};
    
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
        memberNameMap[mid] = name;
    }
    memberList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    const authorNameMap = {};
    memberList.forEach(m => {
        authorNameMap[m.uid] = m.name;
    });
    
    // ============================================================
    // RESOLVE TÊN NGƯỜI ĐƯỢC GIAO — HỖ TRỢ MULTI-ASSIGNEE
    // ============================================================
    function resolveAssigneeName(task) {
        const assignedTo = task.assignedTo;
        const assignedToNames = task.assignedToNames || '';
        
        if (!assignedTo) {
            return assignedToNames || 'Chưa xác định';
        }
        
        if (typeof assignedTo === 'string') {
            if (assignedTo === '__ALL__') {
                return 'Tất cả thành viên';
            }
            return memberNameMap[assignedTo] || assignedToNames || assignedTo;
        }
        
        if (typeof assignedTo === 'object') {
            if (assignedTo['__ALL__'] === true) {
                return 'Tất cả thành viên';
            }
            
            const uids = Object.keys(assignedTo).filter(k => assignedTo[k] === true);
            if (uids.length === 0) return assignedToNames || 'Chưa xác định';
            
            const names = uids.map(uid => memberNameMap[uid] || uid.substring(0, 8) + '...');
            return names.join(', ');
        }
        
        return assignedToNames || 'Chưa xác định';
    }
    
    // Tasks chi tiết — đã áp dụng resolveAssigneeName
    const tasksDetailed = [];
    for (const t of tasks) {
        tasksDetailed.push({
            ...t,
            assigneeName: resolveAssigneeName(t)
        });
    }
    tasksDetailed.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    
    contents.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    
    // ============================================================
    // 2. HÀM TIỆN ÍCH
    // ============================================================
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
        if (disc.authorName && disc.authorName.trim()) return disc.authorName;
        if (disc.authorId && authorNameMap[disc.authorId]) return authorNameMap[disc.authorId];
        if (disc.userId && authorNameMap[disc.userId]) return authorNameMap[disc.userId];
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
    
    function resolveAttachmentUrl(att) {
        if (!att) return { finalUrl: '', fileId: '' };
        
        let finalUrl = att.url ? String(att.url).trim() : '';
        const fid = att.fileId || att.fid || '';
        const fileIdStr = fid ? String(fid).trim() : '';
        
        if (!finalUrl && fileIdStr) {
            finalUrl = `https://drive.google.com/file/d/${fileIdStr}/view?usp=sharing`;
        } else if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }
        
        return { finalUrl: finalUrl, fileId: fileIdStr };
    }
    
    function renderAttachList(attachments) {
        if (!attachments || Object.keys(attachments).length === 0) {
            return '';
        }
        const items = Object.values(attachments).map(att => {
            const fileName = att.fileName || att.name || 'Tài liệu';
            const desc = att.description || att.note || '';
            const resolved = resolveAttachmentUrl(att);
            const finalUrl = resolved.finalUrl;
            const fileId = resolved.fileId;
            
            let sub = '';
            
            if (fileId) {
                sub += `<div style="font-size:10pt;color:#000000;font-style:italic;margin-top:2px;">
                    File ID: <code style="font-family:Consolas,monospace;font-style:normal;background:#f0f0f0;padding:1px 4px;border-radius:3px;color:#000000;">${esc(fileId)}</code>
                </div>`;
            }
            if (desc) {
                sub += `<div style="font-size:10pt;color:#000000;margin-top:2px;">
                    <span style="font-style:italic;">Mô tả:</span> ${esc(desc)}
                </div>`;
            }
            
            if (finalUrl) {
                sub += `<div style="margin-top:4px;font-size:10pt;line-height:1.6;">
                    <span style="color:#000000;">🔗 Tài liệu đính kèm: </span>
                    <a href="${esc(finalUrl)}" style="color:#0000ee;text-decoration:underline;display:inline-block;white-space:nowrap;vertical-align:bottom;font-weight:bold;">${esc(finalUrl)}</a>
                </div>`;
            }
            
            return `
                <li style="margin-bottom:10px;line-height:1.5;page-break-inside:auto;break-inside:auto;">
                    <div style="font-weight:bold;font-size:11pt;color:#000000;">• ${esc(fileName)}</div>
                    ${sub}
                </li>
            `;
        }).join('');
        
        return `<ul style="margin:6px 0 0 20px;padding:0;list-style:none;">${items}</ul>`;
    }
    
    function renderDiscussionBlock(discussions, blockTitle) {
        if (!discussions || discussions.length === 0) {
            return '';
        }
        
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
                    const resolved = resolveAttachmentUrl(att);
                    const finalUrl = resolved.finalUrl;
                    
                    if (finalUrl) {
                        attList.push(`
                            <div style="font-size:10pt;margin-top:3px;padding-left:12px;line-height:1.6;">
                                <span style="color:#000000;">Đính kèm: </span>
                                <a href="${esc(finalUrl)}" style="color:#0000ee;text-decoration:underline;display:inline-block;white-space:nowrap;vertical-align:bottom;font-weight:bold;">${esc(finalUrl)}</a>
                            </div>
                        `);
                    }
                });
            }
            
            const replies = replyMap[disc.id] || [];
            replies.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            const repliesHtml = replies.map(r => renderOne(r, true)).join('');
            
            const itemStyle = isReply 
                ? 'margin-left:20px;padding-left:10px;border-left:1px solid #666666;margin-bottom:8px;' 
                : 'padding:6px 0;border-bottom:1px dotted #999999;margin-bottom:6px;';
            
            return `
                <div style="page-break-inside:auto;break-inside:auto;${itemStyle}">
                    <div style="font-size:10.5pt;line-height:1.5;">
                        <strong style="color:#000000;">${esc(authorName)}</strong>
                        <span style="color:#000000;font-style:italic;"> (${esc(timeStr)})${isEdited ? ' [đã chỉnh sửa]' : ''}${isReply ? ' [phản hồi]' : ''}:</span>
                    </div>
                    <div style="font-size:10.5pt;line-height:1.6;margin-top:2px;color:#000000;white-space:pre-wrap;">${contentHtml}</div>
                    ${attList.length > 0 ? `<div style="margin-top:3px;">${attList.join('')}</div>` : ''}
                    ${repliesHtml}
                </div>
            `;
        }
        
        const itemsHtml = rootDiscs.map(d => renderOne(d, false)).join('');
        
        return `
            <div style="margin-top:12px;padding:8px 0 4px 0;border-top:1px solid #000000;page-break-inside:auto;break-inside:auto;">
                <div style="font-weight:bold;font-style:italic;font-size:11pt;color:#000000;margin-bottom:6px;page-break-after:avoid;break-after:avoid;">
                    ${blockTitle} (${discussions.length} ý kiến):
                </div>
                <div>${itemsHtml}</div>
            </div>
        `;
    }
    
    // ============================================================
    // 3. BUILD HTML
    // ============================================================
    const meetingDateStr = formatDateVN(meeting.meetingDate || meeting.createdAt);
    const closedDateStr = meeting.closedAt ? formatDateVN(meeting.closedAt) : '';
    
    const totalMembers = memberList.length;
    const confirmedCount = memberList.filter(m => m.finalConfirmed).length;
    
    const membersHtml = memberList.map((m, idx) => {
        const status = m.finalConfirmed
            ? '<span style="color:#000000;font-weight:bold;">[Đã xác nhận]</span>'
            : '<span style="color:#000000;font-style:italic;">[Chưa xác nhận]</span>';
        return `
            <tr>
                <td style="text-align:center;padding:3px 6px;border:1px solid #000000;font-size:11px;line-height:1.25;color:#000000;">${idx + 1}</td>
                <td style="padding:3px 6px;border:1px solid #000000;font-size:11px;line-height:1.25;color:#000000;">${esc(m.name)}</td>
                <td style="padding:3px 6px;border:1px solid #000000;font-size:11px;line-height:1.25;color:#000000;">${esc(m.email)}</td>
                <td style="padding:3px 6px;border:1px solid #000000;text-align:center;font-size:11px;line-height:1.25;color:#000000;">${status}</td>
            </tr>
        `;
    }).join('');
    
    const contentsHtml = contents.length === 0
        ? `<p style="font-style:italic;color:#000000;">Chưa có nội dung nào.</p>`
        : contents.map((c, idx) => {
            const romanIdx = toRoman(idx + 1);
            
            const attachHtml = renderAttachList(c.attachments);
            const attachBlock = attachHtml ? `
                <div style="margin-top:8px;page-break-inside:auto;break-inside:auto;">
                    <div style="font-weight:bold;font-size:10.5pt;color:#000000;page-break-after:avoid;break-after:avoid;">Tài liệu thảo luận đính kèm:</div>
                    ${attachHtml}
                </div>
            ` : '';
            
            const contentDiscussions = allDiscussions.filter(d => d.contentId === c.id);
            const discussionBlock = renderDiscussionBlock(contentDiscussions, 'Ý kiến thảo luận');
            
            let conclusionBlock = '';
            if (c.conclusion && c.conclusion.trim()) {
                const conclusionAttachHtml = renderAttachList(c.conclusionAttachments);
                const conclusionAttachBlock = conclusionAttachHtml ? `
                    <div style="margin-top:8px;page-break-inside:auto;break-inside:auto;">
                        <div style="font-weight:bold;font-size:10.5pt;color:#000000;page-break-after:avoid;break-after:avoid;">Văn bản kết luận / Quyết định ban hành:</div>
                        ${conclusionAttachHtml}
                    </div>
                ` : '';
                
                const concludedByName = c.concludedBy
                    ? (concludedByNameMap[c.concludedBy] || BLANK_LINE)
                    : BLANK_LINE;
                
                conclusionBlock = `
                    <div style="margin-top:10px;padding:8px 0 8px 12px;border-left:2px solid #000000;page-break-inside:auto;break-inside:auto;">
                        <div style="font-weight:bold;margin-bottom:4px;color:#000000;font-size:10.5pt;page-break-after:avoid;break-after:avoid;">
                            KẾT LUẬN CỦA TỔ TRƯỞNG:
                        </div>
                        <div style="white-space:pre-wrap;line-height:1.6;font-size:10.5pt;color:#000000;">${esc(c.conclusion)}</div>
                        <div style="font-size:9.5pt;color:#000000;margin-top:6px;font-style:italic;">
                            Người kết luận: ${esc(concludedByName)} — ${formatDateVN(c.concludedAt)}
                        </div>
                        ${conclusionAttachBlock}
                    </div>
                `;
            } else {
                conclusionBlock = `
                    <div style="margin-top:10px;padding:6px 0;border-top:1px dotted #999999;page-break-inside:auto;break-inside:auto;">
                        <em style="font-size:10.5pt;color:#000000;">Nội dung này chưa có kết luận chính thức.</em>
                    </div>
                `;
            }
            
            return `
                <div style="margin-top:14px;page-break-inside:auto;break-inside:auto;">
                    <div style="font-weight:bold;font-size:12pt;margin-bottom:6px;color:#000000;page-break-after:avoid;break-after:avoid;">
                        ${romanIdx}. ${esc(c.title)}
                    </div>
                    <div style="margin-left:16px;">
                        <div style="white-space:pre-wrap;line-height:1.6;font-size:10.5pt;color:#000000;">${esc(c.description || '(Không có mô tả)')}</div>
                        ${attachBlock}
                        ${discussionBlock}
                        ${conclusionBlock}
                    </div>
                </div>
            `;
        }).join('');
    
    const generalDiscussions = allDiscussions.filter(d => !d.contentId);
    const generalDiscussionBlock = renderDiscussionBlock(generalDiscussions, 'Ý kiến thảo luận chung');
    
    let tasksHtml = '';
    if (tasksDetailed.length === 0) {
        tasksHtml = `<p style="font-style:italic;color:#000000;">Chưa có nhiệm vụ nào được phân công.</p>`;
    } else {
        tasksHtml = `
            <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:11pt;page-break-inside:auto;break-inside:auto;">
                <thead>
                    <tr>
                        <th style="border:1px solid #000000;padding:4px;width:35px;font-size:10.5pt;background:#f0f0f0;color:#000000;">STT</th>
                        <th style="border:1px solid #000000;padding:4px;font-size:10.5pt;background:#f0f0f0;color:#000000;">Người thực hiện</th>
                        <th style="border:1px solid #000000;padding:4px;font-size:10.5pt;background:#f0f0f0;color:#000000;">Nội dung</th>
                        <th style="border:1px solid #000000;padding:4px;width:85px;font-size:10.5pt;background:#f0f0f0;color:#000000;">Hạn</th>
                        <th style="border:1px solid #000000;padding:4px;font-size:10.5pt;background:#f0f0f0;color:#000000;">Sản phẩm</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasksDetailed.map((t, i) => `
                        <tr>
                            <td style="border:1px solid #000000;padding:4px;text-align:center;font-size:10.5pt;color:#000000;">${i + 1}</td>
                            <td style="border:1px solid #000000;padding:4px;font-size:10.5pt;color:#000000;">${esc(t.assigneeName)}</td>
                            <td style="border:1px solid #000000;padding:4px;font-size:10.5pt;color:#000000;">${esc(t.title || '')}${t.description ? `<br><em style="color:#000000;font-size:10pt;">${esc(t.description)}</em>` : ''}</td>
                            <td style="border:1px solid #000000;padding:4px;text-align:center;font-size:10.5pt;color:#000000;">${formatDeadlineVN(t.deadline)}</td>
                            <td style="border:1px solid #000000;padding:4px;font-size:10.5pt;color:#000000;">${esc(t.product || '—')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    let forceCloseBlock = '';
    if (meeting.forceCloseReason) {
        forceCloseBlock = `
            <div style="margin-top:12px;padding:8px 12px;border:1px solid #000000;page-break-inside:auto;break-inside:auto;">
                <strong style="color:#000000;">Ghi chú chốt ngoại lệ:</strong>
                <div style="margin-top:4px;line-height:1.6;color:#000000;">${esc(meeting.forceCloseReason)}</div>
                <div style="font-size:10pt;color:#000000;margin-top:4px;font-style:italic;">
                    (Chốt ngày ${meeting.forceClosedAt ? formatDateVN(meeting.forceClosedAt) : closedDateStr})
                </div>
            </div>
        `;
    }
    
    const meetingDayNum = meeting.meetingDate ? new Date(meeting.meetingDate).getDate() : '...';
    const meetingMonthNum = meeting.meetingDate ? (new Date(meeting.meetingDate).getMonth() + 1) : '...';
    const meetingYearNum = meeting.meetingDate ? new Date(meeting.meetingDate).getFullYear() : '......';
    
    // ============================================================
    // 4. BUILD HTML — CHỈ STYLE + DIV (KHÔNG DOCTYPE)
    // ============================================================
    const documentHtml = `
<style>
    @media screen {
        #meeting-print-section { display: none !important; }
    }
    
    @media print {
        body > :not(#meeting-print-section) {
            display: none !important;
        }
        
        #meeting-print-section {
            display: block !important;
            width: 100%;
            position: absolute;
            top: 0;
            left: 0;
            background: #ffffff;
            color: #000000;
            font-family: "Times New Roman", "Liberation Serif", serif;
            font-size: 12pt;
            line-height: 1.5;
        }
        
        @page {
            size: A4;
            margin: 12mm 12mm 12mm 12mm;
        }
        
        #meeting-print-section * {
            box-sizing: border-box;
        }
        
        #meeting-print-section table,
        #meeting-print-section thead,
        #meeting-print-section tbody,
        #meeting-print-section tr,
        #meeting-print-section td,
        #meeting-print-section th,
        #meeting-print-section div,
        #meeting-print-section ul,
        #meeting-print-section ol,
        #meeting-print-section li,
        #meeting-print-section p {
            page-break-inside: auto !important;
            break-inside: auto !important;
        }
        
        #meeting-print-section h1,
        #meeting-print-section h2,
        #meeting-print-section h3,
        #meeting-print-section h4,
        #meeting-print-section h5,
        #meeting-print-section h6 {
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        
        #meeting-print-section .members-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            line-height: 1.25;
        }
        
        #meeting-print-section .members-table th,
        #meeting-print-section .members-table td {
            padding: 3px 6px !important;
            border: 1px solid #000000;
            color: #000000;
        }
        
        #meeting-print-section .members-table th {
            background: #f0f0f0;
            font-weight: bold;
            text-align: left;
            font-size: 11px;
        }
        
        #meeting-print-section a {
            color: #0000ee !important;
            text-decoration: underline !important;
        }
        
        #meeting-print-section a[href^="http"] {
            color: #0000ee !important;
            text-decoration: underline !important;
        }
        
        #meeting-print-section .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
            font-size: 12pt;
            gap: 8px;
        }
        
        #meeting-print-section .header-left {
            flex: 0 0 48%;
            max-width: 48%;
            text-align: center;
            line-height: 1.4;
        }
        
        #meeting-print-section .header-right {
            flex: 0 0 52%;
            max-width: 52%;
            text-align: center;
            line-height: 1.4;
        }
        
        #meeting-print-section .header-left strong,
        #meeting-print-section .header-right strong {
            display: block;
            color: #000000;
        }
        
        #meeting-print-section .header-school {
            white-space: nowrap;
            font-size: 12pt;
        }
        
        #meeting-print-section .header-right strong {
            white-space: nowrap;
            font-size: 11.5pt;
        }
        
        #meeting-print-section .header-sub {
            font-weight: normal;
            font-size: 11pt;
            color: #000000;
        }
        
        #meeting-print-section .title {
            text-align: center;
            margin: 20px 0 4px 0;
            font-size: 15pt;
            font-weight: bold;
            letter-spacing: 1px;
            color: #000000;
            page-break-after: avoid;
            break-after: avoid;
        }
        
        #meeting-print-section .subtitle {
            text-align: center;
            font-size: 11pt;
            font-style: italic;
            margin-bottom: 16px;
            color: #000000;
            page-break-after: avoid;
            break-after: avoid;
        }
        
        #meeting-print-section .meta-table {
            width: 100%;
            font-size: 11pt;
            margin-bottom: 14px;
            color: #000000;
        }
        
        #meeting-print-section .meta-table td {
            vertical-align: top;
            padding: 2px 4px;
            color: #000000;
        }
        
        #meeting-print-section .section-heading {
            font-weight: bold;
            font-size: 12pt;
            margin: 14px 0 8px 0;
            text-transform: uppercase;
            border-bottom: 1px solid #000000;
            padding-bottom: 3px;
            color: #000000;
        }
        
        #meeting-print-section .signature-block {
            margin-top: 30px;
            display: flex;
            justify-content: space-around;
            page-break-inside: avoid;
            break-inside: avoid;
            color: #000000;
        }
        
        #meeting-print-section .signature-col {
            width: 45%;
            text-align: center;
        }
        
        #meeting-print-section .signature-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 4px;
            color: #000000;
        }
        
        #meeting-print-section .signature-note {
            font-size: 10.5pt;
            font-style: italic;
            margin-bottom: 60px;
            color: #000000;
        }
        
        #meeting-print-section .signature-name {
            font-size: 12pt;
            font-weight: bold;
            color: #000000;
        }
        
        #meeting-print-section .footer-note {
            text-align: center;
            font-size: 10pt;
            color: #000000;
            margin-top: 20px;
            font-style: italic;
        }
    }
</style>

<div class="page-wrapper">

    <div class="header">
        <div class="header-left">
            <strong>SỞ GIÁO DỤC VÀ ĐÀO TẠO VĨNH LONG</strong>
            <strong class="header-school">TRƯỜNG THCS&THPT TRẦN TRƯỜNG SINH</strong>
            <div class="header-sub">TỔ: ${esc(displayTeamName)}</div>
            <div class="header-sub">─────────</div>
            <div style="font-size:11pt;margin-top:4px;color:#000000;">Số: <strong>${esc(meeting.code || '.......')}</strong></div>
        </div>
        <div class="header-right">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
            <div style="font-weight:bold;color:#000000;white-space:nowrap;">Độc lập - Tự do - Hạnh phúc</div>
            <div class="header-sub">─────────</div>
            <div style="font-size:11pt;margin-top:4px;font-style:italic;color:#000000;">
                Thạnh Phong, ngày ${meetingDayNum} tháng ${meetingMonthNum} năm ${meetingYearNum}
            </div>
        </div>
    </div>

    <div class="title">BIÊN BẢN SINH HOẠT TỔ CHUYÊN MÔN</div>
    <div class="subtitle">(Về việc: ${esc(meeting.title || '')})</div>

    <table class="meta-table">
        <tr><td style="width:130px;padding:2px 4px;">Mã hồ sơ:</td><td style="width:10px;">:</td><td><strong>${esc(meeting.code || '—')}</strong></td></tr>
        <tr><td style="padding:2px 4px;">Thời gian:</td><td>:</td><td>${formatTimeOnly(meeting.createdAt || meeting.meetingDate)} — ngày ${esc(meetingDateStr)}</td></tr>
        <tr><td style="padding:2px 4px;">Hình thức:</td><td>:</td><td>${formatLabel(meeting.format)}</td></tr>
        <tr><td style="padding:2px 4px;">Người chủ trì:</td><td>:</td><td>${esc(chairmanName)}</td></tr>
        <tr><td style="padding:2px 4px;">Thư ký:</td><td>:</td><td>${esc(secretaryName)}</td></tr>
    </table>

    <div class="section-heading">I. Thành phần tham dự</div>
    <p style="margin:0 0 6px 0;font-size:11pt;color:#000000;">
        Tổng số thành viên được triệu tập: <strong>${totalMembers}</strong> người.
        Đã xác nhận: <strong>${confirmedCount}</strong>/${totalMembers} người.
    </p>
    <table class="members-table">
        <thead>
            <tr>
                <th style="width:40px;text-align:center;">STT</th>
                <th>Họ và tên</th>
                <th>Email</th>
                <th style="width:130px;text-align:center;">Trạng thái</th>
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

    <p style="margin-top:16px;font-style:italic;font-size:11pt;color:#000000;">
        Biên bản kết thúc vào ${formatTimeOnly(meeting.closedAt)} — ngày ${esc(closedDateStr || meetingDateStr)}.
        ${meeting.closedBy ? `Hồ sơ được chốt bởi <strong>${esc(closedByName)}</strong>.` : ''}
    </p>

    <div class="signature-block">
        <div class="signature-col">
            <div class="signature-title">CHỦ TRÌ CUỘC HỌP</div>
            <div class="signature-note">(Ký, ghi rõ họ tên)</div>
            <div class="signature-name">${esc(chairmanName)}</div>
        </div>
        <div class="signature-col">
            <div class="signature-title">THƯ KÝ</div>
            <div class="signature-note">(Ký, ghi rõ họ tên)</div>
            <div class="signature-name">${esc(secretaryName)}</div>
        </div>
    </div>

    <div class="footer-note">
        — Hết biên bản —
        <div style="margin-top:6px;font-size:9pt;color:#000000;">
            Trường THCS-THPT Trần Trường Sinh — Hệ thống Quản lý Sinh hoạt Chuyên môn
        </div>
        <div style="margin-top:2px;font-size:8pt;color:#333333;">
            Trích xuất lúc ${formatDateVN(Date.now())} ${formatTimeOnly(Date.now())}
        </div>
    </div>

</div>
    `.trim();
    
    // ============================================================
    // 5. IN TRỰC TIẾP TRÊN DOM GỐC
    // ============================================================
    const existingPrint = document.getElementById('meeting-print-section');
    if (existingPrint) existingPrint.remove();
    
    const printDiv = document.createElement('div');
    printDiv.id = 'meeting-print-section';
    printDiv.innerHTML = documentHtml;
    document.body.appendChild(printDiv);
    
    setTimeout(function() {
        try {
            window.focus();
            window.print();
        } catch (e) {
            console.warn('Không thể gọi lệnh in:', e);
            showToast('Không thể mở hộp thoại in. Vui lòng bấm Ctrl+P thủ công.', 'warning', 5000);
        }
        
        setTimeout(function() {
            const el = document.getElementById('meeting-print-section');
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 2000);
    }, 500);
    
    try {
        await logActivity(
            meetingId, uid, 'EXPORT_MINUTES', 'MEETING', meetingId,
            `Đã xuất biên bản cuộc họp (${allDiscussions.length} ý kiến thảo luận, ${tasksDetailed.length} nhiệm vụ)`
        );
    } catch (e) {
        console.warn('Không ghi được log export:', e);
    }
    
    showToast('✅ Đang mở hộp thoại in. Chọn "Save as PDF" để lưu.', 'success', 4000);
}

window.toggleAllAssignees = toggleAllAssignees;
window.selectAllMembersOption = selectAllMembersOption;

window.exportMeetingMinutes = exportMeetingMinutes;
/**
 * Hàm phụ: chọn/bỏ chọn tất cả thành viên tổ chuyên môn
 * @param {boolean} checked - true: chọn tất cả, false: bỏ chọn tất cả
 */
function toggleAllMembers(checked) {
    document.querySelectorAll('.member-checkbox').forEach(cb => {
        cb.checked = checked;
    });
}
/**
 * Toggle mở/đóng khu vực thảo luận của một nội dung
 * Lazy load danh sách ý kiến + form nhập khi mở lần đầu
 * @param {string} meetingId
 * @param {string} contentId
 */
async function toggleContentDiscussion(meetingId, contentId) {
    const accordion = document.getElementById(`disc_accordion_${contentId}`);
    const body = document.getElementById(`discussions_${contentId}`);
    const toggleBtn = document.querySelector(`[data-disc-toggle="${contentId}"]`);
    
    if (!accordion || !body) {
        console.error('Không tìm thấy accordion thảo luận cho content', contentId);
        return;
    }
    
    const isOpen = accordion.classList.contains('open');
    
    if (isOpen) {
        accordion.classList.remove('open');
        if (toggleBtn) toggleBtn.classList.remove('open');
    } else {
        accordion.classList.add('open');
        if (toggleBtn) toggleBtn.classList.add('open');
        
        if (!body.dataset.loaded) {
            body.innerHTML = `
                <div class="discussion-loading">
                    <div class="loader"></div>
                    <div>Đang tải thảo luận...</div>
                </div>
            `;
            try {
                await renderDiscussions(meetingId, contentId, body);
                body.dataset.loaded = 'true';
            } catch (err) {
                console.error('Lỗi tải thảo luận:', err);
                body.innerHTML = `
                    <div class="empty-state" style="padding:20px;text-align:center;color:var(--danger);">
                        <i class="fas fa-exclamation-circle" style="font-size:24px;"></i>
                        <p style="margin-top:8px;">Lỗi tải thảo luận: ${escapeHtml(err.message)}</p>
                    </div>
                `;
            }
        }
        
        setTimeout(() => {
            accordion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
    }
}

window.toggleContentDiscussion = toggleContentDiscussion;


/**
 * Mở form Sửa nhiệm vụ
 * Đọc dữ liệu task từ DB, pre-fill vào form, hiển thị checkbox đúng
 * @param {string} meetingId
 * @param {string} taskId
 */
async function showEditTask(meetingId, taskId) {
    if (!meetingId || !taskId) {
        showToast('Thiếu thông tin nhiệm vụ. Vui lòng refresh trang.', 'error');
        return;
    }
    
    // Load task từ DB
    const taskSnap = await db.ref(`tasks/${meetingId}/${taskId}`).once('value');
    const task = taskSnap.val();
    if (!task) {
        showToast('Không tìm thấy nhiệm vụ', 'error');
        return;
    }
    
    if (task.confirmed) {
        showToast('Không thể sửa nhiệm vụ đã được xác nhận', 'warning');
        return;
    }
    
    // Load meeting
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
        showToast('Không tìm thấy cuộc họp', 'error');
        return;
    }
    
    const memberIds = Object.keys(meeting.memberIds || {});
    if (memberIds.length === 0) {
        showToast('Cuộc họp chưa có thành viên nào', 'warning');
        return;
    }
    
    // Load tên các thành viên
    const membersInfo = [];
    for (const mid of memberIds) {
        try {
            const snap = await db.ref(`users/${mid}`).once('value');
            const ud = snap.val() || {};
            membersInfo.push({
                uid: mid,
                displayName: ud.displayName || ud.email || mid,
                email: ud.email || ''
            });
        } catch (e) {
            membersInfo.push({ uid: mid, displayName: mid, email: '' });
        }
    }
    membersInfo.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    
    // Parse assignedTo hiện tại
    let currentAssignedMap = {};
    let isAllMembers = false;
    
    if (task.assignedTo) {
        if (typeof task.assignedTo === 'string') {
            if (task.assignedTo === '__ALL__') {
                isAllMembers = true;
            } else {
                currentAssignedMap[task.assignedTo] = true;
            }
        } else if (typeof task.assignedTo === 'object') {
            if (task.assignedTo['__ALL__'] === true) {
                isAllMembers = true;
            } else {
                Object.keys(task.assignedTo).forEach(k => {
                    if (task.assignedTo[k] === true) currentAssignedMap[k] = true;
                });
            }
        }
    }
    
    // Build checkbox list với pre-check
    const checkboxesHtml = membersInfo.map(m => {
        const isChecked = currentAssignedMap[m.uid] === true;
        return `
            <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#ffffff;border:1px solid ${isChecked ? '#93c5fd' : '#e2e8f0'};border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:6px;transition:all 0.2s;">
                <input type="checkbox" class="edit-assignee-checkbox" value="${m.uid}" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;margin:0;cursor:pointer;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${escapeHtml(m.displayName)}
                    </div>
                    ${m.email ? `<div style="font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.email)}</div>` : ''}
                </div>
            </label>
        `;
    }).join('');
    
    const allMembersStyle = isAllMembers ? 'display:block;' : 'display:none;';
    
    showModal('✏️ Sửa nhiệm vụ', `
        <div class="form-group">
            <label>Người thực hiện <span class="required">*</span></label>
            
            <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
                <button type="button" class="btn-secondary" style="padding:6px 12px;font-size:13px;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;border-radius:6px;font-weight:600;cursor:pointer;" onclick="toggleEditAllAssignees(true)">
                    <i class="fas fa-check-double"></i> Chọn tất cả
                </button>
                <button type="button" class="btn-secondary" style="padding:6px 12px;font-size:13px;" onclick="toggleEditAllAssignees(false)">
                    <i class="fas fa-times"></i> Bỏ chọn
                </button>
                <button type="button" class="btn-secondary" style="padding:6px 12px;font-size:13px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:6px;font-weight:600;cursor:pointer;" onclick="selectEditAllMembersOption()">
                    <i class="fas fa-users"></i> Tất cả thành viên
                </button>
            </div>
            
            <div id="editAssigneeListBox" style="max-height:220px;overflow-y:auto;padding:10px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;">
                ${checkboxesHtml}
            </div>
            
            <div id="editAllMembersBadge" style="margin-top:8px;padding:10px 14px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;font-size:13px;color:#92400e;font-weight:600;${allMembersStyle}">
                <i class="fas fa-users"></i> Đã chọn: <strong>Tất cả thành viên</strong> — sẽ được giao cho mọi người trong cuộc họp
            </div>
        </div>
        
        <div class="form-group">
            <label>Nội dung nhiệm vụ <span class="required">*</span></label>
            <input type="text" id="editTaskTitle" value="${escapeHtml(task.title || '')}" placeholder="Mô tả nhiệm vụ">
        </div>
        
        <div class="form-group">
            <label>Chi tiết</label>
            <textarea id="editTaskDesc" rows="3" placeholder="Chi tiết nhiệm vụ...">${escapeHtml(task.description || '')}</textarea>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Thời hạn <span class="required">*</span></label>
                <input type="date" id="editTaskDeadline" value="${task.deadline || ''}">
            </div>
            <div class="form-group">
                <label>Sản phẩm cần nộp</label>
                <input type="text" id="editTaskProduct" value="${escapeHtml(task.product || '')}" placeholder="VD: File Word, PDF...">
            </div>
        </div>
    `, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: 'Lưu thay đổi',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                await handleEditTask(meetingId, taskId, membersInfo, close);
            }
        }
    ]);
}

/**
 * Toggle tất cả checkbox trong form SỬA nhiệm vụ
 * @param {boolean} checked
 */
function toggleEditAllAssignees(checked) {
    document.querySelectorAll('.edit-assignee-checkbox').forEach(cb => {
        cb.checked = checked;
    });
    const badge = document.getElementById('editAllMembersBadge');
    if (badge) badge.style.display = 'none';
}

/**
 * Chọn "Tất cả thành viên" trong form SỬA nhiệm vụ
 */
function selectEditAllMembersOption() {
    document.querySelectorAll('.edit-assignee-checkbox').forEach(cb => {
        cb.checked = false;
    });
    const badge = document.getElementById('editAllMembersBadge');
    if (badge) {
        badge.style.display = badge.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Xử lý lưu form Sửa nhiệm vụ
 * @param {string} meetingId
 * @param {string} taskId
 * @param {Array} membersInfo - Mảng {uid, displayName}
 * @param {Function} closeModalFn
 */
async function handleEditTask(meetingId, taskId, membersInfo, closeModalFn) {
    const title = document.getElementById('editTaskTitle').value.trim();
    const deadline = document.getElementById('editTaskDeadline').value;
    const desc = document.getElementById('editTaskDesc').value.trim();
    const product = document.getElementById('editTaskProduct').value.trim();
    
    if (!title || !deadline) {
        showToast('Vui lòng nhập đầy đủ tiêu đề và thời hạn', 'warning');
        return;
    }
    
    // Thu thập assignees
    const selectedUids = {};
    document.querySelectorAll('.edit-assignee-checkbox:checked').forEach(cb => {
        selectedUids[cb.value] = true;
    });
    
    const badge = document.getElementById('editAllMembersBadge');
    const isAllMembers = badge && badge.style.display !== 'none';
    
    if (!isAllMembers && Object.keys(selectedUids).length === 0) {
        showToast('Vui lòng chọn ít nhất một người thực hiện', 'warning');
        return;
    }
    
    // Chuẩn bị assignedTo mới
    let assignedTo;
    let assignedToNames;
    
    if (isAllMembers) {
        assignedTo = { '__ALL__': true };
        assignedToNames = 'Tất cả thành viên';
    } else {
        assignedTo = selectedUids;
        const names = Object.keys(selectedUids).map(uid => {
            const m = membersInfo.find(x => x.uid === uid);
            return m ? m.displayName : uid;
        });
        assignedToNames = names.join(', ');
    }
    
    try {
        const saveBtn = document.querySelector('.modal-footer button[data-action="save"]');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner"></span> Đang lưu...';
        }
        
        await updateTask(meetingId, taskId, {
            assignedTo: assignedTo,
            assignedToNames: assignedToNames,
            title: title,
            description: desc,
            deadline: deadline,
            product: product || 'Chưa xác định'
        });
        
        showToast('✅ Đã cập nhật nhiệm vụ!', 'success');
        closeModalFn();
        
        const container = document.getElementById('pageContainer');
        if (container) {
            await renderMeetingDetail(container, meetingId);
        }
    } catch (error) {
        showToast('Lỗi: ' + error.message, 'error');
        const saveBtn = document.querySelector('.modal-footer button[data-action="save"]');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Lưu thay đổi';
        }
    }
}

window.showEditTask = showEditTask;
window.toggleEditAllAssignees = toggleEditAllAssignees;
window.selectEditAllMembersOption = selectEditAllMembersOption;
window.handleEditTask = handleEditTask;
// Export
window.toggleAllMembers = toggleAllMembers;
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