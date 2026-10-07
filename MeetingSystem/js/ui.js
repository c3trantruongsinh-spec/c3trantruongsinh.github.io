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
    
    const el = document.querySelector(selector);
    if (!el) {
        console.warn('Không tìm thấy element Quill:', selector);
        return null;
    }
    
    const quill = new Quill(selector, {
        theme: 'snow',
        placeholder: placeholder || 'Nhập nội dung...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    });
    
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

window.isHtmlContent = isHtmlContent;
window.renderRichContent = renderRichContent;
window.initQuillEditor = initQuillEditor;
// Export
window.showWelcomeModal = showWelcomeModal;
window.closeWelcomeModal = closeWelcomeModal;
window.shouldShowWelcomeModal = shouldShowWelcomeModal;
window.markWelcomeAsShown = markWelcomeAsShown;
// Export
window.autoResizeTextarea = autoResizeTextarea;
window.attachAutoResizeToDiscussionInputs = attachAutoResizeToDiscussionInputs;
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