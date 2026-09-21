// ============================================================
// ARCHIVE / ELECTRONIC RECORD MODULE
// ============================================================

/**
 * Render archive page (electronic records)
 * @param {HTMLElement} container
 */
async function renderArchive(container) {
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
    
    // Only show closed meetings
    const closedMeetings = meetings.filter(m => m.status === 'CLOSED');
    closedMeetings.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
    
    let html = `
        <div class="section-card">
            <div class="section-header">
                <h3>📁 Hồ sơ điện tử</h3>
                <span class="badge" style="background:var(--gray-500);color:white;padding:2px 12px;border-radius:20px;">
                    ${closedMeetings.length}
                </span>
            </div>
            <div class="section-body">
                ${closedMeetings.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-archive" style="font-size:36px;"></i>
                        <h3>Chưa có hồ sơ nào</h3>
                        <p>Hồ sơ sẽ xuất hiện sau khi cuộc họp được chốt.</p>
                    </div>
                ` : `
                    ${closedMeetings.map(m => `
                        <div class="meeting-card" onclick="navigateTo('meeting-detail', {id: '${m.id}'})">
                            <div class="meeting-card-header">
                                <span class="meeting-card-title">📄 ${escapeHtml(m.title)}</span>
                                <span class="meeting-card-code">${escapeHtml(m.code || '')}</span>
                            </div>
                            <div class="meeting-card-body">
                                <span><i class="far fa-calendar"></i> ${formatDate(m.meetingDate)}</span>
                                <span><i class="fas fa-lock"></i> Chốt: ${formatDate(m.closedAt, true)}</span>
                                <span><i class="fas fa-user"></i> Người chốt: ${escapeHtml(m.closedBy || '')}</span>
                            </div>
                            <div class="meeting-card-footer">
                                ${getStatusBadge(m.status)}
                                <button class="btn-secondary" style="padding:6px 16px;font-size:13px;" onclick="event.stopPropagation();exportMeetingPDF('${m.id}')">
                                    <i class="fas fa-file-pdf"></i> Xuất PDF
                                </button>
                            </div>
                        </div>
                    `).join('')}
                `}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Export meeting to PDF (placeholder - would use jsPDF or similar)
 * @param {string} meetingId
 */

async function exportMeetingPDF(meetingId) {
    showToast('Đang tạo PDF...', 'info', 2000);
    // In a real implementation, this would generate a PDF
    // For MVP, we'll simulate with a print-friendly view
    showModal('Xuất hồ sơ', `
        <p>Chức năng xuất PDF sẽ được tích hợp trong PHASE 2.</p>
        <p style="font-size:13px;color:var(--gray-500);">Hiện tại bạn có thể in trang này để lưu dạng PDF.</p>
        <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn-primary" onclick="window.print()">
                <i class="fas fa-print"></i> In / Lưu PDF
            </button>
            <button class="btn-secondary" onclick="window.close()">Đóng</button>
        </div>
    `, []);
}

// Export
window.renderArchive = renderArchive;
window.exportMeetingPDF = exportMeetingPDF;