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
    
    toast.querySelector('.toast-close').addEventListener('click', function() {
        toast.remove();
    });
    
    if (duration > 0) {
        setTimeout(() => {
            toast.remove();
        }, duration);
    }
    
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
// SETUP NAVIGATION (Desktop + Mobile)
// Đã nâng cấp: thêm quyền cho to_pho và nhom_truong
// ============================================================

/**
 * Setup desktop navigation
 * Gắn sự kiện click cho tất cả .nav-item[data-page]
 * Quyền tạo cuộc họp: truong_to, to_pho, nhom_truong, thu_ky, admin
 */
/**
 * Setup desktop navigation
 * Đã nâng cấp: dùng canCreateMeeting() để hỗ trợ đủ 5 role
 */
function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;

            if (page === 'create-meeting') {
                canCreateMeeting().then(canCreate => {
                    if (canCreate) {
                        navigateTo('create-meeting');
                    } else {
                        showToast('Bạn không có quyền tạo cuộc họp', 'error');
                    }
                });
            } else {
                navigateTo(page);
            }

            if (window.innerWidth <= 1024) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.remove('open');
            }
        });
    });
}

/**
 * Setup mobile navigation
 * Đã nâng cấp: dùng canCreateMeeting() để hỗ trợ đủ 5 role
 */
function setupMobileNavigation() {
    document.querySelectorAll('.mobile-nav-item[data-page]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;

            if (page === 'create-meeting') {
                canCreateMeeting().then(canCreate => {
                    if (canCreate) {
                        navigateTo('create-meeting');
                    } else {
                        showToast('Bạn không có quyền tạo cuộc họp', 'error');
                    }
                });
            } else {
                navigateTo(page);
            }
        });
    });
}

/**
 * Lấy URL parameter
 * @param {string} name
 * @returns {string|null}
 */
function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

/**
 * Lấy hash parameter (dạng #meeting-xxxx)
 * @returns {string|null}
 */
function getHashParam() {
    const hash = window.location.hash;
    if (hash.startsWith('#meeting-')) {
        return hash.replace('#meeting-', '');
    }
    return null;
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

/**
 * Render danh sách link đính kèm Google Drive (dùng trong view)
 * Hỗ trợ cả object {key: {...}} lẫn array [{...}]
 * @param {Object|Array} attachments - Dữ liệu attachments từ Firebase
 * @param {Object} options - { small: bool, showFileId: bool, emptyText: string, label: string }
 * @returns {string} HTML
 */
function renderAttachmentsHTML(attachments, options = {}) {
    if (!attachments) {
        if (options.emptyText) {
            return `<div style="font-size:13px;color:var(--gray-400);font-style:italic;margin-top:8px;">${escapeHtml(options.emptyText)}</div>`;
        }
        return '';
    }
    
    let list = [];
    if (Array.isArray(attachments)) {
        list = attachments;
    } else if (typeof attachments === 'object') {
        list = Object.values(attachments);
    }
    
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
// ============================================================
// AUTO-RESIZE TEXTAREA CHO Ô NHẬP THẢO LUẬN
// ============================================================

/**
 * Tự động điều chỉnh chiều cao textarea theo nội dung
 * @param {HTMLTextAreaElement} textarea
 */
function autoResizeTextarea(textarea) {
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 140), 500);
    textarea.style.height = newHeight + 'px';
}

/**
 * Gắn sự kiện auto-resize cho TẤT CẢ textarea thảo luận trong container
 * @param {HTMLElement} container - Container chứa các textarea cần gắn
 */
function attachAutoResizeToDiscussionInputs(container) {
    if (!container) return;
    
    const textareas = container.querySelectorAll('textarea[id^="discussionInput_"]');
    
    textareas.forEach(textarea => {
        // Tránh gắn trùng lặp
        if (textarea.dataset.autoResizeAttached === 'true') return;
        textarea.dataset.autoResizeAttached = 'true';
        
        // Resize lần đầu
        autoResizeTextarea(textarea);
        
        // Gắn sự kiện input
        textarea.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
        
        // Gắn sự kiện keyup để bắt trường hợp paste, cut, undo
        textarea.addEventListener('keyup', function() {
            autoResizeTextarea(this);
        });
        
        // Gắn sự kiện paste để chờ DOM cập nhật
        textarea.addEventListener('paste', function() {
            setTimeout(() => autoResizeTextarea(this), 10);
        });
    });
}
// ============================================================
// WELCOME MODAL — Hướng dẫn chào mừng theo vai trò
// ============================================================

/**
 * Lấy khóa lưu trạng thái "đã xem hướng dẫn" theo uid
 * @param {string} uid
 * @returns {string}
 */
function getWelcomeShownKey(uid) {
    return `welcome_shown_${uid}`;
}

/**
 * Kiểm tra xem có nên hiển thị welcome modal không
 * - Hiển thị nếu: chưa từng xem trong session hiện tại
 * - Sau khi user bấm "Đã hiểu", lưu vào localStorage với TTL 24h
 * @param {string} uid
 * @returns {boolean}
 */
function shouldShowWelcomeModal(uid) {
    if (!uid) return false;
    
    try {
        const key = getWelcomeShownKey(uid);
        const raw = localStorage.getItem(key);
        if (!raw) return true;
        
        const data = JSON.parse(raw);
        const now = Date.now();
        const ttl = 24 * 60 * 60 * 1000;
        
        // Nếu quá 24h, cho xem lại
        if (now - (data.shownAt || 0) > ttl) {
            return true;
        }
        return false;
    } catch (e) {
        return true;
    }
}

/**
 * Đánh dấu đã xem welcome modal
 * @param {string} uid
 */
function markWelcomeAsShown(uid) {
    if (!uid) return;
    try {
        const key = getWelcomeShownKey(uid);
        localStorage.setItem(key, JSON.stringify({ shownAt: Date.now() }));
    } catch (e) {
        console.warn('Không lưu được trạng thái welcome:', e);
    }
}

/**
 * Build nội dung các bước theo vai trò
 * @param {string} role
 * @returns {Object} { headerClass, emoji, title, subtitle, steps }
 */
function buildWelcomeContent(role) {
    const isAdmin = role === 'admin';
    const isLeader = role === 'truong_to' || role === 'to_pho' || role === 'nhom_truong';
    const isSecretary = role === 'thu_ky';
    
    if (isAdmin) {
        return {
            headerClass: 'admin',
            emoji: '👑',
            title: 'Chào mừng Quản trị viên!',
            subtitle: 'Bạn có toàn quyền quản lý hệ thống',
            steps: [
                {
                    number: '1',
                    stepClass: 'step-1',
                    title: 'Quản lý tài khoản',
                    badge: 'Bắt đầu',
                    desc: 'Tạo tài khoản cho giáo viên qua <strong>Công cụ tạo tài khoản</strong> (nhập tay hoặc Excel hàng loạt), gán vai trò và tổ chuyên môn.'
                },
                {
                    number: '2',
                    stepClass: 'step-2',
                    title: 'Quản lý tổ chuyên môn',
                    badge: 'Thiết lập',
                    desc: 'Xem tất cả cuộc họp của toàn trường. Có thể xóa cuộc họp nháp của bất kỳ tổ nào để dọn dẹp hệ thống.'
                },
                {
                    number: '3',
                    stepClass: 'step-3',
                    title: 'Theo dõi hoạt động',
                    badge: 'Giám sát',
                    desc: 'Xem tiến độ sinh hoạt của từng tổ, xem biên bản hồ sơ điện tử, đảm bảo mọi tổ hoạt động đúng quy trình.'
                }
            ],
            note: '<strong>Lưu ý:</strong> Admin không nên sửa nội dung chuyên môn của tổ (nội dung, kết luận) để đảm bảo tính khách quan. Chỉ can thiệp khi cần xử lý sự cố.'
        };
    }
    
    if (isLeader) {
        return {
            headerClass: 'leader',
            emoji: '🎯',
            title: 'Chào mừng Ban điều hành Tổ chuyên môn!',
            subtitle: 'Bạn có quyền tổ chức và điều hành cuộc họp tổ mình',
            steps: [
                {
                    number: '1',
                    stepClass: 'step-1',
                    title: 'Tạo cuộc họp mới',
                    badge: 'Bước 1',
                    desc: 'Vào menu <strong>"Cuộc họp"</strong> → bấm <strong>"Tạo cuộc họp"</strong>. Điền thông tin, chọn thành viên, có thể mời giáo viên tổ khác làm khách mời.'
                },
                {
                    number: '2',
                    stepClass: 'step-2',
                    title: 'Điều hành trạng thái',
                    badge: 'Bước 2',
                    desc: 'Dùng <strong>Bảng điều khiển nổi bật</strong> ở đầu trang chi tiết để chuyển trạng thái: <em>Dự thảo → Thảo luận → Kết luận → Chờ xác nhận → Chốt hồ sơ</em>.'
                },
                {
                    number: '3',
                    stepClass: 'step-3',
                    title: 'Theo dõi & Xác nhận',
                    badge: 'Bước 3',
                    desc: 'Xem thanh tiến trình xác nhận của thành viên. Khi đủ điều kiện, bấm <strong>"CHỐT HỒ SƠ"</strong> để khóa hồ sơ và xuất biên bản PDF.'
                },
                {
                    number: '4',
                    stepClass: 'step-4',
                    title: 'Xuất biên bản',
                    badge: 'Hoàn tất',
                    desc: 'Sau khi chốt, bấm <strong>"Xuất biên bản PDF"</strong> để tải biên bản chuẩn hành chính, có Quốc hiệu, Tiêu ngữ và chữ ký.'
                }
            ],
            note: '<strong>Mẹo:</strong> Nếu có thành viên vắng không xác nhận được, bạn vẫn có thể chốt hồ sơ bằng cách nhập <em>lý do chốt ngoại lệ</em>.'
        };
    }
    
    if (isSecretary) {
        return {
            headerClass: 'leader',
            emoji: '📝',
            title: 'Chào mừng Thư ký Tổ!',
            subtitle: 'Bạn hỗ trợ Ban lãnh đạo soạn thảo và quản lý hồ sơ',
            steps: [
                {
                    number: '1',
                    stepClass: 'step-1',
                    title: 'Xem cuộc họp của tổ',
                    badge: 'Bước 1',
                    desc: 'Vào menu <strong>"Cuộc họp"</strong> để xem danh sách. Click vào cuộc họp để xem chi tiết nội dung, tài liệu đính kèm.'
                },
                {
                    number: '2',
                    stepClass: 'step-2',
                    title: 'Hỗ trợ soạn thảo',
                    badge: 'Bước 2',
                    desc: 'Thêm/sửa nội dung cuộc họp, đính kèm tài liệu (link Google Drive). Tham gia thảo luận để ghi nhận ý kiến giáo viên.'
                },
                {
                    number: '3',
                    stepClass: 'step-3',
                    title: 'Hỗ trợ xuất biên bản',
                    badge: 'Bước 3',
                    desc: 'Khi hồ sơ đã chốt, bạn có thể xuất biên bản PDF chuẩn hành chính để in và lưu trữ.'
                }
            ],
            note: '<strong>Lưu ý:</strong> Thư ký <em>không được tự ý chốt hồ sơ</em> — chỉ Tổ trưởng/Tổ phó/Nhóm trưởng mới có quyền này.'
        };
    }
    
    // Mặc định: Giáo viên
    return {
        headerClass: 'teacher',
        emoji: '👨‍🏫',
        title: 'Chào mừng Thầy/Cô!',
        subtitle: 'Quy trình tham gia sinh hoạt chuyên môn',
        steps: [
            {
                number: '1',
                stepClass: 'step-1',
                title: 'Xem cuộc họp',
                badge: 'Bước 1',
                desc: 'Vào menu <strong>"Cuộc họp"</strong> → bấm vào cuộc họp để xem <em>nội dung, tài liệu đính kèm</em>. Có thể tham gia từ bất cứ đâu, không cần tập trung trực tiếp.'
            },
            {
                number: '2',
                stepClass: 'step-2',
                title: 'Thảo luận & Góp ý',
                badge: 'Bước 2',
                desc: 'Vào tab <strong>"Thảo luận"</strong> → viết ý kiến, có thể <em>đính kèm hình ảnh, PDF, link Google Drive</em> để minh họa công thức, sơ đồ, bài làm.'
            },
            {
                number: '3',
                stepClass: 'step-3',
                title: 'Xác nhận tham gia',
                badge: 'Bước 3',
                desc: 'Vào tab <strong>"Xác nhận"</strong> → bấm <em>"Xác nhận đã tham gia"</em>. Sau khi có kết luận, bấm <em>"Đã đọc kết luận"</em> và <em>"Xác nhận hồ sơ"</em>.'
            }
        ],
        note: '<strong>Mẹo:</strong> Hệ thống lưu vết toàn bộ ý kiến của bạn — chỉ cần góp ý một lần, không phải họp lại nhiều lần. Thầy/cô có thể tham gia mọi lúc mọi nơi!'
    };
}

/**
 * Hiển thị Welcome Modal theo vai trò người dùng
 * @param {string} role - Vai trò của user
 * @param {string} displayName - Tên hiển thị của user
 * @param {string} uid - UID của user
 */
function showWelcomeModal(role, displayName, uid) {
    // Xóa modal cũ nếu có
    const existing = document.getElementById('welcomeModal');
    if (existing) existing.remove();
    
    const content = buildWelcomeContent(role);
    const greetingName = displayName || 'bạn';
    
    // Build steps HTML
    const stepsHtml = content.steps.map(step => `
        <div class="welcome-step ${step.stepClass}">
            <div class="welcome-step-number">${step.number}</div>
            <div class="welcome-step-content">
                <div class="welcome-step-title">
                    ${step.title}
                    ${step.badge ? `<span class="welcome-step-badge">${step.badge}</span>` : ''}
                </div>
                <div class="welcome-step-desc">${step.desc}</div>
            </div>
        </div>
    `).join('');
    
    const overlay = document.createElement('div');
    overlay.id = 'welcomeModal';
    overlay.className = 'welcome-overlay active';
    overlay.innerHTML = `
        <div class="welcome-modal">
            <div class="welcome-header ${content.headerClass}">
                <button class="welcome-close" onclick="closeWelcomeModal(true)" title="Đóng (ESC)">
                    <i class="fas fa-times"></i>
                </button>
                <span class="welcome-emoji">${content.emoji}</span>
                <h2 class="welcome-title">${content.title}</h2>
                <p class="welcome-subtitle">${content.subtitle}</p>
            </div>
            
            <div class="welcome-body">
                <div class="welcome-greeting">
                    Xin chào <strong>${escapeHtml(greetingName)}</strong>! 
                    Đây là hướng dẫn nhanh để bạn sử dụng hệ thống hiệu quả nhất.
                </div>
                
                <div class="welcome-section-title">
                    <i class="fas fa-list-check"></i>
                    Các bước cần biết
                </div>
                
                <div class="welcome-steps">
                    ${stepsHtml}
                </div>
                
                <div class="welcome-note">
                    <i class="fas fa-lightbulb"></i>
                    ${content.note}
                </div>
            </div>
            
            <div class="welcome-footer">
                <button class="welcome-btn welcome-btn-primary" onclick="closeWelcomeModal(true)">
                    <i class="fas fa-check-circle"></i>
                    Đã hiểu, bắt đầu sử dụng
                </button>
                <button class="welcome-btn welcome-btn-secondary" onclick="closeWelcomeModal(false)">
                    <i class="fas fa-redo"></i>
                    Xem lại sau
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // ESC để đóng
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeWelcomeModal(true);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // Click ngoài để đóng
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeWelcomeModal(true);
        }
    });
}

/**
 * Đóng welcome modal
 * @param {boolean} markAsShown - Có lưu trạng thái "đã xem" không
 */
function closeWelcomeModal(markAsShown = true) {
    const modal = document.getElementById('welcomeModal');
    if (!modal) return;
    
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.25s ease';
    
    setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
    }, 250);
    
    if (markAsShown) {
        const uid = typeof getCurrentUid === 'function' ? getCurrentUid() : null;
        if (uid) {
            markWelcomeAsShown(uid);
        }
    }
}
// ============================================================
// QUILL.JS HELPERS — Rich Text Editor Integration
// ============================================================

/**
 * Kiểm tra chuỗi có chứa thẻ HTML không (output của Quill)
 * @param {string} str
 * @returns {boolean}
 */
function isHtmlContent(str) {
    if (!str || typeof str !== 'string') return false;
    return /<(p|br|strong|em|u|ul|ol|li|span|div|h[1-6]|blockquote|a|b|i)\b[^>]*>/i.test(str);
}

/**
 * Render nội dung rich text AN TOÀN với backward compat:
 *   - Nếu có HTML (từ Quill) → sanitize nhẹ + render HTML
 *   - Nếu là plain text (dữ liệu cũ) → escape + chuyển \n thành <br>
 * @param {string} str
 * @returns {string} HTML an toàn
 */
function renderRichContent(str) {
    if (!str) return '';
    const s = String(str);
    
    if (isHtmlContent(s)) {
        return s
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^>]*>/gi, '')
            .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
            .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
            .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
            .replace(/javascript:/gi, '');
    }
    
    return escapeHtml(s).replace(/\n/g, '<br>');
}
/**
 * Khởi tạo Quill editor cho 1 element
 * TÍCH HỢP ĐẦY ĐỦ:
 *   - Plugin resize ảnh (resize-quill-image)
 *   - Custom imageHandler upload Cloudinary
 *   - Modal công thức Toán học trực quan (Visual Formula Builder)
 *   - Xử lý initialContent (backward compat với dữ liệu cũ)
 * @param {string} selector - CSS selector, ví dụ '#conclusionEditor'
 * @param {string} initialContent - HTML hoặc plain text
 * @param {string} placeholder
 * @returns {Object|null} Quill instance hoặc null nếu lỗi
 */
function initQuillEditor(selector, initialContent, placeholder) {
    if (typeof Quill === 'undefined') {
        console.warn('Quill.js chưa load. Kiểm tra CDN.');
        return null;
    }
    
    if (typeof ImageResize !== 'undefined' && !window._imageResizeRegistered) {
        try {
            Quill.register('modules/imageResize', ImageResize);
            window._imageResizeRegistered = true;
            console.log('✅ Đã đăng ký module resize ảnh (resize-quill-image)');
        } catch (e) {
            console.warn('⚠️ Không đăng ký được module resize:', e.message);
        }
    }
    
    if (typeof katex === 'undefined') {
        console.warn('⚠️ KaTeX chưa load. Nút công thức Toán sẽ không hoạt động.');
    } else {
        console.log('✅ KaTeX đã sẵn sàng cho công thức Toán học');
    }
    
    const el = document.querySelector(selector);
    if (!el) {
        console.warn('Không tìm thấy element Quill:', selector);
        return null;
    }
    
    const quill = new Quill(selector, {
        theme: 'snow',
        placeholder: placeholder || 'Nhập nội dung...',
        modules: {
            toolbar: {
                container: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['image', 'formula'],
                    ['clean']
                ],
                handlers: {
                    image: function() {
                        selectAndUploadImage(this.quill);
                    },
                    formula: function() {
                        openFormulaModal(this.quill, '', 'insert', null);
                    }
                }
            },
            imageResize: {
                modules: ['Resize', 'DisplaySize'],
                displaySize: true,
                styleSelection: true,
                handleStyles: {
                    backgroundColor: '#2563eb',
                    border: '2px solid #ffffff',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                    width: '14px',
                    height: '14px',
                    borderRadius: '3px'
                }
            }
        }
    });
    
    bindFormulaEditHandler(quill);
    setupImageHandlers(quill);
    if (initialContent && String(initialContent).trim()) {
        const s = String(initialContent);
        if (isHtmlContent(s)) {
            quill.clipboard.dangerouslyPasteHTML(s);
        } else {
            const html = escapeHtml(s).replace(/\n/g, '<br>');
            quill.clipboard.dangerouslyPasteHTML(html);
        }
    }
    
    return quill;
}
/**
 * Upload 1 file ảnh lên Cloudinary và chèn URL vào Quill
 * Hàm dùng chung cho: chọn file, paste, drag&drop, chụp ảnh
 * @param {File} file - File ảnh cần upload
 * @param {Object} quill - Quill instance
 * @returns {Promise<boolean>} true nếu thành công
 */
async function uploadFileToCloudinary(file, quill) {
    if (!file || !quill) {
        console.warn('uploadFileToCloudinary: thiếu file hoặc quill');
        return false;
    }

    // ==== VALIDATE ĐỊNH DẠNG ====
    const allowedTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif'
    ];

    const fileTypeLower = (file.type || '').toLowerCase();

    if (fileTypeLower && !allowedTypes.includes(fileTypeLower)) {
        showToast('❌ Định dạng ảnh không hỗ trợ. Chỉ chấp nhận PNG, JPG, GIF, WEBP, HEIC.', 'error', 5000);
        return false;
    }

    // ==== VALIDATE KÍCH THƯỚC ====
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        showToast('❌ Ảnh quá lớn (>10MB). Vui lòng chọn ảnh nhỏ hơn.', 'error', 5000);
        return false;
    }

    // ==== LƯU VỊ TRÍ CON TRỎ HIỆN TẠI ====
    let insertIndex;
    try {
        const range = quill.getSelection(true);
        insertIndex = range ? range.index : quill.getLength();
    } catch (e) {
        insertIndex = quill.getLength();
    }

    // ==== HIỆN LOADING ====
    const loadingToast = showToast(
        '<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;vertical-align:middle;margin-right:6px;"></span> Đang tải ảnh lên Cloudinary...',
        'info',
        60000
    );

    // ==== DISABLE EDITOR ĐỂ TRÁNH USER GÕ KHI ĐANG UPLOAD ====
    const wasEnabled = quill.isEnabled();
    try {
        quill.enable(false);
    } catch (e) {}

    try {
        // ==== UPLOAD LÊN CLOUDINARY ====
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'upload_anh_firebase');

        const response = await fetch('https://api.cloudinary.com/v1_1/svvzpxjj/image/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            const errMsg = (data && data.error && data.error.message)
                ? data.error.message
                : 'Upload thất bại (' + response.status + ')';
            throw new Error(errMsg);
        }

        if (!data.secure_url) {
            throw new Error('Không nhận được URL ảnh từ Cloudinary.');
        }

        // ==== TỐI ƯU URL — TRANSFORMATION ====
        let imageUrl = data.secure_url;
        if (imageUrl.includes('/upload/')) {
            imageUrl = imageUrl.replace(
                '/upload/',
                '/upload/w_1200,q_auto,f_auto/'
            );
        }

        // ==== BẬT LẠI EDITOR + CHÈN ẢNH ====
        if (wasEnabled) {
            quill.enable(true);
        }

        quill.insertEmbed(insertIndex, 'image', imageUrl, Quill.sources.USER);
        quill.setSelection(insertIndex + 1, Quill.sources.SILENT);
        quill.focus();

        // ==== ĐÓNG LOADING + BÁO THÀNH CÔNG ====
        if (loadingToast && loadingToast.close) {
            loadingToast.close();
        }
        showToast('✅ Đã chèn ảnh thành công!', 'success', 2500);

        console.log('✅ Upload Cloudinary thành công:', imageUrl);
        return true;

    } catch (error) {
        console.error('Cloudinary upload error:', error);

        if (wasEnabled) {
            try {
                quill.enable(true);
            } catch (e) {}
        }

        if (loadingToast && loadingToast.close) {
            loadingToast.close();
        }
        showToast('❌ Lỗi tải ảnh: ' + error.message, 'error', 6000);
        return false;
    }
}

/**
 * Chèn ảnh vào Quill — tách rõ 2 lựa chọn nguồn ảnh.
 *
 * Luồng xử lý:
 *   1. Hiện dialog SweetAlert2 hỏi nguồn ảnh.
 *   2. "Chụp ảnh mới"  → input có capture="environment" (mở camera sau).
 *   3. "Chọn từ thư viện" → input KHÔNG có capture (mở picker đầy đủ).
 *   4. Upload Cloudinary → chèn vào Quill tại vị trí con trỏ.
 *
 * @param {Object} quill - Quill instance
 */
function selectAndUploadImage(quill) {
    if (!quill) {
        showToast('Editor chưa sẵn sàng', 'error');
        return;
    }

    // ============ HÀM NỘI BỘ: TẠO INPUT + XỬ LÝ UPLOAD ============
    function openImagePicker(useCamera) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = false;

        // Chỉ set capture khi user chọn "Chụp ảnh mới".
        // Khi có capture="environment", Android/iOS sẽ mở thẳng camera sau.
        // Khi không có capture, hệ điều hành mở menu đầy đủ (Camera, Thư viện, Tệp).
        if (useCamera) {
            input.setAttribute('capture', 'environment');
        }

        // Ẩn input khỏi viewport nhưng vẫn cho OS nhận diện được
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        input.style.top = '-9999px';
        input.style.width = '1px';
        input.style.height = '1px';
        input.style.opacity = '0';
        input.setAttribute('aria-hidden', 'true');
        input.setAttribute('tabindex', '-1');

        // ============ XỬ LÝ KHI USER CHỌN ẢNH ============
        input.addEventListener('change', async function() {
            const file = input.files && input.files[0];

            if (!file) {
                input.remove();
                return;
            }

            // ---------- VALIDATE KÍCH THƯỚC ----------
            if (file.size > 10 * 1024 * 1024) {
                showToast('❌ Ảnh quá lớn (>10MB). Vui lòng chọn ảnh nhỏ hơn.', 'error', 5000);
                input.remove();
                return;
            }

            // ---------- VALIDATE ĐỊNH DẠNG ----------
            const allowedTypes = [
                'image/png',
                'image/jpeg',
                'image/jpg',
                'image/gif',
                'image/webp',
                'image/heic',
                'image/heif'
            ];

            const normalizedType = (file.type || '').toLowerCase();
            const fileExt = (file.name || '').split('.').pop().toLowerCase();
            const allowedExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif'];

            const isTypeAllowed = allowedTypes.includes(normalizedType);
            const isExtAllowed = allowedExts.includes(fileExt);

            if (!isTypeAllowed && !isExtAllowed) {
                showToast('❌ Định dạng ảnh không hỗ trợ. Chỉ chấp nhận PNG, JPG, GIF, WEBP, HEIC.', 'error', 5000);
                input.remove();
                return;
            }

            // ---------- LƯU VỊ TRÍ CON TRỎ ----------
            const range = quill.getSelection(true) || { index: quill.getLength() };

            // ---------- HIỂN THỊ LOADING ----------
            const loadingToast = showToast(
                '<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;vertical-align:middle;margin-right:6px;"></span> Đang tải ảnh lên Cloudinary...',
                'info',
                60000
            );

            // ---------- TẠM KHÓA EDITOR ----------
            try {
                quill.enable(false);
            } catch (e) {
                console.warn('Không disable được Quill:', e);
            }

            try {
                // ---------- UPLOAD LÊN CLOUDINARY ----------
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'upload_anh_firebase');

                const response = await fetch('https://api.cloudinary.com/v1_1/svvzpxjj/image/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    const errMsg = (data && data.error && data.error.message)
                        ? data.error.message
                        : 'Upload thất bại (' + response.status + ')';
                    throw new Error(errMsg);
                }

                if (!data.secure_url) {
                    throw new Error('Không nhận được URL ảnh từ Cloudinary.');
                }

                // ---------- TỐI ƯU URL ẢNH ----------
                let imageUrl = data.secure_url;
                if (imageUrl.includes('/upload/')) {
                    imageUrl = imageUrl.replace(
                        '/upload/',
                        '/upload/w_500,q_auto,f_auto/'
                    );
                }

                // ---------- CHÈN ẢNH VÀO QUILL ----------
                quill.enable(true);
                quill.insertEmbed(range.index, 'image', imageUrl, Quill.sources.USER);
                quill.setSelection(range.index + 1, Quill.sources.SILENT);
                quill.focus();

                // ---------- ĐÓNG LOADING ----------
                if (loadingToast && loadingToast.close) {
                    loadingToast.close();
                }
                showToast('✅ Đã chèn ảnh thành công!', 'success', 2500);

                console.log('✅ Upload Cloudinary thành công:', imageUrl);

            } catch (error) {
                console.error('Cloudinary upload error:', error);
                try {
                    quill.enable(true);
                } catch (e) {
                    console.warn('Không enable lại được Quill:', e);
                }

                if (loadingToast && loadingToast.close) {
                    loadingToast.close();
                }
                showToast('❌ Lỗi tải ảnh: ' + error.message, 'error', 6000);

            } finally {
                input.remove();
            }
        });

        // ---------- GẮN INPUT VÀO DOM VÀ KÍCH HOẠT ----------
        document.body.appendChild(input);
        input.click();
    }

    // ============ HIỆN DIALOG CHỌN NGUỒN ẢNH ============
    Swal.fire({
        title: 'Chèn ảnh',
        text: 'Chọn nguồn ảnh bạn muốn sử dụng',
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-camera"></i> Chụp ảnh mới',
        denyButtonText: '<i class="fas fa-images"></i> Chọn từ thư viện',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#1e3a8a',
        denyButtonColor: '#059669',
        cancelButtonColor: '#94a3b8',
        reverseButtons: false,
        allowOutsideClick: true
    }).then(function(result) {
        if (result.isConfirmed) {
            // "Chụp ảnh mới" → CÓ capture
            openImagePicker(true);
        } else if (result.isDenied) {
            // "Chọn từ thư viện" → KHÔNG capture
            openImagePicker(false);
        }
    });
}

/**
 * Gắn sự kiện PASTE (Ctrl+V) để bắt ảnh từ clipboard
 * Ngăn chặn Quill dán Base64 mặc định
 * @param {Object} quill - Quill instance
 */
function setupImagePasteHandler(quill) {
    if (!quill || !quill.root) return;

    if (quill.root.dataset.pasteHandlerBound === 'true') {
        return;
    }
    quill.root.dataset.pasteHandlerBound = 'true';

    quill.root.addEventListener('paste', async function(e) {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        const items = clipboardData.items;
        if (!items || items.length === 0) return;

        const imageFiles = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.kind === 'file' && item.type && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    imageFiles.push(file);
                }
            }
        }

        if (imageFiles.length === 0) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        console.log(`📋 Đã phát hiện ${imageFiles.length} ảnh từ clipboard — đang upload...`);

        for (const file of imageFiles) {
            try {
                await uploadFileToCloudinary(file, quill);
            } catch (err) {
                console.error('Lỗi upload ảnh từ clipboard:', err);
            }
        }
    }, true);
}

/**
 * Gắn sự kiện DRAG & DROP để bắt ảnh kéo thả vào editor
 * Ngăn chặn Quill dán Base64 mặc định
 * @param {Object} quill - Quill instance
 */
function setupImageDropHandler(quill) {
    if (!quill || !quill.root) return;

    if (quill.root.dataset.dropHandlerBound === 'true') {
        return;
    }
    quill.root.dataset.dropHandlerBound = 'true';

    quill.root.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }

        quill.root.classList.add('ql-drag-over');
    }, false);

    quill.root.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        quill.root.classList.remove('ql-drag-over');
    }, false);

    quill.root.addEventListener('drop', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        quill.root.classList.remove('ql-drag-over');

        const dataTransfer = e.dataTransfer;
        if (!dataTransfer) return;

        const files = dataTransfer.files;
        if (!files || files.length === 0) return;

        const imageFiles = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type && file.type.startsWith('image/')) {
                imageFiles.push(file);
            }
        }

        if (imageFiles.length === 0) {
            return;
        }

        console.log(`🖱️ Đã phát hiện ${imageFiles.length} ảnh từ drag&drop — đang upload...`);

        for (const file of imageFiles) {
            try {
                await uploadFileToCloudinary(file, quill);
            } catch (err) {
                console.error('Lỗi upload ảnh từ drag&drop:', err);
            }
        }
    }, false);
}

/**
 * Khởi tạo TẤT CẢ handler ảnh cho 1 Quill instance
 * Gọi hàm này sau khi tạo Quill xong
 * @param {Object} quill - Quill instance
 */
function setupImageHandlers(quill) {
    if (!quill) return;

    setupImagePasteHandler(quill);
    setupImageDropHandler(quill);

    console.log('✅ Đã gắn tất cả handler ảnh (paste + drag&drop) cho Quill');
}

window.uploadFileToCloudinary = uploadFileToCloudinary;
window.selectAndUploadImage = selectAndUploadImage;
window.setupImagePasteHandler = setupImagePasteHandler;
window.setupImageDropHandler = setupImageDropHandler;
window.setupImageHandlers = setupImageHandlers;
// ============================================================
// VISUAL FORMULA BUILDER — Modal nhập công thức Toán
// Tích hợp Quick Toolbar (Toán - Lý - Hóa) cho giáo viên THPT
// ============================================================

// Biến lưu trạng thái modal đang mở
window._formulaModalState = {
    quill: null,
    mode: 'insert',
    editingElement: null,
    opening: false
};

// Timer dùng để hủy focus nếu user đóng modal quá nhanh
window._formulaModalFocusTimer = null;

// Bộ đệm quản lý focus guard cho menu MathLive (KHÔNG ẩn menu)
window._formulaModalFocusGuard = {
    pollTimer: null
};

/**
 * Phát hiện thiết bị di động để chọn policy bàn phím ảo phù hợp.
 * Trên desktop: 'manual' — user phải bấm nút bàn phím mới mở.
 * Trên mobile: 'auto' — bàn phím tự mở khi focus vào math-field.
 * @returns {boolean}
 */
function isMobileDeviceForMathLive() {
    if (typeof window === 'undefined') return false;
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isSmallScreen = window.matchMedia('(max-width: 1024px)').matches;
    return hasTouch && isSmallScreen;
}

/**
 * Kiểm tra math-field có đang giữ focus không.
 * Bao gồm cả trường hợp focus nằm trong shadow DOM của math-field
 * (ví dụ khi menu 3 gạch đang mở).
 * @param {HTMLElement} mathField
 * @returns {boolean}
 */
function isMathFieldActive(mathField) {
    if (!mathField) return false;
    if (document.activeElement === mathField) return true;
    if (mathField.shadowRoot && mathField.shadowRoot.activeElement) return true;
    if (document.activeElement && typeof mathField.contains === 'function') {
        if (mathField.contains(document.activeElement)) return true;
    }
    return false;
}

/**
 * Dừng polling focus guard.
 */
function clearMathLiveFocusGuard() {
    if (window._formulaModalFocusGuard && window._formulaModalFocusGuard.pollTimer) {
        clearInterval(window._formulaModalFocusGuard.pollTimer);
        window._formulaModalFocusGuard.pollTimer = null;
    }
}

/**
 * Gắn focus guard cho math-field — KHÔNG ẩn menu 3 gạch.
 * Khi user mở menu, math-field bị blur nhưng focus chuyển vào shadow DOM.
 * Polling 100ms phát hiện khi menu đóng → tự động refocus math-field.
 * @param {HTMLElement} mathField
 */
function setupMathLiveFocusGuard(mathField) {
    if (!mathField) return;

    if (mathField._focusGuardBlurHandler) {
        try {
            mathField.removeEventListener('blur', mathField._focusGuardBlurHandler);
        } catch (e) {
            console.warn('Không gỡ được blur handler cũ:', e);
        }
        mathField._focusGuardBlurHandler = null;
    }

    const blurHandler = function() {
        setTimeout(function() {
            const overlay = document.getElementById('formulaModalOverlay');
            if (!overlay || !overlay.classList.contains('active')) return;

            if (!isMathFieldActive(mathField)) return;

            clearMathLiveFocusGuard();

            window._formulaModalFocusGuard.pollTimer = setInterval(function() {
                const ov = document.getElementById('formulaModalOverlay');

                if (!ov || !ov.classList.contains('active')) {
                    clearMathLiveFocusGuard();
                    return;
                }

                if (isMathFieldActive(mathField)) return;

                clearMathLiveFocusGuard();

                const activeNow = document.activeElement;
                if (activeNow && activeNow !== document.body && ov.contains(activeNow)) {
                    return;
                }

                setTimeout(function() {
                    const ov2 = document.getElementById('formulaModalOverlay');
                    if (!ov2 || !ov2.classList.contains('active')) return;

                    const a2 = document.activeElement;
                    if (a2 && a2.classList && a2.classList.contains('fqt-btn')) return;

                    try {
                        mathField.focus();
                    } catch (e) {
                        console.warn('Không refocus được mathField sau khi đóng menu:', e);
                    }
                }, 40);
            }, 100);
        }, 0);
    };

    mathField._focusGuardBlurHandler = blurHandler;
    mathField.addEventListener('blur', blurHandler);
}

/**
 * Render preview KaTeX cho các nút trong Quick Toolbar.
 * Nếu KaTeX chưa load, giữ lại fallback text.
 */
function renderQuickToolbarPreviews() {
    const previews = document.querySelectorAll('#formulaModalOverlay .fqt-preview');
    previews.forEach(function(el) {
        if (el.dataset.rendered === 'true') return;

        const latex = el.getAttribute('data-preview');
        if (!latex) return;

        if (typeof katex === 'undefined' || typeof katex.render !== 'function') {
            return;
        }

        try {
            el.innerHTML = '';
            katex.render(latex, el, {
                throwOnError: false,
                displayMode: false,
                output: 'html'
            });
            el.dataset.rendered = 'true';
        } catch (e) {
            console.warn('Không render được preview cho:', latex, e);
            el.dataset.rendered = 'true';
        }
    });
}

/**
 * Đảm bảo Modal Formula đã được tạo trong DOM (tạo 1 lần duy nhất).
 * Bao gồm Quick Toolbar chèn nhanh công thức Toán - Lý - Hóa THPT.
 * TUYỆT ĐỐI KHÔNG dùng menuItems = [] — giữ nguyên menu 3 gạch mặc định.
 */
function ensureFormulaModal() {
    if (document.getElementById('formulaModalOverlay')) return;

    const modalHtml = `
    <div class="formula-modal-overlay" id="formulaModalOverlay">
        <div class="formula-modal" onclick="event.stopPropagation()">
            <div class="formula-modal-header">
                <h3>
                    <span style="font-size:22px;">🧮</span>
                    <span id="formulaModalTitle">Chèn công thức Toán học</span>
                </h3>
                <button type="button" class="formula-modal-close" onclick="closeFormulaModal()" title="Đóng (ESC)">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="formula-modal-body">
                
                <div class="formula-quick-toolbar">
                    <div class="fqt-group">
                        <span class="fqt-label"><i class="fas fa-square-root-variable"></i> Toán</span>
                        <div class="fqt-buttons">
                            <button type="button" class="fqt-btn"
                                data-latex="\\frac{#?}{#?}"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Phân số">
                                <span class="fqt-preview" data-preview="\\frac{a}{b}"><span class="fqt-fallback">a/b</span></span>
                            </button>
                            <button type="button" class="fqt-btn"
                                data-latex="#?^{#?}"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Lũy thừa">
                                <span class="fqt-preview" data-preview="x^{n}"><span class="fqt-fallback">x^n</span></span>
                            </button>
                            <button type="button" class="fqt-btn"
                                data-latex="\\sqrt{#?}"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Căn bậc 2">
                                <span class="fqt-preview" data-preview="\\sqrt{x}"><span class="fqt-fallback">√x</span></span>
                            </button>
                            <button type="button" class="fqt-btn"
                                data-latex="\\begin{cases} #? \\\\ #? \\end{cases}"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Hệ 2 phương trình">
                                <span class="fqt-preview" data-preview="\\begin{cases} x \\\\ y \\end{cases}"><span class="fqt-fallback">Hệ</span></span>
                            </button>
                            <button type="button" class="fqt-btn"
                                data-latex="\\int_{#?}^{#?} #? \\, dx"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Tích phân">
                                <span class="fqt-preview" data-preview="\\int_{a}^{b} f(x) \\, dx"><span class="fqt-fallback">∫</span></span>
                            </button>
                            <button type="button" class="fqt-btn"
                                data-latex="\\lim_{#? \\to #?}"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Giới hạn">
                                <span class="fqt-preview" data-preview="\\lim_{x \\to \\infty}"><span class="fqt-fallback">lim</span></span>
                            </button>
                            <button type="button" class="fqt-btn"
                                data-latex="\\vec{#?}"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Vector">
                                <span class="fqt-preview" data-preview="\\vec{v}"><span class="fqt-fallback">vec</span></span>
                            </button>
                       
                            <button type="button" class="fqt-btn" data-latex="\\overrightarrow{#?}" onmousedown="event.preventDefault()" onclick="insertQuickFormula(this.dataset.latex)" title="Vector">
                                <span class="fqt-preview" data-preview="\\overrightarrow{AB}"><span class="fqt-fallback">Véc-tơ</span></span>
                            </button>
                           

<!-- 1. Căn bậc n -->
<button type="button" class="fqt-btn" data-latex="\\sqrt[#?]{#?}" onmousedown="event.preventDefault()" onclick="insertQuickFormula(this.dataset.latex)" title="Căn bậc n">
    <span class="fqt-preview" data-preview="\\sqrt[n]{x}"><span class="fqt-fallback">n√x</span></span>
</button>

<!-- 2. Trị tuyệt đối -->
<button type="button" class="fqt-btn" data-latex="\\left| #? \\right|" onmousedown="event.preventDefault()" onclick="insertQuickFormula(this.dataset.latex)" title="Trị tuyệt đối">
    <span class="fqt-preview" data-preview="|x|"><span class="fqt-fallback">|x|</span></span>
</button>

<!-- 3. Logarit (Đại số 12) -->
<button type="button" class="fqt-btn" data-latex="\\log_{#?} #?" onmousedown="event.preventDefault()" onclick="insertQuickFormula(this.dataset.latex)" title="Logarit">
    <span class="fqt-preview" data-preview="\\log_a b"><span class="fqt-fallback">log</span></span>
</button>

<!-- 4. Ký hiệu Góc (Hình học) -->
<button type="button" class="fqt-btn" data-latex="\\widehat{#?}" onmousedown="event.preventDefault()" onclick="insertQuickFormula(this.dataset.latex)" title="Ký hiệu Góc">
    <span class="fqt-preview" data-preview="\\widehat{ABC}"><span class="fqt-fallback">Góc</span></span>
</button>

<!-- 5. Tổng Sigma (Đại số 11) -->
<button type="button" class="fqt-btn" data-latex="\\sum_{#?}^{#?} #?" onmousedown="event.preventDefault()" onclick="insertQuickFormula(this.dataset.latex)" title="Tổng Sigma">
    <span class="fqt-preview" data-preview="\\sum_{i=1}^{n}"><span class="fqt-fallback">∑</span></span>
</button>

<!-- 6. Tổ hợp chập k của n (Đại số 11) -->
<button type="button" class="fqt-btn" data-latex="C_{#?}^{#?}" onmousedown="event.preventDefault()" onclick="insertQuickFormula(this.dataset.latex)" title="Tổ hợp">
    <span class="fqt-preview" data-preview="C_n^k"><span class="fqt-fallback">C</span></span>
</button>
                        </div>

                    <div class="fqt-group">
                        <span class="fqt-label"><i class="fas fa-flask"></i> Lý - Hóa</span>
                        <div class="fqt-buttons">
                            <button type="button" class="fqt-btn"
                                data-latex="\\xrightarrow{ t^\\circ }"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Mũi tên phản ứng">
                                <span class="fqt-preview" data-preview="\\xrightarrow{t^\\circ}"><span class="fqt-fallback">→</span></span>
                            </button>
                            <button type="button" class="fqt-btn"
                                data-latex="_{#?}^{#?}\\text{#?}"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Đồng vị / Nguyên tử">
                                <span class="fqt-preview" data-preview="_{Z}^{A}\\text{X}"><span class="fqt-fallback">A/Z X</span></span>
                            </button>
                            <button type="button" class="fqt-btn"
                                data-latex="^\\circ\\text{C}"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Độ C">
                                <span class="fqt-preview" data-preview="^\\circ\\text{C}"><span class="fqt-fallback">°C</span></span>
                            </button>
                            <button type="button" class="fqt-btn"
                                data-latex="\\Delta"
                                onmousedown="event.preventDefault()"
                                onclick="insertQuickFormula(this.dataset.latex)"
                                title="Delta">
                                <span class="fqt-preview" data-preview="\\Delta"><span class="fqt-fallback">Δ</span></span>
                            </button>
                        </div>
                    </div>
                </div>

                <math-field id="formulaMathField" virtual-keyboard-mode="auto"></math-field>

                <div class="formula-latex-output empty" id="formulaLatexOutput">
                    <span class="label">LaTeX:</span>
                    <span class="value" id="formulaLatexValue">(trống)</span>
                </div>
            </div>

            <div class="formula-modal-footer">
                <div class="formula-modal-hint">
                    <i class="fas fa-mouse-pointer"></i>
                    <span>Bấm đúp vào công thức có sẵn để chỉnh sửa</span>
                </div>
                <div class="formula-modal-footer-actions">
                    <button type="button" class="formula-btn formula-btn-secondary" onclick="closeFormulaModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="button" class="formula-btn formula-btn-primary" id="formulaInsertBtn" onclick="confirmInsertFormula()">
                        <i class="fas fa-check"></i> <span id="formulaInsertBtnText">Chèn</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('formulaModalOverlay');

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeFormulaModal();
        }
    });

    const mathField = document.getElementById('formulaMathField');
    if (mathField) {
        mathField.addEventListener('input', updateLatexOutput);
        mathField.addEventListener('change', updateLatexOutput);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const ov = document.getElementById('formulaModalOverlay');
            if (ov && ov.classList.contains('active')) {
                closeFormulaModal();
            }
        }
    });

    console.log('✅ Formula Modal (MathLive) đã sẵn sàng — Quick Toolbar kèm menu 3 gạch');
}

/**
 * Cập nhật khung hiển thị LaTeX bên dưới math-field.
 */
function updateLatexOutput() {
    const mathField = document.getElementById('formulaMathField');
    const outputEl = document.getElementById('formulaLatexOutput');
    const valueEl = document.getElementById('formulaLatexValue');

    if (!mathField || !outputEl || !valueEl) return;

    let latex = '';
    try {
        latex = mathField.getValue ? mathField.getValue('latex') : (mathField.value || '');
    } catch (e) {
        latex = mathField.value || '';
    }

    latex = (latex || '').trim();

    if (!latex) {
        outputEl.classList.add('empty');
        valueEl.textContent = '(trống)';
    } else {
        outputEl.classList.remove('empty');
        valueEl.textContent = latex;
    }
}

/**
 * Cấu hình bàn phím MathLive — CHIẾN THUẬT PHÂN BIỆT RÕ MOBILE/DESKTOP.
 *
 * MOBILE:
 *   - Policy = 'auto' — để MathLive tự quản lý việc mở/đóng bàn phím
 *     khi math-field nhận focus. KHÔNG can thiệp thủ công.
 *   - KHÔNG set inputmode="none" (tránh chặn cơ chế auto của MathLive).
 *   - KHÔNG gắn listener focus/click để gọi show().
 *
 * DESKTOP:
 *   - Policy = 'manual' — user tự bấm nút bàn phím (biểu tượng ☰ hoặc ⌨)
 *     trên math-field để mở bàn phím ảo.
 *   - Set inputmode="none" để chặn bàn phím chữ của máy tính.
 *
 * QUẢN LÝ LISTENER TOÀN CỤC:
 *   - Lưu tham chiếu hàm listener vào window._mathLiveToggleListenerFn.
 *   - Trước khi gắn mới, removeEventListener đúng cách để tránh trùng lặp.
 *   - Clear timeout cũ đang chờ bind (nếu có).
 *
 * @param {HTMLElement} mathField - Element <math-field> của MathLive
 */
function setupMathLiveKeyboardState(mathField) {
    if (!mathField) {
        console.warn('setupMathLiveKeyboardState: mathField không hợp lệ');
        return;
    }

    // ============ BƯỚC 1: GỠ LISTENER CŨ TRÊN MATHFIELD ============
    if (mathField._mathLiveShowHandler) {
        try {
            mathField.removeEventListener('focus', mathField._mathLiveShowHandler);
            mathField.removeEventListener('click', mathField._mathLiveShowHandler);
        } catch (e) {
            console.warn('Không gỡ được listener show cũ trên mathField:', e);
        }
        mathField._mathLiveShowHandler = null;
    }

    // ============ BƯỚC 2: GỠ LISTENER CŨ TRÊN WINDOW.MATHVIRTUALKEYBOARD ============
    // Đây là fix quan trọng: phải lưu tham chiếu hàm listener,
    // vì chỉ set cờ về false không tháo được listener đã đăng ký.
    if (window._mathLiveToggleListenerFn && window.mathVirtualKeyboard) {
        try {
            window.mathVirtualKeyboard.removeEventListener(
                'virtual-keyboard-toggle',
                window._mathLiveToggleListenerFn
            );
            console.log('🧹 Đã gỡ listener virtual-keyboard-toggle cũ');
        } catch (e) {
            console.warn('Không gỡ được listener cũ trên mathVirtualKeyboard:', e);
        }
        window._mathLiveToggleListenerFn = null;
    }

    // ============ BƯỚC 3: CLEAR TIMER BIND CŨ (NẾU CÓ) ============
    if (window._mathLiveToggleBindTimer) {
        try {
            clearTimeout(window._mathLiveToggleBindTimer);
        } catch (e) {
            console.warn('Không clear được timer bind cũ:', e);
        }
        window._mathLiveToggleBindTimer = null;
    }

    // ============ BƯỚC 4: XÁC ĐỊNH THIẾT BỊ ============
    const isMobile = isMobileDeviceForMathLive();

    // ============ BƯỚC 5: SET POLICY THEO THIẾT BỊ ============
    // Mobile  → 'auto'   : MathLive tự show/hide bàn phím khi focus/blur
    // Desktop → 'manual' : chỉ mở khi user bấm nút trên math-field
    try {
        if (typeof mathField.mathVirtualKeyboardPolicy !== 'undefined') {
            const policy = isMobile ? 'auto' : 'manual';
            mathField.mathVirtualKeyboardPolicy = policy;
            console.log('⌨️ MathLive keyboard policy: ' + policy.toUpperCase() + ' (mobile=' + isMobile + ')');
        }
    } catch (e) {
        console.warn('Không set được mathVirtualKeyboardPolicy:', e);
    }

    // ============ BƯỚC 6: ATTRIBUTE THEO THIẾT BỊ ============
    if (isMobile) {
        // Mobile: KHÔNG set inputmode="none".
        // Lý do: policy='auto' cần MathLive tự quản lý focus để mở bàn phím.
        // Nếu set inputmode='none', ta vô tình chặn cơ chế auto của MathLive.
        try {
            mathField.removeAttribute('inputmode');
            mathField.removeAttribute('autocomplete');
            mathField.removeAttribute('autocorrect');
            mathField.removeAttribute('autocapitalize');
            mathField.removeAttribute('spellcheck');
            console.log('📱 Mobile: đã gỡ các attribute can thiệp bàn phím');
        } catch (e) {
            console.warn('Không gỡ được attribute mobile:', e);
        }
    } else {
        // Desktop: set inputmode='none' để chặn bàn phím chữ của máy tính.
        try {
            mathField.setAttribute('inputmode', 'none');
            mathField.setAttribute('autocomplete', 'off');
            mathField.setAttribute('autocorrect', 'off');
            mathField.setAttribute('autocapitalize', 'off');
            mathField.setAttribute('spellcheck', 'false');
            console.log('🖥️ Desktop: đã set inputmode="none"');
        } catch (e) {
            console.warn('Không set được attribute desktop:', e);
        }
    }

    // ============ BƯỚC 7: SMART OPTIONS ============
    try {
        if (typeof mathField.smartFence !== 'undefined') {
            mathField.smartFence = true;
        }
        if (typeof mathField.smartSuperscript !== 'undefined') {
            mathField.smartSuperscript = true;
        }
        if (typeof mathField.removeExtraneousParentheses !== 'undefined') {
            mathField.removeExtraneousParentheses = true;
        }
    } catch (e) {
        console.warn('Không set được MathLive smart options:', e);
    }

    // ============ BƯỚC 8: FOCUS GUARD ============
    // Giữ focus guard để refocus math-field sau khi đóng menu 3 gạch.
    try {
        setupMathLiveFocusGuard(mathField);
        console.log('🛡️ Đã gắn focus guard');
    } catch (e) {
        console.warn('Không gắn được focus guard:', e);
    }

    // ============ BƯỚC 9: LISTENER CHO BODY CLASS ============
    // Chỉ gắn DUY NHẤT 1 listener cho toàn bộ ứng dụng.
    // Lưu tham chiếu hàm để có thể gỡ đúng cách khi cần.
    const toggleListenerFn = function() {
        setTimeout(function() {
            const isVisible = window.mathVirtualKeyboard
                           && window.mathVirtualKeyboard.visible === true;

            if (isVisible) {
                document.body.classList.add('keyboard-open');
                console.log('⌨️ Keyboard MỞ');
            } else {
                document.body.classList.remove('keyboard-open');
                console.log('⌨️ Keyboard ĐÓNG');
            }
        }, 50);
    };

    const bindKeyboardToggleListener = function() {
        if (!window.mathVirtualKeyboard) return;

        // Nếu đã có listener đang gắn, không gắn lại
        if (window._mathLiveToggleListenerFn) return;

        window._mathLiveToggleListenerFn = toggleListenerFn;
        window.mathVirtualKeyboard.addEventListener('virtual-keyboard-toggle', toggleListenerFn);
        console.log('✅ Đã gắn listener virtual-keyboard-toggle');
    };

    if (window.mathVirtualKeyboard) {
        bindKeyboardToggleListener();
    } else {
        console.warn('⚠️ window.mathVirtualKeyboard chưa sẵn sàng — thử lại sau 500ms');
        window._mathLiveToggleBindTimer = setTimeout(function() {
            window._mathLiveToggleBindTimer = null;
            bindKeyboardToggleListener();
        }, 500);
    }
}

/**
 * Mở Modal Formula Builder.
 *
 * Chiến thuật focus theo thiết bị:
 *   - MOBILE: gọi mathField.focus() NGAY LẬP TỨC, đồng bộ trong
 *     user gesture (trước khi qua RAF). Cần thiết vì iOS Safari
 *     chỉ cho phép mở bàn phím bên trong user gesture. Sau đó,
 *     MathLive với policy='auto' sẽ tự động hiện bàn phím Toán.
 *
 *   - DESKTOP: chờ 2 RAF + 180ms để MathLive render xong rồi mới
 *     focus — không cần gấp vì bàn phím ảo là 'manual', user sẽ
 *     tự bấm nút bàn phím trên math-field khi cần.
 *
 * Quản lý cờ opening:
 *   - Đặt true khi bắt đầu.
 *   - Đặt false trong MỌI nhánh: thành công, lỗi, modal đóng sớm.
 *   - Cấu trúc try/catch bọc toàn bộ, không dùng finally setTimeout.
 *
 * @param {Object} quill - Quill instance
 * @param {string} initialLatex - LaTeX ban đầu
 * @param {string} mode - 'insert' hoặc 'edit'
 * @param {HTMLElement} editingElement - Element .ql-formula đang edit
 */
function openFormulaModal(quill, initialLatex, mode, editingElement) {
    // ============ VALIDATE INPUT ============
    if (!quill) {
        showToast('Editor chưa sẵn sàng', 'error');
        return;
    }

    if (typeof MathLive === 'undefined' && !customElements.get('math-field')) {
        showToast('⚠️ MathLive chưa load. Không thể mở bàn phím toán.', 'error', 5000);
        return;
    }

    // ============ CHỐNG DOUBLE-OPEN ============
    if (window._formulaModalState.opening) {
        console.log('⏳ Formula Modal đang mở, bỏ qua lần gọi trùng');
        return;
    }
    window._formulaModalState.opening = true;

    try {
        // ============ DỌN TIMER + GUARD CŨ ============
        if (window._formulaModalFocusTimer) {
            clearTimeout(window._formulaModalFocusTimer);
            window._formulaModalFocusTimer = null;
        }

        clearMathLiveFocusGuard();

        // ============ ĐẢM BẢO MODAL DOM ĐÃ TỒN TẠI ============
        ensureFormulaModal();

        // ============ LƯU STATE ============
        window._formulaModalState.quill = quill;
        window._formulaModalState.mode = mode || 'insert';
        window._formulaModalState.editingElement = editingElement || null;

        // ============ LẤY ELEMENT ============
        const overlay = document.getElementById('formulaModalOverlay');
        const titleEl = document.getElementById('formulaModalTitle');
        const insertBtnText = document.getElementById('formulaInsertBtnText');
        const mathField = document.getElementById('formulaMathField');

        // ============ CẬP NHẬT TIÊU ĐỀ + NÚT ============
        if (titleEl) {
            titleEl.textContent = mode === 'edit'
                ? 'Chỉnh sửa công thức Toán học'
                : 'Chèn công thức Toán học';
        }

        if (insertBtnText) {
            insertBtnText.textContent = mode === 'edit' ? 'Cập nhật' : 'Chèn';
        }

        // ============ ĐÁNH DẤU CÔNG THỨC ĐANG EDIT ============
        if (editingElement) {
            editingElement.classList.add('formula-editing');
        }

        // ============ BẬT FOCUS MODE + HIỆN MODAL ============
        document.body.classList.add('formula-focus-mode');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        const isMobile = isMobileDeviceForMathLive();

        // ============ MOBILE: FOCUS ĐỒNG BỘ TRONG USER GESTURE ============
        // iOS Safari chỉ cho phép mở bàn phím bên trong user gesture.
        // Focus ngay lập tức, không qua RAF, để MathLive auto policy
        // kịp bắt focus event và mở bàn phím Toán.
        if (isMobile && mathField) {
            try {
                mathField.focus();
                console.log('📱 Mobile: đã focus đồng bộ');
            } catch (e) {
                console.warn('Focus mobile thất bại:', e);
            }
        }

        // ============ RAF CHAIN: SETVALUE + SETUP KEYBOARD ============
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (!overlay.classList.contains('active')) {
                    window._formulaModalState.opening = false;
                    return;
                }

                // ---------- BƠM LATEX VÀO MATH-FIELD ----------
                if (mathField) {
                    try {
                        const latexValue = initialLatex || '';
                        if (typeof mathField.setValue === 'function') {
                            mathField.setValue(latexValue);
                        } else {
                            mathField.value = latexValue;
                        }
                    } catch (e) {
                        console.warn('Không set được LaTeX vào math-field:', e);
                    }

                    // ---------- CẤU HÌNH BÀN PHÍM CHO MATH-FIELD ----------
                    setupMathLiveKeyboardState(mathField);
                }

                // ---------- CẬP NHẬT UI PHỤ ----------
                updateLatexOutput();
                renderQuickToolbarPreviews();

                // ---------- FOCUS THEO THIẾT BỊ ----------
                if (isMobile) {
                    // Mobile: đã focus đồng bộ ở trên.
                    // Không cần focus lại — chỉ set opening=false.
                    window._formulaModalState.opening = false;
                    console.log('✅ Mobile: modal sẵn sàng');
                } else {
                    // Desktop: focus sau 180ms để MathLive render xong.
                    window._formulaModalFocusTimer = setTimeout(function() {
                        window._formulaModalFocusTimer = null;

                        if (!overlay.classList.contains('active')) {
                            window._formulaModalState.opening = false;
                            return;
                        }

                        if (mathField) {
                            try {
                                mathField.focus();
                            } catch (e) {
                                console.warn('Focus desktop thất bại:', e);
                            }
                        }

                        window._formulaModalState.opening = false;
                        console.log('✅ Desktop: modal sẵn sàng');
                    }, 180);
                }
            });
        });

    } catch (error) {
        // ============ XỬ LÝ LỖI ĐỒNG BỘ ============
        console.error('❌ Lỗi mở Formula Modal:', error);
        window._formulaModalState.opening = false;

        // Cố gắng đóng modal nếu nó đã mở nửa chừng
        try {
            const overlay = document.getElementById('formulaModalOverlay');
            if (overlay && overlay.classList.contains('active')) {
                // Không tự động đóng — để user tự đóng, chỉ log lỗi
                console.warn('⚠️ Modal đang mở nhưng gặp lỗi — user có thể đóng thủ công');
            }
        } catch (e) {
            console.warn('Không cleanup được overlay sau lỗi:', e);
        }
    }
}
/**
 * Đóng Modal Formula.
 */
function closeFormulaModal() {
    const overlay = document.getElementById('formulaModalOverlay');
    if (!overlay) return;

    if (window._formulaModalFocusTimer) {
        clearTimeout(window._formulaModalFocusTimer);
        window._formulaModalFocusTimer = null;
    }

    clearMathLiveFocusGuard();

    window._formulaModalState.opening = false;

    if (window._formulaModalState.editingElement) {
        window._formulaModalState.editingElement.classList.remove('formula-editing');
    }

    if (window.mathVirtualKeyboard && typeof window.mathVirtualKeyboard.hide === 'function') {
        try {
            window.mathVirtualKeyboard.hide();
        } catch (e) {
            console.warn('Không đóng được MathLive keyboard:', e);
        }
    }

    document.body.classList.remove('keyboard-open');
    document.body.classList.remove('formula-focus-mode');

    overlay.classList.remove('active');
    document.body.style.overflow = '';

    const mathField = document.getElementById('formulaMathField');
    if (mathField) {
        try {
            if (typeof mathField.setValue === 'function') {
                mathField.setValue('');
            } else {
                mathField.value = '';
            }
        } catch (e) {
            console.warn('Không reset được math-field:', e);
        }
    }

    window._formulaModalState.quill = null;
    window._formulaModalState.mode = 'insert';
    window._formulaModalState.editingElement = null;
}

/**
 * Xác nhận chèn/cập nhật công thức vào Quill.
 */
function confirmInsertFormula() {
    const mathField = document.getElementById('formulaMathField');
    const quill = window._formulaModalState.quill;
    const mode = window._formulaModalState.mode;
    const editingElement = window._formulaModalState.editingElement;

    if (!mathField) return;
    if (!quill) {
        showToast('Editor chưa sẵn sàng', 'error');
        return;
    }

    let latex = '';
    try {
        latex = mathField.getValue ? mathField.getValue('latex') : (mathField.value || '');
    } catch (e) {
        latex = mathField.value || '';
    }
    latex = (latex || '').trim();

    if (!latex) {
        showToast('Vui lòng nhập công thức trước khi chèn', 'warning');
        return;
    }

    if (typeof katex !== 'undefined') {
        try {
            katex.renderToString(latex, { throwOnError: true });
        } catch (e) {
            showToast('⚠️ Công thức chưa hợp lệ: ' + (e.message || ''), 'error', 5000);
            return;
        }
    }

    try {
        if (mode === 'edit' && editingElement) {
            const blot = Quill.find(editingElement);
            if (blot) {
                const index = blot.offset(quill.scroll);
                quill.deleteText(index, 1, Quill.sources.USER);
                quill.insertEmbed(index, 'formula', latex, Quill.sources.USER);
                quill.setSelection(index + 1, Quill.sources.SILENT);
                showToast('✅ Đã cập nhật công thức!', 'success', 2500);
            } else {
                showToast('⚠️ Không tìm thấy công thức để cập nhật.', 'error');
                closeFormulaModal();
                return;
            }
        } else {
            const range = quill.getSelection(true) || { index: quill.getLength() - 1 };
            quill.insertEmbed(range.index, 'formula', latex, Quill.sources.USER);
            quill.setSelection(range.index + 1, Quill.sources.SILENT);
            showToast('✅ Đã chèn công thức!', 'success', 2500);
        }

        quill.focus();
        closeFormulaModal();
    } catch (error) {
        console.error('Lỗi chèn công thức:', error);
        showToast('❌ Lỗi chèn công thức: ' + error.message, 'error', 5000);
    }
}

/**
 * Gắn sự kiện double-click để chỉnh sửa công thức có sẵn trong Quill.
 * @param {Object} quill
 */
function bindFormulaEditHandler(quill) {
    if (!quill || !quill.root) return;

    if (quill.root.dataset.formulaBound === 'true') return;
    quill.root.dataset.formulaBound = 'true';

    quill.root.addEventListener('dblclick', function(e) {
        const formulaEl = e.target.closest('.ql-formula');
        if (!formulaEl) return;

        e.preventDefault();
        e.stopPropagation();

        const latex = formulaEl.getAttribute('data-value') || '';
        openFormulaModal(quill, latex, 'edit', formulaEl);
    });

    console.log('✅ Đã gắn sự kiện double-click chỉnh sửa công thức');
}

/**
 * Chèn nhanh công thức vào math-field từ Quick Toolbar.
 * Sử dụng cú pháp placeholder #? của MathLive để con trỏ nhảy đúng vị trí.
 * @param {string} latex
 */
window.insertQuickFormula = function(latex) {
    const mathField = document.getElementById('formulaMathField');
    if (!mathField || !latex) return;

    try {
        mathField.focus();
    } catch (e) {
        console.warn('Không focus được mathField trước khi insert:', e);
    }

    setTimeout(function() {
        try {
            if (typeof mathField.executeCommand === 'function') {
                mathField.executeCommand(['insert', latex]);
            } else if (typeof mathField.insert === 'function') {
                mathField.insert(latex);
            } else {
                const cur = typeof mathField.getValue === 'function'
                    ? mathField.getValue('latex')
                    : (mathField.value || '');
                const next = cur + latex;
                if (typeof mathField.setValue === 'function') {
                    mathField.setValue(next);
                } else {
                    mathField.value = next;
                }
            }
        } catch (e) {
            console.warn('Không chèn được công thức nhanh:', e);
        }

        setTimeout(function() {
            try {
                mathField.focus();
            } catch (e) {
                console.warn('Không refocus được mathField sau khi chèn:', e);
            }

            if (typeof updateLatexOutput === 'function') {
                updateLatexOutput();
            }
        }, 20);
    }, 20);
};

// Export ra window
window.ensureFormulaModal = ensureFormulaModal;

window.openFormulaModal = openFormulaModal;
window.closeFormulaModal = closeFormulaModal;
window.confirmInsertFormula = confirmInsertFormula;
window.bindFormulaEditHandler = bindFormulaEditHandler;
window.initQuillEditor = initQuillEditor;
window.selectAndUploadImage = selectAndUploadImage;

window.isHtmlContent = isHtmlContent;
window.renderRichContent = renderRichContent;

window.showWelcomeModal = showWelcomeModal;
window.closeWelcomeModal = closeWelcomeModal;
window.shouldShowWelcomeModal = shouldShowWelcomeModal;
window.markWelcomeAsShown = markWelcomeAsShown;

window.autoResizeTextarea = autoResizeTextarea;
window.attachAutoResizeToDiscussionInputs = attachAutoResizeToDiscussionInputs;

window.isMobileDeviceForMathLive = isMobileDeviceForMathLive;
window.isMathFieldActive = isMathFieldActive;
window.setupMathLiveFocusGuard = setupMathLiveFocusGuard;
window.clearMathLiveFocusGuard = clearMathLiveFocusGuard;
window.renderQuickToolbarPreviews = renderQuickToolbarPreviews;

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
window.setupNavigation = setupNavigation;
window.setupMobileNavigation = setupMobileNavigation;
window.getUrlParam = getUrlParam;
window.getHashParam = getHashParam;
window.extractGoogleDriveId = extractGoogleDriveId;
window.renderAttachmentTags = renderAttachmentTags;
window.addAttachmentTagFromInput = addAttachmentTagFromInput;
window.removeAttachmentTag = removeAttachmentTag;
window.renderAttachmentList = renderAttachmentList;
window.getPendingLinks = getPendingLinks;
window.resetPendingLinks = resetPendingLinks;
window.renderAttachmentsHTML = renderAttachmentsHTML;
window.updateLatexOutput = updateLatexOutput;
window.setupMathLiveKeyboardState = setupMathLiveKeyboardState;