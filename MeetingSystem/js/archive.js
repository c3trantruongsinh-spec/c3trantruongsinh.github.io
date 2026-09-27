// ============================================================
// ARCHIVE MODULE — Hồ sơ điện tử
// Trường THCS-THPT Trần Trường Sinh
// Phân quyền:
//   - Admin: xem TẤT CẢ hồ sơ đã chốt của mọi tổ
//   - Các role khác: chỉ xem hồ sơ tổ mình HOẶC hồ sơ mình là khách mời
// ============================================================

/**
 * Hàm chính: Render trang Hồ sơ điện tử
 * @param {HTMLElement} container
 */
async function renderArchive(container) {
    const uid = getCurrentUid();
    if (!uid) return;
    
    const userData = await getCurrentUserData();
    const role = await getCurrentUserRole();
    const teamId = await getCurrentUserTeamId();
    const isAdminUser = role === 'admin';
    
    // ==== 1. LẤY TẤT CẢ MEETINGS ====
    let allMeetings = [];
    try {
        const snapshot = await db.ref('meetings').once('value');
        const data = snapshot.val() || {};
        allMeetings = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    } catch (err) {
        console.error('Error loading meetings:', err);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle" style="color:var(--danger);"></i>
                <h3>Lỗi tải dữ liệu</h3>
                <p>${escapeHtml(err.message)}</p>
            </div>
        `;
        return;
    }
    
    // ==== 2. CHỈ LẤY HỒ SƠ ĐÃ CHỐT ====
    let closedMeetings = allMeetings.filter(m => m.status === 'CLOSED');
    
    // ==== 3. ÁP DỤNG PHÂN QUYỀN ====
    if (!isAdminUser) {
        closedMeetings = closedMeetings.filter(m => {
            if (teamId && m.teamId === teamId) return true;
            if (m.memberIds && m.memberIds[uid] === true) return true;
            return false;
        });
    }
    
    // ==== 4. LẤY DANH SÁCH TỔ ĐỂ BUILD FILTER ====
    let teamsData = {};
    try {
        const teamsSnap = await db.ref('teams').once('value');
        teamsData = teamsSnap.val() || {};
    } catch (err) {
        console.warn('Không load được danh sách tổ:', err);
    }
    
    const teamNameMap = {};
    Object.keys(teamsData).forEach(tid => {
        teamNameMap[tid] = teamsData[tid].name || tid;
    });
    
    // ==== 5. SẮP XẾP MỚI NHẤT LÊN ĐẦU ====
    closedMeetings.sort((a, b) => {
        const ta = b.closedAt || b.createdAt || 0;
        const tb = a.closedAt || a.createdAt || 0;
        return ta - tb;
    });
    
    // ==== 6. LƯU STATE VÀO WINDOW ĐỂ FILTER ====
    window._archiveAllMeetings = closedMeetings;
    window._archiveTeamNameMap = teamNameMap;
    window._archiveIsAdmin = isAdminUser;
    window._archiveUserTeamId = teamId;
    window._archiveUid = uid;
    
    // ==== 7. BUILD FILTER OPTIONS ====
    let teamFilterOptions = '';
    if (isAdminUser) {
        const teamIds = Object.keys(teamsData).sort();
        teamFilterOptions = `<option value="">🏫 Tất cả các tổ</option>`;
        if (teamIds.length === 0) {
            teamFilterOptions += `<option value="" disabled>(Chưa có tổ nào)</option>`;
        } else {
            teamIds.forEach(tid => {
                teamFilterOptions += `<option value="${tid}">Tổ: ${escapeHtml(teamNameMap[tid])}</option>`;
            });
        }
    }
    
    const currentYear = new Date().getFullYear();
    let yearOptionsHtml = '';
    for (let y = currentYear; y >= currentYear - 5; y--) {
        yearOptionsHtml += `<option value="${y}">Năm ${y}</option>`;
    }
    
    // ==== 8. BUILD HTML ====
    let html = `
        <div class="section-card">
            <div class="section-header">
                <h3>📁 Tra cứu cuộc họp</h3>
                <div class="stat-info">
                    <i class="fas fa-archive"></i>
                    Tổng: <span class="num" id="archiveCount">${closedMeetings.length}</span> hồ sơ
                </div>
            </div>
            
            <div style="background:var(--gray-50);border-radius:10px;padding:14px;margin-bottom:16px;border:1px solid var(--gray-200);">
                <div style="font-size:13px;font-weight:700;color:var(--gray-600);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">
                    <i class="fas fa-filter"></i> Bộ lọc tra cứu
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
                    ${isAdminUser ? `
                        <div>
                            <label style="font-size:12px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">Tổ chuyên môn</label>
                            <select id="archiveTeamFilter" onchange="filterArchive()" style="width:100%;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:14px;background:#fff;font-family:inherit;cursor:pointer;">
                                ${teamFilterOptions}
                            </select>
                        </div>
                    ` : ''}
                    <div>
                        <label style="font-size:12px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">Tháng</label>
                        <select id="archiveMonthFilter" onchange="filterArchive()" style="width:100%;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:14px;background:#fff;font-family:inherit;cursor:pointer;">
                            <option value="">Tất cả các tháng</option>
                            <option value="1">Tháng 1</option>
                            <option value="2">Tháng 2</option>
                            <option value="3">Tháng 3</option>
                            <option value="4">Tháng 4</option>
                            <option value="5">Tháng 5</option>
                            <option value="6">Tháng 6</option>
                            <option value="7">Tháng 7</option>
                            <option value="8">Tháng 8</option>
                            <option value="9">Tháng 9</option>
                            <option value="10">Tháng 10</option>
                            <option value="11">Tháng 11</option>
                            <option value="12">Tháng 12</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:12px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">Năm</label>
                        <select id="archiveYearFilter" onchange="filterArchive()" style="width:100%;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:14px;background:#fff;font-family:inherit;cursor:pointer;">
                            <option value="">Tất cả các năm</option>
                            ${yearOptionsHtml}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:12px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">Tìm kiếm</label>
                        <input type="text" id="archiveSearch" oninput="filterArchive()" placeholder="Tên hoặc mã hồ sơ..." style="width:100%;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:14px;background:#fff;font-family:inherit;">
                    </div>
                </div>
                ${!isAdminUser ? `
                    <div style="margin-top:10px;padding:8px 12px;background:#dbeafe;border-radius:6px;font-size:12px;color:#1e40af;">
                        <i class="fas fa-info-circle"></i>
                        Bạn chỉ thấy hồ sơ thuộc tổ chuyên môn của mình hoặc những cuộc họp mà bạn được mời tham gia.
                    </div>
                ` : `
                    <div style="margin-top:10px;padding:8px 12px;background:#fef3c7;border-radius:6px;font-size:12px;color:#92400e;">
                        <i class="fas fa-crown"></i>
                        <strong>Quyền Admin:</strong> Bạn có thể xem hồ sơ của tất cả các tổ chuyên môn.
                    </div>
                `}
            </div>
            
            <div id="archiveListContainer">
                ${renderArchiveListHTML(closedMeetings, teamNameMap, isAdminUser)}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Helper: Render danh sách hồ sơ dạng HTML
 * Đã rút gọn: chỉ còn nút "Xem chi tiết" (bỏ nút Xuất PDF ở ngoài)
 * @param {Array} meetings - Danh sách meetings
 * @param {Object} teamNameMap - Map teamId → team name
 * @param {boolean} isAdmin - User có phải admin không
 * @returns {string} HTML
 */
function renderArchiveListHTML(meetings, teamNameMap, isAdmin) {
    if (!meetings || meetings.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-archive" style="font-size:40px;color:var(--gray-300);"></i>
                <h3>Chưa có hồ sơ nào</h3>
                <p>Hồ sơ sẽ xuất hiện sau khi cuộc họp được chốt.</p>
            </div>
        `;
    }
    
    return meetings.map(m => {
        const teamLabel = teamNameMap[m.teamId] || m.teamId || '—';
        const memberCount = m.memberIds ? Object.keys(m.memberIds).length : 0;
        
        return `
            <div class="meeting-card" style="margin-bottom:10px;cursor:default;border-left:4px solid var(--primary);">
                <div class="meeting-card-header">
                    <div style="flex:1;min-width:0;">
                        <div class="meeting-card-title" 
                             style="cursor:pointer;color:var(--primary);font-weight:700;transition:color 0.2s;" 
                             onmouseover="this.style.color='var(--accent)';" 
                             onmouseout="this.style.color='var(--primary)';" 
                             onclick="openArchiveDetail('${m.id}')" 
                             title="Click để xem chi tiết hồ sơ">
                            📄 ${escapeHtml(m.title || 'Không tiêu đề')}
                        </div>
                        <div style="font-size:13px;color:var(--gray-500);margin-top:3px;">
                            <span style="font-family:monospace;background:var(--gray-100);padding:1px 8px;border-radius:4px;">
                                ${escapeHtml(m.code || 'Chưa có mã')}
                            </span>
                            ${isAdmin && m.teamId ? ` • Tổ: <span style="color:#0284c7;font-weight:600;">${escapeHtml(teamLabel)}</span>` : ''}
                        </div>
                    </div>
                    ${getStatusBadge(m.status)}
                </div>
                <div class="meeting-card-body" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:16px;">
                    <span><i class="far fa-calendar"></i> ${formatDate(m.meetingDate)}</span>
                    <span><i class="fas fa-users"></i> ${memberCount} thành viên</span>
                    <span><i class="fas fa-lock"></i> Chốt: ${formatDate(m.closedAt, true)}</span>
                    <span><i class="fas fa-user-check"></i> Người chốt: ${escapeHtml(m.closedBy || '—')}</span>
                </div>
                <div class="meeting-card-footer" style="margin-top:10px;display:flex;justify-content:flex-end;">
                    <button class="btn-secondary" style="padding:6px 18px;font-size:13px;font-weight:600;" onclick="event.stopPropagation();openArchiveDetail('${m.id}')">
                        <i class="fas fa-eye"></i> Xem chi tiết
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Filter danh sách hồ sơ theo team/tháng/năm/search
 */
function filterArchive() {
    const teamFilter = document.getElementById('archiveTeamFilter');
    const monthFilter = document.getElementById('archiveMonthFilter');
    const yearFilter = document.getElementById('archiveYearFilter');
    const searchInput = document.getElementById('archiveSearch');
    const listContainer = document.getElementById('archiveListContainer');
    const countEl = document.getElementById('archiveCount');
    
    if (!listContainer) return;
    
    const teamVal = teamFilter ? teamFilter.value : '';
    const monthVal = monthFilter ? monthFilter.value : '';
    const yearVal = yearFilter ? yearFilter.value : '';
    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    const allMeetings = window._archiveAllMeetings || [];
    const teamNameMap = window._archiveTeamNameMap || {};
    const isAdmin = window._archiveIsAdmin || false;
    
    const filtered = allMeetings.filter(m => {
        if (teamVal && m.teamId !== teamVal) return false;
        
        const dateSource = m.meetingDate || m.closedAt || m.createdAt;
        if (dateSource) {
            const d = new Date(dateSource);
            if (!isNaN(d.getTime())) {
                if (monthVal && (d.getMonth() + 1) !== parseInt(monthVal, 10)) return false;
                if (yearVal && d.getFullYear() !== parseInt(yearVal, 10)) return false;
            }
        }
        
        if (searchVal) {
            const title = (m.title || '').toLowerCase();
            const code = (m.code || '').toLowerCase();
            if (!title.includes(searchVal) && !code.includes(searchVal)) return false;
        }
        
        return true;
    });
    
    listContainer.innerHTML = renderArchiveListHTML(filtered, teamNameMap, isAdmin);
    if (countEl) countEl.textContent = filtered.length;
}

/**
 * Mở modal chi tiết hồ sơ ở chế độ READ-ONLY
 * @param {string} meetingId
 */
async function openArchiveDetail(meetingId) {
    const uid = getCurrentUid();
    if (!uid) {
        showToast('Vui lòng đăng nhập', 'error');
        return;
    }
    
    const loadingOverlay = createArchiveModal('📄 Đang tải hồ sơ...', `
        <div style="text-align:center;padding:60px 20px;">
            <div class="loader" style="margin:0 auto;"></div>
            <p style="margin-top:16px;color:var(--gray-500);">Đang tải dữ liệu hồ sơ...</p>
        </div>
    `, []);
    
    try {
        const meeting = await getMeeting(meetingId);
        if (!meeting) {
            loadingOverlay.close();
            showToast('Không tìm thấy hồ sơ', 'error');
            return;
        }
        
        // Kiểm tra quyền truy cập
        const role = await getCurrentUserRole();
        const teamId = await getCurrentUserTeamId();
        const isAdminUser = role === 'admin';
        
        if (!isAdminUser) {
            const hasTeamAccess = teamId && meeting.teamId === teamId;
            const isGuest = meeting.memberIds && meeting.memberIds[uid] === true;
            if (!hasTeamAccess && !isGuest) {
                loadingOverlay.close();
                showToast('Bạn không có quyền xem hồ sơ này', 'error');
                return;
            }
        }
        
        // Load tất cả dữ liệu chi tiết
        const contents = await getMeetingContents(meetingId);
        const tasks = await getTasks(meetingId);
        const confirmations = await getConfirmations(meetingId);
        const allDiscussions = await getDiscussions(meetingId);
        const logs = await getActivityLogs(meetingId, 100);
        
        // Load tên tổ
        let teamName = '';
        if (meeting.teamId) {
            try {
                const snap = await db.ref(`teams/${meeting.teamId}/name`).once('value');
                teamName = snap.val() || meeting.teamId;
            } catch (e) {}
        }
        
        // Load tên chủ trì, thư ký
        let chairmanName = '—';
        let secretaryName = '—';
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
        
        const contentHtml = buildArchiveDetailHTML(
            meeting, contents, tasks, confirmations, allDiscussions, logs,
            teamName, chairmanName, secretaryName
        );
        
        loadingOverlay.close();
        
        createArchiveModal(
            `📄 ${escapeHtml(meeting.title)}`,
            contentHtml,
            [
                
                { text: 'Đóng', class: 'btn-secondary', action: 'close' }
            ]
        );
        
    } catch (err) {
        console.error('Error opening archive detail:', err);
        loadingOverlay.close();
        showToast('Lỗi tải chi tiết: ' + err.message, 'error');
    }
}

/**
 * Tạo modal rộng cho archive detail
 * @param {string} title - Tiêu đề modal
 * @param {string} contentHtml - Nội dung HTML
 * @param {Array} buttons - Mảng config nút {text, class, action, onClick}
 * @returns {Object} { close: Function }
 */
function createArchiveModal(title, contentHtml, buttons = []) {
    const overlay = document.createElement('div');
    overlay.className = 'archive-modal-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        animation: fadeIn 0.2s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #ffffff;
        border-radius: 14px;
        max-width: 1100px;
        width: 100%;
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        animation: modalIn 0.25s ease;
        overflow: hidden;
    `;
    
    let buttonsHtml = '';
    if (buttons.length > 0) {
        buttonsHtml = '<div class="archive-modal-footer" style="padding:14px 22px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;background:#f8fafc;border-radius:0 0 14px 14px;">';
        buttons.forEach(btn => {
            buttonsHtml += `<button class="${btn.class || 'btn-secondary'}" data-action="${btn.action || 'close'}" style="${btn.class === 'btn-primary' ? 'background:#1e3a8a;color:white;border:none;font-weight:600;padding:10px 22px;border-radius:8px;cursor:pointer;font-size:14px;' : 'background:#e2e8f0;color:#334155;border:none;font-weight:600;padding:10px 22px;border-radius:8px;cursor:pointer;font-size:14px;'}">${btn.text}</button>`;
        });
        buttonsHtml += '</div>';
    }
    
    modal.innerHTML = `
        <div style="position:sticky;top:0;background:linear-gradient(135deg, #1e3a8a 0%, #172554 100%);color:white;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #d97706;flex-shrink:0;">
            <h3 style="margin:0;font-size:17px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:12px;">${title}</h3>
            <button class="archive-modal-close" style="background:rgba(255,255,255,0.15);border:none;color:white;font-size:18px;cursor:pointer;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.2s;" title="Đóng (ESC)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="archive-modal-body" style="padding:0;overflow-y:auto;flex:1;">
            ${contentHtml}
        </div>
        ${buttonsHtml}
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    const close = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s';
        setTimeout(() => {
            overlay.remove();
            document.body.style.overflow = '';
        }, 200);
    };
    
    modal.querySelector('.archive-modal-close').addEventListener('click', close);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            close();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    const closeBtn = modal.querySelector('.archive-modal-close');
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'rgba(255,255,255,0.3)');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'rgba(255,255,255,0.15)');
    
    if (buttons.length > 0) {
        modal.querySelectorAll('.archive-modal-footer button').forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.dataset.action;
                if (action === 'close') {
                    close();
                    return;
                }
                const config = buttons.find(b => b.action === action);
                if (config && config.onClick) {
                    config.onClick();
                }
            });
        });
    }
    
    return { close };
}

/**
 * Build HTML chi tiết hồ sơ (READ-ONLY)
 */
function buildArchiveDetailHTML(meeting, contents, tasks, confirmations, allDiscussions, logs, teamName, chairmanName, secretaryName) {
    const memberIds = Object.keys(meeting.memberIds || {});
    const totalMembers = memberIds.length;
    const confirmedCount = memberIds.filter(mid => confirmations[mid] && confirmations[mid].finalConfirmed).length;
    
    const meetingDateStr = formatDate(meeting.meetingDate);
    const closedDateStr = formatDate(meeting.closedAt, true);
    
    let html = `
        <div style="padding:24px;">
            <div style="background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);border-left:4px solid #1e3a8a;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:8px;">
                    <div style="font-size:14px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                        📌 Thông tin hồ sơ
                    </div>
                    ${getStatusBadge(meeting.status)}
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;font-size:14px;">
                    <div><strong style="color:#64748b;">Mã hồ sơ:</strong> <span style="font-family:monospace;color:#1e3a8a;font-weight:700;">${escapeHtml(meeting.code || '—')}</span></div>
                    <div><strong style="color:#64748b;">Tổ chuyên môn:</strong> ${escapeHtml(teamName || '—')}</div>
                    <div><strong style="color:#64748b;">Ngày họp:</strong> ${meetingDateStr} ${meeting.meetingTime || ''}</div>
                    <div><strong style="color:#64748b;">Hình thức:</strong> ${getFormatLabel(meeting.format)}</div>
                    <div><strong style="color:#64748b;">Chủ trì:</strong> ${escapeHtml(chairmanName)}</div>
                    <div><strong style="color:#64748b;">Thư ký:</strong> ${escapeHtml(secretaryName)}</div>
                    <div><strong style="color:#64748b;">Ngày chốt:</strong> ${closedDateStr}</div>
                    <div><strong style="color:#64748b;">Số thành viên:</strong> ${totalMembers} (đã xác nhận: ${confirmedCount})</div>
                </div>
                ${meeting.description ? `
                    <div style="margin-top:12px;padding:10px 14px;background:rgba(255,255,255,0.6);border-radius:6px;font-size:14px;color:#334155;line-height:1.6;">
                        <strong style="color:#64748b;">Mô tả:</strong> ${escapeHtml(meeting.description)}
                    </div>
                ` : ''}
                ${meeting.forceCloseReason ? `
                    <div style="margin-top:12px;padding:10px 14px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;font-size:13px;color:#92400e;">
                        <strong>⚠️ Chốt ngoại lệ:</strong> ${escapeHtml(meeting.forceCloseReason)}
                    </div>
                ` : ''}
            </div>
    `;
    
    html += `
        <div style="margin-bottom:20px;">
            <div style="font-size:15px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #d97706;">
                <i class="fas fa-list-ul"></i> Nội dung cuộc họp (${contents.length})
            </div>
    `;
    
    if (contents.length === 0) {
        html += `<p style="font-style:italic;color:#94a3b8;padding:10px;">Chưa có nội dung nào.</p>`;
    } else {
        contents.forEach((c, idx) => {
            const contentDiscussions = allDiscussions.filter(d => d.contentId === c.id);
            
            html += `
                <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:14px;background:#fff;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;">
                        <div style="font-size:15px;font-weight:700;color:#0f172a;">
                            📌 NỘI DUNG ${String(idx + 1).padStart(2, '0')}: ${escapeHtml(c.title)}
                        </div>
                        <span class="status-badge ${c.status === 'CONCLUDED' ? 'concluded' : 'draft'}">
                            ${c.status === 'CONCLUDED' ? '✅ Đã kết luận' : '📝 Dự thảo'}
                        </span>
                    </div>
                    <div style="font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;padding:10px 14px;background:#f8fafc;border-radius:6px;margin-bottom:10px;">
                        ${escapeHtml(c.description || '(Không có mô tả)')}
                    </div>
            `;
            
            if (c.attachments && Object.keys(c.attachments).length > 0) {
                html += `<div style="margin-bottom:10px;"><strong style="font-size:13px;color:#64748b;">📎 Tài liệu đính kèm:</strong><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">`;
                Object.values(c.attachments).forEach(att => {
                    const fid = att.fileId || '';
                    html += `
                        <a href="${att.url}" target="_blank" rel="noopener noreferrer"
                           style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:#e0f2fe;border:1px solid #7dd3fc;border-radius:16px;font-size:12px;text-decoration:none;color:#0369a1;font-weight:500;"
                           title="File ID: ${escapeHtml(fid)}">
                            <i class="fas fa-external-link-alt"></i>
                            ${escapeHtml(att.fileName || 'Tài liệu')}
                            ${fid ? `<span style="font-size:9px;color:#64748b;font-family:monospace;background:#f1f5f9;padding:1px 4px;border-radius:3px;">${escapeHtml(fid.substring(0, 8))}…</span>` : ''}
                        </a>
                    `;
                });
                html += `</div></div>`;
            }
            
            if (contentDiscussions.length > 0) {
                html += `
                    <div style="margin-top:10px;padding:10px 12px;background:#fffbeb;border-left:3px solid #d97706;border-radius:6px;">
                        <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px;">
                            💬 Ý kiến thảo luận (${contentDiscussions.length})
                        </div>
                        ${contentDiscussions.map(d => `
                            <div style="padding:8px 10px;background:#fff;border-radius:6px;margin-bottom:6px;font-size:13px;">
                                <div style="font-weight:600;color:#1e293b;">
                                    👤 ${escapeHtml(d.authorName || 'Giáo viên')}
                                    <span style="font-weight:400;color:#94a3b8;font-size:11px;margin-left:6px;">${formatDate(d.createdAt, true)}</span>
                                </div>
                                <div style="color:#334155;margin-top:4px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(d.content || '')}</div>
                                ${d.attachments && Object.keys(d.attachments).length > 0 ? `
                                    <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">
                                        ${Object.values(d.attachments).map(a => `
                                            <a href="${a.url}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#0369a1;text-decoration:none;padding:2px 8px;background:#e0f2fe;border-radius:10px;">
                                                📎 ${escapeHtml(a.fileName || 'File')}
                                            </a>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            if (c.conclusion) {
                html += `
                    <div style="margin-top:10px;padding:12px 14px;background:#eff6ff;border-left:4px solid #1e3a8a;border-radius:6px;">
                        <div style="font-size:13px;font-weight:700;color:#1e3a8a;margin-bottom:6px;">
                            👨‍💼 KẾT LUẬN CỦA TỔ TRƯỞNG
                        </div>
                        <div style="font-size:14px;color:#0f172a;line-height:1.7;white-space:pre-wrap;">${escapeHtml(c.conclusion)}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:8px;font-style:italic;padding-top:6px;border-top:1px dashed #cbd5e1;">
                            Người kết luận: ${escapeHtml(c.concludedBy || '—')} • ${formatDate(c.concludedAt, true)}
                        </div>
                    </div>
                `;
            }
            
            html += `</div>`;
        });
    }
    
    html += `</div>`;
    
    const generalDiscussions = allDiscussions.filter(d => !d.contentId);
    if (generalDiscussions.length > 0) {
        html += `
            <div style="margin-bottom:20px;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #d97706;">
                    <i class="fas fa-comments"></i> Ý kiến thảo luận chung (${generalDiscussions.length})
                </div>
                ${generalDiscussions.map(d => `
                    <div style="padding:10px 14px;background:#fffbeb;border-left:3px solid #d97706;border-radius:6px;margin-bottom:8px;">
                        <div style="font-weight:600;color:#1e293b;font-size:14px;">
                            👤 ${escapeHtml(d.authorName || 'Giáo viên')}
                            <span style="font-weight:400;color:#94a3b8;font-size:12px;margin-left:6px;">${formatDate(d.createdAt, true)}</span>
                        </div>
                        <div style="color:#334155;margin-top:4px;line-height:1.7;white-space:pre-wrap;font-size:14px;">${escapeHtml(d.content || '')}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    if (tasks.length > 0) {
        html += `
            <div style="margin-bottom:20px;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #d97706;">
                    <i class="fas fa-tasks"></i> Phân công nhiệm vụ (${tasks.length})
                </div>
                <div style="overflow-x:auto;border-radius:8px;border:1px solid #e2e8f0;">
                    <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:600px;">
                        <thead>
                            <tr style="background:#f1f5f9;">
                                <th style="padding:10px 12px;text-align:left;font-weight:700;color:#475569;font-size:12px;text-transform:uppercase;">Người thực hiện</th>
                                <th style="padding:10px 12px;text-align:left;font-weight:700;color:#475569;font-size:12px;text-transform:uppercase;">Nhiệm vụ</th>
                                <th style="padding:10px 12px;text-align:left;font-weight:700;color:#475569;font-size:12px;text-transform:uppercase;">Hạn</th>
                                <th style="padding:10px 12px;text-align:left;font-weight:700;color:#475569;font-size:12px;text-transform:uppercase;">Sản phẩm</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tasks.map(t => `
                                <tr style="border-top:1px solid #f1f5f9;">
                                    <td style="padding:10px 12px;color:#0f172a;font-weight:500;">${escapeHtml(t.assignedByName || '—')}</td>
                                    <td style="padding:10px 12px;color:#334155;">${escapeHtml(t.title || '')}${t.description ? `<br><em style="font-size:12px;color:#64748b;">${escapeHtml(t.description)}</em>` : ''}</td>
                                    <td style="padding:10px 12px;color:#334155;">${formatDate(t.deadline)}</td>
                                    <td style="padding:10px 12px;color:#334155;">${escapeHtml(t.product || '—')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    if (totalMembers > 0) {
        html += `
            <div style="margin-bottom:20px;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #d97706;">
                    <i class="fas fa-user-check"></i> Xác nhận thành viên (${confirmedCount}/${totalMembers})
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">
                    ${memberIds.map(mid => {
                        const conf = confirmations[mid] || {};
                        const isConfirmed = conf.finalConfirmed === true;
                        return `
                            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${isConfirmed ? '#f0fdf4' : '#fef2f2'};border:1px solid ${isConfirmed ? '#bbf7d0' : '#fecaca'};border-radius:8px;">
                                <span style="font-size:18px;">${isConfirmed ? '✅' : '❌'}</span>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:600;font-size:13px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                        ${escapeHtml(conf.displayName || mid.substring(0, 12) + '…')}
                                    </div>
                                    ${isConfirmed ? `<div style="font-size:11px;color:#16a34a;">${formatDate(conf.finalConfirmedAt, true)}</div>` : `<div style="font-size:11px;color:#dc2626;">Chưa xác nhận</div>`}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    if (logs && logs.length > 0) {
        html += `
            <div style="margin-bottom:20px;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #d97706;">
                    <i class="fas fa-history"></i> Nhật ký hoạt động (${logs.length})
                </div>
                <div style="background:#0f172a;border-radius:8px;padding:14px;max-height:280px;overflow-y:auto;font-family:'Consolas','Monaco',monospace;font-size:12px;line-height:1.7;">
                    ${logs.map(log => `
                        <div style="color:#e2e8f0;padding:2px 0;">
                            <span style="color:#94a3b8;">[${formatDate(log.timestamp, true)}]</span>
                            <span style="color:#fbbf24;font-weight:700;">${escapeHtml(log.userName || '—')}</span>
                            <span style="color:#60a5fa;">${escapeHtml(log.description || log.action || '')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    html += `
        <div style="margin-top:24px;padding:16px;background:linear-gradient(135deg, #1e3a8a 0%, #172554 100%);border-radius:8px;text-align:center;color:white;">
            <div style="font-size:15px;font-weight:800;color:#fbbf24;letter-spacing:2px;margin-bottom:4px;">
                ĐOÀN KẾT – TRÁCH NHIỆM – SÁNG TẠO
            </div>
            <div style="font-size:12px;color:#cbd5e1;">Trường THCS-THPT Trần Trường Sinh</div>
        </div>
        </div>
    `;
    
    return html;
}

/**
 * Xuất PDF hồ sơ bằng html2pdf.js
 * FIXED: Đặt element trong khung nhìn với opacity:0 thay vì left:-9999px
 * để html2canvas có thể đo được kích thước chính xác (tránh PDF trắng).
 * @param {string} meetingId
 */
async function exportArchivePDF(meetingId) {
    const uid = getCurrentUid();
    if (!uid) {
        showToast('Vui lòng đăng nhập', 'error');
        return;
    }
    
    if (typeof html2pdf === 'undefined') {
        showToast('Thư viện html2pdf.js chưa tải. Vui lòng refresh trang (Ctrl+F5).', 'error', 5000);
        return;
    }
    
    showToast('📄 Đang chuẩn bị PDF...', 'info', 3000);
    
    let tempDiv = null;
    
    try {
        // ============================================================
        // 1. LOAD DỮ LIỆU
        // ============================================================
        const meeting = await getMeeting(meetingId);
        if (!meeting) {
            showToast('Không tìm thấy hồ sơ', 'error');
            return;
        }
        
        const contents = await getMeetingContents(meetingId);
        const tasks = await getTasks(meetingId);
        const confirmations = await getConfirmations(meetingId);
        const allDiscussions = await getDiscussions(meetingId);
        
        // Load tên tổ
        let teamName = '';
        if (meeting.teamId) {
            try {
                const snap = await db.ref(`teams/${meeting.teamId}/name`).once('value');
                teamName = snap.val() || meeting.teamId;
            } catch (e) {}
        }
        
        // Load tên chủ trì, thư ký
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
        
        // ============================================================
        // 2. BUILD HTML CHO PDF
        // ============================================================
        const pdfHtml = buildArchivePDFHTML(
            meeting,
            contents,
            tasks,
            confirmations,
            allDiscussions,
            teamName,
            chairmanName,
            secretaryName
        );
        
        // ============================================================
        // 3. TẠO ELEMENT TẠM — ĐẶT TRONG KHUNG NHÌN NHƯNG VÔ HÌNH
        //    - position: absolute (không dùng fixed vì có thể bị cắt)
        //    - top: 0, left: 0 (trong khung nhìn để đo được kích thước)
        //    - width: 210mm (chuẩn A4)
        //    - opacity: 0 (vô hình với người dùng)
        //    - pointer-events: none (không chặn click)
        //    - z-index: -1000 (nằm dưới mọi thứ khác)
        // ============================================================
        tempDiv = document.createElement('div');
        tempDiv.id = 'archive-pdf-temp';
        tempDiv.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 210mm;
            min-height: 297mm;
            background: #ffffff;
            color: #000000;
            opacity: 0;
            pointer-events: none;
            z-index: -1000;
            overflow: hidden;
        `;
        tempDiv.innerHTML = pdfHtml;
        
        // Gắn vào body
        document.body.appendChild(tempDiv);
        
        // ============================================================
        // 4. CHỜ DOM RENDER XONG (font, layout, ảnh)
        //    Đây là bước QUAN TRỌNG để tránh PDF trắng
        // ============================================================
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Đợi thêm cho font chữ load xong (nếu trình duyệt hỗ trợ)
        if (document.fonts && document.fonts.ready) {
            try {
                await Promise.race([
                    document.fonts.ready,
                    new Promise(resolve => setTimeout(resolve, 500))
                ]);
            } catch (e) {
                // Bỏ qua nếu lỗi font
            }
        }
        
        // ============================================================
        // 5. GỌI html2pdf.js ĐỂ XUẤT FILE
        // ============================================================
        const fileName = `BienBan_${(meeting.code || meetingId).replace(/[^a-zA-Z0-9\-_]/g, '_')}.pdf`;
        
        const opt = {
            margin: [8, 8, 10, 8],
            filename: fileName,
            image: {
                type: 'jpeg',
                quality: 0.98
            },
            html2canvas: {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                letterRendering: true,
                backgroundColor: '#ffffff',
                logging: false,
                scrollX: 0,
                scrollY: 0,
                windowWidth: tempDiv.scrollWidth,
                windowHeight: tempDiv.scrollHeight
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy']
            }
        };
        
        await html2pdf().set(opt).from(tempDiv).save();
        
        // ============================================================
        // 6. DỌN DẸP
        // ============================================================
        if (tempDiv && tempDiv.parentNode) {
            tempDiv.parentNode.removeChild(tempDiv);
            tempDiv = null;
        }
        
        showToast('✅ Đã xuất PDF thành công!', 'success', 3000);
        
        // Ghi log
        try {
            await logActivity(
                meetingId, uid, 'EXPORT_ARCHIVE_PDF', 'MEETING', meetingId,
                `Đã xuất PDF hồ sơ điện tử`
            );
        } catch (e) {
            console.warn('Không ghi được log:', e);
        }
        
    } catch (err) {
        console.error('Export PDF error:', err);
        
        // Dọn dẹp dù có lỗi
        if (tempDiv && tempDiv.parentNode) {
            tempDiv.parentNode.removeChild(tempDiv);
            tempDiv = null;
        }
        
        let msg = err.message || 'Lỗi không xác định';
        if (msg.includes('html2canvas') || msg.includes('canvas')) {
            msg = 'Không thể chụp ảnh DOM. Vui lòng thử lại hoặc dùng Chrome/Edge.';
        }
        
        showToast('❌ Lỗi xuất PDF: ' + msg, 'error', 5000);
    }
}

/**
 * Build HTML form A4 chuẩn hành chính cho PDF
 * @param {Object} meeting
 * @param {Array} contents
 * @param {Array} tasks
 * @param {Object} confirmations
 * @param {Array} allDiscussions
 * @param {string} teamName
 * @param {string} chairmanName
 * @param {string} secretaryName
 * @returns {string} HTML
 */
function buildArchivePDFHTML(meeting, contents, tasks, confirmations, allDiscussions, teamName, chairmanName, secretaryName) {
    function escPDF(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }
    
    function fmtDate(dateVal) {
        if (!dateVal) return '.../.../......';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '.../.../......';
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    
    function fmtTime(dateVal) {
        if (!dateVal) return '... giờ ... phút';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '... giờ ... phút';
        return `${String(d.getHours()).padStart(2, '0')} giờ ${String(d.getMinutes()).padStart(2, '0')} phút`;
    }
    
    function fmtDeadline(dateVal) {
        if (!dateVal) return 'Chưa có';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return dateVal;
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    
    function toRoman(num) {
        const map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
        let result = '';
        for (const [v, s] of map) {
            while (num >= v) { result += s; num -= v; }
        }
        return result;
    }
    
    function fmtFormat(fmt) {
        const map = {
            'truc_tiep': 'Trực tiếp',
            'truc_tuyen': 'Trực tuyến',
            'ket_hop': 'Kết hợp (trực tiếp + trực tuyến)',
            'khong_dong_thoi': 'Không đồng thời'
        };
        return map[fmt] || fmt || 'Không xác định';
    }
    
    const meetingDateStr = fmtDate(meeting.meetingDate);
    const closedDateStr = fmtDate(meeting.closedAt);
    const memberIds = Object.keys(meeting.memberIds || {});
    const totalMembers = memberIds.length;
    const confirmedCount = memberIds.filter(mid => confirmations[mid] && confirmations[mid].finalConfirmed).length;
    
    const meetingDay = meeting.meetingDate ? new Date(meeting.meetingDate).getDate() : '...';
    const meetingMonth = meeting.meetingDate ? (new Date(meeting.meetingDate).getMonth() + 1) : '...';
    const meetingYear = meeting.meetingDate ? new Date(meeting.meetingDate).getFullYear() : '......';
    
    const membersHtml = memberIds.map((mid, idx) => {
        const conf = confirmations[mid] || {};
        const name = conf.displayName || 'Thành viên';
        const isConfirmed = conf.finalConfirmed === true;
        const status = isConfirmed
            ? '<span style="color:#15803d;">✅ Đã xác nhận</span>'
            : '<span style="color:#b91c1c;">❌ Chưa xác nhận</span>';
        return `
            <tr>
                <td style="text-align:center;padding:4px 8px;border:1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding:4px 8px;border:1px solid #cbd5e1;">${escPDF(name)}</td>
                <td style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;">${status}</td>
            </tr>
        `;
    }).join('');
    
    const contentsHtml = contents.length === 0
        ? `<p style="font-style:italic;color:#64748b;">Chưa có nội dung nào.</p>`
        : contents.map((c, idx) => {
            const romanIdx = toRoman(idx + 1);
            const contentDiscussions = allDiscussions.filter(d => d.contentId === c.id);
            
            let discussionHtml = '';
            if (contentDiscussions.length > 0) {
                discussionHtml = `
                    <div style="margin-top:8px;padding:10px 12px;background:#fffbeb;border-left:3px solid #d97706;">
                        <div style="font-weight:bold;font-size:12pt;color:#92400e;margin-bottom:6px;">📢 Ý kiến thảo luận:</div>
                        ${contentDiscussions.map(d => `
                            <div style="font-size:11pt;margin-bottom:4px;line-height:1.6;">
                                <strong>• ${escPDF(d.authorName || 'Giáo viên')}</strong>
                                <em style="color:#64748b;font-size:10pt;"> (${fmtDate(d.createdAt)}):</em>
                                <span>${escPDF(d.content || '')}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            let conclusionHtml = '';
            if (c.conclusion) {
                conclusionHtml = `
                    <div style="margin-top:10px;padding:10px 12px;background:#eff6ff;border-left:3px solid #1e3a8a;">
                        <div style="font-weight:bold;margin-bottom:4px;color:#1e3a8a;">➤ Kết luận:</div>
                        <div style="white-space:pre-wrap;line-height:1.6;">${escPDF(c.conclusion)}</div>
                        <div style="font-size:10pt;color:#475569;margin-top:6px;font-style:italic;">
                            Người kết luận: ${escPDF(c.concludedBy || '—')} — ${fmtDate(c.concludedAt)}
                        </div>
                    </div>
                `;
            } else {
                conclusionHtml = `<div style="margin-top:8px;padding:6px 10px;background:#fef3c7;"><em>Chưa có kết luận.</em></div>`;
            }
            
            return `
                <div style="margin-top:14px;page-break-inside:avoid;">
                    <div style="font-weight:bold;font-size:13pt;margin-bottom:6px;">
                        ${romanIdx}. ${escPDF(c.title)}
                    </div>
                    <div style="margin-left:16px;">
                        <div style="white-space:pre-wrap;line-height:1.6;font-size:11pt;">${escPDF(c.description || '(Không có mô tả)')}</div>
                        ${discussionHtml}
                        ${conclusionHtml}
                    </div>
                </div>
            `;
        }).join('');
    
    let tasksHtml = '';
    if (tasks.length === 0) {
        tasksHtml = `<p style="font-style:italic;color:#64748b;">Chưa có nhiệm vụ nào.</p>`;
    } else {
        tasksHtml = `
            <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:11pt;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="border:1px solid #cbd5e1;padding:6px;width:35px;">STT</th>
                        <th style="border:1px solid #cbd5e1;padding:6px;">Người thực hiện</th>
                        <th style="border:1px solid #cbd5e1;padding:6px;">Nội dung</th>
                        <th style="border:1px solid #cbd5e1;padding:6px;width:85px;">Hạn</th>
                        <th style="border:1px solid #cbd5e1;padding:6px;">Sản phẩm</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map((t, i) => `
                        <tr>
                            <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${i + 1}</td>
                            <td style="border:1px solid #cbd5e1;padding:6px;">${escPDF(t.assignedByName || '—')}</td>
                            <td style="border:1px solid #cbd5e1;padding:6px;">${escPDF(t.title || '')}</td>
                            <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${fmtDeadline(t.deadline)}</td>
                            <td style="border:1px solid #cbd5e1;padding:6px;">${escPDF(t.product || '—')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    return `
        <div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#000;padding:0;background:white;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <div style="text-align:center;flex:0 0 55%;">
                    <div style="font-weight:bold;font-size:11pt;">SỞ GIÁO DỤC VÀ ĐÀO TẠO VĨNH LONG</div>
                    <div style="font-weight:bold;font-size:12pt;white-space:nowrap;">TRƯỜNG THCS&THPT TRẦN TRƯỜNG SINH</div>
                    <div style="font-size:10pt;color:#1e3a8a;font-weight:700;letter-spacing:0.5px;margin-top:2px;">ĐOÀN KẾT – TRÁCH NHIỆM – SÁNG TẠO</div>
                    <div style="font-size:11pt;">TỔ: ${escPDF(teamName || '..................')}</div>
                    <div style="font-size:11pt;">Số: <strong>${escPDF(meeting.code || '.......')}</strong></div>
                </div>
                <div style="text-align:center;flex:0 0 45%;">
                    <div style="font-weight:bold;font-size:11pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div style="font-weight:bold;font-size:11pt;">Độc lập - Tự do - Hạnh phúc</div>
                    <div style="font-size:10pt;font-style:italic;margin-top:4px;">
                        Thạnh Phong, ngày ${meetingDay} tháng ${meetingMonth} năm ${meetingYear}
                    </div>
                </div>
            </div>
            
            <div style="text-align:center;margin:20px 0 6px 0;font-size:15pt;font-weight:bold;letter-spacing:1px;">
                BIÊN BẢN SINH HOẠT TỔ CHUYÊN MÔN
            </div>
            <div style="text-align:center;font-size:11pt;font-style:italic;margin-bottom:16px;">
                (Về việc: ${escPDF(meeting.title || '')})
            </div>
            
            <table style="width:100%;font-size:11pt;margin-bottom:14px;">
                <tr><td style="width:130px;padding:2px 4px;">Mã hồ sơ:</td><td style="width:10px;">:</td><td><strong>${escPDF(meeting.code || '—')}</strong></td></tr>
                <tr><td style="padding:2px 4px;">Thời gian:</td><td>:</td><td>${fmtTime(meeting.createdAt || meeting.meetingDate)} — ngày ${meetingDateStr}</td></tr>
                <tr><td style="padding:2px 4px;">Hình thức:</td><td>:</td><td>${fmtFormat(meeting.format)}</td></tr>
                <tr><td style="padding:2px 4px;">Người chủ trì:</td><td>:</td><td>${escPDF(chairmanName || '.....................')}</td></tr>
                <tr><td style="padding:2px 4px;">Thư ký:</td><td>:</td><td>${escPDF(secretaryName || '.....................')}</td></tr>
            </table>
            
            <div style="font-weight:bold;font-size:12pt;text-transform:uppercase;margin:14px 0 8px 0;border-bottom:1px solid #94a3b8;padding-bottom:3px;">I. Thành phần tham dự</div>
            <p style="margin:0 0 6px 0;font-size:11pt;">Tổng: <strong>${totalMembers}</strong> — Đã xác nhận: <strong>${confirmedCount}/${totalMembers}</strong></p>
            <table style="width:100%;border-collapse:collapse;font-size:11pt;">
                <thead>
                    <tr style="background:#e2e8f0;">
                        <th style="border:1px solid #cbd5e1;padding:5px;width:35px;">STT</th>
                        <th style="border:1px solid #cbd5e1;padding:5px;">Họ và tên</th>
                        <th style="border:1px solid #cbd5e1;padding:5px;width:130px;">Trạng thái</th>
                    </tr>
                </thead>
                <tbody>${membersHtml}</tbody>
            </table>
            
            <div style="font-weight:bold;font-size:12pt;text-transform:uppercase;margin:14px 0 8px 0;border-bottom:1px solid #94a3b8;padding-bottom:3px;">II. Nội dung cuộc họp</div>
            ${contentsHtml}
            
            <div style="font-weight:bold;font-size:12pt;text-transform:uppercase;margin:14px 0 8px 0;border-bottom:1px solid #94a3b8;padding-bottom:3px;">III. Phân công nhiệm vụ</div>
            ${tasksHtml}
            
            <p style="margin-top:16px;font-style:italic;font-size:11pt;">
                Biên bản kết thúc vào ${fmtTime(meeting.closedAt)} — ngày ${closedDateStr}.
                ${meeting.closedBy ? `Hồ sơ được chốt bởi <strong>${escPDF(meeting.closedBy)}</strong>.` : ''}
            </p>
            
            <div style="margin-top:30px;display:flex;justify-content:space-around;page-break-inside:avoid;">
                <div style="width:45%;text-align:center;">
                    <div style="font-weight:bold;font-size:12pt;margin-bottom:4px;">CHỦ TỌA CUỘC HỌP</div>
                    <div style="font-size:10pt;font-style:italic;margin-bottom:60px;">(Ký, ghi rõ họ tên)</div>
                    <div style="font-size:12pt;font-weight:bold;">${escPDF(chairmanName || '.....................')}</div>
                </div>
                <div style="width:45%;text-align:center;">
                    <div style="font-weight:bold;font-size:12pt;margin-bottom:4px;">THƯ KÝ</div>
                    <div style="font-size:10pt;font-style:italic;margin-bottom:60px;">(Ký, ghi rõ họ tên)</div>
                    <div style="font-size:12pt;font-weight:bold;">${escPDF(secretaryName || '.....................')}</div>
                </div>
            </div>
            
            <div style="margin-top:24px;text-align:center;font-size:10pt;color:#475569;font-style:italic;">
                — Hết biên bản —
                <div style="margin-top:8px;font-weight:800;color:#1e3a8a;font-size:11pt;letter-spacing:1.5px;text-transform:uppercase;">
                    ĐOÀN KẾT – TRÁCH NHIỆM – SÁNG TẠO
                </div>
                <div style="margin-top:4px;font-size:9pt;">
                    Trường THCS-THPT Trần Trường Sinh — Hệ thống Quản lý Sinh hoạt Chuyên môn
                </div>
                <div style="margin-top:2px;font-size:8pt;color:#94a3b8;">
                    Trích xuất lúc ${fmtDate(Date.now())} ${fmtTime(Date.now())}
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// EXPORTS
// ============================================================
window.renderArchive = renderArchive;
window.renderArchiveListHTML = renderArchiveListHTML;
window.filterArchive = filterArchive;
window.openArchiveDetail = openArchiveDetail;
window.createArchiveModal = createArchiveModal;
window.buildArchiveDetailHTML = buildArchiveDetailHTML;
window.exportArchivePDF = exportArchivePDF;
window.buildArchivePDFHTML = buildArchivePDFHTML;