# 🏫 Hệ thống Quản lý Sinh hoạt Tổ chuyên môn

> **Professional Team Meeting Management System** — Giải pháp số hóa toàn diện cho hoạt động sinh hoạt tổ chuyên môn tại trường THCS/THPT Việt Nam.

Hệ thống được thiết kế theo triết lý **"01 Cuộc họp = 01 Hồ sơ điện tử"**: toàn bộ quá trình từ khâu chuẩn bị, công bố nội dung, nghiên cứu tài liệu, góp ý, kết luận, phân công nhiệm vụ đến xác nhận và chốt hồ sơ đều được lưu vết xuyên suốt — không cần thư ký ngồi đánh lại biên bản sau cuộc họp.

Đặc biệt phù hợp với bối cảnh sau sáp nhập trường: giáo viên ở xa, cần sinh hoạt định kỳ nhưng không thể di chuyển thường xuyên; các môn Toán, Lý, Hóa, Sinh cần gửi kèm hình ảnh công thức, sơ đồ, bài làm, PDF tài liệu.

---

## 🏷️ Tech Stack & Badges

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript_ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Firebase Auth](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Realtime DB](https://img.shields.io/badge/Realtime_Database-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Firebase Storage](https://img.shields.io/badge/Firebase_Storage-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=github&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)

**Thư viện bổ trợ:**
![html2pdf.js](https://img.shields.io/badge/html2pdf.js-FF6B6B?style=flat-square)
![SheetJS](https://img.shields.io/badge/SheetJS_(xlsx)-1D6F42?style=flat-square)
![Font Awesome](https://img.shields.io/badge/Font_Awesome-528DD7?style=flat-square&logo=fontawesome&logoColor=white)

**Kiến trúc:** Serverless — Vanilla JS thuần túy, không sử dụng framework frontend; Firebase đảm nhiệm toàn bộ backend.

---

## ✨ Tính năng nổi bật

### 🔐 Phân quyền 5 cấp độ (Được bảo vệ bằng Firebase Rules)

Hệ thống sử dụng mô hình RBAC (Role-Based Access Control) chặt chẽ, **kiểm tra quyền ở cả 2 lớp**: giao diện (Frontend) và Firebase Security Rules (Backend) — chống mọi nỗ lực bypass qua DevTools Console.

#### 👑 Admin / Ban Giám hiệu

| Chức năng | Mô tả |
|-----------|-------|
| 🌐 **Quản lý toàn hệ thống** | Xem tất cả tổ chuyên môn, tất cả cuộc họp |
| 👥 **Tạo & quản lý tài khoản** | Cấp tài khoản hàng loạt bằng file Excel (SheetJS) |
| 🎯 **Gán quyền, phân tổ** | Chỉnh sửa role, teamId của mọi user |
| 🗑️ **Xóa vĩnh viễn** | Multi-path update xóa sạch 8 nhánh dữ liệu liên quan đến cuộc họp nháp |
| 📊 **Theo dõi tiến độ** | Dashboard tổng hợp toàn trường |

#### 🎖️ Ban Lãnh đạo Tổ (`truong_to`, `to_pho`, `nhom_truong`)

| Chức năng | Mô tả |
|-----------|-------|
| 📅 **Tạo cuộc họp** | Form đầy đủ: tên, thời gian, hình thức (trực tiếp/trực tuyến/kết hợp/không đồng thời) |
| 🎫 **Mời giáo viên chéo tổ** | Guest Access qua mảng `memberIds` — giáo viên tổ khác vẫn thấy cuộc họp |
| 📌 **Quản lý nội dung** | Thêm/sửa nhiều nội dung, đính kèm tài liệu Google Drive (có trích xuất File ID) |
| ✅ **Kết luận từng nội dung** | Ghi kết luận, chuyển trạng thái `CONCLUDED` |
| 📋 **Phân công nhiệm vụ** | Giao việc cho giáo viên, đặt hạn, mô tả sản phẩm cần nộp |
| 🔄 **Chuyển trạng thái** | DRAFT → DISCUSSION → CONCLUDED → CONFIRMATION → CLOSED (kiểm tra điều kiện nghiêm ngặt) |
| 🔒 **Chốt hồ sơ** | Chốt bình thường HOẶC chốt ngoại lệ (kèm lý do, lưu vết `forceCloseReason`) |
| 🖨️ **Xuất biên bản PDF** | Biên bản chuẩn hành chính: Quốc hiệu, Tiêu ngữ, chữ ký Chủ tọa/Thư ký |
| 📥 **Xuất Excel hàng loạt** | Tạo file mẫu 2 sheet: Nhập liệu + Danh sách mã tổ (truy vấn realtime từ Firebase) |

#### 📝 Thư ký (`thu_ky`)

| Chức năng | Mô tả |
|-----------|-------|
| ✍️ **Hỗ trợ soạn thảo** | Thêm/sửa nội dung cuộc họp, tải tài liệu lên |
| 📎 **Quản lý biên bản** | Hỗ trợ tổ trưởng hoàn thiện hồ sơ |
| ⚠️ **Giới hạn quyền** | Không được tự ý chốt hồ sơ nếu chưa được phân quyền |

#### 👨‍🏫 Giáo viên (`giao_vien`)

| Chức năng | Mô tả |
|-----------|-------|
| 📖 **Xem cuộc họp thuộc tổ** | Và cả cuộc họp được mời với vai trò khách (badge 🎫 "Khách mời") |
| 📄 **Đọc tài liệu đính kèm** | Click mở Google Drive Preview trực tiếp |
| 💬 **Thảo luận real-time** | Gửi ý kiến, phản hồi, kèm link Google Drive |
| 🔗 **Đính kèm minh bạch** | Trích xuất File ID tự động (Regex), khóa ID khi đã lưu — chống gian lận đổi file |
| 🖼️ **Hỗ trợ đa phương tiện** | Hình ảnh công thức, sơ đồ, bài làm, PDF, DOCX, XLSX |
| 📌 **Xác nhận tham gia** | Quy trình 4 bước: Tiếp cận → Tham gia → Đọc kết luận → Xác nhận hồ sơ |
| 📋 **Nhận nhiệm vụ** | Nút "Tôi đã tiếp nhận nhiệm vụ" — lưu vĩnh viễn Confirmation Record |
| 🚫 **Giới hạn quyền** | Không xóa ý kiến người khác, không sửa kết luận, không chỉnh hồ sơ đã chốt |

---

### 🎯 Tính năng kỹ thuật nổi bật

- **📌 Luồng nghiệp vụ chuẩn:** `DRAFT → DISCUSSION → CONCLUDED → CONFIRMATION → CLOSED` với kiểm tra điều kiện trước mỗi lần chuyển trạng thái.
- **🖼️ Lightbox/Modal xem ảnh & PDF** ngay trong luồng thảo luận, không cần tải về.
- **📝 Version Control cho ý kiến:** Sửa ý kiến tạo `Version 1 → Version 2` thay vì overwrite; lưu `previousContent`, `newContent`, `updatedAt`.
- **📜 Activity Log bất biến:** Mọi hành động quan trọng tạo log — không thể xóa, không thể sửa sau khi cuộc họp `CLOSED`.
- **🔐 Multi-path update:** Xóa cuộc họp bằng 1 request duy nhất, đảm bảo tính nguyên tử (atomicity).
- **📊 Real-time cập nhật:** Firebase Realtime Database đẩy thay đổi tức thời đến mọi client.
- **📱 Responsive 100%:** CSS Grid + Flexbox, bottom navigation riêng cho mobile.
- **🎨 UI Hiện đại:** Phong cách "Không gian làm việc chuyên môn số" — màu xanh dương/trắng/xám nhẹ, badge trạng thái có màu riêng biệt.

---

## 📂 Cấu trúc thư mục

```
professional-meeting-system/
│
├── index.html                    # Trang chính (SPA container)
├── login.html                    # Trang đăng nhập
├── meeting-detail.html           # Trang chi tiết cuộc họp
├── tool-cap-tai-khoan.html       # 🛠️ Công cụ nội bộ: tạo user hàng loạt
│
├── css/
│   ├── style.css                 # Toàn bộ style chính
│   └── responsive.css            # Media queries cho mobile/tablet/print
│
├── js/
│   ├── firebase-config.js        # 🔑 Cấu hình Firebase (cần điền)
│   ├── auth.js                   # Đăng nhập, đăng xuất, đổi mật khẩu
│   ├── database.js               # CRUD operations, multi-path delete
│   ├── ui.js                     # Toast, Modal, Format, Navigation, Google Drive utils
│   ├── meetings.js               # Dashboard, danh sách, tạo/sửa, chi tiết, xuất biên bản
│   ├── discussion.js             # Thảo luận, reply, lightbox, attachment handling
│   ├── tasks.js                  # Phân công & xác nhận nhiệm vụ
│   ├── confirmation.js           # Xác nhận tham gia, đọc kết luận, xác nhận hồ sơ
│   ├── activity-log.js           # Nhật ký hoạt động (bất biến)
│   ├── notifications.js          # Thông báo real-time + badge
│   ├── archive.js                # Hồ sơ điện tử đã chốt
│   └── app.js                    # Entry point, initApp, routing
│
├── firebase/
│   ├── database.rules.json       # 🔒 Security Rules (RBAC + Guest Access)
│   └── storage.rules             # Storage rules (nếu dùng Firebase Storage)
│
└── README.md                     # 📄 File này
```

---

## 🚀 Hướng dẫn cài đặt

### 📋 Yêu cầu hệ thống

- Trình duyệt hiện đại (Chrome 90+, Edge 90+, Firefox 88+, Safari 14+).
- Tài khoản Google để tạo Firebase project.
- Không cần cài Node.js, npm hay bất kỳ build tool nào — **Vanilla JS thuần túy**.

### 1️⃣ Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Đặt tên project (VD: `meeting-system`), chọn region **asia-southeast1 (Singapore)** cho gần Việt Nam.
3. Sau khi tạo xong, vào **Project settings** → **Your apps** → chọn biểu tượng **Web** (`</>`) để đăng ký app.
4. Copy đoạn `firebaseConfig` được cung cấp.

### 2️⃣ Cấu hình Firebase trong code

Mở file `js/firebase-config.js` và thay thế config của bạn:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef..."
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();
```

> ⚠️ **Lưu ý quan trọng về `databaseURL`:** Nếu database được tạo ở region **asia-southeast1**, URL sẽ có dạng `https://<project-id>-default-rtdb.asia-southeast1.firebasedatabase.app` — **KHÔNG phải** `...firebaseio.com`. Nhầm URL sẽ gây lỗi `Database lives in a different region`.

### 3️⃣ Bật Authentication

1. Firebase Console → **Authentication** → **Sign-in method**.
2. Bật **Email/Password** (bắt buộc).
3. (Tuỳ chọn) Bật **Google** để hỗ trợ đăng nhập nhanh.

### 4️⃣ Tạo Realtime Database

1. Firebase Console → **Realtime Database** → **Create Database**.
2. Chọn region **asia-southeast1** (Singapore).
3. Chọn **Start in locked mode** (chúng ta sẽ dán Rules tùy chỉnh sau).

### 5️⃣ Áp dụng Security Rules

1. Vào tab **Rules** của Realtime Database.
2. Mở file `firebase/database.rules.json` trong project.
3. **Copy toàn bộ nội dung** → **Paste** vào Firebase Console → bấm **Publish**.

Rules sẽ tự động:
- Cho phép **Admin** toàn quyền.
- Cho phép **Ban lãnh đạo tổ** (`truong_to`, `to_pho`, `nhom_truong`) tạo/chốt hồ sơ tổ mình.
- Cho phép **Giáo viên** đọc/ghi dữ liệu tổ mình + các cuộc họp được mời làm khách.
- Chặn mọi thao tác sửa/xóa sau khi cuộc họp `CLOSED`.

### 6️⃣ Tạo tài khoản Admin đầu tiên

**Cách 1 — Qua Firebase Console (nhanh nhất):**
1. **Authentication** → tab **Users** → **Add user**.
2. Nhập email + password → tạo.
3. Copy **UID** của user vừa tạo.
4. Quay lại **Realtime Database** → tab **Data** → tạo nhánh `users/<UID>`:
   ```json
   {
     "email": "admin@truong.edu.vn",
     "displayName": "Quản trị viên",
     "role": "admin",
     "teamId": null,
     "createdAt": 1727337600000
   }
   ```

**Cách 2 — Dùng tool nội bộ:**
1. Mở file `tool-cap-tai-khoan.html` bằng trình duyệt.
2. Đăng nhập với tài khoản Admin vừa tạo.
3. Dùng form tạo tài khoản đơn HOẶC import Excel để tạo hàng loạt.

### 7️⃣ Chạy ứng dụng

**Cách 1 — Chạy local:**
- Mở trực tiếp `index.html` bằng trình duyệt (double-click).
- Hoặc dùng VS Code extension **Live Server** để có hot-reload.

**Cách 2 — Deploy lên GitHub Pages:**
1. Push toàn bộ source code lên repository GitHub.
2. Vào **Settings** → **Pages** → **Source: Deploy from a branch** → chọn `main` / `root`.
3. Sau vài phút, truy cập `https://<username>.github.io/<repo-name>/`.

> **Lưu ý:** Nếu dùng Firebase Auth với Email/Password, cần vào **Authentication** → **Settings** → **Authorized domains** → thêm domain GitHub Pages của bạn (`<username>.github.io`).

---

## 🗄️ Cấu trúc Database

```text
meetingsystem/
│
├── users/
│   └── {uid}/
│       ├── email
│       ├── displayName
│       ├── role: "admin" | "truong_to" | "to_pho" | "nhom_truong" | "thu_ky" | "giao_vien"
│       ├── teamId
│       └── createdAt
│
├── teams/
│   └── {teamId}/
│       ├── name, code
│       ├── leaderId
│       └── members/{uid}: true
│
├── meetings/
│   └── {meetingId}/
│       ├── code: "HS-KHTN-2026-09-001"
│       ├── title, teamId, meetingDate, meetingTime
│       ├── format: "truc_tiep" | "truc_tuyen" | "ket_hop" | "khong_dong_thoi"
│       ├── status: "DRAFT" | "DISCUSSION" | "CONCLUDED" | "CONFIRMATION" | "CLOSED"
│       ├── chairmanId, secretaryId
│       ├── memberIds/{uid}: true       ← Bao gồm cả khách mời chéo tổ
│       ├── discussionCount
│       ├── forceCloseReason, forceClosedBy, forceClosedAt
│       ├── closedAt, closedBy
│       └── viewedBy/{uid}: timestamp
│
├── meetingContents/{meetingId}/{contentId}/
│   ├── title, description, status
│   ├── conclusion, concludedAt, concludedBy
│   ├── discussionCount
│   └── attachments/{fileId}/
│
├── discussions/{meetingId}/{discussionId}/
│   ├── contentId, authorId, authorName, content
│   ├── parentId (cho reply)
│   ├── editHistory/{versionId}/
│   └── attachments/{fileId}/
│       ├── fileName, url, fileId
│       └── source: "googledrive"
│
├── tasks/{meetingId}/{taskId}/
│   ├── assignedTo, assignedByName, title, deadline
│   ├── product, description
│   └── confirmed, confirmedAt
│
├── confirmations/{meetingId}/{uid}/
│   ├── participated, participatedAt
│   ├── conclusionRead, conclusionReadAt
│   └── finalConfirmed, finalConfirmedAt, finalConfirmationId
│
├── activityLogs/{meetingId}/{logId}/
│   ├── userId, userName, action, targetType, targetId
│   └── description, timestamp
│
├── attachments/{meetingId}/{fileId}/
│   └── (metadata tập trung)
│
└── notifications/{userId}/{notificationId}/
    ├── title, message, type, link
    └── read, createdAt
```

---

## 🔒 Mô hình Bảo mật

Rules được thiết kế theo **2 chiều kiểm soát**:

```
┌──────────────────────────────────────────────────────────┐
│  LỚP 1: FRONTEND (Ẩn/hiện UI)                            │
│  ├─ isLeader = role ∈ {truong_to, to_pho, nhom_truong}   │
│  ├─ isAdminUser = role === 'admin'                       │
│  └─ canEdit = isLeader || isSecretary                    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  LỚP 2: FIREBASE RULES (Chặn ở Backend)                  │
│  ├─ Kiểm tra role từ root.child('users/'+auth.uid+'/role') │
│  ├─ Kiểm tra teamId khớp giữa user và meeting            │
│  ├─ Kiểm tra khách mời: meetings/$id/memberIds/$uid=true │
│  └─ Kiểm tra trạng thái CLOSED → chặn mọi write           │
└──────────────────────────────────────────────────────────┘
```

**Nguyên tắc vàng:** Không bao giờ tin Role ở Frontend. Mọi hành động quan trọng đều được Rules xác thực độc lập dựa trên dữ liệu thực tế trong Database.

---

## 🧪 Kiểm thử nhanh (Checklist)

- [ ] Đăng nhập bằng tài khoản Admin thành công.
- [ ] Tạo 1 cuộc họp mới → hiển thị mã hồ sơ tự động.
- [ ] Thêm nội dung + đính kèm link Google Drive → File ID được trích xuất.
- [ ] Mời 1 giáo viên tổ khác làm khách → đăng nhập giáo viên đó → thấy badge 🎫 "Khách mời".
- [ ] Chuyển trạng thái: DRAFT → DISCUSSION → CONCLUDED → CONFIRMATION → CLOSED.
- [ ] Xuất biên bản PDF → kiểm tra layout chuẩn A4.
- [ ] Xuất Excel hàng loạt → kiểm tra file có 2 sheet.

---

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng:

1. **Fork** repo này.
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`.
3. Commit: `git commit -m "feat: thêm tính năng X"`.
4. Push: `git push origin feature/ten-tinh-nang`.
5. Mở **Pull Request**.

---

## 📝 Giấy phép

Dự án được phát hành dưới giấy phép **MIT License** — bạn có thể tự do sử dụng, sửa đổi, phân phối cho mục đích cá nhân hoặc thương mại, miễn là giữ nguyên thông báo bản quyền.

---

## 📞 Liên hệ & Hỗ trợ

- **Báo lỗi / Yêu cầu tính năng:** [Mở issue mới](https://github.com/your-username/professional-meeting-system/issues)
- **Email:** your-email@example.com
- **Trường áp dụng:** THCS & THPT Trần Trường Sinh — Vĩnh Long

---

<div align="center">

**⭐ Nếu dự án này hữu ích, hãy tặng tôi 1 sao để có thêm động lực phát triển! ⭐**

Made with ❤️ in Vietnam

</div>