// ============================================================
// DISCUSSION MODULE - Render and manage discussions
// ============================================================

/**
 * Render discussion section for a meeting
 * @param {string} meetingId
 * @param {string} contentId - Content ID to filter discussions
 * @param {HTMLElement} container
 * @param {boolean} readOnly - If true, hide comment form
 */
async function renderDiscussions(meetingId, contentId, container, readOnly = false) {
    try {
        const discussions = await getDiscussions(meetingId, contentId);
        const uid = getCurrentUid();
        const role = await getCurrentUserRole();
        const isLeader = role === 'truong_to' || role === 'admin';
        
        // Build thread hierarchy
        const threads = [];
        const replies = {};
        
        discussions.forEach(d => {
            if (d.parentId) {
                if (!replies[d.parentId]) replies[d.parentId] = [];
                replies[d.parentId].push(d);
            } else {
                threads.push(d);
            }
        });
        
        threads.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        
        let html = `
            <div class="discussion-thread">
                ${threads.length === 0 ? `
                    <div class="empty-state" style="padding:16px;">
                        <i class="fas fa-comments" style="font-size:28px;"></i>
                        <p>Chưa có ý kiến nào.</p>
                    </div>
                ` : `
                    ${threads.map(t => renderDiscussionItem(t, replies[t.id] || [], uid, isLeader, readOnly)).join('')}
                `}
            </div>
        `;
        
        // Add discussion form if not read-only
        if (!readOnly && uid) {
            const formKey = `disc_${contentId || 'all'}`;
            if (!window._pendingLinks) window._pendingLinks = {};
            window._pendingLinks[formKey] = [];
            
            html += `
                <div class="discussion-form" id="discussionForm_${contentId || 'all'}">
                    <h4 style="margin-bottom:8px;font-size:15px;">💬 Viết ý kiến của bạn</h4>
                    <textarea id="discussionInput_${contentId || 'all'}" placeholder="Nhập ý kiến... Có thể đính kèm link Google Drive bên dưới." rows="3"></textarea>
                    
                    <div style="margin-top:12px;padding:12px;background:var(--gray-50);border-radius:8px;">
                        <div style="font-size:13px;font-weight:600;color:var(--gray-600);margin-bottom:8px;">
                            🔗 Đính kèm tài liệu (Google Drive)
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                            <input type="text" id="attachUrl_${formKey}" placeholder="https://drive.google.com/file/d/.../view" style="flex:2;min-width:200px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                            <input type="text" id="attachName_${formKey}" placeholder="Tên file (tùy chọn)" style="flex:1;min-width:120px;padding:8px 12px;border:2px solid var(--gray-200);border-radius:6px;font-size:13px;">
                            <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:13px;" onclick="addAttachmentTagFromInput('${formKey}')">
                                <i class="fas fa-plus"></i> Thêm link
                            </button>
                        </div>
                        <div id="attachList_${formKey}" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
                            <span style="font-size:13px;color:var(--gray-400);font-style:italic;">Chưa có tài liệu đính kèm.</span>
                        </div>
                    </div>
                    
                    <div class="form-actions" style="margin-top:12px;">
                        <button class="btn-primary" onclick="submitDiscussion('${meetingId}', '${contentId || ''}')" style="margin-left:auto;">
                            <i class="fas fa-paper-plane"></i> Gửi
                        </button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error rendering discussions:', error);
        container.innerHTML = `<p class="error">Lỗi tải thảo luận: ${escapeHtml(error.message)}</p>`;
    }
}

/**
 * Render a single discussion item
 * @param {Object} discussion
 * @param {Array} replies
 * @param {string} currentUid
 * @param {boolean} isLeader
 * @param {boolean} readOnly
 * @returns {string} HTML
 */
/**
 * Render một discussion item (đã có link đính kèm)
 * @param {Object} discussion
 * @param {Array} replies
 * @param {string} currentUid
 * @param {boolean} isLeader
 * @param {boolean} readOnly
 * @returns {string} HTML
 */
function renderDiscussionItem(discussion, replies, currentUid, isLeader, readOnly) {
    const isAuthor = discussion.authorId === currentUid;
    const canEdit = isAuthor || isLeader;
    const time = formatDate(discussion.createdAt, true);
    const isEdited = discussion.status === 'EDITED';
    
    let html = `
        <div class="discussion-item" id="disc_${discussion.id}">
            <div class="discussion-author">
                <span class="avatar">${(discussion.authorName || 'U').charAt(0).toUpperCase()}</span>
                <span>${escapeHtml(discussion.authorName || 'Người dùng')}</span>
                <span class="discussion-time">${time}</span>
                ${isEdited ? `<span style="font-size:12px;color:var(--gray-400);margin-left:4px;">✏️ Đã sửa</span>` : ''}
            </div>
            <div class="discussion-content">${escapeHtml(discussion.content)}</div>
    `;
    
    // === RENDER ATTACHMENTS ===
    html += renderAttachmentsHTML(discussion.attachments, {
        small: true,
        showFileId: true
    });
    
    // Actions
    if (!readOnly && currentUid) {
        html += `
            <div class="discussion-actions">
                <button class="btn-secondary" style="padding:4px 12px;font-size:13px;" onclick="showReplyForm('${discussion.id}', '${discussion.contentId || ''}')">
                    <i class="fas fa-reply"></i> Phản hồi
                </button>
                ${canEdit ? `
                    <button class="btn-secondary" style="padding:4px 12px;font-size:13px;" onclick="editDiscussion('${discussion.meetingId || ''}', '${discussion.id}', '${discussion.contentId || ''}')">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    // Replies
    if (replies && replies.length > 0) {
        html += `
            <div class="discussion-reply-count" onclick="toggleReplies('${discussion.id}')">
                💬 ${replies.length} phản hồi
            </div>
            <div id="replies_${discussion.id}" style="display:none;">
                ${replies.map(r => renderDiscussionItem(r, [], currentUid, isLeader, readOnly)).join('')}
            </div>
        `;
    }
    
    html += `</div>`;
    return html;
}

/**
 * Submit a discussion (with Google Drive links)
 * @param {string} meetingId
 * @param {string} contentId
 * @param {string} parentId - Optional parent discussion ID
 */
/**
 * Submit a discussion (with Google Drive links)
 * Sau khi gửi thành công sẽ refresh lại giao diện để cập nhật discussionCount
 * @param {string} meetingId
 * @param {string} contentId
 * @param {string} parentId - Optional parent discussion ID
 */
async function submitDiscussion(meetingId, contentId, parentId = null) {
    const uid = getCurrentUid();
    if (!uid) {
        showToast('Vui lòng đăng nhập', 'error');
        return;
    }
    
    const inputKey = contentId || 'all';
    const input = document.getElementById(`discussionInput_${inputKey}`);
    if (!input) return;
    const content = input.value.trim();
    if (!content) {
        showToast('Vui lòng nhập nội dung', 'warning');
        return;
    }
    
    const formKey = `disc_${inputKey}`;
    const pendingLinks = getPendingLinks(formKey);
    
    const attachments = {};
    pendingLinks.forEach(link => {
        const firebaseKey = `gdrive_${link.fileId}`;
        attachments[firebaseKey] = {
            fileName: link.fileName,
            fileType: 'application/octet-stream',
            url: link.url,
            fileId: link.fileId,
            source: 'googledrive',
            uploadedBy: uid,
            uploadedAt: firebase.database.ServerValue.TIMESTAMP
        };
    });
    
    try {
        await addDiscussion(meetingId, {
            contentId: contentId || null,
            content: content,
            parentId: parentId,
            attachments: attachments
        });
        
        showToast('Đã gửi ý kiến thành công!', 'success');
        
        input.value = '';
        resetPendingLinks(formKey);
        
        const container = document.getElementById(`discussions_${inputKey}`)
                       || document.getElementById('discussionsContainer');
        
        if (container && typeof renderDiscussions === 'function') {
            await renderDiscussions(meetingId, contentId || null, container);
        }
        
        const pageContainer = document.getElementById('pageContainer');
        const isMeetingDetailPage = pageContainer && 
            pageContainer.querySelector('.meeting-detail-header');
        
        if (isMeetingDetailPage && typeof renderMeetingDetail === 'function') {
            await renderMeetingDetail(pageContainer, meetingId);
            if (typeof switchTab === 'function') {
                switchTab('discussions');
            }
        }
    } catch (error) {
        console.error('Error submitting discussion:', error);
        showToast('Lỗi gửi ý kiến: ' + error.message, 'error');
    }
}



/**
 * Show reply form
 * @param {string} parentId
 * @param {string} contentId
 */
function showReplyForm(parentId, contentId) {
    const inputKey = contentId || 'all';
    const input = document.getElementById(`discussionInput_${inputKey}`);
    if (input) {
        input.focus();
        input.placeholder = `Phản hồi ý kiến này...`;
        window._replyParentId = parentId;
    }
}

/**
 * Edit a discussion (chỉ thêm link mới, không sửa/xóa link cũ)
 * @param {string} meetingId
 * @param {string} discussionId
 * @param {string} contentId
 */
async function editDiscussion(meetingId, discussionId, contentId) {
    const snapshot = await db.ref(`discussions/${meetingId}/${discussionId}`).once('value');
    const disc = snapshot.val();
    if (!disc) {
        showToast('Không tìm thấy ý kiến', 'error');
        return;
    }
    
    const currentContent = disc.content || '';
    const oldAttachments = disc.attachments || {};
    
    // Danh sách link cũ - KHÓA, không xóa được
    const lockedLinks = Object.values(oldAttachments).map(att => ({
        url: att.url,
        fileId: att.fileId || extractGoogleDriveId(att.url) || '',
        fileName: att.fileName || 'Tài liệu',
        isNew: false
    }));
    
    const formKey = `edit_disc_${discussionId}`;
    if (!window._pendingLinks) window._pendingLinks = {};
    window._pendingLinks[formKey] = [...lockedLinks];
    
    showModal('Sửa ý kiến', `
        <div class="form-group">
            <label>Nội dung</label>
            <textarea id="editDiscussionContent" rows="4">${escapeHtml(currentContent)}</textarea>
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
                    <i class="fas fa-lock"></i> Link cũ đã được khóa để đảm bảo tính toàn vẹn – chỉ có thể thêm link mới.
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
                const newContent = document.getElementById('editDiscussionContent').value.trim();
                if (!newContent) {
                    showToast('Vui lòng nhập nội dung', 'warning');
                    return;
                }
                
                const allLinks = getPendingLinks(formKey);
                const newLinks = allLinks.filter(l => l.isNew === true);
                
                // Chỉ bổ sung thêm link mới, KHÔNG ghi đè link cũ
                const newAttachments = {};
                newLinks.forEach(link => {
                    const key = `gdrive_${link.fileId}`;
                    newAttachments[key] = {
                        fileName: link.fileName,
                        fileType: 'application/octet-stream',
                        url: link.url,
                        fileId: link.fileId,
                        source: 'googledrive',
                        uploadedBy: getCurrentUid(),
                        uploadedAt: firebase.database.ServerValue.TIMESTAMP
                    };
                });
                
                try {
                    await updateDiscussion(meetingId, discussionId, { content: newContent });
                    
                    // Ghi từng attachment mới vào DB (không đụng link cũ)
                    for (const key of Object.keys(newAttachments)) {
                        await db.ref(`discussions/${meetingId}/${discussionId}/attachments/${key}`).set(newAttachments[key]);
                    }
                    
                    showToast('Đã cập nhật ý kiến', 'success');
                    close();
                    resetPendingLinks(formKey);
                    
                    const container = document.getElementById(`discussions_${contentId || 'all'}`)
                                   || document.getElementById('discussionsContainer');
                    if (container) {
                        await renderDiscussions(meetingId, contentId || null, container);
                    }
                } catch (error) {
                    showToast('Lỗi: ' + error.message, 'error');
                }
            }
        }
    ]);
}

/**
 * Toggle replies visibility
 * @param {string} discussionId
 */
function toggleReplies(discussionId) {
    const container = document.getElementById(`replies_${discussionId}`);
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Open image preview in modal
 * @param {string} url
 */
function openImagePreview(url) {
    showModal('Xem ảnh', `
        <div style="text-align:center;">
            <img src="${url}" alt="Hình ảnh" style="max-width:100%;max-height:70vh;border-radius:4px;">
        </div>
    `, []);
}

/**
 * Open PDF preview in modal
 * @param {string} url
 * @param {string} fileName
 */
function openPDFPreview(url, fileName) {
    showModal(`📄 ${fileName}`, `
        <div style="text-align:center;padding:10px;">
            <iframe src="${url}" style="width:100%;height:60vh;border:none;border-radius:4px;"></iframe>
            <div style="margin-top:10px;">
                <a href="${url}" target="_blank" class="btn-primary" style="display:inline-flex;gap:8px;">
                    <i class="fas fa-external-link-alt"></i> Mở trong tab mới
                </a>
            </div>
        </div>
    `, []);
}

// ============================================================
// EXPORTS
// ============================================================
window.renderDiscussions = renderDiscussions;
window.renderDiscussionItem = renderDiscussionItem;
window.submitDiscussion = submitDiscussion;
window.showReplyForm = showReplyForm;
window.editDiscussion = editDiscussion;
window.toggleReplies = toggleReplies;
window.openImagePreview = openImagePreview;
window.openPDFPreview = openPDFPreview;