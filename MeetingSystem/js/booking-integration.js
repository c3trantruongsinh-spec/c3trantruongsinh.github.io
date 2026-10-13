/* ============================================================
   BOOKING INTEGRATION — Chuyển tab cho module Đăng ký phòng
   Tích hợp với SPA của ui.js mà không cần sửa ui.js.
   ============================================================ */

(function() {
    'use strict';

    let bookingInitialized = false;

    /* --------------------------------------------------------
       Hiển thị section đăng ký phòng
       -------------------------------------------------------- */
    function showBooking() {
        // 1. Ẩn pageContainer (chứa dashboard, meetings...)
        const pageContainer = document.getElementById('pageContainer');
        if (pageContainer) {
            pageContainer.style.display = 'none';
        }

        // 2. Ẩn tất cả .content-section khác (ngoài pageContainer)
        document.querySelectorAll('.content-section').forEach(function(sec) {
            if (sec.id !== 'booking-section') {
                sec.style.display = 'none';
            }
        });

        // 3. Hiện booking section
        const bookingSection = document.getElementById('booking-section');
        if (!bookingSection) {
            console.error('❌ Không tìm thấy #booking-section trong DOM');
            return;
        }
        bookingSection.style.display = 'block';

        // 4. Cập nhật active class cho nav (cả sidebar + mobile)
        document.querySelectorAll('.nav-item[data-page], .mobile-nav-item[data-page]').forEach(function(item) {
            item.classList.toggle('active', item.dataset.page === 'booking');
        });

        // 5. Cập nhật tiêu đề trang
        if (typeof window.setPageTitle === 'function') {
            try {
                window.setPageTitle('Lịch phòng UDCNTT');
            } catch (e) {
                console.warn('Không set được page title:', e);
            }
        }

        // 6. Khởi tạo module lần đầu (chỉ chạy 1 lần)
        if (!bookingInitialized) {
            if (typeof window.initBookingModule === 'function') {
                try {
                    window.initBookingModule();
                    bookingInitialized = true;
                    console.log('✅ Booking module đã khởi tạo lần đầu');
                } catch (e) {
                    console.error('❌ Lỗi khởi tạo booking module:', e);
                }
            } else {
                console.warn('⚠️ window.initBookingModule chưa có. Kiểm tra booking.js đã load chưa.');
            }
        }

        // 7. Cuộn lên đầu
        try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            window.scrollTo(0, 0);
        }
    }

    /* --------------------------------------------------------
       Ẩn booking section khi user chuyển tab khác
       -------------------------------------------------------- */
    function hideBooking() {
        const bookingSection = document.getElementById('booking-section');
        if (bookingSection) {
            bookingSection.style.display = 'none';
        }

        const pageContainer = document.getElementById('pageContainer');
        if (pageContainer) {
            pageContainer.style.display = '';
        }
    }

    /* --------------------------------------------------------
       Gắn sự kiện — dùng CAPTURE PHASE để chạy TRƯỚC ui.js
       -------------------------------------------------------- */
    function initIntegration() {
        document.addEventListener('click', function(e) {

            // ===== TRƯỜNG HỢP 1: Bấm nút "Phòng" =====
            const bookingNav = e.target.closest('[data-page="booking"]');
            if (bookingNav) {
                // Chặn hoàn toàn — không cho ui.js xử lý
                // (ui.js không có case 'booking' → sẽ báo "Trang không tồn tại")
                e.preventDefault();
                e.stopPropagation();

                showBooking();

                // Đóng sidebar trên mobile sau khi bấm
                if (window.innerWidth <= 1024) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) sidebar.classList.remove('open');
                }
                return;
            }

            // ===== TRƯỜNG HỢP 2: Bấm nút khác (dashboard, meetings...) =====
            const otherNav = e.target.closest('.nav-item[data-page], .mobile-nav-item[data-page]');
            if (otherNav && otherNav.dataset.page !== 'booking') {
                // Chỉ ẩn booking section, KHÔNG chặn sự kiện
                // → để ui.js tiếp tục xử lý chuyển tab bình thường
                hideBooking();
            }
        }, true); // ← true = capture phase

        console.log('✅ Booking integration đã gắn sự kiện chuyển tab');
    }

    /* --------------------------------------------------------
       Khởi động
       -------------------------------------------------------- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIntegration);
    } else {
        initIntegration();
    }

    // Expose để debug nếu cần
    window.bookingIntegration = {
        show: showBooking,
        hide: hideBooking
    };

})();