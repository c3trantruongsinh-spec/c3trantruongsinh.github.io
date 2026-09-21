// ============================================================
// UI UTILITY MODULE
// ============================================================

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success'|'error'|'warning'|'info'
 * @param {number} duration - Auto-close duration in ms (0 = no auto-close)
 */
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span class="toast-content">${message}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(toast);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', function() {
        toast.remove();
    });
    
    // Auto close
    if (duration > 0) {
        setTimeout(() => {
            toast.remove();
        }, duration);
    }
    
    // Limit number of toasts
    while (container.children.length > 5) {
        container.removeChild(container.firstChild);
    }
}

/**
 * Show modal
 * @param {string} title - Modal title
 * @param {string|HTMLElement} body - Modal body content
 * @param {Array} buttons - Array of button configs {text, class, onClick}
 */
function showModal(title, body, buttons = []) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    let bodyHtml = '';
    if (typeof body === 'string') {
        bodyHtml = body;
    } else if (body instanceof HTMLElement) {
        bodyHtml = body.outerHTML;
    }
    
    let buttonsHtml = '';
    buttons.forEach(btn => {
        buttonsHtml += `<button class="${btn.class || 'btn-secondary'}" data-action="${btn.action || 'close'}">${btn.text}</button>`;
    });
    
    if (!buttons.length) {
        buttonsHtml = `<button class="btn-secondary" data-action="close">Đóng</button>`;
    }
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2>${title}</h2>
            <button class="modal-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer">${buttonsHtml}</div>
    `;
    
    container.innerHTML = '';
    container.appendChild(modal);
    container.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Close handlers
    const closeModal = () => {
        container.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            container.innerHTML = '';
        }, 300);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    container.addEventListener('click', function(e) {
        if (e.target === container) closeModal();
    });
    
    // Button handlers
    modal.querySelectorAll('.modal-footer button').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const action = this.dataset.action;
            if (action === 'close') {
                closeModal();
                return;
            }
            const config = buttons.find(b => b.action === action);
            if (config && config.onClick) {
                config.onClick(closeModal);
            }
        });
    });
    
    return { close: closeModal };
}

/**
 * Show confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when confirmed
 * @param {string} confirmText - Text for confirm button
 */
function showConfirm(title, message, onConfirm, confirmText = 'Xác nhận') {
    showModal(title, `<p>${message}</p>`, [
        { text: 'Hủy', class: 'btn-secondary', action: 'cancel' },
        {
            text: confirmText,
            class: 'btn-danger',
            action: 'confirm',
            onClick: (close) => {
                close();
                if (onConfirm) onConfirm();
            }
        }
    ]);
}

/**
 * Show loading spinner in a modal
 * @param {string} message - Loading message
 */
function showLoadingModal(message = 'Đang xử lý...') {
    return showModal('Đang xử lý', `
        <div style="text-align:center;padding:20px;">
            <div class="loader" style="margin:0 auto;"></div>
            <p style="margin-top:16px;color:var(--gray-600);">${message}</p>
        </div>
    `, []);
}

/**
 * Format date to Vietnamese locale
 * @param {number|string|Date} date - Date to format
 * @param {boolean} includeTime - Include time in output
 * @returns {string}
 */
function formatDate(date, includeTime = false) {
    if (!date) return '--/--/----';
    const d = typeof date === 'number' ? new Date(date) : new Date(date);
    if (isNaN(d.getTime())) return '--/--/----';
    
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return d.toLocaleDateString('vi-VN', options);
}

/**
 * Format date for input (YYYY-MM-DD)
 * @param {Date} date
 * @returns {string}
 */
function formatDateInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Generate meeting code
 * @param {string} teamCode - Team code (e.g., KHTN)
 * @param {Date} date - Meeting date
 * @param {number} sequence - Sequence number
 * @returns {string}
 */
function generateMeetingCode(teamCode, date, sequence) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const seq = String(sequence).padStart(3, '0');
    return `HS-${teamCode}-${year}-${month}-${seq}`;
}

/**
 * Truncate text
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Get status label and class
 * @param {string} status - Meeting status
 * @returns {Object} {label, class}
 */
function getStatusInfo(status) {
    const map = {
        'DRAFT': { label: 'DỰ THẢO', class: 'draft' },
        'DISCUSSION': { label: 'ĐANG THẢO LUẬN', class: 'discussion' },
        'CONCLUDED': { label: 'ĐÃ KẾT LUẬN', class: 'concluded' },
        'CONFIRMATION': { label: 'CHỜ XÁC NHẬN', class: 'confirmation' },
        'CLOSED': { label: 'ĐÃ CHỐT', class: 'closed' }
    };
    return map[status] || { label: status || 'KHÔNG XÁC ĐỊNH', class: 'draft' };
}

/**
 * Get status dot HTML
 * @param {string} status
 * @returns {string}
 */
function getStatusDot(status) {
    const info = getStatusInfo(status);
    return `<span class="status-dot ${info.class}"></span> ${info.label}`;
}

/**
 * Get status badge HTML
 * @param {string} status
 * @returns {string}
 */
function getStatusBadge(status) {
    const info = getStatusInfo(status);
    return `<span class="status-badge ${info.class}">${info.label}</span>`;
}

/**
 * Debounce function
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Escape HTML
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * Get file icon based on type
 * @param {string} fileType
 * @returns {string} FontAwesome icon class
 */
function getFileIcon(fileType) {
    if (!fileType) return 'fa-link';
    if (fileType.startsWith('image/')) return 'fa-image';
    if (fileType === 'application/pdf') return 'fa-file-pdf';
    if (fileType.includes('word')) return 'fa-file-word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
    if (fileType.includes('text')) return 'fa-file-alt';
    return 'fa-link';
}

/**
 * Format file size
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Set page title
 * @param {string} title
 */
function setPageTitle(title) {
    const el = document.getElementById('pageTitle');
    if (el) el.textContent = title;
}

/**
 * Navigate to a page
 * @param {string} page - Page name
 * @param {Object} params - URL parameters
 */
function navigateTo(page, params = {}) {
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    
    const titles = {
        'dashboard': 'Tổng quan',
        'meetings': 'Danh sách cuộc họp',
        'create-meeting': 'Tạo cuộc họp',
        'meeting-detail': 'Chi tiết cuộc họp',
        'tasks': 'Nhiệm vụ',
        'archive': 'Hồ sơ điện tử',
        'notifications': 'Thông báo',
        'admin': 'Quản lý hệ thống',
        'profile': 'Thông tin cá nhân'
    };
    setPageTitle(titles[page] || page);
    
    loadPage(page, params);
}

/**
 * Load page content (with safe function checks)
 * @param {string} page
 * @param {Object} params
 */
async function loadPage(page, params = {}) {
    const container = document.getElementById('pageContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
            <div class="loader" style="margin:0 auto;"></div>
            <p style="margin-top:16px;color:var(--gray-500);">Đang tải...</p>
        </div>
    `;
    
    try {
        switch (page) {
            case 'dashboard':
                if (typeof renderDashboard === 'function') {
                    await renderDashboard(container);
                } else {
                    container.innerHTML = renderFunctionError('renderDashboard');
                }
                break;
                
            case 'meetings':
                if (typeof renderMeetings === 'function') {
                    await renderMeetings(container);
                } else {
                    container.innerHTML = renderFunctionError('renderMeetings');
                }
                break;
                
            case 'create-meeting':
                if (typeof renderCreateMeeting === 'function') {
                    await renderCreateMeeting(container);
                } else {
                    container.innerHTML = renderFunctionError('renderCreateMeeting');
                }
                break;
                
            case 'meeting-detail':
                if (typeof renderMeetingDetail === 'function') {
                    if (params.id) {
                        await renderMeetingDetail(container, params.id);
                    } else {
                        container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Thiếu ID cuộc họp</h3></div>`;
                    }
                } else {
                    container.innerHTML = renderFunctionError('renderMeetingDetail');
                }
                break;
                
            case 'tasks':
                if (typeof renderTasks === 'function') {
                    await renderTasks(container);
                } else {
                    container.innerHTML = renderFunctionError('renderTasks');
                }
                break;
                
            case 'archive':
                if (typeof renderArchive === 'function') {
                    await renderArchive(container);
                } else {
                    container.innerHTML = renderFunctionError('renderArchive');
                }
                break;
                
            case 'notifications':
                if (typeof renderNotifications === 'function') {
                    await renderNotifications(container);
                } else {
                    container.innerHTML = renderFunctionError('renderNotifications');
                }
                break;
                
            case 'admin':
                if (typeof renderAdmin === 'function') {
                    await renderAdmin(container);
                } else {
                    container.innerHTML = renderFunctionError('renderAdmin');
                }
                break;
                
            case 'profile':
                if (typeof renderProfile === 'function') {
                    await renderProfile(container);
                } else {
                    container.innerHTML = renderFunctionError('renderProfile');
                }
                break;
                
            default:
                container.innerHTML = `<div class="empty-state"><i class="fas fa-question-circle"></i><h3>Trang không tồn tại</h3></div>`;
        }
    } catch (error) {
        console.error('Error loading page:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle" style="color:var(--danger);"></i>
                <h3>Lỗi tải trang</h3>
                <p>${escapeHtml(error.message || 'Đã xảy ra lỗi không xác định.')}</p>
                <button class="btn-primary" style="margin-top:12px;" onclick="loadPage('dashboard')">
                    <i class="fas fa-home"></i> Về trang chủ
                </button>
                <button class="btn-secondary" style="margin-top:12px;margin-left:8px;" onclick="location.reload()">
                    <i class="fas fa-sync"></i> Tải lại
                </button>
            </div>
        `;
    }
}

/**
 * Render error message when a function is missing
 * @param {string} funcName - Name of the missing function
 * @returns {string} HTML error message
 */
function renderFunctionError(funcName) {
    return `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle" style="color:var(--warning);"></i>
            <h3>Lỗi tải trang</h3>
            <p>Hàm <strong>${escapeHtml(funcName)}</strong> chưa được định nghĩa. Vui lòng kiểm tra file JavaScript tương ứng đã được tải đúng.</p>
            <button class="btn-primary" style="margin-top:12px;" onclick="location.reload()">
                <i class="fas fa-sync"></i> Tải lại trang
            </button>
        </div>
    `;
}

// ============================================================
// GOOGLE DRIVE LINK UTILITIES
// ============================================================

/**
 * Trích xuất ID file Google Drive từ URL
 * Hỗ trợ: file, document, spreadsheets, presentation, folders, open?id=
 * @param {string} url
 * @returns {string|null} fileId hoặc null nếu không tìm thấy
 */
function extractGoogleDriveId(url) {
    if (!url || typeof url !== 'string') return null;
    
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /\/document\/d\/([a-zA-Z0-9_-]+)/,
        /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
        /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
        /\/folders\/([a-zA-Z0-9_-]+)/,
        /[?&]id=([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

/**
 * Render danh sách attachment tags trong form
 * @param {Array} links - Mảng các {url, fileId, fileName, isNew}
 * @param {string} formKey - Key để phân biệt các form
 * @returns {string} HTML
 */
function renderAttachmentTags(links, formKey) {
    if (!links || links.length === 0) {
        return `<span style="font-size:13px;color:var(--gray-400);font-style:italic;">Chưa có tài liệu đính kèm.</span>`;
    }
    return links.map((link, idx) => {
        const canRemove = link.isNew === true;
        return `
            <span class="attachment-tag" data-form-key="${escapeHtml(formKey)}" data-index="${idx}" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:${canRemove ? '#dbeafe' : '#e2e8f0'};border:1px solid ${canRemove ? '#93c5fd' : '#cbd5e1'};border-radius:16px;font-size:12px;margin:2px;">
                <i class="fas fa-link" style="color:${canRemove ? '#2563eb' : '#64748b'};font-size:11px;"></i>
                <span style="color:var(--gray-700);font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(link.fileName || 'Tài liệu')}">
                    ${escapeHtml(link.fileName || 'Tài liệu')}
                </span>
                <span style="font-size:10px;color:var(--gray-400);font-family:monospace;" title="File ID: ${escapeHtml(link.fileId || '')}">
                    ${escapeHtml((link.fileId || '').substring(0, 8))}…
                </span>
                ${canRemove ? `
                    <button type="button" onclick="removeAttachmentTag('${escapeHtml(formKey)}', ${idx})" style="background:none;border:none;color:#64748b;cursor:pointer;padding:0 2px;font-size:14px;line-height:1;" title="Xóa link này">
                        <i class="fas fa-times"></i>
                    </button>
                ` : `<i class="fas fa-lock" style="color:#94a3b8;font-size:10px;" title="Link đã khóa, không thể xóa"></i>`}
            </span>
        `;
    }).join('');
}

/**
 * Thêm một link vào danh sách pending
 * @param {string} formKey
 * @param {boolean} isEdit - Nếu là chế độ edit, cho phép thêm link mới
 * @returns {boolean} true nếu thành công
 */
function addAttachmentTagFromInput(formKey, isEdit = false) {
    const urlInput = document.getElementById(`attachUrl_${formKey}`);
    const nameInput = document.getElementById(`attachName_${formKey}`);
    if (!urlInput) return false;
    
    const url = urlInput.value.trim();
    const fileName = (nameInput?.value || '').trim();
    
    if (!url) {
        showToast('Vui lòng nhập link Google Drive.', 'warning');
        return false;
    }
    
    if (!url.startsWith('http')) {
        showToast('Link không hợp lệ. Phải bắt đầu bằng http:// hoặc https://', 'error');
        return false;
    }
    
    const fileId = extractGoogleDriveId(url);
    if (!fileId) {
        showToast('Không nhận diện được Google Drive File ID. Vui lòng kiểm tra lại link.', 'error');
        return false;
    }
    
    if (!window._pendingLinks) window._pendingLinks = {};
    if (!window._pendingLinks[formKey]) {
        window._pendingLinks[formKey] = [];
    }
    
    const isDuplicate = window._pendingLinks[formKey].some(l => l.fileId === fileId);
    if (isDuplicate) {
        showToast('File này đã có trong danh sách đính kèm.', 'warning');
        return false;
    }
    
    window._pendingLinks[formKey].push({
        url: url,
        fileId: fileId,
        fileName: fileName || `Tài liệu_${fileId.substring(0, 6)}`,
        isNew: true
    });
    
    urlInput.value = '';
    if (nameInput) nameInput.value = '';
    
    renderAttachmentList(formKey);
    return true;
}

/**
 * Xóa một tag link (chỉ link mới)
 * @param {string} formKey
 * @param {number} index
 */
function removeAttachmentTag(formKey, index) {
    if (!window._pendingLinks || !window._pendingLinks[formKey]) return;
    const links = window._pendingLinks[formKey];
    if (index < 0 || index >= links.length) return;
    if (!links[index].isNew) {
        showToast('Không thể xóa link đã lưu. Chỉ có thể thêm link mới.', 'warning');
        return;
    }
    links.splice(index, 1);
    renderAttachmentList(formKey);
}

/**
 * Render lại danh sách tag trong DOM
 * @param {string} formKey
 */
function renderAttachmentList(formKey) {
    const container = document.getElementById(`attachList_${formKey}`);
    if (!container) return;
    const links = (window._pendingLinks && window._pendingLinks[formKey]) || [];
    container.innerHTML = renderAttachmentTags(links, formKey);
}

/**
 * Lấy danh sách link pending theo formKey
 * @param {string} formKey
 * @returns {Array}
 */
function getPendingLinks(formKey) {
    if (!window._pendingLinks || !window._pendingLinks[formKey]) return [];
    return window._pendingLinks[formKey];
}

/**
 * Reset danh sách link pending
 * @param {string} formKey
 */
function resetPendingLinks(formKey) {
    if (window._pendingLinks) {
        window._pendingLinks[formKey] = [];
    }
}
// ============================================================
// ATTACHMENT RENDER HELPER (dùng chung cho mọi nơi)
// ============================================================

/**
 * Render danh sách link đính kèm Google Drive ra HTML
 * Hỗ trợ cả object {key: {...}} lẫn array [{...}]
 * @param {Object|Array} attachments - Dữ liệu attachments từ Firebase
 * @param {Object} options - { small: bool, showFileId: bool, emptyText: string }
 * @returns {string} HTML
 */
function renderAttachmentsHTML(attachments, options = {}) {
    if (!attachments) {
        if (options.emptyText) {
            return `<div style="font-size:13px;color:var(--gray-400);font-style:italic;margin-top:8px;">${escapeHtml(options.emptyText)}</div>`;
        }
        return '';
    }
    
    // Chuẩn hóa về array
    let list = [];
    if (Array.isArray(attachments)) {
        list = attachments;
    } else if (typeof attachments === 'object') {
        list = Object.values(attachments);
    }
    
    // Lọc bỏ những cái không có URL
    list = list.filter(att => att && att.url);
    
    if (list.length === 0) {
        if (options.emptyText) {
            return `<div style="font-size:13px;color:var(--gray-400);font-style:italic;margin-top:8px;">${escapeHtml(options.emptyText)}</div>`;
        }
        return '';
    }
    
    const small = options.small === true;
    const showFileId = options.showFileId !== false;
    const label = options.label || '';
    
    const padding = small ? '4px 10px' : '6px 14px';
    const fontSize = small ? '12px' : '13px';
    const borderRadius = small ? '16px' : '20px';
    
    let html = '';
    
    if (label) {
        html += `<div style="font-size:12px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px;">${escapeHtml(label)}</div>`;
    }
    
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:${label ? '4px' : '10px'};">`;
    
    list.forEach((att, idx) => {
        const fileId = att.fileId || extractGoogleDriveId(att.url) || '';
        const fileIdShort = fileId ? fileId.substring(0, 10) : '';
        const fileName = att.fileName || att.name || `Tài liệu ${idx + 1}`;
        
        html += `
            <a href="${att.url}"
               target="_blank"
               rel="noopener noreferrer"
               class="attachment-link"
               title="Mở: ${escapeHtml(fileName)}${fileId ? ' | File ID: ' + escapeHtml(fileId) : ''}"
               style="display:inline-flex;align-items:center;gap:8px;padding:${padding};background:#e0f2fe;border:1px solid #7dd3fc;border-radius:${borderRadius};font-size:${fontSize};text-decoration:none;color:#0369a1;font-weight:500;transition:all 0.2s;"
               onmouseover="this.style.background='#bae6fd';this.style.borderColor='#38bdf8';"
               onmouseout="this.style.background='#e0f2fe';this.style.borderColor='#7dd3fc';">
                <i class="fas fa-external-link-alt" style="font-size:${small ? '11px' : '12px'};"></i>
                <span style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${escapeHtml(fileName)}
                </span>
                ${showFileId && fileIdShort ? `
                    <span style="font-size:10px;color:#64748b;font-family:monospace;background:#f1f5f9;padding:1px 6px;border-radius:4px;white-space:nowrap;"
                          title="Google Drive File ID: ${escapeHtml(fileId)}">
                        ${escapeHtml(fileIdShort)}…
                    </span>
                ` : ''}
            </a>
        `;
    });
    
    html += `</div>`;
    return html;
}

// Export

// ============================================================
// EXPORTS
// ============================================================
window.showToast = showToast;
window.showModal = showModal;
window.showConfirm = showConfirm;
window.showLoadingModal = showLoadingModal;
window.formatDate = formatDate;
window.formatDateInput = formatDateInput;
window.generateMeetingCode = generateMeetingCode;
window.truncateText = truncateText;
window.getStatusInfo = getStatusInfo;
window.getStatusDot = getStatusDot;
window.getStatusBadge = getStatusBadge;
window.escapeHtml = escapeHtml;
window.getFileIcon = getFileIcon;
window.formatFileSize = formatFileSize;
window.setPageTitle = setPageTitle;
window.navigateTo = navigateTo;
window.loadPage = loadPage;
window.debounce = debounce;
window.renderFunctionError = renderFunctionError;
window.extractGoogleDriveId = extractGoogleDriveId;
window.renderAttachmentsHTML = renderAttachmentsHTML;
window.renderAttachmentTags = renderAttachmentTags;
window.addAttachmentTagFromInput = addAttachmentTagFromInput;
window.removeAttachmentTag = removeAttachmentTag;
window.renderAttachmentList = renderAttachmentList;
window.getPendingLinks = getPendingLinks;
window.resetPendingLinks = resetPendingLinks;