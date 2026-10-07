// ============================================================
// CONFIRMATION MODULE
// Trường THCS-THPT Trần Trường Sinh
// ============================================================
/**
 * Render confirmation section cho một meeting
 * ĐÃ NÂNG CẤP (VÁ LỖ HỔNG):
 *   - Kết hợp dữ liệu discussions: Ai đã thảo luận → coi như "Đã tham gia"
 *   - Hiển thị mức độ xa nhất: Đã xác nhận / Đã tham gia / Đã xem / Chưa tiếp cận
 *   - Thống kê phễu chính xác: tiếp cận → tham gia → xác nhận
 * @param {string} meetingId
 * @param {HTMLElement} container
 */
async function renderConfirmations(meetingId, container) {
    const uid = getCurrentUid();
    if (!uid) return;
    
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
        container.innerHTML = `<p>Không tìm thấy cuộc họp</p>`;
        return;
    }
    
    // ============================================================
    // BƯỚC 1: LOAD CONFIRMATIONS
    // ============================================================
    let confirmations = await getConfirmations(meetingId);
    const isMember = meeting.memberIds && meeting.memberIds[uid] === true;
    const isClosed = meeting.status === 'CLOSED';
    
    // ============================================================
    // BƯỚC 2: AUTO-CHECK "ĐÃ TIẾP CẬN"
    // Chỉ auto-write khi: user là member, chưa có viewedMeetingAt, meeting chưa CLOSED
    // ============================================================
    if (isMember && !isClosed) {
        const userConfInitial = confirmations[uid] || {};
        if (!userConfInitial.viewedMeetingAt) {
            try {
                await db.ref(`confirmations/${meetingId}/${uid}/viewedMeetingAt`)
                    .set(firebase.database.ServerValue.TIMESTAMP);
                if (!confirmations[uid]) confirmations[uid] = {};
                confirmations[uid].viewedMeetingAt = Date.now();
                console.log('✅ Đã tự động ghi nhận "Đã tiếp cận" cho user', uid);
            } catch (e) {
                console.warn('⚠️ Không tự động ghi được viewedMeetingAt:', e.message);
            }
        }
    }
    
    const userConf = confirmations[uid] || {};
    const role = await getCurrentUserRole();
    const isLeader = role === 'truong_to' || role === 'admin' 
                  || role === 'to_pho' || role === 'nhom_truong';
    
    // ============================================================
    // BƯỚC 3: LOAD CONTENT & TRẠNG THÁI
    // ============================================================
    const contents = await getMeetingContents(meetingId);
    const hasConcluded = contents.some(c => c.status === 'CONCLUDED');
    const allConcluded = contents.length > 0 && contents.every(c => c.status === 'CONCLUDED');
    const isConfirmation = meeting.status === 'CONFIRMATION';
    
    // ============================================================
    // BƯỚC 4: LOAD DISCUSSIONS — LẤY UID ĐÃ THẢO LUẬN
    // Đây là fix chính: ai đã gửi ít nhất 1 ý kiến → coi như đã tiếp cận + đã tham gia
    // ============================================================
    let discussionsSet = new Set();
    try {
        const discussions = await getDiscussions(meetingId);
        discussions.forEach(d => {
            if (d.authorId) discussionsSet.add(d.authorId);
            if (d.userId && !d.authorId) discussionsSet.add(d.userId);
        });
        console.log(`📊 Loaded ${discussions.length} discussions từ ${discussionsSet.size} tác giả khác nhau`);
    } catch (e) {
        console.warn('⚠️ Không load được discussions:', e.message);
    }
    
    const hasUserDiscussed = discussionsSet.has(uid);
    
    // ============================================================
    // BƯỚC 5: XÁC ĐỊNH BƯỚC NÀO CÒN THIẾU (cho user hiện tại)
    // LƯU Ý: Nếu user đã thảo luận → coi như đã tiếp cận + đã tham gia
    // ============================================================
    const userHasReached = !!(userConf.viewedMeetingAt) || hasUserDiscussed;
    const userHasParticipated = userConf.participated === true || hasUserDiscussed;
    
    const missingSteps = [];
    if (!userHasReached) missingSteps.push('Đã tiếp cận');
    if (!userHasParticipated) missingSteps.push('Đã tham gia');
    if (hasConcluded && !userConf.conclusionRead) missingSteps.push('Đã đọc kết luận');
    if (isConfirmation && !userConf.finalConfirmed) missingSteps.push('Xác nhận hồ sơ');
    
    const hasMissing = missingSteps.length > 0;
    const canQuickConfirm = isMember && !isClosed && hasMissing
        && (meeting.status === 'DISCUSSION' || meeting.status === 'CONCLUDED' || meeting.status === 'CONFIRMATION');
    
    // ============================================================
    // BƯỚC 6: LOAD THÔNG TIN THÀNH VIÊN + XÁC ĐỊNH MỨC ĐỘ
    // ============================================================
    const memberIds = Object.keys(meeting.memberIds || {});
    const memberInfoList = [];
    
    // Đếm cho thống kê phễu
    let countReached = 0;
    let countParticipated = 0;
    let countConfirmed = 0;
    
    for (const mid of memberIds) {
        let displayName = 'Người dùng';
        let email = '';
        try {
            const snap = await db.ref(`users/${mid}`).once('value');
            const uData = snap.val();
            if (uData) {
                displayName = uData.displayName || uData.email || 'Người dùng';
                email = uData.email || '';
            }
        } catch (e) {
            console.error('Error loading user info:', mid, e);
        }
        
        const conf = confirmations[mid] || {};
        const memberHasDiscussed = discussionsSet.has(mid);
        
        // ==== XÁC ĐỊNH MỨC ĐỘ XA NHẤT ====
        // Quy tắc:
        //   finalConfirmed = true → ✅ Đã xác nhận
        //   participated = true HOẶC có thảo luận → 🤝 Đã tham gia
        //   viewedMeetingAt → 👀 Đã xem
        //   không có gì → ❌ Chưa tiếp cận
        
        const isConfirmed = conf.finalConfirmed === true;
        const isParticipated = conf.participated === true || memberHasDiscussed;
        const isViewed = !!conf.viewedMeetingAt;
        
        let level = 'none';
        let levelIcon = '❌';
        let levelText = 'Chưa tiếp cận';
        let levelColor = '#dc2626';
        let levelBg = '#fef2f2';
        let levelBorder = '#fecaca';
        
        if (isConfirmed) {
            level = 'confirmed';
            levelIcon = '✅';
            levelText = 'Đã xác nhận';
            levelColor = '#15803d';
            levelBg = '#f0fdf4';
            levelBorder = '#bbf7d0';
        } else if (isParticipated) {
            level = 'participated';
            levelIcon = '🤝';
            levelText = 'Đã tham gia';
            levelColor = '#1e40af';
            levelBg = '#eff6ff';
            levelBorder = '#bfdbfe';
        } else if (isViewed) {
            level = 'viewed';
            levelIcon = '👀';
            levelText = 'Đã xem';
            levelColor = '#92400e';
            levelBg = '#fef3c7';
            levelBorder = '#fcd34d';
        }
        
        // ==== ĐẾM CHO THỐNG KÊ PHỄU ====
        // reached = có bất kỳ dấu hiệu: viewed OR participated OR finalConfirmed OR thảo luận
        if (isViewed || isParticipated || isConfirmed) {
            countReached++;
        }
        // participated = có participated OR finalConfirmed OR thảo luận
        if (isParticipated || isConfirmed) {
            countParticipated++;
        }
        // confirmed = finalConfirmed only
        if (isConfirmed) {
            countConfirmed++;
        }
        
        // Ghi chú thêm về nguồn dữ liệu nếu tham gia nhờ thảo luận
        let participatedNote = '';
        if (!isConfirmed && memberHasDiscussed && conf.participated !== true) {
            participatedNote = `<div style="font-size:11px;color:#1e40af;margin-top:2px;font-style:italic;">💬 Đã tham gia thảo luận</div>`;
        }
        
        memberInfoList.push({
            uid: mid,
            displayName: displayName,
            email: email,
            conf: conf,
            level: level,
            levelIcon: levelIcon,
            levelText: levelText,
            levelColor: levelColor,
            levelBg: levelBg,
            levelBorder: levelBorder,
            hasDiscussed: memberHasDiscussed,
            participatedNote: participatedNote
        });
    }
    
    // Sort: theo mức độ từ cao xuống thấp, rồi theo tên
    const levelOrder = { 'confirmed': 0, 'participated': 1, 'viewed': 2, 'none': 3 };
    memberInfoList.sort((a, b) => {
        const oa = levelOrder[a.level] !== undefined ? levelOrder[a.level] : 99;
        const ob = levelOrder[b.level] !== undefined ? levelOrder[b.level] : 99;
        if (oa !== ob) return oa - ob;
        return (a.displayName || '').localeCompare(b.displayName || '');
    });
    
    const totalMembers = memberIds.length;
    const confirmedCount = countConfirmed;
    const unconfirmedCount = totalMembers - confirmedCount;
    
    // ============================================================
    // BƯỚC 7: BUILD HTML
    // ============================================================
    let html = `
        <div class="section-card">
            <div class="section-header">
                <h3>✅ Xác nhận tham gia</h3>
                <div style="font-size:13px;color:var(--gray-500);">
                    <strong>${confirmedCount}/${totalMembers}</strong> đã xác nhận
                </div>
            </div>
            <div class="section-body">
    `;
    
    // ==== TIẾN ĐỘ CÁ NHÂN ====
    html += `
        <div style="margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);border:2px solid #7dd3fc;border-radius:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                <div style="font-size:15px;font-weight:700;color:#0c4a6e;">
                    📋 Tiến độ xác nhận của bạn
                </div>
                ${hasMissing ? `
                    <span style="font-size:12px;font-weight:700;padding:4px 12px;background:#fef3c7;color:#92400e;border-radius:12px;">
                        ⏳ Còn ${missingSteps.length} bước
                    </span>
                ` : `
                    <span style="font-size:12px;font-weight:700;padding:4px 12px;background:#dcfce7;color:#15803d;border-radius:12px;">
                        ✅ Đã hoàn tất
                    </span>
                `}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                <div class="confirmation-item ${userHasReached ? 'done' : ''}">
                    ${userHasReached ? '✅' : '⬜'} Đã tiếp cận
                    ${hasUserDiscussed && !userConf.viewedMeetingAt ? `<span style="font-size:11px;color:#1e40af;margin-left:4px;">(qua thảo luận)</span>` : ''}
                </div>
                <div class="confirmation-item ${userHasParticipated ? 'done' : ''}">
                    ${userHasParticipated ? '✅' : '⬜'} Đã tham gia
                    ${hasUserDiscussed && userConf.participated !== true ? `<span style="font-size:11px;color:#1e40af;margin-left:4px;">(qua thảo luận)</span>` : ''}
                </div>
                ${hasConcluded ? `
                    <div class="confirmation-item ${userConf.conclusionRead ? 'done' : ''}">
                        ${userConf.conclusionRead ? '✅' : '⬜'} Đã đọc kết luận
                    </div>
                ` : ''}
                <div class="confirmation-item ${userConf.finalConfirmed ? 'done' : ''}">
                    ${userConf.finalConfirmed ? '🔐' : '⬜'} Xác nhận hồ sơ
                </div>
            </div>
        </div>
    `;
    
    // ==== NÚT "XÁC NHẬN NHANH" ====
    if (canQuickConfirm) {
        html += `
            <div style="margin-bottom:16px;padding:16px;background:linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);border:2px dashed #34d399;border-radius:12px;">
                <div style="font-size:14px;font-weight:700;color:#065f46;margin-bottom:6px;">
                    🚀 Xác nhận nhanh
                </div>
                <div style="font-size:13px;color:#047857;line-height:1.6;margin-bottom:12px;">
                    Bấm 1 nút để hoàn tất tất cả các bước còn thiếu:
                    <strong>${missingSteps.join(', ')}</strong>
                </div>
                <button class="btn-quick-confirm" 
                        onclick="confirmAllSteps('${meetingId}')"
                        style="
                            width:100%;
                            padding:16px 24px;
                            font-size:16px;
                            font-weight:800;
                            color:#fff;
                            background:linear-gradient(135deg, #10b981 0%, #059669 100%);
                            border:none;
                            border-radius:10px;
                            cursor:pointer;
                            box-shadow:0 6px 20px rgba(16,185,129,0.4);
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            gap:12px;
                            letter-spacing:0.5px;
                            transition:all 0.25s;
                            font-family:inherit;
                        "
                        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 10px 28px rgba(16,185,129,0.55)';"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 20px rgba(16,185,129,0.4)';">
                    <i class="fas fa-rocket" style="font-size:20px;"></i>
                    <span>XÁC NHẬN HOÀN TẤT HỒ SƠ</span>
                </button>
            </div>
        `;
    }
    
    // ==== NÚT HÀNH ĐỘNG RIÊNG LẺ ====
    if (!isClosed && isMember) {
        const actionButtons = [];
        
        if (!userHasParticipated) {
            actionButtons.push(`
                <button class="btn-primary" onclick="confirmParticipation('${meetingId}')">
                    <i class="fas fa-check"></i> Xác nhận đã tham gia
                </button>
            `);
        }
        
        if (hasConcluded && allConcluded && !userConf.conclusionRead) {
            actionButtons.push(`
                <button class="btn-primary" onclick="confirmConclusionRead('${meetingId}')">
                    <i class="fas fa-book-reader"></i> Đã đọc kết luận
                </button>
            `);
        }
        
        if (isConfirmation && !userConf.finalConfirmed) {
            actionButtons.push(`
                <button class="btn-success" onclick="confirmFinal('${meetingId}')">
                    <i class="fas fa-file-signature"></i> Xác nhận hồ sơ cuộc họp
                </button>
            `);
        }
        
        if (actionButtons.length > 0) {
            html += `
                <div style="margin-bottom:16px;">
                    <div style="font-size:12px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                        Hoặc xác nhận từng bước
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        ${actionButtons.join('')}
                    </div>
                </div>
            `;
        }
    }
    
    // ==== LỜI TUYÊN BỐ XÁC NHẬN CUỐI ====
    if (isConfirmation && !userConf.finalConfirmed && !isClosed) {
        html += `
            <div style="font-size:13px;color:var(--gray-500);margin-bottom:16px;padding:10px 14px;background:var(--gray-50);border-radius:6px;line-height:1.6;">
                "Tôi xác nhận đã tham gia, đã tiếp cận nội dung và kết luận của cuộc họp, 
                đồng thời đã tiếp nhận các nhiệm vụ thuộc trách nhiệm của mình."
            </div>
        `;
    }
    
    // ==== LÝ DO CHỐT NGOẠI LỆ ====
    if (isClosed && meeting.forceCloseReason) {
        html += `
            <div style="margin-bottom:16px;padding:12px 16px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;color:#92400e;">
                <div style="font-weight:600;font-size:14px;margin-bottom:6px;">
                    ⚠️ Hồ sơ được chốt ngoại lệ
                </div>
                <div style="font-size:14px;line-height:1.6;">
                    <strong>Lý do:</strong> ${escapeHtml(meeting.forceCloseReason)}
                </div>
                <div style="font-size:12px;color:#a16207;margin-top:8px;">
                    ${meeting.forceClosedAt ? formatDate(meeting.forceClosedAt, true) : ''}
                </div>
            </div>
        `;
    }
    
    // ==== DANH SÁCH THÀNH VIÊN ====
    html += `
        <div style="border-top:1px solid var(--gray-200);padding-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                <div style="font-size:14px;font-weight:600;color:var(--gray-700);">
                    👥 Danh sách thành viên
                </div>
                <div style="font-size:12px;color:var(--gray-500);">
                    Sắp xếp theo mức độ hoàn thành
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
    `;
    
    if (memberInfoList.length === 0) {
        html += `<div style="color:var(--gray-400);font-style:italic;padding:8px;">Chưa có thành viên nào.</div>`;
    } else {
        memberInfoList.forEach(m => {
            const isMe = m.uid === uid;
            const isConfirmed = m.conf.finalConfirmed === true;
            
            let confirmTime = '';
            if (isConfirmed && m.conf.finalConfirmedAt) {
                confirmTime = `<div style="font-size:11px;color:#16a34a;margin-top:2px;">🕒 Chốt lúc ${formatDate(m.conf.finalConfirmedAt, true)}</div>`;
            } else if (m.conf.participatedAt && !isConfirmed) {
                confirmTime = `<div style="font-size:11px;color:${m.levelColor};margin-top:2px;">🕒 Tham gia lúc ${formatDate(m.conf.participatedAt, true)}</div>`;
            } else if (m.conf.viewedMeetingAt && m.level === 'viewed') {
                confirmTime = `<div style="font-size:11px;color:${m.levelColor};margin-top:2px;">🕒 Xem lúc ${formatDate(m.conf.viewedMeetingAt, true)}</div>`;
            }
            
            html += `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${m.levelBg};border:1px solid ${m.levelBorder};border-radius:8px;">
                    <span style="font-size:18px;flex-shrink:0;">${m.levelIcon}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;color:var(--gray-800);font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${escapeHtml(m.displayName)}
                            ${isMe ? '<span style="font-size:11px;color:var(--primary);background:var(--primary-bg);padding:1px 6px;border-radius:6px;margin-left:6px;font-weight:500;">Bạn</span>' : ''}
                        </div>
                        ${m.email ? `<div style="font-size:12px;color:var(--gray-500);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.email)}</div>` : ''}
                        ${confirmTime}
                        ${m.participatedNote}
                    </div>
                    <span style="font-size:12px;font-weight:700;color:${m.levelColor};white-space:nowrap;">
                        ${m.levelText}
                    </span>
                </div>
            `;
        });
    }
    
    html += `
            </div>
        </div>
    `;
    
    // ==== THỐNG KÊ CHO TỔ TRƯỞNG ====
    if (isLeader) {
        const reachedPercent = totalMembers > 0 ? Math.round((countReached / totalMembers) * 100) : 0;
        const participatedPercent = totalMembers > 0 ? Math.round((countParticipated / totalMembers) * 100) : 0;
        const confirmedPercent = totalMembers > 0 ? Math.round((countConfirmed / totalMembers) * 100) : 0;
        
        let statsBg, statsColor, statsExtra;
        if (unconfirmedCount === 0) {
            statsBg = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
            statsColor = '#15803d';
            statsExtra = ' — Tất cả đã xác nhận ✅';
        } else {
            statsBg = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
            statsColor = '#1e40af';
            statsExtra = ` — Còn <strong>${unconfirmedCount}</strong> chưa xác nhận`;
        }
        
        html += `
            <div style="margin-top:16px;padding:16px;background:${statsBg};border-radius:10px;border:1px solid ${statsColor}33;">
                <div style="font-size:14px;font-weight:700;color:${statsColor};margin-bottom:12px;">
                    📊 Thống kê chi tiết cho Tổ trưởng
                </div>
                
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:10px;margin-bottom:12px;">
                    <div style="padding:12px;background:#ffffff;border-radius:8px;border-left:4px solid #f59e0b;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <div style="font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">👀 Đã tiếp cận</div>
                        <div style="font-size:24px;font-weight:800;color:#92400e;line-height:1.2;margin-top:4px;">
                            ${countReached}<span style="font-size:14px;font-weight:600;color:#a16207;">/${totalMembers}</span>
                        </div>
                        <div style="font-size:12px;color:#a16207;margin-top:2px;">${reachedPercent}%</div>
                    </div>
                    
                    <div style="padding:12px;background:#ffffff;border-radius:8px;border-left:4px solid #3b82f6;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <div style="font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">🤝 Đã tham gia</div>
                        <div style="font-size:24px;font-weight:800;color:#1e40af;line-height:1.2;margin-top:4px;">
                            ${countParticipated}<span style="font-size:14px;font-weight:600;color:#3b82f6;">/${totalMembers}</span>
                        </div>
                        <div style="font-size:12px;color:#3b82f6;margin-top:2px;">${participatedPercent}%</div>
                    </div>
                    
                    <div style="padding:12px;background:#ffffff;border-radius:8px;border-left:4px solid #22c55e;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <div style="font-size:11px;color:#15803d;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">✅ Hoàn tất xác nhận</div>
                        <div style="font-size:24px;font-weight:800;color:#15803d;line-height:1.2;margin-top:4px;">
                            ${countConfirmed}<span style="font-size:14px;font-weight:600;color:#22c55e;">/${totalMembers}</span>
                        </div>
                        <div style="font-size:12px;color:#22c55e;margin-top:2px;">${confirmedPercent}%</div>
                    </div>
                </div>
                
                <div style="font-size:13px;color:${statsColor};line-height:1.6;">
                    <strong>📌 Tóm tắt:</strong>
                    ${countReached} người đã tiếp cận, 
                    ${countParticipated} người đã tham gia, 
                    ${countConfirmed} người hoàn tất xác nhận${statsExtra}
                </div>
                
                <div style="margin-top:10px;padding:8px 12px;background:#ffffff;border-radius:6px;font-size:12px;color:${statsColor};font-style:italic;line-height:1.5;">
                    💡 <strong>Lưu ý:</strong> Thành viên đã gửi ý kiến thảo luận được tự động tính là "Đã tiếp cận" và "Đã tham gia", 
                    dù chưa bấm nút xác nhận chính thức.
                </div>
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================================
// CONFIRM PARTICIPATION
// ============================================================

/**
 * Xác nhận tham gia cuộc họp
 * @param {string} meetingId
 */
async function confirmParticipation(meetingId) {
    const btn = event ? event.target.closest('button') : null;
    const oldHtml = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    }
    
    try {
        await recordConfirmation(meetingId, 'PARTICIPATION');
        showToast('✅ Đã xác nhận tham gia!', 'success', 3000);
        
        const container = document.getElementById('confirmationSection');
        if (container) {
            await renderConfirmations(meetingId, container);
        }
    } catch (error) {
        console.error('Confirm participation error:', error);
        showToast('❌ Lỗi xác nhận: ' + error.message, 'error', 5000);
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = oldHtml;
        }
    }
}

// ============================================================
// CONFIRM CONCLUSION READ
// ============================================================

/**
 * Xác nhận đã đọc kết luận
 * @param {string} meetingId
 */
async function confirmConclusionRead(meetingId) {
    const btn = event ? event.target.closest('button') : null;
    const oldHtml = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    }
    
    try {
        await recordConfirmation(meetingId, 'CONCLUSION_READ');
        showToast('✅ Đã xác nhận đọc kết luận!', 'success', 3000);
        
        const container = document.getElementById('confirmationSection');
        if (container) {
            await renderConfirmations(meetingId, container);
        }
    } catch (error) {
        console.error('Confirm conclusion read error:', error);
        showToast('❌ Lỗi xác nhận: ' + error.message, 'error', 5000);
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = oldHtml;
        }
    }
}

// ============================================================
// CONFIRM FINAL
// ============================================================

/**
 * Xác nhận cuối cùng hồ sơ cuộc họp
 * @param {string} meetingId
 */
async function confirmFinal(meetingId) {
    showConfirm(
        'Xác nhận hồ sơ cuộc họp',
        'Bạn xác nhận đã tham gia, đã tiếp cận nội dung và kết luận của cuộc họp, đồng thời đã tiếp nhận các nhiệm vụ thuộc trách nhiệm của mình?',
        async () => {
            try {
                await recordConfirmation(meetingId, 'FINAL');
                showToast('🔐 Đã xác nhận hồ sơ thành công!', 'success', 3000);
                
                const container = document.getElementById('confirmationSection');
                if (container) {
                    await renderConfirmations(meetingId, container);
                }
                
                try {
                    await checkAllConfirmed(meetingId);
                } catch (e) {
                    console.warn('Không kiểm tra được trạng thái tổng:', e);
                }
            } catch (error) {
                console.error('Confirm final error:', error);
                showToast('❌ Lỗi xác nhận hồ sơ: ' + error.message, 'error', 5000);
            }
        },
        'Xác nhận'
    );
}

// ============================================================
// CONFIRM ALL STEPS (1-CLICK)
// ============================================================

/**
 * Xác nhận NHANH TẤT CẢ các bước còn thiếu trong 1 lần bấm
 * @param {string} meetingId
 */
async function confirmAllSteps(meetingId) {
    const btn = event ? event.target.closest('button') : null;
    const oldHtml = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    }
    
    try {
        const result = await recordConfirmationAll(meetingId);
        
        if (result.alreadyDone) {
            showToast('ℹ️ Bạn đã hoàn tất tất cả các bước xác nhận', 'info', 3000);
        } else {
            const fieldLabels = {
                'viewedMeetingAt': 'tiếp cận',
                'participated': 'tham gia',
                'conclusionRead': 'đọc kết luận',
                'finalConfirmed': 'xác nhận hồ sơ'
            };
            const labels = result.updatedFields.map(f => fieldLabels[f] || f).join(', ');
            showToast(`🚀 Đã xác nhận hoàn tất ${result.updated} bước: ${labels}!`, 'success', 4000);
        }
        
        // Refresh UI
        const container = document.getElementById('confirmationSection');
        if (container) {
            await renderConfirmations(meetingId, container);
        }
        
        // Kiểm tra nếu tất cả đã xác nhận
        try {
            await checkAllConfirmed(meetingId);
        } catch (e) {
            console.warn('Không kiểm tra được trạng thái tổng:', e);
        }
    } catch (error) {
        console.error('Confirm all error:', error);
        showToast('❌ Lỗi xác nhận nhanh: ' + error.message, 'error', 5000);
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = oldHtml;
        }
    }
}

// ============================================================
// CHECK ALL CONFIRMED
// ============================================================

/**
 * Kiểm tra nếu tất cả thành viên đã xác nhận cuối cùng
 * @param {string} meetingId
 */
async function checkAllConfirmed(meetingId) {
    const meeting = await getMeeting(meetingId);
    if (!meeting) return;
    if (meeting.status !== 'CONFIRMATION') return;
    
    const confirmations = await getConfirmations(meetingId);
    const memberIds = Object.keys(meeting.memberIds || {});
    const allConfirmed = memberIds.every(uid => {
        return confirmations[uid] && confirmations[uid].finalConfirmed === true;
    });
    
    if (allConfirmed && memberIds.length > 0) {
        showToast('🎉 Tất cả thành viên đã xác nhận! Hồ sơ có thể được chốt.', 'success', 5000);
    }
}

// ============================================================
// EXPORTS
// ============================================================
window.renderConfirmations = renderConfirmations;
window.confirmParticipation = confirmParticipation;
window.confirmConclusionRead = confirmConclusionRead;
window.confirmFinal = confirmFinal;
window.confirmAllSteps = confirmAllSteps;
window.checkAllConfirmed = checkAllConfirmed;