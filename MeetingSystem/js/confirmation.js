// ============================================================
// CONFIRMATION MODULE
// ============================================================

/**
 * Render confirmation section for a meeting
 * @param {string} meetingId
 * @param {HTMLElement} container
 */
/**
 * Render confirmation section cho một meeting
 * - Hiển thị tiến độ cá nhân
 * - Hiển thị danh sách TẤT CẢ thành viên (kèm tên, không hiển thị UID)
 * - Hiển thị lý do chốt ngoại lệ nếu có
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
    
    const confirmations = await getConfirmations(meetingId);
    const userConf = confirmations[uid] || {};
    const role = await getCurrentUserRole();
    const isLeader = role === 'truong_to' || role === 'admin';
    
    // Kiểm tra trạng thái kết luận
    const contents = await getMeetingContents(meetingId);
    const hasConcluded = contents.some(c => c.status === 'CONCLUDED');
    const allConcluded = contents.length > 0 && contents.every(c => c.status === 'CONCLUDED');
    const isClosed = meeting.status === 'CLOSED';
    const isConfirmation = meeting.status === 'CONFIRMATION';
    
    // ==== LOAD THÔNG TIN TẤT CẢ THÀNH VIÊN ====
    const memberIds = Object.keys(meeting.memberIds || {});
    const memberInfoList = [];
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
        memberInfoList.push({
            uid: mid,
            displayName: displayName,
            email: email,
            conf: confirmations[mid] || {}
        });
    }
    
    // Sắp xếp: người đã xác nhận lên trước
    memberInfoList.sort((a, b) => {
        const ac = a.conf.finalConfirmed ? 1 : 0;
        const bc = b.conf.finalConfirmed ? 1 : 0;
        if (ac !== bc) return bc - ac;
        return (a.displayName || '').localeCompare(b.displayName || '');
    });
    
    const totalMembers = memberIds.length;
    const confirmedCount = memberInfoList.filter(m => m.conf.finalConfirmed === true).length;
    const unconfirmedCount = totalMembers - confirmedCount;
    
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
        <div style="margin-bottom:16px;padding:12px 16px;background:var(--gray-50);border-radius:8px;">
            <div style="font-size:14px;font-weight:600;color:var(--gray-700);margin-bottom:8px;">
                📋 Tiến độ xác nhận của bạn
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                <div class="confirmation-item ${userConf.viewedMeetingAt ? 'done' : ''}">
                    ${userConf.viewedMeetingAt ? '✅' : '⬜'} Đã tiếp cận
                </div>
                <div class="confirmation-item ${userConf.participated ? 'done' : ''}">
                    ${userConf.participated ? '✅' : '⬜'} Đã tham gia
                </div>
                ${hasConcluded ? `
                    <div class="confirmation-item ${userConf.conclusionRead ? 'done' : ''}">
                        ${userConf.conclusionRead ? '✅' : '⬜'} Đã đọc kết luận
                    </div>
                ` : ''}
                <div class="confirmation-item ${userConf.finalConfirmed ? 'done' : ''}">
                    ${userConf.finalConfirmed ? '🔐' : '⬜'} Đã xác nhận hồ sơ
                </div>
            </div>
        </div>
    `;
    
    // ==== NÚT HÀNH ĐỘNG CHO CHÍNH NGƯỜI DÙNG ====
    if (!isClosed) {
        const actionButtons = [];
        
        if (!userConf.participated) {
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
            html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">`;
            html += actionButtons.join('');
            html += `</div>`;
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
    
    // ==== LÝ DO CHỐT NGOẠI LỆ (nếu có) ====
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
            <div style="font-size:14px;font-weight:600;color:var(--gray-700);margin-bottom:10px;">
                👥 Danh sách thành viên
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
    `;
    
    if (memberInfoList.length === 0) {
        html += `<div style="color:var(--gray-400);font-style:italic;padding:8px;">Chưa có thành viên nào.</div>`;
    } else {
        memberInfoList.forEach(m => {
            const isConfirmed = m.conf.finalConfirmed === true;
            const isMe = m.uid === uid;
            const statusIcon = isConfirmed ? '✅' : '❌';
            const statusText = isConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận';
            const statusColor = isConfirmed ? '#15803d' : '#dc2626';
            const bgColor = isConfirmed ? '#f0fdf4' : '#fef2f2';
            const borderColor = isConfirmed ? '#bbf7d0' : '#fecaca';
            
            let confirmTime = '';
            if (isConfirmed && m.conf.finalConfirmedAt) {
                confirmTime = `<div style="font-size:11px;color:#16a34a;margin-top:2px;">🕒 ${formatDate(m.conf.finalConfirmedAt, true)}</div>`;
            }
            
            html += `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${bgColor};border:1px solid ${borderColor};border-radius:8px;">
                    <span style="font-size:18px;flex-shrink:0;">${statusIcon}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;color:var(--gray-800);font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${escapeHtml(m.displayName)}
                            ${isMe ? '<span style="font-size:11px;color:var(--primary);background:var(--primary-bg);padding:1px 6px;border-radius:6px;margin-left:6px;font-weight:500;">Bạn</span>' : ''}
                        </div>
                        ${m.email ? `<div style="font-size:12px;color:var(--gray-500);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.email)}</div>` : ''}
                        ${confirmTime}
                    </div>
                    <span style="font-size:12px;font-weight:600;color:${statusColor};white-space:nowrap;">
                        ${statusText}
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
        let statsColor = '#6d28d9';
        let statsBg = 'var(--info-bg)';
        let statsExtra = '';
        
        if (unconfirmedCount === 0) {
            statsBg = 'var(--success-bg)';
            statsColor = '#15803d';
            statsExtra = ' — Tất cả đã xác nhận ✅';
        } else {
            statsExtra = ` — Còn <strong>${unconfirmedCount}</strong> chưa xác nhận`;
        }
        
        html += `
            <div style="margin-top:16px;padding:12px 16px;background:${statsBg};border-radius:8px;font-size:13px;color:${statsColor};">
                <strong>📊 Thống kê:</strong>
                ${confirmedCount}/${totalMembers} thành viên đã xác nhận${statsExtra}
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Confirm participation
 * @param {string} meetingId
 */
async function confirmParticipation(meetingId) {
    try {
        await recordConfirmation(meetingId, 'PARTICIPATION');
        showToast('Đã xác nhận tham gia!', 'success');
        // Refresh
        const container = document.getElementById('confirmationSection');
        if (container) {
            await renderConfirmations(meetingId, container);
        }
    } catch (error) {
        showToast('Lỗi: ' + error.message, 'error');
    }
}

/**
 * Confirm conclusion read
 * @param {string} meetingId
 */
async function confirmConclusionRead(meetingId) {
    try {
        await updateConfirmation(meetingId, 'conclusionRead', true);
        showToast('Đã xác nhận đọc kết luận!', 'success');
        const container = document.getElementById('confirmationSection');
        if (container) {
            await renderConfirmations(meetingId, container);
        }
    } catch (error) {
        showToast('Lỗi: ' + error.message, 'error');
    }
}

/**
 * Confirm final
 * @param {string} meetingId
 */
async function confirmFinal(meetingId) {
    showConfirm(
        'Xác nhận hồ sơ cuộc họp',
        'Bạn xác nhận đã tham gia, đã tiếp cận nội dung và kết luận của cuộc họp, đồng thời đã tiếp nhận các nhiệm vụ thuộc trách nhiệm của mình?',
        async () => {
            try {
                await recordConfirmation(meetingId, 'FINAL');
                showToast('Đã xác nhận hồ sơ!', 'success');
                const container = document.getElementById('confirmationSection');
                if (container) {
                    await renderConfirmations(meetingId, container);
                }
                // Check if all confirmed
                await checkAllConfirmed(meetingId);
            } catch (error) {
                showToast('Lỗi: ' + error.message, 'error');
            }
        },
        'Xác nhận'
    );
}

/**
 * Check if all members have confirmed
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
        // Auto-close if all confirmed
        showToast('🎉 Tất cả thành viên đã xác nhận! Hồ sơ sẽ được chốt tự động.', 'success');
        // In real scenario, leader would close manually
    }
}

// Export
window.renderConfirmations = renderConfirmations;
window.confirmParticipation = confirmParticipation;
window.confirmConclusionRead = confirmConclusionRead;
window.confirmFinal = confirmFinal;
window.checkAllConfirmed = checkAllConfirmed;