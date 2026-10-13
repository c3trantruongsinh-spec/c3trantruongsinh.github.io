/* ============================================================
   MODULE: ĐĂNG KÝ PHÒNG DÙNG CHUNG
   Yêu cầu:
     - Firebase Realtime Database đã được init
     - window.currentUser có { uid, displayName, role }
       (được set bởi auth.js sau khi đăng nhập)
     - SweetAlert2 đã được load
   ============================================================ */
const BOOKING_RESOURCES = [
    { id: 'udcntt_1', name: 'Phòng CN1', lockCode: '3579' },
    { id: 'udcntt_2', name: 'Phòng CN2', lockCode: '5379' },
    { id: 'udcntt_3', name: 'Phòng Vật Lý', lockCode: '7953' },
    { id: 'udcntt_4', name: 'Phòng Sinh', lockCode: '7935' },
    { id: 'udcntt_5', name: 'Phòng HT', lockCode: '2314' }
];

const BOOKING_PERIODS = [
    { key: 'sang_1', label: 'Tiết 1', session: 'Sáng' },
    { key: 'sang_2', label: 'Tiết 2', session: 'Sáng' },
    { key: 'sang_3', label: 'Tiết 3', session: 'Sáng' },
    { key: 'sang_4', label: 'Tiết 4', session: 'Sáng' },
    { key: 'sang_5', label: 'Tiết 5', session: 'Sáng' },
    { key: 'chieu_1', label: 'Tiết 1', session: 'Chiều' },
    { key: 'chieu_2', label: 'Tiết 2', session: 'Chiều' },
    { key: 'chieu_3', label: 'Tiết 3', session: 'Chiều' },
    { key: 'chieu_4', label: 'Tiết 4', session: 'Chiều' },
    { key: 'chieu_5', label: 'Tiết 5', session: 'Chiều' }
];

const BOOKING_PURPOSES = [
    'Dạy học',
    'Dạy học có UDCNTT',
    'Họp tổ chuyên môn',
    'Bồi dưỡng HSG',
    'Phụ đạo HS yếu',
    'Sinh hoạt CLB',
    'Khác'
];

// ============================================================
// STATE NỘI BỘ
// ============================================================
const bookingState = {
    activeResourceId: BOOKING_RESOURCES[0].id,
    weekDates: [],
    currentBookings: {},
    unsubscribeListener: null,
    cachedStats: null,
    cachedStatsTime: 0
};

// ============================================================
// HÀM TIỆN ÍCH
// ============================================================
function getCurrentUserSafe() {
    if (window.currentUser && window.currentUser.uid) {
        return window.currentUser;
    }

    try {
        if (typeof auth !== 'undefined' && auth && auth.currentUser) {
            const fbUser = auth.currentUser;
            return {
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || fbUser.email || 'Giáo viên',
                role: 'giao_vien',
                teamId: null,
                photoURL: fbUser.photoURL || ''
            };
        }
    } catch (e) {
        console.warn('Không đọc được auth.currentUser:', e);
    }

    if (typeof currentUser !== 'undefined' && currentUser) {
        return currentUser;
    }

    return null;
}

/**
 * Kiểm tra user hiện tại có phải cấp quản lý không.
 * Cấp quản lý = admin, tổ trưởng, tổ phó, nhóm trưởng.
 * (KHÔNG bao gồm thư ký và giáo viên)
 * @returns {boolean}
 */
function isBookingManager() {
    const u = getCurrentUserSafe();
    if (!u || !u.role) return false;
    return u.role === 'admin'
        || u.role === 'truong_to'
        || u.role === 'to_pho'
        || u.role === 'nhom_truong';
}

function getMondayOfWeek(date) {
    const d = new Date(date || new Date());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function formatDateVN(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return d + '/' + m;
}

function getWeekDates() {
    const monday = getMondayOfWeek(new Date());
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const result = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        result.push({
            dateKey: formatDateKey(d),
            dateVN: formatDateVN(d),
            dayOfWeek: days[i],
            dateObj: d
        });
    }
    return result;
}

/**
 * Lấy khoảng thời gian đầu/cuối của tháng hiện tại (timestamp ms).
 * @returns {{ start: number, end: number, label: string }}
 */
function getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const label = String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
    return { start: start, end: end, label: label };
}

function escapeBookingHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * Lấy lockCode cố định của phòng theo resourceId.
 * @param {string} resourceId
 * @returns {string}
 */
function getRoomLockCode(resourceId) {
    const resource = BOOKING_RESOURCES.find(function(r) { return r.id === resourceId; });
    return resource ? resource.lockCode : '----';
}

// ============================================================
// THỐNG KÊ LƯỢT ĐẶT PHÒNG
// ============================================================

/**
 * Đếm lượt đặt phòng trong tháng hiện tại.
 * Đọc toàn bộ node `bookings` 1 lần, filter client-side theo timestamp.
 *
 * @param {string|null} targetUid - Nếu có, đếm riêng cho user này.
 *                                  Nếu null, chỉ đếm tổng.
 * @returns {Promise<{
 *   userCount: number,
 *   totalCount: number,
 *   perResource: Object,
 *   perUser: Object,
 *   monthLabel: string
 * }>}
 */
async function getBookingStats(targetUid) {
    const range = getCurrentMonthRange();
    const result = {
        userCount: 0,
        totalCount: 0,
        perResource: {},
        perUser: {},
        monthLabel: range.label
    };

    BOOKING_RESOURCES.forEach(function(r) {
        result.perResource[r.id] = 0;
    });

    try {
        const snapshot = await firebase.database().ref('bookings').once('value');
        const allBookings = snapshot.val() || {};

        BOOKING_RESOURCES.forEach(function(r) {
            const byDate = allBookings[r.id] || {};
            Object.keys(byDate).forEach(function(dateKey) {
                const byPeriod = byDate[dateKey] || {};
                Object.keys(byPeriod).forEach(function(periodKey) {
                    const b = byPeriod[periodKey];
                    if (!b || typeof b !== 'object') return;
                    if (!b.timestamp) return;
                    if (b.timestamp < range.start || b.timestamp > range.end) return;

                    result.totalCount++;
                    result.perResource[r.id]++;

                    if (b.uid) {
                        result.perUser[b.uid] = (result.perUser[b.uid] || 0) + 1;
                    }

                    if (targetUid && b.uid === targetUid) {
                        result.userCount++;
                    }
                });
            });
        });

        return result;

    } catch (error) {
        console.error('Lỗi đếm lượt đặt phòng:', error);
        return result;
    }
}

/**
 * Tạo HTML hiển thị khối thống kê cho popup.
 *
 * @param {Object} stats - Kết quả từ getBookingStats()
 * @param {boolean} includeManagerView - Nếu true, hiện thêm tổng quan toàn trường
 * @param {string} targetName - Tên người đặt (để hiển thị "Thầy/Cô X đã đặt...")
 * @returns {string} HTML
 */
function buildBookingStatsHtml(stats, includeManagerView, targetName) {
    if (!stats) return '';

    let html = '<div style="margin-top:16px;padding-top:14px;border-top:1px dashed #cbd5e1;text-align:left;">';
    html += '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:8px;">';
    html += '<i class="fas fa-chart-bar"></i> Thống kê tháng ' + escapeBookingHtml(stats.monthLabel);
    html += '</div>';

    if (targetName) {
        html += '<div style="font-size:14px;color:#1e293b;margin-bottom:6px;">';
        html += '👤 <b>' + escapeBookingHtml(targetName) + '</b> đã đặt ';
        html += '<b style="color:#1e40af;font-size:16px;">' + stats.userCount + '</b> lượt trong tháng này.';
        html += '</div>';
    }

    if (includeManagerView) {
        html += '<div style="margin-top:10px;padding:10px 12px;background:#eff6ff;border-radius:8px;font-size:13px;line-height:1.7;">';
        html += '<div style="font-weight:700;color:#1e3a8a;margin-bottom:6px;">📊 Tổng quan toàn trường</div>';
        html += '<div>Tổng lượt đặt: <b style="color:#dc2626;font-size:15px;">' + stats.totalCount + '</b> lượt</div>';

        const resourceLines = BOOKING_RESOURCES
            .map(function(r) {
                const count = stats.perResource[r.id] || 0;
                return '<span style="display:inline-block;background:#ffffff;border:1px solid #bfdbfe;padding:2px 8px;border-radius:12px;font-size:12px;margin:2px 4px 2px 0;">' +
                       escapeBookingHtml(r.name.replace('Phòng dạy có ', '')) +
                       ': <b>' + count + '</b></span>';
            })
            .join('');
        html += '<div style="margin-top:6px;">' + resourceLines + '</div>';
        html += '</div>';
    }

    html += '</div>';
    return html;
}

// ============================================================
// CẬP NHẬT SỐ LƯỢT MƯỢN CÔNG KHAI TRÊN Ô LỊCH
// ============================================================

/**
 * Cập nhật nội dung badge `.cell-booking-count` trên các ô lịch đã đặt.
 * Dữ liệu lấy từ cache (TTL 30 giây) hoặc query Firebase khi hết hạn.
 *
 * @param {boolean} forceRefresh - Nếu true, bỏ qua cache, query Firebase ngay.
 * @returns {Promise<void>}
 */
async function updateBookingCountsOnUI(forceRefresh) {
    const badges = document.querySelectorAll('.cell-booking-count');
    if (badges.length === 0) return;

    const now = Date.now();
    const CACHE_TTL = 30 * 1000;

    const needRefresh = forceRefresh
        || !bookingState.cachedStats
        || (now - bookingState.cachedStatsTime) > CACHE_TTL;

    if (needRefresh) {
        try {
            bookingState.cachedStats = await getBookingStats(null);
            bookingState.cachedStatsTime = Date.now();
            console.log('📊 Đã cập nhật cache thống kê lượt đặt phòng');
        } catch (e) {
            console.warn('Không tải được thống kê để fill badge:', e);
            return;
        }
    }

    const stats = bookingState.cachedStats;
    if (!stats) return;

    badges.forEach(function(badge) {
        const uid = badge.dataset.uid;
        if (!uid) {
            badge.textContent = '';
            return;
        }
        const count = stats.perUser[uid] || 0;
        badge.textContent = 'Đã đặt: ' + count + ' lượt';
    });
}

// ============================================================
// RENDER GIAO DIỆN
// ============================================================
function renderBookingTabs() {
    const container = document.getElementById('bookingTabs');
    if (!container) return;
    container.innerHTML = BOOKING_RESOURCES.map(function(r, idx) {
        const activeClass = idx === 0 ? ' active' : '';
        return '<button class="booking-tab' + activeClass + '" data-resource-id="' + r.id + '">' +
               '<i class="fas fa-door-open"></i> ' + escapeBookingHtml(r.name) +
               '</button>';
    }).join('');
}

function renderBookingTableHeader() {
    const thead = document.getElementById('bookingThead');
    if (!thead) return;

    const dates = bookingState.weekDates;
    let html = '<tr>';
    html += '<th class="col-session">Buổi</th>';
    html += '<th class="col-period">Tiết</th>';
    dates.forEach(function(d) {
        html += '<th class="col-day">' +
                '<span class="day-name">' + escapeBookingHtml(d.dayOfWeek) + '</span>' +
                '<span class="day-date">' + escapeBookingHtml(d.dateVN) + '</span>' +
                '</th>';
    });
    html += '</tr>';
    thead.innerHTML = html;
}

/**
 * Build HTML cho 1 ô lịch.
 * @param {Object|null} booking - Dữ liệu booking (null nếu trống)
 * @returns {{ className: string, content: string, title: string }}
 */
function buildCellHtml(booking) {
    const currentUserSafe = getCurrentUserSafe();

    if (!booking) {
        return {
            className: 'cell-empty',
            content: '<span class="cell-placeholder">[ + ] Trống</span>',
            title: 'Trống — Bấm để đăng ký'
        };
    }

    const isMine = currentUserSafe && booking.uid === currentUserSafe.uid;

    // Badge số lượt — sẽ được fill sau bởi updateBookingCountsOnUI()
    const countBadge = '<span class="cell-booking-count" data-uid="' +
        escapeBookingHtml(booking.uid || '') + '">...</span>';

    if (isMine) {
        return {
            className: 'cell-booked-mine',
            content:
                '<span class="cell-line"><i class="fas fa-chalkboard-user"></i> ' +
                escapeBookingHtml(booking.class || '') + '</span>' +
                '<span class="cell-line cell-purpose">' +
                escapeBookingHtml(booking.purpose || '') + '</span>' +
                '<span class="cell-line cell-name">' +
                escapeBookingHtml(booking.name || '') + '</span>' +
                countBadge,
            title: 'Bạn đã đặt cho lớp ' + (booking.class || '')
        };
    }

    return {
        className: 'cell-booked-others',
        content:
            '<span class="cell-line"><i class="fas fa-user"></i> ' +
            escapeBookingHtml(booking.name || 'Giáo viên') + '</span>' +
            '<span class="cell-line cell-class">Lớp ' +
            escapeBookingHtml(booking.class || '') + '</span>' +
            countBadge,
        title: (booking.name || '') + ' — Lớp ' + (booking.class || '')
    };
}

function renderBookingTableBody() {
    const tbody = document.getElementById('bookingTbody');
    if (!tbody) return;

    const dates = bookingState.weekDates;
    const bookings = bookingState.currentBookings;
    const rows = [];

    const sessions = [
        { name: 'Sáng', periods: BOOKING_PERIODS.filter(function(p) { return p.session === 'Sáng'; }) },
        { name: 'Chiều', periods: BOOKING_PERIODS.filter(function(p) { return p.session === 'Chiều'; }) }
    ];

    sessions.forEach(function(session) {
        session.periods.forEach(function(period, pIdx) {
            const isLastMorning = (session.name === 'Sáng' && pIdx === session.periods.length - 1);
            const rowClass = isLastMorning ? ' class="last-morning-row"' : '';
            let row = '<tr' + rowClass + '>';

            if (pIdx === 0) {
                const sessionClass = 'session-' + session.name.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                row += '<td class="col-session ' + sessionClass + '" rowspan="' + session.periods.length + '">' +
                       '<span class="session-label">' + escapeBookingHtml(session.name) + '</span>' +
                       '</td>';
            }

            row += '<td class="col-period">' + escapeBookingHtml(period.label) + '</td>';

            dates.forEach(function(d) {
                const dateBookings = bookings[d.dateKey] || {};
                const booking = dateBookings[period.key];
                const cellInfo = buildCellHtml(booking);

                row += '<td class="booking-cell ' + cellInfo.className + '"' +
                       ' data-resource-id="' + escapeBookingHtml(bookingState.activeResourceId) + '"' +
                       ' data-date="' + escapeBookingHtml(d.dateKey) + '"' +
                       ' data-period="' + escapeBookingHtml(period.key) + '"' +
                       ' title="' + escapeBookingHtml(cellInfo.title) + '">' +
                       cellInfo.content +
                       '</td>';
            });

            row += '</tr>';
            rows.push(row);
        });
    });

    tbody.innerHTML = rows.join('');

    // Fill số lượt vào badge (dùng cache)
    updateBookingCountsOnUI(false);
}

// ============================================================
// FIREBASE — LOAD DỮ LIỆU
// ============================================================
function loadRoomBookings(resourceId) {
    if (bookingState.unsubscribeListener) {
        bookingState.unsubscribeListener();
        bookingState.unsubscribeListener = null;
    }

    const dateKeys = bookingState.weekDates.map(function(d) { return d.dateKey; });
    const ref = firebase.database().ref('bookings/' + resourceId);

    const callback = function(snapshot) {
        const allData = snapshot.val() || {};
        const weekData = {};
        dateKeys.forEach(function(dk) {
            if (allData[dk]) weekData[dk] = allData[dk];
        });
        bookingState.currentBookings = weekData;
        renderBookingTableBody();
    };

    const errorCallback = function(error) {
        console.error('Lỗi load bookings:', error);
        if (typeof showToast === 'function') {
            showToast('Không tải được lịch đăng ký phòng', 'error');
        }
    };

    ref.on('value', callback, errorCallback);

    bookingState.unsubscribeListener = function() {
        ref.off('value', callback);
    };
}

// ============================================================
// XỬ LÝ CLICK Ô LỊCH
// ============================================================
function handleBookingCellClick(event) {
    const cell = event.target.closest('.booking-cell');
    if (!cell) return;

    const resourceId = cell.dataset.resourceId;
    const dateKey = cell.dataset.date;
    const periodKey = cell.dataset.period;

    const dateBookings = bookingState.currentBookings[dateKey] || {};
    const booking = dateBookings[periodKey];
    const currentUserSafe = getCurrentUserSafe();

    if (!booking) {
        openBookingDialog(resourceId, dateKey, periodKey);
        return;
    }

    if (currentUserSafe && booking.uid === currentUserSafe.uid) {
        showMyBookingInfo(resourceId, dateKey, periodKey, booking);
        return;
    }

    showOthersBookingInfo(resourceId, dateKey, periodKey, booking);
}

// ============================================================
// POPUP: ĐĂNG KÝ PHÒNG TRỐNG
// ============================================================
async function openBookingDialog(resourceId, dateKey, periodKey) {
    const period = BOOKING_PERIODS.find(function(p) { return p.key === periodKey; });
    const dateInfo = bookingState.weekDates.find(function(d) { return d.dateKey === dateKey; });
    const resource = BOOKING_RESOURCES.find(function(r) { return r.id === resourceId; });
    const currentUserSafe = getCurrentUserSafe();

    if (!currentUserSafe) {
        Swal.fire({
            icon: 'warning',
            title: 'Chưa đăng nhập',
            text: 'Vui lòng đăng nhập lại để đăng ký phòng.',
            confirmButtonColor: '#1e3a8a'
        });
        return;
    }

    const purposeOptionsHtml = BOOKING_PURPOSES.map(function(p) {
        return '<option value="' + escapeBookingHtml(p) + '">' + escapeBookingHtml(p) + '</option>';
    }).join('');

    const fixedLockCode = resource ? resource.lockCode : '----';

    const result = await Swal.fire({
        title: 'Đăng ký phòng',
        html:
            '<div style="text-align:left;font-size:14px;line-height:1.7;">' +
            '<p style="margin:0 0 4px 0;"><b>Phòng:</b> ' + escapeBookingHtml(resource ? resource.name : resourceId) + '</p>' +
            '<p style="margin:0 0 4px 0;"><b>Ngày:</b> ' + escapeBookingHtml(dateInfo ? dateInfo.dayOfWeek + ' (' + dateInfo.dateVN + ')' : dateKey) + '</p>' +
            '<p style="margin:0 0 8px 0;"><b>Tiết:</b> ' + escapeBookingHtml((period ? period.session : '') + ' — ' + (period ? period.label : periodKey)) + '</p>' +
            '<div style="margin:0 0 14px 0;padding:8px 12px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e;border-left:3px solid #d97706;">' +
            '🔑 <b>Mã khóa phòng:</b> <span style="font-family:monospace;font-size:16px;font-weight:800;letter-spacing:3px;">' + escapeBookingHtml(fixedLockCode) + '</span>' +
            '<div style="font-size:12px;margin-top:2px;opacity:0.85;">Dùng mã này để mở cửa phòng.</div>' +
            '</div>' +
            '<label style="display:block;margin-bottom:6px;font-weight:600;">Lớp <span style="color:#dc2626;">*</span></label>' +
            '<input id="swal-booking-class" class="swal2-input" placeholder="VD: 10A1" style="margin:0 0 14px 0;width:100%;height:42px;font-size:14px;">' +
            '<label style="display:block;margin-bottom:6px;font-weight:600;">Mục đích <span style="color:#dc2626;">*</span></label>' +
            '<select id="swal-booking-purpose" class="swal2-select" style="margin:0;width:100%;height:42px;font-size:14px;padding:0 10px;">' +
            purposeOptionsHtml +
            '</select>' +
            '</div>',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-check"></i> Đăng ký',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#1e3a8a',
        cancelButtonColor: '#94a3b8',
        focusConfirm: false,
        preConfirm: function() {
            const classInput = document.getElementById('swal-booking-class');
            const purposeSelect = document.getElementById('swal-booking-purpose');
            const className = classInput ? classInput.value.trim() : '';
            const purpose = purposeSelect ? purposeSelect.value : '';

            if (!className) {
                Swal.showValidationMessage('Vui lòng nhập tên lớp');
                return false;
            }
            return { className: className, purpose: purpose };
        }
    });

    if (!result.isConfirmed || !result.value) return;

    const bookingData = {
        uid: currentUserSafe.uid,
        name: currentUserSafe.displayName || 'Giáo viên',
        class: result.value.className,
        purpose: result.value.purpose,
        timestamp: Date.now()
    };

    try {
        await firebase.database()
            .ref('bookings/' + resourceId + '/' + dateKey + '/' + periodKey)
            .set(bookingData);

        // Reset cache thống kê vì có thay đổi
        bookingState.cachedStats = null;
        bookingState.cachedStatsTime = 0;

        await Swal.fire({
            icon: 'success',
            title: 'Đăng ký thành công!',
            html:
                '<p style="margin:0 0 14px 0;">Phòng đã được đặt cho lớp <b>' + escapeBookingHtml(result.value.className) + '</b>.</p>' +
                '<p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">Mã khóa phòng của bạn:</p>' +
                '<div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#1e3a8a;background:#dbeafe;padding:14px;border-radius:10px;font-family:monospace;text-align:center;">' +
                escapeBookingHtml(fixedLockCode) +
                '</div>' +
                '<p style="margin:14px 0 0 0;font-size:13px;color:#64748b;">Vui lòng ghi nhớ mã này để mở cửa phòng.</p>',
            confirmButtonText: 'Đã hiểu',
            confirmButtonColor: '#1e3a8a'
        });

        // Cập nhật badge số lượt (force để lấy số mới)
        updateBookingCountsOnUI(true);

    } catch (error) {
        console.error('Lỗi đăng ký phòng:', error);
        Swal.fire({
            icon: 'error',
            title: 'Lỗi đăng ký',
            text: error.message || 'Không thể lưu đăng ký. Vui lòng thử lại.',
            confirmButtonColor: '#1e3a8a'
        });
    }
}

// ============================================================
// POPUP: ĐĂNG KÝ CỦA CHÍNH TÔI
// ============================================================
async function showMyBookingInfo(resourceId, dateKey, periodKey, booking) {
    const period = BOOKING_PERIODS.find(function(p) { return p.key === periodKey; });
    const dateInfo = bookingState.weekDates.find(function(d) { return d.dateKey === dateKey; });
    const resource = BOOKING_RESOURCES.find(function(r) { return r.id === resourceId; });
    const currentUserSafe = getCurrentUserSafe();

    const fixedLockCode = getRoomLockCode(resourceId);

    Swal.fire({
        title: 'Đang tải thông tin...',
        allowOutsideClick: false,
        didOpen: function() {
            Swal.showLoading();
        }
    });

    let stats = null;
    try {
        stats = await getBookingStats(currentUserSafe ? currentUserSafe.uid : null);
    } catch (e) {
        console.warn('Không tải được thống kê:', e);
    }

    const includeManager = isBookingManager();
    const statsHtml = stats
        ? buildBookingStatsHtml(stats, includeManager, currentUserSafe ? currentUserSafe.displayName : 'Bạn')
        : '';

    const result = await Swal.fire({
        title: 'Đăng ký của bạn',
        html:
            '<div style="text-align:left;font-size:14px;line-height:1.85;">' +
            '<p style="margin:0 0 4px 0;"><b>Phòng:</b> ' + escapeBookingHtml(resource ? resource.name : resourceId) + '</p>' +
            '<p style="margin:0 0 4px 0;"><b>Ngày:</b> ' + escapeBookingHtml(dateInfo ? dateInfo.dayOfWeek + ' (' + dateInfo.dateVN + ')' : dateKey) + '</p>' +
            '<p style="margin:0 0 4px 0;"><b>Tiết:</b> ' + escapeBookingHtml((period ? period.session : '') + ' — ' + (period ? period.label : periodKey)) + '</p>' +
            '<p style="margin:0 0 4px 0;"><b>Lớp:</b> ' + escapeBookingHtml(booking.class || '') + '</p>' +
            '<p style="margin:0 0 14px 0;"><b>Mục đích:</b> ' + escapeBookingHtml(booking.purpose || '') + '</p>' +
            '<div style="font-size:13px;color:#64748b;margin-bottom:6px;">Mã khóa phòng:</div>' +
            '<div style="font-size:30px;font-weight:800;letter-spacing:6px;color:#1e3a8a;background:#dbeafe;padding:12px;border-radius:10px;text-align:center;font-family:monospace;">' +
            escapeBookingHtml(fixedLockCode) +
            '</div>' +
            statsHtml +
            '</div>',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-trash"></i> Hủy đăng ký',
        denyButtonText: '<i class="fas fa-times"></i> Đóng',
        cancelButtonText: '',
        confirmButtonColor: '#dc2626',
        denyButtonColor: '#94a3b8',
        showCancelButton: false
    });

    if (!result.isConfirmed) return;

    const confirmCancel = await Swal.fire({
        icon: 'warning',
        title: 'Xác nhận hủy đăng ký?',
        html: 'Bạn có chắc chắn muốn hủy đăng ký phòng này?<br><span style="font-size:13px;color:#64748b;">Hành động này không thể hoàn tác.</span>',
        showCancelButton: true,
        confirmButtonText: 'Hủy đăng ký',
        cancelButtonText: 'Không',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#94a3b8'
    });

    if (!confirmCancel.isConfirmed) return;

    try {
        await firebase.database()
            .ref('bookings/' + resourceId + '/' + dateKey + '/' + periodKey)
            .remove();

        // Reset cache thống kê
        bookingState.cachedStats = null;
        bookingState.cachedStatsTime = 0;

        Swal.fire({
            icon: 'success',
            title: 'Đã hủy đăng ký',
            timer: 1800,
            showConfirmButton: false
        });

        // Refresh badge
        setTimeout(function() {
            updateBookingCountsOnUI(true);
        }, 300);

    } catch (error) {
        console.error('Lỗi hủy đăng ký:', error);
        Swal.fire({
            icon: 'error',
            title: 'Lỗi',
            text: error.message || 'Không thể hủy đăng ký. Vui lòng thử lại.',
            confirmButtonColor: '#1e3a8a'
        });
    }
}

// ============================================================
// POPUP: ĐĂNG KÝ CỦA NGƯỜI KHÁC
// ============================================================
async function showOthersBookingInfo(resourceId, dateKey, periodKey, booking) {
    const period = BOOKING_PERIODS.find(function(p) { return p.key === periodKey; });
    const dateInfo = bookingState.weekDates.find(function(d) { return d.dateKey === dateKey; });
    const resource = BOOKING_RESOURCES.find(function(r) { return r.id === resourceId; });

    Swal.fire({
        title: 'Đang tải thông tin...',
        allowOutsideClick: false,
        didOpen: function() {
            Swal.showLoading();
        }
    });

    let stats = null;
    try {
        stats = await getBookingStats(booking.uid || null);
    } catch (e) {
        console.warn('Không tải được thống kê:', e);
    }

    const includeManager = isBookingManager();
    const statsHtml = stats
        ? buildBookingStatsHtml(stats, includeManager, booking.name || 'Giáo viên')
        : '';

    await Swal.fire({
        icon: 'info',
        title: 'Tiết đã có người đăng ký',
        html:
            '<div style="text-align:left;font-size:14px;line-height:1.85;">' +
            '<p style="margin:0 0 4px 0;"><b>Phòng:</b> ' + escapeBookingHtml(resource ? resource.name : resourceId) + '</p>' +
            '<p style="margin:0 0 4px 0;"><b>Ngày:</b> ' + escapeBookingHtml(dateInfo ? dateInfo.dayOfWeek + ' (' + dateInfo.dateVN + ')' : dateKey) + '</p>' +
            '<p style="margin:0 0 4px 0;"><b>Tiết:</b> ' + escapeBookingHtml((period ? period.session : '') + ' — ' + (period ? period.label : periodKey)) + '</p>' +
            '<p style="margin:0 0 4px 0;"><b>Giáo viên:</b> ' + escapeBookingHtml(booking.name || '') + '</p>' +
            '<p style="margin:0 0 4px 0;"><b>Lớp:</b> ' + escapeBookingHtml(booking.class || '') + '</p>' +
            '<p style="margin:0 0 14px 0;"><b>Mục đích:</b> ' + escapeBookingHtml(booking.purpose || '') + '</p>' +
            statsHtml +
            '<p style="margin:14px 0 0 0;color:#64748b;font-size:13px;font-style:italic;padding-top:12px;border-top:1px solid #e2e8f0;">' +
            'Vui lòng liên hệ giáo viên trên để xin nhường phòng.' +
            '</p>' +
            '</div>',
        confirmButtonText: 'Đã hiểu',
        confirmButtonColor: '#1e3a8a',
        width: 520
    });
}

// ============================================================
// KHỞI TẠO MODULE
// ============================================================
function initBookingModule() {
    bookingState.weekDates = getWeekDates();
    bookingState.activeResourceId = BOOKING_RESOURCES[0].id;
    bookingState.cachedStats = null;
    bookingState.cachedStatsTime = 0;

    renderBookingTabs();
    renderBookingTableHeader();
    loadRoomBookings(bookingState.activeResourceId);

    const tabsEl = document.getElementById('bookingTabs');
    if (tabsEl) {
        tabsEl.addEventListener('click', function(e) {
            const tab = e.target.closest('.booking-tab');
            if (!tab) return;

            const allTabs = tabsEl.querySelectorAll('.booking-tab');
            allTabs.forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');

            bookingState.activeResourceId = tab.dataset.resourceId;
            bookingState.currentBookings = {};
            renderBookingTableBody();
            loadRoomBookings(bookingState.activeResourceId);
        });
    }

    const tbodyEl = document.getElementById('bookingTbody');
    if (tbodyEl) {
        tbodyEl.addEventListener('click', handleBookingCellClick);
    }

    console.log('✅ Booking module đã sẵn sàng');
}

window.initBookingModule = initBookingModule;
window.loadRoomBookings = loadRoomBookings;
window.getBookingStats = getBookingStats;
window.getRoomLockCode = getRoomLockCode;
window.updateBookingCountsOnUI = updateBookingCountsOnUI;