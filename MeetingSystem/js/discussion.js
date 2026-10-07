// ============================================================
// DISCUSSION MODULE - Render and manage discussions
// ĐÃ NÂNG CẤP: Tích hợp Quill.js Rich Text Editor
// ============================================================

/**
 * Render discussion section for a meeting
 * @param {string} meetingId
 * @param {string} contentId
 * @param {HTMLElement} container
 * @param {boolean} readOnly
 */
async function renderDiscussions(meetingId, contentId, container, readOnly = false) {
    try {
        const discussions = await getDiscussions(meetingId, contentId);
        const uid = getCurrentUid();
        const role = await getCurrentUserRole();
        const isLeader = role === 'truong_to' || role === 'admin' 
                      || role === 'to_pho' || role === 'nhom_truong';
        const meeting = await getMeeting(meetingId);
        const isClosed = meeting && meeting.status === 'CLOSED';
        
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
        
        const inputKey = contentId || 'all';
        
        let html = `
            <div class="discussion-thread">
                ${threads.length === 0 ? `
                    <div class="empty-state" style="padding:16px;">
                        <i class="fas fa-comments" style="font-size:28px;"></i>
                        <p>Chưa có ý kiến nào.</p>
                    </div>
                ` : `
                    ${threads.map(t => renderDiscussionItem(t, replies[t.id] || [], uid, isLeader, readOnly, isClosed, meetingId)).join('')}
                `}
            </div>
        `;
        
        if (!readOnly && uid && !isClosed) {
            const formKey = `disc_${inputKey}`;
            if (!window._pendingLinks) window._pendingLinks = {};
            window._pendingLinks[formKey] = [];
            
            html += `
                <div class="discussion-form" id="discussionForm_${inputKey}">
                    <h4 style="margin-bottom:8px;font-size:15px;">
                        💬 Viết ý kiến của bạn
                        <span style="font-size:11px;color:var(--gray-500);font-weight:400;margin-left:6px;">
                            (Hỗ trợ in đậm, in nghiêng, gạch chân, danh sách)
                        </span>
                    </h4>
                    <div id="discussionEditorContainer_${inputKey}" style="background:#fff;border-radius:8px;"></div>
                    
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
        
        // ==== Khởi tạo Quill cho form input ====
        if (!readOnly && uid && !isClosed) {
            setTimeout(function() {
                const editorKey = `discussion_${inputKey}`;
                window._discussionQuills = window._discussionQuills || {};
                window._discussionQuills[editorKey] = initQuillEditor(
                    `#discussionEditorContainer_${inputKey}`,
                    '',
                    'Nhập ý kiến... Có thể dùng định dạng đậm/nghiêng/gạch chân và danh sách.'
                );
            }, 80);
        }
        
    } catch (error) {
        console.error('Error rendering discussions:', error);
        container.innerHTML = `<p class="error">Lỗi tải thảo luận: ${escapeHtml(error.message)}</p>`;
    }
}

/**
 * Render một discussion item
 * ĐÃ NÂNG CẤP: Render content dùng renderRichContent (backward compat)
 * @param {Object} discussion
 * @param {Array} replies
 * @param {string} currentUid
 * @param {boolean} isLeader
 * @param {boolean} readOnly
 * @param {boolean} isClosed
 * @param {string} meetingId
 * @returns {string} HTML
 */
function renderDiscussionItem(discussion, replies, currentUid, isLeader, readOnly, isClosed, meetingId) {
    const isAuthor = discussion.authorId === currentUid;
    const canEdit = (isAuthor || isLeader) && !isClosed;
    const canDelete = (isAuthor || isLeader) && !isClosed;
    const time = formatDate(discussion.createdAt, true);
    const isEdited = discussion.status === 'EDITED';
    const parentMeetingId = meetingId || discussion.meetingId || '';
    
    let html = `
        <div class="discussion-item" id="disc_${discussion.id}">
            <div class="discussion-author">
                <span class="avatar">${(discussion.authorName || 'U').charAt(0).toUpperCase()}</span>
                <span>${escapeHtml(discussion.authorName || 'Người dùng')}</span>
                <span class="discussion-time">${time}</span>
                ${isEdited ? `<span style="font-size:12px;color:var(--gray-400);margin-left:4px;">✏️ Đã sửa</span>` : ''}
            </div>
            <div class="discussion-content" style="line-height:1.7;">${renderRichContent(discussion.content)}</div>
    `;
    
    if (discussion.attachments && Object.keys(discussion.attachments).length > 0) {
        html += `<div class="discussion-attachments">`;
        Object.values(discussion.attachments).forEach(att => {
            const fileId = att.fileId || extractGoogleDriveId(att.url) || '';
            const fileIdShort = fileId.substring(0, 12);
            
            html += `
                <a href="${att.url}" target="_blank" rel="noopener noreferrer"
                   class="attachment"
                   style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:var(--gray-100);border-radius:8px;text-decoration:none;color:var(--primary);font-size:13px;margin:2px;"
                   title="File ID: ${escapeHtml(fileId)}">
                    <i class="fas fa-external-link-alt"></i>
                    <span style="font-weight:500;">${escapeHtml(att.fileName)}</span>
                    <span style="font-size:10px;color:var(--gray-400);font-family:monospace;">
                        [${escapeHtml(fileIdShort)}…]
                    </span>
                </a>
            `;
        });
        html += `</div>`;
    }
    
    if (!readOnly && currentUid) {
        html += `
            <div class="discussion-actions">
                ${!isClosed ? `
                    <button class="btn-secondary" style="padding:4px 12px;font-size:13px;" onclick="showReplyForm('${discussion.id}', '${discussion.contentId || ''}')">
                        <i class="fas fa-reply"></i> Phản hồi
                    </button>
                ` : ''}
                ${canEdit ? `
                    <button class="btn-secondary" style="padding:4px 12px;font-size:13px;" onclick="editDiscussion('${parentMeetingId}', '${discussion.id}', '${discussion.contentId || ''}')">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                ` : ''}
                ${canDelete ? `
                    <button class="btn-danger" style="padding:4px 12px;font-size:13px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" onclick="deleteDiscussionConfirm('${parentMeetingId}', '${discussion.id}', '${discussion.contentId || ''}')">
                        <i class="fas fa-trash-alt"></i> Xóa
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    if (replies && replies.length > 0) {
        html += `
            <div class="discussion-reply-count" onclick="toggleReplies('${discussion.id}')">
                💬 ${replies.length} phản hồi
            </div>
            <div id="replies_${discussion.id}" style="display:none;">
                ${replies.map(r => renderDiscussionItem(r, [], currentUid, isLeader, readOnly, isClosed, meetingId)).join('')}
            </div>
        `;
    }
    
    html += `</div>`;
    return html;
}

/**
 * Submit a discussion — Lấy HTML từ Quill
 * @param {string} meetingId
 * @param {string} contentId
 * @param {string} parentId
 */
async function submitDiscussion(meetingId, contentId, parentId = null) {
    const uid = getCurrentUid();
    if (!uid) {
        showToast('Vui lòng đăng nhập', 'error');
        return;
    }
    
    const inputKey = contentId || 'all';
    const editorKey = `discussion_${inputKey}`;
    
    // Lấy Quill instance
    const quill = window._discussionQuills && window._discussionQuills[editorKey];
    if (!quill) {
        showToast('Editor chưa sẵn sàng. Vui lòng refresh trang.', 'error');
        return;
    }
    
    const htmlContent = quill.root.innerHTML;
    const plainText = quill.getText().trim();
    
    if (!plainText) {
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
            content: htmlContent,
            parentId: parentId,
            attachments: attachments
        });
        
        showToast('Đã gửi ý kiến thành công!', 'success');
        
        // Reset Quill
        quill.setContents([]);
        resetPendingLinks(formKey);
        
        const container = document.getElementById(`discussions_${inputKey}`);
        if (container && typeof renderDiscussions === 'function') {
            await renderDiscussions(meetingId, contentId, container);
            container.dataset.loaded = 'true';
        }
        
        if (contentId) {
            const toggleBtn = document.querySelector(`[data-disc-toggle="${contentId}"]`);
            if (toggleBtn) {
                const badge = toggleBtn.querySelector('.count-badge');
                if (badge) {
                    const current = parseInt(badge.textContent) || 0;
                    badge.textContent = current + 1;
                }
            }
        }
    } catch (error) {
        console.error('Error submitting discussion:', error);
        showToast('Lỗi gửi ý kiến: ' + error.message, 'error');
    }
}

/**
 * Show reply form
 */
function showReplyForm(parentId, contentId) {
    const inputKey = contentId || 'all';
    const editorKey = `discussion_${inputKey}`;
    const quill = window._discussionQuills && window._discussionQuills[editorKey];
    if (quill) {
        quill.focus();
        const editorEl = document.querySelector(`#discussionEditorContainer_${inputKey} .ql-editor`);
        if (editorEl) {
            editorEl.setAttribute('data-placeholder', 'Phản hồi ý kiến này...');
        }
        window._replyParentId = parentId;
    }
}

/**
 * Edit a discussion — Dùng Quill editor
 */
async function editDiscussion(meetingId, discussionId, contentId) {
    if (!meetingId) {
        showToast('Không xác định được cuộc họp. Vui lòng refresh trang.', 'error');
        return;
    }
    
    const snapshot = await db.ref(`discussions/${meetingId}/${discussionId}`).once('value');
    const disc = snapshot.val();
    if (!disc) {
        showToast('Không tìm thấy ý kiến', 'error');
        return;
    }
    
    if (await isMeetingClosed(meetingId)) {
        showToast('Không thể sửa ý kiến trong cuộc họp đã chốt', 'error');
        return;
    }
    
    const currentContent = disc.content || '';
    const oldAttachments = disc.attachments || {};
    
    const lockedLinks = Object.values(oldAttachments).map(att => ({
        url: att.url,
        fileId: att.fileId || extractGoogleDriveId(att.url) || '',
        fileName: att.fileName || 'Tài liệu',
        isNew: false
    }));
    
    const formKey = `edit_disc_${discussionId}`;
    if (!window._pendingLinks) window._pendingLinks = {};
    window._pendingLinks[formKey] = [...lockedLinks];
    
    window._activeEditDiscussionQuill = null;
    
    showModal('✏️ Sửa ý kiến', `
        <div class="form-group">
            <label>Nội dung</label>
            <div id="editDiscussionEditorContainer" style="background:#fff;border-radius:8px;"></div>
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
        { text: 'Hủy', class: 'btn-secondary', action: 'close' },
        {
            text: 'Lưu',
            class: 'btn-primary',
            action: 'save',
            onClick: async (close) => {
                const quill = window._activeEditDiscussionQuill;
                if (!quill) {
                    showToast('Editor chưa sẵn sàng. Vui lòng đóng và mở lại.', 'error');
                    return;
                }
                
                const htmlContent = quill.root.innerHTML;
                const plainText = quill.getText().trim();
                
                if (!plainText) {
                    showToast('Vui lòng nhập nội dung', 'warning');
                    return;
                }
                
                const allLinks = getPendingLinks(formKey);
                const newLinks = allLinks.filter(l => l.isNew === true);
                
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
                    await updateDiscussion(meetingId, discussionId, { content: htmlContent });
                    
                    for (const key of Object.keys(newAttachments)) {
                        await db.ref(`discussions/${meetingId}/${discussionId}/attachments/${key}`).set(newAttachments[key]);
                    }
                    
                    showToast('✅ Đã cập nhật ý kiến', 'success');
                    window._activeEditDiscussionQuill = null;
                    close();
                    resetPendingLinks(formKey);
                    
                    const container = document.getElementById(`discussions_${contentId || 'all'}`);
                    if (container) {
                        await renderDiscussions(meetingId, contentId || null, container);
                    }
                } catch (error) {
                    showToast('Lỗi: ' + error.message, 'error');
                }
            }
        }
    ]);
    
    setTimeout(function() {
        window._activeEditDiscussionQuill = initQuillEditor(
            '#editDiscussionEditorContainer',
            currentContent,
            'Nhập nội dung...'
        );
        if (window._activeEditDiscussionQuill) {
            window._activeEditDiscussionQuill.focus();
        }
    }, 80);
}

/**
 * Xác nhận xóa ý kiến
 */
function deleteDiscussionConfirm(meetingId, discussionId, contentId) {
    if (!meetingId) {
        showToast('Không xác định được cuộc họp. Vui lòng refresh trang.', 'error');
        return;
    }
    
    showConfirm(
        '🗑️ Xóa ý kiến',
        `<div style="line-height:1.7;">
            Bạn có chắc chắn muốn xóa ý kiến này?
            <br><br>
            <div style="padding:12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;">
                <strong style="color:#991b1b;">⚠️ Lưu ý:</strong>
                <div style="color:#7f1d1d;font-size:14px;margin-top:4px;">
                    Nếu ý kiến này có phản hồi của người khác, các phản hồi cũng sẽ bị xóa theo.
                    Hành động này không thể hoàn tác.
                </div>
            </div>
        </div>`,
        async () => {
            try {
                await removeDiscussion(meetingId, discussionId);
                showToast('🗑️ Đã xóa ý kiến thành công!', 'success', 3000);
                
                const container = document.getElementById(`discussions_${contentId || 'all'}`);
                if (container) {
                    await renderDiscussions(meetingId, contentId || null, container);
                }
                
                if (contentId) {
                    const toggleBtn = document.querySelector(`[data-disc-toggle="${contentId}"]`);
                    if (toggleBtn) {
                        const badge = toggleBtn.querySelector('.count-badge');
                        if (badge) {
                            const current = parseInt(badge.textContent) || 0;
                            badge.textContent = Math.max(0, current - 1);
                        }
                    }
                }
            } catch (error) {
                console.error('Delete discussion error:', error);
                showToast('❌ Lỗi xóa ý kiến: ' + error.message, 'error', 5000);
            }
        },
        '🗑️ Xóa ý kiến'
    );
}

/**
 * Toggle replies visibility
 */
function toggleReplies(discussionId) {
    const container = document.getElementById(`replies_${discussionId}`);
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Open image preview in modal
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
window.deleteDiscussionConfirm = deleteDiscussionConfirm;
window.toggleReplies = toggleReplies;
window.openImagePreview = openImagePreview;
window.openPDFPreview = openPDFPreview;